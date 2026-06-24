"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ApiError, yagApi } from "@/lib";
import { AuthBackdrop, AuthProductFooter } from "../AuthChrome";
import { Icon, BrandLogo as ProductLogo } from "@/components/ui";

type RecoveryStep = 1 | 2 | 3;
type ToastType = "success" | "warning" | "error";
type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[\w.-]+@[\w.-]+\.\w{2,}$/;

function passwordState(password: string) {
  return {
    length: password.length >= 8,
    mixed: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function recoveryErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") return "Lỗi kết nối. Vui lòng thử lại.";
  if (error instanceof TypeError) return "Lỗi kết nối. Vui lòng thử lại.";
  if (error instanceof ApiError) {
    const detail = typeof error.details === "object" && error.details && "detail" in error.details
      ? String((error.details as { detail?: unknown }).detail)
      : error.message;
    if (detail === "INVALID_OTP") return "Mã OTP không hợp lệ hoặc đã hết hạn.";
    if (detail === "REDIS_OFFLINE_ERROR") return "Hệ thống xác thực OTP đang bận. Vui lòng thử lại sau.";
    if (detail === "USER_NOT_FOUND") return "Nếu email tồn tại, bạn sẽ nhận được hướng dẫn.";
  }
  return fallback;
}

function PasswordInput({
  id,
  label,
  value,
  visible,
  placeholder,
  error,
  onToggle,
  onChange,
  onBlur,
}: {
  id: string;
  label: string;
  value: string;
  visible: boolean;
  placeholder: string;
  error?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
  onBlur?: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="inline-actions password-input-row">
        <input
          id={id}
          className={`input ${error ? "input-invalid" : ""}`}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete="new-password"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={`${id}Error`}
        />
        <button
          className="button icon-button"
          type="button"
          onClick={onToggle}
          aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
        >
          <Icon name={visible ? "eye" : "eyeOff"} />
        </button>
      </div>
    </div>
  );
}

function ErrorLine({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <div className="field-error" id={id} role="alert">
      <Icon name="close" />
      <span>{message}</span>
    </div>
  );
}

export default function PasswordRecoveryPage() {
  const router = useRouter();
  const [step, setStep] = useState<RecoveryStep>(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("success");

  const passwordRules = useMemo(() => passwordState(newPassword), [newPassword]);

  useEffect(() => {
    setEmail("");
    setOtp("");
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const triggerToast = (message: string, type: ToastType = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  const validateStep1 = (nextEmail = email) => {
    const nextErrors: FieldErrors = {};
    if (!nextEmail.trim()) nextErrors.email = "Vui lòng nhập email đã đăng ký.";
    else if (!EMAIL_RE.test(nextEmail.trim())) nextErrors.email = "Email không đúng định dạng.";
    setErrors((current) => ({ ...current, ...nextErrors, email: nextErrors.email ?? "" }));
    return nextErrors;
  };

  const validateStep2 = (nextOtp = otp) => {
    const nextErrors: FieldErrors = {};
    if (!/^\d{6}$/.test(nextOtp)) nextErrors.otp = "Mã OTP phải gồm đúng 6 chữ số.";
    setErrors((current) => ({ ...current, ...nextErrors, otp: nextErrors.otp ?? "" }));
    return nextErrors;
  };

  const validateStep3 = (
    nextPassword = newPassword,
    nextConfirmPassword = confirmPassword,
  ) => {
    const rules = passwordState(nextPassword);
    const nextErrors: FieldErrors = {};
    if (!nextPassword) nextErrors.newPassword = "Vui lòng nhập mật khẩu mới.";
    else if (!rules.length || !rules.mixed || !rules.special) {
      nextErrors.newPassword = "Mật khẩu mới cần có chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }
    if (!nextConfirmPassword) nextErrors.confirmPassword = "Vui lòng nhập lại mật khẩu mới.";
    else if (nextPassword !== nextConfirmPassword) nextErrors.confirmPassword = "Mật khẩu xác nhận không khớp.";
    setErrors((current) => ({
      ...current,
      newPassword: nextErrors.newPassword ?? "",
      confirmPassword: nextErrors.confirmPassword ?? "",
    }));
    return nextErrors;
  };

  const handleStep1Submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setTouched((current) => ({ ...current, email: true }));
    if (Object.keys(validateStep1()).length > 0) {
      triggerToast("Vui lòng nhập email hợp lệ.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await yagApi.auth.requestPasswordReset({ email: email.trim() });
      triggerToast("Nếu email tồn tại, bạn sẽ nhận được hướng dẫn khôi phục.", "success");
      setStep(2);
    } catch (error) {
      triggerToast(recoveryErrorMessage(error, "Lỗi kết nối. Vui lòng thử lại."), "warning");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStep2Submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setTouched((current) => ({ ...current, otp: true }));
    if (Object.keys(validateStep2()).length > 0) {
      triggerToast("Mã OTP không hợp lệ.", "warning");
      return;
    }
    setStep(3);
    triggerToast("OTP đã được ghi nhận. Vui lòng đặt mật khẩu mới.", "success");
  };

  const handleStep3Submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setTouched((current) => ({ ...current, newPassword: true, confirmPassword: true }));
    if (Object.keys(validateStep3()).length > 0) {
      triggerToast("Vui lòng kiểm tra mật khẩu mới.", "warning");
      return;
    }

    setIsSubmitting(true);
    try {
      await yagApi.auth.confirmPasswordReset({ email: email.trim(), otp, password: newPassword });
      triggerToast("Đặt lại mật khẩu thành công. Đang chuyển hướng về trang đăng nhập...", "success");
      window.setTimeout(() => router.push("/auth"), 800);
    } catch (error) {
      triggerToast(recoveryErrorMessage(error, "Không thể đặt lại mật khẩu. Vui lòng thử lại."), "warning");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="auth-page auth-page-centered">
        <AuthBackdrop />
        <main className="auth-card-wrap">
          <section className="auth-card auth-window panel panel-pad" aria-labelledby="recoveryTitle">
            <div className="auth-window-head">
              <div>
                <ProductLogo className="auth-wordmark" />
                <div className="brand-caption" style={{ color: "var(--muted)" }}>
                  Khôi phục mật khẩu tài khoản
                </div>
              </div>
            </div>

            <div className="recovery-progress" aria-label="Tiến trình khôi phục mật khẩu">
              {[1, 2, 3].map((item) => (
                <span key={item} className={`recovery-dot ${step >= item ? "active" : ""}`} />
              ))}
            </div>

            {step === 1 && (
              <form onSubmit={handleStep1Submit} autoComplete="off" noValidate>
                <div className="stack">
                  <h1 className="section-title" id="recoveryTitle">Quên mật khẩu?</h1>
                  <p className="field-help">
                    Nhập email đã đăng ký. Vì lý do bảo mật, YAG luôn phản hồi chung và không tiết lộ email có tồn tại hay không.
                  </p>

                  <div className="field">
                    <label htmlFor="recoveryEmail">Email đăng ký</label>
                    <input
                      id="recoveryEmail"
                      name="yag-recovery-email"
                      className={`input ${touched.email && errors.email ? "input-invalid" : ""}`}
                      type="email"
                      value={email}
                      onChange={(event) => {
                        const value = event.target.value;
                        setEmail(value);
                        if (touched.email) validateStep1(value);
                      }}
                      onBlur={() => {
                        setTouched((current) => ({ ...current, email: true }));
                        validateStep1();
                      }}
                      placeholder="Nhập email đã đăng ký"
                      autoComplete="off"
                      aria-invalid={touched.email && errors.email ? "true" : "false"}
                      aria-describedby="recoveryEmailHelp recoveryEmailError"
                    />
                    <span className="field-note" id="recoveryEmailHelp">Ví dụ: ten@email.com</span>
                    <ErrorLine id="recoveryEmailError" message={touched.email ? errors.email : undefined} />
                  </div>

                  <div className="inline-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
                    <Link className="button" href="/auth">
                      Quay lại
                    </Link>
                    <button className="button button-primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                      <Icon name="arrow" /> {isSubmitting ? "Đang gửi..." : "Gửi mã OTP"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={handleStep2Submit} autoComplete="off" noValidate>
                <div className="stack">
                  <h1 className="section-title" id="recoveryTitle">Nhập mã xác thực</h1>
                  <p className="field-help">
                    Nếu email tồn tại, mã OTP 6 chữ số đã được gửi tới hộp thư tương ứng.
                  </p>

                  <div className="field">
                    <label htmlFor="otpCode">Mã OTP</label>
                    <input
                      id="otpCode"
                      className={`input ${touched.otp && errors.otp ? "input-invalid" : ""}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(event) => {
                        const value = event.target.value.replace(/\D/g, "").slice(0, 6);
                        setOtp(value);
                        if (touched.otp) validateStep2(value);
                      }}
                      onBlur={() => {
                        setTouched((current) => ({ ...current, otp: true }));
                        validateStep2();
                      }}
                      placeholder="000000"
                      autoComplete="one-time-code"
                      aria-invalid={touched.otp && errors.otp ? "true" : "false"}
                      aria-describedby="otpCodeError"
                      style={{ letterSpacing: 4, textAlign: "center", fontSize: 20, fontWeight: "bold" }}
                    />
                    <ErrorLine id="otpCodeError" message={touched.otp ? errors.otp : undefined} />
                  </div>

                  <div className="inline-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
                    <button className="button" type="button" onClick={() => setStep(1)} disabled={isSubmitting}>
                      Quay lại
                    </button>
                    <button className="button button-primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                      <Icon name="check" /> Xác thực
                    </button>
                  </div>
                </div>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={handleStep3Submit} autoComplete="off" noValidate>
                <div className="stack">
                  <h1 className="section-title" id="recoveryTitle">Đặt mật khẩu mới</h1>
                  <p className="field-help">
                    OTP có hiệu lực ngắn hạn. Nếu mã hết hạn, hãy quay lại bước đầu để gửi lại email khôi phục.
                  </p>

                  <PasswordInput
                    id="newPassword"
                    label="Mật khẩu mới"
                    value={newPassword}
                    visible={showNewPassword}
                    onToggle={() => setShowNewPassword((current) => !current)}
                    onChange={(value) => {
                      setNewPassword(value);
                      if (touched.newPassword || touched.confirmPassword) validateStep3(value, confirmPassword);
                    }}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, newPassword: true }));
                      validateStep3();
                    }}
                    placeholder="Tối thiểu 8 ký tự"
                    error={touched.newPassword ? errors.newPassword : undefined}
                  />
                  <ErrorLine id="newPasswordError" message={touched.newPassword ? errors.newPassword : undefined} />

                  <div className="password-rules" aria-live="polite">
                    <div className={`password-rule ${passwordRules.length ? "valid" : ""}`}>
                      <span className="rule-icon">{passwordRules.length ? <Icon name="check" /> : <Icon name="close" />}</span>
                      <span>Tối thiểu 8 ký tự</span>
                    </div>
                    <div className={`password-rule ${passwordRules.mixed ? "valid" : ""}`}>
                      <span className="rule-icon">{passwordRules.mixed ? <Icon name="check" /> : <Icon name="close" />}</span>
                      <span>Bao gồm số, chữ thường và chữ hoa</span>
                    </div>
                    <div className={`password-rule ${passwordRules.special ? "valid" : ""}`}>
                      <span className="rule-icon">{passwordRules.special ? <Icon name="check" /> : <Icon name="close" />}</span>
                      <span>Có ký tự đặc biệt như @, #, !, %</span>
                    </div>
                  </div>

                  <PasswordInput
                    id="confirmPassword"
                    label="Xác nhận mật khẩu mới"
                    value={confirmPassword}
                    visible={showConfirmPassword}
                    onToggle={() => setShowConfirmPassword((current) => !current)}
                    onChange={(value) => {
                      setConfirmPassword(value);
                      if (touched.confirmPassword) validateStep3(newPassword, value);
                    }}
                    onBlur={() => {
                      setTouched((current) => ({ ...current, confirmPassword: true }));
                      validateStep3();
                    }}
                    placeholder="Nhập lại mật khẩu mới"
                    error={touched.confirmPassword ? errors.confirmPassword : undefined}
                  />
                  <ErrorLine id="confirmPasswordError" message={touched.confirmPassword ? errors.confirmPassword : undefined} />

                  <div className="inline-actions" style={{ justifyContent: "space-between", marginTop: 12 }}>
                    <button className="button" type="button" onClick={() => setStep(1)} disabled={isSubmitting}>
                      Gửi lại email
                    </button>
                    <button className="button button-primary" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                      <Icon name="check" /> {isSubmitting ? "Đang lưu..." : "Lưu mật khẩu mới"}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
      <AuthProductFooter />

      {toastMessage && (
        <div className="toast-stack" role="status" aria-live="polite">
          <div className={`toast toast-${toastType}`}>
            <strong>{toastType === "success" ? "YAG" : "Cần chú ý"}</strong>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
}
