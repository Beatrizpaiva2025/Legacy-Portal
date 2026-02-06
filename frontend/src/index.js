import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App";
import AdminApp from "./AdminApp";
import TraduxAdminApp from "./TraduxAdminApp";
import CustomerApp from "./CustomerApp";
import SalespersonApp from "./SalespersonApp";
import B2BLandingPage from "./B2BLandingPage";
import AssignmentPage from "./AssignmentPage";
import VerificationPage from "./VerificationPage";
import ExternalTranslatorApp from "./ExternalTranslatorApp";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <HashRouter>
      <Routes>
        {/* TRADUX Admin Panel - /#/tradux-admin */}
        <Route path="/tradux-admin/*" element={<TraduxAdminApp />} />
        {/* Legacy Admin Panel - /#/admin */}
        <Route path="/admin/*" element={<AdminApp />} />
        {/* Customer Portal - /#/customer */}
        <Route path="/customer/*" element={<CustomerApp />} />
        {/* Partner Portal - /#/partner (landing page for partners) */}
        <Route path="/partner" element={<B2BLandingPage />} />
        {/* Partner Dashboard - /#/partner/dashboard (for logged in partners) */}
        <Route path="/partner/*" element={<App />} />
        {/* Salesperson Portal - /#/sales */}
        <Route path="/sales/*" element={<SalespersonApp />} />
        <Route path="/sales-invite" element={<SalespersonApp />} />
        {/* External Translator Portal - /#/external */}
        <Route path="/external/*" element={<ExternalTranslatorApp />} />
        {/* Assignment Accept/Decline - /#/assignment/:token/:action */}
        <Route path="/assignment/:token/:action" element={<AssignmentPage />} />
        {/* Document Verification - /#/verify/:certificationId */}
        <Route path="/verify/:certificationId" element={<VerificationPage />} />
        <Route path="/verify" element={<VerificationPage />} />
        {/* B2B Landing Page - Alternative route */}
        <Route path="/b2b" element={<B2BLandingPage />} />
        {/* Customer Portal - Default page for visitors to request quotes */}
        <Route path="/*" element={<CustomerApp />} />
      </Routes>
    </HashRouter>
  </React.StrictMode>,
);
