import { useEffect, useMemo, useState } from "react";
import { getToken, clearToken } from "../authStore";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { API_BASE } from "../config";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";

const STATUS_LABEL = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PACKING: "กำลังเตรียมพัสดุ",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

export default function YourOrders({ cart = [] }) {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  async function loadOrders() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/my/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.status === 401) {
        clearToken();
        navigate("/login");
        return;
      }

      const ct = res.headers.get("content-type") || "";
      const raw = await res.text();

      if (!ct.includes("application/json")) {
        throw new Error(`Expected JSON but got: ${raw.slice(0, 80)}...`);
      }

      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
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
    loadOrders();
  }, [navigate]);

  function getTrackingNo(order) {
    if (order.trackingNo) return order.trackingNo;
    if (["PACKING", "SHIPPED", "DELIVERED"].includes(order.status)) {
      return `TH${String(order.id).padStart(8, "0")}`;
    }
    return "-";
  }

  function getStatusClass(status) {
    if (status === "DELIVERED") return "is-delivered";
    if (status === "PENDING_PAYMENT") return "is-pending";
    return "is-progress";
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
              <Link to="/orders" className="is-active">คำสั่งซื้อ</Link>
            <Link to="/favorites">สินค้าที่ถูกใจ</Link>

              <h4>บัญชี</h4>
              <Link to="/profile">ข้อมูลส่วนตัว</Link>
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
                <span className="profile-title-icon">📜</span>
                <h2>สถานะการสั่งซื้อ</h2>
              </div>
            </div>

            <section className="orders-board">
              <div className="orders-table-head">
                <div>หมายเลขคำสั่งซื้อ</div>
                <div>สถานะการสั่งซื้อ</div>
                <div>เลขพัสดุ</div>
                <div>ยอดทั้งหมด</div>
              </div>

              {loading && <p className="orders-info">กำลังโหลดคำสั่งซื้อ...</p>}
              {error && <p className="orders-error">{error}</p>}

              {!loading && !error && orders.length === 0 && (
                <div className="orders-empty">ไม่มีคำสั่งซื้อ</div>
              )}

              {!loading && !error && orders.length > 0 && (
                <div className="orders-table-body">
                  {orders.map((order) => (
                    <Link to={`/orders/${order.id}`} key={order.id} className="orders-row">
                      <div className="orders-order-no">
                        <strong>#{order.id}</strong>
                        <small>{new Date(order.createdAt).toLocaleDateString()}</small>
                      </div>
                      <div>
                        <span className={`orders-status ${getStatusClass(order.status)}`}>
                          {STATUS_LABEL[order.status] || order.status}
                        </span>
                      </div>
                      <div className="orders-tracking">{getTrackingNo(order)}</div>
                      <div className="orders-total">฿ {Number(order.total).toLocaleString()}</div>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

