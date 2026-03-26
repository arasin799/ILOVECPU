import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE } from "../config";
import { clearToken, getToken } from "../authStore";
import "../styles/staff.css";

const MAX_IMAGES = 4;

const CATEGORY_OPTIONS = [
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

const BRAND_OPTIONS_BY_CATEGORY = {
  NOTEBOOK: ["ACER", "ASUS", "DELL", "HP", "LENOVO", "MSI"],
  CPU: ["AMD", "INTEL"],
  MAINBOARD: ["ASUS", "MSI", "GIGABYTE", "ASROCK"],
  GPU: ["ASUS", "MSI", "GIGABYTE", "ZOTAC", "GALAX", "SAPPHIRE", "POWERCOLOR"],
  RAM: ["KINGSTON", "CORSAIR", "G.SKILL", "ADATA", "TEAMGROUP"],
  PSU: ["CORSAIR", "SEASONIC", "COOLER MASTER", "THERMALTAKE", "SILVERSTONE"],
  KEYBOARD: ["LOGITECH", "RAZER", "KEYCHRON", "CORSAIR", "STEELSERIES"],
  MONITOR: ["AOC", "ASUS", "LG", "SAMSUNG", "MSI", "DELL"],
  ACCESSORY: ["LOGITECH", "UGREEN", "TP-LINK", "RAZER", "ANKER"],
  COOLER: ["DEEPCOOL", "NOCTUA", "COOLER MASTER", "THERMALRIGHT", "CORSAIR"],
  STORAGE: ["SAMSUNG", "WD", "CRUCIAL", "KINGSTON", "SEAGATE", "ADATA"],
};

const SPEC_LABELS_BY_CATEGORY = {
  NOTEBOOK: ["Brand", "Model", "Processor", "Graphics", "Display", "Memory", "Storage", "Weight", "Warranty"],
  CPU: ["Brand", "Socket", "Core / Thread", "Base Clock", "Boost Clock", "Cache", "TDP", "Warranty"],
  MAINBOARD: ["Brand", "Socket", "Chipset", "Form Factor", "Memory Support", "Storage Slots", "PCIe Slots", "LAN", "Warranty"],
  GPU: ["Brand", "GPU Chip", "Memory", "Interface", "Output", "Power Connector", "Recommended PSU", "Warranty"],
  RAM: ["Brand", "Capacity", "Type", "Speed", "Latency", "Voltage", "Warranty"],
  PSU: ["Brand", "Wattage", "Efficiency", "Certification", "Modular", "Protection", "Warranty"],
  KEYBOARD: ["Brand", "Switch Type", "Layout", "Connection", "Backlight", "Warranty"],
  MONITOR: ["Brand", "Panel Type", "Size", "Resolution", "Refresh Rate", "Response Time", "Ports", "Warranty"],
  STORAGE: ["Brand", "Type", "Capacity", "Interface", "Read Speed", "Write Speed", "TBW", "Warranty"],
  ACCESSORY: ["Brand", "Category", "Connection", "Compatibility", "Color", "Warranty"],
  COOLER: ["Brand", "Cooler Type", "Socket Support", "Fan Size", "RPM", "Airflow", "Warranty"],
  DEFAULT: ["Brand", "Model", "Warranty"],
};

const INITIAL_FORM = {
  name: "",
  brand: "",
  category: "NOTEBOOK",
  price: "",
  stock: "",
};

function normalizeImageUrls(imageUrls, fallbackImageUrl = "") {
  let raw = [];

  if (Array.isArray(imageUrls)) {
    raw = imageUrls;
  } else if (typeof imageUrls === "string" && imageUrls.trim()) {
    try {
      const parsed = JSON.parse(imageUrls);
      raw = Array.isArray(parsed) ? parsed : [imageUrls];
    } catch {
      raw = [imageUrls];
    }
  }

  if (fallbackImageUrl && !raw.includes(fallbackImageUrl)) {
    raw.unshift(fallbackImageUrl);
  }

  return raw
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .slice(0, MAX_IMAGES);
}

function normalizeSpecs(specs) {
  if (!Array.isArray(specs)) return [];

  return specs
    .map((item) => {
      if (Array.isArray(item)) {
        return {
          label: String(item[0] || "").trim(),
          value: String(item[1] || "").trim(),
        };
      }

      return {
        label: String(item?.label || "").trim(),
        value: String(item?.value || "").trim(),
      };
    })
    .filter((item) => item.label);
}

function buildSpecRows(category, existingSpecs = []) {
  const normalized = normalizeSpecs(existingSpecs);
  const valueByLabel = new Map(
    normalized.map((item) => [item.label, item.value])
  );

  const defaultLabels =
    SPEC_LABELS_BY_CATEGORY[category] || SPEC_LABELS_BY_CATEGORY.DEFAULT;
  const rows = defaultLabels.map((label) => ({
    label,
    value: valueByLabel.get(label) || "",
  }));

  return rows.slice(0, 20);
}

function toPreviewSrc(url) {
  if (!url) return "";
  if (
    url.startsWith("http://") ||
    url.startsWith("https://") ||
    url.startsWith("blob:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  return url.startsWith("/") ? `${API_BASE}${url}` : `${API_BASE}/${url}`;
}

function createImageItem({ url, file = null }) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    url,
    file,
  };
}

function revokeLocalPreview(item) {
  if (item?.file && typeof item.url === "string" && item.url.startsWith("blob:")) {
    URL.revokeObjectURL(item.url);
  }
}

export default function StaffEditProduct() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isCreateMode = id === "new";

  const [form, setForm] = useState(INITIAL_FORM);
  const [specRows, setSpecRows] = useState(
    buildSpecRows(INITIAL_FORM.category)
  );
  const [imageItems, setImageItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [productTitle, setProductTitle] = useState("");

  const fileInputRef = useRef(null);
  const imageItemsRef = useRef([]);

  const categoryOptions = useMemo(() => CATEGORY_OPTIONS, []);
  const brandOptions = useMemo(() => {
    const base = BRAND_OPTIONS_BY_CATEGORY[form.category] || [];
    if (form.brand && !base.includes(form.brand)) {
      return [form.brand, ...base];
    }
    return base;
  }, [form.category, form.brand]);

  function getAuthHeader() {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function handleForbidden() {
    clearToken();
    navigate("/login");
  }

  function replaceImageItems(nextItems) {
    const prevItems = imageItemsRef.current;
    prevItems.forEach((item) => revokeLocalPreview(item));
    imageItemsRef.current = nextItems;
    setImageItems(nextItems);
  }

  function removeImageAt(index) {
    setImageItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const next = prev.filter((_, idx) => idx !== index);
      revokeLocalPreview(prev[index]);
      imageItemsRef.current = next;
      return next;
    });
  }

  function openImagePicker() {
    if (imageItems.length >= MAX_IMAGES) {
      setError(`อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูป`);
      return;
    }
    fileInputRef.current?.click();
  }

  function onSelectImages(e) {
    setError("");
    const picked = Array.from(e.target.files || []);
    e.target.value = "";

    if (picked.length === 0) return;

    const allowed = picked.filter(
      (file) => file.type === "image/png" || file.type === "image/jpeg"
    );
    if (allowed.length !== picked.length) {
      setError("รองรับเฉพาะไฟล์ PNG และ JPG");
    }

    setImageItems((prev) => {
      const slotsLeft = MAX_IMAGES - prev.length;
      if (slotsLeft <= 0) return prev;

      if (allowed.length > slotsLeft) {
        setError(`อัปโหลดรูปได้สูงสุด ${MAX_IMAGES} รูป`);
      }

      const nextFiles = allowed.slice(0, slotsLeft);
      const nextItems = [
        ...prev,
        ...nextFiles.map((file) =>
          createImageItem({
            url: URL.createObjectURL(file),
            file,
          })
        ),
      ];

      imageItemsRef.current = nextItems;
      return nextItems;
    });
  }

  function onChangeSpecValue(index, value) {
    setSpecRows((prev) => {
      const next = [...prev];
      if (!next[index]) return prev;
      next[index] = { ...next[index], value };
      return next;
    });
  }

  function onChangeCategory(nextCategory) {
    setForm((prev) => {
      const availableBrands = BRAND_OPTIONS_BY_CATEGORY[nextCategory] || [];
      const nextBrand = availableBrands.includes(prev.brand) ? prev.brand : "";
      return { ...prev, category: nextCategory, brand: nextBrand };
    });
    setSpecRows((prev) => buildSpecRows(nextCategory, prev));
  }

  async function uploadLocalImages() {
    const localFiles = imageItems.filter((item) => item.file).map((item) => item.file);
    if (localFiles.length === 0) {
      return imageItems.map((item) => item.url).filter(Boolean).slice(0, MAX_IMAGES);
    }

    const fd = new FormData();
    localFiles.forEach((file) => fd.append("images", file));

    const res = await fetch(`${API_BASE}/api/staff/uploads/products`, {
      method: "POST",
      headers: getAuthHeader(),
      body: fd,
    });
    const data = await res.json();

    if (res.status === 401 || res.status === 403) {
      handleForbidden();
      return null;
    }
    if (!res.ok) {
      throw new Error(data?.message || `HTTP ${res.status}`);
    }

    const uploadedUrls = Array.isArray(data?.urls) ? data.urls : [];
    let uploadIdx = 0;
    const merged = imageItems
      .map((item) => {
        if (item.file) {
          const url = String(uploadedUrls[uploadIdx] || "").trim();
          uploadIdx += 1;
          return url;
        }
        return item.url;
      })
      .filter(Boolean)
      .slice(0, MAX_IMAGES);

    replaceImageItems(merged.map((url) => createImageItem({ url })));
    return merged;
  }

  useEffect(() => {
    return () => {
      imageItemsRef.current.forEach((item) => revokeLocalPreview(item));
    };
  }, []);

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }

    if (isCreateMode) {
      setForm(INITIAL_FORM);
      setSpecRows(buildSpecRows(INITIAL_FORM.category));
      replaceImageItems([]);
      setProductTitle("สินค้าใหม่");
      setLoading(false);
      return;
    }

    async function loadProduct() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`${API_BASE}/api/staff/products/${id}`, {
          headers: getAuthHeader(),
        });
        const data = await res.json();

        if (res.status === 401 || res.status === 403) {
          handleForbidden();
          return;
        }
        if (!res.ok) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }

        const nextCategory = data.category || "NOTEBOOK";
        setForm({
          name: data.name || "",
          brand: data.brand || "",
          category: nextCategory,
          price: String(data.price ?? ""),
          stock: String(data.stock ?? ""),
        });
        setSpecRows(buildSpecRows(nextCategory, data.specs));

        const imageUrls = normalizeImageUrls(data.imageUrls, data.imageUrl);
        replaceImageItems(
          imageUrls.map((url) =>
            createImageItem({
              url,
            })
          )
        );
        setProductTitle(data.name || `#${id}`);
      } catch (err) {
        setError(String(err.message || err));
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [id, isCreateMode, navigate]);

  async function saveProduct(e) {
    e.preventDefault();
    setError("");

    const basePayload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category.trim().toUpperCase(),
      price: Number(form.price),
      stock: Number(form.stock),
    };

    if (!basePayload.name || !basePayload.brand || !basePayload.category) {
      setError("กรุณากรอกชื่อสินค้า ยี่ห้อ และหมวดหมู่");
      return;
    }
    if (!Number.isFinite(basePayload.price) || basePayload.price < 0) {
      setError("ราคาต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }
    if (!Number.isFinite(basePayload.stock) || basePayload.stock < 0) {
      setError("จำนวนสต็อกต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป");
      return;
    }

    const specsPayload = specRows
      .map((item) => ({
        label: String(item.label || "").trim(),
        value: String(item.value || "").trim(),
      }))
      .filter((item) => item.label && item.value);

    setSaving(true);
    try {
      const imageUrls = await uploadLocalImages();
      if (imageUrls === null) {
        return;
      }

      const payload = {
        ...basePayload,
        imageUrl: imageUrls[0] || "",
        imageUrls,
        specs: specsPayload,
      };

      const endpoint = isCreateMode
        ? `${API_BASE}/api/staff/products`
        : `${API_BASE}/api/staff/products/${id}`;
      const method = isCreateMode ? "POST" : "PATCH";

      const res = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (res.status === 401 || res.status === 403) {
        handleForbidden();
        return;
      }
      if (!res.ok) {
        throw new Error(data?.message || `HTTP ${res.status}`);
      }

      navigate("/staff/products");
    } catch (err) {
      setError(String(err.message || err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="staff-page">
      <header className="staff-topbar">
        <div>
          <h1>{isCreateMode ? "เพิ่มสินค้าใหม่" : "แก้ไขสินค้า"}</h1>
          <p>{loading ? "กำลังโหลด..." : productTitle}</p>
        </div>
        <div className="staff-topbar-actions">
          <button type="button" className="staff-back-btn" onClick={() => navigate("/staff/products")}>
            {"\u2190 \u0E01\u0E25\u0E31\u0E1A"}
          </button>
        </div>
      </header>

      <section className="staff-panel">
        <h2>{isCreateMode ? "ฟอร์มเพิ่มสินค้า" : "ฟอร์มแก้ไขสินค้า"}</h2>
        {loading ? (
          <p className="staff-info">กำลังโหลดข้อมูลสินค้า...</p>
        ) : (
          <form className="staff-form-grid" onSubmit={saveProduct}>
            <input
              type="text"
              placeholder="ชื่อสินค้า"
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            />
            <select
              className="staff-select-arrow staff-form-category-select"
              value={form.category}
              onChange={(e) => onChangeCategory(e.target.value)}
            >
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select
              className="staff-select-arrow staff-form-category-select"
              value={form.brand}
              onChange={(e) => setForm((prev) => ({ ...prev, brand: e.target.value }))}
              disabled={brandOptions.length === 0}
            >
              <option value="">เลือกยี่ห้อ</option>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
            <input
              type="number"
              min="0"
              placeholder="ราคา"
              value={form.price}
              onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
            />
            <input
              type="number"
              min="0"
              placeholder="จำนวนสินค้าในสต็อก"
              value={form.stock}
              onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
            />

            <div className="staff-upload-section">
              <div className="staff-upload-head">
                <strong>รูปภาพสินค้า</strong>
                <span>{imageItems.length}/{MAX_IMAGES}</span>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                className="staff-hidden-upload-input"
                accept="image/png,image/jpeg"
                multiple
                onChange={onSelectImages}
              />

              <div className="staff-image-grid">
                {Array.from({ length: MAX_IMAGES }).map((_, index) => {
                  const item = imageItems[index];
                  if (!item) {
                    return (
                      <button
                        key={`empty-${index}`}
                        type="button"
                        className="staff-image-slot"
                        onClick={openImagePicker}
                      >
                        <span className="staff-image-plus">+</span>
                        <span className="staff-image-hint">คลิกเพื่ออัปโหลด</span>
                      </button>
                    );
                  }

                  return (
                    <div key={item.id} className="staff-image-slot staff-image-slot-filled">
                      <img src={toPreviewSrc(item.url)} alt={`product-${index + 1}`} />
                      <button
                        type="button"
                        className="staff-image-remove"
                        onClick={() => removeImageAt(index)}
                        aria-label={`remove image ${index + 1}`}
                      >
                        x
                      </button>
                    </div>
                  );
                })}
              </div>

              <p className="staff-upload-hint">
                รองรับไฟล์ PNG/JPG สูงสุด {MAX_IMAGES} รูป
              </p>
            </div>

            <div className="staff-specs-section">
              <div className="staff-upload-head">
                <strong>คุณสมบัติสินค้า</strong>
              </div>
              <div className="staff-spec-grid">
                {specRows.map((item, index) => (
                  <label key={`${item.label}-${index}`} className="staff-spec-item">
                    <span>{item.label}</span>
                    <input
                      type="text"
                      value={item.value}
                      onChange={(e) => onChangeSpecValue(index, e.target.value)}
                      placeholder={`กรอก ${item.label}`}
                    />
                  </label>
                ))}
              </div>
            </div>

            {error ? <p className="staff-error">{error}</p> : null}

            <div className="staff-form-actions">
              <button
                type="button"
                className="staff-secondary-btn"
                onClick={() => navigate("/staff/products")}
              >
                ยกเลิก
              </button>
              <button type="submit" className="staff-primary-btn" disabled={saving}>
                {saving ? "กำลังบันทึก..." : isCreateMode ? "เพิ่มสินค้า" : "บันทึกการแก้ไข"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

