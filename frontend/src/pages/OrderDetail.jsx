import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { API_BASE } from "../config";
import "../styles/home.css";
import "../styles/order-detail.css";

const STATUS_LABEL = {
  PENDING_PAYMENT: "รอชำระเงิน",
  PAID: "ชำระเงินแล้ว",
  PACKING: "กำลังเตรียมพัสดุ",
  SHIPPED: "กำลังจัดส่ง",
  DELIVERED: "ส่งสำเร็จ",
  CANCELLED: "ยกเลิก",
};

const PAYMENT_OPTIONS = [
  { value: "promptpay_qr", label: "สแกน QR พร้อมเพย์" },
  { value: "credit_card", label: "บัตรเครดิต/เดบิต" },
  { value: "cod", label: "เก็บเงินปลายทาง" },
];

function getStatusClass(status) {
  if (status === "PENDING_PAYMENT") return "is-pending";
  if (status === "PAID") return "is-paid";
  if (["PACKING", "SHIPPED"].includes(status)) return "is-progress";
  if (status === "DELIVERED") return "is-delivered";
  if (status === "CANCELLED") return "is-cancelled";
  return "";
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

export default function OrderDetail({ cart = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [updatingPaymentMethod, setUpdatingPaymentMethod] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [q, setQ] = useState("");

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
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

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

  const currentPaymentMethod = String(order?.paymentMethod || "promptpay_qr");

  async function changePaymentMethod(nextMethod) {
    if (!isPendingPayment) return;
    if (nextMethod === currentPaymentMethod) return;

    const safeMethod = String(nextMethod || "").trim();
    if (!safeMethod) return;

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

        if (res.status === 404 || res.status === 405) {
          continue;
        }

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
                <p>ยอดที่ต้องชำระ: <strong>฿{Number(order.total || 0).toLocaleString()}</strong></p>
              </div>

              {isPendingPayment ? (
                <div className="order-pending-banner">
                  ออเดอร์นี้อยู่ในสถานะรอชำระเงิน กรุณาเลือกช่องทางชำระเงิน
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
                <div className="order-action-row">
                  <button
                    type="button"
                    className="order-cancel-btn"
                    onClick={cancelOrder}
                    disabled={cancellingOrder}
                  >
                    {cancellingOrder ? "กำลังยกเลิก..." : "ยกเลิกคำสั่งซื้อ"}
                  </button>
                </div>
              ) : null}
            </article>

            <article className="order-payment-card">
              <h3>เปลี่ยนช่องทางการชำระเงิน</h3>
              <p>เลือกช่องทางที่ต้องการชำระเงินสำหรับออเดอร์นี้</p>

              <div className="order-payment-method-list">
                {PAYMENT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`order-payment-method-btn ${
                      currentPaymentMethod === option.value ? "is-selected" : ""
                    }`}
                    onClick={() => changePaymentMethod(option.value)}
                    disabled={!isPendingPayment || updatingPaymentMethod}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {currentPaymentMethod === "promptpay_qr" ? (
                <div className="order-qr-preview-box">แสดง qr code</div>
              ) : null}

              {!isPendingPayment ? (
                <div className="order-slip-empty">ออเดอร์นี้ไม่สามารถเปลี่ยนช่องทางชำระเงินได้แล้ว</div>
              ) : updatingPaymentMethod ? (
                <div className="order-slip-empty">
                  กำลังอัปเดตช่องทางชำระเงิน...
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
              <span>ยอดรวม</span>
              <strong>฿{Number(order.total || 0).toLocaleString()}</strong>
            </div>

            <div className="order-shipping-block">
              <h4>ที่อยู่จัดส่ง</h4>
              <p>{order.customerName || "-"}</p>
              <p>{order.phone || "-"}</p>
              <p>{order.address || "-"}</p>
            </div>
          </aside>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
