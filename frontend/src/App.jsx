import { Link, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadCart, saveCart } from "./cartStore";

import Shop from "./pages/Shop";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import YourOrders from "./pages/YourOrders";
import OrderDetail from "./pages/OrderDetail";

import { getToken, clearToken } from "./authStore";

export default function App() {
  const [cart, setCart] = useState(loadCart());
  const [isLoggedIn, setIsLoggedIn] = useState(!!getToken());

  const navigate = useNavigate();

  useEffect(() => saveCart(cart), [cart]);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  function handleLogout() {
    clearToken();
    setIsLoggedIn(false);
    navigate("/login");
  }

  return (
    <div style={{ width: "100%" }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "14px 18px 30px",
        }}
      >

        <Routes>
          <Route path="/" element={<Shop cart={cart} setCart={setCart} />} />
          <Route path="/products/:id" element={<ProductDetail cart={cart} setCart={setCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/orders" element={<YourOrders />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
        </Routes>
      </div>
    </div>
  );
}