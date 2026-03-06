export default function HomeHeader({ q, setQ, onSearch, cartCount = 0 }) {
  return (
    <header className="home-header">
      <div className="home-header-top">
        <div className="home-logo">
          <div className="home-logo-top">I LOVE</div>
          <div className="home-logo-bottom">CPU</div>
        </div>

        <div className="home-search">
          <input
            type="text"
            placeholder="ค้นหาสินค้า"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onSearch();
            }}
          />
        </div>

        <div className="home-header-actions">
          <button className="icon-btn" type="button">👤</button>
          <div className="cart-badge">Cart ({cartCount})</div>
        </div>
      </div>

      <div className="home-header-menu">
        <button type="button">หน้าแรก</button>
        <button type="button">จัดสเปกคอม</button>
        <button type="button">เกี่ยวกับเรา</button>
        <button type="button" onClick={onSearch}>หมวดหมู่สินค้า</button>
      </div>
    </header>
  );
}