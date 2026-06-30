# MaxTA ERP - Development TODO & Status Tracker

**Last Updated:** June 29, 2026  
**Current Version:** v18  
**Production:** http://165.227.110.37:8081  
**Dev/Cloud PC:** http://34.26.235.14:8081  

---

## IN PROGRESS (Current Session - Jun 29, 2026)

| # | Task | Status | Notes |
|---|------|--------|-------|
| 1 | Routing steps not clickable from "planned" WO status | FIXED - PENDING DEPLOY | Added 'planned' to canStart, auto-release on first step click |
| 2 | Delete Work Order button (if not started) | FIXED - PENDING DEPLOY | Red Delete button, backend DELETE endpoint with safety checks |
| 3 | Deploy to Coolify | PENDING | Code pushed to GitHub (afa6aef), need to restart Coolify containers |

---

## COMPLETED TODAY (Jun 29, 2026)

| # | Feature | Commit | Deployed |
|---|---------|--------|----------|
| 1 | Fix sales.js syntax bug (missing `const` for itemTypeToProductType) | fa11de9 | Yes |
| 2 | Product Types Manager UI (System Setup → Inventory → Item Types) | fa11de9 | Yes |
| 3 | Routing Templates Manager UI (System Setup → Manufacturing → Routing Templates) | fa11de9 | Yes |
| 4 | DB-driven product_type → routing_template mapping (no more hardcoded) | fa11de9 | Yes |
| 5 | Add/Edit/Deactivate Item Types from UI | fa11de9 | Yes |
| 6 | Add/Edit/Deactivate Routing Templates with step management from UI | fa11de9 | Yes |
| 7 | View Steps modal with visual flow + detailed table | fa11de9 | Yes |
| 8 | Routing steps clickable from planned status (auto-release + start) | afa6aef | Pending |
| 9 | Delete WO button for unstarted work orders | afa6aef | Pending |

---

## KNOWN ISSUES / BUGS

| # | Issue | Module | Severity | Status |
|---|-------|--------|----------|--------|
| 1 | nginx on Coolify catches `/api/manufacturing/routing-templates/{id}/operations` as SPA route | Coolify Config | Low | Workaround in place (frontend uses /routing-templates/:id which embeds operations) |
| 2 | Accounting period 6/2026 is closed - GL postings fail for material issues/receipts | Accounting | Medium | Need to open July 2026 period or close/reopen June |
| 3 | Audit log "Data too long for column 'operation'" error | System | Low | Column needs to be expanded (VARCHAR → TEXT) |
| 4 | WO price showing $0.00 on some work orders | Manufacturing | Low | Needs investigation - may be missing pricing data |

---

## COMPLETED FEATURES (Full History)

### v17 - Jun 29, 2026: Customer Master Upgrade
- [x] Expanded customer record from 15 to 70+ fields
- [x] 7-tab customer form (General, Contacts, Addresses, Financial, Shipping, Glass/QC, Notes)
- [x] Multiple ship-to/job site addresses with delivery-specific fields
- [x] Glass-specific fields: quality tier, recut policy, breakage claim days, COC
- [x] Delivery: rack return/deposit, liftgate, loading dock, appointment, route/zone
- [x] Serial number receipt enforces item serial_control flag
- [x] Migration Phase 11 for Coolify auto-schema

### v16 - Jun 28, 2026: Serial Number Traceability
- [x] Unique serial number per piece of glass at WO receipt
- [x] Full traceability chain: WO → SO → Shipment → Invoice → Customer
- [x] Serial Lookup with chain display
- [x] SerialNumbersTab component on WO, SO, Shipments, Invoices
- [x] Serial status ENUM: available, reserved, sold, scrapped, in_service, in_transit

### v15 - Jun 28, 2026: Human-Verified WO Receipt Workflow
- [x] Removed auto-receipt from all WO completion paths
- [x] WO transitions to 'awaiting_receipt' when production finishes
- [x] PendingReceipts page with full receipt form
- [x] Materials only backflushed on human-submitted receipt
- [x] Fixed barcode scan column mismatches
- [x] Added 4 new modules: Maintenance/CMMS, Field Service, Warranty, Time & Attendance

### v14 - Jun 28, 2026: Mobile App Readiness (PWA)
- [x] Service worker with caching strategies
- [x] Kiosk Mode for shop floor tablets (PIN-based station auth)
- [x] Push Notifications (VAPID-based, 7 categories)
- [x] Offline Barcode Scanning with IndexedDB queue + auto-sync

### v13 - Jun 28, 2026: Dashboard & Promotions
- [x] In-app promotions/announcements engine with role-based targeting
- [x] Executive KPI Dashboard with permission-gated widgets
- [x] Drill-down modals for each KPI
- [x] Role-based dashboard configurations
- [x] Promotions Manager admin page

### v12 - Jun 27, 2026: Sales Module Testing & Fixes
- [x] Fixed 10 bugs across Sales module
- [x] Full Quote-to-Cash flow verified end-to-end
- [x] All Sales pages verified (Quotes, Orders, Shipments, Invoices, Customers)

### v11 - Jun 26, 2026: Scanner & Tab Testing
- [x] Fixed Scanner Lookup mode bug
- [x] All Scanner modes verified (Lookup, Production, Transfer, Location)
- [x] All 9 WO detail tabs verified functional
- [x] File upload/download working
- [x] All 9 report types rendering correctly

