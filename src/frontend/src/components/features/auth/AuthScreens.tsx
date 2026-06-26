import type { ReactNode } from "react";
import { Icon, BrandLogo as ProductLogo } from "@/components/ui";
import { ProductFooter } from "@/components/layout";

function AuthBook({ index, className }: { index: number; className: string }) {
  const palettes = [
    ["#C81C30", "#FFECCE", "#41503D"],
    ["#3B82F6", "#FEBDB2", "#2E3829"],
    ["#F59E0B", "#FAFAF8", "#41503D"],
    ["#22C55E", "#FFECCE", "#243020"],
    ["#FEBDB2", "#C81C30", "#2E3829"],
  ];
  const [accent, light, dark] = palettes[index % palettes.length];

  return (
    <div className={`auth-book ${className}`}>
      <svg viewBox="0 0 120 168" aria-hidden="true">
        <rect width="120" height="168" rx="10" fill={dark} />
        <path d="M0 112 C28 90 50 126 82 98 C98 84 108 80 120 86 V168 H0Z" fill={light} opacity=".92" />
        <circle cx="92" cy="34" r="30" fill={accent} opacity=".86" />
        <path d="M22 34h48M22 50h32M22 136h70" stroke={light} strokeWidth="6" strokeLinecap="round" />
        <rect x="14" y="14" width="92" height="140" rx="8" fill="none" stroke={light} strokeOpacity=".32" strokeWidth="2" />
      </svg>
    </div>
  );
}

function AuthBackdrop() {
  return (
    <div className="auth-ambient" aria-hidden="true">
      {["book-one", "book-two", "book-three", "book-four", "book-five", "book-six"].map((className, index) => (
        <AuthBook index={index} className={className} key={className} />
      ))}
    </div>
  );
}

export function PasswordField({ id, label, value, shouldCheck = false }: { id: string; label: string; value: string; shouldCheck?: boolean }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="inline-actions password-input-row">
        <input id={id} className="input" defaultValue={value} type="password" data-password-input data-password-check={shouldCheck ? id : undefined} />
        <button className="button icon-button" type="button" data-password-toggle aria-label="Hiện mật khẩu">
          <Icon name="eye" />
        </button>
      </div>
    </div>
  );
}

function PasswordChecklist({ id }: { id: string }) {
  return (
    <div className="password-rules" data-password-rules={id} aria-live="polite">
      <div className="password-rule" data-rule="length"><span className="rule-icon"><Icon name="close" /></span><span>Tối thiểu 8 ký tự</span></div>
      <div className="password-rule" data-rule="mixed"><span className="rule-icon"><Icon name="close" /></span><span>Bao gồm số, chữ thường và chữ hoa</span></div>
      <div className="password-rule" data-rule="special"><span className="rule-icon"><Icon name="close" /></span><span>Có ký tự đặc biệt như @, #, !, %</span></div>
    </div>
  );
}

function AuthWindow({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <>
      <div className="auth-page auth-page-centered">
        <AuthBackdrop />
        <main className="auth-card-wrap">
          <section className="auth-card auth-window panel panel-pad">
            <div className="auth-window-head">
              <div>
                <ProductLogo className="auth-wordmark" />
                <div className="brand-caption" style={{ color: "var(--muted)" }}>{caption}</div>
              </div>
            </div>
            {children}
          </section>
        </main>
      </div>
      <ProductFooter />
    </>
  );
}

