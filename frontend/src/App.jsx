// React Router components used to declare routes and redirect based on auth state.
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
// React hooks used to keep cart state in sync with localStorage.
import { useEffect, useState } from "react";
// Cart persistence helpers.
import { loadCart, saveCart } from "./cartStore";

// Customer-facing pages.
import Shop from "./pages/Shop";
import CategoryCatalog from "./pages/CategoryCatalog";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import Login from "./pages/Login";
import SignUp from "./pages/SignUp";
import YourOrders from "./pages/YourOrders";
import OrderDetail from "./pages/OrderDetail";
import TrackOrder from "./pages/TrackOrder";
import Profile from "./pages/Profile";
import ShippingAddresses from "./pages/ShippingAddresses";
import EditProfile from "./pages/EditProfile";
import Favorites from "./pages/Favorites";

// Staff/backoffice pages.
import StaffProducts from "./pages/StaffProducts";
import StaffEditProduct from "./pages/StaffEditProduct";
import StaffEmployees from "./pages/StaffEmployees";
import StaffCustomers from "./pages/StaffCustomers";
import StaffAccountDeletions from "./pages/StaffAccountDeletions";
import StaffConfirmPayments from "./pages/StaffConfirmPayments";
import StaffProcessOrders from "./pages/StaffProcessOrders";

// Reads the current token payload to determine whether this is a staff session.
import { getTokenRole } from "./authStore";

// Root app component that owns shared cart state and declares all routes.
export default function App() {
  // Load the saved cart once when the app starts.
  const [cart, setCart] = useState(loadCart());
  // Current location is used to detect whether the user is on a staff route.
  const location = useLocation();

  // Persist cart changes every time the cart state updates.
  useEffect(() => saveCart(cart), [cart]);

  // Staff sessions are routed only into /staff pages.
  const role = getTokenRole();
  const isStaffSession = role === "staff";
  const isStaffPath = location.pathname.startsWith("/staff");

  // Prevent staff users from landing on storefront pages.
  if (isStaffSession && !isStaffPath) {
    return <Navigate to="/staff/products" replace />;
  }
  // Prevent non-staff users from opening staff pages directly.
  if (!isStaffSession && isStaffPath) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-root-shell">
        {/* All app routes are declared here. Shared cart state is passed to pages that need it. */}
        <Routes>
          <Route path="/" element={<Shop cart={cart} setCart={setCart} />} />
          <Route path="/categories/:categoryKey" element={<CategoryCatalog cart={cart} />} />
          <Route path="/products/:id" element={<ProductDetail cart={cart} setCart={setCart} />} />
          <Route path="/checkout" element={<Checkout cart={cart} setCart={setCart} />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/orders" element={<YourOrders cart={cart} />} />
          <Route path="/favorites" element={<Favorites cart={cart} setCart={setCart} />} />
          <Route path="/orders/:id" element={<OrderDetail />} />
          <Route path="/orders/:id/tracking" element={<TrackOrder cart={cart} />} />
          <Route path="/profile" element={<Profile cart={cart} />} />
          <Route path="/profile/edit" element={<EditProfile cart={cart} />} />
          <Route path="/addresses" element={<ShippingAddresses cart={cart} />} />
          <Route path="/staff/products" element={<StaffProducts />} />
          <Route path="/staff/employees" element={<StaffEmployees />} />
          <Route path="/staff/customers" element={<StaffCustomers />} />
          <Route path="/staff/account-deletions" element={<StaffAccountDeletions />} />
          <Route path="/staff/orders/payments" element={<StaffConfirmPayments />} />
          <Route path="/staff/orders/processing" element={<StaffProcessOrders />} />
          <Route path="/staff/products/:id/edit" element={<StaffEditProduct />} />
        </Routes>
    </div>
  );
}
