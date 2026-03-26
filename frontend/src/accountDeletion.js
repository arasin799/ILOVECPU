import { API_BASE } from "./config";
import { clearToken, getToken } from "./authStore";

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

function buildDeleteAccountEndpoints() {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.push(`${normalizedBase}/api/auth/delete-account`);
  }

  endpoints.push(
    "/api/auth/delete-account",
    "http://localhost:4000/api/auth/delete-account"
  );

  return Array.from(new Set(endpoints));
}

export async function requestDeleteAccount({ navigate, setError }) {
  const token = getToken();
  if (!token) {
    navigate("/login");
    return false;
  }

  const reasonInput = window.prompt("กรุณาระบุสาเหตุการลบบัญชี");
  if (reasonInput === null) return false;

  const reason = String(reasonInput || "").trim();
  if (!reason) {
    const msg = "กรุณาระบุสาเหตุการลบบัญชี";
    if (typeof setError === "function") setError(msg);
    window.alert(msg);
    return false;
  }

  const confirmed = window.confirm(
    `ยืนยันการลบบัญชีถาวรอีกครั้ง?\nสาเหตุ: ${reason}\n\nเมื่อลบแล้วจะไม่สามารถกู้คืนบัญชีได้`
  );
  if (!confirmed) return false;

  let lastError = "ไม่สามารถลบบัญชีได้";

  for (const url of buildDeleteAccountEndpoints()) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
    } catch {
      lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
      continue;
    }

    const { data, isHtml } = await parseResponseSafe(res);

    if (res.status === 401 || res.status === 403) {
      clearToken();
      navigate("/login");
      return false;
    }

    if (res.ok) {
      clearToken();
      window.alert("ลบบัญชีสำเร็จ");
      navigate("/login");
      return true;
    }

    if (isHtml) {
      lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
    } else if (data && typeof data === "object" && data.message) {
      lastError = String(data.message);
    } else {
      lastError = `HTTP ${res.status}`;
    }
  }

  if (typeof setError === "function") setError(lastError);
  window.alert(lastError);
  return false;
}
