// Link provides client-side navigation to product detail pages.
import { Link } from "react-router-dom";
// API base is used to build full URLs for backend-hosted images.
import { API_BASE } from "../../config";

// Reusable product card used across home/shop sections.
export default function ProductCard({ product, onAddToCart }) {
  // Convert a relative backend image path into a full URL.
  // If the image is already absolute, keep it unchanged.
  const imageSrc = product.imageUrl
    ? product.imageUrl.startsWith("http")
      ? product.imageUrl
      : `${API_BASE}${product.imageUrl}`
    : null;

  return (
    // Adds a special class for product id 1, likely for a highlighted style.
    <div className={`product-card shop-card ${product.id === 1 ? "active-card" : ""}`}>
      {/* Thumbnail links to the product detail page. */}
      <Link to={`/products/${product.id}`} className="product-thumb shop-thumb">
        {imageSrc ? (
          <img src={imageSrc} alt={product.name} />
        ) : (
          // Fallback shown when a product has no image.
          <div className="product-thumb-placeholder">IMG</div>
        )}
      </Link>

      {/* Product name also navigates to the detail page. */}
      <Link to={`/products/${product.id}`} className="product-name shop-product-name">
        {product.name}
      </Link>

      {/* Display the product price in a readable format. */}
      <div className="product-price shop-product-price">
        ฿{Number(product.price || 0).toLocaleString()}.00
      </div>

      <button
        type="button"
        className="add-cart-btn"
        // Pass the selected product back to the parent cart handler.
        onClick={() => onAddToCart(product)}
      >
        เพิ่มลงตะกร้า
      </button>
    </div>
  );
}
