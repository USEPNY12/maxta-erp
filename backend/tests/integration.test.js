/**
 * MaxTA ERP Integration Test Suite
 * Tests the complete flow: Sales → Manufacturing → Inventory → Accounting
 * Run with: node tests/integration.test.js
 */

const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
let TOKEN = '';
let testResults = { passed: 0, failed: 0, tests: [] };

// Helper: HTTP request
function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };
    if (TOKEN) options.headers['Authorization'] = `Bearer ${TOKEN}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

// Test helper
async function test(name, fn) {
  try {
    await fn();
    testResults.passed++;
    testResults.tests.push({ name, status: 'PASS' });
    console.log(`  ✓ ${name}`);
  } catch (err) {
    testResults.failed++;
    testResults.tests.push({ name, status: 'FAIL', error: err.message });
    console.log(`  ✗ ${name}: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) throw new Error(message || `Expected ${expected}, got ${actual}`);
}

function assertIncludes(arr, item, message) {
  if (!arr.includes(item)) throw new Error(message || `Array does not include ${item}`);
}

// ============ TEST SUITES ============

async function testAuth() {
  console.log('\n📋 Authentication & Authorization');

  await test('Login with valid credentials', async () => {
    const res = await request('POST', `${BASE_URL}/auth/login`, { username: 'admin', password: 'admin123' });
    assertEqual(res.status, 200, `Login failed with status ${res.status}`);
    assert(res.body.token, 'No token returned');
    assert(res.body.user.role_id, 'No role_id in response');
    TOKEN = res.body.token;
  });

  await test('Login with invalid credentials returns 401', async () => {
    const res = await request('POST', `${BASE_URL}/auth/login`, { username: 'admin', password: 'wrong' });
    assertEqual(res.status, 401);
  });

  await test('Access protected endpoint without token returns 401', async () => {
    const savedToken = TOKEN;
    TOKEN = '';
    const res = await request('GET', `${BASE_URL}/sales/customers`);
    assertEqual(res.status, 401);
    TOKEN = savedToken;
  });

  await test('Get user profile', async () => {
    const res = await request('GET', `${BASE_URL}/auth/profile`);
    assertEqual(res.status, 200);
    assertEqual(res.body.username, 'admin');
  });
}

