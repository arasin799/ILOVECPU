import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { loadCart, saveCart } from "./cartStore";

import Shop from "./pages/Shop";
import CategoryCatalog from "./pages/CategoryCatalog";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import YourOrders from "./pages/YourOrders";
import OrderDetail from "./pages/OrderDetail";
import Profile from "./pages/Profile";
import ShippingAddresses from "./pages/ShippingAddresses";
import EditProfile from "./pages/EditProfile";
import Favorites from "./pages/Favorites";
import StaffProducts from "./pages/StaffProducts";
import StaffEditProduct from "./pages/StaffEditProduct";
import StaffEmployees from "./pages/StaffEmployees";
import StaffCustomers from "./pages/StaffCustomers";
import StaffAccountDeletions from "./pages/StaffAccountDeletions";

import { getTokenRole } from "./authStore";

export default function App() {
  const [cart, setCart] = useState(loadCart());
  const location = useLocation();

  useEffect(() => saveCart(cart), [cart]);

  const role = getTokenRole();
  const isStaffSession = role === "staff";
  const isStaffPath = location.pathname.startsWith("/staff");

  if (isStaffSession && !isStaffPath) {
    return <Navigate to="/staff/products" replace />;
  }
  if (!isStaffSession && isStaffPath) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-root-shell">
        <Routes>
          <Route path="/" element={<Shop cart={cart} setCart={setCart} />} />
          <Route path="/categories/:categoryKey" element={<CategoryCatalog cart={cart} />} />
          <Route path="/products/:id" element={<ProductDetail cart={cart} setCart={setCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/orders" element={<YourOrders cart={cart} />} />
          <Route path="/favorites" element={<Favorites cart={cart} />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/profile" element={<Profile cart={cart} />} />
          <Route path="/profile/edit" element={<EditProfile cart={cart} />} />
          <Route path="/addresses" element={<ShippingAddresses cart={cart} />} />
          <Route path="/staff/products" element={<StaffProducts />} />
          <Route path="/staff/employees" element={<StaffEmployees />} />
          <Route path="/staff/customers" element={<StaffCustomers />} />
          <Route path="/staff/account-deletions" element={<StaffAccountDeletions />} />
          <Route path="/staff/products/:id/edit" element={<StaffEditProduct />} />
        </Routes>
    </div>
  );
}
