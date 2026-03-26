import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import HomeHeader from "../components/home/HomeHeader";
import HomeFooter from "../components/home/HomeFooter";
import { getToken, clearToken } from "../authStore";
import { requestDeleteAccount } from "../accountDeletion";
import "../styles/home.css";
import "../styles/profile.css";

export default function Favorites({ cart = [] }) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
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

            <div className="address-empty-card">
              ยังไม่มีสินค้าที่ถูกใจ
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}
