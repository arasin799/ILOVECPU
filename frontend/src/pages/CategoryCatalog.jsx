import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { API_BASE } from "../config";
import { getCategoryByKey } from "../catalogCategories";
import "../styles/home.css";
import "../styles/category-catalog.css";

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

function clampNumber(value, min, max) {
  const num = Number(value);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

const CATEGORY_CANONICAL_MAP = {
  LAPTOP: "NOTEBOOK",
  PROCESSOR: "CPU",
  VGA: "GPU",
  GRAPHICS_CARD: "GPU",
  MOTHERBOARD: "MAINBOARD",
  MB: "MAINBOARD",
  SSD: "STORAGE",
  HDD: "STORAGE",
  POWER_SUPPLY: "PSU",
  ACCESSORIES: "ACCESSORY",
  ACC: "ACCESSORY",
  MON: "MONITOR",
  DISPLAY: "MONITOR",
  COOLING: "COOLER",
  COOL: "COOLER",
};

const POPULAR_BRANDS_BY_CATEGORY_KEY = {
  NOTEBOOK: ["ACER", "ASUS", "LENOVO", "HP", "MSI", "DELL"],
  CPU: ["AMD", "INTEL"],
  GPU: ["ASUS", "MSI", "GIGABYTE", "ZOTAC", "GALAX", "SAPPHIRE"],
  MAINBOARD: ["ASUS", "MSI", "GIGABYTE", "ASROCK"],
  STORAGE: ["SAMSUNG", "WD", "CRUCIAL", "KINGSTON", "SEAGATE"],
  PSU: ["CORSAIR", "SEASONIC", "COOLER MASTER", "THERMALTAKE"],
  CASE: ["NZXT", "LIAN LI", "CORSAIR", "THERMALTAKE"],
  COOLER: ["DEEPCOOL", "NOCTUA", "COOLER MASTER", "THERMALRIGHT"],
  MONITOR: ["AOC", "ASUS", "LG", "SAMSUNG", "MSI", "DELL"],
  KEYBOARD: ["LOGITECH", "RAZER", "KEYCHRON", "CORSAIR"],
  MOUSE: ["LOGITECH", "RAZER", "STEELSERIES", "GLORIOUS"],
};

function normalizeCategoryValue(value) {
  const normalized = String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  return CATEGORY_CANONICAL_MAP[normalized] || normalized;
}

function normalizeBrandValue(value) {
  return String(value || "").trim().toUpperCase();
}

export default function CategoryCatalog({ cart = [] }) {
  const navigate = useNavigate();
  const { categoryKey } = useParams();
  const category = useMemo(() => getCategoryByKey(categoryKey), [categoryKey]);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("price_asc");
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [minInput, setMinInput] = useState("0");
  const [maxInput, setMaxInput] = useState("0");

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        const data = await res.json();
        if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
        setProducts(Array.isArray(data) ? data : []);
      } catch (e) {
        setError(String(e.message || e));
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const categoryProducts = useMemo(() => {
    const sourceSet = new Set(category.sourceCategories.map(normalizeCategoryValue));
    return products.filter((item) => sourceSet.has(normalizeCategoryValue(item.category)));
  }, [products, category]);

  const brandOptions = useMemo(() => {
    const brandLabelByValue = new Map();
    for (const item of categoryProducts) {
      const label = String(item.brand || "").trim();
      const value = normalizeBrandValue(label);
      if (!value || brandLabelByValue.has(value)) continue;
      brandLabelByValue.set(value, label);
    }

    const popularValues = (POPULAR_BRANDS_BY_CATEGORY_KEY[category.key] || []).map(
      normalizeBrandValue
    );
    const productValues = Array.from(brandLabelByValue.keys()).sort((a, b) =>
      a.localeCompare(b)
    );
    const allValues = Array.from(new Set([...popularValues, ...productValues])).filter(Boolean);

    return allValues.map((value) => ({
      value,
      label: brandLabelByValue.get(value) || value,
    }));
  }, [categoryProducts, category.key]);

  const priceBounds = useMemo(() => {
    if (!categoryProducts.length) return { min: 0, max: 0 };
    const prices = categoryProducts.map((item) => Number(item.price || 0));
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
    };
  }, [categoryProducts]);

  useEffect(() => {
    setSelectedBrands([]);
    setMinPrice(priceBounds.min);
    setMaxPrice(priceBounds.max);
    setMinInput(String(priceBounds.min));
    setMaxInput(String(priceBounds.max));
    setSortBy("price_asc");
  }, [category.key, priceBounds.min, priceBounds.max]);

  const filteredProducts = useMemo(() => {
    const activeBrands = new Set(selectedBrands.map(normalizeBrandValue));

    const filtered = categoryProducts.filter((item) => {
      const price = Number(item.price || 0);
      const brand = normalizeBrandValue(item.brand);
      const passPrice = price >= minPrice && price <= maxPrice;
      const passBrand = activeBrands.size === 0 || activeBrands.has(brand);
      return passPrice && passBrand;
    });

    const sorted = [...filtered];
    if (sortBy === "price_asc") sorted.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    if (sortBy === "price_desc") sorted.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    if (sortBy === "newest") sorted.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
    return sorted;
  }, [categoryProducts, minPrice, maxPrice, selectedBrands, sortBy]);

  function toggleBrand(brand) {
    setSelectedBrands((prev) => {
      if (prev.includes(brand)) return prev.filter((x) => x !== brand);
      return [...prev, brand];
    });
  }

  function onMinRangeChange(value) {
    const next = clampNumber(value, priceBounds.min, priceBounds.max);
    const synced = Math.min(next, maxPrice);
    setMinPrice(synced);
    setMinInput(String(synced));
  }

  function onMaxRangeChange(value) {
    const next = clampNumber(value, priceBounds.min, priceBounds.max);
    const synced = Math.max(next, minPrice);
    setMaxPrice(synced);
    setMaxInput(String(synced));
  }

  function onMinInputChange(value) {
    setMinInput(value);
    if (value.trim() === "") return;
    const next = clampNumber(value, priceBounds.min, priceBounds.max);
    setMinPrice(Math.min(next, maxPrice));
  }

  function onMaxInputChange(value) {
    setMaxInput(value);
    if (value.trim() === "") return;
    const next = clampNumber(value, priceBounds.min, priceBounds.max);
    setMaxPrice(Math.max(next, minPrice));
  }

  function commitMinInput() {
    const next = clampNumber(minInput, priceBounds.min, priceBounds.max);
    const synced = Math.min(next, maxPrice);
    setMinPrice(synced);
    setMinInput(String(synced));
  }

  function commitMaxInput() {
    const next = clampNumber(maxInput, priceBounds.min, priceBounds.max);
    const synced = Math.max(next, minPrice);
    setMaxPrice(synced);
    setMaxInput(String(synced));
  }

  function onPriceInputKeyDown(e, commitFn) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitFn();
    }
  }

  const rangeSpan = Math.max(1, priceBounds.max - priceBounds.min);
  const minPercent = ((minPrice - priceBounds.min) / rangeSpan) * 100;
  const maxPercent = ((maxPrice - priceBounds.min) / rangeSpan) * 100;

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + Number(item.qty || 0), 0),
    [cart]
  );

  return (
    <div className="catalog-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => navigate(q ? `/?q=${encodeURIComponent(q)}` : "/")}
        cartCount={cartCount}
      />

      <main className="catalog-content">
        <section className="catalog-intro">
          <h1>รวม{category.label} ราคาดีที่สุด ครบทุกรุ่น ตอบโจทย์ทุกการใช้งาน</h1>
          <p>{category.description}</p>
        </section>

        {loading ? <p className="catalog-info">Loading...</p> : null}
        {error ? <p className="catalog-info catalog-error">Error: {error}</p> : null}

        {!loading && !error ? (
          <>
            <section className="catalog-toolbar-card">
              <div>
                <h2>{category.label}</h2>
                <p>จำนวน {filteredProducts.length} รายการ</p>
              </div>

              <div className="catalog-sort-wrap">
                <span>เรียงตาม</span>
                <select
                  className="catalog-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="price_asc">ราคาต่ำ - สูง</option>
                  <option value="price_desc">ราคาสูง - ต่ำ</option>
                  <option value="newest">ล่าสุด</option>
                </select>
              </div>
            </section>

            <section className="catalog-layout">
              <aside className="catalog-filter-card">
                <h3>เลือกการแสดงสินค้า</h3>

                <div className="catalog-filter-group">
                  <strong>ช่วงราคา</strong>
                  <div className="catalog-price-inputs">
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={minInput}
                      disabled={categoryProducts.length === 0}
                      onChange={(e) => onMinInputChange(e.target.value)}
                      onBlur={commitMinInput}
                      onKeyDown={(e) => onPriceInputKeyDown(e, commitMinInput)}
                    />
                    <span>-</span>
                    <input
                      type="number"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={maxInput}
                      disabled={categoryProducts.length === 0}
                      onChange={(e) => onMaxInputChange(e.target.value)}
                      onBlur={commitMaxInput}
                      onKeyDown={(e) => onPriceInputKeyDown(e, commitMaxInput)}
                    />
                  </div>

                  <div className="catalog-range-wrap">
                    <div
                      className="catalog-range-active"
                      style={{ left: `${minPercent}%`, width: `${Math.max(0, maxPercent - minPercent)}%` }}
                    />
                    <input
                      type="range"
                      className="catalog-range-input"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={minPrice}
                      disabled={categoryProducts.length === 0}
                      onChange={(e) => onMinRangeChange(e.target.value)}
                    />
                    <input
                      type="range"
                      className="catalog-range-input"
                      min={priceBounds.min}
                      max={priceBounds.max}
                      value={maxPrice}
                      disabled={categoryProducts.length === 0}
                      onChange={(e) => onMaxRangeChange(e.target.value)}
                    />
                  </div>
                </div>

                <div className="catalog-filter-group">
                  <strong>Brand</strong>
                  <div className="catalog-brand-list">
                    {brandOptions.length ? (
                      brandOptions.map((brand) => (
                        <label key={brand.value} className="catalog-brand-item">
                          <input
                            type="checkbox"
                            checked={selectedBrands.includes(brand.value)}
                            onChange={() => toggleBrand(brand.value)}
                          />
                          <span>{brand.label}</span>
                        </label>
                      ))
                    ) : (
                      <p className="catalog-muted">ไม่มีแบรนด์ในหมวดนี้</p>
                    )}
                  </div>
                </div>
              </aside>

              <div className="catalog-product-list">
                {filteredProducts.length === 0 ? (
                  <div className="catalog-empty">ไม่มีสินค้าในหมวดนี้</div>
                ) : (
                  filteredProducts.map((item) => (
                    <article key={item.id} className="catalog-product-card">
                      <span className="catalog-fav-icon" aria-hidden="true">♡</span>

                      <Link to={`/products/${item.id}`} className="catalog-product-link">
                        <div className="catalog-product-image">
                          {resolveImageUrl(item.imageUrl) ? (
                            <img src={resolveImageUrl(item.imageUrl)} alt={item.name} />
                          ) : (
                            <div className="catalog-image-placeholder">IMG</div>
                          )}
                        </div>

                        <div className="catalog-product-main">
                          <h4>{item.name}</h4>
                          <p>{item.brand}</p>
                        </div>

                        <div className="catalog-product-price">฿{Number(item.price || 0).toLocaleString()}.00</div>
                      </Link>
                    </article>
                  ))
                )}
              </div>
            </section>
          </>
        ) : null}
      </main>

      <HomeFooter />
    </div>
  );
}
