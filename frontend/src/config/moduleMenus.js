/**
 * MaxTA ERP - Module Menu Configurations
 * ========================================
 * Professional ERP module structure following industry standards
 * (GlassTrax, Pilot ERP, NetSuite patterns for glass fabrication)
 *
 * Each module defines:
 * - menuItems: Main navigation tabs (shown in mobile tab bar + desktop sidebar)
 * - quickActions: Create/action shortcuts (shown at top of sidebar)
 * - setupItems: Setup/configuration links (shown in sidebar under "Setup")
 * - reports: Available reports for this module
 *
 * DESIGN PRINCIPLES:
 * 1. Each module is self-contained - no cross-module navigation in menuItems
 * 2. Menu items limited to 9 max for mobile usability
 * 3. Setup/config items belong in setupItems, not main menu
 * 4. Items placed by business function (who uses it daily)
 */

// ═══════════════════════════════════════════════════════════════════
// SALES MODULE (Quote-to-Cash)
// Used by: Sales team, Account managers, Customer service
// Flow: Quote → Order → Shipment → Invoice → Payment
// ═══════════════════════════════════════════════════════════════════
export const salesMenu = {
  title: 'Sales',
  quickActions: [
    { label: 'New Quote', path: '/sales/quotes?new=true' },
    { label: 'New Order', path: '/sales/orders?new=true' },
    { label: 'New Shipment', path: '/sales/shipments?new=true' },
    { label: 'New Customer', path: '/sales/customers?new=true' },
    { label: 'Record Deposit', path: '/accounting/customer-payments?new=true' },
  ],
  setupItems: [
    { label: 'Customer Types', path: '/setup?tab=customer-types' },
    { label: 'Tax Groups', path: '/setup?tab=tax-groups' },
    { label: 'Carriers', path: '/setup?tab=carriers' },
    { label: 'Price Lists', path: '/setup?tab=price-lists' },
    { label: 'Salespeople', path: '/setup?tab=salespeople' },
    { label: 'Fabrication Charges', path: '/sales/fabrication-charges' },
  ],
  menuItems: [
    { label: 'Sales Home', path: '/sales', icon: '🏠' },
    { label: 'Quotes', path: '/sales/quotes', icon: '📝' },
    { label: 'Orders', path: '/sales/orders', icon: '📋' },
    { label: 'Shipments', path: '/sales/shipments', icon: '🚚' },
    { label: 'Invoices', path: '/sales/invoices', icon: '💰' },
    { label: 'Customers', path: '/sales/customers', icon: '👥' },
    { label: 'Fab Charges', path: '/sales/fabrication-charges', icon: '💲' },
  ],
  reports: {
    type: 'Sales',
    options: ['Sales Invoice Register', 'Open Orders', 'Bookings Report', 'Shipment Report', 'AR Aging Report', 'Sales by Customer', 'Sales by Product'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// MANUFACTURING MODULE (Production)
// Used by: Production managers, Shop floor operators, QC team
// Flow: WO Created → Released → In Progress → Complete → Closed
// Note: Work Centers & Routing are SETUP items (not daily-use pages)
// ═══════════════════════════════════════════════════════════════════
export const manufacturingMenu = {
  title: 'Manufacturing',
  quickActions: [
    { label: 'New Work Order', path: '/manufacturing/work-orders?new=true' },
    { label: 'Shop Floor', path: '/manufacturing/shop-floor' },
    { label: 'Log Labor', path: '/manufacturing/labor?new=true' },
  ],
  setupItems: [
    { label: 'Work Centers', path: '/manufacturing/work-centers' },
    { label: 'Routing Templates', path: '/manufacturing/routing-templates' },
  ],
  menuItems: [
    { label: 'Mfg Home', path: '/manufacturing', icon: '🏠' },
    { label: 'Work Orders', path: '/manufacturing/work-orders', icon: '📋' },
    { label: 'Shop Floor', path: '/manufacturing/shop-floor', icon: '🏭' },
    { label: 'Schedule', path: '/manufacturing/production-schedule', icon: '📅' },
    { label: 'BOM', path: '/manufacturing/bom', icon: '📦' },
    { label: 'Labor', path: '/manufacturing/labor', icon: '👷' },
    { label: 'Quality', path: '/manufacturing/quality', icon: '✅' },
    { label: 'Recuts', path: '/manufacturing/recuts', icon: '⚠️' },
    { label: 'Cutting', path: '/manufacturing/cutting-optimization', icon: '✂️' },
    { label: 'Lamination', path: '/lamination', icon: '🔲' },
  ],
  reports: {
    type: 'Manufacturing',
    options: ['Work Order Status', 'WO Cost Summary', 'Open Work Orders', 'Recut Report', 'Labor Report', 'Production Efficiency', 'Station Throughput'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// PURCHASING MODULE (Procure-to-Pay)
// Used by: Purchasing agents, Buyers, Receiving clerks
// Flow: PO → Receive → AP Invoice → Payment
// Note: Locations moved to Inventory (where they belong per ERP standards)
// ═══════════════════════════════════════════════════════════════════
export const purchasingMenu = {
  title: 'Purchasing',
  quickActions: [
    { label: 'New PO', path: '/purchasing/purchase-orders?new=true' },
    { label: 'New Vendor', path: '/purchasing/vendors?new=true' },
    { label: 'Buy for WO', path: '/purchasing/buy-for-wo' },
  ],
  setupItems: [
    { label: 'Vendor Items', path: '/purchasing/vendor-items' },
    { label: 'Vendor Types', path: '/setup?tab=vendor-types' },
  ],
  menuItems: [
    { label: 'Purchasing Home', path: '/purchasing', icon: '🏠' },
    { label: 'Purchase Orders', path: '/purchasing/purchase-orders', icon: '📋' },
    { label: 'Receiving', path: '/purchasing/receipts', icon: '📥' },
    { label: 'A/P Invoices', path: '/purchasing/ap-invoices', icon: '💰' },
    { label: 'Vendors', path: '/purchasing/vendors', icon: '🏢' },
    { label: 'Vendor Items', path: '/purchasing/vendor-items', icon: '📦' },
    { label: 'Buy for WO', path: '/purchasing/buy-for-wo', icon: '🔧' },
  ],
  reports: {
    type: 'Purchasing',
    options: ['Open PO Report', 'Receiving Report', 'Vendor Spend Analysis', 'AP Aging', 'PO Status'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// INVENTORY MODULE (Stock Management)
// Used by: Warehouse staff, Inventory controllers, Production planners
// Manages: Items, stock levels, locations, movements, MRP
// Note: Locations belong HERE (not Purchasing) per ERP standards
// ═══════════════════════════════════════════════════════════════════
export const inventoryMenu = {
  title: 'Inventory',
  quickActions: [
    { label: 'New Item', path: '/inventory/items?new=true' },
    { label: 'Adjustment', path: '/inventory/adjustments?new=true' },
    { label: 'Transfer', path: '/inventory/transfers?new=true' },
  ],
  setupItems: [
    { label: 'Item Types', path: '/setup?tab=item-types' },
    { label: 'Locations', path: '/inventory/locations' },
    { label: 'Location Groups', path: '/setup?tab=location-groups' },
    { label: 'Adjustment Codes', path: '/setup?tab=adjustment-codes' },
    { label: 'Scrap Codes', path: '/setup?tab=scrap-codes' },
  ],
  menuItems: [
    { label: 'Inventory Home', path: '/inventory', icon: '🏠' },
    { label: 'Items', path: '/inventory/items', icon: '📦' },
    { label: 'Locations', path: '/inventory/locations', icon: '📍' },
    { label: 'Adjustments', path: '/inventory/adjustments', icon: '📝' },
    { label: 'Transfers', path: '/inventory/transfers', icon: '🔄' },
    { label: 'Physical Count', path: '/inventory/physical-count', icon: '📋' },
    { label: 'MRP', path: '/inventory/mrp', icon: '📊' },
  ],
  reports: {
    type: 'Inventory',
    options: ['Stock Status', 'Inventory Valuation', 'Lot Tracking', 'Reorder Report', 'Inventory Movement'],
  },
};

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTING MODULE (Financial Management)
// Used by: Accountants, Controllers, CFO
// Manages: GL, AR, AP, Payments, Bank Reconciliation
// ═══════════════════════════════════════════════════════════════════
export const accountingMenu = {
  title: 'Accounting',
  quickActions: [
    { label: 'Journal Entry', path: '/accounting/journal-vouchers?new=true' },
    { label: 'Customer Payment', path: '/accounting/customer-payments?new=true' },
    { label: 'Vendor Payment', path: '/accounting/vendor-payments?new=true' },
  ],
  setupItems: [
    { label: 'GL Accounts', path: '/accounting/gl-accounts' },
    { label: 'Accounting Periods', path: '/setup?tab=accounting-periods' },
    { label: 'Banks', path: '/setup?tab=banks' },
    { label: 'GL Defaults', path: '/setup?tab=gl-defaults' },
  ],
  menuItems: [
    { label: 'Accounting Home', path: '/accounting', icon: '🏠' },
    { label: 'GL Accounts', path: '/accounting/gl-accounts', icon: '📊' },
    { label: 'Journal Vouchers', path: '/accounting/journal-vouchers', icon: '📝' },
    { label: 'A/R Invoices', path: '/accounting/ar-invoices', icon: '💰' },
    { label: 'A/P Invoices', path: '/accounting/ap-invoices', icon: '📄' },
    { label: 'Customer Payments', path: '/accounting/customer-payments', icon: '💳' },
    { label: 'Vendor Payments', path: '/accounting/vendor-payments', icon: '🏦' },
    { label: 'Bank Recon', path: '/accounting/bank-recon', icon: '🏛️' },
  ],
  reports: {
    type: 'Accounting',
    options: ['Trial Balance', 'Income Statement', 'Balance Sheet', 'GL Detail', 'AP Aging', 'AR Aging'],
  },
};
