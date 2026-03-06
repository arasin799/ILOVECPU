import CategorySidebar from "./CategorySidebar";
import ProductCard from "./ProductCard";

export default function ProductSection({
  title,
  sidebarTitle,
  sidebarItems = [],
  products = [],
  onAddToCart,
  purpleTitle = false,
}) {
  return (
    <section className="product-section">
      <div className="section-head">
        <h2 className={purpleTitle ? "purple" : ""}>{title}</h2>
        <button type="button">ดูทั้งหมด &gt;</button>
      </div>

      <div className="section-layout">
        <CategorySidebar title={sidebarTitle} items={sidebarItems} />

        <div className="product-grid">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onAddToCart={onAddToCart}
            />
          ))}
        </div>
      </div>
    </section>
  );
}