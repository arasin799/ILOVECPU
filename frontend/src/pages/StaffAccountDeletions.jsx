import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH");
}

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

function buildAccountDeletionEndpoints() {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [
    "http://localhost:4000/api/staff/account-deletions",
    "http://localhost:4000/api/account-deletions",
    "/api/staff/account-deletions",
    "/api/account-deletions",
  ];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.unshift(
      `${normalizedBase}/api/staff/account-deletions`,
      `${normalizedBase}/api/account-deletions`
    );
  }

  return Array.from(new Set(endpoints));
}

export default function StaffAccountDeletions() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [totalDeletedAccounts, setTotalDeletedAccounts] = useState(0);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  async function loadLogs() {
    setLoading(true);
    setError("");

    const endpoints = buildAccountDeletionEndpoints();
    let lastError = "ไม่สามารถโหลดรายงานการลบบัญชีได้";

    try {
      for (const url of endpoints) {
        let res;
        try {
          res = await fetch(url, { headers: getAuthHeader() });
        } catch {
          lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
          continue;
        }

        const { data, isHtml } = await parseResponseSafe(res);

        if (res.status === 401 || res.status === 403) {
          handleForbidden();
          return;
        }

        if (res.ok) {
          if (data && typeof data === "object" && Array.isArray(data.rows)) {
            setLogs(data.rows);
            setTotalDeletedAccounts(Number(data.totalDeletedAccounts || data.rows.length || 0));
            return;
          }

          if (isHtml) {
            lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
          } else {
            lastError = "รูปแบบข้อมูลรายงานไม่ถูกต้อง";
          }
          continue;
        }

        if (isHtml) {
          lastError = "เรียก API ไม่ถูกปลายทาง กรุณาตรวจสอบ URL ของ backend";
        } else if (data && typeof data === "object" && data.message) {
          lastError = String(data.message);
        } else {
          lastError = `HTTP ${res.status}`;
        }
      }

      throw new Error(lastError);
    } catch (e) {
      setLogs([]);
      setTotalDeletedAccounts(0);
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    loadLogs();
  }, [navigate]);

  const filteredLogs = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return logs.filter((item) => {
      if (!q) return true;
      const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim();
      return [
        item.id,
        item.userId,
        fullName,
        item.username,
        item.email,
        item.phone,
        item.reason,
        item.deletedAt,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [logs, keyword]);

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <div>
          <h1>รายงานการลบบัญชีลูกค้า</h1>
          <p>ดูจำนวนและเหตุผลการลบบัญชีจากฝั่งลูกค้า</p>
        </div>
      </header>

      <section className="staff-summary-head">
        <button
          type="button"
          className="staff-secondary-btn staff-summary-back-btn"
          onClick={() => navigate("/staff/customers")}
        >
          กลับ
        </button>
        <div className="staff-summary-grid staff-summary-grid-single">
          <article className="staff-summary-card staff-summary-card-theme">
            <span>จำนวนบัญชีที่ลบแล้ว</span>
            <strong>{totalDeletedAccounts}</strong>
          </article>
        </div>
      </section>

      <section className="staff-panel staff-list-panel">
        <div className="staff-list-head">
          <h2>รายการการลบบัญชี</h2>
          <input
            type="text"
            placeholder="ค้นหาจากชื่อ อีเมล เหตุผล หรือรหัสบัญชี"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {error ? <p className="staff-error">{error}</p> : null}

        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลการลบบัญชี...</p>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>ผู้ใช้เดิม</th>
                  <th>อีเมล</th>
                  <th>เบอร์โทร</th>
                  <th>สาเหตุการลบ</th>
                  <th>วันลบ</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="staff-empty">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>
                        <strong>{`${item.firstName || ""} ${item.lastName || ""}`.trim() || "-"}</strong>
                        <small>{item.username || "-"}</small>
                      </td>
                      <td>{item.email || "-"}</td>
                      <td>{item.phone || "-"}</td>
                      <td>{item.reason || "-"}</td>
                      <td>{formatDateTime(item.deletedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
