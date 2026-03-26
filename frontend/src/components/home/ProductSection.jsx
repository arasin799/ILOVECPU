import CategorySidebar from "./CategorySidebar";
import ProductCard from "./ProductCard";

export default function ProductSection({
  sideTitle,
  sideItems = [],
  products = [],
  onAddToCart,
  accentTitle,
  activeSideKey,
  onSelectSideItem,
  emptyText = "ไม่มีสินค้า",
}) {
  return (
    <section className="product-section">
      <div className="section-layout">
        <CategorySidebar
          title={sideTitle}
          items={sideItems}
          activeKey={activeSideKey}
          onSelect={onSelectSideItem}
        />

        <div className="product-area">
          <div className="product-area-head">
            <h2 className="section-accent-title">{accentTitle}</h2>
            <button type="button">ดูทั้งหมด &gt;</button>
          </div>

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
