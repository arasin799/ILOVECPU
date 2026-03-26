import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import "../styles/home.css";
import "../styles/product-detail.css";
import { API_BASE } from "../config";

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return null;
  if (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:")
  ) {
    return imageUrl;
  }
  return imageUrl.startsWith("/") ? `${API_BASE}${imageUrl}` : `${API_BASE}/${imageUrl}`;
}

function normalizeProductImages(product) {
  if (!product) return [];

  let urls = [];
  const imageUrlsRaw = product.imageUrls;

  if (Array.isArray(imageUrlsRaw)) {
    urls = imageUrlsRaw;
  } else if (typeof imageUrlsRaw === "string" && imageUrlsRaw.trim()) {
    try {
      const parsed = JSON.parse(imageUrlsRaw);
      urls = Array.isArray(parsed) ? parsed : [imageUrlsRaw];
    } catch {
      urls = [imageUrlsRaw];
    }
  }

  if (product.imageUrl) {
    urls.unshift(product.imageUrl);
  }

  return Array.from(
    new Set(
      urls
        .map((url) => String(url || "").trim())
        .filter(Boolean)
    )
  ).slice(0, 4);
}

function SafeProductImage({ imageUrl, alt, placeholderClassName }) {
  const [isError, setIsError] = useState(false);
  const resolvedSrc = useMemo(() => resolveImageUrl(imageUrl), [imageUrl]);

  useEffect(() => {
    setIsError(false);
  }, [resolvedSrc]);

  if (!resolvedSrc || isError) {
    return <div className={placeholderClassName}>IMG</div>;
  }

  return <img src={resolvedSrc} alt={alt} onError={() => setIsError(true)} />;
}

function normalizeProductSpecs(specs) {
  if (!Array.isArray(specs)) return [];

  return specs
    .map((item) => {
      if (Array.isArray(item)) {
        return [String(item[0] || "").trim(), String(item[1] || "").trim()];
      }

      return [String(item?.label || "").trim(), String(item?.value || "").trim()];
    })
    .filter(([label, value]) => label && value);
}

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
};

const DEFAULT_RATING_STATS = [5, 4, 3, 2, 1].map((stars) => ({
  stars,
  count: 0,
  percent: 0,
}));

function normalizeRatingStats(stats) {
  if (!Array.isArray(stats)) return DEFAULT_RATING_STATS;

  const byStars = new Map();
  for (const item of stats) {
    const stars = Number(item?.stars || 0);
    if (stars >= 1 && stars <= 5) {
      byStars.set(stars, {
        stars,
        count: Math.max(0, Number(item?.count || 0)),
        percent: Math.max(0, Number(item?.percent || 0)),
      });
    }
  }

  return [5, 4, 3, 2, 1].map((stars) => (
    byStars.get(stars) || { stars, count: 0, percent: 0 }
  ));
}

function toStarsText(value) {
  const stars = Math.max(0, Math.min(5, Math.round(Number(value || 0))));
  return "\u2605".repeat(stars) + "\u2606".repeat(5 - stars);
}

const MAX_STOCK_MESSAGE = "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14\u0e43\u0e19\u0e2a\u0e15\u0e4a\u0e2d\u0e01";

