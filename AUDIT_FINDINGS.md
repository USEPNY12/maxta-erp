# MaxTA ERP - Comprehensive Audit Findings & Fixes

## Executive Summary
Full line-by-line audit of module structure, navigation, tab locations, and code organization
following professional ERP standards (GlassTrax, Pilot ERP, NetSuite patterns).

---

## CRITICAL ISSUES FOUND

### 1. Locations Page - WRONG MODULE
- **Current**: Under Purchasing (`/purchasing/locations`)
- **Problem**: Locations (warehouses, bins, zones) are an INVENTORY concept. In every professional ERP (SAP, NetSuite, Pilot ERP), locations belong to Inventory/Warehouse Management.
- **Impact**: Inventory module's setupItems links to `/purchasing/locations` (cross-module dependency)
- **Fix**: Move Locations to Inventory module (`/inventory/locations`)

### 2. Duplicate A/P Invoice Pages
- **Current**: THREE separate AP Invoice files:
  - `purchasing/APInvoices.jsx` (full-featured with 3-way match, payment)
  - `purchasing/PurchasingAPInvoices.jsx` (simple list, calls accounting endpoint)
  - `accounting/APInvoices.jsx` (create/post AP invoices)
- **Problem**: Confusing duplication. Professional ERPs have ONE AP Invoice page accessible from both Purchasing and Accounting menus.
- **Fix**: Keep `purchasing/APInvoices.jsx` (most complete), remove duplicate, route both paths to it

### 3. WO Transactions - ORPHANED PAGE (No Menu Entry)
- **Current**: Route exists (`/manufacturing/wo-transactions`) but NO menu item
- **Problem**: Users can never navigate to this page
- **Fix**: Add to Manufacturing menu or merge into Work Orders detail

### 4. Duplicate Route for Purchasing Invoices
- **Current**: Both `/purchasing/ap-invoices` AND `/purchasing/invoices` route to same component
- **Problem**: Redundant route, confusing
- **Fix**: Remove `/purchasing/invoices` route (keep `/purchasing/ap-invoices`)

### 5. Inventory Menu Links to Purchasing Module
- **Current**: Inventory's setupItems has `{ label: 'Locations', path: '/purchasing/locations' }`
- **Problem**: Cross-module navigation breaks the module isolation principle
- **Fix**: After moving Locations to Inventory, update path to `/inventory/locations`