### v10 - Jun 26, 2026: Recommended Next Steps Upgrade
- [x] Auto-fill unit price from price lists
- [x] AP Invoices Three-Way Match UI
- [x] Bank Reconciliation full workflow
- [x] Reports Module expanded to 16+ reports
- [x] Income Statement and Balance Sheet reports

### v9 - Jun 26, 2026: Module Interconnections & GL Auto-Posting
- [x] GLService centralized posting engine
- [x] Customer/vendor payments post to GL
- [x] Manufacturing Material Backflush on WO Receipt
- [x] MRP Engine (demand vs supply calculation)
- [x] Physical Count workflow with GL variance
- [x] Sales Pricing & COGS
- [x] CNC Drilling cost estimation

### v8 - Jun 26, 2026: Document Template System
- [x] Handlebars+Puppeteer PDF engine
- [x] 7 professional HTML templates (PO, Quote, SO, Invoice, Packing Slip, WO, Receiving Report)
- [x] Print/Preview/Email buttons on all document pages
- [x] Email dialog with auto-filled recipient
- [x] Template Manager in System Setup

### v7 - Jun 26, 2026: Purchasing Module Audit
- [x] PO inline editing with vendor-item filtering
- [x] Production Schedule fixed (all WOs visible)
- [x] Glass Cutting Optimization module (2D guillotine nesting)
- [x] Item-Vendor-PO data flow verified end-to-end

### v6 - Jun 26, 2026: Full ERP Audit & Upgrade
- [x] SystemSetup full CRUD for all setup tables
- [x] InventoryHome KPI dashboard
- [x] AccountingHome with financial KPIs
- [x] 13 live data-driven reports
- [x] Cross-Module GL Auto-Posting

### v5 - Jun 26, 2026: RBAC System
- [x] User Management (add/edit/deactivate, assign roles)
- [x] Role Management (8 system roles + custom)
- [x] Permissions Matrix (7 modules × 6 permissions)
- [x] Frontend permission guards

### v4 - Jun 26, 2026: Purchasing Module
- [x] Full PO-to-Receipt-to-Inventory-to-Invoice workflow
- [x] Glass fabrication specs on PO lines
- [x] Receive Materials with inventory update
- [x] AP Invoices with 3-way match
- [x] Locations warehouse/rack/bin hierarchy

### v3 - Jun 26, 2026: Sales Module
- [x] Full Quote-to-Cash workflow
- [x] Release to Production (auto-creates WOs with routing)
- [x] Create Shipment from SO
- [x] Create Invoice from Shipment
- [x] Record Payment with modal

### v2 - Jun 26, 2026: Manufacturing Module
- [x] Shop Floor with department-specific views
- [x] Work Orders with 7-tab detail
- [x] Visual routing steps
- [x] Quality Control (Inspections + NCR)
- [x] Production Schedule
- [x] Work Centers (13 stations)
- [x] Routing Templates (7 product types)
- [x] Recuts/Scrap tracking

### v1 - Jun 25-26, 2026: Initial Deployment
- [x] Full ERP system deployed (40+ tables)
- [x] All core modules operational
- [x] JWT authentication
- [x] PM2 + nginx setup

---

## COOLIFY DEPLOYMENT (Production)

### Deployment Checklist
1. [ ] Test on Cloud PC (http://34.26.235.14:8081)
2. [ ] `cd /home/ubuntu/maxta-erp && git add -A && git commit -m "description" && git push`
3. [ ] Restart Coolify via API: `curl -X POST -H "Authorization: Bearer 5|zUHHsPnnEVxvjm5xZxJQRoDJzbS4w3GChZ5Kkz2macca30f0" http://165.227.110.37:8000/api/v1/services/m5r5ohmt0i9p5zq82i6pjrhw/restart`
4. [ ] Wait ~2 minutes for containers to restart
5. [ ] Verify: `curl -s http://165.227.110.37:8081/api/auth/login -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin123"}'`
6. [ ] Run migration if needed: `curl http://165.227.110.37:8081/api/auth/run-migration`

### Key Rule
**ALL database schema changes MUST be in `backend/src/migrate.js`** — Coolify has a separate MySQL database that only gets schema changes through migration scripts that run on backend startup.

---

## FUTURE IDEAS / BACKLOG

| # | Feature | Priority | Module |
|---|---------|----------|--------|
| 1 | HTTPS/SSL for production (Coolify) | High | Infrastructure |
| 2 | Automated backups for both databases | High | Infrastructure |
| 3 | Open July 2026 accounting period | High | Accounting |
| 4 | Smart Glazier API actual integration (currently stub) | Medium | Integration |
| 5 | Email notifications (SMTP setup) | Medium | System |
| 6 | Customer portal (view orders/invoices) | Medium | Sales |
| 7 | Supplier portal (view POs/payments) | Medium | Purchasing |
| 8 | Advanced MRP with lead time planning | Medium | Manufacturing |
| 9 | Costing rollup (actual vs standard) | Medium | Accounting |
| 10 | Mobile native app (React Native) | Low | Mobile |

---

## DEVELOPMENT RULES

1. **Always test on Cloud PC first** before pushing
2. **Always add DB changes to migrate.js** — never make schema changes only on Cloud PC
3. **Always push to GitHub** before restarting Coolify
4. **Always verify on Coolify** after deployment
5. **Update this TODO.md** with every session's changes
6. **Update AGENTS.md changelog** with version entry after each session