export default function ProductDetail({ cart = [], setCart }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [product, setProduct] = useState(null);
  const [allProducts, setAllProducts] = useState([]);
  const [error, setError] = useState("");
  const [qty, setQty] = useState(1);
  const [q, setQ] = useState("");
  const [activeImage, setActiveImage] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    averageRating: 0,
    totalReviews: 0,
    ratingStats: DEFAULT_RATING_STATS,
  });

  const stockLimit = useMemo(() => {
    const stockRaw = Number(product?.stock);
    if (!Number.isFinite(stockRaw)) return null;
    return Math.max(0, Math.floor(stockRaw));
  }, [product]);

  useEffect(() => {
    async function loadData() {
      setError("");
      try {
        const [productRes, allRes, reviewsRes] = await Promise.all([
          fetch(`${API_BASE}/api/products/${id}`),
          fetch(`${API_BASE}/api/products`),
          fetch(`${API_BASE}/api/products/${id}/reviews`),
        ]);

        const productData = await productRes.json();
        const allData = await allRes.json();
        const reviewsData = await reviewsRes.json();

        if (!productRes.ok) throw new Error(productData?.message || `HTTP ${productRes.status}`);
        if (!allRes.ok) throw new Error(allData?.message || `HTTP ${allRes.status}`);
        if (!reviewsRes.ok) throw new Error(reviewsData?.message || `HTTP ${reviewsRes.status}`);

        setProduct(productData);
        setAllProducts(Array.isArray(allData) ? allData : []);
        setReviews(Array.isArray(reviewsData?.reviews) ? reviewsData.reviews : []);
        setReviewSummary({
          averageRating: Number(reviewsData?.averageRating || 0),
          totalReviews: Math.max(0, Number(reviewsData?.totalReviews || 0)),
          ratingStats: normalizeRatingStats(reviewsData?.ratingStats),
        });
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

    const customSpecs = normalizeProductSpecs(product.specs);
    if (customSpecs.length) {
      return customSpecs;
    }

    return mockSpecsByCategory[product.category] || [
      ["Brand", product.brand || "-"],
      ["Category", product.category || "-"],
      ["Price", `฿${Number(product.price || 0).toLocaleString()}`],
      ["Stock", String(product.stock ?? 0)],
    ];
  }, [product]);

  const galleryImages = useMemo(() => normalizeProductImages(product), [product]);
  const mainImage = activeImage || galleryImages[0] || product?.imageUrl || null;

  useEffect(() => {
    setActiveImage((prev) => {
      if (!galleryImages.length) return null;
      if (prev && galleryImages.includes(prev)) return prev;
      return galleryImages[0];
    });
  }, [galleryImages]);

  useEffect(() => {
    if (stockLimit === null) return;
    setQty((prev) => Math.min(prev, Math.max(1, stockLimit)));
  }, [stockLimit]);

  function addToCart() {
    if (!product || !setCart) return;

    let reachedMax = false;

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === product.id);
      const currentQty = idx >= 0 ? prev[idx].qty : 0;
      const requestedQty = currentQty + qty;
      const nextQty =
        stockLimit === null ? requestedQty : Math.min(stockLimit, requestedQty);

      if (stockLimit !== null && requestedQty > stockLimit) {
        reachedMax = true;
      }

      if (nextQty <= currentQty) {
        reachedMax = true;
        return prev;
      }

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: nextQty,
          price: product.price,
          name: product.name,
        };
        return next;
      }

      return [
        ...prev,
        {
          productId: product.id,
          qty: nextQty,
          price: product.price,
          name: product.name,
        },
      ];
    });

    if (reachedMax) {
      alert(MAX_STOCK_MESSAGE);
    }
  }

  function buyNow() {
    addToCart();
    navigate("/checkout");
  }

  function goBack() {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/");
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
        onSearch={() => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
        cartCount={cartCount}
      />

      <div className="detail-back-row">
        <button type="button" className="detail-back-btn" onClick={goBack}>
          ← กลับ
        </button>
      </div>

      <section className="detail-top-card">
        <div className="detail-gallery">
          <div className="detail-main-image">
            <SafeProductImage
              imageUrl={mainImage}
              alt={product.name}
              placeholderClassName="detail-image-placeholder"
            />
          </div>

          <div className="detail-thumbs">
            {galleryImages.length ? (
              galleryImages.map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  className={`detail-thumb ${imageUrl === mainImage ? "is-active" : ""}`}
                  onClick={() => setActiveImage(imageUrl)}
                >
                  <SafeProductImage
                    imageUrl={imageUrl}
                    alt={`${product.name}-${index + 1}`}
                    placeholderClassName="detail-thumb-placeholder"
                  />
                </button>
              ))
            ) : (
              <div className="detail-thumb">
                <SafeProductImage
                  imageUrl={null}
                  alt={`${product.name}-thumb`}
                  placeholderClassName="detail-thumb-placeholder"
                />
              </div>
            )}
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
              aria-label="Decrease quantity"
              onClick={() => setQty((v) => Math.max(1, v - 1))}
            >
              <span className="qty-icon qty-icon-minus" aria-hidden="true" />
            </button>
            <div className="qty-value">{qty}</div>
            <button
              type="button"
              className="qty-btn"
              aria-label="Increase quantity"
              onClick={() => {
                const maxQty = stockLimit === null ? 99 : Math.max(1, stockLimit);
                setQty((v) => {
                  if (v >= maxQty) {
                    alert(MAX_STOCK_MESSAGE);
                    return v;
                  }
                  return v + 1;
                });
              }}
              disabled={stockLimit !== null && qty >= Math.max(1, stockLimit)}
            >
              <span className="qty-icon qty-icon-plus" aria-hidden="true" />
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
        <h2>คุณสมบัติ</h2>

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
        <div className="section-shell">
          <div className="review-header">
            <h2>รีวิว</h2>
            <button type="button">ดูทั้งหมด &gt;</button>
          </div>

          <div className="review-layout">
            <div className="review-summary-card">
              <div className="review-score">{reviewSummary.averageRating.toFixed(1)}</div>
              <div className="review-stars">{toStarsText(reviewSummary.averageRating)}</div>
              <div className="review-count">({reviewSummary.totalReviews})</div>

              {reviewSummary.ratingStats.map((item) => (
                <div className="rating-row" key={item.stars}>
                  <span>{item.stars}★</span>
                  <div className="rating-bar">
                    <div
                      className="rating-fill"
                      style={{ width: `${item.percent}%` }}
                    />
                  </div>
                  <span>{item.percent}%</span>
                </div>
              ))}
            </div>

            <div className="review-list">
              {reviews.length === 0 ? (
                <div className="review-item">
                  <div className="review-avatar">👤</div>
                  <div className="review-content">
                    <div className="review-name">ยังไม่มีรีวิว</div>
                    <div className="review-text">เป็นคนแรกที่รีวิวสินค้านี้</div>
                  </div>
                  <div className="review-item-stars" />
                </div>
              ) : (
                reviews.map((review) => (
                  <div key={review.id} className="review-item">
                    <div className="review-avatar">👤</div>
                    <div className="review-content">
                      <div className="review-name">{review.name}</div>
                      <div className="review-text">{review.text}</div>
                    </div>
                    <div className="review-item-stars">{toStarsText(review.stars)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="related-section">
        <div className="section-shell">
          <div className="review-header">
            <h2>จากหมวดหมู่เดียวกัน</h2>
            <button type="button">ดูทั้งหมด &gt;</button>
          </div>

          <div className="related-grid">
            {relatedProducts.length === 0 ? (
              <div className="related-empty">ยังไม่มีสินค้าใกล้เคียง</div>
            ) : (
              relatedProducts.map((item) => (
                <Link to={`/products/${item.id}`} key={item.id} className="related-card">
                  <div className="related-image">
                    <SafeProductImage
                      imageUrl={item.imageUrl}
                      alt={item.name}
                      placeholderClassName="detail-thumb-placeholder"
                    />
                  </div>

                  <div className="related-name">{item.name}</div>
                  <div className="related-price">฿{Number(item.price).toLocaleString()}.00</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <HomeFooter />
    </div>
  );
}

