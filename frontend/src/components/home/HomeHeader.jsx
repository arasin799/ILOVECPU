export default function HomeHeader({ q, setQ, onSearch, cartCount = 0 }) {
  return (
    <header className="home-header">
      <div className="home-header-top">
        <div className="home-logo-box">
          <div className="home-logo-circuit">
            <span className="line line-1" />
            <span className="line line-2" />
            <span className="line line-3" />
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
          </div>

          <div className="home-logo-text">
            <div className="logo-row-top">
              <span className="logo-i">I</span>
              <span className="logo-love">LOVE</span>
            </div>
            <div className="logo-row-bottom">CPU</div>
          </div>
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