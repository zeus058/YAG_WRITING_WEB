"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { IconName } from "@/data/yag";
import { ProductFooter } from "@/components/layout";
import { BrandLogo, Icon } from "@/components/ui";

type InfoSection = {
  title: string;
  body: string;
  icon: IconName;
};

type InfoPageConfig = {
  badge: string;
  title: string;
  description: string;
  focusTitle: string;
  focusBody: string;
  facts: string[];
  sections: InfoSection[];
  primaryAction?: { label: string; href: string };
};

type ProjectKind = "about" | "terms" | "privacy" | "contact";

const projectNav = [
  { kind: "about", label: "Về YAG", href: "/about", icon: "book" },
  { kind: "terms", label: "Điều khoản", href: "/terms", icon: "check" },
  { kind: "privacy", label: "Bảo mật", href: "/privacy", icon: "lock" },
  { kind: "contact", label: "Liên hệ", href: "/contact", icon: "bell" },
] satisfies { kind: ProjectKind; label: string; href: string; icon: IconName }[];

const infoPages = {
  about: {
    badge: "Giới thiệu",
    title: "YAG Writing Novels",
    description:
      "YAG là nền tảng đọc và sáng tác truyện trực tuyến hiện đại, kết nối độc giả, tác giả và đội ngũ biên tập chuyên nghiệp trong một không gian trải nghiệm tối ưu.",
    focusTitle: "Tầm nhìn phát triển",
    focusBody:
      "YAG định hình là không gian văn học mạng thế hệ mới, ứng dụng AI hỗ trợ viết lách thông minh, bảo vệ bản quyền tối đa và tối ưu hóa doanh thu chia sẻ bền vững cho tác giả.",
    facts: ["100K+ Độc giả", "Gợi ý AI thông minh", "Kết nối trực tiếp"],
    primaryAction: { label: "Bắt đầu đọc", href: "/dashboard" },
    sections: [
      {
        title: "Không gian Độc giả",
        body: "Tìm kiếm truyện bằng ngôn ngữ tự nhiên thông minh, đọc tối giản chống mỏi mắt, lưu thư viện, bình luận tức thì và nhận đặc quyền gói Membership cao cấp.",
        icon: "book",
      },
      {
        title: "Studio cho Tác giả",
        body: "Giao diện soạn thảo split-screen hiện đại, trợ lý viết Miu AI đồng hành gợi ý cốt truyện, kiểm tra nhịp độ và theo dõi cam kết lịch đăng hiệu quả.",
        icon: "edit",
      },
      {
        title: "Kiểm duyệt & Vận hành",
        body: "Bảng quản trị tích hợp bộ lọc AI tự động quét từ ngữ vi phạm, phân cấp kiểm duyệt chuyên nghiệp và minh bạch trong xuất báo cáo thống kê doanh thu.",
        icon: "shield",
      },
      {
        title: "Bảo mật tài khoản",
        body: "Chuẩn xác thực mã hóa đa lớp, bảo mật tuyệt đối thông tin cá nhân và dữ liệu phiên đăng nhập trên mọi nền tảng thiết bị.",
        icon: "lock",
      },
    ],
  },
  terms: {
    badge: "Điều khoản",
    title: "Điều khoản sử dụng",
    description:
      "Chào mừng bạn đến với YAG. Bằng việc truy cập hoặc sử dụng dịch vụ của chúng tôi, bạn đồng ý tuân thủ các điều khoản hoạt động và tiêu chuẩn cộng đồng dưới đây.",
    focusTitle: "Trách nhiệm người dùng",
    focusBody:
      "Chúng tôi cam kết xây dựng một môi trường văn học mạng văn minh, sáng tạo và lành mạnh. Người dùng cần đảm bảo tính trung thực của tài khoản, tính bản quyền của nội dung đăng tải và ứng xử văn minh trong mọi thảo luận cộng đồng.",
    facts: ["Bảo hộ bản quyền", "Tiêu chuẩn cộng đồng", "Thanh toán an toàn"],
    primaryAction: { label: "Chính sách bảo mật", href: "/privacy" },
    sections: [
      {
        title: "Quản lý Tài khoản",
        body: "Người dùng chịu trách nhiệm bảo mật thông tin đăng nhập cá nhân và chỉ sử dụng tài khoản đúng với vai trò đã đăng ký.",
        icon: "user",
      },
      {
        title: "Sáng tạo & Bản quyền",
        body: "Tác giả cần sở hữu quyền hợp pháp với mọi nội dung đăng tải, nghiêm cấm các hành vi sao chép và chịu hoàn toàn trách nhiệm pháp lý.",
        icon: "edit",
      },
      {
        title: "Giao dịch an toàn",
        body: "Mọi giao dịch đăng ký Membership đi qua cổng thanh toán trung gian bảo mật; hệ thống tuyệt đối không lưu trữ thông tin thẻ ngân hàng.",
        icon: "card",
      },
      {
        title: "Tiêu chuẩn kiểm duyệt",
        body: "Ban quản trị có toàn quyền tạm ẩn, từ chối hoặc yêu cầu sửa đổi đối với các tác phẩm vi phạm thuần phong mỹ tục hoặc bản quyền.",
        icon: "shield",
      },
    ],
  },
  privacy: {
    badge: "Bảo mật",
    title: "Chính sách bảo mật",
    description:
      "YAG cam kết bảo vệ tuyệt đối quyền riêng tư và thông tin cá nhân của bạn. Chính sách này minh bạch cách chúng tôi bảo vệ thông tin cá nhân và dữ liệu đọc truyện.",
    focusTitle: "An toàn thông tin",
    focusBody:
      "Mọi dữ liệu cá nhân của người dùng trên YAG đều được mã hóa bằng chuẩn bảo mật tiên tiến nhất. Chúng tôi cam kết không bao giờ chia sẻ thông tin cá nhân, lịch sử đọc hay lịch sử thanh toán của bạn cho bất kỳ bên thứ ba nào.",
    facts: ["Mã hóa SSL/TLS", "Quyền kiểm soát dữ liệu", "Bảo mật tuyệt đối"],
    primaryAction: { label: "Cài đặt tài khoản", href: "/account-settings" },
    sections: [
      {
        title: "Thu thập Dữ liệu",
        body: "Thông tin email, tên hiển thị, bút danh chỉ được thu thập để phục vụ đăng nhập, quản lý vai trò và hiển thị hồ sơ cá nhân.",
        icon: "user",
      },
      {
        title: "Cá nhân hóa trải nghiệm",
        body: "Lịch sử đọc, tiến độ đọc truyện và tương tác cộng đồng giúp hệ thống đề xuất các tác phẩm phù hợp nhất với sở thích độc giả.",
        icon: "book",
      },
      {
        title: "Công nghệ mã hóa",
        body: "Mọi thông tin nhạy cảm của tài khoản đều được mã hóa một chiều (hashing) trước khi lưu trữ và truyền gửi dữ liệu qua SSL.",
        icon: "lock",
      },
      {
        title: "Quyền hạn của bạn",
        body: "Độc giả và tác giả có toàn quyền cập nhật thông tin cá nhân, thay đổi mật khẩu hoặc yêu cầu vô hiệu hóa tài khoản khi cần.",
        icon: "settings",
      },
    ],
  },
  contact: {
    badge: "Hỗ trợ",
    title: "Liên hệ YAG",
    description:
      "Đội ngũ chăm sóc khách hàng và hỗ trợ kỹ thuật của YAG luôn sẵn sàng lắng nghe và giải đáp mọi thắc mắc của bạn 24/7.",
    focusTitle: "Cam kết hỗ trợ",
    focusBody:
      "Mọi yêu cầu hỗ trợ gửi tới ban vận hành sẽ được ghi nhận và giải quyết chu đáo trong vòng tối đa 24 giờ làm việc, đảm bảo trải nghiệm của bạn không bị gián đoạn.",
    facts: ["Phản hồi <24h", "Hỗ trợ tác giả", "Xử lý giao dịch", "Kiểm duyệt nhanh"],
    primaryAction: { label: "Gửi thảo luận diễn đàn", href: "/forum" },
    sections: [
      {
        title: "Hỗ trợ Tài khoản",
        body: "Khắc phục lỗi đăng nhập, hướng dẫn khôi phục mật khẩu, thay đổi email và cập nhật các cấu hình bảo mật nâng cao.",
        icon: "lock",
      },
      {
        title: "Đồng hành cùng Tác giả",
        body: "Giải quyết các trục trặc về lưu bản nháp, xuất bản chương truyện, cài đặt lịch đăng hoặc sử dụng trợ lý Miu AI.",
        icon: "edit",
      },
      {
        title: "Xác minh giao dịch",
        body: "Hỗ trợ kiểm tra, đối soát giao dịch thanh toán gói Membership qua cổng VNPAY và kích hoạt tài khoản nhanh chóng.",
        icon: "card",
      },
      {
        title: "Giải quyết khiếu nại",
        body: "Tiếp nhận và xử lý các phản hồi về nội dung bị báo cáo vi phạm, hoặc khiếu nại từ chối duyệt chương từ ban quản trị.",
        icon: "shield",
      },
    ],
  },
} satisfies Record<string, InfoPageConfig>;

