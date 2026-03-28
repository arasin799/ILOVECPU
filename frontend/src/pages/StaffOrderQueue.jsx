import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

// Human-readable labels for staff order statuses.
const STATUS_LABEL = {
  PAID: "รอยืนยันการชำระเงิน",
  PACKING: "เตรียมจัดส่ง",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  PENDING_PAYMENT: "รอชำระเงิน",
  CANCELLED: "ยกเลิก",
};

// Human-readable labels for payment methods in the staff queue.
const PAYMENT_METHOD_LABEL = {
  promptpay_qr: "สแกน QR พร้อมเพย์",
  credit_card: "บัตรเครดิต/เดบิต",
  cod: "เก็บเงินปลายทาง",
};

// Format money values for order totals.
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Format order timestamps for the staff UI.
function formatDateTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("th-TH");
}

// Parse JSON safely for staff order endpoints.
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Build queue-specific endpoints for loading staff orders.
function buildOrderQueueEndpoints(mode) {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [
    "http://localhost:4000/api/staff/orders",
    "http://localhost:4000/staff/orders",
    "/api/staff/orders",
    "/staff/orders",
  ];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.unshift(
      `${normalizedBase}/api/staff/orders`,
      `${normalizedBase}/staff/orders`
    );
  }

  return Array.from(new Set(endpoints)).map((base) => `${base}?queue=${mode}`);
}

// Build action endpoints for staff order actions such as confirm-payment/status updates.
function buildOrderActionEndpoints(orderId, action) {
  const normalizedBase = String(API_BASE || "").replace(/\/+$/, "");
  const endpoints = [
    `http://localhost:4000/api/staff/orders/${orderId}/${action}`,
    `http://localhost:4000/staff/orders/${orderId}/${action}`,
    `/api/staff/orders/${orderId}/${action}`,
    `/staff/orders/${orderId}/${action}`,
  ];

  const isFrontendDevBase =
    /^https?:\/\/localhost:5173$/i.test(normalizedBase) ||
    /^https?:\/\/127\.0\.0\.1:5173$/i.test(normalizedBase);

  if (normalizedBase && !isFrontendDevBase) {
    endpoints.unshift(
      `${normalizedBase}/api/staff/orders/${orderId}/${action}`,
      `${normalizedBase}/staff/orders/${orderId}/${action}`
    );
  }

  return Array.from(new Set(endpoints));
}

// Convert API error payloads into one readable error message.
function normalizeApiError(data, fallback) {
  const message = String(data?.message || "").trim();
  if (!message) return fallback;
  if (message.startsWith("API route not found:") || message === "HTTP 404") {
    return "ไม่พบ API จัดการคำสั่งซื้อ กรุณารีสตาร์ต backend ก่อน";
  }
  return message;
}

