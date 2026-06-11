# Import 100 truyện demo nguyên bản vào Supabase

Corpus này gồm 100 truyện tiếng Việt được sinh từ template nội bộ của dự án:

- 80 truyện miễn phí.
- 20 truyện premium.
- 13 thể loại.
- 10 tài khoản tác giả hệ thống bị khóa đăng nhập.
- 5 chương đã duyệt cho mỗi truyện, tổng cộng 500 chương.
- Không tải, chép, dịch, tóm tắt hoặc mô phỏng phong cách tác phẩm bên ngoài.

Mỗi truyện có bản ghi `story_rights` ghi nguồn gốc, quyền sử dụng thương mại,
batch import và người xác minh. Nội dung này phù hợp cho demo/testing; tuy nhiên
không có quy trình kỹ thuật nào thay thế được tư vấn pháp lý nếu dùng trong một
dịch vụ thương mại thực tế.

## Kiểm tra không ghi database

```bash
cd src/backend
python -m app.import_demo_library \
  --manifest ../../docs/data/yag-demo-library.json
```

## Import Supabase

Đặt `DATABASE_URL` thành Direct connection hoặc Session pooler của Supabase
(port `5432`, thêm `sslmode=require` và percent-encode ký tự đặc biệt trong mật
khẩu), sau đó chạy:

```bash
cd src/backend
python -m app.import_demo_library \
  --apply \
  --confirm-remote \
  --manifest ../../docs/data/yag-demo-library.json
```

Lệnh có tính idempotent, không xóa dữ liệu hiện có và từ chối ghi đè truyện thuộc
batch khác. Dùng `--replace-existing` chỉ khi cần cập nhật lại corpus do importer
này quản lý.

Khi push lên nhánh `main`, workflow `.github/workflows/ci.yml` tự động áp dụng
migration, chạy importer và kiểm chứng đủ 100 truyện, 500 chương cùng tỷ lệ
80 free / 20 premium. `DATABASE_URL` có thể là repository secret hoặc secret của
GitHub Production Environment; thiếu secret hay import sai số lượng đều làm job
thất bại và chặn deploy backend.