export function AuthScreen() {
  return (
    <AuthWindow caption="Đọc và viết truyện thông minh">
      <div className="tabs" role="tablist" aria-label="Chọn hình thức xác thực">
        <button className="tab-button active" type="button" data-tab-trigger="login">Đăng nhập</button>
        <button className="tab-button" type="button" data-tab-trigger="register">Đăng ký</button>
      </div>
      <div className="tab-panel active" data-tab-panel="login">
        <div className="stack" style={{ marginTop: 24 }}>
          <h1 className="section-title">Chào mừng trở lại</h1>
          <div className="field"><label>Email</label><input className="input" defaultValue="reader@yag.vn" type="email" /></div>
          <PasswordField id="loginPassword" label="Mật khẩu" value="Secure2026" />
          <label className="remember-row"><input type="checkbox" defaultChecked /> Lưu thông tin đăng nhập</label>
          <div className="inline-actions" style={{ justifyContent: "space-between" }}>
            <a className="button" href="/auth/recovery">Quên mật khẩu</a>
            <button className="button button-primary" type="button" data-navigate="/dashboard" data-toast="Đăng nhập thành công. Đang mở trang chủ dành cho độc giả."><Icon name="arrow" />Đăng nhập</button>
          </div>
        </div>
      </div>
      <div className="tab-panel" data-tab-panel="register">
        <div className="stack" style={{ marginTop: 24 }}>
          <h1 className="section-title">Tạo tài khoản YAG</h1>
          <div className="field"><label>Email</label><input className="input" defaultValue="new-author@yag.vn" type="email" /></div>
          <div className="field"><label>Username</label><input className="input" defaultValue="minh_writer" /></div>
          <PasswordField id="registerPassword" label="Mật khẩu" value="YagDemo1!" shouldCheck />
          <PasswordChecklist id="registerPassword" />
          <PasswordField id="registerConfirmPassword" label="Xác nhận mật khẩu" value="YagDemo1!" />
          <label className="pill"><input type="checkbox" defaultChecked /> Tôi đồng ý điều khoản nội dung</label>
          <button className="button button-primary" type="button" data-navigate="/dashboard" data-toast="Tài khoản đã được tạo. Đang mở trang chủ để bạn bắt đầu đọc truyện."><Icon name="check" />Đăng ký miễn phí</button>
        </div>
      </div>
    </AuthWindow>
  );
}

export function RecoveryScreen() {
  return (
    <AuthWindow caption="Khôi phục mật khẩu">
      <div className="stepper" aria-label="Tiến trình khôi phục">
        <div className="step active" data-recovery-step-label="1">1. Email</div>
        <div className="step" data-recovery-step-label="2">2. OTP</div>
        <div className="step" data-recovery-step-label="3">3. Mật khẩu</div>
      </div>
      <div className="recovery-step active stack" data-recovery-step="1">
        <h1 className="section-title">Nhập email</h1>
        <div className="field"><label>Email</label><input className="input" type="email" defaultValue="reader@yag.vn" /></div>
        <button className="button button-primary" type="button" data-recovery-next><Icon name="arrow" />Tiếp tục</button>
      </div>
      <div className="recovery-step stack" data-recovery-step="2">
        <h1 className="section-title">Nhập mã OTP</h1>
        <div className="field"><label>Mã OTP</label><input className="input" defaultValue="482913" inputMode="numeric" /><span className="field-note">Mã còn hiệu lực trong <strong>02:38</strong>.</span></div>
        <div className="notice"><Icon name="bell" />Nếu chưa nhận được mã, bạn có thể gửi lại sau khi countdown kết thúc.</div>
        <div className="inline-actions" style={{ justifyContent: "space-between" }}><button className="button" type="button" data-toast="Đã gửi lại mã OTP tới email.">Gửi lại OTP</button><button className="button button-primary" type="button" data-recovery-next><Icon name="arrow" />Xác minh</button></div>
      </div>
      <div className="recovery-step stack" data-recovery-step="3">
        <h1 className="section-title">Đặt mật khẩu mới</h1>
        <PasswordField id="resetPassword" label="Mật khẩu mới" value="NewSecure2026!" shouldCheck />
        <PasswordChecklist id="resetPassword" />
        <PasswordField id="resetConfirmPassword" label="Xác nhận mật khẩu mới" value="NewSecure2026!" />
        <button className="button button-primary" type="button" data-navigate="/auth" data-toast="Mật khẩu mới đã được lưu. Hãy đăng nhập lại bằng mật khẩu vừa đặt."><Icon name="check" />Hoàn tất</button>
      </div>
    </AuthWindow>
  );
}
