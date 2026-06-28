import React, { useState, useEffect, createContext, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import api from './services/api';
import Login from './pages/Login';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';

// Lazy-loaded modules (code splitting per module)
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Scanner = lazy(() => import('./pages/Scanner'));

// Inventory
const InventoryHome = lazy(() => import('./pages/inventory/InventoryHome'));
const Items = lazy(() => import('./pages/inventory/Items'));
const ItemDetail = lazy(() => import('./pages/inventory/ItemDetail'));
const MRP = lazy(() => import('./pages/inventory/MRP'));
const PhysicalCount = lazy(() => import('./pages/inventory/PhysicalCount'));
const InventoryAdjustments = lazy(() => import('./pages/inventory/InventoryAdjustments'));
const InventoryTransfers = lazy(() => import('./pages/inventory/InventoryTransfers'));
const InventoryLocations = lazy(() => import('./pages/inventory/Locations'));

// Sales
const SalesHome = lazy(() => import('./pages/sales/SalesHome'));
const Customers = lazy(() => import('./pages/sales/Customers'));
const Quotes = lazy(() => import('./pages/sales/Quotes'));
const SalesOrders = lazy(() => import('./pages/sales/SalesOrders'));
const Shipments = lazy(() => import('./pages/sales/Shipments'));
const Invoices = lazy(() => import('./pages/sales/Invoices'));
const SalesFabricationCharges = lazy(() => import('./pages/sales/FabricationCharges'));

// Manufacturing
const ManufacturingHome = lazy(() => import('./pages/manufacturing/ManufacturingHome'));
const WorkOrders = lazy(() => import('./pages/manufacturing/WorkOrders'));
const BillOfMaterials = lazy(() => import('./pages/manufacturing/BillOfMaterials'));
const WOTransactions = lazy(() => import('./pages/manufacturing/WOTransactions'));
const ShopFloor = lazy(() => import('./pages/manufacturing/ShopFloor'));
const ProductionSchedule = lazy(() => import('./pages/manufacturing/ProductionSchedule'));
const Labor = lazy(() => import('./pages/manufacturing/Labor'));
const QualityControl = lazy(() => import('./pages/manufacturing/QualityControl'));
const WorkCenters = lazy(() => import('./pages/manufacturing/WorkCenters'));
const RoutingTemplates = lazy(() => import('./pages/manufacturing/RoutingTemplates'));
const Recuts = lazy(() => import('./pages/manufacturing/Recuts'));
const CuttingOptimization = lazy(() => import('./pages/manufacturing/CuttingOptimization'));
const ProductionDashboard = lazy(() => import('./pages/manufacturing/ProductionDashboard'));
const ScheduleGantt = lazy(() => import('./pages/manufacturing/ScheduleGantt'));
const MachineUtilization = lazy(() => import('./pages/manufacturing/MachineUtilization'));
const BarcodeStation = lazy(() => import('./pages/manufacturing/BarcodeStation'));
const QCInspection = lazy(() => import('./pages/manufacturing/QCInspection'));

// Purchasing
const PurchasingHome = lazy(() => import('./pages/purchasing/PurchasingHome'));
const PurchaseOrders = lazy(() => import('./pages/purchasing/PurchaseOrders'));
const Vendors = lazy(() => import('./pages/purchasing/Vendors'));
const POReceipts = lazy(() => import('./pages/purchasing/POReceipts'));
const VendorItems = lazy(() => import('./pages/purchasing/VendorItems'));
const BuyForWO = lazy(() => import('./pages/purchasing/BuyForWO'));
const Locations = lazy(() => import('./pages/purchasing/Locations'));
const PurchasingAPInvoices = lazy(() => import('./pages/purchasing/APInvoices'));

// Accounting
const AccountingHome = lazy(() => import('./pages/accounting/AccountingHome'));
const GLAccounts = lazy(() => import('./pages/accounting/GLAccounts'));
const JournalVouchers = lazy(() => import('./pages/accounting/JournalVouchers'));
const ARInvoices = lazy(() => import('./pages/accounting/ARInvoices'));
const APInvoices = lazy(() => import('./pages/accounting/APInvoices'));
const CustomerPayments = lazy(() => import('./pages/accounting/CustomerPayments'));
const VendorPayments = lazy(() => import('./pages/accounting/VendorPayments'));
const BankReconciliation = lazy(() => import('./pages/accounting/BankReconciliation'));
// Phase 7 - Advanced Accounting & Finance
const BudgetManager = lazy(() => import('./pages/accounting/BudgetManager'));
const CashFlowDashboard = lazy(() => import('./pages/accounting/CashFlowDashboard'));
const TaxReporting = lazy(() => import('./pages/accounting/TaxReporting'));
const FinancialDashboard = lazy(() => import('./pages/accounting/FinancialDashboard'));

// Other modules
const Reports = lazy(() => import('./pages/Reports'));
const SystemSetup = lazy(() => import('./pages/SystemSetup'));
const SmartGlazier = lazy(() => import('./pages/SmartGlazier'));
const Dispatch = lazy(() => import('./pages/Dispatch'));
const CRM = lazy(() => import('./pages/CRM'));
const GanttSchedule = lazy(() => import('./pages/GanttSchedule'));
const Notifications = lazy(() => import('./pages/Notifications'));
const DocManagement = lazy(() => import('./pages/DocManagement'));
const Lamination = lazy(() => import('./pages/Lamination'));
const ApprovalQueue = lazy(() => import('./pages/ApprovalQueue'));
const Commissions = lazy(() => import('./pages/Commissions'));
const PricingMatrix = lazy(() => import('./pages/PricingMatrix'));
const DocumentCenter = lazy(() => import('./components/DocumentCenter'));
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));

