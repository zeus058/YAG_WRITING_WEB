"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon, BrandLogo as ProductLogo } from "@/components/ui";
import { AuthBackdrop, AuthProductFooter } from "../_auth-chrome";
import { appEnv, yagApi } from "@/lib";

export default function PasswordRecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState("writer@yag.vn");
  const [otp, setOtp] = useState("123456");
  const [newPassword, setNewPassword] = useState("NewSecure2026!");
  const [confirmPassword, setConfirmPassword] = useState("NewSecure2026!");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // State thông báo (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  // Quy tắc mật khẩu mới
  const passwordRules = {
    length: newPassword.length >= 8,
    mixed: /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword) && /\d/.test(newPassword),
    special: /[^A-Za-z0-9]/.test(newPassword),
  };

  const triggerToast = (message: string, type: "success" | "warning" = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const handleStep1Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      triggerToast("Vui lòng nhập địa chỉ email chính xác.", "warning");
      return;
    }
    try {
      if (!appEnv.useMocks) {
        await yagApi.auth.requestPasswordReset({ email });
      }
      triggerToast("Mã xác thực OTP đã được gửi về email của bạn.", "success");
      setStep(2);
    } catch {
      triggerToast("Không thể gửi OTP. Vui lòng kiểm tra email hoặc kết nối API.", "warning");
    }
  };

  const handleStep2Submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      triggerToast("Mã OTP không hợp lệ. Vui lòng nhập đúng 6 chữ số.", "warning");
      return;
    }
    triggerToast("Xác thực OTP thành công. Vui lòng đặt mật khẩu mới.", "success");
    setStep(3);
  };

  const handleStep3Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      triggerToast("Vui lòng điền đầy đủ mật khẩu mới.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      triggerToast("Mật khẩu xác nhận không khớp.", "warning");
      return;
    }
    if (!passwordRules.length || !passwordRules.mixed || !passwordRules.special) {
      triggerToast("Mật khẩu mới của bạn chưa đáp ứng đủ tiêu chuẩn bảo mật.", "warning");
      return;
    }
    try {
      if (!appEnv.useMocks) {
        await yagApi.auth.confirmPasswordReset({ email, otp, password: newPassword });
      }
      triggerToast("Đặt lại mật khẩu thành công. Đang chuyển hướng về trang đăng nhập...", "success");
      setTimeout(() => {
        router.push("/auth");
      }, 900);
    } catch {
      triggerToast("Không thể đặt lại mật khẩu. Vui lòng kiểm tra OTP hoặc kết nối API.", "warning");
    }
  };

  return (
    <>
      <div className="auth-page auth-page-centered">
        <AuthBackdrop />
        <main className="auth-card-wrap">
          <section className="auth-card auth-window panel panel-pad">
            <div className="auth-window-head">
              <div>
                <ProductLogo className="auth-wordmark" />
                <div className="brand-caption" style={{ color: "var(--muted)" }}>
                  Khôi phục mật khẩu tài khoản
                </div>
              </div>
            </div>

            {/* PROGRESS STEPS BAR */}
            <div className="recovery-steps" style={{ display: "flex", gap: 16, margin: "16px 0 24px 0", justifyContent: "space-between" }}>
              <div className={`recovery-step ${step >= 1 ? "active" : ""}`} style={{ flex: 1, height: 4, background: step >= 1 ? "var(--crimson)" : "var(--muted)", borderRadius: 2 }} />
              <div className={`recovery-step ${step >= 2 ? "active" : ""}`} style={{ flex: 1, height: 4, background: step >= 2 ? "var(--crimson)" : "var(--muted)", borderRadius: 2 }} />
              <div className={`recovery-step ${step >= 3 ? "active" : ""}`} style={{ flex: 1, height: 4, background: step >= 3 ? "var(--crimson)" : "var(--muted)", borderRadius: 2 }} />
            </div>

            {/* STEP 1: YÊU CẦU GỬI OTP */}
            {step === 1 && (
              <form onSubmit={handleStep1Submit}>
                <div className="stack">
                  <h1 className="section-title">Quên mật khẩu?</h1>
                  <p className="field-help" style={{ marginBottom: 16 }}>
                    Nhập địa chỉ email đăng ký của bạn. Chúng tôi sẽ gửi mã OTP gồm 6 chữ số để xác minh quyền sở hữu tài khoản.
                  </p>

                  <div className="field">
                    <label htmlFor="recoveryEmail">Email đăng ký</label>
                    <input
                      id="recoveryEmail"
                      className="input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="inline-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
                    <Link className="button" href="/auth">
                      Quay lại
                    </Link>
                    <button className="button button-primary" type="submit">
                      <Icon name="arrow" /> Gửi mã OTP
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 2: NHẬP MÃ OTP */}
            {step === 2 && (
              <form onSubmit={handleStep2Submit}>
                <div className="stack">
                  <h1 className="section-title">Nhập mã xác thực</h1>
                  <p className="field-help" style={{ marginBottom: 16 }}>
                    Chúng tôi đã gửi mã xác thực tới hộp thư <strong>{email}</strong>. Vui lòng kiểm tra và nhập mã vào ô bên dưới.
                  </p>

                  <div className="field">
                    <label htmlFor="otpCode">Mã OTP (6 chữ số)</label>
                    <input
                      id="otpCode"
                      className="input"
                      type="text"
                      maxLength={6}
                      pattern="\d{6}"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      style={{ letterSpacing: 4, textAlign: "center", fontSize: 20, fontWeight: "bold" }}
                      required
                    />
                  </div>

                  <div className="inline-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
                    <button className="button" type="button" onClick={() => setStep(1)}>
                      Quay lại
                    </button>
                    <button className="button button-primary" type="submit">
                      <Icon name="check" /> Xác thực
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* STEP 3: THIẾT LẬP MẬT KHẨU MỚI */}
            {step === 3 && (
              <form onSubmit={handleStep3Submit}>
                <div className="stack">
                  <h1 className="section-title">Đặt mật khẩu mới</h1>
                  <p className="field-help" style={{ marginBottom: 16 }}>
                    Vui lòng đặt mật khẩu mới mạnh mẽ để bảo vệ tài khoản tốt hơn.
                  </p>

                  <div className="field">
                    <label htmlFor="newPassword">Mật khẩu mới</label>
                    <div className="inline-actions password-input-row">
                      <input
                        id="newPassword"
                        className="input"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                      <button
                        className="button icon-button"
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        aria-label={showNewPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>

                  {/* Bảng quy tắc mật khẩu mới */}
                  <div className="password-rules" aria-live="polite">
                    <div className={`password-rule ${passwordRules.length ? "valid" : ""}`}>
                      <span className="rule-icon">
                        {passwordRules.length ? <Icon name="check" /> : <Icon name="close" />}
                      </span>
                      <span>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className={`password-rule ${passwordRules.mixed ? "valid" : ""}`}>
                      <span className="rule-icon">
                        {passwordRules.mixed ? <Icon name="check" /> : <Icon name="close" />}
                      </span>
                      <span>Bao gồm số, chữ thường và chữ hoa</span>
                    </div>
                    <div className={`password-rule ${passwordRules.special ? "valid" : ""}`}>
                      <span className="rule-icon">
                        {passwordRules.special ? <Icon name="check" /> : <Icon name="close" />}
                      </span>
                      <span>Có ký tự đặc biệt như @, #, !, %</span>
                    </div>
                  </div>

                  <div className="field">
                    <label htmlFor="confirmPassword">Xác nhận mật khẩu mới</label>
                    <div className="inline-actions password-input-row">
                      <input
                        id="confirmPassword"
                        className="input"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        className="button icon-button"
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        aria-label={showConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>

                  <button className="button button-primary" type="submit" style={{ marginTop: 12 }}>
                    <Icon name="check" /> Lưu mật khẩu mới
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
      <AuthProductFooter />

      {/* Toast thông báo */}
      {toastMessage && (
        <div className="toast-stack">
          <div className={`toast toast-${toastType}`}>
            {toastMessage}
          </div>
        </div>
      )}
    </>
  );
}
