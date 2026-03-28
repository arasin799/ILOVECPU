// API base is used to build backend endpoint URLs.
import { API_BASE } from "./config";
// Token helpers are used to read/remove the current login session.
import { clearToken, getToken } from "./authStore";

// Safely parse a response body and detect if the backend accidentally returned HTML.
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

// Build fallback endpoint candidates for the delete-account request.
// This helps the frontend work across local dev and deployed environments.
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

// Shared account-deletion flow used by profile-related pages.
// It asks for a reason, confirms with the user, calls the backend,
// clears auth on success/forbidden, and redirects back to login.
export async function requestDeleteAccount({ navigate, setError }) {
  const token = getToken();
  if (!token) {
    navigate("/login");
    return false;
  }

  // Ask the user why they want to delete the account.
  const reasonInput = window.prompt("กรุณาระบุสาเหตุการลบบัญชี");
  if (reasonInput === null) return false;

  const reason = String(reasonInput || "").trim();
  if (!reason) {
    // If no reason is provided, surface the validation message to both UI and alert.
    const msg = "กรุณาระบุสาเหตุการลบบัญชี";
    if (typeof setError === "function") setError(msg);
    window.alert(msg);
    return false;
  }

  // Final confirmation before making an irreversible delete request.
  const confirmed = window.confirm(
    `ยืนยันการลบบัญชีถาวรอีกครั้ง?\nสาเหตุ: ${reason}\n\nเมื่อลบแล้วจะไม่สามารถกู้คืนบัญชีได้`
  );
  if (!confirmed) return false;

  let lastError = "ไม่สามารถลบบัญชีได้";

  // Try each candidate endpoint until one succeeds or all fail.
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
      // Network/server-unreachable case.
      lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
      continue;
    }

    const { data, isHtml } = await parseResponseSafe(res);

    if (res.status === 401 || res.status === 403) {
      // If auth is no longer valid, force logout and send the user to login.
      clearToken();
      navigate("/login");
      return false;
    }

    if (res.ok) {
      // Successful deletion: clear session and redirect to login.
      clearToken();
      window.alert("ลบบัญชีสำเร็จ");
      navigate("/login");
      return true;
    }

    // Pick the most useful error message based on the response shape.
    if (isHtml) {
      lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
    } else if (data && typeof data === "object" && data.message) {
      lastError = String(data.message);
    } else {
      lastError = `HTTP ${res.status}`;
    }
  }

  // Surface the last known failure to both the page state and the user.
  if (typeof setError === "function") setError(lastError);
  window.alert(lastError);
  return false;
}
