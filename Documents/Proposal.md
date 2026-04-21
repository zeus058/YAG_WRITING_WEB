### Intro2SE - Project Proposal - Group1

# YAG - WRITING NOVELS WEB

_Đồ án môn học Nhập môn Công nghệ phần mềm - HCMUS_CQ/25_26._

- [1. Member Contribution Assessment](#1-member-contribution-assessment)
- [2. Preliminary Problem Statement](#2-preliminary-problem-statement)
- [3. Proposed Solution](#3-proposed-solution)
  - [3.1 Software](#31-software)
    - [3.1.1 Features](#311-features)
    - [3.1.2 Software Architecture](#312-software-architecture)
  - [3.2 Hardware](#32-hardware)
- [4. Development Plan](#4-development-plan)
  - [4.1 Requirements Analysis](#41-requirements-analysis)
  - [4.2 Software Design](#42-software-design)
  - [4.3 Implementation](#43-implementation)
  - [4.4 Testing](#44-testing)
  - [4.5 Deployment and Maintainance](#45-deployment-and-maintainance)
- [5. Human Resources \& Costing Plan](#5-human-resources--costing-plan)
- [6. Tools setup](#6-tools-setup)
- [7. AI Usage Declaration](#7-ai-usage-declaration)
- [8. Presentation](#8-presentation)
- [9. Reflective Report](#9-reflective-report)

## 1. Member Contribution Assessment

**23120123 - Trần Gia Hiển - 35%**

- _**Write Preliminary Problem Statement**_

  Phân tích bối cảnh hiện tại, xác định các khó khăn của người dùng khi đọc/viết tiểu thuyết trực tuyến và định nghĩa bài toán mà hệ thống "YAG" cần giải quyết.

- _**Write Software Features**_

  Liệt kê và mô tả chi tiết các tính năng của hệ thống theo đúng mục tiêu đã đề ra.

- _**Write Testing**_

  Xây dựng kế hoạch kiểm thử phần mềm, định nghĩa các phương pháp (Unit Test, Integration Test) để đảm bảo chất lượng các chức năng chính.

- _**Write Human Resources & Costing Plan**_

  Lập bảng phân công nhân sự, tính toán thời gian thực hiện và ước tính chi phí cần thiết cho việc vận hành hệ thống.

- _**Review Software Architecture**_

  Đánh giá đề xuất về tính hợp lý của kiến trúc hệ thống, đảm bảo sơ đồ thiết kế đáp ứng tốt các tính năng và khả năng mở rộng.

- _**Review Hardware**_

  Đánh giá đề xuất về các yêu cầu về thiết bị đầu cuối và hạ tầng máy chủ cần thiết để triển khai dự án.

- _**Review Implementation**_

  Đánh giá đề xuất cho quá trình hiện thực hóa mã nguồn, đảm bảo đề xuất có trình bày các quy tắc cần tuân thủ khi viết code và chức năng đã thiết kế.

**23120151 - Huỳnh Yến Nhi - 15%**

- _**Write Implementation**_

  Mô tả chi tiết các công nghệ sử dụng (ngôn ngữ lập trình, framework) và cách thức chuyển đổi từ thiết kế thành mã nguồn thực tế.

- _**Review Preliminary Problem Statement**_

  Đánh giá tính logic và mức độ thuyết phục của phần đặt vấn đề, đảm bảo bám sát nhu cầu thị trường.

- _**Review Software Design**_

  Đánh giá đề xuất các giao diện (UI) và trải nghiệm người dùng (UX) để đảm bảo tính thẩm mỹ và dễ sử dụng.

**23120169 - Nguyễn Phú Thọ - 20%**

- _**Write Hardware**_

  Đặc tả các cấu hình phần cứng tối thiểu và khuyến nghị để hệ thống hoạt động ổn định trên các nền tảng.

- _**Write Deployment and Maintainance**_

  Xây dựng quy trình triển khai phần mềm lên môi trường thực tế và kế hoạch bảo trì, cập nhật hệ thống sau khi vận hành.

- _**Review Testing**_

  Đánh giá kế hoạch và phương pháp kiểm thử đảm bảo các chức năng thực hiện chính xác, đảm bảo các lỗi tiềm tàng đều được bao phủ trong kế hoạch.

- _**Review Human Resources & Costing Plan**_

  Đánh giá đề xuất bảng tính chi phí và phân bổ nhân sự để đảm bảo tính thực tế và tối ưu ngân sách.

**23120177 - Phạm Hương Trà - 15%**

- _**Write Requirements Analysis**_

  Phân tích các yêu cầu chức năng (Functional) và phi chức năng (Non-functional) của hệ thống web viết tiểu thuyết.

- _**Review Software Features**_

  Đánh giá tính khả thi của các tính năng đã đề xuất, loại bỏ hoặc bổ sung các chức năng cần thiết.

- _**Review Deployment and Maintainance**_

  Đánh giá đề xuất các phương án triển khai để đảm bảo tính an toàn và giảm thiểu thời gian gián đoạn của hệ thống (downtime).

**23120182 - Nguyễn Duy Trường - 15%**

- _**Write Software Architecture**_

  Thiết kế cấu trúc tổng thể của hệ thống, bao gồm sơ đồ khối, luồng dữ liệu giữa Client và Server.

- _**Write Software Design**_

  Đưa ra đề xuất về một bản thiết kế chi tiết để lập trình viên có thể nhìn vào đó và viết code, cũng như thực hiện các yêu cầu kiểm thử.

- _**Review Requirements Analysis**_

  Đánh giá đề xuất về tính đầy đủ của các yêu cầu đã phân tích, tránh việc bỏ sót nhu cầu của người dùng.

## 2. Preliminary Problem Statement

    Written by: 23120123 Trần Gia Hiển
    Edited by: null
    Reviewed by: 23120151 Huỳnh Yến Nhi

Hiện nay, **các tác phẩm văn học mạng** ngày càng trở nên phổ biến và tiếp cận được với nhiều độc giả từ nhiều lứa tuổi, quốc gia nhờ vào sự tiện lợi, đa dạng và khả năng tương tác với tác giả rất tốt. Là trưởng nhóm phát triển của một công ty phần mềm, nhóm bạn phải xây dựng **một nền tảng viết truyện chữ uy tín**. Nền tảng hỗ trợ các tác giả **môi trường viết truyện thông minh** (hỗ trợ tìm ý tưởng, xây dựng bối cảnh, kiểm tra lỗi tự động,...), **công cụ viết truyện cơ bản**. Đặc biệt, nền tảng xây dựng **một cộng đồng** các tác giả và độc giả có thể **dễ dàng tương tác** (nhận xét, đánh giá, xin ý kiến,...) và **kết nối** với nhau như một trang mạng xã hội dành riêng cho "Hội mê truyện".

Các tác giả khi đăng tải có thể lựa chọn đăng một lần hoàn thiện hoặc hẹn lịch đăng (theo tuần, theo tháng,...) từng chương của tác phẩm và cam kết sẽ không dừng tác phẩm giữa chừng (drop). Truyện khi được đăng tải cần đảm bảo các yếu tố sau: tên truyện, mô tả cơ bản, thể loại, độ tuổi thích hợp, bìa truyện (nếu có),... điều này giúp các độc giả có thể dễ dàng tìm kiếm và tăng cường mức độ nhận diện của tác phẩm. Trong quá trình viết, các tác giả có thể nhờ AI hỗ trợ tìm ý tưởng, xây dựng bối cảnh, kiểm tra tính chính xác của sự kiện,... Và trước khi đăng tải, tác phẩm sẽ được kiểm duyệt với AI về nội dung tác phẩm có phù hợp (độ tuổi, lịch sử, chính trị, văn hóa,...). Các tác phẩm sau khi được đăng tải lên sẽ được theo dõi sát sao về lượng truy cập, lượt đánh giá, nhận xét để tác giả có thể tiếp cận được xu hướng độc giả thích tác phẩm của bản thân.

Các độc giả có thể tìm kiếm và đọc các tác phẩm truyện do tác giả khác viết có thể trả phí hoặc không. Quá trình tìm kiếm có thể dựa trên tên truyện, thể loại hoặc tên của tác giả. Ngoài ra, độc giả có thể tìm kiếm dựa trên cốt truyện của tác phẩm nhờ vào AI hỗ trợ tìm kiếm thông minh. Trong quá trình đọc truyện, độc giả có thể đưa ra nhận xét, đánh dấu yêu thích cho từng chương truyện và tham gia vào cộng đồng của bộ truyện đó. Nếu yêu thích các tác phẩm của tác giả đó, độc giả có thể tham gia gói membership để đọc các tác phẩm độc quyền, mới nhất, nhanh nhất.

Để đảm bảo được sự ổn định và nâng cao khả năng xử lý của AI, nhóm phải xây dựng một ứng dụng Web chạy trên các trình duyệt hiện đại hỗ trợ HTML5 và WebSockets để đồng bộ hóa bản thảo thời gian thực (Google Chrome, Microsoft Edge, Firefox, Safari). Hệ thống cần sử dụng Apache phục vụ phân phối nội dung và API của các nhà cung cấp LLM lớn như Google để xử lý các yêu cầu về ngôn ngữ tự nhiên. Đặc biệt, nhóm có thể đề xuất sử dụng React.js hoặc Next.js để xây dựng giao diện Single Page Application (SPA) tiện ích và dễ sử dụng. Và Python (FastAPI/Django) giúp tối ưu hóa việc tích hợp các mô hình AI và xử lý dữ liệu lớn ở phía sau.

Ngoài ra, để đảm bảo tính bảo mật và quyền sở hữu trí tuệ, các thông tin về tác phẩm, tác giả và độc giả đều cần mã hóa. Và tất cả các hoạt động trên nền tảng người dùng cần đăng ký và đăng nhập để sử dụng nhằm đảm bảo sự an toàn của hệ thống.

## 3. Proposed Solution

### 3.1 Software

#### 3.1.1 Features

    Written by: 23120123 Trần Gia Hiển
    Edited by: null
    Reviewed by: 23120177 Phạm Hương Trà

| Nhu cầu                                                                                                                                                                                | Yêu cầu                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Là người dùng đã đăng ký, tôi muốn mật khẩu đăng nhập của tôi không thể dò được                                                                                                        | Bảo vệ mật khẩu                     |
| Là người dùng, tôi muốn đặt lại mật khẩu khi quên để có thể lấy lại quyền truy cập                                                                                                     | Quên mật khẩu, Reset mật khẩu       |
| Là tác giả, tôi muốn nhận gợi ý ý tưởng khi bị "bí" nội dung                                                                                                                           | AI gợi ý tình tiết                  |
| Là tác giả, tôi muốn nội dung của mình được kiểm duyệt để đảm bảo không vi phạm quy tắc văn hóa trước khi đăng.                                                                        | Kiểm duyệt tự động bằng AI          |
| Là tác giả, tôi muốn tiếp cận, kết nối với độc giả của mình nhiều hơn <br> Là độc giả, tôi muốn tương tác và góp ý cho tác giả để cải thiện chất lượng truyện.                         | Xây dựng cộng đồng, diễn đàn online |
| Là tác giả, tôi muốn thống kê lượng độc giả đọc truyện, lượt yêu thích và nhận xét                                                                                                     | Thống kê lượng truy cập, đánh giá   |
| Là tác giả, tôi muốn lưu trữ truyện đã viết                                                                                                                                            | Thư viện tác phẩm                   |
| Là tác giả, tôi muốn bảo vệ chất xám và tác quyền của mình trên nền tảng                                                                                                               | Chống sao chép nội dung truyện      |
| Là tác giả, tôi muốn kiếm tiền từ tác phẩm truyện trên nền tảng <br> Là độc giả, tôi muốn đọc các chương mới nhất của tác giả yêu thích trước những người khác                         | Gói Membership                      |
| Là tác giả, tôi muốn quá trình kiểm duyệt không quá 5 phút                                                                                                                             | Xử lý và phản hồi nhanh             |
| Là độc giả, tôi muốn tìm kiếm truyện thông qua tên truyện, thể loại, tên tác giả                                                                                                       | Tìm kiếm truyện                     |
| Là độc giả, tôi muốn tìm kiếm truyện dựa trên mô tả cốt truyện                                                                                                                         | Tìm kiếm thông minh bằng AI Search  |
| Là độc giả hoặc tác giả, tôi muốn nhận đề xuất các truyện hay nhất, truyện xu hướng gần đây, gợi ý truyện theo thể loại                                                                | Đề xuất truyện                      |
| Là độc giả, tôi muốn lưu lại các tác phẩm mình yêu thích                                                                                                                               | Thư viện đọc                        |
| Là quản trị viên, tôi muốn đảm bảo các tác giả không bỏ dở truyện giữa chừng                                                                                                           | Cơ chế cam kết lộ trình đăng tải    |
| Là quản trị viên, tôi muốn thống kê báo cáo doanh thu từ Membership                                                                                                                    | Thống kê doanh thu                  |
| Là quản trị viên, tôi muốn quảng bá cho web đọc truyện <br> Là tác giả, tôi muốn tham gia cuộc thi viết uy tín <br> Là độc giả, tôi muốn đọc các tác phẩm chất lượng, hay và nổi tiếng | Cuộc thi viết của Web               |

#### 3.1.2 Software Architecture

    Written by: 23120182 Nguyễn Duy Trường
    Edited by: null
    Reviewed by: 23120123 Trần Gia Hiển

Hệ thống được thiết kế theo kiến trúc Service-Oriented Architecture (SOA), chia nhỏ các tính năng thành các module/dịch vụ độc lập để tối ưu hóa việc xử lý song song và khả năng mở rộng. Hệ thống sẽ được container hóa (sử dụng Docker) để đảm bảo tính nhất quán giữa môi trường phát triển và môi trường production.

**Các tầng hệ thống**

Hệ thống được chia thành 4 tầng: Dữ liệu từ người dùng sẽ đi từ Tầng Hiển thị xuống dưới Tầng Dữ liệu và trả kết quả ngược lại.

**1. Tầng hiển thị**

Đây là nơi người dùng trực tiếp tương tác. Tầng này không chứa logic xử lý phức tạp mà chỉ nhận lệnh và hiển thị kết quả.

- Web Portal cho Độc giả & Tác giả (ReactJS / VueJS / Next.js):
  - Khu vực Tác giả: Giao diện soạn thảo văn bản (Editor), nút bấm yêu cầu AI gợi ý, dashboard quản lý doanh thu cá nhân và thư viện tác phẩm. Áp dụng kỹ thuật chống bôi đen/click chuột phải để bảo vệ chất xám.
  - Khu vực Độc giả: Giao diện đọc truyện, mua gói Membership, diễn đàn thảo luận, và thanh tìm kiếm AI.
- Admin Dashboard: Cổng quản trị nội bộ. Nơi Admin theo dõi báo cáo doanh thu tổng, quản lý danh sách cuộc thi viết, và nhận cảnh báo nếu có tác giả vi phạm cam kết lộ trình đăng bài.

**2. Tầng điều phối và bảo mật**

Tầng này đóng vai trò như một "người gác cổng", mọi yêu cầu từ Tầng Hiển thị phải đi qua đây trước khi vào hệ thống bên trong.

- Authentication & Authorization (Dịch vụ Định danh): Xử lý đăng nhập/đăng ký. Sử dụng thuật toán băm (Bcrypt/Argon2) để bảo vệ mật khẩu không thể dò được. Cấp quyền truy cập (Ví dụ: Chặn không cho người dùng miễn phí gọi API để đọc các chương truyện dành riêng cho gói Membership).
- API Gateway: Nhận request từ Web Portal và định tuyến (route) nó đến đúng dịch vụ xử lý ở tầng dưới (Ví dụ: Request tìm truyện sẽ được đẩy về Search Service).
- Rate Limiting & Anti-Bot: Giới hạn số lượng request trong một giây để chống các cuộc tấn công DDoS, dò mật khẩu (Brute-force), và ngăn chặn bot tự động cào (crawl) sao chép trộm nội dung truyện.

**3. Tầng nghiệp vụ lõi**

Đây là "bộ não" của ứng dụng, nơi chứa toàn bộ logic kinh doanh. Tầng này được chia thành các Dịch vụ (Service) độc lập để dễ bảo trì.

- Content & Story Service: Xử lý việc tạo mới, lưu bản thảo, xuất bản truyện. Quản lý thư viện tác phẩm của tác giả và thư viện yêu thích của độc giả.
- Membership & Billing Service: Tích hợp với cổng thanh toán. Ghi nhận giao dịch mua gói Membership, tự động mở khóa nội dung độc quyền, và tính toán chia sẻ doanh thu cho tác giả/web.
- Community Service: Quản lý chức năng bình luận, đánh giá sao, diễn đàn online và các bảng xếp hạng (Leaderboard) cho cuộc thi viết.
- AI Smart Engine (Cụm xử lý Trí tuệ nhân tạo):
  - AI Generator: Phân tích ngữ cảnh đoạn truyện đang viết dở và trả về gợi ý nội dung cho tác giả.
  - AI Moderator: Tự động quét từ ngữ, ngữ nghĩa của bản thảo mới để phát hiện nội dung vi phạm văn hóa. (Kết hợp với Message Queue để đảm bảo quá trình này chạy ngầm và trả kết quả dưới 5 phút).
  - AI Search & Recommender: Phân tích câu truy vấn của người dùng (VD: "Truyện tiên hiệp có nam chính thông minh") để tìm ra cốt truyện tương ứng thay vì chỉ tìm theo từ khóa.

**4. Tầng hạ tầng và dữ liệu**

Nơi lưu trữ và tối ưu hóa tốc độ truy xuất dữ liệu.

- Cơ sở dữ liệu Quan hệ (Relational DB - PostgreSQL/MySQL): Chứa các dữ liệu cốt lõi có cấu trúc chặt chẽ như thông tin tài khoản, lịch sử giao dịch thanh toán, thiết lập hệ thống, và nội dung text của các chương truyện.
- Cơ sở dữ liệu Vector (Vector DB - Pinecone/Milvus): Chuyên dùng để lưu trữ các "đặc trưng ngữ nghĩa" (embeddings) của mọi bộ truyện. Đây là thành phần bắt buộc phải có để hệ thống tìm kiếm và đề xuất thông minh bằng AI có thể hoạt động.
- Bộ nhớ đệm (Caching - Redis): Lưu trữ tạm thời các dữ liệu được yêu cầu liên tục (Ví dụ: Top 10 truyện đang thịnh hành, bảng xếp hạng cuộc thi viết) để người dùng tải trang ngay lập tức mà không cần chọc sâu vào Database chính.
- Object Storage (AWS S3 / Cloudinary): Nơi lưu trữ các file tĩnh dung lượng lớn như ảnh bìa truyện, avatar người dùng.
- Message Broker (RabbitMQ / Kafka): Hàng đợi xử lý bất đồng bộ. Giúp hệ thống không bị "treo". (Ví dụ: Khi tác giả đăng truyện, hệ thống báo "Thành công" ngay lập tức, trong khi thực tế bản thảo được đưa vào hàng đợi để AI từ từ quét kiểm duyệt ở phía sau).

\*_Mapping User Stories to Technical Solutions_

Dưới đây là bảng ánh xạ chi tiết giữa các User Story (Yêu cầu của người dùng) và Giải pháp Kỹ thuật (Technical Solutions) tương ứng. Bảng này đóng vai trò cơ sở để nhóm phát triển lựa chọn công nghệ và phân chia công việc trong hệ thống Microservices/Modular Monolith.

| STT    | Đối tượng                 | Nhu cầu / Tính năng (User Story)                                     | Dịch vụ xử lý (Microservice) | Giải pháp Kỹ thuật & Công nghệ (Technical Solution)                                                                                                                               |
| :----- | :------------------------ | :------------------------------------------------------------------- | :--------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Người dùng                | **Bảo vệ mật khẩu:** Không thể dò được                               | Authentication Service       | Sử dụng thuật toán băm (Hashing) **Bcrypt** hoặc **Argon2** + Salt. Kết hợp **Rate Limiting** chặn IP nếu nhập sai pass nhiều lần (chống Brute-force).                            |
| **2**  | Tác giả                   | **AI gợi ý tình tiết:** Khi bị "bí" ý tưởng                          | AI Smart Engine              | Tích hợp **LLM API** (OpenAI/Gemini). Xây dựng hệ thống Prompt Engineering nội bộ để định hướng AI trả lời theo văn phong viết truyện.                                            |
| **3**  | Tác giả                   | **Kiểm duyệt tự động bằng AI:** Không vi phạm văn hóa                | AI Smart Engine              | Sử dụng LLM để phân tích ngữ nghĩa (Sentiment/Content Analysis) và phát hiện từ khóa cấm (Profanity Filter).                                                                      |
| **4**  | Tác giả                   | **Xử lý và phản hồi nhanh:** Kiểm duyệt < 5 phút                     | Message Broker               | Đẩy tác vụ kiểm duyệt vào hàng đợi **RabbitMQ / Kafka** để xử lý bất đồng bộ (Background processing). User nhận thông báo "Đang xử lý" ngay lập tức mà không bị treo trang.       |
| **5**  | Độc giả / Tác giả         | **Xây dựng cộng đồng, diễn đàn online:** Tương tác, góp ý            | Community Service            | Thiết kế module Forum. Dùng **WebSockets** (Socket.io) cho các thông báo (notification) và bình luận theo thời gian thực (real-time).                                             |
| **6**  | Tác giả                   | **Thống kê lượng truy cập, đánh giá:** Lượt xem, yêu thích           | Analytics Service            | Sử dụng **Redis** để đếm lượt view/like in-memory (tốc độ cao), sau đó dùng Cron Job đồng bộ định kỳ xuống Database chính (PostgreSQL) để giảm tải.                               |
| **7**  | Tác giả                   | **Thư viện tác phẩm:** Lưu trữ truyện đã viết                        | Story & Content Service      | Lưu siêu dữ liệu (tên truyện, tác giả, trạng thái) trong Database. Lưu nội dung chapter dạng văn bản có cấu trúc. Lưu ảnh bìa trên **Object Storage (AWS S3)**.                   |
| **8**  | Tác giả                   | **Chống sao chép nội dung truyện:** Bảo vệ chất xám                  | Security / Frontend Layer    | **Frontend:** Disable right-click, bôi đen (`user-select: none`), vô hiệu hóa F12/DevTools. <br>**Backend:** Giới hạn API rate limit để chống tool cào (crawl) dữ liệu hàng loạt. |
| **9**  | Độc giả / Tác giả         | **Gói Membership:** Đọc trước chương mới, kiếm tiền                  | Membership & Billing Service | Tích hợp Payment Gateway (VNPAY/Momo/Stripe). Phân quyền **RBAC**: API lấy nội dung chương mới sẽ kiểm tra `role` hoặc `subscription_status` trước khi trả dữ liệu.               |
| **10** | Quản trị viên             | **Thống kê doanh thu:** Báo cáo Membership                           | Analytics Service            | Truy vấn SQL tổng hợp (Aggregations) trên các bảng giao dịch. Cung cấp API xuất báo cáo (CSV/Excel) cho Admin Dashboard.                                                          |
| **11** | Độc giả                   | **Tìm kiếm truyện (Cơ bản):** Qua tên, thể loại, tác giả             | Search Service               | Sử dụng tính năng **Full-Text Search** có sẵn của PostgreSQL hoặc tích hợp ElasticSearch cho hiệu năng cao.                                                                       |
| **12** | Độc giả                   | **Tìm kiếm thông minh AI Search:** Dựa trên mô tả cốt truyện         | AI Smart Engine + Vector DB  | Chuyển đổi mô tả truyện thành vector bằng Embedding Model. Lưu và truy vấn tìm kiếm sự tương đồng (Similarity Search) bằng **Vector Database (Pinecone / Milvus)**.               |
| **13** | Độc giả / Tác giả         | **Đề xuất truyện:** Truyện xu hướng, theo thể loại                   | Recommendation Engine        | Xây dựng thuật toán **Content-based filtering** (gợi ý theo thể loại đang đọc) và cache danh sách "Trending/Xu hướng" trên **Redis** để load nhanh trang chủ.                     |
| **14** | Độc giả                   | **Thư viện đọc:** Lưu lại tác phẩm yêu thích                         | Story & Content Service      | Bảng nối (Junction table) `User_Bookmarks` lưu `user_id`, `story_id`, và `last_read_chapter_id` để đồng bộ tiến độ đọc trên mọi thiết bị.                                         |
| **15** | Quản trị viên             | **Cơ chế cam kết lộ trình đăng tải:** Không bỏ dở                    | Content Management Service   | Thiết lập **Cron Jobs** chạy ngầm mỗi ngày để quét thời gian `last_updated_at` của các truyện đang tiến hành. Tự động gửi cảnh báo nếu vượt quá deadline cam kết.                 |
| **16** | Độc giả / Tác giả / Admin | **Cuộc thi viết của Web:** Tham gia, quảng bá, đọc truyện chất lượng | Contest Module               | Thiết kế hệ thống **Leaderboard (Bảng xếp hạng)** sử dụng cấu trúc dữ liệu `Sorted Sets (ZSET)` của Redis để sắp xếp điểm số/lượt bình chọn tức thời.                             |

### 3.2 Hardware

    Written by: 23120169 Nguyễn Phú Thọ
    Edited by: null
    Reviewed by: 23120123 Trần Gia Hiển

    Hạ tầng máy chủ (Server):

**Bộ vi xử lý (CPU):** Tối thiểu 8 cores / 16 threads (ưu tiên các dòng chip hiện đại như Intel Core i7, AMD EPYC, …) nhằm đảm bảo khả năng xử lý đa luồng hiệu quả. Điều này giúp hệ thống vận hành ổn định khi có nhiều người dùng truy cập đồng thời, đặc biệt trong các tác vụ như đọc truyện, bình luận thời gian thực và gọi API.

**Bộ nhớ trong (RAM):** Tối thiểu 16GB (nhưng tốt nhất vẫn nên sử dụng RAM 32GB trở lên) để xử lý cơ sở dữ liệu lớn và duy trì kết nối WebSockets (nhắn tin, bình luận thời gian thực) cho số lượng người dùng lớn, tránh tắc nghẽn khi sử dụng.

**Lưu trữ (Storage):**

- _**Lưu trữ cục bộ:**_ Sử dụng ổ SSD tối thiểu 512GB (ưu tiên NVMe) để tăng tốc độ đọc/ghi dữ liệu (dữ liệu truyện, chương, bản thảo tác phẩm, …). Truy vấn database với số lượng người dùng lớn giúp giảm độ trễ và cải thiện trải nghiệm đọc/viết.
- _**Lưu trữ riêng biệt:**_ Sử dụng dịch vụ cloud như Google Cloud Platform để lưu trữ dữ liệu mở rộng (ảnh bìa, media, backup database). Giải pháp này giúp: Mở rộng dung lượng linh hoạt theo nhu cầu; tăng tính bảo mật, an toàn dữ liệu; giảm tải công việc cho hệ thống lưu trữ cục bộ.

**Mạng và băng thông (Network and Bandwidth):** Băng thông tối thiểu 1 Gbps để đảm bảo tốc độ truyền tải dữ liệu ổn định. Có thể kết hợp CDN (Content Delivery Network) giúp truyền tải nội dung nhanh hơn đến người dùng ở nhiều khu vực khác nhau.

## 4. Development Plan

### 4.1 Requirements Analysis

**Written by:** Hương Trà  
**Edited by:**  
**Reviewed by:**  


#### a. Bối cảnh hệ thống

Hệ thống là một nền tảng web hỗ trợ viết và đọc truyện trực tuyến, hướng đến cộng đồng người dùng yêu thích truyện chữ. Nền tảng không chỉ cung cấp môi trường đăng tải và đọc truyện mà còn tích hợp các yếu tố mạng xã hội nhằm tăng cường tương tác giữa tác giả và độc giả.


#### b. Stakeholders

| Bên liên quan | Mô tả |
|--------------|------|
| Tác giả | Tạo, chỉnh sửa, đăng tải và quản lý truyện |
| Độc giả | Tìm kiếm, đọc, đánh giá và tương tác với truyện |
| Quản trị viên | Quản lý người dùng, kiểm duyệt nội dung, giám sát hệ thống |
| Nhóm phát triển | Phân tích, thiết kế, xây dựng và bảo trì hệ thống |

#### c. Phương pháp thu thập yêu cầu

Nhóm sử dụng các phương pháp sau để thu thập và làm rõ yêu cầu hệ thống:

- **User Story Mapping:** Xác định nhu cầu người dùng theo từng vai trò (tác giả, độc giả, quản trị viên) và chuyển đổi thành các chức năng hệ thống  
- **Brainstorming:** Thảo luận nội bộ nhằm đề xuất và hoàn thiện các tính năng của hệ thống  
- **Phân tích đối thủ:** Nghiên cứu các nền tảng đọc/viết truyện hiện có để tham khảo tính năng và cải tiến  
- **Xác nhận yêu cầu:** Rà soát và thống nhất yêu cầu trong nhóm để đảm bảo tính khả thi và nhất quán  

#### d. Yêu cầu chức năng (Functional Requirements)

Hệ thống bao gồm các chức năng chính sau:

- Quản lý người dùng (đăng ký, đăng nhập, quên mật khẩu)  
- Quản lý truyện (tạo, chỉnh sửa, lưu trữ và đăng tải nội dung)  
- Hỗ trợ AI (gợi ý ý tưởng, kiểm tra và cải thiện nội dung)  
- Tìm kiếm và đề xuất truyện theo nhiều tiêu chí  
- Tương tác cộng đồng (bình luận, đánh giá, thảo luận)  
- Hệ thống membership (nội dung trả phí, quyền truy cập đặc biệt)  
- Thống kê và báo cáo cho tác giả và quản trị viên  


#### e. Yêu cầu phi chức năng (Non-functional Requirements)

- **Hiệu năng:** Các chức năng AI và xử lý nội dung phải phản hồi trong thời gian hợp lý  
- **Bảo mật:** Dữ liệu người dùng và nội dung phải được mã hóa và bảo vệ an toàn  
- **Dễ sử dụng:** Giao diện trực quan, thân thiện với người dùng  
- **Tương thích:** Hệ thống hoạt động trên các trình duyệt hiện đại hỗ trợ HTML5  
- **Khả mở rộng:** Có khả năng mở rộng khi số lượng người dùng tăng  
- **Độ ổn định:** Hệ thống cần đảm bảo hoạt động ổn định và hạn chế lỗi  


#### f. Thời gian thực hiện dự kiến:

- Dự kiến sản phẩm sẽ được hoàn thành trong thời gian 1 tháng (từ 30/4/2026 đến 30/5/2026)


### 4.2 Software Design

    Written by:
    Edited by:
    Reviewed by:

### 4.3 Implementation

    Written by:
    Edited by:
    Reviewed by:

### 4.4 Testing

    Written by:
    Edited by:
    Reviewed by:

### 4.5 Deployment and Maintainance

    Written by: 23120169 Nguyễn Phú Thọ
    Edited by: null
    Reviewed by: 23120123 Trần Gia Hiển

**4.5.1 Deployment Plan:**

_**Môi trường hệ thống:**_

- _**Frontend:**_ Sử dụng Next.js để tối ưu hóa SEO (Server-Side Rendering) cho các tác phẩm văn học và cung cấp trải nghiệm SPA (Single Page Application) mượt mà. Triển khai trên Firebase Hosting để tăng tốc độ tải trang toàn cầu nhờ hệ thống CDN (Content Delivery Network) của Google (nếu định hướng phát triển web theo quy mô toàn cầu).
- _**Backend:**_ Chạy trên môi trường Dockerize với FastAPI, triển khai trên Google Cloud Run — dịch vụ serverless container của GCP (Google Cloud Platform) giúp đồng nhất môi trường từ lúc phát triển đến khi triển khai thực tế, đồng thời tự động scale theo lưu lượng truy cập.
- _**Web Server:**_ Sử dụng Apache làm Reverse Proxy để điều phối lưu lượng và quản lý chứng chỉ bảo mật SSL/TLS, kết hợp với Google Cloud Load Balancing để phân phối tải hiệu quả.
- _**Database**_ Sử dụng Google Cloud Firestore để lưu trữ toàn bộ dữ liệu của nền tảng bao gồm tài khoản người dùng, gói membership, nội dung truyện, chương, bình luận và dữ liệu tương tác của độc giả. Nhờ cấu trúc NoSQL linh hoạt và khả năng real-time sync tích hợp sẵn, Cloud Firestore dễ dàng mở rộng khi số lượng tác phẩm và người dùng tăng nhanh. Ảnh bìa truyện và các tài nguyên tĩnh được lưu trữ trên Google Cloud Storage. Hệ thống thực hiện backup tự động hàng ngày với chính sách lưu giữ 30 ngày.

_**Tích hợp AI và Real time:**_

- Sử dụng WebSockets (thông qua FastAPI) để đồng bộ hóa bản thảo thời gian thực giữa tác giả và server, đảm bảo không thất thoát dữ liệu.
- Kết nối Google Gemini API thông qua một layer trung gian để kiểm soát quota, ghi log yêu cầu và tối ưu hóa thời gian phản hồi (latency). Việc cả hạ tầng lẫn AI đều nằm trong hệ sinh thái Google giúp giảm độ trễ đáng kể so với việc gọi API từ nền tảng bên ngoài.

_**Chiến lược mở rộng (Sclaing Strategy):**_ Hệ thống tận dụng khả năng Auto-scaling của Google Cloud Run, tự động tăng số lượng container khi số lượng kết nối WebSocket vượt ngưỡng 1.000 kết nối đồng thời hoặc tỷ lệ sử dụng CPU backend vượt 70%. Ngược lại, hệ thống tự động thu hẹp tài nguyên trong giờ thấp điểm để tối ưu chi phí vận hành.

_**Kế hoạch dự phòng và Rollback:**_ Áp dụng chiến lược Blue-Green Deployment trên Google Cloud Run, duy trì đồng thời hai phiên bản (revision) production. Khi phát hành phiên bản mới, lưu lượng được chuyển dần sang phiên bản mới thông qua tính năng Traffic Splitting của Cloud Run. Nếu phát hiện lỗi, hệ thống có thể rollback về phiên bản trước trong vòng dưới 5 phút mà không gây gián đoạn trải nghiệm người dùng.

**4.5.2 Bảo mật và quản lý dữ liệu:**

- _**Mã hóa dữ liệu:**_ Sử dụng chuẩn AES-256 để mã hóa các thông tin người dùng như mật khẩu, thông tin cá nhân và lịch sử thanh toán của người dùng. RSA được áp dụng cho các thông tin định danh. Toàn bộ dữ liệu truyền tải giữa client và server được bảo vệ bởi HTTPS/TLS. Các khóa mã hóa được quản lý tập trung qua Google Cloud Key Management Service (KMS).

- _**Bảo mật nội dung truyện:**_ Cloud Firestore Security Rules để kiểm soát quyền truy cập theo từng vai trò như chương trả phí chỉ cho phép người dùng có gói membership đọc và tác giả chỉ có thể chỉnh sửa tác phẩm của chính mình.

- _**Xác thực và Phân quyền:**_ Triển khai Google Cloud Identity Platform kết hợp JWT (JSON Web Tokens) để quản lý phiên đăng nhập, đảm bảo mọi hành động tương tác (đọc truyện, thanh toán membership, đăng tải tác phẩm) đều được định danh rõ ràng và phân quyền chính xác theo từng vai trò (tác giả, độc giả, quản trị viên).

- _**Kiểm duyệt AI:**_ Tích hợp quy trình kiểm duyệt tự động sử dụng Google Gemini API ngay tại cổng upload để ngăn chặn nội dung vi phạm chính sách (độ tuổi, lịch sử, chính trị, văn hóa) trước khi dữ liệu được ghi vào Cloud Firestore.

- _**Áp dụng API Versioning:**_ Sử dụng các phiên bản API hợp lý để đảm bảo các lần cập nhật backend không gây breaking change, bảo vệ tính ổn định cho các client đang hoạt động

**4.5.3 Maintainance Plan:**

_**Bảo trì định kỳ:**_

- Cập nhật các công nghệ bảo mật của Python và Next.js thường xuyên cho hệ thống.
- Tối ưu hóa cấu trúc truy vấn Cloud Firestore định kỳ (index, query optimization) để đảm bảo tốc độ tìm kiếm tác phẩm và các tính năng AI không bị suy giảm khi lượng dữ liệu tăng theo thời gian.
- Kiểm tra và làm mới (rotate) các khóa mã hóa trên Google Cloud KMS và chứng chỉ SSL theo chu kỳ 6 tháng.
- Rà soát định kỳ dung lượng Google Cloud Storage để tối ưu chi phí lưu trữ ảnh bìa và tài nguyên tĩnh.

_**Giám sát hệ thống:**_

- Sử dụng Google Cloud Monitoring kết hợp Google Cloud Logging để theo dõi các chỉ số đặc thù của nền tảng: số lượng kết nối WebSocket đồng thời, latency phản hồi từ Google Gemini API, tỷ lệ lỗi thanh toán membership, lượt đọc/ghi trên Cloud Firestore và lưu lượng truy cập theo thời gian thực.
- Thiết lập cảnh báo tự động (Alerting) khi các dịch vụ vượt ngưỡng quy định.

_**Cập nhật tính năng và phản hồi:**_

- Dựa trên số liệu về lượt đánh giá, nhận xét và hành vi đọc của độc giả được thu thập qua Cloud Firestore, nhóm điều chỉnh thuật toán gợi ý tác phẩm mỗi 4 tuần một lần theo mô hình Agile.
- Hỗ trợ kỹ thuật thường xuyên để xử lý các vấn đề về đăng nhập, quyền truy cập và gói Membership của người dùng.

_**Phục hồi dữ liệu khi gặp sự cố:**_

- Định nghĩa hai chỉ số phục hồi phù hợp với quy mô nền tảng: RTO (Recovery Time Objective) — thời gian tối đa để khôi phục hệ thống sau sự cố và RPO (Recovery Point Objective) — lượng dữ liệu tối đa có thể mất. Các giá trị cụ thể sẽ được xác định dựa trên kết quả kiểm thử tải và yêu cầu thực tế trong giai đoạn vận hành thử nghiệm.
- Thực hiện rèn luyện khôi phục từ backup (Disaster Recovery Drill) ít nhất một lần trong năm đầu vận hành, sau đó nâng lên định kỳ mỗi quý khi hệ thống đã ổn định.

## 5. Human Resources & Costing Plan

    Written by:
    Edited by:
    Reviewed by:

## 6. Tools setup

    Written by:
    Edited by:
    Reviewed by:

## 7. AI Usage Declaration

## 8. Presentation

## 9. Reflective Report
