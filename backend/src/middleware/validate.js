/**
 * MaxTA ERP - Zod Validation Middleware
 * Professional input validation for all API endpoints
 * Prevents invalid data from reaching business logic
 */
const { z } = require('zod');

// ═══════════════════════════════════════════════════════════════════
// VALIDATION MIDDLEWARE FACTORY
// ═══════════════════════════════════════════════════════════════════

/**
 * Creates Express middleware that validates req.body against a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @returns {Function} Express middleware
 */
const validate = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
        code: issue.code,
      }));
      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }
    // Replace body with parsed (coerced/transformed) data
    req.body = result.data;
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid request body' });
  }
};

/**
 * Validates query parameters
 */
const validateQuery = (schema) => (req, res, next) => {
  try {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      const errors = result.error.issues.map(issue => ({
        field: issue.path.join('.'),
        message: issue.message,
      }));
      return res.status(400).json({ error: 'Invalid query parameters', details: errors });
    }
    req.query = result.data;
    next();
  } catch (err) {
    return res.status(400).json({ error: 'Invalid query parameters' });
  }
};

// ═══════════════════════════════════════════════════════════════════
// SHARED FIELD SCHEMAS (Reusable across modules)
// ═══════════════════════════════════════════════════════════════════

const positiveInt = z.coerce.number().int().positive();
const nonNegativeDecimal = z.coerce.number().min(0);
const optionalString = z.string().optional().default('');
const requiredString = z.string().min(1, 'Required');
const optionalDate = z.string().optional().nullable();
const emailField = z.string().email().optional().or(z.literal(''));

// ═══════════════════════════════════════════════════════════════════
// AUTHENTICATION SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const loginSchema = z.object({
  username: z.string().min(1, 'Username is required').max(100),
  password: z.string().min(1, 'Password is required').max(200),
});

const createUserSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(50),
  password: z.string().min(6, 'Password must be at least 6 characters').max(200),
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1).max(50),
  last_name: z.string().min(1).max(50),
  role_id: z.coerce.number().int().positive().optional(),
  is_active: z.boolean().optional().default(true),
});

// ═══════════════════════════════════════════════════════════════════
// SALES MODULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const quoteLineSchema = z.object({
  item_id: z.coerce.number().int().optional().nullable(),
  description: z.string().optional().default(''),
  quantity: z.coerce.number().min(0).default(1),
  unit_price: z.coerce.number().min(0).default(0),
  width_inches: z.union([z.coerce.number(), z.literal('')]).optional(),
  height_inches: z.union([z.coerce.number(), z.literal('')]).optional(),
  product_type: z.string().optional().default(''),
  glass_type: z.string().optional().default(''),
  thickness: z.string().optional().default(''),
  edge_type: z.string().optional().default(''),
  interlayer: z.string().optional().default(''),
  has_holes: z.boolean().optional().default(false),
  holes_count: z.coerce.number().int().min(0).optional().default(0),
  manufacturing_notes: z.string().optional().default(''),
  fabrication: z.array(z.object({
    fabrication_charge_id: z.coerce.number().int().optional(),
    quantity: z.coerce.number().min(0).optional().default(1),
    rate: z.coerce.number().min(0).optional().default(0),
    notes: z.string().optional().default(''),
  })).optional().default([]),
});

const createQuoteSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer is required'),
  project_name: z.string().optional().default(''),
  expiry_date: optionalDate,
  payment_terms: z.string().optional().default('Net 30'),
  lead_time_days: z.coerce.number().int().min(0).optional().default(21),
  notes: z.string().optional().default(''),
  internal_notes: z.string().optional().default(''),
  lines: z.array(quoteLineSchema).min(1, 'At least one line item is required'),
});

const createSalesOrderSchema = z.object({
  customer_id: z.coerce.number().int().positive('Customer is required'),
  quote_id: z.coerce.number().int().optional().nullable(),
  customer_po: z.string().optional().default(''),
  order_date: optionalDate,
  required_date: optionalDate,
  payment_terms: z.string().optional().default('Net 30'),
  salesperson_id: z.coerce.number().int().optional().nullable(),
  carrier_id: z.coerce.number().int().optional().nullable(),
  ship_via: z.string().optional().default(''),
  fob: z.string().optional().default(''),
  ship_to_name: z.string().optional().default(''),
  ship_address1: z.string().optional().default(''),
  ship_address2: z.string().optional().default(''),
  ship_city: z.string().optional().default(''),
  ship_state: z.string().optional().default(''),
  ship_zip: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  internal_notes: z.string().optional().default(''),
  lines: z.array(z.object({
    item_id: z.coerce.number().int().optional().nullable(),
    description: z.string().optional().default(''),
    quantity: z.coerce.number().min(0).default(1),
    unit_price: z.coerce.number().min(0).default(0),
    width_inches: z.union([z.coerce.number(), z.literal('')]).optional(),
    height_inches: z.union([z.coerce.number(), z.literal('')]).optional(),
    product_type: z.string().optional().default(''),
    glass_type: z.string().optional().default(''),
    thickness: z.string().optional().default(''),
    edge_type: z.string().optional().default(''),
  })).optional().default([]),
});

const createCustomerSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  customer_type_id: z.coerce.number().int().optional().nullable(),
  contact_name: z.string().optional().default(''),
  email: emailField,
  phone: z.string().optional().default(''),
  fax: z.string().optional().default(''),
  website: z.string().optional().default(''),
  address1: z.string().optional().default(''),
  address2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  country: z.string().optional().default('US'),
  tax_exempt: z.boolean().optional().default(false),
  tax_group_id: z.coerce.number().int().optional().nullable(),
  payment_terms: z.string().optional().default('Net 30'),
  credit_limit: z.coerce.number().min(0).optional().default(0),
  salesperson_id: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().default(''),
});

const createShipmentSchema = z.object({
  sales_order_id: z.coerce.number().int().positive('Sales Order is required'),
  ship_date: optionalDate,
  carrier_id: z.coerce.number().int().optional().nullable(),
  tracking_number: z.string().optional().default(''),
  ship_via: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  lines: z.array(z.object({
    sales_order_line_id: z.coerce.number().int().positive(),
    item_id: z.coerce.number().int().optional().nullable(),
    quantity_shipped: z.coerce.number().min(0),
    lot_number: z.string().optional().default(''),
    serial_number: z.string().optional().default(''),
    rack_position: z.string().optional().default(''),
    description: z.string().optional().default(''),
  })).min(1, 'At least one line is required'),
});

const createFabricationChargeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  category: z.string().min(1, 'Category is required').max(50),
  pricing_method: z.enum(['per_hole', 'per_linear_foot', 'per_piece', 'per_sq_ft', 'per_notch', 'per_cutout', 'per_corner']),
  default_rate: z.coerce.number().min(0),
  description: z.string().optional().default(''),
  is_active: z.boolean().optional().default(true),
});

// ═══════════════════════════════════════════════════════════════════
// MANUFACTURING MODULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const createWorkOrderSchema = z.object({
  item_id: z.coerce.number().int().positive('Item is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  product_type: z.string().optional().default(''),
  glass_type: z.string().optional().default(''),
  thickness: z.string().optional().default(''),
  width: z.union([z.coerce.number(), z.literal('')]).optional(),
  height: z.union([z.coerce.number(), z.literal('')]).optional(),
  edge_type: z.string().optional().default(''),
  interlayer_type: z.string().optional().default(''),
  has_holes: z.boolean().optional().default(false),
  has_notches: z.boolean().optional().default(false),
  hole_specs: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  use_template: z.boolean().optional().default(true),
  sales_order_id: z.coerce.number().int().optional().nullable(),
  sales_order_line_id: z.coerce.number().int().optional().nullable(),
});

const createWorkCenterSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string().min(1, 'Code is required').max(20),
  description: z.string().optional().default(''),
  capacity_per_day: z.coerce.number().int().min(0).optional().default(0),
  cost_per_hour: z.coerce.number().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
});

const shopFloorScanSchema = z.object({
  work_order_id: z.coerce.number().int().positive('Work Order is required'),
  work_center_id: z.coerce.number().int().positive('Work Center is required'),
  quantity: z.coerce.number().int().min(0).optional().default(1),
  scrap_qty: z.coerce.number().int().min(0).optional().default(0),
  scrap_code: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════
// PURCHASING MODULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const createPurchaseOrderSchema = z.object({
  vendor_id: z.coerce.number().int().positive('Vendor is required'),
  po_type: z.enum(['standard', 'blanket', 'drop_ship']).optional().default('standard'),
  order_date: optionalDate,
  required_date: optionalDate,
  payment_terms: z.string().optional().default('Net 30'),
  ship_via: z.string().optional().default(''),
  fob: z.string().optional().default(''),
  notes: z.string().optional().default(''),
  lines: z.array(z.object({
    item_id: z.coerce.number().int().positive(),
    description: z.string().optional().default(''),
    quantity: z.coerce.number().min(0),
    unit_cost: z.coerce.number().min(0),
    vendor_item_number: z.string().optional().default(''),
    required_date: optionalDate,
  })).min(1, 'At least one line is required'),
});

const createVendorSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(200),
  vendor_type_id: z.coerce.number().int().optional().nullable(),
  contact_name: z.string().optional().default(''),
  email: emailField,
  phone: z.string().optional().default(''),
  fax: z.string().optional().default(''),
  website: z.string().optional().default(''),
  address1: z.string().optional().default(''),
  address2: z.string().optional().default(''),
  city: z.string().optional().default(''),
  state: z.string().optional().default(''),
  zip: z.string().optional().default(''),
  country: z.string().optional().default('US'),
  payment_terms: z.string().optional().default('Net 30'),
  tax_id: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const createAPInvoiceSchema = z.object({
  vendor_id: z.coerce.number().int().positive('Vendor is required'),
  purchase_order_id: z.coerce.number().int().optional().nullable(),
  invoice_number: z.string().min(1, 'Invoice number is required'),
  invoice_date: z.string().min(1, 'Invoice date is required'),
  due_date: z.string().min(1, 'Due date is required'),
  amount: z.coerce.number().min(0),
  tax_amount: z.coerce.number().min(0).optional().default(0),
  freight: z.coerce.number().min(0).optional().default(0),
  terms: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════
// INVENTORY MODULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const createItemSchema = z.object({
  item_number: z.string().min(1, 'Item number is required').max(50),
  description: z.string().min(1, 'Description is required').max(200),
  item_type_id: z.coerce.number().int().optional().nullable(),
  uom: z.string().optional().default('EA'),
  standard_cost: z.coerce.number().min(0).optional().default(0),
  base_price: z.coerce.number().min(0).optional().default(0),
  reorder_point: z.coerce.number().int().min(0).optional().default(0),
  reorder_qty: z.coerce.number().int().min(0).optional().default(0),
  lead_time_days: z.coerce.number().int().min(0).optional().default(0),
  is_active: z.boolean().optional().default(true),
  notes: z.string().optional().default(''),
});

const createAdjustmentSchema = z.object({
  item_id: z.coerce.number().int().positive('Item is required'),
  location_id: z.coerce.number().int().positive('Location is required'),
  quantity: z.coerce.number().int('Quantity must be a whole number'),
  reason: z.string().min(1, 'Reason is required'),
  reference: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

const createTransferSchema = z.object({
  item_id: z.coerce.number().int().positive('Item is required'),
  from_location_id: z.coerce.number().int().positive('From location is required'),
  to_location_id: z.coerce.number().int().positive('To location is required'),
  quantity: z.coerce.number().int().positive('Quantity must be at least 1'),
  reference: z.string().optional().default(''),
  notes: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════
// ACCOUNTING MODULE SCHEMAS
// ═══════════════════════════════════════════════════════════════════

const createJournalVoucherSchema = z.object({
  journal_date: z.string().min(1, 'Journal date is required'),
  reference: z.string().optional().default(''),
  description: z.string().min(1, 'Description is required'),
  lines: z.array(z.object({
    gl_account_id: z.coerce.number().int().positive('GL Account is required'),
    debit: z.coerce.number().min(0).optional().default(0),
    credit: z.coerce.number().min(0).optional().default(0),
    description: z.string().optional().default(''),
  })).min(2, 'At least two lines are required for a balanced entry'),
});

const createPaymentSchema = z.object({
  customer_id: z.coerce.number().int().optional().nullable(),
  vendor_id: z.coerce.number().int().optional().nullable(),
  payment_date: z.string().min(1, 'Payment date is required'),
  amount: z.coerce.number().positive('Amount must be greater than 0'),
  payment_method: z.string().min(1, 'Payment method is required'),
  reference_number: z.string().optional().default(''),
  bank_account_id: z.coerce.number().int().optional().nullable(),
  notes: z.string().optional().default(''),
  applications: z.array(z.object({
    invoice_id: z.coerce.number().int().positive(),
    amount: z.coerce.number().positive(),
  })).optional().default([]),
});

const createGLAccountSchema = z.object({
  account_number: z.string().min(1, 'Account number is required').max(20),
  account_name: z.string().min(1, 'Account name is required').max(100),
  account_type: z.enum(['Asset', 'Liability', 'Equity', 'Revenue', 'Expense']),
  parent_id: z.coerce.number().int().optional().nullable(),
  is_active: z.boolean().optional().default(true),
  description: z.string().optional().default(''),
});

// ═══════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════

module.exports = {
  validate,
  validateQuery,
  schemas: {
    // Auth
    login: loginSchema,
    createUser: createUserSchema,
    // Sales
    createQuote: createQuoteSchema,
    createSalesOrder: createSalesOrderSchema,
    createCustomer: createCustomerSchema,
    createShipment: createShipmentSchema,
    createFabricationCharge: createFabricationChargeSchema,
    // Manufacturing
    createWorkOrder: createWorkOrderSchema,
    createWorkCenter: createWorkCenterSchema,
    shopFloorScan: shopFloorScanSchema,
    // Purchasing
    createPurchaseOrder: createPurchaseOrderSchema,
    createVendor: createVendorSchema,
    createAPInvoice: createAPInvoiceSchema,
    // Inventory
    createItem: createItemSchema,
    createAdjustment: createAdjustmentSchema,
    createTransfer: createTransferSchema,
    // Accounting
    createJournalVoucher: createJournalVoucherSchema,
    createPayment: createPaymentSchema,
    createGLAccount: createGLAccountSchema,
  },
};
