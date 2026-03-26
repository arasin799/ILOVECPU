import ProductCard from "./ProductCard";

export default function HorizontalProductSection({
  title,
  products = [],
  onAddToCart,
  emptyText = "ไม่มีสินค้า",
}) {
  return (
    <section className="product-section">
      <div className="section-head">
        <h2 className="purple">{title}</h2>
        <button type="button">ดูทั้งหมด &gt;</button>
      </div>

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
