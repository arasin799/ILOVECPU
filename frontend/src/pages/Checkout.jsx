import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { loadAddresses, saveAddresses } from "../addressStore";
import { API_BASE } from "../config";
import "../styles/home.css";
import "../styles/checkout.css";

// Empty shape used when creating or resetting the shipping-address form.
const emptyAddressForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  district: "",
  province: "",
  postalCode: "",
  note: "",
  setAsDefault: true,
};

// Available payment methods shown to the customer during checkout.
const paymentOptions = [
  { value: "credit_card", label: "ผ่อนชำระผ่านบัตรเครดิต" },
  { value: "promptpay_qr", label: "สแกน QR พร้อมเพย์" },
  { value: "cod", label: "เก็บเงินปลายทาง" },
];
const VAT_RATE = 0.07;
const VAT_PERCENT_LABEL = 7;
const MAX_STOCK_MESSAGE = "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14\u0e43\u0e19\u0e2a\u0e15\u0e4a\u0e2d\u0e01";

// Build one readable shipping-address string from the stored address fields.
function buildAddressText(item) {
  if (!item) return "";
  const tail = [item.district, item.province, item.postalCode].filter(Boolean).join(" ");
  return [item.addressLine, tail].filter(Boolean).join(" ").trim();
}

// Safely parse JSON responses without crashing on non-JSON/error responses.
async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

