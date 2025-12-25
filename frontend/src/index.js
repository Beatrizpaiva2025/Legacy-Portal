import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import AdminApp from "./AdminApp";
import CustomerApp from "./CustomerApp";
import B2BLandingPage from "./B2BLandingPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* Admin Panel - /#/admin */}
        <Route path="/admin/*" element={<AdminApp />} />
        {/* Customer Portal - /#/customer */}
        <Route path="/customer/*" element={<CustomerApp />} />
        {/* B2B Landing Page - /#/b2b */}
        <Route path="/b2b" element={<B2BLandingPage />} />
        {/* Partner Portal - /#/partner */}
        <Route path="/partner/*" element={<App />} />
        <Route path="/*" element={<App />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
