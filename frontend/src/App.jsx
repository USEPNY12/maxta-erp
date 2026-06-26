import React, { useState, useEffect, createContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import api from './services/api';
import Login from './pages/Login';
import Scanner from "./pages/Scanner";
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import InventoryHome from './pages/inventory/InventoryHome';
import Items from './pages/inventory/Items';
import ItemDetail from './pages/inventory/ItemDetail';
import MRP from './pages/inventory/MRP';
import PhysicalCount from './pages/inventory/PhysicalCount';
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
import CuttingOptimization from './pages/manufacturing/CuttingOptimization';
import PurchasingHome from './pages/purchasing/PurchasingHome';
import PurchaseOrders from './pages/purchasing/PurchaseOrders';
import Vendors from './pages/purchasing/Vendors';
import POReceipts from './pages/purchasing/POReceipts';
import Locations from './pages/purchasing/Locations';
import PurchasingAPInvoices from './pages/purchasing/APInvoices';
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

// Permission check helper - can be used by any component via context
function createPermissionChecker(permissions) {
  return {
    canView: (module) => permissions?.[module]?.includes('view') ?? false,
    canCreate: (module) => permissions?.[module]?.includes('create') ?? false,
    canEdit: (module) => permissions?.[module]?.includes('edit') ?? false,
    canDelete: (module) => permissions?.[module]?.includes('delete') ?? false,
    canApprove: (module) => permissions?.[module]?.includes('approve') ?? false,
    canPost: (module) => permissions?.[module]?.includes('post') ?? false,
    hasAny: (module) => !!permissions?.[module] && permissions[module].length > 0,
  };
}

// Access denied component
function AccessDenied() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', color: '#64748b' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
      <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>Access Denied</h2>
      <p style={{ margin: '8px 0 0', fontSize: 14 }}>You do not have permission to access this module. Contact your administrator.</p>
    </div>
  );
}

// Protected route wrapper
function ProtectedModule({ module, children, permissions }) {
  const checker = createPermissionChecker(permissions);
  if (!checker.hasAny(module)) return <AccessDenied />;
  return children;
}

