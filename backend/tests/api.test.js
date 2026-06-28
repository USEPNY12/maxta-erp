/**
 * MaxTA ERP - Automated API Test Suite
 * Phase 10: End-to-End Testing
 * Tests all critical endpoints across Phases 1-9
 */
const http = require('http');

const BASE_URL = process.env.TEST_URL || 'http://localhost:5000';
let TOKEN = '';

// Helper to make HTTP requests
function request(method, path, body = null, token = TOKEN) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

const results = { passed: 0, failed: 0, errors: [] };

function assert(condition, testName) {
  if (condition) {
    results.passed++;
    console.log(`  ✓ ${testName}`);
  } else {
    results.failed++;
    results.errors.push(testName);
    console.log(`  ✗ ${testName}`);
  }
}

async function runTests() {
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   MaxTA ERP - Automated API Test Suite (Phase 10)   ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ═══════════════════════════════════════════════
  // PHASE 1: Authentication & Core
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Authentication & Core ━━━');

  const loginRes = await request('POST', '/api/auth/login', { username: 'admin', password: 'admin123' });
  assert(loginRes.status === 200, 'POST /api/auth/login - Admin login returns 200');
  assert(loginRes.body.token, 'Login returns JWT token');
  TOKEN = loginRes.body.token;

  const badLogin = await request('POST', '/api/auth/login', { username: 'admin', password: 'wrong' });
  assert(badLogin.status === 401, 'POST /api/auth/login - Invalid password returns 401');

  const noAuth = await request('GET', '/api/inventory/items', null, '');
  assert(noAuth.status === 401 || noAuth.status === 403, 'GET /api/inventory/items - No token returns 401/403');

  const health = await request('GET', '/api/health', null, '');
  assert(health.status === 200, 'GET /api/health - Returns 200');

  const users = await request('GET', '/api/auth/users');
  assert(users.status === 200, 'GET /api/auth/users - Admin can list users');
  assert(Array.isArray(users.body), 'Users response is an array');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 1: Inventory Module
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Inventory Module ━━━');

  const items = await request('GET', '/api/inventory/items');
  assert(items.status === 200, 'GET /api/inventory/items - Returns 200');
  assert(items.body.items && Array.isArray(items.body.items), 'Items response has items array');

  const locations = await request('GET', '/api/inventory/locations');
  assert(locations.status === 200, 'GET /api/inventory/locations - Returns 200');

  const itemTypes = await request('GET', '/api/inventory/item-types');
  assert(itemTypes.status === 200, 'GET /api/inventory/item-types - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 1: Sales Module
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Sales Module ━━━');

  const customers = await request('GET', '/api/sales/customers');
  assert(customers.status === 200, 'GET /api/sales/customers - Returns 200');

  const quotes = await request('GET', '/api/sales/quotes');
  assert(quotes.status === 200, 'GET /api/sales/quotes - Returns 200');

  const salesOrders = await request('GET', '/api/sales/orders');
  assert(salesOrders.status === 200, 'GET /api/sales/orders - Returns 200');

  const shipments = await request('GET', '/api/sales/shipments');
  assert(shipments.status === 200, 'GET /api/sales/shipments - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 1: Manufacturing Module
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Manufacturing Module ━━━');

  const workCenters = await request('GET', '/api/manufacturing/work-centers');
  assert(workCenters.status === 200, 'GET /api/manufacturing/work-centers - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 1: Purchasing Module
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Purchasing Module ━━━');

  const vendors = await request('GET', '/api/purchasing/vendors');
  assert(vendors.status === 200, 'GET /api/purchasing/vendors - Returns 200');

  const purchaseOrders = await request('GET', '/api/purchasing/purchase-orders');
  assert(purchaseOrders.status === 200, 'GET /api/purchasing/purchase-orders - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 1: Accounting Module
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 1: Accounting Module ━━━');

  const accounts = await request('GET', '/api/accounting/gl-accounts');
  assert(accounts.status === 200, 'GET /api/accounting/gl-accounts - Returns 200');

  const glTxns = await request('GET', '/api/accounting/gl-transactions');
  assert(glTxns.status === 200, 'GET /api/accounting/gl-transactions - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 2: Sales CPQ Engine
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 2: Sales CPQ Engine ━━━');

  const pricingMatrix = await request('GET', '/api/cpq/pricing-matrix');
  assert(pricingMatrix.status === 200, 'GET /api/cpq/pricing-matrix - Returns 200');
  assert(Array.isArray(pricingMatrix.body), 'Pricing matrix is an array');

  const approvalsQueue = await request('GET', '/api/cpq/approvals/queue');
  assert(approvalsQueue.status === 200, 'GET /api/cpq/approvals/queue - Returns 200');

  const commRules = await request('GET', '/api/cpq/commissions/rules');
  assert(commRules.status === 200, 'GET /api/cpq/commissions/rules - Returns 200');

  const commSummary = await request('GET', '/api/cpq/commissions/summary');
  assert(commSummary.status === 200, 'GET /api/cpq/commissions/summary - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 3: Document Center
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 3: Document Center ━━━');

  const templates = await request('GET', '/api/documents/templates');
  assert(templates.status === 200, 'GET /api/documents/templates - Returns 200');
  assert(Array.isArray(templates.body), 'Templates response is an array');
  assert(templates.body.length >= 7, 'At least 7 document templates exist');

  const branding = await request('GET', '/api/document-center/branding');
  assert(branding.status === 200, 'GET /api/document-center/branding - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 4: Manufacturing Advanced
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 4: Manufacturing Advanced ━━━');

  const gantt = await request('GET', '/api/manufacturing-advanced/schedule/gantt');
  assert(gantt.status === 200, 'GET /api/manufacturing-advanced/schedule/gantt - Returns 200');

  const oee = await request('GET', '/api/manufacturing-advanced/utilization/summary');
  assert(oee.status === 200, 'GET /api/manufacturing-advanced/utilization/summary - Returns 200');

  const qcCheckpoints = await request('GET', '/api/manufacturing-advanced/qc/checkpoints');
  assert(qcCheckpoints.status === 200, 'GET /api/manufacturing-advanced/qc/checkpoints - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 5: Shipping & Logistics
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 5: Shipping & Logistics ━━━');

  const racks = await request('GET', '/api/shipping/racks');
  assert(racks.status === 200, 'GET /api/shipping/racks - Returns 200');

  const routes = await request('GET', '/api/shipping/routes');
  assert(routes.status === 200, 'GET /api/shipping/routes - Returns 200');

  const freight = await request('GET', '/api/shipping/freight');
  assert(freight.status === 200, 'GET /api/shipping/freight - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 6: CRM & Pipeline
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 6: CRM & Pipeline ━━━');

  const leads = await request('GET', '/api/crm/leads');
  assert(leads.status === 200, 'GET /api/crm/leads - Returns 200');

  const activities = await request('GET', '/api/crm/activities');
  assert(activities.status === 200, 'GET /api/crm/activities - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 7: Accounting Advanced
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 7: Accounting Advanced ━━━');

  const dashboard = await request('GET', '/api/accounting-advanced/dashboard');
  assert(dashboard.status === 200, 'GET /api/accounting-advanced/dashboard - Returns 200');
  assert(dashboard.body.cash_position !== undefined, 'Dashboard returns cash_position');

  const budgets = await request('GET', '/api/accounting-advanced/budgets');
  assert(budgets.status === 200, 'GET /api/accounting-advanced/budgets - Returns 200');

  const taxJurisdictions = await request('GET', '/api/accounting-advanced/tax/jurisdictions');
  assert(taxJurisdictions.status === 200, 'GET /api/accounting-advanced/tax/jurisdictions - Returns 200');

  const cashFlow = await request('GET', '/api/accounting-advanced/cash-flow/projection');
  assert(cashFlow.status === 200, 'GET /api/accounting-advanced/cash-flow/projection - Returns 200');

  const currencies = await request('GET', '/api/accounting-advanced/currencies/rates');
  assert(currencies.status === 200, 'GET /api/accounting-advanced/currencies/rates - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 8: Dashboard & Promotions
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 8: Dashboard & Promotions ━━━');

  const promos = await request('GET', '/api/dashboard-exec/promotions');
  assert(promos.status === 200, 'GET /api/dashboard-exec/promotions - Returns 200');

  const widgets = await request('GET', '/api/dashboard-exec/widgets');
  assert(widgets.status === 200, 'GET /api/dashboard-exec/widgets - Returns 200');
  assert(Array.isArray(widgets.body), 'Widgets response is an array');

  const kpiSales = await request('GET', '/api/dashboard-exec/kpi/sales-mtd');
  assert(kpiSales.status === 200, 'GET /api/dashboard-exec/kpi/sales-mtd - Returns 200');

  const kpiCash = await request('GET', '/api/dashboard-exec/kpi/cash-position');
  assert(kpiCash.status === 200, 'GET /api/dashboard-exec/kpi/cash-position - Returns 200');

  // Test promotions CRUD
  const newPromo = await request('POST', '/api/dashboard-exec/promotions', {
    title: 'Test Promotion',
    message: 'API test suite promotion',
    type: 'announcement',
    display_mode: 'banner',
    priority: 'normal',
    target_roles: JSON.stringify(['admin']),
    is_active: true,
    start_date: new Date().toISOString().split('T')[0],
    end_date: '2026-12-31'
  });
  assert(newPromo.status === 201 || newPromo.status === 200, 'POST /api/dashboard-exec/promotions - Create promotion');

  console.log('');

  // ═══════════════════════════════════════════════
  // PHASE 9: Mobile & PWA
  // ═══════════════════════════════════════════════
  console.log('━━━ Phase 9: Mobile & PWA ━━━');

  const mobileStatus = await request('GET', '/api/mobile/status');
  assert(mobileStatus.status === 200, 'GET /api/mobile/status - Returns 200');
  assert(mobileStatus.body.features && mobileStatus.body.features.pwa === true, 'Mobile status confirms PWA enabled');

  const kioskStations = await request('GET', '/api/mobile/kiosk/stations');
  assert(kioskStations.status === 200, 'GET /api/mobile/kiosk/stations - Returns 200');
  assert(Array.isArray(kioskStations.body), 'Kiosk stations is an array');

  const kioskAuth = await request('POST', '/api/mobile/kiosk/authenticate', {
    stationCode: 'CUT-01',
    pin: '1234'
  });
  assert(kioskAuth.status === 200, 'POST /api/mobile/kiosk/authenticate - Valid PIN authenticates');
  assert(kioskAuth.body.station && kioskAuth.body.station.name === 'Cutting Table 1', 'Kiosk auth returns correct station name');

  const kioskBadPin = await request('POST', '/api/mobile/kiosk/authenticate', {
    stationCode: 'CUT-01',
    pin: '9999'
  });
  assert(kioskBadPin.status === 401, 'POST /api/mobile/kiosk/authenticate - Invalid PIN returns 401');

  const preferences = await request('GET', '/api/mobile/preferences');
  assert(preferences.status === 200, 'GET /api/mobile/preferences - Returns 200');

  const offlineSync = await request('POST', '/api/mobile/offline/sync', {
    actions: [
      { type: 'production_scan', data: { wo_number: 'TEST-001', station: 'CUT-01', quantity: 1 }, queuedAt: new Date().toISOString() }
    ]
  });
  assert(offlineSync.status === 200, 'POST /api/mobile/offline/sync - Sync processes successfully');

  console.log('');

  // ═══════════════════════════════════════════════
  // CROSS-MODULE: Notifications & Reports
  // ═══════════════════════════════════════════════
  console.log('━━━ Cross-Module: Notifications & Reports ━━━');

  const notifications = await request('GET', '/api/notifications');
  assert(notifications.status === 200, 'GET /api/notifications - Returns 200');

  const trialBalance = await request('GET', '/api/reports/trial-balance');
  assert(trialBalance.status === 200, 'GET /api/reports/trial-balance - Returns 200');

  const incomeStmt = await request('GET', '/api/reports/financial/income-statement?start_date=2026-01-01&end_date=2026-12-31');
  assert(incomeStmt.status === 200, 'GET /api/reports/financial/income-statement - Returns 200');

  console.log('');

  // ═══════════════════════════════════════════════
  // PERFORMANCE: Response Time Checks
  // ═══════════════════════════════════════════════
  console.log('━━━ Performance: Response Times ━━━');

  const perfTests = [
    { method: 'GET', path: '/api/inventory/items', name: 'Items List' },
    { method: 'GET', path: '/api/sales/orders', name: 'Sales Orders' },
    { method: 'GET', path: '/api/dashboard-exec/kpi/sales-mtd', name: 'KPI Sales MTD' },
    { method: 'GET', path: '/api/accounting-advanced/dashboard', name: 'Accounting Dashboard' },
    { method: 'GET', path: '/api/manufacturing-advanced/schedule/gantt', name: 'Gantt Schedule' },
    { method: 'GET', path: '/api/crm/leads', name: 'CRM Leads' },
  ];

  for (const test of perfTests) {
    const start = Date.now();
    await request(test.method, test.path);
    const elapsed = Date.now() - start;
    assert(elapsed < 2000, `${test.name} responds in <2s (${elapsed}ms)`);
  }

  console.log('');

  // ═══════════════════════════════════════════════
  // SECURITY: Input Validation
  // ═══════════════════════════════════════════════
  console.log('━━━ Security: Input Validation ━━━');

  // SQL injection attempt
  const sqlInject = await request('POST', '/api/auth/login', { username: "admin' OR 1=1--", password: 'test' });
  assert(sqlInject.status === 401 || sqlInject.status === 429, 'SQL injection attempt returns 401/429 (blocked)');

  // XSS in body
  const xssTest = await request('POST', '/api/sales/customers', { company_name: '<script>alert(1)</script>', contact_name: 'Test' });
  assert(xssTest.status !== 500, 'XSS in body does not crash server');

  // Expired/invalid token
  const badToken = await request('GET', '/api/inventory/items', null, 'invalid.token.here');
  assert(badToken.status === 401 || badToken.status === 403, 'Invalid JWT token returns 401/403');

  console.log('');

  // ═══════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  RESULTS: ${results.passed} passed, ${results.failed} failed`);
  console.log(`  TOTAL:   ${results.passed + results.failed} tests`);
  console.log(`  PASS RATE: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
  console.log('═══════════════════════════════════════════════════════');

  if (results.failed > 0) {
    console.log('\n  Failed tests:');
    results.errors.forEach(e => console.log(`    ✗ ${e}`));
  }

  console.log('');
  process.exit(results.failed > 0 ? 1 : 0);
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
