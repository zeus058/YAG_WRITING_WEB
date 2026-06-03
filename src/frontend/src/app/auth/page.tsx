"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon, BrandLogo as ProductLogo } from "@/components/ui";
import { AuthBackdrop, AuthProductFooter } from "./AuthChrome";
import { appEnv, useAuth, yagApi } from "@/lib";

function AuthPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams?.get("redirect");
  const { login: setAuthSession } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // State đăng nhập
  const [loginEmail, setLoginEmail] = useState("reader@yag.vn");
  const [loginPassword, setLoginPassword] = useState("Secure2026");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // State đăng ký
  const [registerEmail, setRegisterEmail] = useState("new-author@yag.vn");
  const [registerUsername, setRegisterUsername] = useState("minh_writer");
  const [registerPassword, setRegisterPassword] = useState("YagDemo1!");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("YagDemo1!");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(true);

  // State thông báo (Toast)
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning">("success");

  // Quy tắc kiểm tra mật khẩu độ mạnh yếu thời gian thực
  const passwordRules = {
    length: registerPassword.length >= 8,
    mixed: /[a-z]/.test(registerPassword) && /[A-Z]/.test(registerPassword) && /\d/.test(registerPassword),
    special: /[^A-Za-z0-9]/.test(registerPassword),
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

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      triggerToast("Vui lòng điền đầy đủ thông tin đăng nhập.", "warning");
      return;
    }

    try {
      let userObj: any;
      if (appEnv.useMocks) {
        userObj = {
          id: loginEmail.includes("admin") ? "admin-id" : "reader-id",
          email: loginEmail,
          username: loginEmail.split("@")[0],
          role: loginEmail.includes("admin") ? "admin" : "reader",
          profile: {
            display_name: loginEmail.includes("admin") ? "Admin YAG" : "Minh Nguyệt",
          }
        };
        setAuthSession({ accessToken: "mock-token", user: userObj });
      } else {
        const result = await yagApi.auth.login({ email: loginEmail, password: loginPassword });
        userObj = result.data.user;
        if (result.data.accessToken && result.data.user) {
          setAuthSession({ accessToken: result.data.accessToken, user: result.data.user });
        }
      }
      
      const defaultDest = userObj.role === "admin" ? "/admin" : "/home";
      const finalDest = redirect ? decodeURIComponent(redirect) : defaultDest;

      triggerToast("Đăng nhập thành công. Đang chuyển hướng...", "success");
      setTimeout(() => {
        router.push(finalDest);
      }, 700);
    } catch {
      triggerToast("Không thể đăng nhập. Vui lòng kiểm tra email, mật khẩu hoặc kết nối API.", "warning");
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerUsername || !registerPassword || !registerConfirmPassword) {
      triggerToast("Vui lòng điền đầy đủ thông tin đăng ký.", "warning");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      triggerToast("Xác nhận mật khẩu không trùng khớp.", "warning");
      return;
    }
    if (!passwordRules.length || !passwordRules.mixed || !passwordRules.special) {
      triggerToast("Mật khẩu chưa đáp ứng đủ tiêu chuẩn bảo mật.", "warning");
      return;
    }
    if (!agreeTerms) {
      triggerToast("Vui lòng đồng ý với chính sách và điều khoản sử dụng.", "warning");
      return;
    }
    try {
      let userObj: any;
      if (appEnv.useMocks) {
        userObj = {
          id: "reader-id",
          email: registerEmail,
          username: registerUsername,
          role: "reader",
          profile: {
            display_name: registerUsername,
          }
        };
        setAuthSession({ accessToken: "mock-token", user: userObj });
      } else {
        const result = await yagApi.auth.register({
          email: registerEmail,
          username: registerUsername,
          password: registerPassword,
        });
        userObj = result.data.user;
        if (result.data.accessToken && result.data.user) {
          setAuthSession({ accessToken: result.data.accessToken, user: result.data.user });
        }
      }

      const defaultDest = userObj.role === "admin" ? "/admin" : "/home";
      const finalDest = redirect ? decodeURIComponent(redirect) : defaultDest;

      triggerToast("Tài khoản đã được tạo thành công. Đang đăng nhập...", "success");
      setTimeout(() => {
        router.push(finalDest);
      }, 700);
    } catch {
      triggerToast("Không thể tạo tài khoản. Vui lòng kiểm tra email hoặc trạng thái API.", "warning");
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
                  Đọc và viết truyện thông minh
                </div>
              </div>
            </div>

            {/* Điều khiển chuyển đổi Tabs */}
            <div className="tabs" role="tablist" aria-label="Chọn hình thức xác thực">
              <button
                className={`tab-button ${activeTab === "login" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("login")}
              >
                Đăng nhập
              </button>
              <button
                className={`tab-button ${activeTab === "register" ? "active" : ""}`}
                type="button"
                onClick={() => setActiveTab("register")}
              >
                Đăng ký
              </button>
            </div>

            {/* TAB PANEL: ĐĂNG NHẬP */}
            {activeTab === "login" && (
              <form onSubmit={handleLoginSubmit} className="tab-panel active">
                <div className="stack" style={{ marginTop: 24 }}>
                  <h1 className="section-title">Chào mừng trở lại</h1>

                  <div className="field">
                    <label htmlFor="loginEmail">Email</label>
                    <input
                      id="loginEmail"
                      className="input"
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="loginPassword">Mật khẩu</label>
                    <div className="inline-actions password-input-row">
                      <input
                        id="loginPassword"
                        className="input"
                        type={showLoginPassword ? "text" : "password"}
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        required
                      />
                      <button
                        className="button icon-button"
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        aria-label={showLoginPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>

                  <label className="remember-row">
                    <input type="checkbox" defaultChecked /> Lưu thông tin đăng nhập
                  </label>

                  <div className="inline-actions" style={{ justifyContent: "space-between" }}>
                    <Link className="button" href="/auth/recovery">
                      Quên mật khẩu
                    </Link>
                    <button className="button button-primary" type="submit">
                      <Icon name="arrow" /> Đăng nhập
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* TAB PANEL: ĐĂNG KÝ */}
            {activeTab === "register" && (
              <form onSubmit={handleRegisterSubmit} className="tab-panel active">
                <div className="stack" style={{ marginTop: 24 }}>
                  <h1 className="section-title">Tạo tài khoản YAG</h1>

                  <div className="field">
                    <label htmlFor="registerEmail">Email</label>
                    <input
                      id="registerEmail"
                      className="input"
                      type="email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="registerUsername">Username</label>
                    <input
                      id="registerUsername"
                      className="input"
                      type="text"
                      value={registerUsername}
                      onChange={(e) => setRegisterUsername(e.target.value)}
                      required
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="registerPassword">Mật khẩu</label>
                    <div className="inline-actions password-input-row">
                      <input
                        id="registerPassword"
                        className="input"
                        type={showRegisterPassword ? "text" : "password"}
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        required
                      />
                      <button
                        className="button icon-button"
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        aria-label={showRegisterPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>

                  {/* Bảng kiểm tra quy tắc bảo mật thời gian thực */}
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
                    <label htmlFor="registerConfirmPassword">Xác nhận mật khẩu</label>
                    <div className="inline-actions password-input-row">
                      <input
                        id="registerConfirmPassword"
                        className="input"
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                      />
                      <button
                        className="button icon-button"
                        type="button"
                        onClick={() => setShowRegisterConfirmPassword(!showRegisterConfirmPassword)}
                        aria-label={showRegisterConfirmPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                      >
                        <Icon name="eye" />
                      </button>
                    </div>
                  </div>

                  <label className="pill">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                    />{" "}
                    Tôi đồng ý điều khoản nội dung
                  </label>

                  <button className="button button-primary" type="submit">
                    <Icon name="check" /> Đăng ký miễn phí
                  </button>
                </div>
              </form>
            )}
          </section>
        </main>
      </div>
      <AuthProductFooter />

      {/* Thông báo Toast trạng thái thực tế */}
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

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="auth-page auth-page-centered" style={{ background: "var(--bg)" }}>
        <div className="stack" style={{ alignItems: "center", gap: 16 }}>
          <div className="brand-logo spinner" style={{ background: "var(--crimson)", color: "#fff", width: 48, height: 48, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "50%", fontWeight: "bold" }}>
            YAG
          </div>
          <h1 style={{ color: "var(--muted)", fontSize: 16, fontWeight: "normal" }}>Đang tải trang xác thực...</h1>
        </div>
      </main>
    }>
      <AuthPageInner />
    </Suspense>
  );
}
