const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${req.params.docType}-${req.params.docId}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    // Allow common glass fabrication file types
    const allowedExts = ['.dxf', '.dwg', '.pdf', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.sgc', '.step', '.stp', '.iges', '.igs', '.nc', '.gcode', '.tap', '.txt', '.csv', '.xlsx', '.docx', '.zip'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext) || file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(null, true); // Allow all files for flexibility
    }
  }
});

// Upload file(s) to a document
router.post('/:docType/:docId/upload', authenticate, upload.array('files', 10), async (req, res) => {
  try {
    const { docType, docId } = req.params;
    const { line_id, machine_tag, description } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];
    for (const file of req.files) {
      const [result] = await pool.query(
        `INSERT INTO document_files (document_type, document_id, line_id, file_name, original_name, file_size, mime_type, machine_tag, description, uploaded_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [docType, docId, line_id || null, file.filename, file.originalname, file.size, file.mimetype, machine_tag || 'other', description || '', req.user.id]
      );
      results.push({
        id: result.insertId,
        file_name: file.filename,
        original_name: file.originalname,
        file_size: file.size,
        machine_tag: machine_tag || 'other'
      });
    }
    res.json({ uploaded: results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all files for a document
router.get('/:docType/:docId', authenticate, async (req, res) => {
  try {
    const { docType, docId } = req.params;
    const [files] = await pool.query(
      `SELECT df.*, u.username as uploaded_by_name 
       FROM document_files df 
       LEFT JOIN users u ON df.uploaded_by = u.id
       WHERE df.document_type = ? AND df.document_id = ?
       ORDER BY df.line_id, df.machine_tag, df.created_at`,
      [docType, docId]
    );
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get files for a specific line item
router.get('/:docType/:docId/line/:lineId', authenticate, async (req, res) => {
  try {
    const { docType, docId, lineId } = req.params;
    const [files] = await pool.query(
      `SELECT df.*, u.username as uploaded_by_name 
       FROM document_files df 
       LEFT JOIN users u ON df.uploaded_by = u.id
       WHERE df.document_type = ? AND df.document_id = ? AND df.line_id = ?
       ORDER BY df.machine_tag, df.created_at`,
      [docType, docId, lineId]
    );
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get files by machine tag (for shop floor filtering)
router.get('/:docType/:docId/machine/:machineTag', authenticate, async (req, res) => {
  try {
    const { docType, docId, machineTag } = req.params;
    const [files] = await pool.query(
      `SELECT df.*, u.username as uploaded_by_name 
       FROM document_files df 
       LEFT JOIN users u ON df.uploaded_by = u.id
       WHERE df.document_type = ? AND df.document_id = ? AND df.machine_tag = ?
       ORDER BY df.line_id, df.created_at`,
      [docType, docId, machineTag]
    );
    res.json(files);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Download a file
router.get('/download/:fileId', authenticate, async (req, res) => {
  try {
    const [files] = await pool.query('SELECT * FROM document_files WHERE id = ?', [req.params.fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    
    const file = files[0];
    const filePath = path.join(__dirname, '../../..', 'uploads', file.file_name);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.original_name}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.sendFile(filePath);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update file metadata (machine tag, description)
router.put('/:fileId', authenticate, async (req, res) => {
  try {
    const { machine_tag, description, line_id } = req.body;
    const updates = [];
    const values = [];
    
    if (machine_tag) { updates.push('machine_tag = ?'); values.push(machine_tag); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (line_id !== undefined) { updates.push('line_id = ?'); values.push(line_id); }
    
    if (updates.length === 0) return res.json({ success: true });
    
    values.push(req.params.fileId);
    await pool.query(`UPDATE document_files SET ${updates.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a file
router.delete('/:fileId', authenticate, async (req, res) => {
  try {
    const [files] = await pool.query('SELECT * FROM document_files WHERE id = ?', [req.params.fileId]);
    if (!files.length) return res.status(404).json({ error: 'File not found' });
    
    const file = files[0];
    const filePath = path.join(__dirname, '../../..', 'uploads', file.file_name);
    
    // Delete from disk
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    
    // Delete from database
    await pool.query('DELETE FROM document_files WHERE id = ?', [req.params.fileId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Copy files from one document to another (used when Quote → SO → WO)
router.post('/copy', authenticate, async (req, res) => {
  try {
    const { from_type, from_id, to_type, to_id, line_mapping } = req.body;
    
    const [files] = await pool.query(
      'SELECT * FROM document_files WHERE document_type = ? AND document_id = ?',
      [from_type, from_id]
    );
    
    const copied = [];
    for (const file of files) {
      // Determine new line_id based on mapping
      let newLineId = file.line_id;
      if (line_mapping && file.line_id && line_mapping[file.line_id]) {
        newLineId = line_mapping[file.line_id];
      }
      
      // Copy the physical file
      const oldPath = path.join(__dirname, '../../..', 'uploads', file.file_name);
      const ext = path.extname(file.file_name);
      const newFileName = `${to_type}-${to_id}-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
      const newPath = path.join(__dirname, '../../..', 'uploads', newFileName);
      
      if (fs.existsSync(oldPath)) {
        fs.copyFileSync(oldPath, newPath);
        
        const [result] = await pool.query(
          `INSERT INTO document_files (document_type, document_id, line_id, file_name, original_name, file_size, mime_type, machine_tag, description, uploaded_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [to_type, to_id, newLineId, newFileName, file.original_name, file.file_size, file.mime_type, file.machine_tag, file.description, req.user.id]
        );
        copied.push({ id: result.insertId, original_name: file.original_name });
      }
    }
    
    res.json({ copied: copied.length, files: copied });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
