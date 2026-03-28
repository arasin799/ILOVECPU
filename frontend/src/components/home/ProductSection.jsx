// Sidebar used to display selectable categories/brands/filters.
import CategorySidebar from "./CategorySidebar";
// Card component used to render each product in the grid.
import ProductCard from "./ProductCard";

// Home-page product section with a sidebar on the left and products on the right.
export default function ProductSection({
  sideTitle,
  sideItems = [],
  products = [],
  onAddToCart,
  accentTitle,
  activeSideKey,
  onSelectSideItem,
  emptyText = "ไม่มีสินค้า",
  onViewAll,
}) {
  return (
    // Outer wrapper for the section.
    <section className="product-section">
      {/* Two-column layout: sidebar + product content area. */}
      <div className="section-layout">
        <CategorySidebar
          title={sideTitle}
          items={sideItems}
          activeKey={activeSideKey}
          onSelect={onSelectSideItem}
        />

        {/* Main area that renders the current product set. */}
        <div className="product-area">
          {/* Title row plus a placeholder action button. */}
          <div className="product-area-head">
            <h2 className="section-accent-title">{accentTitle}</h2>
            <button type="button" onClick={onViewAll}>ดูทั้งหมด &gt;</button>
          </div>

          {/* Render product cards when data exists, otherwise show an empty state. */}
          <div className="product-grid product-grid-three">
            {products.length ? (
              products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={onAddToCart}
                />
              ))
            ) : (
              <div className="product-empty">{emptyText}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
