import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { getToken, clearToken } from "../authStore";
import { API_BASE } from "../config";

const STATUS_LABEL = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PACKING: "กำลังเตรียมพัสดุ",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  async function loadOrder() {
    setError("");
    try {
      const token = getToken();
      if (!token) {
        navigate("/login");
        return;
      }

      const res = await fetch(`${API_BASE}/api/my/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      setOrder(data);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      // ไม่ critical
    }
  }

  useEffect(() => {
    loadOrder();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function uploadSlip(file) {
    if (!file) return;

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("slip", file);

      const res = await fetch(`${API_BASE}/api/my/orders/${id}/slip`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (res.status === 401) {
        clearToken();
        alert("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`);

      alert("Uploaded slip successfully!");
      await loadOrder();
    } catch (e) {
      alert(`Upload failed: ${String(e.message || e)}`);
    } finally {
      setUploading(false);
    }
  }

  if (error) return <p style={{ color: "crimson" }}>{error}</p>;
  if (!order) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 800 }}>
      <p><Link to="/orders">← Back to Your Orders</Link></p>

      <h2>Order #{order.id}</h2>
      <div>Status: <b>{STATUS_LABEL[order.status] || order.status}</b></div>
      <div>Total: <b>฿ {Number(order.total).toLocaleString()}</b></div>
      <div style={{ opacity: 0.8 }}>Created: {new Date(order.createdAt).toLocaleString()}</div>

      <hr />

      <h3>Items</h3>
      {order.items?.map((it) => {
        const p = productById.get(it.productId);
        const name = p?.name ?? `productId: ${it.productId}`;
        return (
          <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
            <div>{name}</div>
            <div>× {it.qty}</div>
            <div>฿ {Number(it.price).toLocaleString()}</div>
          </div>
        );
      })}

      <hr />

      <h3>Payment Slip Upload</h3>
      <p style={{ opacity: 0.8, marginTop: 0 }}>
        Allowed: <b>.png</b>, <b>.jpg</b>, <b>.jpeg</b> (max 5MB)
      </p>

      <input
        type="file"
        accept="image/png,image/jpeg"
        disabled={uploading}
        onChange={(e) => uploadSlip(e.target.files?.[0])}
      />

      {uploading && <p>Uploading...</p>}

      {order.slipUrl && (
        <div style={{ marginTop: 10 }}>
          Slip:{" "}
          <a href={`${API_BASE}${order.slipUrl}`} target="_blank" rel="noreferrer">
            view
          </a>
        </div>
      )}
    </div>
  );
}
