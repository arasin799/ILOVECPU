import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

const baseCategoryOptions = [
  "NOTEBOOK",
  "CPU",
  "MAINBOARD",
  "GPU",
  "RAM",
  "PSU",
  "KEYBOARD",
  "MONITOR",
  "ACCESSORY",
  "COOLER",
  "STORAGE",
];

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export default function StaffProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [stockInfo, setStockInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clearingAll, setClearingAll] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  async function loadData() {
    setLoading(true);
    try {
      const [productsRes, stockRes] = await Promise.all([
        fetch(`${API_BASE}/api/staff/products`, { headers: getAuthHeader() }),
        fetch(`${API_BASE}/api/staff/products/stock`, { headers: getAuthHeader() }),
      ]);

      if (
        productsRes.status === 401 ||
        productsRes.status === 403 ||
        stockRes.status === 401 ||
        stockRes.status === 403
      ) {
        handleForbidden();
        return;
      }

      const productsData = await parseJsonSafe(productsRes);
      if (!productsRes.ok) {
        throw new Error(productsData?.message || `HTTP ${productsRes.status}`);
      }
      setProducts(Array.isArray(productsData) ? productsData : []);

      if (stockRes.ok) {
        const stockData = await parseJsonSafe(stockRes);
        setStockInfo(stockData || null);
      } else {
        setStockInfo(null);
      }
    } catch {
      setProducts([]);
      setStockInfo(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    loadData();
  }, [navigate]);

  const categoryOptions = useMemo(() => {
    const fromProducts = products
      .map((item) => String(item.category || "").trim().toUpperCase())
      .filter(Boolean);

    const merged = Array.from(new Set([...baseCategoryOptions, ...fromProducts])).sort((a, b) =>
      a.localeCompare(b)
    );

    return ["ALL", ...merged];
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return products.filter((item) => {
      const itemCategory = String(item.category || "").trim().toUpperCase();
      const passCategory = categoryFilter === "ALL" || itemCategory === categoryFilter;
      if (!passCategory) return false;
      if (!q) return true;
      return [item.name, item.brand, item.category, String(item.id)]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [products, keyword, categoryFilter]);

  async function removeProduct(id) {
    const ok = window.confirm("ยืนยันการลบสินค้านี้?");
    if (!ok) return;

    try {
      const res = await fetch(`${API_BASE}/api/staff/products/${id}`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      const data = await parseJsonSafe(res);

      if (res.status === 401 || res.status === 403) {
        handleForbidden();
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      await loadData();
    } catch (e) {
      window.alert(String(e.message || e));
    }
  }

  async function removeAllProducts() {
    if (products.length === 0) {
      window.alert("ไม่มีสินค้าให้ลบ");
      return;
    }

    const firstConfirm = window.confirm(
      "ยืนยันการลบสินค้าทั้งหมด? ระบบจะลบประวัติคำสั่งซื้อและรายการสินค้าในคำสั่งซื้อทั้งหมดด้วย"
    );
    if (!firstConfirm) return;

    const secondConfirm = window.confirm(
      "ยืนยันอีกครั้ง: หลังลบแล้วจะไม่สามารถกู้คืนข้อมูลสินค้าเดิมได้"
    );
    if (!secondConfirm) return;

    setClearingAll(true);
    try {
      const res = await fetch(`${API_BASE}/api/staff/products`, {
        method: "DELETE",
        headers: getAuthHeader(),
      });
      const data = await parseJsonSafe(res);

      if (res.status === 401 || res.status === 403) {
        handleForbidden();
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      await loadData();
    } catch (e) {
      window.alert(String(e.message || e));
    } finally {
      setClearingAll(false);
    }
  }

  function logoutStaff() {
    clearToken();
    navigate("/login");
  }

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <div>
          <h1>ระบบหลังบ้านพนักงาน</h1>
          <p>เพิ่มสินค้า ลบสินค้า และตรวจสอบจำนวนสินค้า</p>
        </div>
        <div className="staff-topbar-actions">
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn is-active"
            onClick={() => navigate("/staff/products")}
          >
            สินค้า
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn"
            onClick={() => navigate("/staff/employees")}
          >
            พนักงาน
          </button>
          <button
            type="button"
            className="staff-secondary-btn staff-topbar-nav-btn"
            onClick={() => navigate("/staff/customers")}
          >
            ลูกค้า
          </button>
          <button
            type="button"
            className="staff-danger-btn staff-topbar-nav-btn"
            onClick={logoutStaff}
          >
            ล็อกเอ้าท์
          </button>
        </div>
      </header>

      {stockInfo && (
        <section className="staff-summary-grid">
          <article className="staff-summary-card">
            <span>จำนวนรายการสินค้า</span>
            <strong>{stockInfo.totalProducts}</strong>
          </article>
          <article className="staff-summary-card">
            <span>จำนวนชิ้นรวม</span>
            <strong>{stockInfo.totalStockUnits}</strong>
          </article>
          <article className="staff-summary-card is-warn">
            <span>ใกล้หมด (&lt;= 5)</span>
            <strong>{stockInfo.lowStock}</strong>
          </article>
          <article className="staff-summary-card is-danger">
            <span>หมดสต็อก</span>
            <strong>{stockInfo.outOfStock}</strong>
          </article>
        </section>
      )}

      <section className="staff-panel staff-list-panel">
        <div className="staff-list-head">
          <div className="staff-list-title-group">
            <h2>รายการสินค้า</h2>
            <button
              type="button"
              className="staff-primary-btn staff-add-btn"
              onClick={() => navigate("/staff/products/new/edit")}
            >
              เพิ่มสินค้า
            </button>
            <button
              type="button"
              className="staff-danger-btn staff-add-btn"
              onClick={removeAllProducts}
              disabled={clearingAll || loading || products.length === 0}
            >
              {clearingAll ? "กำลังลบทั้งหมด..." : "ลบสินค้าทั้งหมด"}
            </button>
          </div>
          <select
            className="staff-select-arrow staff-category-select"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category === "ALL" ? "ทุกหมวดหมู่" : category}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="ค้นหาจากชื่อ ยี่ห้อ หมวดหมู่ หรือรหัสสินค้า"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลสินค้า...</p>
        ) : (
          <div className="staff-table-wrap">
            <table className="staff-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>สินค้า</th>
                  <th>หมวดหมู่</th>
                  <th>ราคา</th>
                  <th>คงเหลือ</th>
                  <th>จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="staff-empty">
                      ไม่พบสินค้า
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((item) => (
                    <tr key={item.id}>
                      <td>#{item.id}</td>
                      <td>
                        <strong>{item.name}</strong>
                        <small>{item.brand}</small>
                      </td>
                      <td>{item.category}</td>
                      <td>฿{Number(item.price || 0).toLocaleString()}</td>
                      <td>
                        <span
                          className={`staff-stock-badge ${
                            Number(item.stock || 0) === 0
                              ? "is-zero"
                              : Number(item.stock || 0) <= 5
                                ? "is-low"
                                : ""
                          }`}
                        >
                          {item.stock}
                        </span>
                      </td>
                      <td>
                        <div className="staff-row-actions">
                          <button
                            type="button"
                            className="staff-secondary-btn"
                            onClick={() => navigate(`/staff/products/${item.id}/edit`)}
                          >
                            แก้ไข
                          </button>
                          <button
                            type="button"
                            className="staff-danger-btn"
                            onClick={() => removeProduct(item.id)}
                          >
                            ลบ
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
