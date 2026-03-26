import { useState } from "react";
import { API_BASE } from "../config";
import { getToken, clearToken } from "../authStore";

export default function TrackOrder() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState(null);
  const [error, setError] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [code, setCode] = useState("");

  async function fetchOrder() {
    setError("");
    setOrder(null);
    try {
      const token = getToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const res = await fetch(`${API_BASE}/api/my/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        clearToken();
        throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setOrder(data);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function confirmCode() {
    if (!orderId) {
      alert("กรุณากรอก Order ID");
      return;
    }

    const submitCode = code.trim().toUpperCase();
    if (!submitCode) {
      alert("กรุณากรอกรหัสโอนเงิน");
      return;
    }

    setVerifying(true);
    try {
      const token = getToken();
      if (!token) throw new Error("กรุณาเข้าสู่ระบบก่อน");

      const res = await fetch(`${API_BASE}/api/my/orders/${orderId}/confirm-transfer-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: submitCode }),
      });

      if (res.status === 401) {
        clearToken();
        throw new Error("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
      }

      let data = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      alert("ยืนยันสำเร็จ");
      await fetchOrder();
      setCode("");
    } catch (e) {
      alert(`ยืนยันไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setVerifying(false);
    }
  }

  function statusLabel(status) {
    if (status === "PENDING_PAYMENT") return "รอชำระเงิน";
    if (status === "PACKING") return "กำลังเตรียมพัสดุ";
    if (status === "SHIPPED") return "กำลังจัดส่ง";
    if (status === "DELIVERED") return "ส่งสำเร็จ";
    if (status === "CANCELLED") return "ยกเลิก";
    if (status === "PAID") return "ชำระเงินแล้ว";
    return status || "-";
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2>ติดตามคำสั่งซื้อ</h2>

      <div style={{ display: "flex", gap: 8, marginBottom: 10, maxWidth: 520 }}>
        <input
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          placeholder="กรอก Order ID"
          style={{ flex: 1, padding: 10 }}
        />
        <button onClick={fetchOrder} style={{ padding: "10px 14px" }}>
          ค้นหา
        </button>
      </div>

      {error && <p style={{ color: "crimson" }}>ข้อผิดพลาด: {error}</p>}

      {order && (
        <div style={{ border: "1px solid #ddd", borderRadius: 10, padding: 12 }}>
          <div>Order ID: <b>{order.id}</b></div>
          <div>สถานะ: <b>{statusLabel(order.status)}</b></div>
          <div>ยอดรวม: <b>฿ {Number(order.total).toLocaleString()}</b></div>
          <div>รหัสโอนเงิน: <b>{order.paymentCode || "-"}</b></div>

          <h3 style={{ marginTop: 12 }}>รายการสินค้า</h3>
          {order.items?.map((it) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between" }}>
              <div>productId: {it.productId}</div>
              <div>qty: {it.qty}</div>
              <div>฿ {Number(it.price).toLocaleString()}</div>
            </div>
          ))}

          {order.status === "PENDING_PAYMENT" ? (
            <>
              <h3 style={{ marginTop: 12 }}>ยืนยันรหัสโอนเงิน</h3>
              <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="กรอกรหัสโอนเงิน"
                  style={{ flex: 1, padding: 10 }}
                />
                <button onClick={confirmCode} disabled={verifying} style={{ padding: "10px 14px" }}>
                  {verifying ? "กำลังตรวจสอบ..." : "ยืนยัน"}
                </button>
              </div>
            </>
          ) : (
            <p style={{ marginTop: 12, color: "#2e7d32", fontWeight: 700 }}>
              ออเดอร์นี้ผ่านการยืนยันการชำระเงินแล้ว
            </p>
          )}
        </div>
      )}
    </div>
  );
}