import { Link } from "react-router-dom";
import { API_BASE } from "../../config";

export default function ProductCard({ product, onAddToCart }) {
  const imageSrc = product.imageUrl
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `${API_BASE}${product.imageUrl}`
    : null;

  return (
    <div className={`product-card shop-card ${product.id === 1 ? "active-card" : ""}`}>
      <Link to={`/products/${product.id}`} className="product-thumb shop-thumb">
        {imageSrc ? (
          <img src={imageSrc} alt={product.name} />
        ) : (
          <div className="product-thumb-placeholder">IMG</div>
        )}
      </Link>

      <Link to={`/products/${product.id}`} className="product-name shop-product-name">
        {product.name}
      </Link>

      <div className="product-price shop-product-price">
        ฿{Number(product.price || 0).toLocaleString()}.00
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