import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import AdminApp from "./AdminApp";
import CustomerApp from "./CustomerApp";
import B2BLandingPage from "./B2BLandingPage";
import AssignmentPage from "./AssignmentPage";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* Admin Panel - /#/admin */}
        <Route path="/admin/*" element={<AdminApp />} />
        {/* Customer Portal - /#/customer */}
        <Route path="/customer/*" element={<CustomerApp />} />
        {/* Partner Portal - /#/partner (only for registered partners) */}
        <Route path="/partner/*" element={<App />} />
        {/* Assignment Accept/Decline - /#/assignment/:token/:action */}
        <Route path="/assignment/:token/:action" element={<AssignmentPage />} />
        {/* B2B Landing Page - Default page for visitors */}
        <Route path="/b2b" element={<B2BLandingPage />} />
        <Route path="/*" element={<B2BLandingPage />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
