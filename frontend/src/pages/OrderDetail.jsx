import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useRef } from "react";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { API_BASE } from "../config";
import "../styles/home.css";
import "../styles/order-detail.css";

// Human-readable labels for each backend order status.
const STATUS_LABEL = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PACKING: "กำลังเตรียมพัสดุ",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

// Human-readable labels for each payment method.
const PAYMENT_METHOD_LABEL = {
  promptpay_qr: "สแกน QR พร้อมเพย์",
  credit_card: "บัตรเครดิต/เดบิต",
  cod: "เก็บเงินปลายทาง",
};
// Payment-method options used when the customer changes how they want to pay.
const PAYMENT_OPTIONS = [
  { value: "promptpay_qr", label: "สแกน QR พร้อมเพย์" },
  { value: "credit_card", label: "บัตรเครดิต/เดบิต" },
  { value: "cod", label: "เก็บเงินปลายทาง" },
];

const VAT_RATE = 0.07;
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 80;

// Map backend status values to CSS modifier classes.
function getStatusClass(status) {
  if (status === "PENDING_PAYMENT") return "is-pending";
  if (status === "PAID") return "is-paid";
  if (["PACKING", "SHIPPED"].includes(status)) return "is-progress";
  if (status === "DELIVERED") return "is-delivered";
  if (status === "CANCELLED") return "is-cancelled";
  return "";
}

