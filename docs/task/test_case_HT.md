# Test Case HT - TC-013, TC-014, TC-015

Tài liệu này mô tả chi tiết 3 test case thuộc nhóm **AI Search / Miu AI**:

- `TC-013`: Khoảng cách Cosine
- `TC-014`: Luồng AI Search end-to-end
- `TC-015`: JSON trả về từ Miu AI

Mục tiêu là xác minh:

- Công thức đo độ tương đồng vector hoạt động đúng
- Luồng tìm kiếm AI từ frontend đến backend trả về dữ liệu đúng
- API gợi ý của Miu AI trả về JSON đúng cấu trúc để frontend có thể render và chèn vào editor

---

## 1. Thông tin chung

### 1.1. Phạm vi

- Backend FastAPI
- API tìm kiếm AI dùng `pgvector`
- API gợi ý Miu AI cho Author Studio
- Frontend nhận dữ liệu JSON từ backend

### 1.2. Môi trường kiểm thử

- Frontend Next.js
- Backend FastAPI
- PostgreSQL có `pgvector`
- Có dữ liệu mẫu trong `stories` và `story_embeddings`
- Có thể mock Gemini API nếu môi trường test không gọi thật

### 1.3. Quy ước dữ liệu

- Vector embedding có thể dùng dữ liệu thật từ Gemini hoặc dữ liệu mock nhỏ để kiểm tra logic
- Kết quả AI Search được đánh giá bằng thứ tự xếp hạng, không chỉ bằng giá trị số tuyệt đối
- API Miu AI phải trả về JSON có thể parse trực tiếp ở frontend

---

## 2. TC-013 - Khoảng cách Cosine

### 2.1. Mục tiêu

Kiểm tra hàm hoặc logic tính **Cosine Distance / Cosine Similarity** có hoạt động đúng không.

Test này dùng để xác nhận:

- Vector giống nhau hơn thì distance phải nhỏ hơn
- Vector khác nhau hơn thì distance phải lớn hơn
- Khi dùng để xếp hạng tìm kiếm, thứ tự kết quả phải đúng

### 2.2. Tiền điều kiện

- Có một hàm tính khoảng cách Cosine hoặc query `pgvector`
- Có ít nhất 2 hoặc 3 vector mẫu để so sánh
- Có thể chạy unit test độc lập mà không cần UI

### 2.3. Dữ liệu đầu vào

Ví dụ dùng vector 3 chiều để dễ kiểm tra thủ công:

- `A = [1, 0, 0]`
- `B = [0.9, 0.1, 0]`
- `C = [0, 1, 0]`

Giải thích:

- `A` và `B` gần nhau
- `A` và `C` xa nhau

Nếu dùng công thức Cosine Distance:

- `distance(A, B)` phải nhỏ hơn `distance(A, C)`

### 2.4. Các bước thực hiện

1. Gọi hàm tính cosine cho cặp vector `A` và `B`
2. Gọi hàm tính cosine cho cặp vector `A` và `C`
3. So sánh hai kết quả distance
4. Nếu test ở mức query database, chạy câu SQL có `ORDER BY embedding <=> query_vector ASC`
5. Kiểm tra kết quả được sắp xếp theo độ gần nhất

### 2.5. Đầu ra mong đợi

#### Expected Result

- Hàm tính khoảng cách Cosine trả về giá trị hợp lệ cho tất cả vector đầu vào.
- Kết quả đo giữa hai vector giống nhau hơn phải nhỏ hơn kết quả đo giữa hai vector khác nhau hơn.
- Nếu dùng để xếp hạng truy vấn, đối tượng có độ tương đồng cao nhất phải được trả về ở vị trí đầu tiên.
- Không phát sinh lỗi tính toán như `NaN`, chia cho 0 hoặc giá trị âm bất thường.

#### Execution Log

| TC | Actual Result | Status | Note |
|---|---|---|---|
| TC-013 |  |  |  |

