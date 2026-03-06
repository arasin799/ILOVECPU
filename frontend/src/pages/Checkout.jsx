import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getToken, clearToken } from "../authStore";
import { API_BASE } from "../config";

export default function Checkout({ cart, setCart }) {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [placing, setPlacing] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ✅ require login
  useEffect(() => {
    const token = getToken();
    if (!token) {
      navigate("/login");
    }
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

  const cartTotal = useMemo(() => {
    let total = 0;
    for (const it of cart) {
      const p = productById.get(it.productId);
      const price = p?.price ?? it.price ?? 0;
      total += price * it.qty;
    }
    return total;
  }, [cart, productById]);

  function inc(id) {
    setCart((prev) => prev.map((x) => (x.productId === id ? { ...x, qty: x.qty + 1 } : x)));
  }

  function dec(id) {
    setCart((prev) =>
      prev
        .map((x) => (x.productId === id ? { ...x, qty: x.qty - 1 } : x))
        .filter((x) => x.qty > 0)
    );
  }

  function remove(id) {
    setCart((prev) => prev.filter((x) => x.productId !== id));
  }

  async function placeOrder() {
    const token = getToken();
    if (!token) {
      navigate("/login");
      return;
    }

    if (!customerName || !phone || !address) return alert("Please fill name/phone/address");
    if (cart.length === 0) return alert("Cart is empty");

    setPlacing(true);
    try {
      const payload = {
        customerName,
        phone,
        address,
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

      const data = await res.json();

      // ✅ ถ้า token ไม่ผ่าน ให้ logout แล้วไป login
      if (res.status === 401) {
        clearToken();
        alert("Session expired. Please login again.");
        navigate("/login");
        return;
      }

      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      alert("Order created! You can view it in Your Orders.");
      setCart([]);
      navigate("/orders");
    } catch (e) {
      alert(`Place order failed: ${String(e.message || e)}`);
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div style={{ maxWidth: 800 }}>
      <h2>Checkout</h2>

      {loadingProducts && <p>Loading products...</p>}

      {cart.length === 0 ? (
        <p>Cart is empty.</p>
      ) : (
        <>
          <h3>Cart Items</h3>

          {cart.map((it) => {
            const p = productById.get(it.productId);
            const name = p?.name ?? it.name ?? `#${it.productId}`;
            const price = p?.price ?? it.price ?? 0;

            return (
              <div
                key={it.productId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 0",
                  borderBottom: "1px solid #eee",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{name}</div>
                  <div style={{ opacity: 0.8 }}>฿ {Number(price).toLocaleString()}</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button onClick={() => dec(it.productId)}>-</button>
                  <div style={{ minWidth: 24, textAlign: "center" }}>{it.qty}</div>
                  <button onClick={() => inc(it.productId)}>+</button>
                  <button onClick={() => remove(it.productId)}>Remove</button>
                </div>
              </div>
            );
          })}

          <div style={{ marginTop: 12, fontSize: 18 }}>
            Total: <b>฿ {cartTotal.toLocaleString()}</b>
          </div>

          <h3 style={{ marginTop: 18 }}>Customer Info</h3>
          <div style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name"
              style={{ padding: 10 }}
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Phone"
              style={{ padding: 10 }}
            />
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Address"
              rows={4}
              style={{ padding: 10 }}
            />
            <button disabled={placing} onClick={placeOrder} style={{ padding: 10 }}>
              {placing ? "Placing..." : "Place Order"}
            </button>

            <p style={{ opacity: 0.8, margin: 0 }}>
              หลัง Place Order ไปดูได้ในหน้า <b>Your Orders</b>
            </p>
          </div>
        </>
      )}
    </div>
  );
}
