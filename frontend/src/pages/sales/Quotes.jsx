import DocumentActions from '../../components/DocumentActions';
import FileAttachments from '../../components/FileAttachments';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [searchParams] = useSearchParams();
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [fabCharges, setFabCharges] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showConvertDialog, setShowConvertDialog] = useState(false);
  const [customerPO, setCustomerPO] = useState('');
  const [quoteFabCharges, setQuoteFabCharges] = useState({});
  const [newQuote, setNewQuote] = useState({
    customer_id: '', project_name: '', expiry_date: '', payment_terms: 'Net 30', lead_time_days: 21, notes: '', internal_notes: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '', fabrication: [] }]
  });

  useEffect(() => { fetchQuotes(); fetchCustomers(); fetchItems(); fetchFabCharges(); }, [statusFilter]);

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
  const fetchFabCharges = async () => {
    try { const res = await api.get('/api/sales/fabrication-charges'); setFabCharges(Array.isArray(res.data) ? res.data : []); } catch { setFabCharges([]); }
  };

  const openDetail = async (quote) => {
    try {
      const res = await api.get(`/api/sales/quotes/${quote.id}`);
      setSelected(res.data);
      try {
        const fabRes = await api.get(`/api/sales/quotes/${quote.id}/fabrication`);
        const grouped = {};
        (fabRes.data || [])?.forEach(fc => {
          if (!grouped[fc.quote_line_id]) grouped[fc.quote_line_id] = [];
          grouped[fc.quote_line_id].push(fc);
        });
        setQuoteFabCharges(grouped);
      } catch { setQuoteFabCharges({}); }
      setActiveTab('Lines');
      setShowDetail(true);
    } catch { toast.error('Failed to load quote details'); }
  };

  const handleCreateQuote = async () => {
    try {
      const payload = { ...newQuote, customer_id: parseInt(newQuote.customer_id), lines: newQuote.lines?.filter(l => l.description) };
      const res = await api.post('/api/sales/quotes', payload);
      const quoteId = res.data.id;
      for (let idx = 0; idx < payload.lines.length; idx++) {
        const line = payload.lines[idx];
        if (line.fabrication && line.fabrication.length > 0) {
          const lineId = res.data.lines ? res.data.lines[idx]?.id : idx + 1;
          for (const fab of line.fabrication) {
            if (fab.fabrication_charge_id && fab.quantity > 0) {
              await api.post(`/api/sales/quotes/${quoteId}/lines/${lineId}/fabrication`, {
                fabrication_charge_id: fab.fabrication_charge_id,
                quantity: fab.quantity,
                rate: fab.rate,
                notes: fab.notes || ''
              });
            }
          }
        }
      }
      toast.success(`Quote ${res.data.quote_number || ''} created`);
      setShowNew(false);
      setNewQuote({ customer_id: '', project_name: '', expiry_date: '', payment_terms: 'Net 30', lead_time_days: 21, notes: '', internal_notes: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '', fabrication: [] }] });
      fetchQuotes();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create quote'); }
  };

  const handleSendQuote = async () => {
    try { await api.post(`/api/sales/quotes/${selected.id}/send`); toast.success('Quote sent'); openDetail(selected); } catch { toast.error('Failed'); }
  };
  const handleAcceptQuote = async () => {
    try { await api.post(`/api/sales/quotes/${selected.id}/accept`); toast.success('Quote accepted'); openDetail(selected); } catch { toast.error('Failed'); }
  };
  const handleConvertToOrder = async () => {
    try {
      const res = await api.post(`/api/sales/quotes/${selected.id}/convert`, { customer_po: customerPO });
      // Copy files from quote to new sales order
      try { await api.post('/api/files/copy', { from_type: 'quote', from_id: selected.id, to_type: 'sales_order', to_id: res.data.id }); } catch(e) { console.log('File copy skipped:', e); }
      toast.success(`Converted! Sales Order ${res.data.order_number} created`);
      setShowConvertDialog(false); setCustomerPO(''); openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to convert'); }
  };
  const handleEmailQuote = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'quote', document_id: selected.id, to_email: emailTo, subject: `Quote ${selected.quote_number} - ${selected.project_name}` });
      toast.success('Email sent'); setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const addLine = () => setNewQuote({ ...newQuote, lines: [...newQuote.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, width_inches: '', height_inches: '', product_type: '', glass_type: '', thickness: '', edge_type: '', interlayer: '', has_holes: false, holes_count: 0, manufacturing_notes: '', fabrication: [] }] });
  const removeLine = (idx) => setNewQuote({ ...newQuote, lines: newQuote.lines?.filter((_, i) => i !== idx) });
  const updateLine = (idx, field, value) => {
    const lines = [...newQuote.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    setNewQuote({ ...newQuote, lines });
  };

  const addFabToLine = (lineIdx) => {
    const lines = [...newQuote.lines];
    lines[lineIdx].fabrication = [...(lines[lineIdx].fabrication || []), { fabrication_charge_id: '', quantity: 1, rate: 0, notes: '' }];
    setNewQuote({ ...newQuote, lines });
  };
  const updateFab = (lineIdx, fabIdx, field, value) => {
    const lines = [...newQuote.lines];
    const fab = [...lines[lineIdx].fabrication];
    fab[fabIdx] = { ...fab[fabIdx], [field]: value };
    if (field === 'fabrication_charge_id' && value) {
      const charge = fabCharges?.find(c => c.id === parseInt(value));
      if (charge) fab[fabIdx].rate = charge.default_rate;
    }
    lines[lineIdx].fabrication = fab;
    setNewQuote({ ...newQuote, lines });
  };
  const removeFab = (lineIdx, fabIdx) => {
    const lines = [...newQuote.lines];
    lines[lineIdx].fabrication = lines[lineIdx].fabrication?.filter((_, i) => i !== fabIdx);
    setNewQuote({ ...newQuote, lines });
  };
  const getFabTotal = (lineIdx) => (newQuote.lines[lineIdx].fabrication || [])?.reduce((sum, f) => sum + ((parseFloat(f.quantity) || 0) * (parseFloat(f.rate) || 0)), 0);
  const getLineTotalWithFab = (line, lineIdx) => ((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)) + getFabTotal(lineIdx);
  const getGrandTotal = () => newQuote.lines?.reduce((sum, l, idx) => sum + getLineTotalWithFab(l, idx), 0);

  const lookupPrice = async (idx, itemId) => {
    if (!itemId) return;
    try {
      const res = await api.get('/api/sales/pricing/lookup', { params: { item_id: itemId, customer_id: newQuote.customer_id, quantity: newQuote.lines[idx]?.quantity || 1 } });
      if (res.data.price) {
        const lines = [...newQuote.lines];
        const item = items?.find(i => i.id === parseInt(itemId));
        lines[idx] = { ...lines[idx], unit_price: res.data.price, description: lines[idx].description || item?.description || '' };
        setNewQuote({ ...newQuote, lines });
      }
    } catch {}
  };

  const getPricingMethodLabel = (method) => {
    const labels = { per_hole: '/hole', per_linear_foot: '/LF', per_piece: '/pc', per_sq_ft: '/sqft', per_notch: '/notch', per_cutout: '/cutout', per_corner: '/corner' };
    return labels[method] || '';
  };

  const productTypes = ['tempered_panel', 'laminated', 'tempered_laminated', 'igu_standard', 'igu_low_e', 'heat_soaked', 'custom'];
  const glassTypes = ['Clear Float', 'Low-E', 'Tinted Grey', 'Tinted Bronze', 'Tinted Green', 'Starphire', 'Frosted', 'Patterned'];
  const thicknesses = ['4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '15mm', '19mm'];
  const edgeTypes = ['Seamed', 'Flat Polish', 'Pencil Polish', 'Beveled', 'Ogee', 'Mitered'];
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatSqft = (w, h) => w && h ? ((parseFloat(w) * parseFloat(h)) / 144).toFixed(2) : '-';

  const fabChargesByCategory = fabCharges?.reduce((acc, fc) => {
    if (!acc[fc.category]) acc[fc.category] = [];
    acc[fc.category].push(fc);
    return acc;
  }, {});

  return (
    <ModulePage {...salesMenu}>
      <div className="p-3 h-full flex flex-col">
      <div className="erp-toolbar mb-2">
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(true)}>+ New Quote</button>
        <div className="erp-toolbar-separator"></div>
        <input className="erp-form-input w-48" placeholder="Search quotes..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchQuotes()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option><option value="all">All</option><option value="draft">Draft</option><option value="sent">Sent</option><option value="accepted">Accepted</option><option value="converted">Converted</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchQuotes}>Refresh</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Quote#</th><th>Date</th><th>Customer</th><th>Project</th><th>Lines</th><th>Total</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            {quotes.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No quotes found</td></tr> : (quotes || [])?.map(q => (
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

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '1100px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Quote {selected.quote_number} — {selected.customer_name}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-4 gap-3 mb-3 text-xs">
                <div><strong>Status:</strong> <span className={`erp-status erp-status-${(selected.status||'').toLowerCase()}`}>{selected.status}</span></div>
                <div><strong>Project:</strong> {selected.project_name || '-'}</div>
                <div><strong>Date:</strong> {formatDate(selected.quote_date)}</div>
                <div><strong>Expires:</strong> {formatDate(selected.expiry_date)}</div>
              </div>
              <div className="flex gap-2 mb-3 border-b pb-1">
                {['Lines', 'Fabrication', 'Files & Drawings', 'History'].map(t => (
                  <button key={t} className={`text-xs px-3 py-1 rounded ${activeTab === t ? 'bg-blue-600 text-white' : 'bg-gray-100'}`} onClick={() => setActiveTab(t)}>{t}</button>
                ))}
              </div>
              <div>
                {activeTab === 'Lines' && (
                  <table className="erp-grid text-xs">
                    <thead><tr><th>#</th><th>Description</th><th>Glass</th><th>Thickness</th><th>Size</th><th>Sq Ft</th><th>Edge</th><th>Qty</th><th>Unit $</th><th>Line Total</th></tr></thead>
                    <tbody>
                      {(selected.lines || [])?.map((l, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td><td>{l.description}</td><td>{l.glass_type || '-'}</td><td>{l.thickness || '-'}</td>
                          <td>{l.width_inches && l.height_inches ? `${l.width_inches}" x ${l.height_inches}"` : '-'}</td>
                          <td className="text-right">{formatSqft(l.width_inches, l.height_inches)}</td>
                          <td>{l.edge_type || '-'}</td><td className="text-right">{l.quantity}</td>
                          <td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
                          <td className="text-right font-bold">${parseFloat(l.line_total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold"><td colSpan="9" className="text-right">Total:</td><td className="text-right">${parseFloat(selected.total || 0).toFixed(2)}</td></tr>
                    </tbody>
                  </table>
                )}
                {activeTab === 'Fabrication' && (
                  <div>
                    {(selected.lines || [])?.map((line, lineIdx) => {
                      const lineFabs = quoteFabCharges[line.id] || [];
                      if (lineFabs.length === 0) return null;
                      return (
                        <div key={lineIdx} style={{ marginBottom: 16, border: '1px solid #e2e8f0', borderRadius: 6, padding: 12 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 8 }}>Line {lineIdx + 1}: {line.description}</div>
                          <table className="erp-grid text-xs" style={{ width: '100%' }}>
                            <thead><tr><th>Category</th><th>Charge</th><th>Qty</th><th>Rate</th><th>Total</th><th>Notes</th></tr></thead>
                            <tbody>
                              {lineFabs?.map((fc, fi) => (
                                <tr key={fi}>
                                  <td><span style={{ background: getCategoryColor(fc.category), color: '#fff', padding: '1px 6px', borderRadius: 3, fontSize: 10 }}>{fc.category}</span></td>
                                  <td>{fc.name}</td><td className="text-right">{fc.quantity}</td>
                                  <td className="text-right">${parseFloat(fc.rate).toFixed(2)}</td>
                                  <td className="text-right font-bold">${parseFloat(fc.total).toFixed(2)}</td>
                                  <td className="text-gray-500">{fc.notes || '-'}</td>
                                </tr>
                              ))}
                              <tr className="bg-gray-50 font-bold"><td colSpan="4" className="text-right">Fabrication Total:</td><td className="text-right">${lineFabs?.reduce((s, f) => s + parseFloat(f.total), 0).toFixed(2)}</td><td></td></tr>
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                    {Object.keys(quoteFabCharges).length === 0 && <p className="text-gray-500 text-center py-8">No fabrication charges on this quote.</p>}
                  </div>
                )}
                {activeTab === 'Files & Drawings' && (
                  <FileAttachments documentType="quote" documentId={selected.id} readOnly={selected.status === 'converted'} />
                )}
                {activeTab === 'History' && (<div className="text-xs text-gray-500 text-center py-8">Created {formatDate(selected.created_at)} • Updated {formatDate(selected.updated_at)}</div>)}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleSendQuote}>Send to Customer</button>}
              {['draft', 'sent'].includes(selected.status) && <button className="erp-btn" style={{ background: '#27ae60', color: 'white' }} onClick={handleAcceptQuote}>Accept Quote</button>}
              {['draft', 'sent', 'accepted'].includes(selected.status) && selected.status !== 'converted' && (
                <button className="erp-btn" style={{ background: '#8e44ad', color: 'white' }} onClick={() => setShowConvertDialog(true)}>Convert to Order</button>
              )}
              <DocumentActions documentType="quote" documentId={selected.id} recipientEmail={selected.customer_email} recipientName={selected.customer_name} compact />
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '1100px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Quote — Glass Fabrication</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body" style={{ maxHeight: '75vh' }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer*:</label>
                  <select className="erp-form-select" value={newQuote.customer_id} onChange={e => setNewQuote({ ...newQuote, customer_id: e.target.value })}>
                    <option value="">Select Customer...</option>{(customers || [])?.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
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

              {newQuote.lines?.map((line, idx) => (
                <div key={idx} style={{ border: '1px solid #e2e8f0', borderRadius: 8, marginBottom: 12, padding: 12, background: '#fafbfc' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>Line {idx + 1}</span>
                    <button className="text-red-600 text-xs font-bold" onClick={() => removeLine(idx)}>Remove</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8, marginBottom: 8 }}>
                    <div><label className="text-[10px] text-gray-500">Item</label>
                      <select className="erp-form-select w-full text-xs" value={line.item_id || ''} onChange={e => { updateLine(idx, 'item_id', e.target.value); lookupPrice(idx, e.target.value); }}>
                        <option value="">Custom...</option>{(items || [])?.map(it => <option key={it.id} value={it.id}>{it.item_number}</option>)}
                      </select></div>
                    <div style={{ gridColumn: 'span 2' }}><label className="text-[10px] text-gray-500">Description*</label>
                      <input className="erp-form-input w-full text-xs" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Panel description" /></div>
                    <div><label className="text-[10px] text-gray-500">Product Type</label>
                      <select className="erp-form-select w-full text-xs" value={line.product_type} onChange={e => updateLine(idx, 'product_type', e.target.value)}>
                        <option value="">Select...</option>{productTypes?.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g, ' ')}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-gray-500">Glass Type</label>
                      <select className="erp-form-select w-full text-xs" value={line.glass_type} onChange={e => updateLine(idx, 'glass_type', e.target.value)}>
                        <option value="">Select...</option>{glassTypes?.map(gt => <option key={gt} value={gt}>{gt}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-gray-500">Thickness</label>
                      <select className="erp-form-select w-full text-xs" value={line.thickness} onChange={e => updateLine(idx, 'thickness', e.target.value)}>
                        <option value="">-</option>{thicknesses?.map(t => <option key={t} value={t}>{t}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-gray-500">Width"</label>
                      <input className="erp-form-input w-full text-xs text-right" type="number" value={line.width_inches} onChange={e => updateLine(idx, 'width_inches', e.target.value)} /></div>
                    <div><label className="text-[10px] text-gray-500">Height"</label>
                      <input className="erp-form-input w-full text-xs text-right" type="number" value={line.height_inches} onChange={e => updateLine(idx, 'height_inches', e.target.value)} /></div>
                    <div><label className="text-[10px] text-gray-500">Edge</label>
                      <select className="erp-form-select w-full text-xs" value={line.edge_type} onChange={e => updateLine(idx, 'edge_type', e.target.value)}>
                        <option value="">-</option>{edgeTypes?.map(et => <option key={et} value={et}>{et}</option>)}
                      </select></div>
                    <div><label className="text-[10px] text-gray-500">Qty</label>
                      <input className="erp-form-input w-full text-xs text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></div>
                    <div><label className="text-[10px] text-gray-500">Unit $</label>
                      <input className="erp-form-input w-full text-xs text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></div>
                  </div>

                  <div style={{ background: '#f0f4ff', borderRadius: 6, padding: 10, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4338ca' }}>Fabrication Charges</span>
                      <button className="erp-btn" style={{ padding: '2px 8px', fontSize: 10 }} onClick={() => addFabToLine(idx)}>+ Add Charge</button>
                    </div>
                    {(line.fabrication || []).length > 0 && (
                      <table style={{ width: '100%', fontSize: 11, borderCollapse: 'collapse' }}>
                        <thead><tr style={{ borderBottom: '1px solid #c7d2fe' }}>
                          <th style={{ textAlign: 'left', padding: '3px 6px', color: '#4338ca' }}>Charge Type</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4338ca', width: 70 }}>Qty</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4338ca', width: 80 }}>Rate</th>
                          <th style={{ textAlign: 'right', padding: '3px 6px', color: '#4338ca', width: 80 }}>Total</th>
                          <th style={{ padding: '3px 6px', width: 100 }}>Notes</th>
                          <th style={{ width: 30 }}></th>
                        </tr></thead>
                        <tbody>
                          {line.fabrication?.map((fab, fabIdx) => (
                            <tr key={fabIdx} style={{ borderBottom: '1px solid #e0e7ff' }}>
                              <td style={{ padding: '3px 6px' }}>
                                <select className="erp-form-select text-xs" style={{ width: '100%', fontSize: 11 }} value={fab.fabrication_charge_id} onChange={e => updateFab(idx, fabIdx, 'fabrication_charge_id', e.target.value)}>
                                  <option value="">Select charge...</option>
                                  {Object.entries(fabChargesByCategory)?.map(([cat, charges]) => (
                                    <optgroup key={cat} label={cat}>
                                      {charges?.map(c => <option key={c.id} value={c.id}>{c.name} (${c.default_rate}{getPricingMethodLabel(c.pricing_method)})</option>)}
                                    </optgroup>
                                  ))}
                                </select>
                              </td>
                              <td style={{ padding: '3px 6px' }}><input type="number" className="erp-form-input text-xs text-right" style={{ width: '100%', fontSize: 11 }} value={fab.quantity} onChange={e => updateFab(idx, fabIdx, 'quantity', e.target.value)} /></td>
                              <td style={{ padding: '3px 6px' }}><input type="number" step="0.01" className="erp-form-input text-xs text-right" style={{ width: '100%', fontSize: 11 }} value={fab.rate} onChange={e => updateFab(idx, fabIdx, 'rate', e.target.value)} /></td>
                              <td style={{ padding: '3px 6px', textAlign: 'right', fontWeight: 600 }}>${((parseFloat(fab.quantity) || 0) * (parseFloat(fab.rate) || 0)).toFixed(2)}</td>
                              <td style={{ padding: '3px 6px' }}><input className="erp-form-input text-xs" style={{ width: '100%', fontSize: 11 }} value={fab.notes || ''} onChange={e => updateFab(idx, fabIdx, 'notes', e.target.value)} placeholder="Optional" /></td>
                              <td style={{ padding: '3px 6px' }}><button className="text-red-500 text-xs" onClick={() => removeFab(idx, fabIdx)}>✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                    {(line.fabrication || []).length === 0 && (
                      <div style={{ fontSize: 10, color: '#6366f1', textAlign: 'center', padding: 4 }}>No fabrication charges. Click "+ Add Charge" for holes, polishing, notches, etc.</div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 16, marginTop: 8, fontSize: 12 }}>
                    <span>Base: <strong>${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</strong></span>
                    {getFabTotal(idx) > 0 && <span>Fabrication: <strong style={{ color: '#4338ca' }}>${getFabTotal(idx).toFixed(2)}</strong></span>}
                    <span style={{ fontSize: 13, fontWeight: 700 }}>Line Total: ${getLineTotalWithFab(line, idx).toFixed(2)}</span>
                  </div>
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <button className="erp-btn" onClick={addLine}>+ Add Line Item</button>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Grand Total: ${getGrandTotal().toFixed(2)}</div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateQuote} disabled={!newQuote.customer_id || !newQuote.lines?.some(l => l.description)}>Save Quote</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showConvertDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowConvertDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Convert Quote to Sales Order</span></div>
            <div className="erp-modal-body">
              <p className="text-xs mb-3">Creates a Sales Order from Quote <strong>{selected?.quote_number}</strong> with all line items, glass specs, and fabrication charges.</p>
              <div className="erp-form-group"><label className="erp-form-label">Customer PO#:</label><input className="erp-form-input" value={customerPO} onChange={e => setCustomerPO(e.target.value)} placeholder="Optional" /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleConvertToOrder}>Convert to Order</button>
              <button className="erp-btn" onClick={() => setShowConvertDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
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
    </ModulePage>
  );
}

function getCategoryColor(cat) {
  const colors = { 'Edgework': '#2563eb', 'Holes': '#7c3aed', 'Notches': '#dc2626', 'Cutouts': '#ea580c', 'Tempering': '#ca8a04', 'Coating': '#0891b2', 'Shape': '#16a34a', 'Other': '#64748b' };
  return colors[cat] || '#64748b';
}

export default Quotes;
