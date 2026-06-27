# Max TA Group Glass Fabrication ERP - Complete System Requirements

## Research Summary

Based on extensive research of glass fabrication ERP systems (FeneVision, A+W Clarity, Smart Glazier, Epicor), 
ERP best practices (NetSuite O2C, Conga Q2C), audit trail design patterns, and glass manufacturing processes.

---

## 1. GLASS FABRICATION INDUSTRY WORKFLOWS

### Glass Production Process Steps
1. **Cutting** - Raw glass sheets cut to size using cutting optimization algorithms
2. **Edge Processing** - Grinding, polishing, beveling edges (seamed, flat polish, pencil, ogee, bevel)
3. **Fabrication** - Holes, notches, cutouts, special shapes
4. **Washing** - Remove contaminants before heat treatment
5. **Tempering** - Heat to 620°C then rapid quench cooling (for tempered glass)
6. **Laminating** - Bond multiple layers with PVB/SGP interlayer (for laminated glass)
7. **Insulating** - Assemble IG units with spacers and sealant (for insulated glass)
8. **Quality Inspection** - Visual inspection, stress test, dimensional verification
9. **Packing/Crating** - Pack on racks/crates in shipping sequence
10. **Shipping** - Deliver to customer

### Glass-Specific Data Points
- Glass type: Clear, Low-E, Tinted, Reflective, Patterned
- Thickness: 3mm, 4mm, 5mm, 6mm, 8mm, 10mm, 12mm, 15mm, 19mm
- Processing: Tempered, Laminated, Insulated (IG), Heat Strengthened
- Edge types: Seamed, Flat Polish, Pencil Polish, Bevel, Ogee, Mitre
- Shapes: Rectangle, Arch, Circle, Custom/Irregular
- Coatings: Low-E, Reflective, Ceramic Frit
- Interlayer (laminated): PVB, SGP, EVA
- Spacer (IG): Aluminum, Warm Edge, Super Spacer
- Certifications: SGCC, IGCC, ANSI Z97.1, CPSC 16 CFR 1201

### Work Center Types for Glass Fabrication
- Cutting Table (automated or manual)
- CNC Machine (holes, notches, shapes)
- Edger/Grinder (seaming, polishing)
- Washer
- Tempering Furnace
- Laminating Line (autoclave or vacuum)
- IG Line (insulating glass assembly)
- Inspection Station
- Packing/Crating Station

---

## 2. COMPLETE QUOTE-TO-CASH WORKFLOW

### Sales Cycle States
```
QUOTE → SALES ORDER → WORK ORDER(s) → PRODUCTION → SHIPMENT → INVOICE → PAYMENT
  ↓         ↓              ↓               ↓            ↓          ↓
 Lost    Cancelled      Cancelled       Scrapped     Returned   Credit Memo
```

### Quote States: Draft → Sent → Accepted → Converted (to SO) → Expired → Lost
### Sales Order States: Draft → Confirmed → In Production → Ready to Ship → Partially Shipped → Shipped → Invoiced → Closed → Cancelled
### Work Order States: Planned → Released → In Progress → Complete → Closed → Cancelled
### Shipment States: Draft → Packed → Shipped → Delivered → Returned (partial/full)
### Invoice States: Draft → Posted → Partially Paid → Paid → Void
### Credit Memo States: Draft → Posted → Applied → Closed

### Key Business Rules
1. Quote can be converted to Sales Order (copies all line items)
2. Sales Order generates Work Orders for manufactured items
3. Sales Order can accept deposits (partial payments before shipping)
4. Shipment created from Sales Order (pick/pack/ship)
5. Invoice generated from Shipment (or directly from SO for services)
6. Invoice CANNOT be deleted once posted - only voided or credited
7. Credit Memo reduces customer balance (returns, errors, discounts)
8. Payment applied to one or more open invoices
9. Overpayments create unapplied credit on customer account

---

## 3. PAYMENT PROCESSING