// Phase 8 - Dashboard & Promotions
const ExecutiveDashboard = lazy(() => import('./pages/ExecutiveDashboard'));
const PromotionsManager = lazy(() => import('./pages/PromotionsManager'));

// Phase 9 - Mobile App Readiness (PWA, Kiosk, Push, Offline Scanner)
const KioskMode = lazy(() => import('./pages/KioskMode'));
const NotificationSettings = lazy(() => import('./pages/NotificationSettings'));
const OfflineScanner = lazy(() => import('./pages/OfflineScanner'));

// Shipping & Logistics (Phase 5)
const ShippingDashboard = lazy(() => import('./pages/shipping/ShippingDashboard'));
const DeliveryPlanner = lazy(() => import('./pages/shipping/DeliveryPlanner'));
const RackLoading = lazy(() => import('./pages/shipping/RackLoading'));
const DriverView = lazy(() => import('./pages/shipping/DriverView'));
const FreightCosts = lazy(() => import('./pages/shipping/FreightCosts'));

// Phase 11 - Service & Operations Modules
const Maintenance = lazy(() => import('./pages/Maintenance'));
const FieldService = lazy(() => import('./pages/FieldService'));
const Warranty = lazy(() => import('./pages/Warranty'));
const TimeAttendance = lazy(() => import('./pages/TimeAttendance'));

export const AuthContext = createContext(null);

