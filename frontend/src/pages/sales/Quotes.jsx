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
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [newQuote, setNewQuote] = useState({
    customer_id: '', description: '', expiry_date: '', notes: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => { fetchQuotes(); fetchCustomers(); fetchItems(); }, [statusFilter]);

  const fetchQuotes = async () => {
    try { const res = await api.get('/api/sales/quotes', { params: { search, status: statusFilter } }); setQuotes(Array.isArray(res.data) ? res.data : []); } catch { setQuotes([]); }
  };

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };

  const openDetail = async (quote) => {
    try { const res = await api.get(`/api/sales/quotes/${quote.id}`); setSelected(res.data); setShowDetail(true); } catch { toast.error('Failed to load quote'); }
  };

  const handleCreateQuote = async () => {
    try {
      await api.post('/api/sales/quotes', {
        customer_id: parseInt(newQuote.customer_id),
        description: newQuote.description,
        expiry_date: newQuote.expiry_date || null,
        notes: newQuote.notes,
        lines: newQuote.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0
        }))
      });
      toast.success('Quote created');
      setShowNew(false);
      setNewQuote({ customer_id: '', description: '', expiry_date: '', notes: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0 }] });
      fetchQuotes();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create quote'); }
  };

  const handleConvertToOrder = async () => {
    try {
      await api.post(`/api/sales/quotes/${selected.id}/convert`);
      toast.success('Quote converted to Sales Order!');
      setShowDetail(false);
      fetchQuotes();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to convert quote'); }
  };

  const handleEmailQuote = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'quote', document_id: selected.id, to_email: emailTo, subject: `Quote - ${selected.quote_number || selected.quote_no}` });
      toast.success('Quote emailed');
      setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send email'); }
  };

  const addLine = () => setNewQuote({ ...newQuote, lines: [...newQuote.lines, { item_id: '', description: '', quantity: 1, unit_price: 0 }] });
  const updateLine = (idx, field, value) => {
    const lines = [...newQuote.lines]; lines[idx] = { ...lines[idx], [field]: value };
    if (field === 'item_id' && value) { const item = items.find(i => i.id === parseInt(value)); if (item) { lines[idx].description = item.description; lines[idx].unit_price = item.selling_price || item.unit_price || 0; } }
    setNewQuote({ ...newQuote, lines });
  };
  const removeLine = (idx) => { const lines = newQuote.lines.filter((_, i) => i !== idx); setNewQuote({ ...newQuote, lines: lines.length ? lines : [{ item_id: '', description: '', quantity: 1, unit_price: 0 }] }); };
  const getTotal = () => newQuote.lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New Quote</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchQuotes}>↻ Refresh</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) { setEmailTo(''); setShowEmailDialog(true); } }}>✉ Email</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn erp-btn-primary" disabled={!selected || selected?.status === 'converted'} onClick={handleConvertToOrder}>Convert to Order</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchQuotes()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchQuotes}>Find</button>
        <div className="ml-auto text-xs">View:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="open">All Open</option><option value="">All</option><option value="converted">Converted</option><option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Quote No.</th><th>Date</th><th>Customer</th><th>Description</th><th>Amount</th><th>Status</th><th>Expires</th></tr></thead>
          <tbody>
            {quotes.length === 0 ? <tr><td colSpan="7" className="text-center p-4 text-gray-500">No quotes found</td></tr> : quotes.map(q => (
              <tr key={q.id} className={`cursor-pointer ${selected?.id === q.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(q)}>
                <td className="text-blue-700 font-bold">{q.quote_number || q.quote_no}</td>
                <td>{q.quote_date?.split('T')[0]}</td>
                <td>{q.customer_name}</td>
                <td>{q.description}</td>
                <td className="text-right">${parseFloat(q.total_amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${(q.status || '').toLowerCase()}`}>{q.status}</span></td>
                <td>{q.expiry_date?.split('T')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Quote - {selected.quote_number || selected.quote_no}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Quote Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Quote No:</label><span className="font-bold">{selected.quote_number || selected.quote_no}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Date:</label><span>{selected.quote_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Expires:</label><span>{selected.expiry_date?.split('T')[0] || 'N/A'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Description:</label><span>{selected.description}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Customer</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Name:</label><span>{selected.customer_name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Total:</label><span className="font-bold">${parseFloat(selected.total_amount || 0).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="text-xs font-bold mb-1">Quote Lines:</div>
              <table className="erp-grid"><thead><tr><th>Line</th><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No lines</td></tr> : (selected.lines || []).map((l, i) => (
                  <tr key={i}><td>{i + 1}</td><td>{l.item_number || '-'}</td><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td><td className="text-right font-bold">${(parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0)).toFixed(2)}</td></tr>
                ))}</tbody></table>
            </div>
            <div className="erp-modal-footer">
              {selected.status !== 'converted' && <button className="erp-btn erp-btn-primary" onClick={handleConvertToOrder}>Convert to Order</button>}
              <button className="erp-btn" onClick={() => { setEmailTo(''); setShowEmailDialog(true); }}>✉ Email</button>
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Quote</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer:</label>
                  <select className="erp-form-select" value={newQuote.customer_id} onChange={e => setNewQuote({ ...newQuote, customer_id: e.target.value })}>
                    <option value="">Select Customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><input className="erp-form-input" value={newQuote.description} onChange={e => setNewQuote({ ...newQuote, description: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Expiry Date:</label><input className="erp-form-input" type="date" value={newQuote.expiry_date} onChange={e => setNewQuote({ ...newQuote, expiry_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><input className="erp-form-input" value={newQuote.notes} onChange={e => setNewQuote({ ...newQuote, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2"><span className="text-xs font-bold">Lines</span><button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button></div>
              <table className="erp-grid"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
                <tbody>{newQuote.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td><select className="erp-form-select w-full" value={line.item_id} onChange={e => updateLine(idx, 'item_id', e.target.value)}><option value="">Select...</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number || i.item_no} - {i.description}</option>)}</select></td>
                    <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                    <td><input className="erp-form-input w-16 text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                    <td><input className="erp-form-input w-20 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                    <td className="text-right font-bold">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                ))}
                <tr className="bg-gray-100"><td colSpan="4" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal().toFixed(2)}</td><td></td></tr>
                </tbody></table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateQuote} disabled={!newQuote.customer_id}>Save Quote</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
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
  );
}

export default Quotes;