### 6. Manufacturing Menu Too Long (11 items)
- **Current**: 11 items in tab bar - too many for mobile scrolling
- **Problem**: Professional ERPs group items. Work Centers and Routing are SETUP items, not daily-use pages.
- **Fix**: Remove Work Centers and Routing from main menuItems (they're already in setupItems). Keeps menu to 9 items max.

### 7. Fab Charges Links to Setup Page Instead of Direct Page
- **Current**: `{ label: 'Fab Charges', path: '/setup?tab=fabrication-charges' }`
- **Problem**: Navigates away from Sales module to System Setup. Breaks module context.
- **Fix**: Create a direct route `/sales/fabrication-charges` that renders FabricationCharges within Sales module wrapper

### 8. A/R Invoices in Sales vs Accounting
- **Current**: Sales has `/sales/invoices` (Invoices.jsx) AND Accounting has `/accounting/ar-invoices` (ARInvoices.jsx)
- **Problem**: Two different pages for the same data. Sales version is for creating invoices from shipments. Accounting version is for posting/managing.
- **Correct ERP Pattern**: Sales creates invoices, Accounting posts/manages them. Both should show the same data but with different actions available.
- **Fix**: Keep both but ensure they share the same data source (they already do - both call `/api/sales/invoices`)

### 9. Customer Payments in Accounting Only
- **Current**: Customer Payments only in Accounting menu
- **Problem**: In glass fabrication, sales team often records deposits. Should be accessible from Sales too.
- **Fix**: Add "Deposits" link in Sales quickActions pointing to `/accounting/customer-payments`

### 10. Lamination Not in Manufacturing Menu
- **Current**: Lamination is a standalone page at `/lamination` with its own nav item
- **Problem**: Lamination IS a manufacturing process. Should be accessible from Manufacturing menu.
- **Fix**: Add Lamination to Manufacturing menuItems

---

## MODULE STRUCTURE CORRECTIONS (Professional ERP Standard)

### SALES Module (Quote-to-Cash)
| Tab | Path | Purpose | Status |
|-----|------|---------|--------|
| Sales Home | /sales | Dashboard & flow | ✅ Correct |
| Quotes | /sales/quotes | Create/manage quotes | ✅ Correct |
| Sales Orders | /sales/orders | Manage orders | ✅ Correct |
| Shipments | /sales/shipments | Pick/pack/ship | ✅ Correct |
| Invoices | /sales/invoices | Create AR invoices | ✅ Correct |
| Customers | /sales/customers | Customer master | ✅ Correct |
| Fab Charges | /sales/fabrication-charges | Pricing setup | ⚠️ FIX: Direct route |

### MANUFACTURING Module (Production)
| Tab | Path | Purpose | Status |
|-----|------|---------|--------|
| Mfg Home | /manufacturing | Dashboard | ✅ Correct |
| Work Orders | /manufacturing/work-orders | WO management | ✅ Correct |
| Shop Floor | /manufacturing/shop-floor | Station tracking | ✅ Correct |
| Quality | /manufacturing/quality | QC/NCR | ✅ Correct |
| Schedule | /manufacturing/production-schedule | Planning | ✅ Correct |
| BOM | /manufacturing/bom | Bill of Materials | ✅ Correct |
| Labor | /manufacturing/labor | Time tracking | ✅ Correct |
| Recuts | /manufacturing/recuts | Defect tracking | ✅ Correct |
| Cutting | /manufacturing/cutting-optimization | Nesting | ✅ Correct |
| Lamination | /lamination | Laminated glass | ⚠️ ADD to menu |
| Work Centers | /manufacturing/work-centers | Setup | ❌ REMOVE from menu (keep in Setup) |
| Routing | /manufacturing/routing-templates | Setup | ❌ REMOVE from menu (keep in Setup) |

### PURCHASING Module (Procure-to-Pay)
| Tab | Path | Purpose | Status |
|-----|------|---------|--------|
| Purchasing Home | /purchasing | Dashboard | ✅ Correct |
| Purchase Orders | /purchasing/purchase-orders | PO management | ✅ Correct |
| Receiving | /purchasing/receipts | PO receipts | ✅ Correct |
| A/P Invoices | /purchasing/ap-invoices | Vendor invoices | ✅ Correct |
| Vendors | /purchasing/vendors | Vendor master | ✅ Correct |
| Vendor Items | /purchasing/vendor-items | Item-vendor links | ✅ Correct |
| Buy for WO | /purchasing/buy-for-wo | Direct buy | ✅ Correct |
| Locations | /purchasing/locations | Warehouse locations | ❌ MOVE to Inventory |

### INVENTORY Module (Stock Management)
| Tab | Path | Purpose | Status |
|-----|------|---------|--------|
| Inventory Home | /inventory | Dashboard | ✅ Correct |
| Items | /inventory/items | Item master | ✅ Correct |
| Adjustments | /inventory/adjustments | Stock adjustments | ✅ Correct |
| Transfers | /inventory/transfers | Inter-location | ✅ Correct |
| Physical Count | /inventory/physical-count | Cycle count | ✅ Correct |
| MRP | /inventory/mrp | Material planning | ✅ Correct |
| Locations | /inventory/locations | Warehouse setup | ⚠️ ADD (move from Purchasing) |

### ACCOUNTING Module (Financial)
| Tab | Path | Purpose | Status |
|-----|------|---------|--------|
| Accounting Home | /accounting | Dashboard | ✅ Correct |
| GL Accounts | /accounting/gl-accounts | Chart of Accounts | ✅ Correct |
| Journal Vouchers | /accounting/journal-vouchers | Manual entries | ✅ Correct |
| A/R Invoices | /accounting/ar-invoices | AR management | ✅ Correct |
| A/P Invoices | /accounting/ap-invoices | AP management | ✅ Correct |
| Customer Payments | /accounting/customer-payments | Cash receipts | ✅ Correct |
| Vendor Payments | /accounting/vendor-payments | Disbursements | ✅ Correct |
| Bank Recon | /accounting/bank-recon | Reconciliation | ✅ Correct |

### SYSTEM SETUP (Administration)
| Group | Items | Status |
|-------|-------|--------|
| Security | Users, Roles, Permissions | ✅ Correct |
| General | Company, Payment Terms, Tax Codes, Currencies, Carriers, Departments | ✅ Correct |
| Sales | Customer Types, Tax Groups, Price Lists, Salespeople, Fabrication Charges | ✅ Correct |
| Inventory | Item Types, Locations, Location Groups, Adjustment Codes, Scrap Codes | ✅ Correct |
| Manufacturing | Work Centers, Routing Templates | ⚠️ ADD Routing Templates |
| Purchasing | Vendor Types | ✅ Correct |
| Documents & Email | Templates, Email Config | ✅ Correct |
| Accounting | Banks, Bank Accounts, Periods, GL Defaults | ✅ Correct |

---

## FIXES TO IMPLEMENT

1. Move Locations from Purchasing to Inventory (new route + update menu)
2. Create direct route for Fab Charges under Sales module
3. Remove Work Centers and Routing from Manufacturing menuItems (keep in setupItems)
4. Add Lamination to Manufacturing menuItems
5. Remove duplicate `/purchasing/invoices` route
6. Add WO Transactions to Manufacturing menu (rename to "WO Receipts")
7. Add Routing Templates to Manufacturing Setup section in SystemSetup
8. Update Inventory menu to include Locations directly
9. Clean up PurchasingAPInvoices.jsx (remove duplicate, keep APInvoices.jsx)
10. Add "Record Deposit" to Sales quickActions