### Payment Methods
- **Check** - Check number, bank, date
- **Credit Card** - Last 4 digits, card type, auth code
- **Wire Transfer** - Reference number, bank
- **ACH** - Routing/account (last 4), transaction ID
- **Cash** - Receipt number
- **Customer Credit** - Applied from credit memo or deposit

### Deposit Management
- Deposits recorded on Sales Order before shipment
- Deposit creates a liability (Customer Deposits GL account)
- When invoice is created, deposit is applied automatically
- Remaining balance due from customer

### AR Management
- Open Invoices view (filterable: all, open, overdue, paid)
- Aging Report (Current, 30, 60, 90, 120+ days)
- Customer Statement generation
- Payment application (apply to oldest or specific invoices)
- Write-off bad debt
- Finance charges on overdue invoices

---

## 4. PURCHASING (PROCURE-TO-PAY) WORKFLOW

### Purchase Cycle States
```
PO QUOTE → PURCHASE ORDER → PO RECEIPT → AP INVOICE → VENDOR PAYMENT
```

### Purchase Order States: Draft → Sent → Partially Received → Received → Invoiced → Closed → Cancelled
### AP Invoice States: Draft → Posted → Partially Paid → Paid → Void
### Vendor Payment States: Draft → Posted → Cleared → Void

### Key Business Rules
1. PO created for raw materials (glass sheets, hardware, supplies)
2. PO Receipt records what was actually received (may differ from ordered)
3. AP Invoice matched to PO and Receipt (3-way match)
4. Vendor Payment applied to one or more AP invoices
5. Vendor credits (returns) create debit memos

---

## 5. MANUFACTURING WORKFLOW (GLASS-SPECIFIC)

### Work Order Generation
- Auto-generated from Sales Order lines (for manufactured items)
- Manual creation for stock replenishment
- BOM explosion creates material requirements
- Routing defines operation sequence

### Production Tracking
- Each operation tracked: start time, end time, operator, qty good, qty scrap
- Breakage/scrap tracking with reason codes
- Rework/recut tracking (new WO linked to original)
- Lot/batch traceability (which raw glass sheet used)

### Quality Control
- First piece inspection
- In-process inspection at each station
- Final inspection before packing
- Hold/release status
- Non-conformance reports (NCR)
- Disposition: Accept, Reject, Rework, Scrap

### Production Schedule
- Capacity planning by work center
- Due date scheduling (backward from ship date)
- Priority sequencing
- Cutting optimization (minimize waste)
- Furnace load optimization (maximize bed utilization)

---

## 6. AUDIT TRAIL & LOGGING SYSTEM

### Audit Log Table Design
```sql
CREATE TABLE audit_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    table_name VARCHAR(64) NOT NULL,
    record_id BIGINT UNSIGNED NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    changed_by INT UNSIGNED NOT NULL,
    changed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    old_data JSON NULL,
    new_data JSON NULL,
    ip_address VARCHAR(45) NULL,
    user_agent VARCHAR(255) NULL,
    INDEX idx_table_record (table_name, record_id),
    INDEX idx_changed_by (changed_by),
    INDEX idx_changed_at (changed_at)
);
```

### What to Audit
- ALL document state changes (quote, SO, WO, shipment, invoice, payment)
- ALL financial transactions (GL postings, payments, credits)
- User login/logout
- Price changes
- Inventory adjustments
- Customer/vendor master data changes
- System configuration changes

### Immutable Records
- Posted invoices CANNOT be deleted (only voided with credit memo)
- Posted journal entries CANNOT be deleted (only reversed)
- Payments CANNOT be deleted (only voided with reversal)
- Audit log itself is append-only (no updates or deletes)

---

## 7. EMAIL & DOCUMENT SYSTEM

### Documents to Email/Print
| Document | When Sent | To Whom |
|----------|-----------|---------|
| Quote | When quote is ready | Customer |
| Sales Order Confirmation | When SO is confirmed | Customer |
| Work Order Traveler | When WO is released | Shop floor |
| Packing List | When shipment is packed | Customer (with shipment) |
| Bill of Lading | When shipment ships | Carrier/Customer |
| AR Invoice | When invoice is posted | Customer |
| Customer Statement | Monthly or on demand | Customer |
| Purchase Order | When PO is sent | Vendor |
| Credit Memo | When credit is issued | Customer |
| Payment Receipt | When payment is received | Customer |

