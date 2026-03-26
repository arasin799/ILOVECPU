import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { setToken } from "../authStore";
import "../styles/login.css";

async function parseResponseSafe(res) {
  const text = await res.text();
  const isHtml = /^\s*</.test(text);

  if (!text) {
    return { data: null, isHtml: false };
  }

  try {
    return { data: JSON.parse(text), isHtml: false };
  } catch {
    return { data: text, isHtml };
  }
}

function buildRegisterEndpoints() {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.push(`${normalizedBase}/api/auth/register`);
  }

  endpoints.push(
    "/api/auth/register",
    "http://localhost:4000/api/auth/register"
  );

  return Array.from(new Set(endpoints));
}

export default function SignUp() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");

    const payload = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      password,
    };

    if (!payload.firstName || !payload.lastName || !payload.email || !payload.phone || !password) {
      setError("กรุณากรอกข้อมูลให้ครบทุกช่อง");
      return;
    }
    if (password !== confirmPassword) {
      setError("ยืนยันรหัสผ่านไม่ถูกต้อง");
      return;
    }
    if (password.length < 6) {
      setError("รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร");
      return;
    }

    setSubmitting(true);
    try {
      const endpoints = buildRegisterEndpoints();
      let lastError = "สมัครสมาชิกไม่สำเร็จ";

      for (const url of endpoints) {
        let res;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
        } catch {
          lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาเปิด backend ที่พอร์ต 4000";
          continue;
        }

        const { data, isHtml } = await parseResponseSafe(res);
        if (res.ok) {
          if (data?.token) {
            setToken(data.token);
          }
          navigate("/orders");
          return;
        }

        if (isHtml) {
          lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
        } else if (data && typeof data === "object" && data.message) {
          lastError = String(data.message);
        } else {
          lastError = `HTTP ${res.status}`;
        }
      }

      throw new Error(lastError);
    } catch (err) {
      setError(String(err.message || err));
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

      <section className="login-card signup-card">
        <button
          type="button"
          className="login-close-btn"
          aria-label="Close"
          onClick={() => navigate("/")}
        >
          ×
        </button>

        <h1>Sign up</h1>

        <form className="login-form signup-form" onSubmit={submit}>
          <div className="signup-grid-two">
            <input
              type="text"
              placeholder="ชื่อ"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoComplete="given-name"
            />
            <input
              type="text"
              placeholder="นามสกุล"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              autoComplete="family-name"
            />
          </div>

          <input
            type="tel"
            placeholder="เบอร์โทรศัพท์"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />

          <input
            type="email"
            placeholder="อีเมล"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <input
            type="password"
            placeholder="รหัสผ่าน"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />

          <input
            type="password"
            placeholder="ยืนยันรหัสผ่าน"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
          />

          {error && <p className="login-error">{error}</p>}

          <button className="login-submit-btn" type="submit" disabled={submitting}>
            {submitting ? "กำลังสมัคร..." : "Sign up"}
          </button>
        </form>

        <p className="login-switch-row">
          มีบัญชีอยู่แล้ว?{" "}
          <button
            type="button"
            className="login-switch-btn"
            onClick={() => navigate("/login")}
          >
            Login
          </button>
        </p>
      </section>
    </div>
  );
}