function App() {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadPermissions = async () => {
    try {
      const res = await api.get('/api/setup/permissions/me');
      setPermissions(res.data.permissions);
    } catch (e) {
      console.error('Failed to load permissions', e);
      setPermissions({});
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('erp_token');
    if (token) {
      api.get('/api/auth/profile')
        .then(res => {
          setUser(res.data);
          return loadPermissions();
        })
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
    await loadPermissions();
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    setUser(null);
    setPermissions(null);
  };

  const permChecker = createPermissionChecker(permissions);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <AuthContext.Provider value={{ user, login, logout, permissions, permChecker }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/scanner" element={user ? <Scanner /> : <Navigate to="/login" />} />
        <Route path="/" element={user ? <Layout /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard />} />
          {/* Inventory */}
          <Route path="inventory" element={<ProtectedModule module="inventory" permissions={permissions}><InventoryHome /></ProtectedModule>} />
          <Route path="inventory/items" element={<ProtectedModule module="inventory" permissions={permissions}><Items /></ProtectedModule>} />
          <Route path="inventory/items/:id" element={<ProtectedModule module="inventory" permissions={permissions}><ItemDetail /></ProtectedModule>} />
          <Route path="inventory/mrp" element={<ProtectedModule module="inventory" permissions={permissions}><MRP /></ProtectedModule>} />
          <Route path="inventory/physical-count" element={<ProtectedModule module="inventory" permissions={permissions}><PhysicalCount /></ProtectedModule>} />
          {/* Sales */}
          <Route path="sales" element={<ProtectedModule module="sales" permissions={permissions}><SalesHome /></ProtectedModule>} />
          <Route path="sales/customers" element={<ProtectedModule module="sales" permissions={permissions}><Customers /></ProtectedModule>} />
          <Route path="sales/quotes" element={<ProtectedModule module="sales" permissions={permissions}><Quotes /></ProtectedModule>} />
          <Route path="sales/orders" element={<ProtectedModule module="sales" permissions={permissions}><SalesOrders /></ProtectedModule>} />
          <Route path="sales/shipments" element={<ProtectedModule module="sales" permissions={permissions}><Shipments /></ProtectedModule>} />
          <Route path="sales/invoices" element={<ProtectedModule module="sales" permissions={permissions}><Invoices /></ProtectedModule>} />
          {/* Manufacturing */}
          <Route path="manufacturing" element={<ProtectedModule module="manufacturing" permissions={permissions}><ManufacturingHome /></ProtectedModule>} />
          <Route path="manufacturing/work-orders" element={<ProtectedModule module="manufacturing" permissions={permissions}><WorkOrders /></ProtectedModule>} />
          <Route path="manufacturing/bom" element={<ProtectedModule module="manufacturing" permissions={permissions}><BillOfMaterials /></ProtectedModule>} />
          <Route path="manufacturing/wo-transactions" element={<ProtectedModule module="manufacturing" permissions={permissions}><WOTransactions /></ProtectedModule>} />
          <Route path="manufacturing/shop-floor" element={<ProtectedModule module="manufacturing" permissions={permissions}><ShopFloor /></ProtectedModule>} />
          <Route path="manufacturing/production-schedule" element={<ProtectedModule module="manufacturing" permissions={permissions}><ProductionSchedule /></ProtectedModule>} />
          <Route path="manufacturing/labor" element={<ProtectedModule module="manufacturing" permissions={permissions}><Labor /></ProtectedModule>} />
          <Route path="manufacturing/quality" element={<ProtectedModule module="manufacturing" permissions={permissions}><QualityControl /></ProtectedModule>} />
          <Route path="manufacturing/work-centers" element={<ProtectedModule module="manufacturing" permissions={permissions}><WorkCenters /></ProtectedModule>} />
          <Route path="manufacturing/routing-templates" element={<ProtectedModule module="manufacturing" permissions={permissions}><RoutingTemplates /></ProtectedModule>} />
          <Route path="manufacturing/recuts" element={<ProtectedModule module="manufacturing" permissions={permissions}><Recuts /></ProtectedModule>} />
          <Route path="manufacturing/cutting-optimization" element={<ProtectedModule module="manufacturing" permissions={permissions}><CuttingOptimization /></ProtectedModule>} />
          {/* Purchasing */}
          <Route path="purchasing" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchasingHome /></ProtectedModule>} />
          <Route path="purchasing/purchase-orders" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchaseOrders /></ProtectedModule>} />
          <Route path="purchasing/vendors" element={<ProtectedModule module="purchasing" permissions={permissions}><Vendors /></ProtectedModule>} />
          <Route path="purchasing/receipts" element={<ProtectedModule module="purchasing" permissions={permissions}><POReceipts /></ProtectedModule>} />
          <Route path="purchasing/ap-invoices" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchasingAPInvoices /></ProtectedModule>} />
          <Route path="purchasing/locations" element={<ProtectedModule module="purchasing" permissions={permissions}><Locations /></ProtectedModule>} />
          {/* Accounting */}
          <Route path="accounting" element={<ProtectedModule module="accounting" permissions={permissions}><AccountingHome /></ProtectedModule>} />
          <Route path="accounting/gl-accounts" element={<ProtectedModule module="accounting" permissions={permissions}><GLAccounts /></ProtectedModule>} />
          <Route path="accounting/journal-vouchers" element={<ProtectedModule module="accounting" permissions={permissions}><JournalVouchers /></ProtectedModule>} />
          <Route path="accounting/ar-invoices" element={<ProtectedModule module="accounting" permissions={permissions}><ARInvoices /></ProtectedModule>} />
          <Route path="accounting/ap-invoices" element={<ProtectedModule module="accounting" permissions={permissions}><APInvoices /></ProtectedModule>} />
          <Route path="accounting/customer-payments" element={<ProtectedModule module="accounting" permissions={permissions}><CustomerPayments /></ProtectedModule>} />
          <Route path="accounting/vendor-payments" element={<ProtectedModule module="accounting" permissions={permissions}><VendorPayments /></ProtectedModule>} />
          <Route path="accounting/bank-recon" element={<ProtectedModule module="accounting" permissions={permissions}><BankReconciliation /></ProtectedModule>} />
          {/* Reports & Setup */}
          <Route path="reports" element={<ProtectedModule module="reports" permissions={permissions}><Reports /></ProtectedModule>} />
          <Route path="setup" element={<ProtectedModule module="system_setup" permissions={permissions}><SystemSetup /></ProtectedModule>} />
        </Route>
      </Routes>
    </AuthContext.Provider>
  );
}

export default App;
