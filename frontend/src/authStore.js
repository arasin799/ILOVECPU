// localStorage key used to persist the current auth token.
const TOKEN_KEY = "hardware_store_token";

// Read the current token from localStorage.
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Decode the payload section of a JWT token without verifying its signature.
// This is only used client-side for lightweight role checks.
function decodeJwtPayload(token) {
  try {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

// Read the role field from the stored JWT payload.
export function getTokenRole() {
  const token = getToken();
  const payload = decodeJwtPayload(token);
  return String(payload?.role || "").trim().toLowerCase();
}

// Save a new auth token after login.
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Remove the current auth token, effectively logging the user out.
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Convenience helper for fetching the current logged-in user's profile.
export async function fetchMe() {
  const token = getToken();
  if (!token) return null;

  const res = await fetch("/api/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;
  return res.json();
}
