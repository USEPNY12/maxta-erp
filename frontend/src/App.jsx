import React, { useState, useEffect, createContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './services/api';
import Login from './pages/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InventoryHome from './pages/inventory/InventoryHome';
import Items from './pages/inventory/Items';
import ItemDetail from './pages/inventory/ItemDetail';
import SalesHome from './pages/sales/SalesHome';
import Customers from './pages/sales/Customers';
import Quotes from './pages/sales/Quotes';
import SalesOrders from './pages/sales/SalesOrders';
import Shipments from './pages/sales/Shipments';
import Invoices from './pages/sales/Invoices';
import ManufacturingHome from './pages/manufacturing/ManufacturingHome';
import WorkOrders from './pages/manufacturing/WorkOrders';
import BillOfMaterials from './pages/manufacturing/BillOfMaterials';
import WOTransactions from './pages/manufacturing/WOTransactions';
import ShopFloor from './pages/manufacturing/ShopFloor';
import ProductionSchedule from './pages/manufacturing/ProductionSchedule';
import Labor from './pages/manufacturing/Labor';
import QualityControl from './pages/manufacturing/QualityControl';
import WorkCenters from './pages/manufacturing/WorkCenters';
import RoutingTemplates from './pages/manufacturing/RoutingTemplates';
import Recuts from './pages/manufacturing/Recuts';
import PurchasingHome from './pages/purchasing/PurchasingHome';
import PurchaseOrders from './pages/purchasing/PurchaseOrders';
import Vendors from './pages/purchasing/Vendors';
import POReceipts from './pages/purchasing/POReceipts';
import AccountingHome from './pages/accounting/AccountingHome';
import GLAccounts from './pages/accounting/GLAccounts';
import JournalVouchers from './pages/accounting/JournalVouchers';
import ARInvoices from './pages/accounting/ARInvoices';
import APInvoices from './pages/accounting/APInvoices';
import CustomerPayments from './pages/accounting/CustomerPayments';
import VendorPayments from './pages/accounting/VendorPayments';
import BankReconciliation from './pages/accounting/BankReconciliation';
import Reports from './pages/Reports';
import SystemSetup from './pages/SystemSetup';

export const AuthContext = createContext(null);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      api.get('/api/auth/profile')
        .then(res => setUser(res.data))
        .catch(() => localStorage.removeItem('erp_token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/api/auth/login', { username, password });
    localStorage.setItem('erp_token', res.data.token);
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    setUser(null);
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          {/* Inventory */}
          <Route path="inventory" element={<InventoryHome />} />
          <Route path="inventory/items" element={<Items />} />
          <Route path="inventory/items/:id" element={<ItemDetail />} />
          {/* Sales */}
          <Route path="sales" element={<SalesHome />} />
          <Route path="sales/customers" element={<Customers />} />
          <Route path="sales/quotes" element={<Quotes />} />
          <Route path="sales/orders" element={<SalesOrders />} />
          <Route path="sales/shipments" element={<Shipments />} />
          <Route path="sales/invoices" element={<Invoices />} />
          {/* Manufacturing */}
          <Route path="manufacturing" element={<ManufacturingHome />} />
          <Route path="manufacturing/work-orders" element={<WorkOrders />} />
          <Route path="manufacturing/bom" element={<BillOfMaterials />} />
          <Route path="manufacturing/wo-transactions" element={<WOTransactions />} />
          <Route path="manufacturing/shop-floor" element={<ShopFloor />} />
          <Route path="manufacturing/production-schedule" element={<ProductionSchedule />} />
          <Route path="manufacturing/labor" element={<Labor />} />
          <Route path="manufacturing/quality" element={<QualityControl />} />
          <Route path="manufacturing/work-centers" element={<WorkCenters />} />
          <Route path="manufacturing/routing-templates" element={<RoutingTemplates />} />
          <Route path="manufacturing/recuts" element={<Recuts />} />
          {/* Purchasing */}
          <Route path="purchasing" element={<PurchasingHome />} />
          <Route path="purchasing/purchase-orders" element={<PurchaseOrders />} />
          <Route path="purchasing/vendors" element={<Vendors />} />
          <Route path="purchasing/receipts" element={<POReceipts />} />
          {/* Accounting */}
          <Route path="accounting" element={<AccountingHome />} />
          <Route path="accounting/gl-accounts" element={<GLAccounts />} />
          <Route path="accounting/journal-vouchers" element={<JournalVouchers />} />
          <Route path="accounting/ar-invoices" element={<ARInvoices />} />
          <Route path="accounting/ap-invoices" element={<APInvoices />} />
          <Route path="accounting/customer-payments" element={<CustomerPayments />} />
          <Route path="accounting/vendor-payments" element={<VendorPayments />} />
          <Route path="accounting/bank-reconciliation" element={<BankReconciliation />} />
          {/* Reports & Setup */}
          <Route path="reports" element={<Reports />} />
          <Route path="setup" element={<SystemSetup />} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
