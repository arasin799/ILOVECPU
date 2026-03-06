import { Link } from "react-router-dom";

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <Link to={`/products/${product.id}`} className="product-thumb">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} />
        ) : (
          <div className="product-thumb-placeholder">IMG</div>
        )}
      </Link>

      <Link to={`/products/${product.id}`} className="product-name">
        {product.name}
      </Link>

      <div className="product-price">
        ฿{Number(product.price || 0).toLocaleString()}
      </div>

      <button
        type="button"
        className="add-cart-btn"
        onClick={() => onAddToCart(product)}
      >
        เพิ่มลงตะกร้า
      </button>
    </div>
  );
}