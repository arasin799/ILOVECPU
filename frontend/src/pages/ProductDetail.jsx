import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import "../styles/home.css";
import "../styles/product-detail.css";
import { API_BASE } from "../config";

const mockSpecsByCategory = {
  NOTEBOOK: [
    ["Brand", "ACER"],
    ["Model", "NITRO V"],
    ["Processor", "Intel Core i5 / Ryzen 5"],
    ["Graphics", "NVIDIA GeForce RTX Series"],
    ["Display", '15.6" FHD IPS'],
    ["Memory", "16GB DDR4 / DDR5"],
    ["Storage", "512GB NVMe SSD"],
    ["Warranty", "2 - 3 Years"],
  ],
  CPU: [
    ["Brand", "AMD / INTEL"],
    ["Socket", "AM4 / LGA1700"],
    ["Core / Thread", "6C / 12T+"],
    ["Base Clock", "3.5 GHz+"],
    ["Boost Clock", "4.4 GHz+"],
    ["Cache", "16MB+"],
    ["TDP", "65W+"],
    ["Warranty", "3 Years"],
  ],
  MAINBOARD: [
    ["Brand", "MSI / ASUS / GIGABYTE"],
    ["Socket", "AM4 / AM5 / LGA1700"],
    ["Chipset", "A520 / B550 / B760"],
    ["Memory Support", "DDR4 / DDR5"],
    ["Form Factor", "mATX / ATX"],
    ["Storage Slots", "M.2 NVMe / SATA"],
    ["LAN", "Gigabit LAN"],
    ["Warranty", "3 Years"],
  ],
  GPU: [
    ["Brand", "MSI / ASUS / GIGABYTE"],
    ["GPU Chip", "RTX / Radeon"],
    ["Memory", "8GB / 12GB GDDR6"],
    ["Interface", "PCIe 4.0"],
    ["Output", "HDMI / DisplayPort"],
    ["Recommended PSU", "550W+"],
    ["Cooling", "Dual / Triple Fan"],
    ["Warranty", "3 Years"],
  ],
  RAM: [
    ["Brand", "KINGSTON / CORSAIR"],
    ["Capacity", "16GB / 32GB"],
    ["Type", "DDR4 / DDR5"],
    ["Speed", "3200 / 5200 / 5600 MT/s"],
    ["Kit", "Single / Dual Channel"],
    ["Voltage", "1.2V / 1.35V"],
    ["Heatspreader", "Yes"],
    ["Warranty", "Lifetime"],
  ],
  STORAGE: [
    ["Brand", "WD / SAMSUNG / CRUCIAL"],
    ["Type", "NVMe / SATA SSD"],
    ["Capacity", "1TB"],
    ["Interface", "PCIe 4.0 / SATA"],
    ["Read Speed", "Up to 5000 MB/s"],
    ["Write Speed", "Up to 4200 MB/s"],
    ["Form Factor", "M.2 2280 / 2.5 inch"],
    ["Warranty", "3 - 5 Years"],
  ],
  ACCESSORY: [
    ["Brand", "LOGITECH / UGREEN / TP-LINK"],
    ["Category", "Accessory"],
    ["Connection", "USB / HDMI / PCIe"],
    ["Compatibility", "Windows / Mac"],
    ["Material", "Standard"],
    ["Color", "Black / Gray"],
    ["Package", "1 Unit"],
    ["Warranty", "1 Year"],
  ],
};

const mockReviews = [
  { id: 1, name: "User 1", text: "สินค้าใช้งานดีมาก", stars: 5 },
  { id: 2, name: "User 2", text: "ส่งไว คุณภาพดี", stars: 5 },
  { id: 3, name: "User 3", text: "ราคาดี คุ้มค่ามาก", stars: 5 },
];