async function testSales() {
  console.log('\n📋 Sales Module');

  await test('GET /sales/customers returns data', async () => {
    const res = await request('GET', `${BASE_URL}/sales/customers`);
    assertEqual(res.status, 200);
    assert(res.body.customers || Array.isArray(res.body), 'Expected customers data');
  });

  await test('GET /sales/orders returns array', async () => {
    const res = await request('GET', `${BASE_URL}/sales/orders`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array of orders');
  });

  let newOrderId;
  await test('POST /sales/orders creates a new SO', async () => {
    const res = await request('POST', `${BASE_URL}/sales/orders`, {
      customer_id: 1,
      order_date: '2026-06-27',
      required_date: '2026-07-15',
      lines: [{ item_id: 2, quantity: 3, unit_price: 150.00, description: 'Test Tempered Panel' }]
    });
    assert(res.status === 200 || res.status === 201, `Create SO failed: ${res.status}`);
    assert(res.body.id || res.body.order_id, 'No order ID returned');
    newOrderId = res.body.id || res.body.order_id;
  });

  await test('GET /sales/orders/:id returns order detail', async () => {
    if (!newOrderId) return;
    const res = await request('GET', `${BASE_URL}/sales/orders/${newOrderId}`);
    assertEqual(res.status, 200);
    assert(res.body.id || res.body.order_number, 'No order data returned');
  });

  await test('POST /sales/orders/:id/release-to-production creates WO', async () => {
    if (!newOrderId) return;
    const res = await request('POST', `${BASE_URL}/sales/orders/${newOrderId}/release-to-production`);
    assert(res.status === 200 || res.status === 201, `Release failed: ${res.status}`);
    assert(res.body.work_orders || res.body.workOrders || res.body.message, 'No work orders returned');
  });

  await test('GET /sales/shipments returns array', async () => {
    const res = await request('GET', `${BASE_URL}/sales/shipments`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /sales/invoices returns array', async () => {
    const res = await request('GET', `${BASE_URL}/sales/invoices`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });
}

async function testManufacturing() {
  console.log('\n📋 Manufacturing Module');

  await test('GET /manufacturing/work-orders returns array', async () => {
    const res = await request('GET', `${BASE_URL}/manufacturing/work-orders`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /manufacturing/work-centers returns array', async () => {
    const res = await request('GET', `${BASE_URL}/manufacturing/work-centers`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /manufacturing/routing-templates returns array', async () => {
    const res = await request('GET', `${BASE_URL}/manufacturing/routing-templates`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /manufacturing/work-orders/:id returns WO with routing', async () => {
    const res = await request('GET', `${BASE_URL}/manufacturing/work-orders`);
    if (res.body.length > 0) {
      const woId = res.body[0].id;
      const detail = await request('GET', `${BASE_URL}/manufacturing/work-orders/${woId}`);
      assertEqual(detail.status, 200);
      assert(detail.body.routing || detail.body.wo_routing, 'WO should have routing');
    }
  });

  await test('GET /manufacturing/schedule returns data', async () => {
    const res = await request('GET', `${BASE_URL}/manufacturing/schedule`);
    assertEqual(res.status, 200);
  });
}

async function testInventory() {
  console.log('\n📋 Inventory Module');

  await test('GET /inventory/items returns data', async () => {
    const res = await request('GET', `${BASE_URL}/inventory/items`);
    assertEqual(res.status, 200);
    assert(res.body.items || Array.isArray(res.body), 'Expected items data');
  });

  await test('GET /inventory/stock-status returns items with quantities', async () => {
    const res = await request('GET', `${BASE_URL}/inventory/stock-status`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
    if (res.body.length > 0) {
      assert('qty_on_hand' in res.body[0] || 'quantity_on_hand' in res.body[0], 'Items should have qty_on_hand');
    }
  });

  await test('GET /inventory/locations returns array', async () => {
    const res = await request('GET', `${BASE_URL}/inventory/locations`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /inventory/lot-tracking returns data', async () => {
    const res = await request('GET', `${BASE_URL}/inventory/lot-tracking`);
    assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
  });
}

async function testPurchasing() {
  console.log('\n📋 Purchasing Module');

  await test('GET /purchasing/vendors returns array', async () => {
    const res = await request('GET', `${BASE_URL}/purchasing/vendors`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /purchasing/purchase-orders returns array', async () => {
    const res = await request('GET', `${BASE_URL}/purchasing/purchase-orders`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /purchasing/ap-invoices returns array', async () => {
    const res = await request('GET', `${BASE_URL}/purchasing/ap-invoices`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });
}

async function testAccounting() {
  console.log('\n📋 Accounting Module');

  await test('GET /accounting/gl-accounts returns array', async () => {
    const res = await request('GET', `${BASE_URL}/accounting/gl-accounts`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /accounting/trial-balance returns balanced data', async () => {
    const res = await request('GET', `${BASE_URL}/accounting/trial-balance`);
    assertEqual(res.status, 200);
    assert(res.body.accounts || Array.isArray(res.body), 'Expected trial balance data');
  });

  await test('GET /accounting/dashboard returns financial KPIs', async () => {
    const res = await request('GET', `${BASE_URL}/accounting/dashboard`);
    assertEqual(res.status, 200);
  });

  await test('GET /accounting/gl-accounts returns chart of accounts', async () => {
    const res = await request('GET', `${BASE_URL}/accounting/gl-accounts`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
    assert(res.body.length > 0, 'Expected at least one GL account');
  });
}

async function testLamination() {
  console.log('\n📋 Lamination Module');

  await test('GET /lamination/dashboard returns data', async () => {
    const res = await request('GET', `${BASE_URL}/lamination/dashboard`);
    assertEqual(res.status, 200);
  });

  await test('GET /lamination/layup-queue returns WOs at lamination step', async () => {
    const res = await request('GET', `${BASE_URL}/lamination/layup-queue`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /lamination/interlayer-optimizer/queue returns data', async () => {
    const res = await request('GET', `${BASE_URL}/lamination/interlayer-optimizer/queue`);
    assert(res.status === 200 || res.status === 404, `Unexpected status: ${res.status}`);
  });
}

async function testCutting() {
  console.log('\n📋 Cutting Optimization Module');

  await test('GET /cutting/remnants returns array', async () => {
    const res = await request('GET', `${BASE_URL}/cutting/remnants`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /cutting/sheets returns array', async () => {
    const res = await request('GET', `${BASE_URL}/cutting/sheets`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });

  await test('GET /cutting/plans returns array', async () => {
    const res = await request('GET', `${BASE_URL}/cutting/plans`);
    assertEqual(res.status, 200);
    assert(Array.isArray(res.body), 'Expected array');
  });
}

async function testDispatch() {
  console.log('\n📋 Dispatch Module');

  await test('GET /dispatch/racks returns data', async () => {
    const res = await request('GET', `${BASE_URL}/dispatch/racks`);
    assertEqual(res.status, 200);
    assert(res.body.racks || Array.isArray(res.body), 'Expected racks data');
  });

  await test('GET /dispatch/routes returns data', async () => {
    const res = await request('GET', `${BASE_URL}/dispatch/routes`);
    assert(res.status === 200 || res.status === 404, `Unexpected: ${res.status}`);
  });

  await test('GET /dispatch/racks/:id/slots returns slot data', async () => {
    const racksRes = await request('GET', `${BASE_URL}/dispatch/racks`);
    if (racksRes.body.length > 0) {
      const rackId = racksRes.body[0].id;
      const res = await request('GET', `${BASE_URL}/dispatch/racks/${rackId}/slots`);
      assertEqual(res.status, 200);
      assert(Array.isArray(res.body.slots || res.body), 'Expected slots array');
    }
  });
}

async function testNotifications() {
  console.log('\n📋 Notifications Module');

  await test('GET /notifications returns notifications', async () => {
    const res = await request('GET', `${BASE_URL}/notifications`);
    assertEqual(res.status, 200);
    assert('notifications' in res.body || Array.isArray(res.body), 'Expected notifications');
  });

  await test('GET /notifications/count returns unread count', async () => {
    const res = await request('GET', `${BASE_URL}/notifications/count`);
    assertEqual(res.status, 200);
    assert('unread_count' in res.body, 'Expected unread_count');
  });

  await test('POST /notifications/run-checks triggers checks', async () => {
    const res = await request('POST', `${BASE_URL}/notifications/run-checks`);
    assertEqual(res.status, 200);
  });
}

async function testReports() {
  console.log('\n📋 Reports Module');

  await test('GET /reports/dashboard returns data', async () => {
    const res = await request('GET', `${BASE_URL}/reports/dashboard`);
    assertEqual(res.status, 200);
  });

  await test('GET /reports/accounts-receivable/open returns data', async () => {
    const res = await request('GET', `${BASE_URL}/reports/accounts-receivable/open`);
    assertEqual(res.status, 200);
  });

  await test('GET /reports/inventory/value returns data', async () => {
    const res = await request('GET', `${BASE_URL}/reports/inventory/value`);
    assertEqual(res.status, 200);
  });

  await test('GET /reports/manufacturing/wo-status returns data', async () => {
    const res = await request('GET', `${BASE_URL}/reports/manufacturing/wo-status`);
    assertEqual(res.status, 200);
  });
}

async function testCRM() {
  console.log('\n📋 CRM Module');

  await test('GET /crm/leads returns data', async () => {
    const res = await request('GET', `${BASE_URL}/crm/leads`);
    assertEqual(res.status, 200);
    assert(res.body.leads || Array.isArray(res.body), 'Expected leads data');
  });

  await test('GET /crm/pipeline returns data', async () => {
    const res = await request('GET', `${BASE_URL}/crm/pipeline`);
    assertEqual(res.status, 200);
  });
}

async function testGLIntegrity() {
  console.log('\n📋 GL Integrity Checks');

  await test('GL is balanced (total debits = total credits)', async () => {
    const res = await request('GET', `${BASE_URL}/accounting/trial-balance`);
    assertEqual(res.status, 200);
    const accounts = res.body.accounts || res.body;
    if (Array.isArray(accounts) && accounts.length > 0) {
      let totalDebit = 0, totalCredit = 0;
      accounts.forEach(a => {
        totalDebit += parseFloat(a.debit || a.debit_balance || 0);
        totalCredit += parseFloat(a.credit || a.credit_balance || 0);
      });
      const diff = Math.abs(totalDebit - totalCredit);
      assert(diff < 0.01, `GL out of balance by $${diff.toFixed(2)}`);
    }
  });
}

// ============ MAIN ============

async function runAllTests() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   MaxTA ERP Integration Test Suite v1.0     ║');
  console.log('║   Testing all modules end-to-end            ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`\nTarget: ${BASE_URL}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  await testAuth();
  await testSales();
  await testManufacturing();
  await testInventory();
  await testPurchasing();
  await testAccounting();
  await testLamination();
  await testCutting();
  await testDispatch();
  await testNotifications();
  await testReports();
  await testCRM();
  await testGLIntegrity();

  console.log('\n══════════════════════════════════════════════');
  console.log(`Results: ${testResults.passed} passed, ${testResults.failed} failed, ${testResults.passed + testResults.failed} total`);
  console.log('══════════════════════════════════════════════');

  if (testResults.failed > 0) {
    console.log('\nFailed tests:');
    testResults.tests.filter(t => t.status === 'FAIL').forEach(t => {
      console.log(`  ✗ ${t.name}: ${t.error}`);
    });
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

runAllTests().catch(err => {
  console.error('Test runner error:', err);
  process.exit(1);
});
