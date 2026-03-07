import { useEffect, useMemo, useState } from "react";
import HomeHeader from "../components/home/HomeHeader";
import BannerSection from "../components/home/BannerSection";
import ProductSection from "../components/home/ProductSection";
import HorizontalProductSection from "../components/home/HorizontalProductSection";
import HomeFooter from "../components/home/HomeFooter";
import { API_BASE } from "../config";
import "../styles/home.css";

const notebookBrands = [
  { label: "ACER", mark: "acer", className: "brand-acer" },
  { label: "ASUS", mark: "ASUS", className: "brand-asus" },
  { label: "GIGABYTE", mark: "GIGABYTE", className: "brand-gigabyte" },
  { label: "LENOVO", mark: "Lenovo", className: "brand-lenovo" },
  { label: "MSI", mark: "msi", className: "brand-msi" },
  { label: "HP", mark: "hp", className: "brand-hp" },
];

const cpuCategories = [
  { label: "ซีพียู", mark: "CPU" },
  { label: "เมนบอร์ด", mark: "MB" },
  { label: "การ์ดจอ", mark: "GPU" },
  { label: "แรม", mark: "RAM" },
  { label: "พาวเวอร์ซัพพลาย", mark: "PSU" },
  { label: "คีย์บอร์ด", mark: "KB" },
  { label: "จอมอนิเตอร์", mark: "MON" },
  { label: "อุปกรณ์เสริม", mark: "ACC" },
  { label: "ชุดระบายความร้อน", mark: "COOL" },
];

export default function Shop({ cart, setCart }) {
  const [products, setProducts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  function addToCart(p) {
    setCart((prev) => {
      const idx = prev.findIndex((x) => x.productId === p.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          qty: next[idx].qty + 1,
          price: p.price,
          name: p.name,
        };
        return next;
      }
      return [...prev, { productId: p.id, qty: 1, price: p.price, name: p.name }];
    });
  }

  const notebookProducts = useMemo(() => {
    return products.filter((p) => p.category === "NOTEBOOK");
  }, [products]);

  const acerNotebookProducts = useMemo(() => {
    return notebookProducts.filter((p) => (p.brand || "").toUpperCase() === "ACER").slice(0, 6);
  }, [notebookProducts]);

  const cpuProducts = useMemo(() => {
    return products.filter((p) => p.category === "CPU").slice(0, 6);
  }, [products]);

  const accessoryProducts = useMemo(() => {
    return products.filter((p) => p.category === "ACCESSORY").slice(0, 4);
  }, [products]);

  const latestProducts = products.slice(0, 4);
  const showNotebook = acerNotebookProducts.length ? acerNotebookProducts : notebookProducts.slice(0, 6);
  const showCpu = cpuProducts.length ? cpuProducts : products.slice(0, 6);
  const showAccessory = accessoryProducts.length ? accessoryProducts : products.slice(0, 4);
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
            title=""
            sideTitle="โน้ตบุ๊ค"
            sideItems={notebookBrands}
            products={showNotebook}
            onAddToCart={addToCart}
            accentTitle="ACER"
          />

          <HorizontalProductSection
            title="สินค้าใหม่"
            products={latestProducts}
            onAddToCart={addToCart}
          />

          <HorizontalProductSection
            title="อุปกรณ์เสริม"
            products={showAccessory}
            onAddToCart={addToCart}
          />

          <ProductSection
            title="ซีพียู"
            sideTitle="หมวดหมู่"
            sideItems={cpuCategories}
            products={showCpu}
            onAddToCart={addToCart}
            accentTitle="ซีพียู"
          />
        </>
      )}

      <HomeFooter />
    </div>
  );
}