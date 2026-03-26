import { useState } from "react";
import { setToken } from "../authStore";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import "../styles/login.css";

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.2 12s3.4-6 9.8-6 9.8 6 9.8 6-3.4 6-9.8 6-9.8-6-9.8-6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.2 12s3.4-6 9.8-6c1.7 0 3.2.4 4.5 1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M21.8 12s-3.4 6-9.8 6c-1.7 0-3.3-.4-4.6-1.1"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path d="M4 4l16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

async function readJsonSafely(res) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text || `HTTP ${res.status}` };
  }
}

function normalizeErrorMessage(rawMessage, fallback) {
  const text = String(rawMessage || "").trim();
  if (!text) return fallback;

  const plain = text
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (plain.includes("Cannot POST /api/staff/login") || plain.includes("Cannot POST /staff/login")) {
    return "ไม่พบ API เข้าสู่ระบบพนักงาน กรุณารีสตาร์ต backend แล้วลองใหม่";
  }

  if (plain.includes("Unexpected token")) {
    return fallback;
  }

  return plain || fallback;
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("customer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [staffCode, setStaffCode] = useState("");
  const [showCustomerPassword, setShowCustomerPassword] = useState(false);
  const [showStaffCode, setShowStaffCode] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submitCustomer() {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await readJsonSafely(res);
    if (!res.ok) {
      const backendMessage = String(data?.message || "").toLowerCase();
      const isInvalidCredentials =
        res.status === 401 || backendMessage.includes("invalid credentials");
      if (isInvalidCredentials) {
        throw new Error("ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง");
      }
      throw new Error(normalizeErrorMessage(data?.message, "เข้าสู่ระบบไม่สำเร็จ"));
    }

    setToken(data.token);
    navigate("/orders");
  }

  async function submitStaff() {
    const res = await fetch(`${API_BASE}/api/staff/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: staffCode }),
    });

    const data = await readJsonSafely(res);
    if (!res.ok) {
      throw new Error(
        normalizeErrorMessage(data?.message, "เข้าสู่ระบบไม่สำเร็จ")
      );
    }

    setToken(data.token);
    navigate("/staff/products");
  }

  async function submit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "customer") await submitCustomer();
      else await submitStaff();
    } catch (e2) {
      setError(String(e2.message || e2));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-bg-circle login-bg-circle-1" />
      <div className="login-bg-circle login-bg-circle-2" />
      <div className="login-bg-circle login-bg-circle-3" />

      <div className="login-logo-box">
        <div className="login-logo-circuit">
          <span className="line line-1" />
          <span className="line line-2" />
          <span className="line line-3" />
          <span className="dot dot-1" />
          <span className="dot dot-2" />
          <span className="dot dot-3" />
        </div>

        <div className="login-logo-text">
          <div className="login-logo-row-top">
            <span className="login-logo-i">I</span>
            <span className="login-logo-love">LOVE</span>
          </div>
          <div className="login-logo-row-bottom">CPU</div>
        </div>
      </div>

      <section className="login-card">
        <button
          type="button"
          className="login-close-btn"
          aria-label="Close"
          onClick={() => navigate("/")}
        >
          ×
        </button>

        <h1>Login</h1>

        <div className="login-mode-switch">
          <button
            type="button"
            className={mode === "customer" ? "is-active" : ""}
            onClick={() => setMode("customer")}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            className={mode === "staff" ? "is-active" : ""}
            onClick={() => setMode("staff")}
          >
            พนักงาน
          </button>
        </div>

        <form className="login-form" onSubmit={submit}>
          {mode === "customer" ? (
            <>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />

              <div className="login-secret-wrap">
                <input
                  type={showCustomerPassword ? "text" : "password"}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="login-toggle-secret"
                  aria-label={showCustomerPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  onClick={() => setShowCustomerPassword((s) => !s)}
                >
                  {showCustomerPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="login-secret-wrap">
                <input
                  type={showStaffCode ? "text" : "password"}
                  placeholder="รหัสผ่าน"
                  value={staffCode}
                  onChange={(e) => setStaffCode(e.target.value)}
                  autoComplete="one-time-code"
                />
                <button
                  type="button"
                  className="login-toggle-secret"
                  aria-label={showStaffCode ? "ซ่อนรหัสหลังบ้าน" : "แสดงรหัสหลังบ้าน"}
                  onClick={() => setShowStaffCode((s) => !s)}
                >
                  {showStaffCode ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              <p className="login-staff-hint">
                ใช้รหัสหลังบ้านที่ผู้ดูแลระบบกำหนดเท่านั้น
              </p>
            </>
          )}

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit-btn" type="submit" disabled={submitting}>
            {submitting
              ? "กำลังเข้าสู่ระบบ..."
              : mode === "customer"
                ? "Login"
                : "เข้าสู่หน้าพนักงาน"}
          </button>
        </form>

        {mode === "customer" ? (
          <p className="login-switch-row">
            Don&apos;t have an account?{" "}
            <button
              type="button"
              className="login-switch-btn"
              onClick={() => navigate("/signup")}
            >
              Sign up
            </button>
          </p>
        ) : null}
      </section>
    </div>
  );
}
