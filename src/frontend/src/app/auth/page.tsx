"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError, appEnv, useAuth, yagApi } from "@/lib";
import { AuthBackdrop, AuthProductFooter } from "./AuthChrome";
import { Icon, BrandLogo as ProductLogo } from "@/components/ui";

type AuthTab = "login" | "register";
type ToastType = "success" | "warning" | "error";
type FieldErrors = Record<string, string>;

const EMAIL_RE = /^[\w.-]+@[\w.-]+\.\w{2,}$/;
const USERNAME_RE = /^[A-Za-z0-9_]{4,20}$/;
const LOCKOUT_KEY_PREFIX = "yag.auth.lockout";
const LOCKOUT_MAX_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MS = 15 * 60 * 1000;

function userDestination(role?: string, redirect?: string | null) {
  if (redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/auth")) {
    return redirect;
  }
  return role === "admin" ? "/admin" : "/home";
}

function passwordState(password: string) {
  return {
    length: password.length >= 8,
    mixed: /[a-z]/.test(password) && /[A-Z]/.test(password) && /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function authErrorMessage(error: unknown, fallback: string) {
  if (error instanceof DOMException && error.name === "AbortError") {
    return "Lỗi kết nối. Vui lòng thử lại.";
  }
  if (error instanceof TypeError) {
    return "Lỗi kết nối. Vui lòng thử lại.";
  }
  if (error instanceof ApiError) {
    const detail = typeof error.details === "object" && error.details && "detail" in error.details
      ? String((error.details as { detail?: unknown }).detail)
      : error.message;
    if (detail === "INVALID_CREDENTIALS") return "Email hoặc mật khẩu không chính xác.";
    if (detail === "ACCOUNT_LOCKED" || detail === "ACCOUNT_TEMP_LOCKED") {
      return "Tài khoản bị tạm khoá. Thử lại sau 15 phút.";
    }
    if (detail === "EMAIL_EXISTS") return "Email này đã được sử dụng.";
    if (detail === "USERNAME_EXISTS") return "Tên đăng nhập đã được dùng.";
  }
  return fallback;
}

function lockoutKey(identity: string) {
  return `${LOCKOUT_KEY_PREFIX}:${identity.trim().toLowerCase() || "unknown"}`;
}

function readLockout(identity: string) {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(lockoutKey(identity));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as { attempts: number; lockedUntil?: number };
    if (data.lockedUntil && data.lockedUntil > Date.now()) return data;
    if (data.lockedUntil && data.lockedUntil <= Date.now()) {
      window.localStorage.removeItem(lockoutKey(identity));
      return null;
    }
    return data;
  } catch {
    window.localStorage.removeItem(lockoutKey(identity));
    return null;
  }
}

function recordLoginFailure(identity: string) {
  if (typeof window === "undefined") return null;
  const current = readLockout(identity);
  const attempts = (current?.attempts ?? 0) + 1;
  const payload = {
    attempts,
    lockedUntil: attempts >= LOCKOUT_MAX_ATTEMPTS ? Date.now() + LOCKOUT_WINDOW_MS : undefined,
  };
  window.localStorage.setItem(lockoutKey(identity), JSON.stringify(payload));
  return payload;
}

function clearLoginFailures(identity: string) {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(lockoutKey(identity));
}

function PasswordInput({
  id,
  value,
  label,
  placeholder,
  autoComplete,
  describedBy,
  invalid,
  visible,
  onToggle,
  onBlur,
  onChange,
  onPaste,
}: {
  id: string;
  value: string;
  label: string;
  placeholder: string;
  autoComplete: string;
  describedBy?: string;
  invalid?: boolean;
  visible: boolean;
  onToggle: () => void;
  onBlur?: () => void;
  onChange: (value: string) => void;
  onPaste?: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="inline-actions password-input-row">
        <input
          id={id}
          className={`input ${invalid ? "input-invalid" : ""}`}
          type={visible ? "text" : "password"}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          onPaste={onPaste}
          placeholder={placeholder}
          autoComplete={autoComplete}
          aria-invalid={invalid ? "true" : "false"}
          aria-describedby={describedBy}
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

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect");
  const tabParam = searchParams?.get("tab");
  const {
    login: setAuthSession,
    isAuthenticated,
    isLoading,
    user,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<AuthTab>("login");

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginErrors, setLoginErrors] = useState<FieldErrors>({});
  const [loginSubmitting, setLoginSubmitting] = useState(false);

  const [registerEmail, setRegisterEmail] = useState("");
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [registerErrors, setRegisterErrors] = useState<FieldErrors>({});
  const [registerTouched, setRegisterTouched] = useState<Record<string, boolean>>({});
  const [registerSubmitting, setRegisterSubmitting] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<ToastType>("success");

  const passwordRules = useMemo(() => passwordState(registerPassword), [registerPassword]);
  const hasPasswordReady = passwordRules.length && passwordRules.mixed && passwordRules.special;

  useEffect(() => {
    if (tabParam === "register" || tabParam === "signup") setActiveTab("register");
    if (tabParam === "login") setActiveTab("login");
  }, [tabParam]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(userDestination(user?.role, redirect));
    }
  }, [isLoading, isAuthenticated, redirect, router, user?.role]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const triggerToast = (message: string, type: ToastType = "success") => {
    setToastMessage(message);
    setToastType(type);
  };

  const validateLogin = () => {
    const errors: FieldErrors = {};
    if (!loginEmail.trim()) errors.loginEmail = "Vui lòng nhập email hoặc tên đăng nhập.";
    if (!loginPassword) errors.loginPassword = "Vui lòng nhập mật khẩu.";
    setLoginErrors(errors);
    return errors;
  };

  const validateRegister = (next: Partial<{
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    terms: boolean;
  }> = {}) => {
    const email = next.email ?? registerEmail;
    const username = next.username ?? registerUsername;
    const password = next.password ?? registerPassword;
    const confirmPassword = next.confirmPassword ?? registerConfirmPassword;
    const terms = next.terms ?? agreeTerms;
    const rules = passwordState(password);
    const errors: FieldErrors = {};

    if (!email.trim()) errors.registerEmail = "Vui lòng nhập email.";
    else if (!EMAIL_RE.test(email.trim())) errors.registerEmail = "Email không đúng định dạng.";

    if (!username.trim()) errors.registerUsername = "Vui lòng nhập tên đăng nhập.";
    else if (!USERNAME_RE.test(username.trim())) {
      errors.registerUsername = "Username cần 4-20 ký tự, chỉ gồm chữ, số hoặc dấu gạch dưới.";
    }

    if (!password) errors.registerPassword = "Vui lòng nhập mật khẩu.";
    else if (!rules.length || !rules.mixed || !rules.special) {
      errors.registerPassword = "Mật khẩu cần tối thiểu 8 ký tự, có chữ hoa, chữ thường, số và ký tự đặc biệt.";
    }

    if (!confirmPassword) errors.registerConfirmPassword = "Vui lòng nhập lại mật khẩu.";
    else if (password !== confirmPassword) errors.registerConfirmPassword = "Xác nhận mật khẩu không trùng khớp.";

    if (!terms) errors.terms = "Bạn cần đồng ý điều khoản trước khi tạo tài khoản.";

    setRegisterErrors(errors);
    return errors;
  };

  const touchRegister = (field: string, next?: Parameters<typeof validateRegister>[0]) => {
    setRegisterTouched((current) => ({ ...current, [field]: true }));
    validateRegister(next);
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loginSubmitting) return;

    const errors = validateLogin();
    if (Object.keys(errors).length > 0) {
      triggerToast("Vui lòng kiểm tra lại thông tin đăng nhập.", "warning");
      return;
    }

    const lockout = readLockout(loginEmail);
    if (lockout?.lockedUntil) {
      setLoginErrors({ loginEmail: "Tài khoản bị tạm khoá. Thử lại sau 15 phút." });
      triggerToast("Tài khoản bị tạm khoá. Thử lại sau 15 phút.", "warning");
      return;
    }

    setLoginSubmitting(true);
    try {
      let userObj: { id: string; email: string; username: string; role: "reader" | "author" | "admin" };
      if (appEnv.useMocks) {
        userObj = {
          id: loginEmail.includes("admin") ? "admin-id" : "reader-id",
          email: loginEmail,
          username: loginEmail.split("@")[0] || "reader",
          role: loginEmail.includes("admin") ? "admin" : "reader",
        };
        setAuthSession({ accessToken: "mock-token", user: userObj });
      } else {
        const result = await yagApi.auth.login({ email: loginEmail.trim(), password: loginPassword });
        if (!result.data.accessToken || !result.data.user) {
          throw new Error("INVALID_AUTH_RESPONSE");
        }
        userObj = result.data.user;
        setAuthSession({ accessToken: result.data.accessToken, user: result.data.user });
      }
      clearLoginFailures(loginEmail);
      triggerToast("Đăng nhập thành công. Đang chuyển hướng...", "success");
      window.setTimeout(() => router.push(userDestination(userObj.role, redirect)), 500);
    } catch (error) {
      const failure = recordLoginFailure(loginEmail);
      const message = failure?.lockedUntil
        ? "Tài khoản bị tạm khoá. Thử lại sau 15 phút."
        : authErrorMessage(error, "Email hoặc mật khẩu không chính xác.");
      setLoginErrors({ loginPassword: message });
      triggerToast(message, "warning");
      setLoginSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (registerSubmitting) return;
    setRegisterTouched({
      registerEmail: true,
      registerUsername: true,
      registerPassword: true,
      registerConfirmPassword: true,
      terms: true,
    });

    const errors = validateRegister();
    if (Object.keys(errors).length > 0) {
      triggerToast("Vui lòng hoàn tất các trường còn thiếu hoặc chưa hợp lệ.", "warning");
      return;
    }

    setRegisterSubmitting(true);
    try {
      let userObj: { id: string; email: string; username: string; role: "reader" | "author" | "admin" };
      if (appEnv.useMocks) {
        userObj = {
          id: "reader-id",
          email: registerEmail,
          username: registerUsername,
          role: "reader",
        };
        setAuthSession({ accessToken: "mock-token", user: userObj });
      } else {
        const result = await yagApi.auth.register({
          email: registerEmail.trim(),
          username: registerUsername.trim(),
          password: registerPassword,
        });
        if (!result.data.accessToken || !result.data.user) {
          throw new Error("INVALID_AUTH_RESPONSE");
        }
        userObj = result.data.user;
        setAuthSession({ accessToken: result.data.accessToken, user: result.data.user });
      }
      triggerToast("Tài khoản đã được tạo thành công. Đang đăng nhập...", "success");
      window.setTimeout(() => router.push(userDestination(userObj.role, redirect)), 500);
    } catch (error) {
      const message = authErrorMessage(error, "Không thể tạo tài khoản. Vui lòng thử lại.");
      if (message.includes("Email")) setRegisterErrors((current) => ({ ...current, registerEmail: message }));
      if (message.includes("đăng nhập")) setRegisterErrors((current) => ({ ...current, registerEmail: message }));
      if (message.includes("Tên đăng nhập")) setRegisterErrors((current) => ({ ...current, registerUsername: message }));
      triggerToast(message, "warning");
      setRegisterSubmitting(false);
    }
  };

  if (isLoading || isAuthenticated) {
    return (
      <main className="auth-page auth-page-centered" style={{ background: "var(--background)" }}>
        <div className="stack" style={{ alignItems: "center", gap: 16 }}>
          <div className="brand-logo spinner" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, fontSize: 20 }}>
            YAG
          </div>
          <h1 style={{ color: "var(--muted)", fontSize: 16, fontWeight: "normal" }}>Đang chuẩn bị phiên đăng nhập...</h1>
        </div>
      </main>
    );
  }

  return (
    <>
      <div className="auth-page auth-page-centered">
        <AuthBackdrop />
        <main className="auth-card-wrap">
          <section className="auth-card auth-window panel panel-pad" aria-labelledby={activeTab === "login" ? "loginTitle" : "registerTitle"}>
            <div className="auth-window-head">
              <div>
                <ProductLogo className="auth-wordmark" />
                <div className="brand-caption" style={{ color: "var(--muted)" }}>
                  Đọc và viết truyện thông minh
                </div>
              </div>
            </div>

            <div className="tabs auth-tabs" role="tablist" aria-label="Chọn hình thức xác thực">
              <button
                className={`tab-button ${activeTab === "login" ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "login"}
                onClick={() => setActiveTab("login")}
              >
                Đăng nhập
              </button>
              <button
                className={`tab-button ${activeTab === "register" ? "active" : ""}`}
                type="button"
                role="tab"
                aria-selected={activeTab === "register"}
                onClick={() => setActiveTab("register")}
              >
                Đăng ký
              </button>
            </div>

            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="tab-panel active" noValidate>
                <div className="stack" style={{ marginTop: 24 }}>
                  <h1 className="section-title" id="loginTitle">Chào mừng trở lại</h1>

                  <div className="field">
                    <label htmlFor="loginEmail">Email hoặc username</label>
                    <input
                      id="loginEmail"
                      className={`input ${loginErrors.loginEmail ? "input-invalid" : ""}`}
                      type="text"
                      value={loginEmail}
                      onChange={(event) => {
                        setLoginEmail(event.target.value);
                        if (loginErrors.loginEmail) setLoginErrors((current) => ({ ...current, loginEmail: "" }));
                      }}
                      onBlur={validateLogin}
                      placeholder="Email hoặc tên đăng nhập"
                      autoComplete={rememberMe ? "username" : "off"}
                      aria-invalid={loginErrors.loginEmail ? "true" : "false"}
                      aria-describedby="loginEmailHelp loginEmailError"
                    />
                    <span className="field-note" id="loginEmailHelp">Dùng email đã đăng ký hoặc username của bạn.</span>
                    <ErrorLine id="loginEmailError" message={loginErrors.loginEmail} />
                  </div>

                  <PasswordInput
                    id="loginPassword"
                    label="Mật khẩu"
                    value={loginPassword}
                    visible={showLoginPassword}
                    onToggle={() => setShowLoginPassword((current) => !current)}
                    onChange={(value) => {
                      setLoginPassword(value);
                      if (loginErrors.loginPassword) setLoginErrors((current) => ({ ...current, loginPassword: "" }));
                    }}
                    onBlur={validateLogin}
                    placeholder="Mật khẩu của bạn"
                    autoComplete={rememberMe ? "current-password" : "off"}
                    invalid={!!loginErrors.loginPassword}
                    describedBy="loginPasswordError"
                  />
                  <ErrorLine id="loginPasswordError" message={loginErrors.loginPassword} />

                  <label className="remember-row">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(event) => setRememberMe(event.target.checked)}
                    />
                    Lưu thông tin đăng nhập trên thiết bị này
                  </label>

                  <div className="inline-actions auth-action-row" style={{ justifyContent: "space-between" }}>
                    <Link className="button" href="/auth/recovery">
                      Quên mật khẩu
                    </Link>
                    <button className="button button-primary" type="submit" disabled={loginSubmitting} aria-busy={loginSubmitting}>
                      <Icon name="arrow" /> {loginSubmitting ? "Đang đăng nhập..." : "Đăng nhập"}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="tab-panel active" noValidate>
                <div className="stack" style={{ marginTop: 24 }}>
                  <h1 className="section-title" id="registerTitle">Tạo tài khoản YAG</h1>

                  <div className="field">
                    <label htmlFor="registerEmail">Email</label>
                    <input
                      id="registerEmail"
                      className={`input ${registerTouched.registerEmail && registerErrors.registerEmail ? "input-invalid" : ""}`}
                      type="email"
                      value={registerEmail}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRegisterEmail(value);
                        if (registerTouched.registerEmail) validateRegister({ email: value });
                      }}
                      onBlur={() => touchRegister("registerEmail")}
                      placeholder="vd: ten@email.com"
                      autoComplete="email"
                      aria-invalid={registerTouched.registerEmail && registerErrors.registerEmail ? "true" : "false"}
                      aria-describedby="registerEmailHelp registerEmailError"
                    />
                    <span className="field-note" id="registerEmailHelp">Email dùng để đăng nhập và khôi phục mật khẩu.</span>
                    <ErrorLine id="registerEmailError" message={registerTouched.registerEmail ? registerErrors.registerEmail : undefined} />
                  </div>

                  <div className="field">
                    <label htmlFor="registerUsername">Username</label>
                    <input
                      id="registerUsername"
                      className={`input ${registerTouched.registerUsername && registerErrors.registerUsername ? "input-invalid" : ""}`}
                      type="text"
                      value={registerUsername}
                      onChange={(event) => {
                        const value = event.target.value;
                        setRegisterUsername(value);
                        if (registerTouched.registerUsername) validateRegister({ username: value });
                      }}
                      onBlur={() => touchRegister("registerUsername")}
                      placeholder="4-20 ký tự, không dấu"
                      autoComplete="username"
                      aria-invalid={registerTouched.registerUsername && registerErrors.registerUsername ? "true" : "false"}
                      aria-describedby="registerUsernameHelp registerUsernameError"
                    />
                    <span className="field-note" id="registerUsernameHelp">Chỉ dùng chữ cái, số và dấu gạch dưới.</span>
                    <ErrorLine id="registerUsernameError" message={registerTouched.registerUsername ? registerErrors.registerUsername : undefined} />
                  </div>

                  <PasswordInput
                    id="registerPassword"
                    label="Mật khẩu"
                    value={registerPassword}
                    visible={showRegisterPassword}
                    onToggle={() => setShowRegisterPassword((current) => !current)}
                    onChange={(value) => {
                      setRegisterPassword(value);
                      if (registerTouched.registerPassword || registerTouched.registerConfirmPassword) validateRegister({ password: value });
                    }}
                    onBlur={() => touchRegister("registerPassword")}
                    placeholder="Tối thiểu 8 ký tự"
                    autoComplete="new-password"
                    invalid={registerTouched.registerPassword && !!registerErrors.registerPassword}
                    describedBy="registerPasswordHelp registerPasswordError"
                  />
                  <ErrorLine id="registerPasswordError" message={registerTouched.registerPassword ? registerErrors.registerPassword : undefined} />

                  <div className="password-rules" id="registerPasswordHelp" aria-live="polite">
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
                    id="registerConfirmPassword"
                    label="Xác nhận mật khẩu"
                    value={registerConfirmPassword}
                    visible={showRegisterConfirmPassword}
                    onToggle={() => setShowRegisterConfirmPassword((current) => !current)}
                    onChange={(value) => {
                      setRegisterConfirmPassword(value);
                      if (registerTouched.registerConfirmPassword) validateRegister({ confirmPassword: value });
                    }}
                    onPaste={() => window.setTimeout(() => touchRegister("registerConfirmPassword"), 0)}
                    onBlur={() => touchRegister("registerConfirmPassword")}
                    placeholder="Nhập lại mật khẩu"
                    autoComplete="new-password"
                    invalid={registerTouched.registerConfirmPassword && !!registerErrors.registerConfirmPassword}
                    describedBy="registerConfirmPasswordError"
                  />
                  <ErrorLine id="registerConfirmPasswordError" message={registerTouched.registerConfirmPassword ? registerErrors.registerConfirmPassword : undefined} />

                  <label className={`auth-terms-row ${registerTouched.terms && registerErrors.terms ? "input-invalid" : ""}`}>
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(event) => {
                        const checked = event.target.checked;
                        setAgreeTerms(checked);
                        setRegisterTouched((current) => ({ ...current, terms: true }));
                        validateRegister({ terms: checked });
                      }}
                    />
                    Tôi đồng ý điều khoản nội dung và chính sách bảo mật YAG
                  </label>
                  <ErrorLine id="termsError" message={registerTouched.terms ? registerErrors.terms : undefined} />

                  <button className="button button-primary" type="submit" disabled={registerSubmitting} aria-busy={registerSubmitting || !hasPasswordReady}>
                    <Icon name="check" /> {registerSubmitting ? "Đang tạo tài khoản..." : "Đăng ký miễn phí"}
                  </button>
                  <p className="field-note">
                    Đã có tài khoản?{" "}
                    <button className="link-button" type="button" onClick={() => setActiveTab("login")}>
                      Đăng nhập
                    </button>
                  </p>
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

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-page auth-page-centered" style={{ background: "var(--background)" }}>
          <div className="stack" style={{ alignItems: "center", gap: 16 }}>
            <div className="brand-logo spinner" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, fontSize: 20 }}>
              YAG
            </div>
            <h1 style={{ color: "var(--muted)", fontSize: 16, fontWeight: "normal" }}>Đang tải trang xác thực...</h1>
          </div>
        </main>
      }
    >
      <AuthPageInner />
    </Suspense>
  );
}

