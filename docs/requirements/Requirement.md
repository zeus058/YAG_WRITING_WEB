### Intro2SE - Requirements Analysis - Group 1

# YAG - WRITING NOVELS WEB

*Đồ án môn học Nhập môn Công nghệ phần mềm - HCMUS - Chính quy/2025_2026.*

**Mục lục**

- [1. Member Contribution Assessment](#1-member-contribution-assessment)
- [2. Problem Statement](#2-problem-statement)
  - [2.1. Business Description](#21-business-description)
  - [2.2. Operating Environment](#22-operating-environment)
  - [2.3. Design & Implementation Constraints](#23-design--implementation-constraints)
- [3. Requirements Overview](#3-requirements-overview)
  - [3.1. Stakeholders](#31-stakeholders)
  - [3.2. Requirements](#32-requirements)
    - [3.2.1. Functional Requirements Specification](#321-functional-requirements-specification)
    - [3.2.2. Non-Functional Requirements Specification](#322-non-functional-requirements-specification)
- [4. Requirements Analysis](#4-requirements-analysis)
  - [4.1. Use Case model](#41-use-case-model)
  - [4.2. Use Case Specification](#42-use-case-specification)
- [5. AI Usage Declaration](#5-ai-usage-declaration)
- [8. Presentation](#8-presentation)
- [9. Reflective Report](#9-reflective-report)


## 1. Member Contribution Assessment

### 23120123 - Trần Gia Hiển (20%)
| Loại | Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- | :--- |
| **[Doc]** | Đặc tả Use Case AI | Hoàn thành đặc tả chi tiết nhóm Use Case thông minh: AI Search (U006), AI Suggest (U005), AI Recommend (U007), AI Moderate (U011). |
| **[Doc]** | Hoàn thiện tài liệu | Viết nội dung Mục 5 (AI Usage Declaration) và Mục 9 (Reflective Report). |
| **[Code]** | Cấu hình AI Engine | Thiết lập môi trường và cấu hình plugin `pgvector` cho tìm kiếm ngữ nghĩa. |

### 23120151 - Huỳnh Yến Nhi (20%)
| Loại | Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- | :--- |
| **[Doc]** | Phân tích bài toán | Hoàn thành Mục 2 (Problem Statement) làm rõ bối cảnh và các ràng buộc thiết kế. |
| **[Doc]** | Prototype & UI | Chịu trách nhiệm phần Prototype/Mockup và thiết kế giao diện Studio, Forum. |
| **[Code]** | Frontend Studio | Hiện thực giao diện màn hình Author Studio với trình soạn thảo Distraction-free. |

### 23120169 - Nguyễn Phú Thọ (20%)
| Loại | Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- | :--- |
| **[Doc]** | Review kỹ thuật | Đánh giá tính khả thi kỹ thuật của luồng xử lý bất đồng bộ (RabbitMQ) trong kiểm duyệt. |
| **[Doc]** | Đặc tả Giám sát | Hoàn thành đặc tả Use Case U012 (Giám sát cam kết lộ trình). |
| **[Code]** | Hạ tầng & CI/CD | Thiết lập Docker Compose (Postgres, Redis, RabbitMQ) và Git Flow cho nhóm. |
| **[Code]** | Hướng dẫn dự án | Viết file README chi tiết hướng dẫn cài đặt và vận hành hệ thống. |

### 23120177 - Phạm Hương Trà (20%)
| Loại | Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- | :--- |
| **[Doc]** | Phân tích yêu cầu | Hoàn thành Mục 3 (Requirements Overview) bao gồm Stakeholders, FR và NFR. |
| **[Doc]** | Đặc tả Use Case Độc giả | Hoàn thành đặc tả nhóm Use Case: Interact (U008), Membership (U009), Payment (U010). |
| **[Code]** | Frontend Reader | Hiện thực giao diện đăng ký, đăng nhập và màn hình đọc truyện. |

### 23120182 - Nguyễn Duy Trường (20%)
| Loại | Nhiệm vụ | Mô tả chi tiết |
| :--- | :--- | :--- |
| **[Doc]** | Thiết kế Use Case | Phác thảo Use Case Diagram (Mục 4.1) và chốt danh sách Actor. |
| **[Doc]** | Đặc tả Use Case Tác giả | Hoàn thành đặc tả nhóm Use Case: Auth (U001), Profile (U002), Write (U003), Publish (U004). |
| **[Code]** | Database & Migration | Thiết kế Database Schema, viết file SQL Migrations và tạo Seed data mẫu. |

## 2. Problem Statement
    Written by: 23120151 Huỳnh Yến Nhi
    Edited by: 
    Reviewed by: 23120123 Trần Gia Hiển
### 2.1. Business Description

Trong bối cảnh văn học mạng phát triển mạnh mẽ, nhu cầu xây dựng một nền tảng viết truyện hiện đại, thông minh và an toàn ngày càng cấp thiết. Các nền tảng hiện tại thường thiếu các tính năng hỗ trợ tác giả sáng tác hiệu quả (gợi ý ý tưởng, kiểm duyệt AI, quản lý tiến độ), đồng thời chưa tạo được môi trường tương tác cộng đồng mạnh mẽ giữa tác giả và độc giả. Độc giả gặp khó khăn khi tìm kiếm truyện phù hợp với sở thích, còn tác giả thiếu công cụ để tiếp cận, giữ chân độc giả và bảo vệ quyền sở hữu trí tuệ. Hệ thống YAG hướng đến giải quyết các vấn đề này bằng cách tích hợp AI hỗ trợ sáng tác, kiểm duyệt nội dung, tìm kiếm thông minh, đồng thời xây dựng một không gian mạng xã hội chuyên biệt cho cộng đồng mê truyện.

### 2.2. Operating Environment
- Hệ thống được triển khai dưới dạng Web Application, truy cập qua các trình duyệt hiện đại hỗ trợ HTML5 và WebSockets (Google Chrome, Microsoft Edge, Firefox).
- Backend sử dụng Python (FastAPI) để tích hợp AI, xử lý dữ liệu lớn và cung cấp API.
- Frontend phát triển với Next.js, xây dựng giao diện SPA tối ưu trải nghiệm người dùng.
- Dữ liệu lưu trữ trên PostgreSQL, hỗ trợ backup định kỳ lên Google Cloud Storage.
- Hệ thống sử dụng Apache làm máy chủ phân phối nội dung, tích hợp các dịch vụ AI/LLM từ Google hoặc đối tác tương đương.
- Các dịch vụ phụ trợ như Redis, RabbitMQ phục vụ cache, xử lý bất đồng bộ và đồng bộ hóa bản thảo thời gian thực.
- Thanh toán thực hiện qua cổng VNPAY, đảm bảo an toàn và xác thực giao dịch.

### 2.3. Design & Implementation Constraints

- Hệ thống phải đảm bảo bảo mật thông tin người dùng, mã hóa mật khẩu (Bcrypt), JWT authentication, bảo vệ dữ liệu thanh toán qua HTTPS/TLS 1.2+.
- Tất cả người dùng đều phải đăng ký, đăng nhập để sử dụng dịch vụ.
- Tính năng AI phải xử lý bất đồng bộ, không gây treo giao diện người dùng, có giới hạn số request và fallback khi fail.
- Giao diện phải tương thích đa nền tảng, hỗ trợ các chế độ bảo vệ mắt (Dark mode).
- Thiết kế theo hướng Modular Monolith, sẵn sàng tách module AI thành Microservice khi cần mở rộng.
- Hệ thống phải hỗ trợ đồng bộ hóa bản thảo thời gian thực với độ trễ thấp (<200ms).
- Đảm bảo uptime tối thiểu 99.5%, dữ liệu phải được backup định kỳ.
- Tuân thủ các quy định về kiểm duyệt nội dung, bảo vệ quyền sở hữu trí tuệ và quyền riêng tư người dùng.

## 3. Requirements Overview
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120151 Huỳnh Yến Nhi

### 3.1. Stakeholders

| STT | Stakeholder | Mô tả vai trò |
| :--- | :--- | :--- |
| 1 | **Tác giả (Author)** | Người sáng tạo nội dung. Sử dụng Studio để soạn thảo, quản lý tác phẩm, nhận gợi ý từ AI và theo dõi thống kê,doanh thu. |
| 2 | **Độc giả (Reader)** | Người sử dụng dịch vụ. Tìm kiếm truyện bằng AI, tham gia cộng đồng tương tác và thực hiện thanh toán Membership nếu có nhu cầu. |
| 3 | **Quản trị viên (Admin)** | Nhân viên vận hành. Kiểm duyệt các nội dung bị gắn cờ, quản lý người dùng và giám sát các cam kết lộ trình của tác giả. |
| 4 | **Hệ thống AI (AI Engine)** | Tác nhân hệ thống (Gemini API). Cung cấp khả năng xử lý ngôn ngữ tự nhiên: gợi ý tình tiết, tìm kiếm ngữ nghĩa và quét nội dung vi phạm. |
| 5 | **Đối tác thanh toán (VNPAY/MOMO)** | Bên thứ ba xử lý giao dịch. Đảm bảo tính an toàn và xác thực các khoản thanh toán cho gói hội viên. |
---
### 3.2. Requirements
#### 3.2.1. Functional Requirements Specification
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120182 Nguyễn Duy Trường

Các yêu cầu được phân nhóm dựa trên các luồng nghiệp vụ cốt lõi đã đề xuất trong kiến trúc hệ thống:

**Nhóm 1: Quản lý Tài khoản & Phân quyền (Auth & RBAC)**
*   **FR-01:** Hệ thống phải cho phép người dùng đăng ký, đăng nhập và đặt lại mật khẩu qua Email.
*   **FR-02:** Hệ thống phải thực hiện phân quyền người dùng (Role-Based Access Control) để kiểm soát quyền đọc truyện VIP và quyền truy cập Admin Dashboard.

**Nhóm 2: Hỗ trợ Sáng tác & Quản lý nội dung (Author Studio)**
*   **FR-03:** Cung cấp trình soạn thảo hỗ trợ lưu bản thảo tự động thời gian thực (WebSockets).
*   **FR-04:** Tích hợp AI gợi ý phát triển tình tiết (AI Story Suggestion) dựa trên ngữ cảnh bản thảo hiện tại.
*   **FR-05:** Cho phép tác giả thiết lập lịch đăng và thực hiện cam kết lộ trình (Schedule Commitment).

**Nhóm 3: Khám phá thông minh (Search & Recommendation)**
*   **FR-06:** Cho phép tìm kiếm truyện qua tên, tác giả hoặc mô tả cốt truyện bằng ngôn ngữ tự nhiên (AI Semantic Search).
*   **FR-07:** Tự động đề xuất danh sách truyện phù hợp với sở thích của từng độc giả dựa trên lịch sử tương tác.

**Nhóm 4: Tương tác & Doanh thu (Community & Payment)**
*   **FR-08:** Cho phép người dùng tham gia bình luận, đánh giá (Rating) và thảo luận trong Diễn đàn (Forum).
*   **FR-09:** Xử lý thanh toán mua gói Membership qua cổng VNPAY để mở khóa các chương truyện độc quyền/đọc sớm.

**Nhóm 5: Kiểm duyệt & Giám sát (Moderation & Monitoring)**
*   **FR-10:** AI tự động quét và phân loại nội dung vi phạm chính sách (Moderation) ngay khi tác giả gửi yêu cầu xuất bản.
*   **FR-11:** Hệ thống Scheduler tự động gửi thông báo nhắc nhở và cảnh báo nếu tác giả trễ lịch cập nhật chương theo cam kết.

#### 3.2.2. Non-Functional Requirements Specification
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120182 Nguyễn Duy Trường

**1. Hiệu năng (Performance)**
*   Thời gian phản hồi của tính năng Tìm kiếm thông minh AI phải dưới **1.5 giây**.
*   Các tác vụ nặng (Kiểm duyệt AI) phải được xử lý bất đồng bộ qua hàng đợi (RabbitMQ), không gây treo giao diện người dùng.
*   Hệ thống hỗ trợ đồng bộ hóa bản thảo thời gian thực với độ trễ (latency) dưới **200ms**.

**2. Bảo mật (Security)**
*   Mật khẩu phải được mã hóa bằng thuật toán **Bcrypt** trước khi lưu trữ.
*   Áp dụng **Rate Limiting** tại API Gateway để ngăn chặn bot tự động cào nội dung truyện (Anti-crawling).
*   Dữ liệu thanh toán phải được bảo vệ qua giao thức HTTPS/TLS 1.2 trở lên.

**3. Độ tin cậy & Sẵn sàng (Reliability & Availability)**
*   Hệ thống duy trì trạng thái sẵn sàng (Uptime) tối thiểu **99.5%**.
*   Dữ liệu PostgreSQL phải được sao lưu định kỳ (Daily backup) lên Google Cloud Storage.

**4. Khả năng mở rộng (Scalability)**
*   Thiết kế theo **Modular Monolith** để dễ dàng tách module AI Smart Engine thành Microservice độc lập khi lượng truy cập tăng cao.

**5. Tính khả dụng (Usability)**
*   Giao diện đọc truyện phải tương thích với mọi trình duyệt hiện đại và hỗ trợ các chế độ bảo vệ mắt (Dark mode, Sepia).

## 4. Requirements Analysis 
### 4.1. Use Case model
    Written by: 23120182 Nguyễn Duy Trường
    Edited by: 
    Reviewed by: 23120169 Nguyễn Phú Thọ
 

```mermaid
%%{init: {'theme': 'default', 'look': 'handDrawn'}}%%
flowchart LR
    %% --- ĐỊNH NGHĨA STYLE MÀU NỔI BẬT TRÊN NỀN TRẮNG ---
    classDef actor fill:#ffffff,stroke:#FF00FF,stroke-width:3px,color:#000000,font-weight:bold;
    classDef admin fill:#ffffff,stroke:#FF4500,stroke-width:3px,color:#000000,font-weight:bold;
    classDef ai fill:#ffffff,stroke:#00A8FF,stroke-width:3px,color:#000000,font-weight:bold;
    classDef usecase fill:#ffffff,stroke:#00D81A,stroke-width:2px,color:#000000;
    classDef payment fill:#ffffff,stroke:#FF9100,stroke-width:2px,color:#000000;
    
    %% --- ACTORS BÊN TRÁI ---
    Author(("Tác giả")):::actor
    Reader(("Độc giả")):::actor
    Admin(("Quản trị viên")):::admin

    %% Cố định 3 actor thẳng hàng dọc bên trái
    Author ~~~ Reader ~~~ Admin

    %% --- HỆ THỐNG YAG ---
    subgraph YAG ["Hệ thống YAG Writing Web"]
        direction TB
        
        subgraph Account ["Tài khoản"]
            UC_Auth("Đăng ký / Đăng nhập"):::usecase
            UC_Profile("Quản lý hồ sơ"):::usecase
        end
        
        subgraph Studio ["Studio Sáng tác"]
            UC_Write("Soạn thảo chương"):::usecase
            UC_Publish("Xuất bản truyện"):::usecase
            UC_AIAssist("Gợi ý tình tiết"):::usecase
        end

        subgraph Explore ["Khám phá"]
            UC_AISearch("Tìm kiếm thông minh"):::usecase
            UC_Recommend("Đề xuất truyện"):::usecase
        end

        subgraph Community ["Cộng đồng & Thanh toán"]
            UC_Interact("Bình luận / Đánh giá"):::usecase
            UC_Member("Đăng ký Membership"):::usecase
            UC_Payment("Thanh toán VNPAY"):::payment
        end

        subgraph Management ["Quản trị"]
            UC_Moderate("Kiểm duyệt nội dung"):::usecase
            UC_Monitor("Giám sát lộ trình"):::usecase
        end
    end

    %% --- ACTOR BÊN PHẢI (Backend) ---
    AI_Engine{{"Hệ thống AI"}}:::ai

    %% --- FLOW TƯƠNG TÁC ---
    %% Tác giả
    Author --->|Truy cập| UC_Auth
    Author --->|Sáng tác| UC_Write
    Author --->|Phát hành| UC_Publish
    Author --->|Sử dụng| UC_AIAssist

    %% Độc giả
    Reader --->|Truy cập| UC_Auth
    Reader --->|Tìm & Đọc| UC_AISearch
    Reader --->|Nâng cấp| UC_Member
    Reader --->|Tham gia| UC_Interact

    %% Admin
    Admin --->|Quản lý| UC_Auth
    Admin --->|Kiểm duyệt| UC_Moderate
    Admin --->|Theo dõi| UC_Monitor

    %% --- FLOW DEPENDENCIES BÊN TRONG ---
    UC_Write -.->|Chờ duyệt| UC_Moderate
    UC_Publish -.->|Phê duyệt| UC_Moderate
    UC_Member --->|Chuyển hướng API| UC_Payment

    %% --- FLOW AI ---
    UC_AISearch -. "Xử lý NLP" .-> AI_Engine
    UC_AIAssist -. "Sinh văn bản" .-> AI_Engine
    UC_Moderate -. "Quét vi phạm" .-> AI_Engine
    UC_Recommend -. "Mô hình gợi ý" .-> AI_Engine
```
### 4.2. Use Case Specification
#### 4.2.1. U001: Đăng ký / Đăng nhập
    Written by: 23120182 Nguyễn Duy Trường
    Edited by: 
    Reviewed by: 23120177 Phạm Hương Trà


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U001 |
| **Use Case** | Đăng ký / Đăng nhập |
| **Brief Description** | Cho phép người dùng tạo tài khoản mới hoặc truy cập vào hệ thống để nhận các phân quyền tương ứng. |
| **Actor** | Người dùng (User) |
| **Pre-Condition** | Người dùng truy cập vào trang Đăng ký/Đăng nhập trên trình duyệt web. |
| **Result** | Thông tin được lưu trữ an toàn (Đăng ký) hoặc người dùng đăng nhập thành công, được cấp JWT và chuyển hướng giao diện. |
| **Main Scenario** | 1. Người dùng chọn Đăng ký hoặc Đăng nhập.<br>2. Người dùng nhập thông tin (email/username, mật khẩu).<br>3. Hệ thống kiểm tra tính hợp lệ của dữ liệu.<br>4. (Đăng ký) Hệ thống mã hóa mật khẩu bằng Bcrypt và lưu vào Database PostgreSQL.<br>5. (Đăng nhập) Hệ thống đối chiếu mật khẩu đã băm, cấp JWT và chuyển hướng. |
| **Alternative Scenarios** | - Email đã tồn tại (Đăng ký): Hiển thị lỗi và yêu cầu sử dụng email khác.<br>- Sai thông tin (Đăng nhập): Hiển thị thông báo tài khoản hoặc mật khẩu không đúng.<br>- Quên mật khẩu: Kích hoạt gửi link khôi phục qua Email. |
| **Non-Functional Constraints** | - Mật khẩu bắt buộc phải băm bằng Bcrypt.<br>- Sử dụng Rate Limiting ở API Gateway để chống Brute-force. |


#### 4.2.2. U002: Quản lý hồ sơ
    Written by: 23120182 Nguyễn Duy Trường
    Edited by: 
    Reviewed by: 23120177 Phạm Hương Trà


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U002 |
| **Use Case** | Quản lý hồ sơ |
| **Brief Description** | Người dùng xem, cập nhật thông tin cá nhân và quản lý lịch sử hoạt động trên hệ thống. |
| **Actor** | Người dùng (User) |
| **Pre-Condition** | Người dùng đã đăng nhập thành công vào hệ thống (JWT còn hiệu lực). |
| **Result** | Thông tin cá nhân được cập nhật vào PostgreSQL; ảnh đại diện lưu trên Cloudinary/Firebase. |
| **Main Scenario** | 1. Người dùng truy cập trang "Hồ sơ cá nhân".<br>2. Hệ thống hiển thị thông tin cơ bản và lịch sử hoạt động (truyện, forum).<br>3. Người dùng thay đổi thông tin (Ảnh đại diện, tên hiển thị).<br>4. Hệ thống tải ảnh lên Cloudinary/Firebase và lấy URL.<br>5. Cập nhật dữ liệu vào PostgreSQL và hiển thị thông báo thành công. |
| **Alternative Scenarios** | - Đổi mật khẩu: Xác thực mật khẩu cũ bằng Bcrypt trước khi lưu mật khẩu mới.<br>- Lỗi tải ảnh: Báo lỗi nếu ảnh sai định dạng hoặc quá dung lượng.<br>- Xem hồ sơ public: Ẩn các nút chức năng bảo mật nếu xem hồ sơ người khác. |
| **Non-Functional Constraints** | - Bảo mật quyền riêng tư khi hiển thị thông tin Public.<br>- Tối ưu hóa dung lượng lưu trữ ảnh thông qua CDN. |


#### 4.2.3. U003: Soạn thảo chương truyện
    Written by: 23120182 Nguyễn Duy Trường
    Edited by: 
    Reviewed by: 23120177 Phạm Hương Trà


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U003 |
| **Use Case** | Soạn thảo chương truyện |
| **Brief Description** | Tác giả nhập văn bản, nhận gợi ý từ AI trong không gian Studio và lưu bản nháp. |
| **Actor** | Tác giả (Author), Hệ thống AI (AI Smart Engine) |
| **Pre-Condition** | Tác giả đã đăng nhập, vào Studio và chọn thêm chương truyện mới. |
| **Result** | Nội dung được lưu an toàn vào Database dưới trạng thái Bản nháp (Draft). |
| **Main Scenario** | 1. Tác giả nhập tiêu đề và nội dung vào khung soạn thảo.<br>2. Tác giả yêu cầu AI hỗ trợ ý tưởng thông qua Sidebar bên phải.<br>3. AI Smart Engine phân tích ngữ cảnh, gọi Gemini API sinh văn bản gợi ý.<br>4. Tác giả tham khảo ý tưởng và hoàn thiện nội dung.<br>5. Tác giả nhấn "Lưu nháp", hệ thống lưu vào bảng Chapters trong PostgreSQL. |
| **Alternative Scenarios** | - AI hết Quota/Lỗi: Xử lý Fallback, báo lỗi AI bận nhưng không làm treo trang web.<br>- Mất kết nối mạng: Tự động lưu tạm (Auto-save) xuống LocalStorage. |
| **Non-Functional Constraints** | - Giao diện chia đôi màn hình (Split View 70/30) giúp không gián đoạn trải nghiệm. |


#### 4.2.4. U004: Xuất bản truyện
    Written by: 23120182 Nguyễn Duy Trường
    Edited by: 
    Reviewed by: 23120177 Phạm Hương Trà


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U004 |
| **Use Case** | Xuất bản truyện |
| **Brief Description** | Tác giả gửi yêu cầu xuất bản, hệ thống tiếp nhận và tự động kiểm duyệt ngầm nội dung bằng AI. |
| **Actor** | Tác giả (Author), Hệ thống AI (AI Smart Engine) |
| **Pre-Condition** | Tác giả hoàn tất soạn thảo và đang ở giao diện Studio. |
| **Result** | Trạng thái chương truyện được cập nhật thành APPROVED (Hiển thị) hoặc REJECTED (Bị từ chối). |
| **Main Scenario** | 1. Tác giả nhấn nút "Đăng xuất bản".<br>2. Hệ thống lưu Database (trạng thái PENDING) và đẩy Task vào hàng đợi RabbitMQ.<br>3. Trả về mã HTTP 202, thông báo đang kiểm duyệt để tác giả có thể đóng tab.<br>4. AI Moderator lấy Task từ RabbitMQ, gọi LLM API quét nội dung nhạy cảm.<br>5. Cập nhật trạng thái APPROVED, gửi thông báo thành công qua WebSocket. |
| **Alternative Scenarios** | - Nội dung vi phạm: AI cập nhật thành REJECTED, gửi WebSocket báo lý do từ chối.<br>- AI quá tải (Rate Limit): Task được giữ an toàn trong RabbitMQ để Retry ngầm, không làm thất thoát bản thảo hay treo máy tác giả. |
| **Non-Functional Constraints** | - Quá trình kiểm duyệt bất đồng bộ phải hoàn thành dưới 5 phút.<br>- Không dùng màn hình loading (Spinner) gây gián đoạn công việc của tác giả. |


#### 4.2.5. U005: Gợi ý tình tiết AI
    Written by: 23120123 Trần Gia Hiển
    Edited by: 
    Reviewed by: 23120182 Nguyễn Duy Trường


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U005 |
| **Use Case** | Gợi ý tình tiết AI (AI Story Suggestion) |
| **Brief Description** | Hỗ trợ tác giả phát triển ý tưởng truyện dựa trên văn cảnh hiện tại khi gặp tình trạng bí ý tưởng. |
| **Actor** | Author, AI Engine (Gemini) |
| **Pre-Condition** | Tác giả đang trong giao diện soạn thảo và đã có nội dung bản thảo (ít nhất 100 từ) để làm ngữ cảnh. |
| **Result** | Danh sách các phương án gợi ý tình tiết tiếp theo được hiển thị để tác giả lựa chọn. |
| **Main Scenario** | 1. Tác giả chọn đoạn văn ngữ cảnh hoặc đặt con trỏ tại vị trí cần gợi ý.<br>2. Tác giả nhấn nút "AI Suggest".<br>3. Hệ thống gửi nội dung bản thảo hiện tại đến AI Engine qua API.<br>4. AI phân tích phong cách, bối cảnh và đưa ra 3 phương án phát triển tiếp theo.<br>5. Tác giả xem qua, chọn 1 phương án và nhấn "Chèn vào truyện". |
| **Alternative Scenarios** | - Ngữ cảnh quá ngắn: Hệ thống thông báo tác giả cần viết thêm để AI có đủ dữ liệu phân tích.<br>- Lỗi kết nối AI: Hệ thống thông báo lỗi API và đề nghị tác giả thử lại sau. |
| **Non-Functional Constraints** | - Thời gian phản hồi của AI < 5 giây.<br>- Gợi ý phải đảm bảo tính sáng tạo và phù hợp với thể loại truyện đang viết. |


#### 4.2.6. U006: Tìm kiếm thông minh AI
    Written by: 23120123 Trần Gia Hiển
    Edited by: 
    Reviewed by: 23120182 Nguyễn Duy Trường


| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U006 |
| **Use Case** | Tìm kiếm thông minh AI (AI Semantic Search) |
| **Brief Description** | Tìm truyện bằng cách mô tả cốt truyện thông qua ngôn ngữ tự nhiên. |
| **Actor** | Reader, AI Engine |
| **Pre-Condition** | Độc giả truy cập thanh tìm kiếm thông minh. |
| **Result** | Danh sách truyện có nội dung tương đồng nhất với mô tả. |
| **Main Scenario** | 1. Độc giả nhập mô tả cốt truyện.<br>2. Hệ thống chuyển mô tả sang Vector.<br>3. So khớp Vector trong pgvector DB.<br>4. Hiển thị kết quả xếp hạng theo độ tương đồng. |
| **Alternative Scenarios** | - Không tìm thấy kết quả tương đồng: Gợi ý tìm kiếm theo từ khóa cơ bản. |
| **Non-Functional Constraints** | - Thời gian truy vấn Vector < 1s; Độ chính xác ngữ nghĩa cao. |

#### 4.2.7. U007: Đề xuất truyện
    Written by: 23120123 Trần Gia Hiển
    Edited by: 
    Reviewed by: 23120182 Nguyễn Duy Trường



#### 4.2.8. U008: Bình luận & Đánh giá
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120123 Trần Gia Hiển

| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U008 |
| **Use Case** | Bình luận & Đánh giá (Interact: Comment & Rate) |
| **Brief Description** | Độc giả để lại ý kiến cá nhân và mức điểm đánh giá cho tác phẩm hoặc chương truyện cụ thể nhằm tăng tương tác cộng đồng. |
| **Actor** | Reader |
| **Pre-Condition** | Độc giả đã đăng nhập vào hệ thống và đang ở trang chi tiết truyện hoặc trang đọc chương. |
| **Result** | Bình luận/Đánh giá được lưu vào hệ thống và hiển thị công khai cho người dùng khác. |
| **Main Scenario** | 1. Độc giả nhập nội dung bình luận vào khung soạn thảo hoặc chọn số sao đánh giá (1-5 sao).<br>2. Độc giả nhấn nút "Gửi".<br>3. Hệ thống kiểm tra tính hợp lệ của nội dung (không trống, không vi phạm từ cấm cơ bản).<br>4. Hệ thống lưu dữ liệu vào cơ sở dữ liệu và cập nhật điểm trung bình (Rating) của truyện.<br>5. Hệ thống hiển thị bình luận mới lên giao diện (Real-time qua WebSockets). |
| **Alternative Scenarios** | - **Vi phạm từ cấm:** Hệ thống hiển thị cảnh báo nội dung không phù hợp và yêu cầu chỉnh sửa.<br>- **Lỗi kết nối:** Hệ thống báo lỗi "Không thể gửi bình luận lúc này" và gợi ý thử lại. |
| **Non-Functional Constraints** | - Thời gian hiển thị bình luận sau khi nhấn gửi < 1 giây.<br>- Dữ liệu đánh giá phải được đồng bộ chính xác để không làm sai lệch điểm số của tác phẩm. |


#### 4.2.9. U009: Đăng ký Membership
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120123 Trần Gia Hiển

| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U009 |
| **Use Case** | Đăng ký Membership |
| **Brief Description** | Độc giả lựa chọn và đăng ký gói hội viên để hưởng các đặc quyền: đọc chương khóa, đọc sớm hoặc không quảng cáo. |
| **Actor** | Reader |
| **Pre-Condition** | Độc giả đã đăng nhập và chưa có gói Membership hoặc gói hiện tại sắp hết hạn. |
| **Result** | Yêu cầu đăng ký được tạo và chuyển sang bước thanh toán. |
| **Main Scenario** | 1. Độc giả truy cập trang "Membership".<br>2. Độc giả xem danh sách các gói (Tháng/Quý/Năm) và các quyền lợi đi kèm.<br>3. Độc giả chọn gói phù hợp và nhấn "Đăng ký ngay".<br>4. Hệ thống xác nhận thông tin gói và tổng số tiền.<br>5. Hệ thống chuyển hướng người dùng sang giao diện thanh toán (U010). |
| **Alternative Scenarios** | - **Đã có gói:** Hệ thống hiển thị thông báo "Bạn đang trong gói Membership" và hiển thị ngày hết hạn thay vì nút đăng ký mới. |
| **Non-Functional Constraints** | - Giao diện hiển thị gói cước phải trực quan, dễ so sánh quyền lợi. |

#### 4.2.10. U010: Thanh toán VNPAY
    Written by: 23120177 Phạm Hương Trà
    Edited by: 
    Reviewed by: 23120123 Trần Gia Hiển

| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U010 |
| **Use Case** | Thanh toán VNPAY (Payment) |
| **Brief Description** | Độc giả thực hiện thanh toán phí Membership thông qua cổng thanh toán VNPAY. |
| **Actor** | Reader, VNPAY System |
| **Pre-Condition** | Độc giả đã thực hiện bước Đăng ký Membership (U009). |
| **Result** | Giao dịch hoàn tất, tài khoản độc giả được nâng cấp lên hạng Membership. |
| **Main Scenario** | 1. Hệ thống tạo mã giao dịch duy nhất và gọi API VNPAY để lấy URL thanh toán.<br>2. Hệ thống chuyển hướng người dùng sang trang thanh toán của VNPAY.<br>3. Độc giả thực hiện xác thực và thanh toán trên giao diện VNPAY (App ngân hàng hoặc ví điện tử).<br>4. VNPAY gửi kết quả giao dịch về URL phản hồi (IPN/Return URL) của hệ thống.<br>5. Hệ thống kiểm tra chữ ký số (Checksum) để đảm bảo an toàn.<br>6. Nếu thành công, hệ thống cập nhật trạng thái tài khoản người dùng và thông báo kết quả. |
| **Alternative Scenarios** | - **Hủy thanh toán:** Người dùng nhấn nút "Quay lại" trên trang VNPAY. Hệ thống hủy giao dịch và đưa người dùng về trang chọn gói.<br>- **Thanh toán thất bại:** Do lỗi số dư hoặc lỗi kỹ thuật từ ngân hàng. Hệ thống thông báo lỗi và cho phép thực hiện lại. |
| **Non-Functional Constraints** | - Bảo mật tuyệt đối: Không lưu thông tin thẻ/tài khoản ngân hàng của người dùng trên hệ thống YAG.<br>- Thời gian xử lý cập nhật quyền hạn ngay sau khi nhận được phản hồi từ VNPAY < 2 giây. |


#### 4.2.11. U011: Kiểm duyệt nội dung AI
    Written by: 23120123 Trần Gia Hiển
    Edited by: 
    Reviewed by: 23120169 Nguyễn Phú Thọ



| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U011 |
| **Use Case** | Kiểm duyệt nội dung AI (Moderation) |
| **Brief Description** | Tự động quét nội dung vi phạm chính sách bằng AI. |
| **Actor** | AI Engine, Admin |
| **Pre-Condition** | Có chương truyện mới được xuất bản. |
| **Result** | Chương truyện được phê duyệt hoặc yêu cầu chỉnh sửa. |
| **Main Scenario** | 1. Hệ thống lấy nội dung chương truyện.<br>2. AI phân tích các yếu tố nhạy cảm.<br>3. Cập nhật trạng thái `Approved` nếu sạch.<br>4. Lưu log kiểm duyệt. |
| **Alternative Scenarios** | - AI nghi ngờ: Gắn cờ để Admin kiểm duyệt thủ công. |
| **Non-Functional Constraints** | - Tỷ lệ nhận diện sai thấp; Xử lý ngầm không block người dùng. |

#### 4.2.12. U012: Giám sát cam kết lộ trình
    Written by: 23120169 Nguyễn Phú Thọ
    Edited by: 
    Reviewed by: 23120151 Huỳnh Yến Nhi

| Mục | Nội dung |
| :--- | :--- |
| **Use case ID** | U012 |
| **Use Case** | Giám sát cam kết lộ trình (Schedule Commitment Monitoring) |
| **Brief Description** | Hệ thống tự động theo dõi và nhắc nhở tác giả đăng chương mới đúng lịch, đồng thời cảnh báo khi tác giả có nguy cơ vi phạm cam kết "không bỏ dở tác phẩm (drop)". |
| **Actor** | System (Scheduler), Author, Admin |
| **Pre-Condition** | Tác giả đã đăng ký lịch đăng chương định kỳ (theo tuần, theo tháng,…) và cam kết không drop tác phẩm khi xuất bản truyện. |
| **Result** | Hệ thống ghi nhận trạng thái tuân thủ lịch đăng của tác giả; tác giả được nhắc nhở hoặc bị cảnh báo vi phạm cam kết nếu trễ hạn. |
| **Main Scenario** | 1. Hệ thống Scheduler định kỳ kiểm tra danh sách các tác phẩm đang trong lịch đăng chương, chưa hoàn thành.<br>2. Hệ thống so sánh thời điểm hiện tại với lịch đăng đã cam kết của từng tác phẩm.<br>3. Nếu tác giả đăng chương đúng hạn, hệ thống cập nhật trạng thái `On Schedule` và ghi log.<br>4. Hệ thống cập nhật thống kê tỷ lệ tuân thủ cam kết (độ uy tín) lên hồ sơ tác giả. |
| **Alternative Scenarios** | - Tác giả sắp trễ hạn (còn ≤ 24 giờ): Hệ thống gửi thông báo nhắc nhở tác giả đăng chương đúng hạn.<br>- Tác giả trễ hạn: Hệ thống cập nhật trạng thái `Overdue`, gửi cảnh báo vi phạm đến tác giả và gắn cờ tác phẩm để Admin xem xét.<br>- Tác giả vi phạm nhiều lần: Admin nhận thông báo tổng hợp và có thể áp dụng biện pháp xử lý (hạ xếp hạng tác giả, tác phẩm; khóa tài khoản tạm thời). |
| **Non-Functional Constraints** | - Scheduler chạy tự động mỗi giờ, không yêu cầu thao tác thủ công.<br>- Thông báo nhắc nhở phải được gửi đến tác giả trong vòng 5-10 phút kể từ khi phát hiện vi phạm.<br>- Toàn bộ log giám sát phải được lưu trữ để phục vụ thống kê và kiểm tra khi cần. |

## 5. AI Usage Declaration   
Chưa cần viết các mục này.

## 6. Presentation
Chưa cần viết các mục này.
Video thuyết trình:

## 7. Reflective Report
### 7.1 Most helpful sections
Chưa cần viết các mục này.
### 7.2 Unnecessary/Tedious sections
Chưa cần viết các mục này.