type InfoKind = keyof typeof infoPages;

export function InfoPage({ kind }: { kind: InfoKind }) {
  const page = infoPages[kind];
  
  // Interactive State
  const [activeTab, setActiveTab] = useState<number>(0);
  const [ticketSubject, setTicketSubject] = useState<string>("Tài khoản");
  const [ticketStep, setTicketStep] = useState<number>(1);
  const [agreePrivacy, setAgreePrivacy] = useState<boolean>(true);

  // Custom renders for premium interactive experience
  const renderInteractiveAbout = () => (
    <div className="stack" style={{ gap: 24 }}>
      {/* Ecosystem Visual Stats */}
      <section className="panel panel-pad info-focus-panel" style={{ background: "rgba(255, 255, 255, 0.86)", border: "1px solid var(--line)" }}>
        <h2 className="section-title" style={{ gridColumn: "1 / -1", marginBottom: 12 }}>Chỉ số hệ sinh thái YAG</h2>
        <div className="grid grid-4" style={{ gridColumn: "1 / -1", width: "100%", gap: 16 }}>
          <div className="panel panel-pad stack" style={{ alignItems: "center", textAlign: "center", background: "#FFFFFF", padding: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--crimson)" }}>100K+</span>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>Độc giả hoạt động</small>
          </div>
          <div className="panel panel-pad stack" style={{ alignItems: "center", textAlign: "center", background: "#FFFFFF", padding: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--green)" }}>5,000+</span>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>Tác phẩm hoàn thiện</small>
          </div>
          <div className="panel panel-pad stack" style={{ alignItems: "center", textAlign: "center", background: "#FFFFFF", padding: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--amber)" }}>98.6%</span>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>Độ hài lòng UX</small>
          </div>
          <div className="panel panel-pad stack" style={{ alignItems: "center", textAlign: "center", background: "#FFFFFF", padding: 16 }}>
            <span style={{ fontSize: 32, fontWeight: 900, color: "var(--blue)" }}>Realtime</span>
            <small style={{ color: "var(--muted)", fontWeight: 700 }}>Bình luận & Thông báo</small>
          </div>
        </div>
      </section>

      {/* Modern Ecosystem Interactive Cards */}
      <section className="info-card-grid" aria-label="Nội dung chính">
        {page.sections.map((section, idx) => (
          <article 
            className={`panel panel-pad stack info-card ${activeTab === idx ? "active" : ""}`} 
            style={{ 
              transition: "all 0.3s ease",
              borderColor: activeTab === idx ? "var(--coral)" : "",
              boxShadow: activeTab === idx ? "var(--shadow-lift)" : "",
              cursor: "pointer"
            }}
            onClick={() => setActiveTab(idx)}
            key={section.title}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="info-card-icon" style={{ background: activeTab === idx ? "var(--coral)" : "", color: activeTab === idx ? "#FFF" : "" }}><Icon name={section.icon} /></span>
              <h2 className="section-title" style={{ margin: 0, fontSize: 18 }}>{section.title}</h2>
            </div>
            <p style={{ marginTop: 12 }}>{section.body}</p>
            <span style={{ marginTop: "auto", fontSize: 12, fontWeight: 800, color: "var(--muted)" }}>Click để xem chi tiết ➜</span>
          </article>
        ))}
      </section>

      {/* Visual Timeline Section */}
      <section className="panel panel-pad stack" style={{ background: "rgba(255, 255, 255, 0.78)" }}>
        <h2 className="section-title">Lộ trình nâng cấp nền tảng</h2>
        <div className="stack" style={{ gap: 20, marginTop: 16, position: "relative", paddingLeft: 24 }}>
          <div style={{ position: "absolute", left: 8, top: 0, bottom: 0, width: 2, background: "rgba(65, 80, 61, 0.16)" }}></div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: -21, top: 4, width: 12, height: 12, borderRadius: "50%", background: "var(--crimson)", border: "3px fill #FFF" }}></div>
            <strong>Quý 1 - Quý 2 / 2026: Phiên bản 1.0 (Hiện tại)</strong>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Ra mắt giao diện đọc tối giản, split-screen soạn thảo dành cho tác giả, kiểm duyệt AI thời gian thực và tích hợp ví điện tử VNPAY.</p>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: -21, top: 4, width: 12, height: 12, borderRadius: "50%", background: "var(--green)" }}></div>
            <strong>Quý 3 - Quý 4 / 2026: Trợ lý Miu AI & Diễn đàn</strong>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Đồng bộ trợ lý viết Miu AI sâu vào trình soạn thảo, kích hoạt phòng thảo luận nhóm và triển khai cam kết điểm uy tín tác giả.</p>
          </div>
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: -21, top: 4, width: 12, height: 12, borderRadius: "50%", background: "var(--blue)" }}></div>
            <strong>Kế hoạch 2027: Bản quyền số Blockchain & App di động</strong>
            <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>Ứng dụng NFT hóa bản quyền tác phẩm và phát hành ứng dụng di động native trên cả iOS và Android.</p>
          </div>
        </div>
      </section>
    </div>
  );

  const renderInteractiveTerms = () => (
    <div className="stack" style={{ gap: 24 }}>
      {/* Interactive Tabs Accordion */}
      <section className="info-focus-panel" style={{ display: "grid", gridTemplateColumns: "1fr", background: "rgba(255, 255, 255, 0.86)", gap: 16 }}>
        <h2 className="section-title">Xem nhanh các điều khoản cốt lõi</h2>
        <div className="grid grid-4" style={{ gap: 8 }}>
          {page.sections.map((section, idx) => (
            <button
              key={section.title}
              onClick={() => setActiveTab(idx)}
              className={`button ${activeTab === idx ? "button-primary" : "button-ghost"}`}
              style={{ width: "100%", justifyContent: "center", textTransform: "none", height: "auto", padding: "10px 12px" }}
            >
              <Icon name={section.icon} />
              <span>{section.title}</span>
            </button>
          ))}
        </div>
        <div className="panel panel-pad stack" style={{ background: "#FFFFFF", border: "1px solid var(--line)", padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <span className="info-card-icon"><Icon name={page.sections[activeTab].icon} /></span>
            <strong style={{ fontSize: 18, color: "var(--jungle)" }}>{page.sections[activeTab].title}</strong>
          </div>
          <p style={{ color: "var(--muted)", margin: 0 }}>{page.sections[activeTab].body}</p>
          <div className="notice success" style={{ marginTop: 16 }}>
            <Icon name="check" />
            <span>Cam kết tuân thủ đúng nội dung giúp cộng đồng phát triển an toàn, bền vững.</span>
          </div>
        </div>
      </section>

      {/* Focus Panel */}
      <section className="panel panel-pad stack" style={{ background: "rgba(255, 255, 255, 0.78)" }}>
        <h2 className="section-title">{page.focusTitle}</h2>
        <p style={{ color: "var(--muted)", margin: "8px 0 0" }}>{page.focusBody}</p>
      </section>
    </div>
  );

  const renderInteractivePrivacy = () => (
    <div className="stack" style={{ gap: 24 }}>
      {/* Security Health Dashboard */}
      <section className="panel panel-pad info-focus-panel" style={{ background: "rgba(255, 255, 255, 0.86)" }}>
        <div className="stack" style={{ gap: 12 }}>
          <span className="badge badge-green"><Icon name="shield" /> An toàn tuyệt đối</span>
          <h2 className="section-title">Chỉ số bảo mật YAG</h2>
          <p style={{ color: "var(--muted)" }}>Dữ liệu của bạn được quản lý và bảo vệ nghiêm ngặt dưới hạ tầng đám mây được mã hóa.</p>
        </div>
        <div className="stack" style={{ gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Mã hóa đầu cuối SSL</strong><span style={{ color: "var(--green)", fontWeight: 800 }}>100% Hoạt động</span></div>
          <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "var(--green)" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Bảo mật mật khẩu (SHA-256)</strong><span style={{ color: "var(--green)", fontWeight: 800 }}>Đã kích hoạt</span></div>
          <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "var(--green)" }}></div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}><strong>Cổng thanh toán trung gian</strong><span style={{ color: "var(--green)", fontWeight: 800 }}>VNPAY (Không lưu số thẻ)</span></div>
          <div style={{ height: 8, background: "var(--line)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ width: "100%", height: "100%", background: "var(--green)" }}></div>
          </div>
        </div>
      </section>

      {/* Data Treatment Grid */}
      <section className="grid grid-2" style={{ gap: 16 }}>
        {page.sections.map((section, idx) => (
          <div 
            key={section.title} 
            className="panel panel-pad stack" 
            style={{ 
              background: "rgba(255, 255, 255, 0.78)",
              cursor: "pointer",
              transition: "transform 0.2s",
              border: activeTab === idx ? "1px solid var(--coral)" : ""
            }}
            onClick={() => setActiveTab(idx)}
            onMouseEnter={() => setActiveTab(idx)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
              <span className="info-card-icon" style={{ background: activeTab === idx ? "var(--coral)" : "", color: activeTab === idx ? "#FFF" : "" }}><Icon name={section.icon} /></span>
              <strong style={{ fontSize: 16, color: "var(--jungle)" }}>{section.title}</strong>
            </div>
            <p style={{ color: "var(--muted)", margin: 0, fontSize: 14 }}>{section.body}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const renderInteractiveContact = () => (
    <div className="stack" style={{ gap: 24 }}>
      {/* Visual Ticketing Guide Stepper */}
      <section className="panel panel-pad stack" style={{ background: "rgba(255, 255, 255, 0.86)" }}>
        <h2 className="section-title">Gửi phiếu yêu cầu hỗ trợ (Support Ticket)</h2>
        <div className="stepper" style={{ marginTop: 12, marginBottom: 12 }}>
          <div className={`step ${ticketStep >= 1 ? "active" : ""}`}>1. Chọn chủ đề</div>
          <div className={`step ${ticketStep >= 2 ? "active" : ""}`}>2. Nhập thông tin</div>
          <div className={`step ${ticketStep >= 3 ? "active" : ""}`}>3. Hoàn tất</div>
        </div>

        {ticketStep === 1 && (
          <div className="stack" style={{ gap: 16 }}>
            <p style={{ color: "var(--muted)", margin: 0 }}>Vui lòng chọn chủ đề bạn đang cần ban quản trị hỗ trợ nhanh nhất:</p>
            <div className="grid grid-4" style={{ gap: 12 }}>
              {["Tài khoản", "Sáng tác", "Thanh toán", "Khác"].map((subject) => (
                <button
                  key={subject}
                  onClick={() => setTicketSubject(subject)}
                  className={`panel panel-pad stack ${ticketSubject === subject ? "active" : ""}`}
                  style={{ 
                    cursor: "pointer", 
                    alignItems: "center", 
                    justifyContent: "center",
                    padding: 16,
                    border: ticketSubject === subject ? "2px solid var(--coral)" : "1px solid var(--line)",
                    background: ticketSubject === subject ? "var(--petal)" : "#FFFFFF",
                    transition: "all 0.2s"
                  }}
                >
                  <Icon name={subject === "Tài khoản" ? "lock" : subject === "Sáng tác" ? "edit" : subject === "Thanh toán" ? "card" : "bell"} />
                  <strong style={{ marginTop: 8, fontSize: 14, color: "var(--jungle)" }}>{subject}</strong>
                </button>
              ))}
            </div>
            <button className="button button-primary" style={{ alignSelf: "flex-end" }} onClick={() => setTicketStep(2)}>Tiếp tục ➜</button>
          </div>
        )}

        {ticketStep === 2 && (
          <form className="stack" style={{ gap: 16 }} onSubmit={(e) => { e.preventDefault(); setTicketStep(3); }}>
            <div className="grid grid-2">
              <div className="field">
                <label>Họ tên</label>
                <input className="input" defaultValue="Minh Nguyệt" required />
              </div>
              <div className="field">
                <label>Email liên hệ</label>
                <input className="input" type="email" defaultValue="reader@yag.vn" required />
              </div>
            </div>
            <div className="field">
              <label>Chủ đề đang xử lý</label>
              <input className="input" value={ticketSubject} disabled style={{ background: "var(--petal)", cursor: "not-allowed" }} />
            </div>
            <div className="field">
              <label>Nội dung chi tiết</label>
              <textarea className="textarea" placeholder="Vui lòng mô tả chi tiết vấn đề bạn đang gặp phải..." defaultValue="Tôi cần kiểm tra giao dịch Membership vừa thanh toán..." required />
            </div>
            <label className="remember-row">
              <input type="checkbox" checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)} />
              Tôi đồng ý cho phép bộ phận hỗ trợ kiểm tra lịch sử liên quan để xử lý sự cố.
            </label>
            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              <button className="button button-ghost" type="button" onClick={() => setTicketStep(1)}>Quay lại</button>
              <button className="button button-primary" type="submit" disabled={!agreePrivacy}>Gửi yêu cầu ➜</button>
            </div>
          </form>
        )}

        {ticketStep === 3 && (
          <div className="stack" style={{ gap: 16, alignItems: "center", textAlign: "center", padding: "24px 0" }}>
            <span className="info-card-icon" style={{ width: 64, height: 64, borderRadius: "50%", background: "var(--green)", color: "#FFF", fontSize: 28 }}>
              <Icon name="check" />
            </span>
            <h3 style={{ margin: 0, fontSize: 22, color: "var(--jungle)" }}>Gửi yêu cầu thành công!</h3>
            <p style={{ color: "var(--muted)", maxWidth: 480, margin: 0 }}>Mã phiếu hỗ trợ của bạn là <strong>#YAG-9883</strong>. Chúng tôi đã gửi email xác nhận và sẽ phản hồi xử lý trong vòng tối đa 24 giờ làm việc.</p>
            <button className="button button-primary" onClick={() => { setTicketStep(1); }}>Gửi yêu cầu mới</button>
          </div>
        )}
      </section>

      {/* Support FAQ Cards */}
      <section className="grid grid-2" style={{ gap: 16 }}>
        {page.sections.map((section) => (
          <article className="panel panel-pad stack info-card" key={section.title} style={{ background: "rgba(255, 255, 255, 0.78)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="info-card-icon"><Icon name={section.icon} /></span>
              <h2 className="section-title" style={{ margin: 0, fontSize: 16 }}>{section.title}</h2>
            </div>
            <p style={{ marginTop: 12 }}>{section.body}</p>
          </article>
        ))}
      </section>
    </div>
  );

  return (
    <div className="info-page">
      <header className="info-header">
        <Link href="/" aria-label="YAG">
          <BrandLogo />
        </Link>
        <Link href="/" className="button button-ghost" style={{ display: "inline-flex", alignItems: "center", gap: "8px", borderRadius: "99px", padding: "8px 16px" }}>
          <span style={{ display: "inline-flex", transform: "rotate(180deg)" }}><Icon name="arrow" /></span>
          <span>Về trang chủ</span>
        </Link>
      </header>

      <main className="info-main">
        {/* Visual Hero Block */}
        <section className="info-hero">
          <div className="info-hero-copy">
            <span className="badge badge-crimson">{page.badge}</span>
            <h1>{page.title}</h1>
            <p>{page.description}</p>
            <div className="inline-actions">
              {page.primaryAction ? <Link className="button button-primary" href={page.primaryAction.href}>{page.primaryAction.label}</Link> : null}
              <Link className="button" href="/contact">Liên hệ ngay</Link>
            </div>
          </div>
          <aside className="info-hero-summary" aria-label="Tóm tắt">
            <span>Hệ sinh thái YAG</span>
            <strong>{page.focusTitle}</strong>
            <div className="info-fact-list">
              {page.facts.map((fact) => <div key={fact}>{fact}</div>)}
            </div>
          </aside>
        </section>

        {/* Content Panel Layout */}
        <section className="info-layout">
          <aside className="info-page-nav" aria-label="Trang dự án">
            <strong>Trang thông tin</strong>
            {projectNav.map((item) => (
              <Link className={`info-nav-link ${item.kind === kind ? "active" : ""}`} href={item.href} key={item.kind}>
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </aside>

          <div className="info-content-stack">
            {kind === "about" && renderInteractiveAbout()}
            {kind === "terms" && renderInteractiveTerms()}
            {kind === "privacy" && renderInteractivePrivacy()}
            {kind === "contact" && renderInteractiveContact()}
          </div>
        </section>
      </main>

      <ProductFooter />
    </div>
  );
}
