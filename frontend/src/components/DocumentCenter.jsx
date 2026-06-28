import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const DocumentCenter = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [branding, setBranding] = useState({});
  const [emailLog, setEmailLog] = useState([]);
  const [statements, setStatements] = useState([]);
  const [batchJobs, setBatchJobs] = useState([]);
  const [portalTokens, setPortalTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState({ type: '', date_from: '', date_to: '' });
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [showStatementModal, setShowStatementModal] = useState(false);
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/document-center/stats');
      setStats(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const params = {};
      if (filter.type) params.type = filter.type;
      if (filter.date_from) params.date_from = filter.date_from;
      if (filter.date_to) params.date_to = filter.date_to;
      const res = await api.get('/document-center/search', { params });
      setDocuments(res.data.documents || []);
    } catch (e) { console.error(e); }
  }, [filter]);

  const loadEmailLog = useCallback(async () => {
    try {
      const res = await api.get('/document-center/email-log');
      setEmailLog(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadStatements = useCallback(async () => {
    try {
      const res = await api.get('/document-center/statements');
      setStatements(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadBatchJobs = useCallback(async () => {
    try {
      const res = await api.get('/document-center/batch');
      setBatchJobs(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadPortalTokens = useCallback(async () => {
    try {
      const res = await api.get('/document-center/portal/tokens');
      setPortalTokens(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadBranding = useCallback(async () => {
    try {
      const res = await api.get('/document-center/branding');
      setBranding(res.data);
    } catch (e) { console.error(e); }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const res = await api.get('/sales/customers');
      setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []);
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => {
    loadStats();
    loadBranding();
    loadCustomers();
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') loadDocuments();
    if (activeTab === 'email') loadEmailLog();
    if (activeTab === 'statements') loadStatements();
    if (activeTab === 'batch') loadBatchJobs();
    if (activeTab === 'portal') loadPortalTokens();
  }, [activeTab]);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const formatSize = (bytes) => bytes ? `${(bytes / 1024).toFixed(1)} KB` : '-';
  const formatCurrency = (val) => val != null ? `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'documents', label: 'Documents', icon: '📄' },
    { id: 'statements', label: 'Statements', icon: '📋' },
    { id: 'email', label: 'Email Log', icon: '📧' },
    { id: 'batch', label: 'Batch Jobs', icon: '📦' },
    { id: 'portal', label: 'Customer Portal', icon: '🌐' },
    { id: 'branding', label: 'Branding', icon: '🎨' }
  ];

  // ============ OVERVIEW TAB ============
  const renderOverview = () => (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
          <div className="text-2xl font-bold text-blue-700">{stats?.total_documents || 0}</div>
          <div className="text-sm text-blue-600">Total Documents</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{stats?.total_size_mb || 0} MB</div>
          <div className="text-sm text-green-600">Storage Used</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
          <div className="text-2xl font-bold text-purple-700">{stats?.emails_last_30_days || 0}</div>
          <div className="text-sm text-purple-600">Emails (30 days)</div>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
          <div className="text-2xl font-bold text-amber-700">{stats?.pending_approvals || 0}</div>
          <div className="text-sm text-amber-600">Pending Approvals</div>
        </div>
      </div>

      {stats?.by_type?.length > 0 && (
        <div className="bg-white rounded-lg border p-4">
          <h3 className="font-semibold mb-3">Documents by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stats.by_type?.map(t => (
              <div key={t.document_type} className="border rounded p-3 text-center">
                <div className="text-lg font-bold">{t.count}</div>
                <div className="text-xs text-gray-500 capitalize">{t.document_type.replace(/_/g, ' ')}</div>
                <div className="text-xs text-gray-400">Last: {formatDate(t.last_generated)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        <button onClick={() => setShowStatementModal(true)} className="bg-blue-600 text-white rounded-lg p-4 hover:bg-blue-700 transition text-left">
          <div className="font-semibold">Generate Statement</div>
          <div className="text-sm opacity-80">Create customer account statement</div>
        </button>
        <button onClick={() => setShowBatchModal(true)} className="bg-green-600 text-white rounded-lg p-4 hover:bg-green-700 transition text-left">
          <div className="font-semibold">Batch Generate</div>
          <div className="text-sm opacity-80">Generate multiple documents at once</div>
        </button>
        <button onClick={() => setShowPortalModal(true)} className="bg-purple-600 text-white rounded-lg p-4 hover:bg-purple-700 transition text-left">
          <div className="font-semibold">Portal Link</div>
          <div className="text-sm opacity-80">Create customer portal access</div>
        </button>
      </div>
    </div>
  );

  // ============ DOCUMENTS TAB ============
  const renderDocuments = () => (
    <div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filter.type} onChange={e => setFilter({...filter, type: e.target.value})} className="border rounded px-3 py-2 text-sm">
          <option value="">All Types</option>
          <option value="quote">Quotes</option>
          <option value="sales_order">Sales Orders</option>
          <option value="ar_invoice">Invoices</option>
          <option value="purchase_order">Purchase Orders</option>
          <option value="packing_slip">Packing Slips</option>
          <option value="work_order">Work Orders</option>
          <option value="statement">Statements</option>
        </select>
        <input type="date" value={filter.date_from} onChange={e => setFilter({...filter, date_from: e.target.value})} className="border rounded px-3 py-2 text-sm" placeholder="From" />
        <input type="date" value={filter.date_to} onChange={e => setFilter({...filter, date_to: e.target.value})} className="border rounded px-3 py-2 text-sm" placeholder="To" />
        <button onClick={loadDocuments} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">Search</button>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Document #</th>
              <th className="px-3 py-2 text-left">Version</th>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Method</th>
              <th className="px-3 py-2 text-left">Generated By</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {documents?.map(doc => (
              <tr key={doc.id} className="border-b hover:bg-gray-50">
                <td className="px-3 py-2">
                  <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-700 capitalize">
                    {doc.document_type?.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono">{doc.document_number || `#${doc.document_id}`}</td>
                <td className="px-3 py-2">v{doc.version}</td>
                <td className="px-3 py-2">{formatSize(doc.file_size)}</td>
                <td className="px-3 py-2 capitalize">{doc.generation_method}</td>
                <td className="px-3 py-2">{doc.generated_by_name || '-'}</td>
                <td className="px-3 py-2">{formatDate(doc.created_at)}</td>
                <td className="px-3 py-2">
                  <button onClick={() => window.open(`/api/document-center/versions/${doc.id}/download`, '_blank')} className="text-blue-600 hover:underline text-xs mr-2">Download</button>
                </td>
              </tr>
            ))}
            {documents.length === 0 && (
              <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-400">No documents found. Generate your first document from Sales, Purchasing, or Manufacturing modules.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  // ============ STATEMENTS TAB ============
  const renderStatements = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Customer Statements</h3>
        <button onClick={() => setShowStatementModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">+ Generate Statement</button>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Statement Date</th>
            <th className="px-3 py-2 text-left">Period</th>
            <th className="px-3 py-2 text-right">Opening</th>
            <th className="px-3 py-2 text-right">Invoiced</th>
            <th className="px-3 py-2 text-right">Payments</th>
            <th className="px-3 py-2 text-right">Closing</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {statements?.map(s => (
            <tr key={s.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{s.customer_name}</td>
              <td className="px-3 py-2">{formatDate(s.statement_date)}</td>
              <td className="px-3 py-2 text-xs">{formatDate(s.period_start)} - {formatDate(s.period_end)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(s.opening_balance)}</td>
              <td className="px-3 py-2 text-right">{formatCurrency(s.total_invoiced)}</td>
              <td className="px-3 py-2 text-right text-green-600">{formatCurrency(s.total_payments)}</td>
              <td className="px-3 py-2 text-right font-bold">{formatCurrency(s.closing_balance)}</td>
              <td className="px-3 py-2">
                {s.file_path && <button className="text-blue-600 hover:underline text-xs">View PDF</button>}
              </td>
            </tr>
          ))}
          {statements.length === 0 && (
            <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-400">No statements generated yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ============ EMAIL LOG TAB ============
  const renderEmailLog = () => (
    <div>
      <h3 className="font-semibold mb-4">Email History</h3>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Date</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">To</th>
            <th className="px-3 py-2 text-left">Subject</th>
            <th className="px-3 py-2 text-left">Sent By</th>
            <th className="px-3 py-2 text-left">Status</th>
          </tr>
        </thead>
        <tbody>
          {emailLog?.map(e => (
            <tr key={e.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2">{formatDate(e.sent_at)}</td>
              <td className="px-3 py-2 capitalize">{e.document_type?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2">{e.to_address}</td>
              <td className="px-3 py-2">{e.subject}</td>
              <td className="px-3 py-2">{e.sent_by_name || '-'}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-1 rounded text-xs ${e.status === 'sent' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {e.status}
                </span>
              </td>
            </tr>
          ))}
          {emailLog.length === 0 && (
            <tr><td colSpan="6" className="px-3 py-8 text-center text-gray-400">No emails sent yet. Configure SMTP in System Setup to enable email.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ============ BATCH JOBS TAB ============
  const renderBatchJobs = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Batch Document Jobs</h3>
        <button onClick={() => setShowBatchModal(true)} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700">+ New Batch Job</button>
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">ID</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">Processed</th>
            <th className="px-3 py-2 text-right">Failed</th>
            <th className="px-3 py-2 text-left">Started By</th>
            <th className="px-3 py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {batchJobs?.map(j => (
            <tr key={j.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2">#{j.id}</td>
              <td className="px-3 py-2 capitalize">{j.job_type}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-1 rounded text-xs ${j.status === 'completed' ? 'bg-green-100 text-green-700' : j.status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                  {j.status}
                </span>
              </td>
              <td className="px-3 py-2 text-right">{j.total_documents}</td>
              <td className="px-3 py-2 text-right text-green-600">{j.processed_documents}</td>
              <td className="px-3 py-2 text-right text-red-600">{j.failed_documents}</td>
              <td className="px-3 py-2">{j.started_by_name || '-'}</td>
              <td className="px-3 py-2">{formatDate(j.created_at)}</td>
            </tr>
          ))}
          {batchJobs.length === 0 && (
            <tr><td colSpan="8" className="px-3 py-8 text-center text-gray-400">No batch jobs yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ============ CUSTOMER PORTAL TAB ============
  const renderPortal = () => (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-semibold">Customer Portal Access Tokens</h3>
        <button onClick={() => setShowPortalModal(true)} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700">+ Generate Link</button>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-4 text-sm">
        <strong>Customer Portal:</strong> Generate secure links that allow customers to view their invoices, quotes, orders, and statements without logging in. Links expire after the configured period.
      </div>
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Customer</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Created</th>
            <th className="px-3 py-2 text-left">Expires</th>
            <th className="px-3 py-2 text-right">Views</th>
            <th className="px-3 py-2 text-left">Last Access</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {portalTokens?.map(t => (
            <tr key={t.id} className="border-b hover:bg-gray-50">
              <td className="px-3 py-2 font-medium">{t.customer_name}</td>
              <td className="px-3 py-2 capitalize">{t.token_type?.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2">{formatDate(t.created_at)}</td>
              <td className="px-3 py-2">{formatDate(t.expires_at)}</td>
              <td className="px-3 py-2 text-right">{t.access_count}</td>
              <td className="px-3 py-2">{t.last_accessed ? formatDate(t.last_accessed) : 'Never'}</td>
              <td className="px-3 py-2">
                <button onClick={async () => { await api.delete(`/document-center/portal/tokens/${t.id}`); loadPortalTokens(); showToast('Token revoked'); }} className="text-red-600 hover:underline text-xs">Revoke</button>
              </td>
            </tr>
          ))}
          {portalTokens.length === 0 && (
            <tr><td colSpan="7" className="px-3 py-8 text-center text-gray-400">No active portal tokens.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  // ============ BRANDING TAB ============
  const renderBranding = () => {
    const [editBranding, setEditBranding] = useState({...branding});
    const saveBranding = async () => {
      setLoading(true);
      try {
        await api.put('/document-center/branding', editBranding);
        setBranding(editBranding);
        showToast('Branding saved successfully');
      } catch (e) { showToast('Error saving branding', 'error'); }
      setLoading(false);
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold">Company Branding & Document Settings</h3>
          <button onClick={saveBranding} disabled={loading} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Company Information</h4>
            {['company_name', 'company_address', 'company_city', 'company_state', 'company_zip', 'company_phone', 'company_fax', 'company_email', 'company_website'].map(key => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">{key.replace('company_', '').replace(/_/g, ' ')}</label>
                <input type="text" value={editBranding[key] || ''} onChange={e => setEditBranding({...editBranding, [key]: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            ))}
          </div>
          <div className="space-y-4">
            <h4 className="font-medium text-gray-700 border-b pb-2">Appearance</h4>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Logo URL</label>
              <input type="text" value={editBranding.company_logo_url || ''} onChange={e => setEditBranding({...editBranding, company_logo_url: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" placeholder="https://..." />
            </div>
            <div className="grid grid-cols-3 gap-3">
              {['primary_color', 'secondary_color', 'accent_color'].map(key => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                  <div className="flex gap-2">
                    <input type="color" value={editBranding[key] || '#1e40af'} onChange={e => setEditBranding({...editBranding, [key]: e.target.value})} className="w-10 h-10 rounded cursor-pointer" />
                    <input type="text" value={editBranding[key] || ''} onChange={e => setEditBranding({...editBranding, [key]: e.target.value})} className="flex-1 border rounded px-2 text-xs font-mono" />
                  </div>
                </div>
              ))}
            </div>
            <h4 className="font-medium text-gray-700 border-b pb-2 mt-6">Document Terms & Footer</h4>
            {['document_footer', 'quote_terms', 'invoice_terms', 'po_terms'].map(key => (
              <div key={key}>
                <label className="block text-xs text-gray-500 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                <textarea value={editBranding[key] || ''} onChange={e => setEditBranding({...editBranding, [key]: e.target.value})} className="w-full border rounded px-3 py-2 text-sm" rows="2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ============ STATEMENT MODAL ============
  const StatementModal = () => {
    const [custId, setCustId] = useState('');
    const [periodStart, setPeriodStart] = useState('');
    const [periodEnd, setPeriodEnd] = useState('');
    const [generating, setGenerating] = useState(false);

    const generate = async () => {
      if (!custId) return;
      setGenerating(true);
      try {
        const res = await api.post('/document-center/statements/generate', {
          customer_id: parseInt(custId),
          period_start: periodStart || undefined,
          period_end: periodEnd || undefined
        });
        showToast(`Statement generated: ${res.data.customer} - Balance: $${res.data.closing_balance?.toFixed(2)}`);
        setShowStatementModal(false);
        if (activeTab === 'statements') loadStatements();
      } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
      setGenerating(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="font-semibold text-lg mb-4">Generate Customer Statement</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Customer</label>
              <select value={custId} onChange={e => setCustId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {(customers || [])?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Period Start</label>
                <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Period End</label>
                <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" />
              </div>
            </div>
            <p className="text-xs text-gray-400">Leave dates blank for previous month.</p>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowStatementModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={generate} disabled={generating || !custId} className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 disabled:opacity-50">
              {generating ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ============ PORTAL LINK MODAL ============
  const PortalModal = () => {
    const [custId, setCustId] = useState('');
    const [expDays, setExpDays] = useState('30');
    const [generatedLink, setGeneratedLink] = useState('');
    const [generating, setGenerating] = useState(false);

    const generate = async () => {
      if (!custId) return;
      setGenerating(true);
      try {
        const res = await api.post('/document-center/portal/generate-link', {
          customer_id: parseInt(custId),
          expires_days: parseInt(expDays)
        });
        setGeneratedLink(res.data.portal_url);
        showToast('Portal link generated');
        loadPortalTokens();
      } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
      setGenerating(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="font-semibold text-lg mb-4">Generate Customer Portal Link</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Customer</label>
              <select value={custId} onChange={e => setCustId(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="">Select customer...</option>
                {(customers || [])?.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Expires In (days)</label>
              <input type="number" value={expDays} onChange={e => setExpDays(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" min="1" max="365" />
            </div>
            {generatedLink && (
              <div className="bg-green-50 border border-green-200 rounded p-3">
                <div className="text-xs text-green-700 mb-1">Portal Link (share with customer):</div>
                <div className="font-mono text-xs break-all text-green-800">{generatedLink}</div>
                <button onClick={() => { navigator.clipboard.writeText(generatedLink); showToast('Copied!'); }} className="mt-2 text-xs text-green-600 underline">Copy to clipboard</button>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowPortalModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Close</button>
            {!generatedLink && (
              <button onClick={generate} disabled={generating || !custId} className="bg-purple-600 text-white px-4 py-2 rounded text-sm hover:bg-purple-700 disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate Link'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ============ BATCH MODAL ============
  const BatchModal = () => {
    const [jobType, setJobType] = useState('invoices');
    const [docIds, setDocIds] = useState('');
    const [running, setRunning] = useState(false);

    const run = async () => {
      const ids = docIds.split(',')?.map(s => parseInt(s.trim()))?.filter(n => !isNaN(n));
      if (!ids.length) { showToast('Enter document IDs', 'error'); return; }
      setRunning(true);
      try {
        const res = await api.post('/document-center/batch/generate', { job_type: jobType, document_ids: ids });
        showToast(`Batch complete: ${res.data.processed} processed, ${res.data.failed} failed`);
        setShowBatchModal(false);
        if (activeTab === 'batch') loadBatchJobs();
      } catch (e) { showToast(e.response?.data?.error || 'Error', 'error'); }
      setRunning(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h3 className="font-semibold text-lg mb-4">Batch Document Generation</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Document Type</label>
              <select value={jobType} onChange={e => setJobType(e.target.value)} className="w-full border rounded px-3 py-2 text-sm">
                <option value="invoices">Invoices</option>
                <option value="quotes">Quotes</option>
                <option value="purchase_orders">Purchase Orders</option>
                <option value="statements">Statements</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Document IDs (comma-separated)</label>
              <input type="text" value={docIds} onChange={e => setDocIds(e.target.value)} className="w-full border rounded px-3 py-2 text-sm" placeholder="1, 2, 3, 4, 5" />
              <p className="text-xs text-gray-400 mt-1">Enter the IDs of documents to generate PDFs for.</p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button onClick={run} disabled={running} className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 disabled:opacity-50">
              {running ? 'Processing...' : 'Run Batch'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Document Center</h1>
          <p className="text-sm text-gray-500">Generate, manage, and track all business documents</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b">
        {tabs?.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 transition ${
              activeTab === tab.id 
                ? 'border-blue-600 text-blue-600 font-medium' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <span className="mr-1">{tab.icon}</span> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg border p-4 md:p-6">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'documents' && renderDocuments()}
        {activeTab === 'statements' && renderStatements()}
        {activeTab === 'email' && renderEmailLog()}
        {activeTab === 'batch' && renderBatchJobs()}
        {activeTab === 'portal' && renderPortal()}
        {activeTab === 'branding' && renderBranding()}
      </div>

      {/* Modals */}
      {showStatementModal && <StatementModal />}
      {showPortalModal && <PortalModal />}
      {showBatchModal && <BatchModal />}
    </div>
  );
};

export default DocumentCenter;