// Loading fallback for lazy-loaded modules
function ModuleLoader() {
  return (
    <div className="module-loader">
      <div className="module-loader-spinner"></div>
      <p>Loading module...</p>
    </div>
  );
}

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

  if (loading) return <div className="module-loader"><div className="module-loader-spinner"></div><p>Loading MaxTA ERP...</p></div>;

  return (
    <ToastProvider>
    <AuthContext.Provider value={{ user, login, logout, permissions, permChecker }}>
      <ErrorBoundary>
      <Suspense fallback={<ModuleLoader />}>
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
          <Route path="inventory/adjustments" element={<ProtectedModule module="inventory" permissions={permissions}><InventoryAdjustments /></ProtectedModule>} />
          <Route path="inventory/transfers" element={<ProtectedModule module="inventory" permissions={permissions}><InventoryTransfers /></ProtectedModule>} />
          <Route path="inventory/locations" element={<ProtectedModule module="inventory" permissions={permissions}><InventoryLocations /></ProtectedModule>} />
          {/* Sales */}
          <Route path="sales" element={<ProtectedModule module="sales" permissions={permissions}><SalesHome /></ProtectedModule>} />
          <Route path="sales/customers" element={<ProtectedModule module="sales" permissions={permissions}><Customers /></ProtectedModule>} />
          <Route path="sales/quotes" element={<ProtectedModule module="sales" permissions={permissions}><Quotes /></ProtectedModule>} />
          <Route path="sales/orders" element={<ProtectedModule module="sales" permissions={permissions}><SalesOrders /></ProtectedModule>} />
          <Route path="sales/shipments" element={<ProtectedModule module="sales" permissions={permissions}><Shipments /></ProtectedModule>} />
          <Route path="sales/invoices" element={<ProtectedModule module="sales" permissions={permissions}><Invoices /></ProtectedModule>} />
          <Route path="sales/fabrication-charges" element={<ProtectedModule module="sales" permissions={permissions}><SalesFabricationCharges /></ProtectedModule>} />
          <Route path="sales/approvals" element={<ProtectedModule module="sales" permissions={permissions}><ApprovalQueue /></ProtectedModule>} />
          <Route path="sales/commissions" element={<ProtectedModule module="sales" permissions={permissions}><Commissions /></ProtectedModule>} />
          <Route path="sales/pricing-matrix" element={<ProtectedModule module="sales" permissions={permissions}><PricingMatrix /></ProtectedModule>} />
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
          <Route path="manufacturing/production-dashboard" element={<ProtectedModule module="manufacturing" permissions={permissions}><ProductionDashboard /></ProtectedModule>} />
          <Route path="manufacturing/schedule-gantt" element={<ProtectedModule module="manufacturing" permissions={permissions}><ScheduleGantt /></ProtectedModule>} />
          <Route path="manufacturing/machine-utilization" element={<ProtectedModule module="manufacturing" permissions={permissions}><MachineUtilization /></ProtectedModule>} />
          <Route path="manufacturing/barcode-station" element={<ProtectedModule module="manufacturing" permissions={permissions}><BarcodeStation /></ProtectedModule>} />
          <Route path="manufacturing/qc-inspection" element={<ProtectedModule module="manufacturing" permissions={permissions}><QCInspection /></ProtectedModule>} />
          {/* Purchasing */}
          <Route path="purchasing" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchasingHome /></ProtectedModule>} />
          <Route path="purchasing/purchase-orders" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchaseOrders /></ProtectedModule>} />
          <Route path="purchasing/vendors" element={<ProtectedModule module="purchasing" permissions={permissions}><Vendors /></ProtectedModule>} />
          <Route path="purchasing/receipts" element={<ProtectedModule module="purchasing" permissions={permissions}><POReceipts /></ProtectedModule>} />
          <Route path="purchasing/ap-invoices" element={<ProtectedModule module="purchasing" permissions={permissions}><PurchasingAPInvoices /></ProtectedModule>} />
          {/* purchasing/invoices removed - duplicate of purchasing/ap-invoices */}
          <Route path="purchasing/vendor-items" element={<ProtectedModule module="purchasing" permissions={permissions}><VendorItems /></ProtectedModule>} />
          <Route path="purchasing/buy-for-wo" element={<ProtectedModule module="purchasing" permissions={permissions}><BuyForWO /></ProtectedModule>} />
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
          {/* Phase 7 - Advanced Accounting */}
          <Route path="accounting/budget-manager" element={<ProtectedModule module="accounting" permissions={permissions}><BudgetManager /></ProtectedModule>} />
          <Route path="accounting/cash-flow" element={<ProtectedModule module="accounting" permissions={permissions}><CashFlowDashboard /></ProtectedModule>} />
          <Route path="accounting/tax-reporting" element={<ProtectedModule module="accounting" permissions={permissions}><TaxReporting /></ProtectedModule>} />
          <Route path="accounting/financial-dashboard" element={<ProtectedModule module="accounting" permissions={permissions}><FinancialDashboard /></ProtectedModule>} />
          {/* Reports & Setup */}
          <Route path="reports" element={<ProtectedModule module="reports" permissions={permissions}><Reports /></ProtectedModule>} />
          <Route path="setup" element={<ProtectedModule module="system_setup" permissions={permissions}><SystemSetup /></ProtectedModule>} />
          {/* New V3 Modules */}
          <Route path="smart-glazier" element={<SmartGlazier />} />
          <Route path="dispatch" element={<Dispatch />} />
          <Route path="crm" element={<CRM />} />
          <Route path="gantt-schedule" element={<GanttSchedule />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="documents" element={<DocManagement />} />
          <Route path="lamination" element={<ProtectedModule module="manufacturing" permissions={permissions}><Lamination /></ProtectedModule>} />
          <Route path="document-center" element={<DocumentCenter />} />
          {/* Phase 8 - Dashboard & Promotions */}
          <Route path="executive-dashboard" element={<ExecutiveDashboard />} />
          <Route path="promotions" element={<ProtectedModule module="system_setup" permissions={permissions}><PromotionsManager /></ProtectedModule>} />
          {/* Phase 9 - Mobile App Readiness */}
          <Route path="notification-settings" element={<NotificationSettings />} />
          <Route path="offline-scanner" element={<OfflineScanner />} />
          {/* Shipping & Logistics (Phase 5) */}
          <Route path="shipping" element={<ShippingDashboard />} />
          <Route path="shipping/routes" element={<DeliveryPlanner />} />
          <Route path="shipping/rack-loading" element={<RackLoading />} />
          <Route path="shipping/fleet" element={<DriverView />} />
          <Route path="shipping/freight" element={<FreightCosts />} />
          {/* Phase 11 - Service & Operations */}
          <Route path="maintenance" element={<Maintenance />} />
          <Route path="field-service" element={<FieldService />} />
          <Route path="warranty" element={<Warranty />} />
          <Route path="time-attendance" element={<TimeAttendance />} />
        </Route>
        {/* Kiosk Mode - standalone full-screen route (no Layout wrapper) */}
        <Route path="/kiosk" element={user ? <KioskMode /> : <Navigate to="/login" />} />
        {/* Customer Portal - public route (no auth required) */}
        <Route path="/portal/:token" element={<CustomerPortal />} />
        <Route path="/portal/document/:token" element={<CustomerPortal />} />
      </Routes>
      </Suspense>
      </ErrorBoundary>
    </AuthContext.Provider>
    </ToastProvider>
  );
}

export default App;
