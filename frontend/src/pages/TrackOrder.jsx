import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { API_BASE } from "../config";
import { getToken, clearToken } from "../authStore";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";
import "../styles/order-detail.css";

const PAYMENT_METHOD_LABEL = {
  promptpay_qr: "พร้อมเพย์",
  credit_card: "บัตรเครดิต/เดบิต",
  cod: "เก็บเงินปลายทาง",
};

const VAT_RATE = 0.07;
const FREE_SHIPPING_THRESHOLD = 5000;
const SHIPPING_FEE = 80;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function getTrackingNo(order) {
  if (order?.trackingNo) return order.trackingNo;
  return `EC-${new Date(order?.createdAt || Date.now()).getFullYear()}${String(order?.id || 0).padStart(8, "0")}`;
}

function getProgressStep(status) {
  if (status === "DELIVERED") return 3;
  if (status === "SHIPPED") return 2;
  return 1;
}

function getShippingStatusLabel(status) {
  if (status === "DELIVERED") return "จัดส่งแล้ว";
  if (status === "SHIPPED") return "กำลังจัดส่ง";
  if (status === "PACKING" || status === "PAID") return "รอดำเนินการ";
  return "รอตรวจสอบ";
}

function getPaymentStatusLabel(status) {
  if (["PACKING", "SHIPPED", "DELIVERED", "PAID"].includes(status)) return "สำเร็จ";
  return "รอตรวจสอบ";
}

function buildImageUrl(path) {
  const safePath = String(path || "").trim();
  if (!safePath) return "";
  if (safePath.startsWith("http")) return safePath;
  return safePath.startsWith("/") ? `${API_BASE}${safePath}` : `${API_BASE}/${safePath}`;
}

