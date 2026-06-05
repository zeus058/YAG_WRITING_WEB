Hướng dẫn thiết lập Continuous Deployment (CD) lên Google Cloud bằng Workload Identity Federation
Tài liệu này hướng dẫn cách cấu hình luồng CD tự động từ GitHub Actions lên Google Cloud Platform (GCP) sử dụng Workload Identity Federation (WIF).

Phương pháp này là tiêu chuẩn bảo mật (best practice) giúp GitHub Actions xác thực với GCP thông qua token OIDC ngắn hạn (short-lived token) mà không cần tạo và lưu trữ Service Account Key (file JSON).

Yêu cầu chuẩn bị (Prerequisites)
Quyền Admin trên Google Cloud Project hoặc quyền truy cập Google Cloud Shell.

Môi trường dòng lệnh (Terminal) đã cài đặt và đăng nhập gcloud CLI.

Thông tin về GitHub Repository (định dạng: owner/repo-name).

Phần 1: Cấu hình Workload Identity Federation trên GCP
Mở Terminal hoặc Google Cloud Shell và chạy tuần tự các lệnh sau. Chú ý thay đổi các biến môi trường cho phù hợp với dự án thực tế.

1.1. Cài đặt biến môi trường
Bash
# Cập nhật thông tin dự án của bạn
export PROJECT_ID="my-gcp-project-id"
export GITHUB_REPO="tên-owner/tên-repo-github"

# Đặt tên cho các tài nguyên sẽ tạo
export POOL_NAME="github-actions-pool"
export PROVIDER_NAME="github-provider"
export SA_NAME="github-actions-sa"
1.2. Khởi tạo tài nguyên
Bash
# 1. Tạo Workload Identity Pool
gcloud iam workload-identity-pools create $POOL_NAME \
  --project="${PROJECT_ID}" \
  --location="global" \
  --display-name="GitHub Actions Pool"

# 2. Tạo OIDC Provider cho GitHub liên kết với Pool vừa tạo
gcloud iam workload-identity-pools providers create-oidc $PROVIDER_NAME \
  --project="${PROJECT_ID}" \
  --location="global" \
  --workload-identity-pool=$POOL_NAME \
  --display-name="GitHub Provider" \
  --attribute-mapping="google.subject=assertion.sub,attribute.actor=assertion.actor,attribute.repository=assertion.repository" \
  --issuer-uri="https://token.actions.githubusercontent.com"

# 3. Tạo Service Account dùng để Deploy
gcloud iam service-accounts create $SA_NAME \
  --project="${PROJECT_ID}" \
  --display-name="SA for GitHub Actions CD"
1.3. Cấp quyền đóng giả (Impersonate) cho Repository
Bash
# Lấy ID đầy đủ của Workload Identity Pool
export WORKLOAD_IDENTITY_POOL_ID=$(gcloud iam workload-identity-pools describe $POOL_NAME \
  --project="${PROJECT_ID}" \
  --location="global" \
  --format="value(name)")

# Cấp quyền cho GitHub repo đóng giả Service Account
gcloud iam service-accounts add-iam-policy-binding "${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com" \
  --project="${PROJECT_ID}" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${WORKLOAD_IDENTITY_POOL_ID}/attribute.repository/${GITHUB_REPO}"
Lưu ý quan trọng: Bạn cần sử dụng GCP Console (hoặc gcloud) để cấp thêm các quyền (Roles) cần thiết cho Service Account vừa tạo ($SA_NAME@$PROJECT_ID.iam.gserviceaccount.com) tùy theo dịch vụ bạn định deploy. Ví dụ:

Artifact Registry Writer: Để push Docker image.

Cloud Run Admin và Service Account User: Để deploy lên Cloud Run.

Phần 2: Cập nhật file CI/CD (GitHub Actions)
Mở file workflow của bạn (ví dụ .github/workflows/ci.yml) và thực hiện các bước sau:

2.1. Thêm quyền tạo OIDC Token
Bắt buộc phải bổ sung id-token: write vào khối permissions ở đầu file.

YAML
permissions:
  contents: read
  pull-requests: write
  id-token: write  # BẮT BUỘC: Cho phép GitHub Actions tạo OIDC token để nói chuyện với GCP
2.2. Thêm Job Deployment
Thêm Job deploy vào cuối luồng workflow. Job này cấu hình để chỉ chạy khi code được push vào các nhánh chính và các Job CI trước đó đã thành công.

YAML
  # ────────────────────────────────────────────────────────────
  # JOB 6: CD — Deploy to Google Cloud (Cloud Run)
  # ────────────────────────────────────────────────────────────
  deploy:
    name: "🚀 Deploy to GCP"
    runs-on: ubuntu-latest
    needs: [backend, frontend, security, sonarqube] # Đảm bảo CI pass hết mới deploy
    if: github.event_name == 'push' && (github.ref == 'refs/heads/main' || github.ref == 'refs/heads/dev')

    env:
      PROJECT_ID: "my-gcp-project-id" # Thay bằng Project ID thực tế
      REGION: "asia-southeast1"       # Region của Artifact Registry và Cloud Run
      GAR_LOCATION: "asia-southeast1-docker.pkg.dev/my-gcp-project-id/my-repo" # Đường dẫn Artifact Registry
      
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Authenticate to Google Cloud
        id: auth
        uses: google-github-actions/auth@v2
        with:
          # Định dạng Workload Identity Provider ID: 
          # projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL_NAME/providers/PROVIDER_NAME
          workload_identity_provider: 'projects/1234567890/locations/global/workloadIdentityPools/github-actions-pool/providers/github-provider'
          service_account: 'github-actions-sa@my-gcp-project-id.iam.gserviceaccount.com'

      - name: Set up Cloud SDK
        uses: google-github-actions/setup-gcloud@v2

      - name: Configure Docker to use Google Artifact Registry
        run: gcloud auth configure-docker ${{ env.REGION }}-docker.pkg.dev --quiet

      - name: Build and Push Backend Image
        run: |
          IMAGE_TAG=${{ env.GAR_LOCATION }}/yag-backend:${{ github.sha }}
          docker build -t $IMAGE_TAG ./src/backend
          docker push $IMAGE_TAG

      - name: Deploy Backend to Cloud Run
        run: |
          gcloud run deploy yag-backend \
            --image=${{ env.GAR_LOCATION }}/yag-backend:${{ github.sha }} \
            --region=${{ env.REGION }} \
            --allow-unauthenticated \
            --port=8000
Lưu ý: Thay thế 1234567890 bằng Project Number thực tế của bạn (Project Number là một chuỗi số, khác với Project ID).

Phần 3: Gợi ý tối ưu hoá
Nếu bạn đã sử dụng Job deploy để build và push Docker image lên Artifact Registry, bạn có thể xóa bỏ Job docker (Docker Build Check) ở phần CI trước đó. Việc này giúp luồng chạy tránh bị trùng lặp công đoạn build, tiết kiệm đáng kể thời gian chạy action và chi phí tính toán.