import { useEffect, useMemo, useState } from "react";
import HomeHeader from "../components/home/HomeHeader";
import BannerSection from "../components/home/BannerSection";
import ProductSection from "../components/home/ProductSection";
import HomeFooter from "../components/home/HomeFooter";
import "../styles/home.css";
import { API_BASE } from "../config";
import HorizontalProductSection from "../components/home/HorizontalProductSection";

const notebookBrands = ["ACER", "ASUS", "GIGABYTE", "LENOVO", "MSI", "HP"];
const cpuCategories = [
  "ซีพียู",
  "เมนบอร์ด",
  "การ์ดจอ",
  "แรม",
  "พาวเวอร์ซัพพลาย",
  "คีย์บอร์ด",
  "จอมอนิเตอร์",
  "อุปกรณ์เสริม",
  "ชุดระบายความร้อน",
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

  const cpuProducts = useMemo(() => {
    return products.filter((p) => p.category === "CPU");
  }, [products]);

  const accessoryProducts = useMemo(() => {
    return products.filter((p) => p.category === "ACCESSORY");
  }, [products]);

  const showNotebook = notebookProducts.length
    ? notebookProducts.slice(0, 6)
    : products.slice(0, 6);

  const showCpu = cpuProducts.length
    ? cpuProducts.slice(0, 6)
    : products.slice(0, 6);

  const latestProducts = products.slice(0, 4);

  const showAccessory = accessoryProducts.length
    ? accessoryProducts.slice(0, 4)
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
            title="โน้ตบุ๊ค"
            sidebarTitle="โน้ตบุ๊ค"
            sidebarItems={notebookBrands}
            products={showNotebook}
            onAddToCart={addToCart}
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
            sidebarTitle="หมวดหมู่"
            sidebarItems={cpuCategories}
            products={showCpu}
            onAddToCart={addToCart}
            purpleTitle
          />
        </>
      )}

      <HomeFooter />
    </div>
  );
}