import { useState } from "react";
import { setToken } from "../authStore";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // login | register
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit() {
    setError("");
    try {
      const res = await fetch(
        mode === "login"
          ? `${API_BASE}/api/auth/login`
          : `${API_BASE}/api/auth/register`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.message);
      
      setToken(data.token);
      window.location.href = "/orders";
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  return (
    <div style={{ maxWidth: 400 }}>
      <h2>{mode === "login" ? "Login" : "Register"}</h2>

      <input
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 8 }}
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: "100%", padding: 10, marginBottom: 8 }}
      />

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      <button onClick={submit} style={{ padding: 10, width: "100%" }}>
        {mode === "login" ? "Login" : "Create account"}
      </button>

      <p style={{ marginTop: 10 }}>
        {mode === "login" ? (
          <span
            onClick={() => setMode("register")}
            style={{ cursor: "pointer", color: "blue" }}
          >
            No account? Register
          </span>
        ) : (
          <span
            onClick={() => setMode("login")}
            style={{ cursor: "pointer", color: "blue" }}
          >
            Already have account? Login
          </span>
        )}
      </p>
    </div>
  );
}
