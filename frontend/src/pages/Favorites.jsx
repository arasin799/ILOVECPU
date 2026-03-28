import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { requestDeleteAccount } from "../accountDeletion";
import { API_BASE } from "../config";
import ProductCard from "../components/home/ProductCard";
import "../styles/home.css";
import "../styles/profile.css";

// Favorites page for logged-in users.
export default function Favorites({ cart = [], setCart }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [ready, setReady] = useState(false);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  useEffect(() => {
    async function loadFavorites() {
      if (!getToken()) {
        navigate("/login");
        return;
      }
      setReady(true);
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/favorites`, {
          headers: { Authorization: `Bearer ${getToken()}` },
        });
        const data = await res.json();
        setFavorites(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load favorites", e);
      } finally {
        setLoading(false);
      }
    }
    loadFavorites();
  }, [navigate]);

  if (!ready) return null;

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  async function handleDeleteAccount() {
    await requestDeleteAccount({ navigate });
  }

  function addToCart(p) {
    if (!setCart) return;
    const stockLimit = Number.isFinite(Number(p.stock)) ? Math.max(0, Math.floor(Number(p.stock))) : null;

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      const currentQty = idx >= 0 ? prev[idx].qty : 0;
      if (stockLimit !== null && currentQty >= stockLimit) return prev;
      const nextQty = stockLimit === null ? currentQty + 1 : Math.min(stockLimit, currentQty + 1);

      if (idx >= 0) {
        const clone = [...prev];
        clone[idx] = { ...clone[idx], qty: nextQty };
        return clone;
      }
      return [...prev, { productId: p.id, productDetails: p, qty: 1 }];
    });
  }

  return (
    <div className="profile-page">
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
              <Link to="/orders">คำสั่งซื้อ</Link>
              <Link to="/favorites" className="is-active">สินค้าที่ถูกใจ</Link>

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
                <span className="profile-title-icon">❤</span>
                <h2>สินค้าที่ถูกใจ</h2>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: 40, textAlign: 'center' }}>กำลังโหลด...</div>
            ) : favorites.length === 0 ? (
              <div className="address-empty-card">
                ยังไม่มีสินค้าที่ถูกใจ
              </div>
            ) : (
              <div className="product-grid-three" style={{ marginTop: 20 }}>
                {favorites.map((prod) => (
                  <ProductCard
                    key={prod.id}
                    product={prod}
                    onAdd={() => addToCart(prod)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
