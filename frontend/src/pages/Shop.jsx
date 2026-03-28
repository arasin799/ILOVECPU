import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import BannerSection from "../components/home/BannerSection";
import ProductSection from "../components/home/ProductSection";
import HorizontalProductSection from "../components/home/HorizontalProductSection";
import HomeFooter from "../components/home/HomeFooter";
import { API_BASE } from "../config";
import "../styles/home.css";

// Brand list used by the notebook section/sidebar on the shop page.
const notebookBrands = [
  { key: "ACER", label: "ACER", mark: "acer", className: "brand-acer", sourceBrands: ["ACER"] },
  { key: "ASUS", label: "ASUS", mark: "ASUS", className: "brand-asus", sourceBrands: ["ASUS"] },
  { key: "GIGABYTE", label: "GIGABYTE", mark: "GIGABYTE", className: "brand-gigabyte", sourceBrands: ["GIGABYTE"] },
  { key: "LENOVO", label: "LENOVO", mark: "Lenovo", className: "brand-lenovo", sourceBrands: ["LENOVO"] },
  { key: "MSI", label: "MSI", mark: "msi", className: "brand-msi", sourceBrands: ["MSI"] },
  { key: "HP", label: "HP", mark: "hp", className: "brand-hp", sourceBrands: ["HP"] },
];

// General hardware categories shown on the shop page.
const hardwareCategories = [
  { key: "CPU", mark: "CPU", label: "ซีพียู", sourceCategories: ["CPU"] },
  { key: "MB", mark: "MB", label: "เมนบอร์ด", sourceCategories: ["MB", "MAINBOARD", "MOTHERBOARD"] },
  { key: "GPU", mark: "GPU", label: "การ์ดจอ", sourceCategories: ["GPU", "VGA"] },
  { key: "RAM", mark: "RAM", label: "แรม", sourceCategories: ["RAM", "MEMORY"] },
  { key: "PSU", mark: "PSU", label: "พาวเวอร์ซัพพลาย", sourceCategories: ["PSU", "POWER_SUPPLY", "POWER SUPPLY"] },
  { key: "KB", mark: "KB", label: "คีย์บอร์ด", sourceCategories: ["KB", "KEYBOARD"] },
  { key: "MON", mark: "MON", label: "จอมอนิเตอร์", sourceCategories: ["MON", "MONITOR"] },
  { key: "ACC", mark: "ACC", label: "อุปกรณ์เสริม", sourceCategories: ["ACC", "ACCESSORY", "ACCESSORIES"] },
  { key: "COOL", mark: "COOL", label: "ชุดระบายความร้อน", sourceCategories: ["COOL", "COOLING", "COOLER"] },
];

const MAX_STOCK_MESSAGE = "\u0e08\u0e33\u0e19\u0e27\u0e19\u0e2a\u0e39\u0e07\u0e2a\u0e38\u0e14\u0e43\u0e19\u0e2a\u0e15\u0e4a\u0e2d\u0e01";

// Main storefront home/shop page that assembles banners, sidebars, and product sections.
export default function Shop({ cart, setCart }) {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeNotebookBrand, setActiveNotebookBrand] = useState("ACER");
  const [activeHardwareCategory, setActiveHardwareCategory] = useState("CPU");

  async function loadProducts(query = "") {
    setLoading(true);
    setError("");

    try {
      const url = query
        ? `${API_BASE}/api/products?q=${encodeURIComponent(query)}`
        : `${API_BASE}/api/products`;

      const res = await fetch(url);
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (location.hash !== "#about-us") return;

    const scrollToFooter = () => {
      document.getElementById("about-us")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    };

    const frameId = window.requestAnimationFrame(scrollToFooter);
    return () => window.cancelAnimationFrame(frameId);
  }, [location.hash]);

  function addToCart(p) {
    const stockRaw = Number(p?.stock);
    const stockLimit = Number.isFinite(stockRaw) ? Math.max(0, Math.floor(stockRaw)) : null;
    let reachedMax = false;

    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      const currentQty = idx >= 0 ? prev[idx].qty : 0;

      if (stockLimit !== null && currentQty >= stockLimit) {
        reachedMax = true;
        return prev;
      }

      const nextQty = stockLimit === null ? currentQty + 1 : Math.min(stockLimit, currentQty + 1);
      if (nextQty <= currentQty) {
        reachedMax = true;
        return prev;
      }

      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: nextQty,
          price: p.price,
          name: p.name,
        };
        return next;
      }

      return [...prev, { productId: p.id, qty: nextQty, price: p.price, name: p.name }];
    });

    if (reachedMax) {
      alert(MAX_STOCK_MESSAGE);
    }
  }

  const activeNotebookBrandConfig = useMemo(() => {
    return (
      notebookBrands.find((item) => item.key === activeNotebookBrand) ||
      notebookBrands[0]
    );
  }, [activeNotebookBrand]);

  const notebookProducts = useMemo(() => {
    const allowedBrands = new Set(activeNotebookBrandConfig.sourceBrands);
    return products
      .filter((p) => (p.category || "").toUpperCase() === "NOTEBOOK")
      .filter((p) => allowedBrands.has((p.brand || "").toUpperCase()))
      .slice(0, 6);
  }, [products, activeNotebookBrandConfig]);

  const accessoryProducts = useMemo(() => {
    return products
      .filter((p) => ["ACCESSORY", "ACCESSORIES", "ACC"].includes((p.category || "").toUpperCase()))
      .slice(0, 4);
  }, [products]);

  const activeHardwareConfig = useMemo(() => {
    return (
      hardwareCategories.find((item) => item.key === activeHardwareCategory) ||
      hardwareCategories[0]
    );
  }, [activeHardwareCategory]);

  const hardwareProducts = useMemo(() => {
    const allowedCategories = new Set(activeHardwareConfig.sourceCategories);
    return products
      .filter((p) => allowedCategories.has((p.category || "").toUpperCase()))
      .slice(0, 6);
  }, [products, activeHardwareConfig]);

  const latestProducts = products.slice(0, 4);
  const showAccessory = accessoryProducts.length
    ? accessoryProducts
    : products.slice(0, 4);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <div className="home-page">
      <HomeHeader
        q={q}
        setQ={setQ}
        onSearch={() => loadProducts(q)}
        cartCount={cartCount}
      />

      <BannerSection />

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: "crimson" }}>Error: {error}</p>}

      {!loading && !error && (
        <>
          <ProductSection
            sideTitle="โน้ตบุ๊ก"
            sideItems={notebookBrands}
            products={notebookProducts}
            onAddToCart={addToCart}
            accentTitle={activeNotebookBrandConfig.key}
            activeSideKey={activeNotebookBrand}
            onSelectSideItem={setActiveNotebookBrand}
            emptyText="ไม่มีสินค้า"
          />

          <HorizontalProductSection
            title="สินค้าใหม่"
            products={latestProducts}
            onAddToCart={addToCart}
            emptyText="ไม่มีสินค้า"
          />

          <HorizontalProductSection
            title="อุปกรณ์เสริม"
            products={showAccessory}
            onAddToCart={addToCart}
            emptyText="ไม่มีสินค้า"
          />

          <ProductSection
            sideTitle="หมวดหมู่"
            sideItems={hardwareCategories}
            products={hardwareProducts}
            onAddToCart={addToCart}
            accentTitle={activeHardwareConfig.mark}
            activeSideKey={activeHardwareCategory}
            onSelectSideItem={setActiveHardwareCategory}
            emptyText="ไม่มีสินค้า"
          />
        </>
      )}

      <HomeFooter />
    </div>
  );
}
