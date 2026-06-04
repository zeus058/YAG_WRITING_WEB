import Link from "next/link";
import { BrandLogo, Icon } from "@/components/ui";

export function ProductFooter() {
  return (
    <footer className="app-footer">
      <div className="app-footer-inner">
        <div className="app-footer-top">
          <div className="footer-brand-block">
            <BrandLogo className="footer-wordmark" />
            <p>Nền tảng đọc và sáng tác truyện trực tuyến thế hệ mới, tiên phong ứng dụng công nghệ hỗ trợ sáng tác thông minh và kết nối cộng đồng văn học.</p>
          </div>
          <div>
            <div className="footer-col-title">Độc giả</div>
            <Link href="/home">Trang chủ đọc</Link>
            <Link href="/discover">Khám phá truyện</Link>
            <Link href="/library">Thư viện cá nhân</Link>
            <Link href="/membership">Membership</Link>
          </div>
          <div>
            <div className="footer-col-title">Tác giả</div>
            <Link href="/author/stories">Tác phẩm của tôi</Link>
            <Link href="/author/stories/d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd/edit">Không gian viết</Link>
            <Link href="/author/stories/d6a2f7c0-2f9b-449e-ba23-9502e6c7d5bd/publish">Xuất bản chương</Link>
            <Link href="/author/schedule">Lịch đăng & cam kết</Link>
          </div>
          <div>
            <div className="footer-col-title">Dự án</div>
            <Link href="/about">Về YAG</Link>
            <Link href="/terms">Điều khoản sử dụng</Link>
            <Link href="/privacy">Chính sách bảo mật</Link>
            <Link href="/contact">Liên hệ hỗ trợ</Link>
          </div>
        </div>
        <div className="app-footer-bottom">
          <span>© 2026 YAG Writing Novels. Bảo lưu mọi quyền.</span>
          <div className="footer-socials">
            <Link className="social-btn" href="/profile/me" aria-label="Hồ sơ cá nhân"><Icon name="user" /></Link>
            <Link className="social-btn" href="/notifications" aria-label="Thông báo"><Icon name="bell" /></Link>
            <Link className="social-btn" href="/about" aria-label="Thông tin dự án"><Icon name="github" /></Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