### Email Implementation (Node.js)
- Use Nodemailer with SMTP configuration
- Generate PDF documents using puppeteer or pdfkit
- Template-based HTML for email body
- PDF attachment for formal documents
- Track email sent status on each document
- Resend capability

### Print Implementation
- Generate PDF in browser for printing
- Standard paper sizes (Letter, A4)
- Company letterhead/logo on documents
- Barcode/QR code on work orders for scanning

---

## 8. FRONTEND TAB STRUCTURE

### Sales Order Screen Tabs
1. **Header** - Customer, dates, terms, salesperson, status
2. **Lines** - Item, qty, price, discount, amount, delivery date
3. **Deposits** - Deposit payments received against this order
4. **Shipments** - Related shipments with tracking
5. **Invoices** - Related invoices
6. **Notes/Attachments** - Internal notes, files, drawings
7. **History/Log** - Audit trail of all changes

### Work Order Screen Tabs
1. **Header** - Item, qty, dates, status, priority
2. **Materials** - BOM components, issued qty, available qty
3. **Routing** - Operations, work centers, times, status
4. **Labor** - Labor entries by operation
5. **Quality** - Inspection results, NCRs
6. **Scrap/Rework** - Breakage tracking, recut orders
7. **History/Log** - Audit trail

### Invoice Screen Tabs
1. **Header** - Customer, dates, terms, status
2. **Lines** - Items, qty, price, tax, amount
3. **Payments** - Applied payments
4. **Credits** - Applied credit memos
5. **History/Log** - Audit trail (who posted, when)

### Customer Screen Tabs
1. **General** - Name, addresses, contact info
2. **Billing** - Payment terms, credit limit, tax exempt
3. **Contacts** - Multiple contacts with roles
4. **Orders** - Open/closed sales orders
5. **Invoices** - Open/paid invoices, aging
6. **Payments** - Payment history
7. **Credits** - Credit memos, deposits
8. **Notes/History** - Notes and audit log

### Vendor Screen Tabs
1. **General** - Name, addresses, contact info
2. **Purchasing** - Payment terms, lead time, min order
3. **Items** - Items supplied by this vendor with pricing
4. **POs** - Purchase order history
5. **Invoices** - AP invoices
6. **Payments** - Payment history
7. **Notes/History** - Notes and audit log

---

## 9. STATUS FILTERS & VIEWS

### Every List Page Should Have
- Status filter dropdown (All, Open, Closed, etc.)
- Date range filter
- Search by number/name
- Sort by columns
- Pagination
- Export to CSV/Excel

### Dashboard KPIs
- Open quotes (count + value)
- Open sales orders (count + value)
- Work orders in progress
- Past due shipments
- Open AR invoices (total + aging buckets)
- Open AP invoices (total + aging buckets)
- Cash position (bank balances)
- Revenue this month/quarter/year
- Production efficiency (good vs scrap)

---

## 10. ADDITIONAL FEATURES NEEDED

### User Roles & Permissions
- Admin - Full access
- Sales - Quotes, Orders, Customers, AR
- Production - Work Orders, Shop Floor, BOM
- Purchasing - POs, Vendors, AP
- Accounting - GL, Invoices, Payments, Reports
- Shipping - Shipments, Packing
- Read-Only - View only, no create/edit

### System Configuration
- Company information (name, address, logo)
- Tax rates and rules
- Payment terms (Net 30, Net 60, Due on Receipt, etc.)
- Number sequences (auto-increment with prefix)
- Email settings (SMTP server, from address)
- Default GL accounts for posting
- Fiscal year/periods

### Reports
- Sales by Customer/Item/Salesperson
- AR Aging (Summary and Detail)
- AP Aging (Summary and Detail)
- Open Orders Report
- Production Schedule
- Inventory Valuation
- GL Trial Balance
- Income Statement
- Balance Sheet
- Cash Flow
- Tax Report