// Format money values for display in Thai locale.
function formatCurrency(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Checkout page: review cart, manage addresses, choose payment method, and place the order.
export default function Checkout({ cart, setCart }) {
  const QR_PAYMENT_METHOD = "promptpay_qr";
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [placing, setPlacing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [q, setQ] = useState("");
  const [checkoutStep, setCheckoutStep] = useState(1);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [paymentMethod, setPaymentMethod] = useState(paymentOptions[0].value);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [qrReference, setQrReference] = useState("");
  const [qrAmount, setQrAmount] = useState(0);
  const [qrRedirectPath, setQrRedirectPath] = useState("");
  const [stockWarningByProductId, setStockWarningByProductId] = useState({});
  const [pendingRemoveItem, setPendingRemoveItem] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    const savedAddresses = loadAddresses();
    setAddresses(savedAddresses);
    const defaultAddress = savedAddresses.find((item) => item.isDefault) || savedAddresses[0];
    setSelectedAddressId(defaultAddress?.id || "");
  }, [navigate]);

  useEffect(() => {
    (async () => {
      try {
        setLoadingProducts(true);
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        setProducts(Array.isArray(data) ? data : []);
      } finally {
        setLoadingProducts(false);
      }
    })();
  }, []);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.qty, 0), [cart]);

  const lineItems = useMemo(() => {
    return cart.map((it) => {
      const product = productById.get(it.productId);
      const price = product?.price ?? it.price ?? 0;
      const imageUrl = product?.imageUrl
        ? product.imageUrl.startsWith("http")
          ? product.imageUrl
          : `${API_BASE}${product.imageUrl}`
        : "";

      return {
        productId: it.productId,
        qty: it.qty,
        price,
        stock:
          product && Number.isFinite(Number(product.stock))
            ? Math.max(0, Math.floor(Number(product.stock)))
            : null,
        name: product?.name ?? it.name ?? `สินค้า #${it.productId}`,
        imageUrl,
      };
    });
  }, [cart, productById]);

  const subtotal = useMemo(() => {
    let total = 0;
    for (const item of lineItems) {
      total += item.price * item.qty;
    }
    return total;
  }, [lineItems]);

  const selectedAddress = useMemo(
    () => addresses.find((item) => String(item.id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId]
  );

  const paymentMethodLabel = useMemo(
    () => paymentOptions.find((item) => item.value === paymentMethod)?.label || "-",
    [paymentMethod]
  );

  const vat = Math.round(subtotal * VAT_RATE * 100) / 100;
  const shipping = subtotal === 0 || subtotal >= 5000 ? 0 : 80;
  const discount = 0;
  const grandTotal = subtotal + vat + shipping - discount;

  

  function getStockLimit(productId) {
    const stockRaw = Number(productById.get(productId)?.stock);
    if (!Number.isFinite(stockRaw)) return null;
    return Math.max(0, Math.floor(stockRaw));
  }

  useEffect(() => {
    if (products.length === 0) return;

    setCart((prev) => {
      let changed = false;
      const next = [];

      for (const item of prev) {
        const stockLimit = getStockLimit(item.productId);
        if (stockLimit === null) {
          next.push(item);
          continue;
        }

        if (stockLimit <= 0) {
          changed = true;
          continue;
        }

        const clampedQty = Math.min(item.qty, stockLimit);
        if (clampedQty !== item.qty) {
          changed = true;
          next.push({ ...item, qty: clampedQty });
          continue;
        }

        next.push(item);
      }

      return changed ? next : prev;
    });
  }, [products, setCart]);

  function inc(id) {
    const stockLimit = getStockLimit(id);
    let showWarning = false;

    setCart((prev) =>
      prev.map((x) => {
        if (x.productId !== id) return x;

        if (stockLimit === null) {
          return { ...x, qty: x.qty + 1 };
        }

        const nextQty = Math.min(stockLimit, x.qty + 1);
        showWarning = nextQty >= stockLimit;
        return { ...x, qty: nextQty };
      })
    );

    if (stockLimit !== null) {
      setStockWarningByProductId((prev) => ({ ...prev, [id]: showWarning }));
    }
  }

  function dec(id) {
    const targetItem = lineItems.find((item) => item.productId === id);
    if (targetItem?.qty <= 1) {
      setPendingRemoveItem({
        productId: id,
        name: targetItem.name,
      });
      return;
    }

    setStockWarningByProductId((prev) => ({ ...prev, [id]: false }));
    setCart((prev) =>
      prev
        .map((x) => (x.productId === id ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  }

  function remove(id) {
    setStockWarningByProductId((prev) => ({ ...prev, [id]: false }));
    setCart((prev) => prev.filter((x) => x.productId !== id));
  }

  function confirmRemoveItem() {
    if (!pendingRemoveItem?.productId) return;
    remove(pendingRemoveItem.productId);
    setPendingRemoveItem(null);
  }

  function goToDetailStep() {
    if (lineItems.length === 0) {
      alert("ยังไม่มีสินค้าในตะกร้า");
      return;
    }
    setCheckoutStep(2);
  }

  function saveAddressFromCheckout() {
    const payload = {
      fullName: addressForm.fullName.trim(),
      phone: addressForm.phone.trim(),
      addressLine: addressForm.addressLine.trim(),
      district: addressForm.district.trim(),
      province: addressForm.province.trim(),
      postalCode: addressForm.postalCode.trim(),
      note: addressForm.note.trim(),
      isDefault: addresses.length === 0 || addressForm.setAsDefault,
    };

    if (!payload.fullName || !payload.phone || !payload.addressLine) {
      alert("กรุณากรอกชื่อผู้รับ เบอร์โทร และที่อยู่");
      return;
    }

    const newAddress = {
      ...payload,
      id: `${Date.now()}`,
    };

    const next = newAddress.isDefault
      ? addresses.map((item) => ({ ...item, isDefault: false })).concat(newAddress)
      : addresses.concat(newAddress);

    setAddresses(next);
    saveAddresses(next);
    setSelectedAddressId(newAddress.id);
    setAddressForm(emptyAddressForm);
    setShowAddressForm(false);
  }

  function buildQrPayload(reference, amountValue) {
    const amount = Number(amountValue || 0).toFixed(2);
    return `PROMPTPAY|AMOUNT:${amount}|REF:${reference}|SHOP:ILOVECPU`;
  }

  function openQrModal(referenceValue, amountValue) {
    const reference = String(referenceValue || `HP-${Date.now().toString().slice(-8)}`).trim();
    const payload = buildQrPayload(reference, amountValue);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(payload)}`;
    setQrReference(reference);
    setQrAmount(Number(amountValue || 0));
    setQrImageUrl(qrUrl);
    setShowQrModal(true);
  }

  function handleSelectPayment(method) {
    setPaymentMethod(method);
    setShowQrModal(false);
  }

  function closeQrModal() {
    setShowQrModal(false);
    setQrImageUrl("");
    setQrReference("");
    setQrAmount(0);

    if (qrRedirectPath) {
      const nextPath = qrRedirectPath;
      setQrRedirectPath("");
      setCart([]);
      navigate(nextPath);
    }
  }

  async function placeOrder() {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    if (!selectedAddress) {
      alert("กรุณาเลือกที่อยู่สำหรับจัดส่ง");
      return;
    }
    if (!paymentMethod) {
      alert("กรุณาเลือกช่องทางชำระเงิน");
      return;
    }
    if (cart.length === 0) {
      alert("ยังไม่มีสินค้าในตะกร้า");
      return;
    }

    setPlacing(true);
    setCheckoutStep(3);

    try {
      const payload = {
        customerName: selectedAddress.fullName,
        phone: selectedAddress.phone,
        address: buildAddressText(selectedAddress),
        paymentMethod,
        items: cart.map((x) => ({ productId: x.productId, qty: x.qty })),
      };

      const res = await fetch(`${API_BASE}/api/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await parseJsonSafe(res);

      if (res.status === 401) {
        clearToken();
        alert("Session หมดอายุ กรุณาเข้าสู่ระบบใหม่");
        navigate("/login");
        return;
      }

      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      const createdPaymentCode = String(data?.paymentCode || "").trim();
      const redirectPath = "/orders";

      if (paymentMethod === QR_PAYMENT_METHOD) {
        setQrRedirectPath(redirectPath);
        openQrModal(createdPaymentCode || `HP-${Date.now().toString().slice(-8)}`, grandTotal);
        return;
      }

      const successMsg = createdPaymentCode
        ? `สั่งซื้อสำเร็จ\nรหัสโอนเงิน: ${createdPaymentCode}\nกรุณาใช้รหัสนี้ยืนยันการโอนในหน้าถัดไป`
        : "สั่งซื้อสำเร็จ";
      alert(successMsg);
      setCart([]);
      navigate(redirectPath);
    } catch (e) {
      setCheckoutStep(2);
      alert(`สั่งซื้อไม่สำเร็จ: ${String(e.message || e)}`);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="checkout-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
        cartCount={cartCount}
      />

      <main className="checkout-main">
        <div className="checkout-steps-frame">
          <ol className="checkout-steps">
            <li className={checkoutStep === 1 ? "is-active" : ""}><span>1</span> ตะกร้าสินค้า</li>
            <li className={checkoutStep === 2 ? "is-active" : ""}><span>2</span> รายละเอียด</li>
            <li className={checkoutStep === 3 ? "is-active" : ""}><span>3</span> ชำระเงิน</li>
          </ol>
        </div>

        <section className="checkout-layout">
          <div className="checkout-left">
            {loadingProducts && <p className="checkout-info">กำลังโหลดสินค้า...</p>}

            {!loadingProducts && lineItems.length === 0 && (
              <div className="checkout-empty">
                <p>ยังไม่มีสินค้าในตะกร้า</p>
                <button type="button" onClick={() => navigate("/")}>กลับไปเลือกสินค้า</button>
              </div>
            )}

            {checkoutStep === 1 ? (
              <div className="checkout-item-list">
                {lineItems.map((item) => (
                  <article key={item.productId} className="checkout-item-card">
                    <div className="checkout-item-image">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} />
                      ) : (
                        <div className="checkout-item-placeholder">IMG</div>
                      )}
                    </div>

                    <div className="checkout-item-content">
                      <p className="checkout-item-name">{item.name}</p>
                      <div className="checkout-item-bottom">
                        <div className="checkout-item-price">฿{formatCurrency(item.price)}</div>

                        <div className="checkout-item-qty">
                          <div className="checkout-item-qty-controls">
                            <span>จำนวน</span>
                            <button type="button" onClick={() => dec(item.productId)}>-</button>
                            <strong>{item.qty}</strong>
                            <button
                              type="button"
                              onClick={() => inc(item.productId)}
                              disabled={loadingProducts}
                            >
                              +
                            </button>
                            <button
                              type="button"
                              className="checkout-remove-btn"
                              aria-label="Remove item"
                              onClick={() => remove(item.productId)}
                            >
                              🗑
                            </button>
                          </div>
                          {stockWarningByProductId[item.productId] ? (
                            <small className="checkout-item-qty-warning">{MAX_STOCK_MESSAGE}</small>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="checkout-detail-stack">
                <section className="checkout-detail-card">
                  <header className="checkout-detail-head">01 ข้อมูลติดต่อ</header>
                  <div className="checkout-detail-body">
                    {addresses.length === 0 ? (
                      <div className="checkout-detail-empty">ยังไม่มีที่อยู่สำหรับจัดส่ง</div>
                    ) : (
                      <div className="checkout-address-list">
                        {addresses.map((item) => {
                          const isSelected = String(item.id) === String(selectedAddressId);
                          return (
                            <label
                              key={item.id}
                              className={`checkout-address-item ${isSelected ? "is-selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name="checkout-address"
                                checked={isSelected}
                                onChange={() => setSelectedAddressId(item.id)}
                              />
                              <div>
                                <div className="checkout-address-name">{item.fullName}</div>
                                <div className="checkout-address-text">{buildAddressText(item)}</div>
                                <div className="checkout-address-phone">{item.phone}</div>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    <div className="checkout-address-actions">
                      <button
                        type="button"
                        className="checkout-outline-btn"
                        onClick={() => setShowAddressForm((prev) => !prev)}
                      >
                        {showAddressForm ? "ปิดฟอร์ม" : "เพิ่มที่อยู่"}
                      </button>
                    </div>

                    {showAddressForm && (
                      <div className="checkout-address-form">
                        <input
                          value={addressForm.fullName}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, fullName: e.target.value }))}
                          placeholder="ชื่อผู้รับ"
                        />
                        <input
                          value={addressForm.phone}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, phone: e.target.value }))}
                          placeholder="เบอร์โทรศัพท์"
                        />
                        <input
                          className="full-row"
                          value={addressForm.addressLine}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                          placeholder="ที่อยู่"
                        />
                        <input
                          value={addressForm.district}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, district: e.target.value }))}
                          placeholder="เขต / อำเภอ"
                        />
                        <input
                          value={addressForm.province}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, province: e.target.value }))}
                          placeholder="จังหวัด"
                        />
                        <input
                          value={addressForm.postalCode}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                          placeholder="รหัสไปรษณีย์"
                        />
                        <input
                          className="full-row"
                          value={addressForm.note}
                          onChange={(e) => setAddressForm((prev) => ({ ...prev, note: e.target.value }))}
                          placeholder="หมายเหตุ (ถ้ามี)"
                        />

                        <label className="checkout-default-check full-row">
                          <input
                            type="checkbox"
                            checked={addressForm.setAsDefault}
                            onChange={(e) =>
                              setAddressForm((prev) => ({ ...prev, setAsDefault: e.target.checked }))
                            }
                          />
                          ตั้งเป็นที่อยู่เริ่มต้น
                        </label>

                        <div className="checkout-address-form-actions full-row">
                          <button type="button" className="checkout-confirm-btn" onClick={saveAddressFromCheckout}>
                            บันทึกที่อยู่
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>

                <section className="checkout-detail-card">
                  <header className="checkout-detail-head">02 ช่องทางชำระเงิน</header>
                  <div className="checkout-detail-body">
                    <div className="checkout-payment-list">
                      {paymentOptions.map((option) => (
                        <label
                          key={option.value}
                          className={`checkout-payment-item ${
                            paymentMethod === option.value ? "is-selected" : ""
                          }`}
                        >
                          <input
                            type="radio"
                            name="checkout-payment"
                            checked={paymentMethod === option.value}
                            onChange={() => handleSelectPayment(option.value)}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>

                  </div>
                </section>

                <button
                  type="button"
                  className="checkout-back-cart-btn"
                  onClick={() => setCheckoutStep(1)}
                >
                  กลับไปหน้ารถเข็น
                </button>
              </div>
            )}
          </div>

          <aside className="checkout-summary-card">
            <h3>สรุปรายการสั่งซื้อ</h3>
            <div className="checkout-summary-line">
              <span>ค่าสินค้า :</span>
              <b>฿{formatCurrency(subtotal)}</b>
            </div>
            <div className="checkout-summary-line">
              <span>ภาษีมูลค่าเพิ่ม ({VAT_PERCENT_LABEL}%) :</span>
              <b>฿{formatCurrency(vat)}</b>
            </div>
            <div className="checkout-summary-line">
              <span>ค่าจัดส่ง :</span>
              <b>฿{formatCurrency(shipping)}</b>
            </div>
            <div className="checkout-summary-line">
              <span>ส่วนลด :</span>
              <b>฿{formatCurrency(discount)}</b>
            </div>
            <hr />
            <div className="checkout-summary-total">
              <span>ยอดรวม</span>
              <strong>฿{formatCurrency(grandTotal)}</strong>
            </div>

            {checkoutStep > 1 && selectedAddress && (
              <div className="checkout-summary-meta">
                <p><strong>ที่อยู่จัดส่ง:</strong> {selectedAddress.fullName}</p>
                <p>{buildAddressText(selectedAddress)}</p>
                <p><strong>ชำระเงิน:</strong> {paymentMethodLabel}</p>
              </div>
            )}

            <button
              type="button"
              className="checkout-place-order-btn"
              disabled={
                placing ||
                lineItems.length === 0 ||
                (checkoutStep > 1 && (!selectedAddress || !paymentMethod))
              }
              onClick={checkoutStep === 1 ? goToDetailStep : placeOrder}
            >
              {placing
                ? "กำลังดำเนินการ..."
                : checkoutStep === 1
                  ? "ดำเนินการสั่งซื้อสินค้า"
                  : "ยืนยันคำสั่งซื้อ"}
            </button>

            <p className="checkout-free-note">ช้อปครบ 5,000 บาทขึ้นไป ส่งฟรีทั่วไทย</p>
          </aside>
        </section>
      </main>

      <HomeFooter />

      {showQrModal && (
        <div className="checkout-qr-overlay" onClick={closeQrModal}>
          <div className="checkout-qr-modal" onClick={(e) => e.stopPropagation()}>
            <h4>สแกน QR เพื่อชำระเงิน</h4>
            <p className="checkout-qr-amount">ยอดชำระ ฿{formatCurrency(qrAmount)}</p>
            {qrImageUrl ? (
              <img src={qrImageUrl} alt="QR Payment" className="checkout-qr-image" />
            ) : null}
            <p className="checkout-qr-ref">รหัสอ้างอิง: {qrReference || "-"}</p>
            <button type="button" className="checkout-confirm-btn" onClick={closeQrModal}>
              ปิด
            </button>
          </div>
        </div>
      )}

      {pendingRemoveItem && (
        <div className="checkout-qr-overlay" onClick={() => setPendingRemoveItem(null)}>
          <div className="checkout-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h4>ต้องการลบสินค้า?</h4>
            <p className="checkout-confirm-text">
              {pendingRemoveItem.name ? `ลบ "${pendingRemoveItem.name}" ออกจากตะกร้าใช่ไหม` : "ยืนยันการลบสินค้าออกจากตะกร้า"}
            </p>
            <div className="checkout-confirm-actions">
              <button
                type="button"
                className="checkout-outline-btn"
                onClick={() => setPendingRemoveItem(null)}
              >
                ไม่ใช่
              </button>
              <button
                type="button"
                className="checkout-confirm-btn"
                onClick={confirmRemoveItem}
              >
                ใช่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

