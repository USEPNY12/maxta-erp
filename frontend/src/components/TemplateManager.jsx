import { useState, useEffect } from 'react';
import api from '../services/api';

/**
 * TemplateManager - Admin UI for managing document and email templates
 * Embedded in SystemSetup under a "Documents & Email" group
 */

const DOCUMENT_TYPES = [
  { value: 'purchase_order', label: 'Purchase Order', category: 'Purchasing' },
  { value: 'quote', label: 'Quote / Estimate', category: 'Sales' },
  { value: 'sales_order', label: 'Sales Order Confirmation', category: 'Sales' },
  { value: 'ar_invoice', label: 'Invoice (AR)', category: 'Sales' },
  { value: 'packing_slip', label: 'Packing Slip', category: 'Sales' },
  { value: 'work_order', label: 'Work Order', category: 'Manufacturing' },
  { value: 'receiving_report', label: 'Receiving Report', category: 'Purchasing' }
];

export default function TemplateManager() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const [previewType, setPreviewType] = useState('');
  const [previewId, setPreviewId] = useState('1');
  const [previewHtml, setPreviewHtml] = useState('');
  const [emailSettings, setEmailSettings] = useState({});
  const [activeTab, setActiveTab] = useState('templates');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
    fetchEmailSettings();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await api.get('/api/documents/templates');
      setTemplates(res.data);
    } catch (err) {
      console.log('Templates not loaded:', err.message);
    }
  };

  const fetchEmailSettings = async () => {
    try {
      const res = await api.get('/api/setup/settings/email');
      setEmailSettings(res.data || {});
    } catch (err) {
      console.log('Email settings not loaded');
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSaving(true);
    try {
      await api.put(`/api/documents/templates/${selectedTemplate.id}`, editData);
      setEditMode(false);
      fetchTemplates();
      alert('Template saved successfully');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  const handlePreview = async () => {
    if (!previewType || !previewId) return alert('Select a document type and enter an ID');
    try {
      const res = await api.get(`/api/documents/preview/${previewType}/${previewId}`, { responseType: 'text' });
      setPreviewHtml(typeof res.data === 'string' ? res.data : JSON.stringify(res.data));
    } catch (err) {
      setPreviewHtml(`<p style="color:red;padding:20px">Error: ${err.response?.data?.error || err.message}</p>`);
    }
  };

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    try {
      await api.put('/api/setup/settings/email', emailSettings);
      alert('Email settings saved');
    } catch (err) {
      alert('Failed to save: ' + (err.response?.data?.error || err.message));
    }
    setSaving(false);
  };

  return (
    <div style={{ padding: 20 }}>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        {[
          { key: 'templates', label: '📄 Document Templates' },
          { key: 'email-settings', label: '✉️ Email Configuration' },
          { key: 'preview', label: '👁️ Preview & Test' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #2563eb' : '2px solid transparent',
              background: activeTab === tab.key ? '#eff6ff' : 'transparent',
              color: activeTab === tab.key ? '#2563eb' : '#64748b',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: -2
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Document Templates</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Manage print and email templates for all document types. Templates use Handlebars syntax for dynamic data.
          </p>
          
          {templates.length === 0 ? (
            <div style={{ padding: 30, textAlign: 'center', background: '#f8fafc', borderRadius: 8, border: '1px dashed #cbd5e1' }}>
              <p style={{ fontSize: 14, color: '#64748b', marginBottom: 8 }}>No custom templates in database yet.</p>
              <p style={{ fontSize: 12, color: '#94a3b8' }}>The system is using built-in file-based templates. These can be customized by adding entries to the document_templates table.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: '#f1f5f9' }}>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Type</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Active</th>
                  <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Last Updated</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates?.map(t => (
                  <tr key={t.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px 12px' }}>{t.name}</td>
                    <td style={{ padding: '8px 12px' }}>{t.document_type}</td>
                    <td style={{ padding: '8px 12px' }}>{t.category}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, background: t.is_active ? '#dcfce7' : '#fee2e2', color: t.is_active ? '#166534' : '#991b1b' }}>
                        {t.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '8px 12px', fontSize: 11, color: '#64748b' }}>{t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '-'}</td>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <button className="erp-btn text-xs" onClick={() => { setSelectedTemplate(t); setEditMode(true); setEditData(t); }}>Edit</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Built-in templates info */}
          <div style={{ marginTop: 20, padding: 16, background: '#f0f9ff', borderRadius: 8, border: '1px solid #bae6fd' }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: '#0369a1', marginBottom: 8 }}>Built-in Templates (File-Based)</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {DOCUMENT_TYPES?.map(dt => (
                <div key={dt.value} style={{ padding: '8px 12px', background: 'white', borderRadius: 4, border: '1px solid #e0f2fe', fontSize: 11 }}>
                  <strong>{dt.label}</strong>
                  <div style={{ color: '#64748b', marginTop: 2 }}>{dt.category}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Email Settings Tab */}
      {activeTab === 'email-settings' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Email Configuration (SMTP)</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Configure SMTP settings to enable sending documents via email directly from the ERP.
          </p>
          
          <div style={{ maxWidth: 500 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>SMTP Host</label>
              <input className="erp-form-input" style={{ width: '100%' }} value={emailSettings.email_host || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_host: e.target.value }))} placeholder="smtp.gmail.com" />
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Port</label>
                <input className="erp-form-input" style={{ width: '100%' }} value={emailSettings.email_port || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_port: e.target.value }))} placeholder="587" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Secure (TLS)</label>
                <select className="erp-form-select" style={{ width: '100%' }} value={emailSettings.email_secure || 'true'} onChange={e => setEmailSettings(prev => ({ ...prev, email_secure: e.target.value }))}>
                  <option value="true">Yes (TLS)</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Username / Email</label>
              <input className="erp-form-input" style={{ width: '100%' }} value={emailSettings.email_user || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_user: e.target.value }))} placeholder="your-email@gmail.com" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Password / App Password</label>
              <input className="erp-form-input" type="password" style={{ width: '100%' }} value={emailSettings.email_password || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_password: e.target.value }))} placeholder="••••••••" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>From Address</label>
              <input className="erp-form-input" style={{ width: '100%' }} value={emailSettings.email_from || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_from: e.target.value }))} placeholder="noreply@maxtagroup.com" />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Company Name (in emails)</label>
              <input className="erp-form-input" style={{ width: '100%' }} value={emailSettings.email_company_name || ''} onChange={e => setEmailSettings(prev => ({ ...prev, email_company_name: e.target.value }))} placeholder="Max TA Group LLC" />
            </div>
            <button className="erp-btn erp-btn-primary" onClick={handleSaveEmailSettings} disabled={saving}>
              {saving ? 'Saving...' : 'Save Email Settings'}
            </button>
          </div>
        </div>
      )}

      {/* Preview & Test Tab */}
      {activeTab === 'preview' && (
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 12 }}>Preview & Test Documents</h3>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            Preview how documents will look when printed or emailed. Select a document type and enter a record ID.
          </p>
          
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'flex-end' }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Document Type</label>
              <select className="erp-form-select" value={previewType} onChange={e => setPreviewType(e.target.value)}>
                <option value="">Select...</option>
                {DOCUMENT_TYPES?.map(dt => (
                  <option key={dt.value} value={dt.value}>{dt.label} ({dt.category})</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Record ID</label>
              <input className="erp-form-input" value={previewId} onChange={e => setPreviewId(e.target.value)} placeholder="1" style={{ width: 80 }} />
            </div>
            <button className="erp-btn erp-btn-primary" onClick={handlePreview}>Preview</button>
            <button className="erp-btn" onClick={() => {
              if (!previewType || !previewId) return;
              const token = localStorage.getItem('erp_token');
              const baseUrl = import.meta.env.VITE_API_URL || '';
              const pdfConfig = DOC_TYPE_MAP[previewType];
              if (pdfConfig) {
                window.open(`${baseUrl}${pdfConfig.pdfUrl}/${previewId}/pdf?token=${token}`, '_blank');
              }
            }}>Download PDF</button>
          </div>

          {previewHtml && (
            <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', height: 600 }}>
              <iframe
                srcDoc={previewHtml}
                style={{ width: '100%', height: '100%', border: 'none' }}
                title="Document Preview"
              />
            </div>
          )}
        </div>
      )}

      {/* Edit Template Modal */}
      {editMode && selectedTemplate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: '90%', maxWidth: 900, maxHeight: '85vh', background: 'white', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '12px 16px', background: '#1e293b', color: 'white', fontWeight: 600 }}>
              Edit Template: {selectedTemplate.name}
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Template Name</label>
                <input className="erp-form-input" style={{ width: '100%' }} value={editData.name || ''} onChange={e => setEditData(prev => ({ ...prev, name: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Subject Template</label>
                <input className="erp-form-input" style={{ width: '100%' }} value={editData.subject_template || ''} onChange={e => setEditData(prev => ({ ...prev, subject_template: e.target.value }))} placeholder="Purchase Order {{po_number}} - {{company.name}}" />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Email Body Template (HTML)</label>
                <textarea className="erp-form-input" style={{ width: '100%', fontFamily: 'monospace', fontSize: 11 }} rows={6} value={editData.body_template || ''} onChange={e => setEditData(prev => ({ ...prev, body_template: e.target.value }))} />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>PDF Template (Handlebars HTML)</label>
                <textarea className="erp-form-input" style={{ width: '100%', fontFamily: 'monospace', fontSize: 11 }} rows={15} value={editData.pdf_template || ''} onChange={e => setEditData(prev => ({ ...prev, pdf_template: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '12px 16px', background: '#f7fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="erp-btn" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="erp-btn erp-btn-primary" onClick={handleSaveTemplate} disabled={saving}>{saving ? 'Saving...' : 'Save Template'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

}

// Helper: map document types to PDF URL paths
const DOC_TYPE_MAP = {
  purchase_order: { pdfUrl: '/api/documents/purchase-order' },
  quote: { pdfUrl: '/api/documents/quote' },
  sales_order: { pdfUrl: '/api/documents/order' },
  ar_invoice: { pdfUrl: '/api/documents/invoice' },
  packing_slip: { pdfUrl: '/api/documents/packing-list' },
  work_order: { pdfUrl: '/api/documents/work-order' },
  receiving_report: { pdfUrl: '/api/documents/receiving-report' }
};