export default function ProductDetail({ cart, setCart }) {
  const { id } = useParams();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const [productRes, allRes] = await Promise.all([
          fetch(`${API_BASE}/api/products/${id}`),
          fetch(`${API_BASE}/api/products`),
        ]);

        const productData = await productRes.json();
        const allData = await allRes.json();

        if (!productRes.ok) throw new Error(productData?.message || `HTTP ${productRes.status}`);
        if (!allRes.ok) throw new Error(allData?.message || `HTTP ${allRes.status}`);

        setProduct(productData);
        setAllProducts(Array.isArray(allData) ? allData : []);
      } catch (e) {
        setError(String(e.message || e));
      }
    }

    loadData();
  }, [id]);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  const relatedProducts = useMemo(() => {
    if (!product) return [];
    return allProducts
      .filter((p) => p.id !== product.id && p.category === product.category)
      .slice(0, 4);
  }, [allProducts, product]);

  const specs = useMemo(() => {
    if (!product) return [];
    return mockSpecsByCategory[product.category] || [
      ["Brand", product.brand || "-"],
      ["Category", product.category || "-"],
      ["Price", `฿${Number(product.price || 0).toLocaleString()}`],
      ["Stock", String(product.stock ?? 0)],
    ];
  }, [product]);

  function addToCart() {
    if (!product) return;

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === product.id);

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: next[idx].qty + qty,
          price: product.price,
          name: product.name,
        };
        return next;
      }

      return [
        ...prev,
        {
          productId: product.id,
          qty,
          price: product.price,
          name: product.name,
        },
      ];
    });
  }

  function buyNow() {
    addToCart();
    window.location.href = "/checkout";
  }

  if (error) {
    return <p style={{ color: "crimson" }}>Error: {error}</p>;
  }

  if (!product) {
    return <p>Loading...</p>;
  }

  return (
    <div className="product-detail-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => (window.location.href = `/?q=${encodeURIComponent(q)}`)}
        cartCount={cartCount}
      />

      <section className="detail-top-card">
        <div className="detail-gallery">
          <div className="detail-main-image">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.name} />
            ) : (
              <div className="detail-image-placeholder">IMG</div>
            )}
          </div>

          <div className="detail-thumbs">
            {[1, 2, 3].map((n) => (
              <div key={n} className="detail-thumb">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={`${product.name}-${n}`} />
                ) : (
                  <div className="detail-thumb-placeholder">IMG</div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="detail-summary">
          <p className="detail-breadcrumb">
            <Link to="/">หน้าแรก</Link> / <span>{product.category}</span>
          </p>

          <h1 className="detail-title">{product.name}</h1>
          <p className="detail-meta">
            แบรนด์: <b>{product.brand}</b> | รหัสสินค้า: SKU-{product.id}
          </p>

          <div className="detail-divider" />

          <div className="detail-price">฿{Number(product.price).toLocaleString()}.00</div>

          <div className="detail-stock">คงเหลือ: {product.stock}</div>

          <div className="detail-qty-row">
            <span>จำนวน</span>
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty((v) => Math.max(1, v - 1))}
            >
              -
            </button>
            <div className="qty-value">{qty}</div>
            <button
              type="button"
              className="qty-btn"
              onClick={() => setQty((v) => Math.min(product.stock || 99, v + 1))}
            >
              +
            </button>
          </div>

          <div className="detail-action-row">
            <button type="button" className="outline-cart-btn" onClick={addToCart}>
              เพิ่มลงตะกร้า
            </button>
            <button type="button" className="buy-now-btn" onClick={buyNow}>
              ซื้อเลย
            </button>
          </div>
        </div>
      </section>

      <section className="specs-section">
        <h2>คุณสมบัติสินค้า</h2>

        <div className="specs-card">
          {specs.map(([label, value]) => (
            <div key={label} className="spec-row">
              <div className="spec-label">{label}</div>
              <div className="spec-value">{value}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="reviews-section">
        <div className="review-header">
          <h2>รีวิวจากลูกค้า</h2>
          <button type="button">ทั้งหมด &gt;</button>
        </div>

        <div className="review-layout">
          <div className="review-summary-card">
            <div className="review-score">5.0</div>
            <div className="review-stars">★★★★★</div>
            <div className="review-count">(56)</div>

            {[5, 4, 3, 2, 1].map((n) => (
              <div className="rating-row" key={n}>
                <span>{n}★</span>
                <div className="rating-bar">
                  <div
                    className="rating-fill"
                    style={{ width: n === 5 ? "100%" : "0%" }}
                  />
                </div>
                <span>{n === 5 ? "100%" : "0%"}</span>
              </div>
            ))}
          </div>

          <div className="review-list">
            {mockReviews.map((review) => (
              <div key={review.id} className="review-item">
                <div className="review-avatar">👤</div>
                <div className="review-content">
                  <div className="review-name">{review.name}</div>
                  <div className="review-text">{review.text}</div>
                </div>
                <div className="review-item-stars">
                  {"★".repeat(review.stars)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="related-section">
        <div className="review-header">
          <h2>จากหมวดหมู่เดียวกัน</h2>
          <button type="button">ดูทั้งหมด &gt;</button>
        </div>

        <div className="related-grid">
          {relatedProducts.map((item) => (
            <Link to={`/products/${item.id}`} key={item.id} className="related-card">
              <div className="related-image">
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name} />
                ) : (
                  <div className="detail-thumb-placeholder">IMG</div>
                )}
              </div>

              <div className="related-name">{item.name}</div>
              <div className="related-price">
                ฿{Number(item.price).toLocaleString()}.00
              </div>
            </Link>
          ))}
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}