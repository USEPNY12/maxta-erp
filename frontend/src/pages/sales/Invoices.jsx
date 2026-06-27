import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showCreditMemo, setShowCreditMemo] = useState(false);
  const [creditForm, setCreditForm] = useState({ reason: 'pricing_error', amount: '', notes: '' });

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try { const res = await api.get('/api/accounting/ar-invoices', { params: { search, status: statusFilter } }); setInvoices(Array.isArray(res.data) ? res.data : res.data.invoices || []); } catch { setInvoices([]); }
  };

  const openDetail = async (inv) => {
    try { const res = await api.get(`/api/accounting/ar-invoices/${inv.id}`); setSelected(res.data); setActiveTab('Lines'); setShowDetail(true); } catch { setSelected(inv); setShowDetail(true); }
  };

  const handlePostInvoice = async () => {
    try {
      await api.put(`/api/accounting/ar-invoices/${selected.id}/post`);
      toast.success('Invoice posted to GL');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to post invoice'); }
  };

  const handleEmailInvoice = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'ar_invoice', document_id: selected.id, to_email: emailTo, subject: `Invoice ${selected.invoice_number}` });
      toast.success('Invoice emailed');
      setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send email'); }
  };

  const handleCreditMemo = async () => {
    try {
      await api.post('/api/sales/credit-memos', {
        customer_id: selected.customer_id,
        ar_invoice_id: selected.id,
        reason: creditForm.reason,
        amount: parseFloat(creditForm.amount),
        notes: creditForm.notes
      });
      toast.success('Credit Memo created');
      setShowCreditMemo(false);
      setCreditForm({ reason: 'pricing_error', amount: '', notes: '' });
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create credit memo'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={fetchInvoices}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) handlePostInvoice(); }}>Post</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) { setEmailTo(''); setShowEmailDialog(true); } }}>✉ Email</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) { setCreditForm({ ...creditForm, amount: '' }); setShowCreditMemo(true); } }}>Credit Memo</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchInvoices}>Find</button>
        <div className="ml-auto text-xs">View:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchInvoices, 0); }}>
            <option value="open">All Open</option><option value="">All</option><option value="posted">Posted</option><option value="paid">Paid</option><option value="partial">Partial</option><option value="void">Void</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Invoice No.</th><th>Date</th><th>Customer</th><th>SO#</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan="9" className="text-center p-4 text-gray-500">No invoices found</td></tr> : invoices.map(inv => (
              <tr key={inv.id} className={`cursor-pointer ${selected?.id === inv.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(inv)}>
                <td className="text-blue-700 font-bold">{inv.invoice_number}</td>
                <td>{inv.invoice_date?.split('T')[0]}</td>
                <td>{inv.customer_name}</td>
                <td>{inv.so_number || '-'}</td>
                <td className="text-right">${parseFloat(inv.total || inv.total_amount || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(inv.amount_paid || 0).toFixed(2)}</td>
                <td className="text-right font-bold">${(parseFloat(inv.total || inv.total_amount || 0) - parseFloat(inv.amount_paid || 0)).toFixed(2)}</td>
                <td>{inv.due_date?.split('T')[0]}</td>
                <td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Invoice - {selected.invoice_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Invoice</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Number:</label><span className="font-bold">{selected.invoice_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Date:</label><span>{selected.invoice_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Due Date:</label><span>{selected.due_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Customer</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Name:</label><span>{selected.customer_name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">SO#:</label><span>{selected.so_number || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Terms:</label><span>{selected.payment_terms || 'Net 30'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Subtotal:</label><span>${parseFloat(selected.subtotal || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Tax:</label><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Total:</label><span className="font-bold">${parseFloat(selected.total || selected.total_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Paid:</label><span className="text-green-700">${parseFloat(selected.amount_paid || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Balance:</label><span className="font-bold text-red-700">${(parseFloat(selected.total || selected.total_amount || 0) - parseFloat(selected.amount_paid || 0)).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['Lines', 'Payments', 'Credit Memos', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[150px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>Line</th><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Amount</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No lines</td></tr> : (selected.lines || []).map((l, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{l.item_number || '-'}</td><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td><td className="text-right font-bold">${parseFloat(l.line_total || (l.quantity * l.unit_price) || 0).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Payments' && (
                  <table className="erp-grid"><thead><tr><th>Payment No.</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                    <tbody>{(selected.payments || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No payments applied</td></tr> : (selected.payments || []).map((p, i) => (
                      <tr key={i}><td>{p.payment_number}</td><td>{p.payment_date?.split('T')[0]}</td><td className="text-right">${parseFloat(p.amount || 0).toFixed(2)}</td><td>{p.payment_method}</td><td>{p.reference_number || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Credit Memos' && (
                  <div><button className="erp-btn text-xs mb-2" onClick={() => setShowCreditMemo(true)}>+ Issue Credit Memo</button>
                    <table className="erp-grid"><thead><tr><th>CM No.</th><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
                      <tbody>{(selected.credit_memos || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No credit memos</td></tr> : (selected.credit_memos || []).map((cm, i) => (
                        <tr key={i}><td>{cm.credit_memo_number}</td><td>{cm.created_at?.split('T')[0]}</td><td className="text-right">${parseFloat(cm.amount || 0).toFixed(2)}</td><td>{cm.reason}</td><td><span className={`erp-status erp-status-${(cm.status || '').toLowerCase()}`}>{cm.status}</span></td></tr>
                      ))}</tbody></table></div>
                )}
                {activeTab === 'Audit Trail' && (
                  <table className="erp-grid"><thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
                    <tbody><tr><td colSpan="4" className="text-center p-4 text-gray-500">Audit trail for posted invoices</td></tr></tbody></table>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handlePostInvoice}>Post Invoice</button>}
              <button className="erp-btn" onClick={() => { setEmailTo(''); setShowEmailDialog(true); }}>✉ Email</button>
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowCreditMemo(true)}>Credit Memo</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showEmailDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowEmailDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Email Invoice</span></div>
            <div className="erp-modal-body">
              <div className="erp-form-group mb-3"><label className="erp-form-label">To:</label><input className="erp-form-input w-full" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com" /></div>
              <p className="text-xs text-gray-600">Invoice PDF will be attached automatically.</p>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleEmailInvoice} disabled={!emailTo}>Send</button>
              <button className="erp-btn" onClick={() => setShowEmailDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showCreditMemo && (
        <div className="erp-modal-overlay" onClick={() => setShowCreditMemo(false)}>
          <div className="erp-modal" style={{ minWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Issue Credit Memo</span></div>
            <div className="erp-modal-body">
              <p className="text-xs text-gray-600 mb-3">Credit memo against Invoice {selected?.invoice_number}. This cannot be undone.</p>
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input className="erp-form-input" type="number" step="0.01" value={creditForm.amount} onChange={e => setCreditForm({ ...creditForm, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Reason:</label>
                  <select className="erp-form-select" value={creditForm.reason} onChange={e => setCreditForm({ ...creditForm, reason: e.target.value })}>
                    <option value="pricing_error">Pricing Error</option><option value="damaged_goods">Damaged Goods</option><option value="returned_goods">Returned Goods</option><option value="duplicate_billing">Duplicate Billing</option><option value="other">Other</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-16" value={creditForm.notes} onChange={e => setCreditForm({ ...creditForm, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-danger" onClick={handleCreditMemo} disabled={!creditForm.amount}>Issue Credit</button>
              <button className="erp-btn" onClick={() => setShowCreditMemo(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Invoices;