### 2.6. Tiêu chí đạt

- Công thức tính distance trả về giá trị hợp lý
- Kết quả ranking không bị đảo thứ tự
- Không có lỗi số học như chia cho 0 hoặc giá trị `NaN`

### 2.7. Tiêu chí không đạt

- Vector gần hơn nhưng distance lại lớn hơn vector xa hơn
- Query trả về thứ tự sai
- Hàm tính distance lỗi hoặc trả về giá trị không hợp lệ

---

## 3. TC-014 - Luồng AI Search E2E

### 3.1. Mục tiêu

Kiểm tra toàn bộ luồng **AI Semantic Search** từ đầu đến cuối:

- Người dùng nhập câu truy vấn
- Backend chuyển câu truy vấn thành embedding
- Backend query PostgreSQL `pgvector`
- Backend trả danh sách truyện
- Frontend hiển thị kết quả đúng

### 3.2. Tiền điều kiện

- Có API semantic search hoạt động
- Bảng `story_embeddings` đã có dữ liệu
- Có story metadata tương ứng trong bảng `stories`
- Hệ thống có thể mock Gemini embedding nếu không gọi thật

### 3.3. Dữ liệu đầu vào

Ví dụ câu truy vấn của người dùng:

- `nam chính là hacker`
- hoặc `tìm truyện tiên hiệp có nhân vật thông minh`

Ví dụ dữ liệu truyện trong hệ thống:

- Story 1: mô tả có nhân vật giỏi công nghệ
- Story 2: truyện tiên hiệp bình thường
- Story 3: truyện fantasy khác chủ đề

### 3.4. Các bước thực hiện

1. Mở màn hình Discover / Search trên frontend
2. Nhập câu truy vấn tự nhiên vào ô tìm kiếm
3. Bấm nút tìm kiếm AI
4. Frontend gọi API semantic search của backend
5. Backend tạo embedding cho câu truy vấn
6. Backend chạy query cosine trên `story_embeddings`
7. Backend join với `stories` để lấy metadata
8. Backend trả response về frontend
9. Frontend render danh sách kết quả

### 3.5. Đầu vào/đầu ra của luồng

#### Input

- Query text từ người dùng
- Token/JWT nếu API yêu cầu xác thực
- Dữ liệu embedding trong DB

#### Output

- Danh sách truyện phù hợp theo mức độ tương đồng
- Mỗi item thường có:
  - `story_id`
  - `title`
  - `description` hoặc `plot_summary`
  - `similarity` hoặc `distance`
  - metadata hiển thị ở UI

### 3.6. Đầu ra mong đợi

#### Expected Result

- Frontend gửi request tìm kiếm AI thành công đến backend.
- Backend tạo embedding cho câu truy vấn và thực hiện truy vấn `pgvector` đúng quy trình.
- API trả về HTTP success và dữ liệu response có cấu trúc hợp lệ.
- Danh sách kết quả được sắp xếp theo mức độ tương đồng giảm dần, trong đó truyện phù hợp nhất xuất hiện ở đầu danh sách.
- Frontend hiển thị đúng tiêu đề, mô tả và các thuộc tính metadata của truyện.
- Không xảy ra lỗi hiển thị, lỗi parse JSON hoặc lỗi không có dữ liệu trên giao diện.

#### Execution Log

| TC | Actual Result | Status | Note |
|---|---|---|---|
| TC-014 |  |  |  |

### 3.7. Tiêu chí đạt

- Query từ UI đi tới backend thành công
- Embedding được tạo đúng
- Query `pgvector` chạy đúng
- Kết quả hiển thị đúng trên frontend
- Không có lỗi parse response hoặc lỗi undefined field

### 3.8. Tiêu chí không đạt

- UI gửi query nhưng backend trả lỗi
- Backend trả response sai format
- Query có dữ liệu nhưng frontend không render được
- Kết quả không đúng ngữ nghĩa hoặc sai thứ tự rõ rệt

---

