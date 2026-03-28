// localStorage key used to persist the shopping cart.
const CART_KEY = "hardware_store_cart_v1";

// Load the cart from localStorage. Fall back to an empty cart if parsing fails.
export function loadCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  } catch {
    return [];
  }
}

// Save the current cart state into localStorage.
export function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}