// Shared staff order queue page used by payment-confirmation and processing views.
export default function StaffOrderQueue({ mode = "payment" }) {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [keyword, setKeyword] = useState("");
  const [actioningId, setActioningId] = useState(null);
  const [activeOrdersEndpoint, setActiveOrdersEndpoint] = useState("");

  const isPaymentMode = mode === "payment";

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  async function loadOrders() {
    setLoading(true);
    setError("");

    const candidates = [
      ...(activeOrdersEndpoint ? [activeOrdersEndpoint] : []),
      ...buildOrderQueueEndpoints(mode).filter((endpoint) => endpoint !== activeOrdersEndpoint),
    ];

    let lastError = "ไม่สามารถโหลดข้อมูลคำสั่งซื้อได้";

    try {
      for (const endpoint of candidates) {
        let res;
        try {
          res = await fetch(endpoint, {
            headers: getAuthHeader(),
          });
        } catch {
          lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
          continue;
        }

        const data = await parseJsonSafe(res);

        if (res.status === 401 || res.status === 403) {
          handleForbidden();
          return;
        }

        if (res.ok) {
          setOrders(Array.isArray(data) ? data : []);
          setActiveOrdersEndpoint(endpoint);
          return;
        }

        lastError = normalizeApiError(data, `HTTP ${res.status}`);
      }

      throw new Error(lastError);
    } catch (e) {
      setOrders([]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, navigate]);

  const filteredOrders = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return orders.filter((order) => {
      if (!q) return true;
      return [
        order.id,
        order.customerName,
        order.phone,
        order.address,
        order.paymentMethod,
        order.paymentCode,
        order.status,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [orders, keyword]);

  const summary = useMemo(() => {
    const totalOrders = filteredOrders.length;
    const totalAmount = filteredOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const verifiedCount = filteredOrders.filter((order) => order.paymentVerifiedAt).length;
    const paymentCodeCount = filteredOrders.filter((order) => String(order.paymentCode || "").trim()).length;
    return { totalOrders, totalAmount, verifiedCount, paymentCodeCount };
  }, [filteredOrders]);

  async function confirmPayment(orderId) {
    setActioningId(orderId);

    let lastError = "ยืนยันการชำระเงินไม่สำเร็จ";

    try {
      for (const endpoint of buildOrderActionEndpoints(orderId, "confirm-payment")) {
        let res;
        try {
          res = await fetch(endpoint, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
          });
        } catch {
          lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
          continue;
        }

        const data = await parseJsonSafe(res);

        if (res.status === 401 || res.status === 403) {
          handleForbidden();
          return;
        }

        if (res.ok) {
          await loadOrders();
          navigate("/staff/orders/processing");
          return;
        }

        lastError = normalizeApiError(data, `HTTP ${res.status}`);
      }

      throw new Error(lastError);
    } catch (e) {
      window.alert(`ยืนยันการชำระเงินไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setActioningId(null);
    }
  }

  async function advanceOrder(order) {
    const currentStatus = String(order?.status || "").trim().toUpperCase();
    const nextStatus = currentStatus === "PACKING" ? "SHIPPED" : "DELIVERED";

    setActioningId(order.id);
    let lastError = "อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ";

    try {
      for (const endpoint of buildOrderActionEndpoints(order.id, "status")) {
        let res;
        try {
          res = await fetch(endpoint, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...getAuthHeader(),
            },
            body: JSON.stringify({ status: nextStatus }),
          });
        } catch {
          lastError = "เชื่อมต่อ backend ไม่ได้ กรุณาตรวจสอบว่า server ทำงานที่พอร์ต 4000";
          continue;
        }

        const data = await parseJsonSafe(res);

        if (res.status === 401 || res.status === 403) {
          handleForbidden();
          return;
        }

        if (res.ok) {
          await loadOrders();
          return;
        }

        lastError = normalizeApiError(data, `HTTP ${res.status}`);
      }

      throw new Error(lastError);
    } catch (e) {
      window.alert(`อัปเดตสถานะคำสั่งซื้อไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setActioningId(null);
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
          <h1>{isPaymentMode ? "ยืนยันการชำระเงิน" : "ดำเนินคำสั่งซื้อ"}</h1>
          <p>
            {isPaymentMode
              ? "ตรวจสอบออเดอร์ที่ลูกค้าแจ้งชำระเงินแล้วก่อนส่งต่อไปเตรียมจัดส่ง"
              : "อัปเดตสถานะคำสั่งซื้อจากเตรียมจัดส่งไปจนถึงส่งสำเร็จ"}
          </p>
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
            className="staff-secondary-btn staff-topbar-nav-btn"
            onClick={() => navigate("/staff/customers")}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn is-active"
            onClick={() => navigate("/staff/orders/payments")}
          >
            คำสั่งซื้อ
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

      <section className="staff-summary-grid">
        <article className="staff-summary-card">
          <span>{isPaymentMode ? "รอยืนยันการชำระ" : "ออเดอร์ที่กำลังดำเนินการ"}</span>
          <strong>{summary.totalOrders}</strong>
        </article>
        <article className="staff-summary-card">
          <span>ยอดรวมทั้งหมด</span>
          <strong>฿{formatCurrency(summary.totalAmount)}</strong>
        </article>
        <article className="staff-summary-card">
          <span>{isPaymentMode ? "มีรหัสชำระเงิน" : "ตรวจสอบชำระแล้ว"}</span>
          <strong>{isPaymentMode ? summary.paymentCodeCount : summary.verifiedCount}</strong>
        </article>
      </section>

      <section className="staff-panel staff-list-panel">
        <div className="staff-list-head">
          <div className="staff-list-title-group">
            <h2>จัดการคำสั่งซื้อ</h2>
          </div>
          <div className="staff-order-queue-tabs">
            <button
              type="button"
              className={`staff-order-queue-tab ${isPaymentMode ? "is-active" : ""}`}
              onClick={() => navigate("/staff/orders/payments")}
            >
              Confirm ชำระเงิน
            </button>
            <button
              type="button"
              className={`staff-order-queue-tab ${!isPaymentMode ? "is-active" : ""}`}
              onClick={() => navigate("/staff/orders/processing")}
            >
              ดำเนินคำสั่งซื้อ
            </button>
          </div>
          <input
            type="text"
            placeholder="ค้นหาจากรหัสออเดอร์ ชื่อลูกค้า เบอร์โทร หรือรหัสชำระ"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {error ? <p className="staff-error">{error}</p> : null}

        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลคำสั่งซื้อ...</p>
        ) : filteredOrders.length === 0 ? (
          <p className="staff-empty">
            {isPaymentMode ? "ไม่มีออเดอร์ที่รอยืนยันการชำระเงิน" : "ไม่มีออเดอร์ที่ต้องดำเนินการ"}
          </p>
        ) : (
          <div className="staff-order-card-list">
            {filteredOrders.map((order) => {
              const paymentMethodLabel =
                PAYMENT_METHOD_LABEL[String(order.paymentMethod || "").trim()] || "ไม่ระบุ";
              const actionLabel = isPaymentMode
                ? "ยืนยันการชำระเงิน"
                : String(order.status || "").trim().toUpperCase() === "PACKING"
                  ? "เปลี่ยนเป็นกำลังจัดส่ง"
                  : "เปลี่ยนเป็นส่งสำเร็จ";
              const actionHandler = isPaymentMode
                ? () => confirmPayment(order.id)
                : () => advanceOrder(order);

              return (
                <article key={order.id} className="staff-order-card">
                  <div className="staff-order-card-head">
                    <div>
                      <h3>คำสั่งซื้อ #{order.id}</h3>
                      <p>{formatDateTime(order.createdAt)}</p>
                    </div>
                    <span className={`staff-order-status-badge status-${String(order.status || "").toLowerCase()}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="staff-order-meta-grid">
                    <div className="staff-order-meta-block">
                      <small>ลูกค้า</small>
                      <strong>{order.customerName || "-"}</strong>
                    </div>
                    <div className="staff-order-meta-block">
                      <small>เบอร์โทร</small>
                      <strong>{order.phone || "-"}</strong>
                    </div>
                    <div className="staff-order-meta-block">
                      <small>ช่องทางชำระเงิน</small>
                      <strong>{paymentMethodLabel}</strong>
                    </div>
                    <div className="staff-order-meta-block">
                      <small>รหัสชำระเงิน</small>
                      <strong>{order.paymentCode || "-"}</strong>
                    </div>
                    <div className="staff-order-meta-block">
                      <small>จำนวนรายการสินค้า</small>
                      <strong>{Number(order.itemCount || 0)} รายการ</strong>
                    </div>
                    <div className="staff-order-meta-block">
                      <small>ยอดรวม</small>
                      <strong>฿{formatCurrency(order.total)}</strong>
                    </div>
                  </div>

                  <div className="staff-order-address">
                    <small>ที่อยู่จัดส่ง</small>
                    <p>{order.address || "-"}</p>
                  </div>

                  <div className="staff-order-card-actions">
                    <button
                      type="button"
                      className="staff-primary-btn"
                      onClick={actionHandler}
                      disabled={actioningId === order.id}
                    >
                      {actioningId === order.id ? "กำลังอัปเดต..." : actionLabel}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