## 4. TC-015 - JSON từ Miu AI

### 4.1. Mục tiêu

Kiểm tra API gợi ý của **Miu AI** trả về JSON đúng cấu trúc để frontend có thể:

- hiển thị 3 gợi ý
- hiển thị title, content, reason
- cho phép bấm nút **Chèn vào truyện**

### 4.2. Tiền điều kiện

- Người dùng đang ở màn hình Author Studio
- Có chapter context hợp lệ
- API Miu AI hoạt động hoặc có fallback mock

### 4.3. Dữ liệu đầu vào

Ví dụ request body:

```json
{
  "chapterId": "chapter-13",
  "context": "Mưa đã ngừng khi An quay lại sân ga...",
  "mode": "kịch tính"
}
```

### 4.4. Các bước thực hiện

1. Từ Author Studio, nhập hoặc giữ sẵn ngữ cảnh chương
2. Chọn mode gợi ý, ví dụ:
   - `kịch tính`
   - `lãng mạn`
   - `bí ẩn`
3. Bấm nút gửi yêu cầu cho Miu AI
4. Backend nhận request và trả về danh sách gợi ý
5. Frontend parse JSON
6. Frontend render 3 thẻ gợi ý
7. Bấm nút **Chèn vào truyện** trên một thẻ

### 4.5. Cấu trúc JSON mong đợi

Response tối thiểu nên có dạng:

```json
{
  "suggestions": [
    {
      "title": "Tên gợi ý 1",
      "content": "Đoạn văn AI đề xuất...",
      "reason": "Giải thích ngắn"
    },
    {
      "title": "Tên gợi ý 2",
      "content": "Đoạn văn AI đề xuất...",
      "reason": "Giải thích ngắn"
    },
    {
      "title": "Tên gợi ý 3",
      "content": "Đoạn văn AI đề xuất...",
      "reason": "Giải thích ngắn"
    }
  ],
  "fallback": false,
  "message": "Miu AI đã tạo 3 gợi ý."
}
```

### 4.6. Đầu ra mong đợi

#### Expected Result

- API trả về một JSON hợp lệ và có thể parse trực tiếp ở frontend.
- Trường `suggestions` tồn tại và có kiểu dữ liệu là mảng.
- Mỗi phần tử trong `suggestions` phải có tối thiểu hai trường `title` và `content`.
- Trường `reason` có thể xuất hiện hoặc không, nhưng nếu có thì phải là chuỗi hợp lệ.
- Trường `fallback` phải là kiểu boolean và thể hiện đúng trạng thái xử lý dự phòng.
- Trường `message` phải là chuỗi mô tả trạng thái phản hồi của hệ thống.
- Frontend render được 3 thẻ gợi ý AI mà không phát sinh lỗi giao diện.
- Nút `Chèn vào truyện` hoạt động đúng với nội dung lấy từ trường `content`.

#### Execution Log

| TC | Actual Result | Status | Note |
|---|---|---|---|
| TC-015 |  |  |  |

### 4.7. Tiêu chí đạt

- JSON parse được bằng `JSON.parse` hoặc parse của Axios/fetch
- Frontend không bị lỗi thiếu field
- Nút **Chèn vào truyện** dùng được với `content`
- Khi backend fallback, UI vẫn tiếp tục hoạt động

### 4.8. Tiêu chí không đạt

- JSON sai format
- `suggestions` không phải array
- Thiếu `content` hoặc `title`
- Frontend render lỗi hoặc không chèn được nội dung

---

## 5. Kết luận ngắn

Ba testcase này kiểm tra đúng 3 lớp quan trọng:

- `TC-013`: tính đúng của vector similarity
- `TC-014`: luồng AI Search đầy đủ từ UI đến DB
- `TC-015`: hợp đồng JSON giữa Miu AI và frontend

Nếu cả 3 test case pass, thì phần AI Search và Miu AI của hệ thống được xem là ổn ở mức logic cơ bản và integration.
