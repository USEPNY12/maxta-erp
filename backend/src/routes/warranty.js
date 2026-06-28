/**
 * Warranty & Claims Tracking Module
 * ===================================
 * Track warranty claims, RMA recuts, supplier chargebacks, and defect traceability
 * Scan barcode → trace to original batch/operator → auto-generate RMA
 */
const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// ============ SCHEMA SETUP ============
router.post('/setup-schema', async (req, res) => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warranty_claims (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_number VARCHAR(50) UNIQUE NOT NULL,
        customer_id INT,
        customer_name VARCHAR(200),
        sales_order_id INT,
        work_order_id INT,
        item_id INT,
        item_description VARCHAR(300),
        claim_type ENUM('product_defect','installation_issue','shipping_damage','material_failure','seal_failure','breakage','other') DEFAULT 'product_defect',
        status ENUM('submitted','under_review','approved','in_progress','resolved','rejected','closed') DEFAULT 'submitted',
        priority ENUM('critical','high','medium','low') DEFAULT 'medium',
        reported_date DATE NOT NULL,
        failure_date DATE,
        resolution_date DATE,
        description TEXT,
        root_cause TEXT,
        resolution TEXT,
        resolution_type ENUM('recut','replacement','repair','credit','refund','no_action') DEFAULT NULL,
        recut_wo_id INT,
        supplier_chargeback BOOLEAN DEFAULT FALSE,
        supplier_id INT,
        chargeback_amount DECIMAL(10,2),
        claim_cost DECIMAL(10,2) DEFAULT 0,
        photos JSON,
        barcode_scanned VARCHAR(100),
        original_production_date DATE,
        original_operator VARCHAR(100),
        original_batch VARCHAR(100),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warranty_claim_notes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        claim_id INT NOT NULL,
        note TEXT NOT NULL,
        note_type ENUM('internal','customer','supplier') DEFAULT 'internal',
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warranty_policies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        policy_name VARCHAR(200) NOT NULL,
        product_category VARCHAR(100),
        warranty_months INT DEFAULT 12,
        coverage_description TEXT,
        exclusions TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await pool.query(`
      CREATE TABLE IF NOT EXISTS defect_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(20) UNIQUE NOT NULL,
        description VARCHAR(200) NOT NULL,
        category ENUM('glass','hardware','seal','coating','fabrication','shipping','installation') DEFAULT 'glass',
        severity ENUM('critical','major','minor','cosmetic') DEFAULT 'major',
        is_active BOOLEAN DEFAULT TRUE
      )
    `);
    // Seed defect codes for glass industry
    const [existing] = await pool.query('SELECT COUNT(*) as cnt FROM defect_codes');
    if (existing[0].cnt === 0) {
      await pool.query(`INSERT INTO defect_codes (code, description, category, severity) VALUES
        ('GL-001', 'Spontaneous breakage', 'glass', 'critical'),
        ('GL-002', 'Scratch - visible at 3ft', 'glass', 'major'),
        ('GL-003', 'Chip on edge', 'glass', 'major'),
        ('GL-004', 'Inclusion/bubble', 'glass', 'minor'),
        ('GL-005', 'Wrong size/dimension', 'fabrication', 'critical'),
        ('GL-006', 'Wrong glass type', 'fabrication', 'critical'),
        ('SE-001', 'Seal failure - moisture ingress', 'seal', 'critical'),
        ('SE-002', 'Spacer bar visible corrosion', 'seal', 'major'),
        ('SE-003', 'Argon gas loss', 'seal', 'major'),
        ('CT-001', 'Low-E coating delamination', 'coating', 'critical'),
        ('CT-002', 'Coating scratch', 'coating', 'major'),
        ('HW-001', 'Hardware corrosion', 'hardware', 'major'),
        ('HW-002', 'Hardware failure/broken', 'hardware', 'critical'),
        ('SH-001', 'Shipping damage - cracked', 'shipping', 'critical'),
        ('SH-002', 'Shipping damage - scratched', 'shipping', 'major'),
        ('IN-001', 'Installation damage', 'installation', 'major'),
        ('IN-002', 'Improper installation causing failure', 'installation', 'critical')
      `);
      // Seed warranty policies
      await pool.query(`INSERT INTO warranty_policies (policy_name, product_category, warranty_months, coverage_description) VALUES
        ('Tempered Glass Standard', 'Tempered Glass', 60, 'Covers spontaneous breakage due to nickel sulfide inclusions. Does not cover thermal stress or impact damage.'),
        ('IGU Seal Warranty', 'Insulated Glass Units', 120, 'Covers seal failure resulting in moisture/fog between panes. 10-year pro-rated warranty.'),
        ('Laminated Glass Standard', 'Laminated Glass', 60, 'Covers delamination and interlayer failure under normal use conditions.'),
        ('Hardware Warranty', 'Hardware & Fittings', 24, 'Covers manufacturing defects in hardware components. Does not cover normal wear or corrosion from harsh environments.'),
        ('Low-E Coating Warranty', 'Coated Glass', 120, 'Covers coating peeling, delamination, or abnormal discoloration under normal exposure.')
      `);
    }
    res.json({ message: 'Warranty schema created and seeded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ DASHBOARD ============
router.get('/dashboard', async (req, res) => {
  try {
    const [openClaims] = await pool.query(`SELECT * FROM warranty_claims 
      WHERE status NOT IN ('resolved','rejected','closed') ORDER BY FIELD(priority,'critical','high','medium','low'), reported_date DESC`);
    const [recentResolved] = await pool.query(`SELECT * FROM warranty_claims 
      WHERE status IN ('resolved','closed') ORDER BY resolution_date DESC LIMIT 10`);
    const [defectCodes] = await pool.query('SELECT * FROM defect_codes WHERE is_active = 1 ORDER BY code');
    const [policies] = await pool.query('SELECT * FROM warranty_policies WHERE is_active = 1');
    const [stats] = await pool.query(`SELECT
      (SELECT COUNT(*) FROM warranty_claims WHERE status NOT IN ('resolved','rejected','closed')) as open_claims,
      (SELECT COUNT(*) FROM warranty_claims WHERE status = 'submitted') as pending_review,
      (SELECT COUNT(*) FROM warranty_claims WHERE priority = 'critical' AND status NOT IN ('resolved','rejected','closed')) as critical_claims,
      (SELECT COALESCE(SUM(claim_cost), 0) FROM warranty_claims WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_cost,
      (SELECT COUNT(*) FROM warranty_claims WHERE resolution_type = 'recut' AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_recuts,
      (SELECT COUNT(*) FROM warranty_claims WHERE supplier_chargeback = 1 AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as monthly_chargebacks
    `);
    // Top defect reasons (last 90 days)
    const [topDefects] = await pool.query(`SELECT claim_type, COUNT(*) as count FROM warranty_claims 
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY) GROUP BY claim_type ORDER BY count DESC LIMIT 5`);
    res.json({ openClaims, recentResolved, defectCodes, policies, stats: stats[0], topDefects });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ CLAIMS ============
router.get('/claims', async (req, res) => {
  try {
    const { status, type } = req.query;
    let query = 'SELECT * FROM warranty_claims WHERE 1=1';
    const params = [];
    if (status) { query += ' AND status = ?'; params.push(status); }
    if (type) { query += ' AND claim_type = ?'; params.push(type); }
    query += ' ORDER BY created_at DESC';
    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/claims/:id', async (req, res) => {
  try {
    const [claims] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [req.params.id]);
    if (!claims.length) return res.status(404).json({ error: 'Claim not found' });
    const [notes] = await pool.query('SELECT * FROM warranty_claim_notes WHERE claim_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ claim: claims[0], notes });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/claims', async (req, res) => {
  try {
    const { customer_id, customer_name, sales_order_id, work_order_id, item_id, item_description, claim_type, priority, reported_date, failure_date, description, barcode_scanned } = req.body;
    const [count] = await pool.query('SELECT COUNT(*) as cnt FROM warranty_claims');
    const claimNumber = `WC-${String(count[0].cnt + 1).padStart(5, '0')}`;
    
    // If barcode scanned, try to trace production info
    let original_production_date = null, original_operator = null, original_batch = null;
    if (barcode_scanned) {
      // Try to find in work order tracking
      const [tracking] = await pool.query(`SELECT wo.created_at as prod_date, wo.wo_number as batch 
        FROM work_orders wo WHERE wo.wo_number = ? OR wo.id = ?`, [barcode_scanned, barcode_scanned]);
      if (tracking.length) {
        original_production_date = tracking[0].prod_date;
        original_batch = tracking[0].batch;
      }
    }
    
    const [result] = await pool.query(
      `INSERT INTO warranty_claims (claim_number, customer_id, customer_name, sales_order_id, work_order_id, item_id, item_description, claim_type, priority, reported_date, failure_date, description, barcode_scanned, original_production_date, original_operator, original_batch, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [claimNumber, customer_id, customer_name, sales_order_id, work_order_id, item_id, item_description, claim_type, priority, reported_date || new Date(), failure_date, description, barcode_scanned, original_production_date, original_operator, original_batch, req.user?.username || 'system']
    );
    res.json({ id: result.insertId, claim_number: claimNumber, message: 'Warranty claim created' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/claims/:id', async (req, res) => {
  try {
    const fields = req.body;
    if (fields.status === 'resolved') {
      fields.resolution_date = new Date().toISOString().split('T')[0];
    }
    if (fields.photos) fields.photos = JSON.stringify(fields.photos);
    const sets = Object.keys(fields).map(k => `\`${k}\` = ?`).join(', ');
    await pool.query(`UPDATE warranty_claims SET ${sets} WHERE id = ?`, [...Object.values(fields), req.params.id]);
    res.json({ message: 'Claim updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add note to claim
router.post('/claims/:id/notes', async (req, res) => {
  try {
    const { note, note_type } = req.body;
    await pool.query('INSERT INTO warranty_claim_notes (claim_id, note, note_type, created_by) VALUES (?,?,?,?)',
      [req.params.id, note, note_type || 'internal', req.user?.username || 'system']);
    res.json({ message: 'Note added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Generate recut WO from claim
router.post('/claims/:id/generate-recut', async (req, res) => {
  try {
    const [claims] = await pool.query('SELECT * FROM warranty_claims WHERE id = ?', [req.params.id]);
    if (!claims.length) return res.status(404).json({ error: 'Claim not found' });
    const claim = claims[0];
    
    // Create a work order for the recut
    const [woCount] = await pool.query('SELECT COUNT(*) as cnt FROM work_orders');
    const woNumber = `WO-${String(woCount[0].cnt + 1).padStart(5, '0')}`;
    const [result] = await pool.query(
      `INSERT INTO work_orders (wo_number, item_id, quantity, status, priority, notes, sales_order_id) VALUES (?,?,1,'released','high',?,?)`,
      [woNumber, claim.item_id, `RECUT for Warranty Claim ${claim.claim_number}: ${claim.description}`, claim.sales_order_id]
    );
    
    // Update claim with recut WO reference
    await pool.query('UPDATE warranty_claims SET recut_wo_id = ?, resolution_type = ?, status = ? WHERE id = ?',
      [result.insertId, 'recut', 'in_progress', req.params.id]);
    
    res.json({ wo_id: result.insertId, wo_number: woNumber, message: 'Recut work order generated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ DEFECT CODES ============
router.get('/defect-codes', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM defect_codes ORDER BY code');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/defect-codes', async (req, res) => {
  try {
    const { code, description, category, severity } = req.body;
    const [result] = await pool.query('INSERT INTO defect_codes (code, description, category, severity) VALUES (?,?,?,?)',
      [code, description, category, severity]);
    res.json({ id: result.insertId, message: 'Defect code added' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ POLICIES ============
router.get('/policies', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM warranty_policies ORDER BY policy_name');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ============ TRACEABILITY ============
router.get('/trace/:barcode', async (req, res) => {
  try {
    const barcode = req.params.barcode;
    // Search across WOs, shipments, and inventory for this barcode/WO number
    const [wos] = await pool.query('SELECT * FROM work_orders WHERE wo_number = ? OR id = ?', [barcode, barcode]);
    const [claims] = await pool.query('SELECT * FROM warranty_claims WHERE barcode_scanned = ? OR work_order_id = ?', [barcode, barcode]);
    const [shipments] = await pool.query('SELECT * FROM shipments WHERE tracking_number = ? LIMIT 5', [barcode]);
    res.json({ workOrders: wos, claims, shipments, barcode });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
