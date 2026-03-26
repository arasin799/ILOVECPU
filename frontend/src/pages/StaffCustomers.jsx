import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

function formatCreatedAt(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH");
}

async function parseResponseSafe(res) {
  const text = await res.text();
  const isHtml = /^\s*</.test(text);

  if (!text) return { data: null, isHtml: false };

  try {
    return { data: JSON.parse(text), isHtml: false };
  } catch {
    return { data: text, isHtml };
  }
}

function buildCustomerEndpoints() {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [
    `${normalizedBase}/api/staff/customers`,
    `${normalizedBase}/staff/customers`,
  ];

  return Array.from(new Set(endpoints));
}

export default function StaffCustomers() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [, setError] = useState("");

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  useEffect(() => {
    async function loadCustomers() {
      setLoading(true);
      setError("");

      const endpoints = buildCustomerEndpoints();
      let lastError = "ไม่สามารถโหลดข้อมูลลูกค้าได้";

      try {
        for (const url of endpoints) {
          const res = await fetch(url, { headers: getAuthHeader() });
          const { data, isHtml } = await parseResponseSafe(res);

          if (res.status === 401 || res.status === 403) {
            handleForbidden();
            return;
          }

          if (res.ok) {
            if (Array.isArray(data)) {
              setCustomers(data);
              return;
            }

            if (isHtml) {
              lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
            } else {
              lastError = "รูปแบบข้อมูลลูกค้าไม่ถูกต้อง";
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
        setCustomers([]);
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    if (!getToken()) {
      navigate("/login");
      return;
    }

    loadCustomers();
  }, [navigate]);

  const filteredCustomers = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return customers.filter((item) => {
      if (!q) return true;
      const fullName = `${item.firstName || ""} ${item.lastName || ""}`.trim();
      return [item.id, fullName, item.username, item.email, item.phone]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [customers, keyword]);

  function logoutStaff() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <div>
          <h1>ข้อมูลลูกค้า</h1>
          <p>ลูกค้าที่ลงทะเบียนใช้งานเว็บไซต์</p>
        </div>
        <div className="staff-topbar-actions">
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn"
            onClick={() => navigate("/staff/products")}
          >
            สินค้า
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn"
            onClick={() => navigate("/staff/employees")}
          >
            พนักงาน
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn is-active"
            onClick={() => navigate("/staff/customers")}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            className="staff-danger-btn staff-topbar-nav-btn"
            onClick={logoutStaff}
          >
            ล็อกเอ้าท์
          </button>
        </div>
      </header>

      <section className="staff-panel staff-list-panel">
        <div className="staff-list-head">
          <div className="staff-list-title-group">
            <h2>รายชื่อลูกค้า</h2>
            <button
              type="button"
              className="staff-secondary-btn"
              onClick={() => navigate("/staff/account-deletions")}
            >
              บัญชีที่ลบ
            </button>
          </div>
          <input
            type="text"
            placeholder="ค้นหาจากชื่อ อีเมล เบอร์โทร หรือรหัสลูกค้า"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลลูกค้า...</p>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>Username</th>
                  <th>อีเมล</th>
                  <th>เบอร์โทร</th>
                  <th>วันที่สมัคร</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="staff-empty">
                      ไม่พบข้อมูลลูกค้า
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>
                        <strong>{`${item.firstName || ""} ${item.lastName || ""}`.trim() || "-"}</strong>
                      </td>
                      <td>{item.username || "-"}</td>
                      <td>{item.email || "-"}</td>
                      <td>{item.phone || "-"}</td>
                      <td>{formatCreatedAt(item.createdAt)}</td>
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
