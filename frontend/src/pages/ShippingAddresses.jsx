import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { loadAddresses, saveAddresses } from "../addressStore";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";

const emptyForm = {
  fullName: "",
  phone: "",
  addressLine: "",
  district: "",
  province: "",
  postalCode: "",
  note: "",
  setAsDefault: true,
};

export default function ShippingAddresses({ cart = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [addresses, setAddresses] = useState(loadAddresses);
  const [ready, setReady] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.qty, 0),
    [cart]
  );

  useEffect(() => {
    if (!getToken()) {
      navigate("/login");
      return;
    }
    setReady(true);
  }, [navigate]);

  if (!ready) return null;

  function handleLogout() {
    clearToken();
    navigate("/login");
  }

  async function handleDeleteAccount() {
    await requestDeleteAccount({ navigate });
  }

  function addAddress() {
    if (!form.fullName || !form.phone || !form.addressLine) {
      alert("กรุณากรอกชื่อ เบอร์โทร และที่อยู่");
      return;
    }

    const newAddress = {
      id: `${Date.now()}`,
      fullName: form.fullName.trim(),
      phone: form.phone.trim(),
      addressLine: form.addressLine.trim(),
      district: form.district.trim(),
      province: form.province.trim(),
      postalCode: form.postalCode.trim(),
      note: form.note.trim(),
      isDefault: addresses.length === 0 || form.setAsDefault,
    };

    const next = newAddress.isDefault
      ? addresses.map((item) => ({ ...item, isDefault: false })).concat(newAddress)
      : addresses.concat(newAddress);

    setAddresses(next);
    saveAddresses(next);
    setForm(emptyForm);
    setShowForm(false);
  }

  function setDefault(id) {
    const next = addresses.map((item) => ({ ...item, isDefault: item.id === id }));
    setAddresses(next);
    saveAddresses(next);
  }

  function removeAddress(id) {
    const target = addresses.find((item) => item.id === id);
    const remain = addresses.filter((item) => item.id !== id);
    const next =
      target?.isDefault && remain.length
        ? remain.map((item, index) => ({ ...item, isDefault: index === 0 }))
        : remain;

    setAddresses(next);
    saveAddresses(next);
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
            <Link to="/favorites">สินค้าที่ถูกใจ</Link>

              <h4>บัญชี</h4>
              <Link to="/profile">ข้อมูลส่วนตัว</Link>
              <button type="button" className="is-active">ที่อยู่สำหรับจัดส่ง</button>
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
                <span className="profile-title-icon">📍</span>
                <h2>ที่อยู่สำหรับจัดส่ง</h2>
              </div>

              <button
                type="button"
                className="profile-edit-btn"
                onClick={() => setShowForm((prev) => !prev)}
              >
                {showForm ? "ปิดฟอร์ม" : "เพิ่มที่อยู่"}
              </button>
            </div>

            {showForm && (
              <section className="address-form-card">
                <div className="address-form-grid">
                  <input
                    value={form.fullName}
                    onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
                    placeholder="ชื่อผู้รับ"
                  />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="เบอร์โทรศัพท์"
                  />
                  <input
                    value={form.addressLine}
                    onChange={(e) => setForm((prev) => ({ ...prev, addressLine: e.target.value }))}
                    placeholder="ที่อยู่"
                  />
                  <input
                    value={form.district}
                    onChange={(e) => setForm((prev) => ({ ...prev, district: e.target.value }))}
                    placeholder="เขต / อำเภอ"
                  />
                  <input
                    value={form.province}
                    onChange={(e) => setForm((prev) => ({ ...prev, province: e.target.value }))}
                    placeholder="จังหวัด"
                  />
                  <input
                    value={form.postalCode}
                    onChange={(e) => setForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                    placeholder="รหัสไปรษณีย์"
                  />
                  <input
                    className="full-row"
                    value={form.note}
                    onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
                    placeholder="หมายเหตุ (ถ้ามี)"
                  />
                </div>

                <label className="address-default-check">
                  <input
                    type="checkbox"
                    checked={form.setAsDefault}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, setAsDefault: e.target.checked }))
                    }
                  />
                  ตั้งเป็นที่อยู่เริ่มต้น
                </label>

                <div className="address-form-actions">
                  <button type="button" className="address-save-btn" onClick={addAddress}>
                    บันทึกที่อยู่
                  </button>
                </div>
              </section>
            )}

            {addresses.length === 0 && !showForm && (
              <div className="address-empty-card">
                ไม่มีที่อยู่สำหรับจัดส่ง
              </div>
            )}

            {addresses.length > 0 && (
              <div className="address-list">
                {addresses.map((item) => (
                  <article key={item.id} className="address-item-card">
                    <div className="address-item-head">
                      <h3>{item.fullName}</h3>
                      {item.isDefault && <span className="address-default-chip">ค่าเริ่มต้น</span>}
                    </div>

                    <p>{item.phone}</p>
                    <p>
                      {item.addressLine}
                      {item.district ? `, ${item.district}` : ""}
                      {item.province ? `, ${item.province}` : ""}
                      {item.postalCode ? ` ${item.postalCode}` : ""}
                    </p>
                    {item.note && <p className="address-note">หมายเหตุ: {item.note}</p>}

                    <div className="address-item-actions">
                      <button type="button" onClick={() => setDefault(item.id)}>
                        ปักหมุดเป็นค่าเริ่มต้น
                      </button>
                      <button type="button" className="danger" onClick={() => removeAddress(item.id)}>
                        ลบ
                      </button>
                    </div>
                  </article>
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

