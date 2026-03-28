// React state stores whether the category dropdown is open.
import { useState } from "react";
// Link handles client-side links and useNavigate is used for button-driven navigation.
import { Link, useNavigate } from "react-router-dom";
// Shared list of category items used in the header dropdown.
import { HEADER_CATEGORY_ITEMS } from "../../catalogCategories";

// Main storefront header with logo, search, quick actions, and navigation.
export default function HomeHeader({
  q,
  setQ,
  onSearch,
  cartCount = 0,
  onCategorySelect,
}) {
  const navigate = useNavigate();
  // Controls visibility of the category dropdown menu.
  const [showCategoryMenu, setShowCategoryMenu] = useState(false);
  const [searchCat, setSearchCat] = useState(""); // Internal search category filter
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false); // Mobile Hamburger menu state

  // Notify the parent about the chosen category, then navigate to that category page.
  function handleSelectCategory(item) {
    onCategorySelect?.(item);
    navigate(`/categories/${encodeURIComponent(item.key)}`);
    setShowCategoryMenu(false);
  }

  // Close the dropdown before navigating to the footer/about section.
  function handleGoToAbout() {
    setShowCategoryMenu(false);
    navigate("/#about-us");
  }

  return (
    // Header wrapper for the full top navigation area.
    <header className="home-header">
      {/* Top row: logo, search box, and quick access actions. */}
      <div className="home-header-top">
        {/* Mobile menu toggle (Only visible on mobile) */}
        <button 
          className="mobile-menu-toggle" 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle menu"
        >
          ☰
        </button>

        {/* Brand/logo block built from styled elements. */}
        <div className="home-logo-box">
          <div className="home-logo-circuit">
            <span className="line line-1" />
            <span className="line line-2" />
            <span className="line line-3" />
            <span className="dot dot-1" />
            <span className="dot dot-2" />
            <span className="dot dot-3" />
          </div>

          {/* Text part of the logo. */}
          <div className="home-logo-text">
            <div className="logo-row-top">
              <span className="logo-i">I</span>
              <span className="logo-love">LOVE</span>
            </div>
            <div className="logo-row-bottom">CPU</div>
          </div>
        </div>

        {/* Controlled search input. The state lives in the parent page/component. */}
        <div className="home-search">
          <select 
            className="home-search-select" 
            value={searchCat} 
            onChange={(e) => setSearchCat(e.target.value)}
          >
            <option value="">ทุกหมวดหมู่</option>
            {HEADER_CATEGORY_ITEMS.map(cat => (
              <option key={cat.key} value={cat.key}>{cat.label}</option>
            ))}
          </select>
          <div className="home-search-row">
            <input
              type="text"
              placeholder="ค้นหาสินค้า"
              value={q}
              // Push each keystroke back up to the parent state.
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                // Trigger search when the user presses Enter.
                if (e.key === "Enter") {
                  if (searchCat) {
                    navigate(`/categories/${searchCat}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
                  } else if (onSearch) {
                    onSearch();
                  } else {
                    navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
                  }
                }
              }}
            />
            {/* Main search execution button. */}
            <button 
              type="button" 
              className="home-search-btn" 
              onClick={() => {
                if (searchCat) {
                  navigate(`/categories/${searchCat}${q ? `?q=${encodeURIComponent(q)}` : ""}`);
                } else if (onSearch) {
                  onSearch();
                } else {
                  navigate(q ? `/?q=${encodeURIComponent(q)}` : "/");
                }
              }}
            >
              ค้นหา
            </button>
          </div>
        </div>

        {/* Profile button and cart link. */}
        <div className="home-header-actions">
          <button className="icon-btn" type="button" onClick={() => navigate("/profile")}>
            👤
          </button>
          <Link to="/checkout" className="cart-badge">
            Cart ({cartCount})
          </Link>
        </div>
      </div>

      {/* Bottom row: main navigation buttons. */}
      <div className={`home-header-menu ${isMobileMenuOpen ? "is-open" : ""}`}>
        <div className="home-header-menu-left">
          <button type="button" onClick={() => navigate("/")}>หน้าแรก</button>

          {/* Dropdown for quick category navigation. */}
          <div className="header-category-dropdown">
            <button
              type="button"
              // Toggle the category menu open/closed.
              onClick={() => setShowCategoryMenu((prev) => !prev)}
              aria-expanded={showCategoryMenu}
            >
              หมวดหมู่สินค้า
            </button>

            {showCategoryMenu ? (
              <div className="header-category-menu">
                {HEADER_CATEGORY_ITEMS.map((item) => (
                  <button
                    // Each button navigates to one category page.
                    key={item.key}
                    type="button"
                    className="header-category-item"
                    onClick={() => handleSelectCategory(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {/* Navigate to the footer/about section. */}
        <button type="button" onClick={() => { handleGoToAbout(); setIsMobileMenuOpen(false); }}>เกี่ยวกับเรา</button>
      </div>
    </header>
  );
}
