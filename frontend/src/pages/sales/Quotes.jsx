import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [customerPO, setCustomerPO] = useState('');
  const [newQuote, setNewQuote] = useState({
    customer_id: '', project_name: '', expiry_date: '', payment_terms: 'Net 30', lead_time_days: 21, notes: '', internal_notes: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '' }]
  });

  useEffect(() => { fetchQuotes(); fetchCustomers(); fetchItems(); }, [statusFilter]);

  const fetchQuotes = async () => {
    try {
      const res = await api.get('/api/sales/quotes', { params: { search, status: statusFilter } });
      setQuotes(Array.isArray(res.data) ? res.data : []);
    } catch { setQuotes([]); }
  };
  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };
  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };

  const openDetail = async (quote) => {
    try {
      const res = await api.get(`/api/sales/quotes/${quote.id}`);
      setSelected(res.data);
      setActiveTab('Lines');
      setShowDetail(true);
    } catch { toast.error('Failed to load quote details'); }
  };

  const handleCreateQuote = async () => {
    try {
      const payload = { ...newQuote, customer_id: parseInt(newQuote.customer_id), lines: newQuote.lines.filter(l => l.description) };
      await api.post('/api/sales/quotes', payload);
      toast.success('Quote created');
      setShowNew(false);
      setNewQuote({ customer_id: '', project_name: '', expiry_date: '', payment_terms: 'Net 30', lead_time_days: 21, notes: '', internal_notes: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '' }] });
      fetchQuotes();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create quote'); }
  };

  const handleSendQuote = async () => {
    try { await api.post(`/api/sales/quotes/${selected.id}/send`); toast.success('Quote sent'); openDetail(selected); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleAcceptQuote = async () => {
    try { await api.post(`/api/sales/quotes/${selected.id}/accept`); toast.success('Quote accepted'); openDetail(selected); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleConvertToOrder = async () => {
    try {
      const res = await api.post(`/api/sales/quotes/${selected.id}/convert`, { customer_po: customerPO });
      toast.success(`Converted! Sales Order ${res.data.order_number} created`);
      setShowConvertDialog(false);
      setCustomerPO('');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to convert'); }
  };
  const handleEmailQuote = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'quote', document_id: selected.id, to_email: emailTo, subject: `Quote ${selected.quote_number} - ${selected.project_name}` });
      toast.success('Email sent'); setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addLine = () => setNewQuote({ ...newQuote, lines: [...newQuote.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '' }] });
  const removeLine = (idx) => setNewQuote({ ...newQuote, lines: newQuote.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx, field, value) => {
    const lines = [...newQuote.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    setNewQuote({ ...newQuote, lines });
  };
  const getTotal = () => newQuote.lines.reduce((sum, l) => sum + ((parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0)), 0);

  const productTypes = ['tempered_panel', 'laminated', 'tempered_laminated', 'igu_standard', 'igu_low_e', 'heat_soaked', 'custom'];
  const glassTypes = ['Clear Float', 'Low-E', 'Tinted Grey', 'Tinted Bronze', 'Tinted Green', 'Starphire', 'Frosted', 'Patterned'];
  const thicknesses = ['4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '15mm', '19mm'];
  const edgeTypes = ['Seamed', 'Flat Polish', 'Pencil Polish', 'Beveled', 'Ogee', 'Mitered'];

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatSqft = (w, h) => w && h ? ((parseFloat(w) * parseFloat(h)) / 144).toFixed(2) : '-';

  return (
    <div className="p-3 h-full flex flex-col">
      {/* Toolbar */}
      <div className="erp-toolbar mb-2">
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(true)}>+ New Quote</button>
        <div className="erp-toolbar-separator"></div>
        <input className="erp-form-input w-48" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchQuotes()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option>
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="converted">Converted</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchQuotes}>Refresh</button>
      </div>

      {/* Quote List */}
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Quote#</th><th>Date</th><th>Customer</th><th>Project</th><th>Lines</th><th>Total</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            {quotes.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No quotes found</td></tr> : quotes.map(q => (
              <tr key={q.id} className="cursor-pointer" onClick={() => openDetail(q)}>
                <td className="text-blue-700 font-bold">{q.quote_number}</td>
                <td>{formatDate(q.quote_date)}</td>
                <td>{q.customer_name}</td>
                <td>{q.project_name || '-'}</td>
                <td className="text-center">{q.line_count || '-'}</td>
                <td className="text-right font-bold">${parseFloat(q.total || 0).toFixed(2)}</td>
                <td>{formatDate(q.expiry_date)}</td>
                <td><span className={`erp-status erp-status-${(q.status || '').toLowerCase()}`}>{q.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '900px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Quote {selected.quote_number} — {selected.project_name || 'Untitled'}</span>
              <span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              {/* Header Info */}
              <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
                <div><span className="text-gray-500">Customer:</span><br/><strong>{selected.company_name}</strong></div>
                <div><span className="text-gray-500">Quote Date:</span><br/><strong>{formatDate(selected.quote_date)}</strong></div>
                <div><span className="text-gray-500">Expires:</span><br/><strong>{formatDate(selected.expiry_date)}</strong></div>
                <div><span className="text-gray-500">Lead Time:</span><br/><strong>{selected.lead_time_days || '-'} days</strong></div>
                <div><span className="text-gray-500">Payment Terms:</span><br/><strong>{selected.payment_terms || 'Net 30'}</strong></div>
                <div><span className="text-gray-500">Total:</span><br/><strong className="text-lg text-green-700">${parseFloat(selected.total || 0).toFixed(2)}</strong></div>
                {selected.notes && <div className="col-span-2"><span className="text-gray-500">Notes:</span><br/>{selected.notes}</div>}
              </div>

              {/* Tabs */}
              <div className="erp-tabs">
                {['Lines', 'Drawings', 'History'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="p-3 border border-t-0" style={{ minHeight: '200px' }}>
                {activeTab === 'Lines' && (
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Description</th><th>Product Type</th><th>Glass</th><th>Size (W×H)</th><th>SqFt</th><th>Edge</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                      {(selected.lines || []).map((l, i) => (
                        <tr key={i}>
                          <td>{l.line_number}</td>
                          <td className="font-medium">{l.description}</td>
                          <td><span className="bg-blue-100 text-blue-800 px-1 rounded text-[10px]">{(l.product_type || '').replace(/_/g, ' ')}</span></td>
                          <td>{l.glass_type} {l.thickness}</td>
                          <td className="text-center">{l.width_inches && l.height_inches ? `${l.width_inches}" × ${l.height_inches}"` : '-'}</td>
                          <td className="text-right">{formatSqft(l.width_inches, l.height_inches)}</td>
                          <td>{l.edge_type || '-'}</td>
                          <td className="text-right">{l.quantity}</td>
                          <td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
                          <td className="text-right font-bold">${parseFloat(l.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold"><td colSpan="9" className="text-right">Total:</td><td className="text-right">${parseFloat(selected.total || 0).toFixed(2)}</td></tr>
                    </tbody>
                  </table>
                )}
                {activeTab === 'Drawings' && (
                  <div>
                    {(selected.drawings || []).length === 0 ? <p className="text-gray-500 text-center py-8">No drawings attached</p> : (
                      <div className="grid grid-cols-3 gap-3">
                        {selected.drawings.map((d, i) => (
                          <div key={i} className="border p-2 rounded">
                            <div className="text-xs font-bold">{d.file_name || d.drawing_name}</div>
                            <div className="text-[10px] text-gray-500">{d.drawing_type || 'Shop Drawing'} • {formatDate(d.created_at)}</div>
                            <div className="text-[10px]">Status: <span className={`erp-status erp-status-${(d.status || 'pending').toLowerCase()}`}>{d.status || 'pending'}</span></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'History' && (
                  <div className="text-xs text-gray-500 text-center py-8">Audit trail: Created {formatDate(selected.created_at)} • Last updated {formatDate(selected.updated_at)}</div>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleSendQuote}>📤 Send to Customer</button>}
              {['draft', 'sent'].includes(selected.status) && <button className="erp-btn" style={{ background: '#27ae60', color: 'white' }} onClick={handleAcceptQuote}>✓ Accept Quote</button>}
              {['draft', 'sent', 'accepted'].includes(selected.status) && selected.status !== 'converted' && (
                <button className="erp-btn" style={{ background: '#8e44ad', color: 'white' }} onClick={() => setShowConvertDialog(true)}>⟹ Convert to Order</button>
              )}
              <button className="erp-btn" onClick={() => { setEmailTo(selected.customer_email || ''); setShowEmailDialog(true); }}>✉ Email</button>
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Quote Modal */}
      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '1000px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Quote — Glass Fabrication</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              {/* Header Fields */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer*:</label>
                  <select className="erp-form-select" value={newQuote.customer_id} onChange={e => setNewQuote({ ...newQuote, customer_id: e.target.value })}>
                    <option value="">Select Customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Project Name:</label><input className="erp-form-input" value={newQuote.project_name} onChange={e => setNewQuote({ ...newQuote, project_name: e.target.value })} placeholder="e.g. Office Tower Level 3" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Expiry Date:</label><input className="erp-form-input" type="date" value={newQuote.expiry_date} onChange={e => setNewQuote({ ...newQuote, expiry_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Terms:</label>
                  <select className="erp-form-select" value={newQuote.payment_terms} onChange={e => setNewQuote({ ...newQuote, payment_terms: e.target.value })}>
                    <option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option><option>50% Deposit</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Lead Time (days):</label><input className="erp-form-input" type="number" value={newQuote.lead_time_days} onChange={e => setNewQuote({ ...newQuote, lead_time_days: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><input className="erp-form-input" value={newQuote.notes} onChange={e => setNewQuote({ ...newQuote, notes: e.target.value })} /></div>
              </div>

              {/* Line Items with Glass Specs */}
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold">Line Items — Glass Specifications</span>
                <button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-grid" style={{ minWidth: '900px' }}>
                  <thead><tr><th>Description*</th><th>Product Type</th><th>Glass Type</th><th>Thickness</th><th>W"</th><th>H"</th><th>Edge</th><th>Qty</th><th>Unit $</th><th>Total</th><th></th></tr></thead>
                  <tbody>
                    {newQuote.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Panel description" /></td>
                        <td><select className="erp-form-select w-full" value={line.product_type} onChange={e => updateLine(idx, 'product_type', e.target.value)}>
                          <option value="">Select...</option>{productTypes.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>)}
                        </select></td>
                        <td><select className="erp-form-select w-full" value={line.glass_type} onChange={e => updateLine(idx, 'glass_type', e.target.value)}>
                          <option value="">Select...</option>{glassTypes.map(gt => <option key={gt} value={gt}>{gt}</option>)}
                        </select></td>
                        <td><select className="erp-form-select w-20" value={line.thickness} onChange={e => updateLine(idx, 'thickness', e.target.value)}>
                          <option value="">-</option>{thicknesses.map(t => <option key={t} value={t}>{t}</option>)}
                        </select></td>
                        <td><input className="erp-form-input w-14 text-right" type="number" value={line.width_inches} onChange={e => updateLine(idx, 'width_inches', e.target.value)} /></td>
                        <td><input className="erp-form-input w-14 text-right" type="number" value={line.height_inches} onChange={e => updateLine(idx, 'height_inches', e.target.value)} /></td>
                        <td><select className="erp-form-select w-full" value={line.edge_type} onChange={e => updateLine(idx, 'edge_type', e.target.value)}>
                          <option value="">-</option>{edgeTypes.map(et => <option key={et} value={et}>{et}</option>)}
                        </select></td>
                        <td><input className="erp-form-input w-14 text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                        <td><input className="erp-form-input w-20 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                        <td className="text-right font-bold">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                        <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100"><td colSpan="9" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal().toFixed(2)}</td><td></td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateQuote} disabled={!newQuote.customer_id || !newQuote.lines.some(l => l.description)}>Save Quote</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Convert to Order Dialog */}
      {showConvertDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowConvertDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Convert Quote to Sales Order</span></div>
            <div className="erp-modal-body">
              <p className="text-xs mb-3">This will create a new Sales Order from Quote <strong>{selected?.quote_number}</strong> with all line items and glass specifications copied over.</p>
              <div className="erp-form-group"><label className="erp-form-label">Customer PO#:</label><input className="erp-form-input" value={customerPO} onChange={e => setCustomerPO(e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleConvertToOrder}>Convert to Order</button>
              <button className="erp-btn" onClick={() => setShowConvertDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowEmailDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Email Quote</span></div>
            <div className="erp-modal-body">
              <div className="erp-form-group mb-3"><label className="erp-form-label">To:</label><input className="erp-form-input w-full" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com" /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleEmailQuote} disabled={!emailTo}>Send</button>
              <button className="erp-btn" onClick={() => setShowEmailDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Quotes;
