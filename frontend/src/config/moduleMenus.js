/**
 * Shared module menu configurations for mobile tab bars and sidebars.
 * Each module defines its menuItems, quickActions, setupItems, and reports
 * so that every sub-page can render the same ModulePage wrapper consistently.
 */

export const salesMenu = {
  title: 'Sales',
  quickActions: [
    { label: 'New Quote', path: '/sales/quotes?new=true' },
    { label: 'New Order', path: '/sales/orders?new=true' },
    { label: 'New Shipment', path: '/sales/shipments?new=true' },
    { label: 'New Customer', path: '/sales/customers?new=true' },
  ],
  setupItems: [
    { label: 'Customer Types', path: '/setup?tab=customer-types' },
    { label: 'Tax Groups', path: '/setup?tab=tax-groups' },
    { label: 'Carriers', path: '/setup?tab=carriers' },
    { label: 'Price Lists', path: '/setup?tab=price-lists' },
    { label: 'Salespeople', path: '/setup?tab=salespeople' },
  ],
  menuItems: [
    { label: 'Sales Home', path: '/sales', icon: '🏠' },
    { label: 'Quotes', path: '/sales/quotes', icon: '📝' },
    { label: 'Orders', path: '/sales/orders', icon: '📋' },
    { label: 'Shipments', path: '/sales/shipments', icon: '🚚' },
    { label: 'A/R Invoices', path: '/sales/invoices', icon: '💰' },
    { label: 'Customers', path: '/sales/customers', icon: '👥' },
  ],
  reports: {
    type: 'Sales',
    options: ['Sales Invoice Register', 'Open Orders', 'Bookings Report', 'Shipment Report', 'Aging Report'],
  },
};

export const manufacturingMenu = {
  title: 'Manufacturing',
  quickActions: [
    { label: 'New Work Order', path: '/manufacturing/work-orders?new=true' },
    { label: 'Shop Floor', path: '/manufacturing/shop-floor' },
  ],
  setupItems: [
    { label: 'Work Centers', path: '/manufacturing/work-centers' },
    { label: 'Routing Templates', path: '/manufacturing/routing-templates' },
  ],
  menuItems: [
    { label: 'Mfg Home', path: '/manufacturing', icon: '🏠' },
    { label: 'Work Orders', path: '/manufacturing/work-orders', icon: '📋' },
    { label: 'Shop Floor', path: '/manufacturing/shop-floor', icon: '🏭' },
    { label: 'Quality', path: '/manufacturing/quality', icon: '✅' },
    { label: 'Schedule', path: '/manufacturing/production-schedule', icon: '📅' },
    { label: 'BOM', path: '/manufacturing/bom', icon: '📦' },
    { label: 'Labor', path: '/manufacturing/labor', icon: '👷' },
    { label: 'Recuts', path: '/manufacturing/recuts', icon: '⚠️' },
    { label: 'Cutting', path: '/manufacturing/cutting-optimization', icon: '✂️' },
    { label: 'Fab Charges', path: '/setup?tab=fabrication-charges', icon: '💲' },
    { label: 'Work Centers', path: '/manufacturing/work-centers', icon: '⚙️' },
    { label: 'Routing', path: '/manufacturing/routing-templates', icon: '🔄' },
  ],
  reports: {
    type: 'Manufacturing',
    options: ['Work Order Status', 'WO Cost Summary', 'Open Work Orders', 'Recut Report', 'Labor Report', 'Production Efficiency', 'Station Throughput'],
  },
};

export const purchasingMenu = {
  title: 'Purchasing',
  quickActions: [
    { label: 'New PO', path: '/purchasing/purchase-orders?new=true' },
    { label: 'New Vendor', path: '/purchasing/vendors?new=true' },
  ],
  setupItems: [
    { label: 'Locations', path: '/purchasing/locations' },
    { label: 'Vendor Items', path: '/purchasing/vendor-items' },
  ],
  menuItems: [
    { label: 'Purchasing Home', path: '/purchasing', icon: '🏠' },
    { label: 'Purchase Orders', path: '/purchasing/purchase-orders', icon: '📋' },
    { label: 'Receiving', path: '/purchasing/receipts', icon: '📥' },
    { label: 'A/P Invoices', path: '/purchasing/ap-invoices', icon: '💰' },
    { label: 'Vendors', path: '/purchasing/vendors', icon: '🏢' },
    { label: 'Vendor Items', path: '/purchasing/vendor-items', icon: '📦' },
    { label: 'Buy for WO', path: '/purchasing/buy-for-wo', icon: '🔧' },
    { label: 'Locations', path: '/purchasing/locations', icon: '📍' },
  ],
  reports: {
    type: 'Purchasing',
    options: ['Open PO Report', 'Receiving Report', 'Vendor Spend Analysis', 'AP Aging'],
  },
};

export const inventoryMenu = {
  title: 'Inventory',
  quickActions: [
    { label: 'New Item', path: '/inventory/items?new=true' },
    { label: 'Adjustment', path: '/inventory/adjustments?new=true' },
  ],
  setupItems: [
    { label: 'Locations', path: '/purchasing/locations' },
    { label: 'Item Categories', path: '/setup?tab=item-categories' },
  ],
  menuItems: [
    { label: 'Inventory Home', path: '/inventory', icon: '🏠' },
    { label: 'Items', path: '/inventory/items', icon: '📦' },
    { label: 'Adjustments', path: '/inventory/adjustments', icon: '📝' },
    { label: 'Transfers', path: '/inventory/transfers', icon: '🔄' },
    { label: 'Physical Count', path: '/inventory/physical-count', icon: '📋' },
    { label: 'MRP', path: '/inventory/mrp', icon: '📊' },
  ],
  reports: {
    type: 'Inventory',
    options: ['Stock Status', 'Inventory Valuation', 'Lot Tracking', 'Reorder Report'],
  },
};

export const accountingMenu = {
  title: 'Accounting',
  quickActions: [
    { label: 'Journal Entry', path: '/accounting/journal-vouchers?new=true' },
    { label: 'Record Payment', path: '/accounting/customer-payments?new=true' },
  ],
  setupItems: [
    { label: 'GL Accounts', path: '/accounting/gl-accounts' },
    { label: 'Periods', path: '/setup?tab=accounting-periods' },
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
