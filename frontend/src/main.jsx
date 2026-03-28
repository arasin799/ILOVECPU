// Core React package.
import React from "react";
// ReactDOM is responsible for mounting the React app into the browser DOM.
import ReactDOM from "react-dom/client";
// BrowserRouter enables client-side routing with clean URLs.
import { BrowserRouter } from "react-router-dom";
// Root application component containing all routes/pages.
import App from "./App.jsx";
// Global CSS shared across the whole frontend.
import "./index.css";

// Mount the React app into the #root element from index.html.
ReactDOM.createRoot(document.getElementById("root")).render(
  // StrictMode helps surface potential React issues during development.
  <React.StrictMode>
    {/* BrowserRouter makes route navigation available to the entire app. */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