// Safely parse JSON without throwing when the response body is invalid.
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Format currency values for the order summary.
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Order detail page: inspect one order, change payment method, confirm payment, or cancel.
export default function OrderDetail({ cart = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const paymentMenuRef = useRef(null);

  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [confirmingPayment, setConfirmingPayment] = useState(false);
  const [q, setQ] = useState("");
  const [showPaymentMenu, setShowPaymentMenu] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrReference, setQrReference] = useState("");

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const isPendingPayment = order?.status === "PENDING_PAYMENT";

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

      const data = await parseJsonSafe(res);
      if (res.status === 404) {
        navigate("/orders", { replace: true });
        return;
      }
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      if (["PAID", "PACKING", "SHIPPED", "DELIVERED"].includes(String(data?.status || "").trim())) {
        navigate(`/orders/${id}/tracking`, { replace: true });
        return;
      }

      setOrder(data);
    } catch (e) {
      setError(String(e.message || e));
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch(`${API_BASE}/api/products`);
      const data = await parseJsonSafe(res);
      setProducts(Array.isArray(data) ? data : []);
    } catch {
      setProducts([]);
    }
  }

  useEffect(() => {
    loadOrder();
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const itemsSubtotal = useMemo(() => {
    if (!Array.isArray(order?.items)) return 0;
    return order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );
  }, [order]);
  const computedVat = useMemo(
    () => Math.round(itemsSubtotal * VAT_RATE * 100) / 100,
    [itemsSubtotal]
  );
  const computedShipping = useMemo(() => {
    if (itemsSubtotal === 0 || itemsSubtotal >= FREE_SHIPPING_THRESHOLD) return 0;
    return SHIPPING_FEE;
  }, [itemsSubtotal]);
  const computedGrandTotal = useMemo(
    () => itemsSubtotal + computedVat + computedShipping,
    [itemsSubtotal, computedVat, computedShipping]
  );
  const payableTotal = useMemo(() => {
    const storedTotal = Number(order?.total || 0);
    const isLegacySubtotal =
      itemsSubtotal > 0 && Math.abs(storedTotal - itemsSubtotal) < 0.01;
    return isLegacySubtotal ? computedGrandTotal : storedTotal;
  }, [order, itemsSubtotal, computedGrandTotal]);
  const currentPaymentMethod = String(order?.paymentMethod || "promptpay_qr").trim();
  const paymentMethodLabel =
    PAYMENT_METHOD_LABEL[currentPaymentMethod] || "ยังไม่ได้ระบุ";

  function buildQrPayload(reference, amountValue) {
    const amount = Number(amountValue || 0).toFixed(2);
    return `PROMPTPAY|AMOUNT:${amount}|REF:${reference}|SHOP:ILOVECPU`;
  }

  function openQrModal() {
    const reference = String(order?.paymentCode || `ORDER-${order?.id || Date.now()}`).trim();
    const payload = buildQrPayload(reference, payableTotal);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
    setQrReference(reference);
    setQrImageUrl(qrUrl);
    setShowQrModal(true);
  }

  function closeQrModal() {
    setShowQrModal(false);
    setQrImageUrl("");
    setQrReference("");
  }

  useEffect(() => {
    if (!showPaymentMenu) return undefined;

    function handleOutsideClick(event) {
      if (!paymentMenuRef.current?.contains(event.target)) {
        setShowPaymentMenu(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [showPaymentMenu, paymentMenuRef]);


  useEffect(() => {
    setShowPaymentMenu(false);
  }, [currentPaymentMethod]);

  async function changePaymentMethod(nextMethod) {
    if (!isPendingPayment) return;

    const safeMethod = String(nextMethod || "").trim();
    if (!safeMethod || safeMethod === currentPaymentMethod) {
      setShowPaymentMenu(false);
      return;
    }

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setUpdatingPaymentMethod(true);
    try {
      const candidates = [
        { method: "PATCH", path: `/api/my/orders/${id}/payment-method` },
        { method: "POST", path: `/api/my/orders/${id}/payment-method` },
        { method: "PATCH", path: `/api/orders/${id}/payment-method` },
        { method: "POST", path: `/api/orders/${id}/payment-method` },
      ];

      let data = null;
      let requestOk = false;
      let hasOnlyNotFound = true;

      for (const candidate of candidates) {
        const res = await fetch(`${API_BASE}${candidate.path}`, {
          method: candidate.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ paymentMethod: safeMethod }),
        });

        if (res.status === 401) {
          clearToken();
          alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
          navigate("/login");
          return;
        }

        data = await parseJsonSafe(res);
        if (res.ok) {
          requestOk = true;
          break;
        }

        if (res.status === 404 || res.status === 405) continue;

        hasOnlyNotFound = false;
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      if (!requestOk) {
        if (hasOnlyNotFound) {
          throw new Error("ไม่พบ API เปลี่ยนช่องทางชำระเงิน กรุณารีสตาร์ต backend");
        }
        throw new Error("เปลี่ยนช่องทางชำระเงินไม่สำเร็จ");
      }

      const updatedMethod = String(data?.paymentMethod || safeMethod);
      setOrder((prev) => (prev ? { ...prev, paymentMethod: updatedMethod } : prev));
      setShowPaymentMenu(false);
    } catch (e) {
      alert(`เปลี่ยนช่องทางชำระเงินไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setUpdatingPaymentMethod(false);
    }
  }

  async function cancelOrder() {
    if (!isPendingPayment || cancellingOrder) return;

    const confirmed = window.confirm("ยืนยันยกเลิกคำสั่งซื้อใช่หรือไม่?");
    if (!confirmed) return;

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setCancellingOrder(true);
    try {
      const candidates = [
        { method: "POST", path: `/api/my/orders/${id}/cancel` },
        { method: "PATCH", path: `/api/my/orders/${id}/cancel` },
        { method: "POST", path: `/api/orders/${id}/cancel` },
        { method: "PATCH", path: `/api/orders/${id}/cancel` },
      ];

      let data = null;
      let requestOk = false;
      let hasOnlyNotFound = true;

      for (const candidate of candidates) {
        const res = await fetch(`${API_BASE}${candidate.path}`, {
          method: candidate.method,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.status === 401) {
          clearToken();
          alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
          navigate("/login");
          return;
        }

        data = await parseJsonSafe(res);
        if (res.ok) {
          requestOk = true;
          break;
        }

        if (res.status === 404 || res.status === 405) {
          continue;
        }

        hasOnlyNotFound = false;
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      if (!requestOk) {
        if (hasOnlyNotFound) {
          throw new Error("ไม่พบ API ยกเลิกคำสั่งซื้อ กรุณารีสตาร์ต backend");
        }
        throw new Error("ยกเลิกคำสั่งซื้อไม่สำเร็จ");
      }

      setOrder((prev) => (prev ? { ...prev, status: "CANCELLED" } : prev));
      alert("ยกเลิกคำสั่งซื้อสำเร็จ");
    } catch (e) {
      alert(`ยกเลิกคำสั่งซื้อไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setCancellingOrder(false);
    }
  }

  async function confirmPaymentCompleted() {
    if (!isPendingPayment || confirmingPayment) return;

    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    setConfirmingPayment(true);
    try {
      const safeCode = String(order?.paymentCode || "").trim().toUpperCase();
      const res = await fetch(`${API_BASE}/api/my/orders/${id}/confirm-transfer-code`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: safeCode }),
      });

      if (res.status === 401) {
        clearToken();
        alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        navigate("/login");
        return;
      }

      const data = await parseJsonSafe(res);
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      navigate(`/orders/${id}/tracking`, { replace: true });
    } catch (e) {
      alert(`ยืนยันการชำระเงินไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setConfirmingPayment(false);
    }
  }

  if (error) {
    return (
      <div className="order-detail-page">
        <p className="order-detail-error">{error}</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-page">
        <p className="order-detail-loading">กำลังโหลดคำสั่งซื้อ...</p>
      </div>
    );
  }

  return (
    <div className="order-detail-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
        cartCount={cartCount}
      />

      <main className="order-detail-main">
        <div className="order-detail-back-row">
          <Link to="/orders" className="order-detail-back-link">← กลับไปยังรายการคำสั่งซื้อ</Link>
        </div>

        <section className="order-detail-layout">
          <div className="order-detail-left">
            <article className="order-overview-card">
              <div className="order-overview-head">
                <h2>คำสั่งซื้อ #{order.id}</h2>
                <span className={`order-status-chip ${getStatusClass(order.status)}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              <div className="order-overview-meta">
                <p>วันที่สั่งซื้อ: {new Date(order.createdAt).toLocaleString("th-TH")}</p>
                <p>ยอดที่ต้องชำระ (VAT 7%): <strong>฿{formatCurrency(payableTotal)}</strong></p>
              </div>

              {isPendingPayment ? (
                <div className="order-pending-banner">
                  ออเดอร์นี้อยู่ในสถานะรอชำระเงิน
                </div>
              ) : order.status === "CANCELLED" ? (
                <div className="order-cancel-banner">
                  คำสั่งซื้อนี้ถูกยกเลิกแล้ว
                </div>
              ) : (
                <div className="order-normal-banner">
                  ชำระเงินเสร็จแล้ว ระบบส่งออเดอร์ไปหลังบ้านเพื่อเตรียมพัสดุเรียบร้อย
                </div>
              )}

              {isPendingPayment ? (
                <div className="order-action-grid">
                  <button
                    type="button"
                    className="order-cancel-btn"
                    onClick={cancelOrder}
                    disabled={cancellingOrder || confirmingPayment}
                  >
                    {cancellingOrder ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อ"}
                  </button>
                </div>
              ) : null}
            </article>

            <article className="order-payment-card">
              <h3>เปลี่ยนช่องทางการชำระเงิน</h3>
              <p>เลือกช่องทางชำระเงินสำหรับคำสั่งซื้อนี้</p>

              <div className="order-payment-select-wrap" ref={paymentMenuRef}>
                <button
                  type="button"
                  className={`order-payment-select-trigger ${showPaymentMenu ? "is-open" : ""}`}
                  onClick={() => {
                    if (!isPendingPayment || updatingPaymentMethod) return;
                    setShowPaymentMenu((prev) => !prev);
                  }}
                  disabled={!isPendingPayment || updatingPaymentMethod}
                >
                  <span className="order-payment-select-value">{paymentMethodLabel}</span>
                  <span className="order-payment-select-arrow" aria-hidden="true" />
                </button>

                {showPaymentMenu && isPendingPayment ? (
                  <div className="order-payment-select-menu">
                    {PAYMENT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={`order-payment-select-option ${
                          option.value === currentPaymentMethod ? "is-selected" : ""
                        }`}
                        onClick={() => changePaymentMethod(option.value)}
                        disabled={updatingPaymentMethod}
                      >
                        <span>{option.label}</span>
                        {option.value === currentPaymentMethod ? (
                          <span className="order-payment-select-check" aria-hidden="true">✓</span>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="order-payment-note">
                {updatingPaymentMethod
                  ? "กำลังอัปเดตช่องทางชำระเงิน..."
                  : !isPendingPayment
                    ? "คำสั่งซื้อนี้ไม่สามารถเปลี่ยนช่องทางชำระเงินได้แล้ว"
                    : ""}
              </div>

              {isPendingPayment && currentPaymentMethod === "promptpay_qr" ? (
                <div className="order-payment-qr-row">
                  <button
                    type="button"
                    className="order-payment-qr-btn"
                    onClick={openQrModal}
                  >
                    แสดง QR Code
                  </button>
                </div>
              ) : null}
            </article>

          </div>

          <aside className="order-summary-card">
            <h3>สรุปรายการสินค้า</h3>

            <div className="order-items">
              {order.items?.map((it) => {
                const p = productById.get(it.productId);
                const name = p?.name ?? `สินค้า #${it.productId}`;
                const imageUrl = p?.imageUrl
                  ? p.imageUrl.startsWith("http")
                    ? p.imageUrl
                    : `${API_BASE}${p.imageUrl}`
                  : "";
                const lineTotal = Number(it.price || 0) * Number(it.qty || 0);

                return (
                  <div key={it.id} className="order-item-row">
                    <div className="order-item-thumb">
                      {imageUrl ? <img src={imageUrl} alt={name} /> : <span>IMG</span>}
                    </div>
                    <div className="order-item-info">
                      <p className="order-item-name">{name}</p>
                      <p className="order-item-qty">x{it.qty}</p>
                    </div>
                    <div className="order-item-price">฿{lineTotal.toLocaleString()}</div>
                  </div>
                );
              })}
            </div>

            <hr />

            <div className="order-summary-line">
              <span>ยอดรวม (VAT 7%)</span>
              <strong>฿{formatCurrency(payableTotal)}</strong>
            </div>

            <div className="order-shipping-block">
              <h4>ที่อยู่จัดส่ง</h4>
              <p>{order.customerName || "-"}</p>
              <p>{order.phone || "-"}</p>
              <p>{order.address || "-"}</p>
            </div>

            {isPendingPayment ? (
              <button
                type="button"
                className="order-payment-complete-btn order-payment-complete-btn-summary"
                onClick={confirmPaymentCompleted}
                disabled={confirmingPayment || cancellingOrder}
              >
                {confirmingPayment ? "กำลังตรวจสอบการชำระเงิน..." : "ชำระเงินแล้ว"}
              </button>
            ) : null}
          </aside>
        </section>
      </main>

      {showQrModal ? (
        <div className="order-qr-overlay" onClick={closeQrModal}>
          <div className="order-qr-modal" onClick={(e) => e.stopPropagation()}>
            <h4>สแกน QR เพื่อชำระเงิน</h4>
            <p className="order-qr-amount">ยอดชำระ ฿{formatCurrency(payableTotal)}</p>
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Payment" className="order-qr-image" />
            ) : null}
            <p className="order-qr-ref">รหัสอ้างอิง: {qrReference || "-"}</p>
            <button type="button" className="order-payment-qr-btn" onClick={closeQrModal}>
              ปิด
            </button>
          </div>
        </div>
      ) : null}

      <HomeFooter />
    </div>
  );
}
