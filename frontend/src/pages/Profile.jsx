import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { API_BASE } from "../config";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";

export default function Profile({ cart = [] }) {
  const navigate = useNavigate();

  const [q, setQ] = useState("");
  const [me, setMe] = useState(null);
  const [orders, setOrders] = useState([]);
  const [lastOrderDetail, setLastOrderDetail] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError("");

      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      try {
        const [meRes, ordersRes] = await Promise.all([
          fetch(`${API_BASE}/api/auth/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/my/orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (meRes.status === 401 || ordersRes.status === 401) {
          clearToken();
          navigate("/login");
          return;
        }

        const meData = await meRes.json();
        const ordersData = await ordersRes.json();

        if (!meRes.ok) throw new Error(meData?.message || `HTTP ${meRes.status}`);
        if (!ordersRes.ok) throw new Error(ordersData?.message || `HTTP ${ordersRes.status}`);

        setMe(meData);
        setOrders(Array.isArray(ordersData) ? ordersData : []);

        if (Array.isArray(ordersData) && ordersData.length > 0) {
          const latestOrderId = ordersData[0].id;
          const detailRes = await fetch(`${API_BASE}/api/my/orders/${latestOrderId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (detailRes.status === 401) {
            clearToken();
            navigate("/login");
            return;
          }

          const detailData = await detailRes.json();
          if (detailRes.ok) {
            setLastOrderDetail(detailData);
          }
        }
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, [navigate]);

  const deliveredCount = useMemo(
    () => orders.filter((o) => o.status === "DELIVERED").length,
    [orders]
  );
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "PENDING_PAYMENT").length,
    [orders]
  );
  const inProgressCount = useMemo(
    () => orders.filter((o) => ["PAID", "PACKING", "SHIPPED"].includes(o.status)).length,
    [orders]
  );

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
        {error && <p className="profile-error">{error}</p>}

        {!error && (
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
                  <h2>ข้อมูลส่วนตัว</h2>
                </div>

                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => navigate("/profile/edit")}
                >
                  แก้ไขข้อมูลส่วนตัว
                </button>
              </div>

              <div className="profile-top-grid">
                <div className="profile-name-box">
                  {String(me?.username || "").trim() || "-"}
                </div>

                <div className="profile-stat-card">
                  <strong>{deliveredCount}</strong>
                  <span>จัดส่งแล้ว</span>
                </div>
                <div className="profile-stat-card">
                  <strong>{inProgressCount}</strong>
                  <span>รอดำเนินการ</span>
                </div>
                <div className="profile-stat-card">
                  <strong>{pendingCount}</strong>
                  <span>รอชำระเงิน</span>
                </div>
              </div>

              <div className="profile-detail-card">
                <div className="profile-detail-col">
                  <small>ชื่อผู้ใช้</small>
                  <p>{me?.username || "-"}</p>
                </div>
                <div className="profile-detail-col">
                  <small>ชื่อ - นามสกุล</small>
                  <p>{`${me?.firstName || ""} ${me?.lastName || ""}`.trim() || "-"}</p>
                </div>
                <div className="profile-detail-col">
                  <small>อีเมล</small>
                  <p>{me?.email || "-"}</p>
                </div>
                <div className="profile-detail-col">
                  <small>หมายเลขโทรศัพท์</small>
                  <p>{me?.phone || lastOrderDetail?.phone || "-"}</p>
                </div>
              </div>
            </div>
          </section>
        )}
      </main>

      <HomeFooter />
    </div>
  );
}
