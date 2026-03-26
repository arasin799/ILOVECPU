import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

const initialEmployeeForm = {
  firstName: "",
  lastName: "",
  nickname: "",
  position: "",
  salary: "",
  hireDate: "",
};

function formatSalary(value) {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toLocaleString("th-TH");
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("th-TH");
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

function buildEmployeeEndpoints() {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [
    "http://localhost:4000/api/staff/employees",
    "http://localhost:4000/api/employees",
    "/api/staff/employees",
    "/api/employees",
  ];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.unshift(
      `${normalizedBase}/api/staff/employees`,
      `${normalizedBase}/api/employees`
    );
  }

  return Array.from(new Set(endpoints));
}

export default function StaffEmployees() {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeEmployeeEndpoint, setActiveEmployeeEndpoint] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [error, setError] = useState("");
  const [employeeForm, setEmployeeForm] = useState(initialEmployeeForm);

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  function getPrioritizedEmployeeEndpoints() {
    const all = buildEmployeeEndpoints();
    if (!activeEmployeeEndpoint) return all;
    return [activeEmployeeEndpoint, ...all.filter((url) => url !== activeEmployeeEndpoint)];
  }

  async function loadEmployees() {
    setLoading(true);
    setError("");

    const endpoints = getPrioritizedEmployeeEndpoints();
    let lastError = "ไม่สามารถโหลดข้อมูลพนักงานได้";

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
          if (Array.isArray(data)) {
            setEmployees(data);
            setActiveEmployeeEndpoint(url);
            return;
          }

          if (isHtml) {
            lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
          } else {
            lastError = "รูปแบบข้อมูลพนักงานไม่ถูกต้อง";
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
      setEmployees([]);
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

    loadEmployees();
  }, [navigate]);

  const filteredEmployees = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return employees.filter((emp) => {
      if (!q) return true;
      return [
        emp.id,
        emp.position,
        emp.salary,
        emp.nickname,
        emp.firstName,
        emp.lastName,
        emp.hireDate,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [employees, keyword]);

  async function submitCreateEmployee(e) {
    e.preventDefault();
    setFormError("");

    const payload = {
      firstName: employeeForm.firstName.trim(),
      lastName: employeeForm.lastName.trim(),
      nickname: employeeForm.nickname.trim(),
      position: employeeForm.position.trim(),
      salary: Number(employeeForm.salary),
      hireDate: employeeForm.hireDate,
    };

    if (!payload.firstName || !payload.lastName || !payload.nickname || !payload.position) {
      setFormError("กรุณากรอกชื่อ นามสกุล ชื่อเล่น และตำแหน่ง");
      return;
    }
    if (!Number.isFinite(payload.salary) || payload.salary < 0) {
      setFormError("เงินเดือนต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }
    if (!payload.hireDate) {
      setFormError("กรุณากรอกวันที่สมัครทำงาน");
      return;
    }

    setSaving(true);
    try {
      const endpoints = getPrioritizedEmployeeEndpoints();
      let lastError = "ไม่สามารถบันทึกข้อมูลพนักงานได้";
      let created = false;

      for (const url of endpoints) {
        let res;
        try {
          res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
            body: JSON.stringify(payload),
          });
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
          created = true;
          setActiveEmployeeEndpoint(url);
          break;
        }

        if (isHtml) {
          lastError = "API ตอบกลับเป็น HTML กรุณาตรวจสอบ VITE_API_BASE ให้ชี้ไป backend";
        } else if (data && typeof data === "object" && data.message) {
          lastError = String(data.message);
        } else {
          lastError = `HTTP ${res.status}`;
        }
      }

      if (!created) {
        throw new Error(lastError);
      }

      setEmployeeForm(initialEmployeeForm);
      setShowCreateForm(false);
      await loadEmployees();
    } catch (err) {
      setFormError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteEmployee(emp) {
    const employeeId = Number(emp?.id);
    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      window.alert("ไม่พบรหัสพนักงานที่ต้องการลบ");
      return;
    }

    const fullName = `${emp?.firstName || ""} ${emp?.lastName || ""}`.trim() || `#${employeeId}`;
    if (!window.confirm(`ยืนยันการลบพนักงาน ${fullName} ?`)) {
      return;
    }

    setFormError("");
    setDeletingId(employeeId);

    try {
      const endpoints = getPrioritizedEmployeeEndpoints().map(
        (url) => `${String(url).replace(/\/+$/, "")}/${employeeId}`
      );
      let lastError = "ไม่สามารถลบข้อมูลพนักงานได้";
      let deleted = false;

      for (const url of endpoints) {
        let res;
        try {
          res = await fetch(url, {
            method: "DELETE",
            headers: getAuthHeader(),
          });
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
          deleted = true;
          setActiveEmployeeEndpoint(String(url).replace(/\/+\d+$/, ""));
          break;
        }

        if (isHtml) {
          lastError = "backend ยังไม่รองรับการลบพนักงานหรือยังไม่ได้รีสตาร์ต server";
        } else if (data && typeof data === "object" && data.message) {
          lastError = String(data.message);
        } else {
          lastError = `HTTP ${res.status}`;
        }
      }

      if (!deleted) {
        throw new Error(lastError);
      }

      setEmployees((prev) => prev.filter((item) => Number(item.id) !== employeeId));
    } catch (err) {
      const message = String(err.message || err);
      setFormError(message);
      window.alert(message);
    } finally {
      setDeletingId(null);
    }
  }

  function logoutStaff() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <div>
          <h1>ข้อมูลพนักงาน</h1>
          <p>รายการข้อมูลส่วนตัวของพนักงานทั้งหมด</p>
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
            className="staff-secondary-btn staff-topbar-nav-btn is-active"
            onClick={() => navigate("/staff/employees")}
          >
            พนักงาน
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn"
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

      {showCreateForm ? (
        <section className="staff-panel">
          <div className="staff-list-head">
            <h2>เพิ่มพนักงาน</h2>
          </div>
          <form className="staff-employee-form" onSubmit={submitCreateEmployee}>
            <input
              type="text"
              placeholder="ชื่อ"
              value={employeeForm.firstName}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, firstName: e.target.value }))}
            />
            <input
              type="text"
              placeholder="นามสกุล"
              value={employeeForm.lastName}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, lastName: e.target.value }))}
            />
            <input
              type="text"
              placeholder="ชื่อเล่น"
              value={employeeForm.nickname}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, nickname: e.target.value }))}
            />
            <input
              type="text"
              placeholder="ตำแหน่ง"
              value={employeeForm.position}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, position: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="เงินเดือน"
              value={employeeForm.salary}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, salary: e.target.value }))}
            />
            <input
              type="date"
              value={employeeForm.hireDate}
              onChange={(e) => setEmployeeForm((prev) => ({ ...prev, hireDate: e.target.value }))}
            />

            {formError ? <p className="staff-error">{formError}</p> : null}

            <div className="staff-form-actions">
              <button
                type="button"
                className="staff-secondary-btn"
                onClick={() => {
                  setShowCreateForm(false);
                  setEmployeeForm(initialEmployeeForm);
                  setFormError("");
                }}
              >
                ยกเลิก
              </button>
              <button type="submit" className="staff-primary-btn" disabled={saving}>
                {saving ? "กำลังบันทึก..." : "บันทึกพนักงาน"}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      <section className="staff-panel staff-list-panel">
        <div className="staff-list-head">
          <div className="staff-list-title-group">
            <h2>รายชื่อพนักงาน</h2>
            <button
              type="button"
              className="staff-primary-btn staff-add-btn"
              onClick={() => setShowCreateForm(true)}
            >
              + เพิ่มพนักงาน
            </button>
            <button
              type="button"
              className={`${deleteMode ? "staff-danger-btn" : "staff-secondary-btn"} staff-add-btn`}
              onClick={() => {
                setDeleteMode((prev) => !prev);
                setDeletingId(null);
              }}
            >
              {deleteMode ? "ยกเลิกโหมดลบ" : "ลบ"}
            </button>
          </div>
          <input
            type="text"
            placeholder="ค้นหาจากชื่อ ชื่อเล่น ตำแหน่ง หรือรหัสพนักงาน"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {error ? <p className="staff-error">{error}</p> : null}

        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลพนักงาน...</p>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ชื่อ - นามสกุล</th>
                  <th>ชื่อเล่น</th>
                  <th>ตำแหน่ง</th>
                  <th>เงินเดือน</th>
                  <th>วันที่สมัครทำงาน</th>
                </tr>
              </thead>
              <tbody>
                {filteredEmployees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="staff-empty">
                      ไม่พบข้อมูล
                    </td>
                  </tr>
                ) : (
                  filteredEmployees.map((emp) => {
                    const employeeId = Number(emp.id);
                    const deletingThisRow = deletingId === employeeId;

                    return (
                      <tr key={emp.id}>
                        <td>
                          <div className="staff-employee-id-cell">
                            {deleteMode ? (
                              <button
                                type="button"
                                className="staff-danger-btn staff-inline-delete-btn"
                                disabled={deletingThisRow}
                                onClick={() => deleteEmployee(emp)}
                              >
                                {deletingThisRow ? "กำลังลบ..." : "ลบ"}
                              </button>
                            ) : null}
                            <span>#{emp.id}</span>
                          </div>
                        </td>
                        <td>
                          <strong>{`${emp.firstName || ""} ${emp.lastName || ""}`.trim() || "-"}</strong>
                        </td>
                        <td>{emp.nickname || "-"}</td>
                        <td>{emp.position || "-"}</td>
                        <td>{formatSalary(emp.salary)}</td>
                        <td>{formatDate(emp.hireDate)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