export default function TrackOrder({ cart = [] }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );
  const productById = useMemo(() => new Map(products.map((item) => [item.id, item])), [products]);

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const token = getToken();
        if (!token) {
          navigate("/login");
          return;
        }

        const [orderRes, productsRes] = await Promise.all([
          fetch(`${API_BASE}/api/my/orders/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_BASE}/api/products`),
        ]);

        if (orderRes.status === 401) {
          clearToken();
          navigate("/login");
          return;
        }

        const orderData = await parseJsonSafe(orderRes);
        if (orderRes.status === 404) {
          navigate("/orders", { replace: true });
          return;
        }
        if (!orderRes.ok) {
          throw new Error(orderData?.message || `HTTP ${orderRes.status}`);
        }

        if (["PENDING_PAYMENT", "CANCELLED"].includes(orderData?.status)) {
          navigate(`/orders/${id}`, { replace: true });
          return;
        }

        const productsData = await parseJsonSafe(productsRes);
        setOrder(orderData);
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (e) {
        setError(String(e.message || e));
      }
    }

    loadData();
  }, [id, navigate]);

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  async function handleDeleteAccount() {
    await requestDeleteAccount({ navigate, setError });
  }

  const itemsSubtotal = useMemo(() => {
    if (!Array.isArray(order?.items)) return 0;
    return order.items.reduce(
      (sum, item) => sum + Number(item.price || 0) * Number(item.qty || 0),
      0
    );
  }, [order]);
  const vatAmount = useMemo(
    () => Math.round(itemsSubtotal * VAT_RATE * 100) / 100,
    [itemsSubtotal]
  );
  const shippingFee = useMemo(() => {
    if (itemsSubtotal === 0 || itemsSubtotal >= FREE_SHIPPING_THRESHOLD) return 0;
    return SHIPPING_FEE;
  }, [itemsSubtotal]);
  const totalAmount = useMemo(() => {
    const stored = Number(order?.total || 0);
    if (itemsSubtotal > 0 && Math.abs(stored - itemsSubtotal) < 0.01) {
      return itemsSubtotal + vatAmount + shippingFee;
    }
    return stored;
  }, [order, itemsSubtotal, vatAmount, shippingFee]);

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

  const progressStep = getProgressStep(order.status);
  const paymentMethod = PAYMENT_METHOD_LABEL[String(order.paymentMethod || "").trim()] || "ไม่ระบุ";

  return (
    <div className="profile-page order-progress-page">
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
                <span className="profile-title-icon">👜</span>
                <h2>รายละเอียดสินค้า</h2>
              </div>
              <Link to="/orders" className="order-progress-list-btn">รายการคำสั่งซื้อ</Link>
            </div>

            <section className="order-progress-shell">
              <div className="order-progress-card">
                <div className="order-progress-steps">
                  {[
                    { step: 1, label: "รอดำเนินการ" },
                    { step: 2, label: "เตรียมจัดส่ง" },
                    { step: 3, label: "จัดส่งแล้ว" },
                  ].map((item) => (
                    <div
                      key={item.step}
                      className={`order-progress-step ${progressStep >= item.step ? "is-active" : ""}`}
                    >
                      <span className="order-progress-step-no">{item.step}</span>
                      <span className="order-progress-step-label">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="order-progress-info-grid">
                <div className="order-progress-info-card">
                  <small>ช่องทางการชำระเงิน :</small>
                  <strong>{paymentMethod}</strong>
                </div>
                <div className="order-progress-info-card">
                  <small>สถานะการชำระเงิน :</small>
                  <strong>{getPaymentStatusLabel(order.status)}</strong>
                </div>
              </div>

              <div className="order-progress-items-card">
                <div className="order-progress-items-head">
                  <span>หมายเลขคำสั่งซื้อสินค้า: {getTrackingNo(order)}</span>
                  <span>วันที่ทำรายการ: {new Date(order.createdAt).toLocaleDateString("th-TH")}</span>
                  <span>สถานะการจัดส่ง: {getShippingStatusLabel(order.status)}</span>
                </div>

                <div className="order-progress-items-list">
                  {order.items?.map((item) => {
                    const product = productById.get(item.productId);
                    const imageUrl = buildImageUrl(product?.imageUrl);
                    const productName = product?.name || `สินค้า #${item.productId}`;

                    return (
                      <div key={item.id} className="order-progress-item-row">
                        <div className="order-progress-item-thumb">
                          {imageUrl ? <img src={imageUrl} alt={productName} /> : <span>IMG</span>}
                        </div>
                        <div className="order-progress-item-body">
                          <p className="order-progress-item-name">{productName}</p>
                          <p className="order-progress-item-sub">จำนวน {item.qty} ชิ้น</p>
                        </div>
                        <div className="order-progress-item-price">
                          ฿{formatCurrency(Number(item.price || 0) * Number(item.qty || 0))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="order-progress-bottom-grid">
                <div className="order-progress-address-card">
                  <h3>ที่อยู่ในการจัดส่งสินค้า</h3>
                  <p>{order.customerName || "-"}</p>
                  <p>{order.phone || "-"}</p>
                  <p>{order.address || "-"}</p>
                </div>

                <div className="order-progress-total-card">
                  <h3>ราคารวมทั้งหมด</h3>
                  <div className="order-progress-total-line">
                    <span>ค่าสินค้า :</span>
                    <strong>฿{formatCurrency(itemsSubtotal)}</strong>
                  </div>
                  <div className="order-progress-total-line">
                    <span>ราคาค่าจัดส่ง :</span>
                    <strong>฿{formatCurrency(shippingFee)}</strong>
                  </div>
                  <div className="order-progress-total-line">
                    <span>ภาษี VAT 7% :</span>
                    <strong>฿{formatCurrency(vatAmount)}</strong>
                  </div>
                  <div className="order-progress-total-line">
                    <span>ส่วนลดทั้งหมด :</span>
                    <strong>฿0.00</strong>
                  </div>
                  <div className="order-progress-total-line">
                    <span>ส่วนลด :</span>
                    <strong>฿0.00</strong>
                  </div>
                  <div className="order-progress-total-line is-grand">
                    <span>รวมทั้งหมด</span>
                    <strong>฿{formatCurrency(totalAmount)}</strong>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
