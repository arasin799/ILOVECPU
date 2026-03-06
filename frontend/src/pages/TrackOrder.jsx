import { useState } from "react";
import { API_BASE } from "../config";

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function fetchOrder() {
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`${API_BASE}/api/orders/${orderId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setOrder(data);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function uploadSlip(file) {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("slip", file);

      const res = await fetch(`${API_BASE}/api/orders/${orderId}/slip`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      await fetchOrder();
      alert("Uploaded! Status updated.");
    } catch (e) {
      alert(`Upload failed: ${String(e.message || e)}`);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2>Track Order</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, maxWidth: 520 }}>
        <input value={orderId} onChange={(e) => setOrderId(e.target.value)} placeholder="Enter Order ID" style={{ flex: 1, padding: 10 }} />
        <button onClick={fetchOrder} style={{ padding: "10px 14px" }}>Fetch</button>
      </div>

      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {order && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div>Order ID: <b>{order.id}</b></div>
          <div>Status: <b>{order.status}</b></div>
          <div>Total: <b>฿ {Number(order.total).toLocaleString()}</b></div>

          <h3 style={{ marginTop: 12 }}>Items</h3>
          {order.items?.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <div>productId: {it.productId}</div>
              <div>qty: {it.qty}</div>
              <div>฿ {Number(it.price).toLocaleString()}</div>
            </div>
          ))}

          <h3 style={{ marginTop: 12 }}>Upload Slip (.png/.jpg/.jpeg)</h3>
          <input type="file" accept="image/png,image/jpeg" disabled={uploading} onChange={(e) => uploadSlip(e.target.files?.[0])} />
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
      )}
    </div>
  );
}
