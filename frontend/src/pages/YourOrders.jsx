import { useEffect, useState } from "react";
import { getToken, clearToken } from "../authStore";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE } from "../config";

const STATUS_LABEL = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PACKING: "กำลังเตรียมพัสดุ",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

export default function YourOrders() {
  const [orders, setOrders] = useState([]);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function loadOrders() {
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/my/orders`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      // ถ้า token ผิด/หมดอายุ
      if (res.status === 401) {
        clearToken();
        navigate("/login");
        return;
      }

      const ct = res.headers.get("content-type") || "";
      const raw = await res.text();

      // กันกรณีได้ HTML กลับมา
      if (!ct.includes("application/json")) {
        throw new Error(`Expected JSON but got: ${raw.slice(0, 80)}...`);
      }

      const data = JSON.parse(raw);
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      setOrders(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    loadOrders();
  }, [navigate]);

  return (
    <div>
      <h2>Your Orders</h2>

      {error && <p style={{ color: "crimson" }}>{error}</p>}

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        orders.map((o) => (
          <div
            key={o.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 10,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div>
              Order #{o.id} • {new Date(o.createdAt).toLocaleString()}
            </div>

            <div>
              Status: <b>{STATUS_LABEL[o.status] || o.status}</b>
            </div>

            <div>Total: ฿ {Number(o.total).toLocaleString()}</div>

            <Link to={`/orders/${o.id}`}>View details</Link>
          </div>
        ))
      )}
    </div>
  );
}
