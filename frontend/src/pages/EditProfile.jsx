import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { clearToken, getToken, setToken } from "../authStore";
import { API_BASE } from "../config";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";

const initialForm = {
  firstName: "",
  lastName: "",
  username: "",
  email: "",
  phone: "",
};

export default function EditProfile({ cart = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  useEffect(() => {
    async function loadMe() {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.status === 401) {
          clearToken();
          navigate("/login");
          return;
        }

        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

        setForm((prev) => ({
          ...prev,
          firstName: data?.firstName || "",
          lastName: data?.lastName || "",
          username: data?.username || "",
          email: data?.email || "",
          phone: data?.phone || "",
        }));
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    loadMe();
  }, [navigate]);

  async function saveProfile() {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    if (!form.email.trim()) {
      setError("กรุณากรอกอีเมล");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          username: form.username,
          email: form.email,
          phone: form.phone,
        }),
      });

      if (res.status === 401) {
        clearToken();
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      if (data?.token) {
        setToken(data.token);
      }

      navigate("/profile");
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  async function handleDeleteAccount() {
    await requestDeleteAccount({ navigate, setError });
  }

  return (
    <div className="profile-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
        cartCount={cartCount}
      />

      <main className="profile-main">
        <section className="profile-layout">
          <div className="profile-side-column">
            <aside className="profile-side-card">
              <h3>รายการ</h3>
              <Link to="/orders">คำสั่งซื้อ</Link>
              <Link to="/favorites">สินค้าที่ถูกใจ</Link>

              <h4>บัญชี</h4>
              <Link to="/profile" className="is-active">ข้อมูลส่วนตัว</Link>
              <Link to="/addresses">ที่อยู่สำหรับจัดส่ง</Link>
            </aside>

            <button type="button" className="profile-logout-link" onClick={handleLogout}>
              ล็อกเอ้าท์
            </button>
            <button type="button" className="profile-delete-link" onClick={handleDeleteAccount}>
              ลบบัญชี
            </button>
          </div>

          <div className="profile-content">
            <div className="profile-header-row">
              <div className="profile-title-wrap">
                <span className="profile-title-icon">👤</span>
                <h2>แก้ไขข้อมูลส่วนตัว</h2>
              </div>

              <button type="button" className="profile-edit-btn" onClick={() => navigate("/profile")}>
                กลับไปหน้า ข้อมูลส่วนตัว
              </button>
            </div>

            <section className="address-form-card edit-profile-form-card">
              {loading ? (
                <p className="profile-info">กำลังโหลดข้อมูล...</p>
              ) : (
                <>
                  <div className="address-form-grid edit-profile-form-grid">
                    <label className="edit-profile-label">
                      ชื่อ
                      <input
                        value={form.firstName}
                        onChange={(e) => setForm((prev) => ({ ...prev, firstName: e.target.value }))}
                        placeholder="ชื่อ"
                      />
                    </label>
                    <label className="edit-profile-label">
                      นามสกุล
                      <input
                        value={form.lastName}
                        onChange={(e) => setForm((prev) => ({ ...prev, lastName: e.target.value }))}
                        placeholder="นามสกุล"
                      />
                    </label>
                    <label className="edit-profile-label">
                      ชื่อผู้ใช้
                      <input
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                        placeholder="ชื่อผู้ใช้"
                      />
                    </label>
                    <label className="edit-profile-label">
                      อีเมล
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="อีเมล"
                      />
                    </label>
                    <label className="edit-profile-label">
                      เบอร์โทรศัพท์
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                        placeholder="เบอร์โทรศัพท์"
                      />
                    </label>
                  </div>

                  {error && <p className="profile-error">{error}</p>}

                  <div className="address-form-actions edit-profile-actions">
                    <button type="button" className="profile-edit-btn" disabled={saving} onClick={saveProfile}>
                      {saving ? "กำลังบันทึก..." : "บันทึก"}
                    </button>
                  </div>
                </>
              )}
            </section>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
