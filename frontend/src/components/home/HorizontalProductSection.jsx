// Card component used to render each product item.
import ProductCard from "./ProductCard";

// Product section variant that arranges cards in a horizontal grid/list.
export default function HorizontalProductSection({
  title,
  products = [],
  onAddToCart,
  emptyText = "ไม่มีสินค้า",
  onViewAll,
}) {
  return (
    // Section wrapper for this product block.
    <section className="product-section">
      {/* Section title and a placeholder CTA button. */}
      <div className="section-head">
        <h2 className="purple">{title}</h2>
        <button type="button" onClick={onViewAll}>ดูทั้งหมด &gt;</button>
      </div>

      {/* Render products when available, otherwise show an empty-state message. */}
      <div className="horizontal-product-grid">
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
    </section>
  );
}
