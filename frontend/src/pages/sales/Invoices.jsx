import DocumentActions from '../../components/DocumentActions';
import SerialNumbersTab from '../../components/SerialNumbersTab';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ amount: '', payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] });
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showCreditMemo, setShowCreditMemo] = useState(false);
  const [creditForm, setCreditForm] = useState({ amount: '', reason: 'pricing_error', notes: '' });
  const [pendingCount, setPendingCount] = useState(0);
  const [showPostConfirm, setShowPostConfirm] = useState(false);
  // Review mode state
  const [reviewMode, setReviewMode] = useState(false);
  const [editLines, setEditLines] = useState([]);
  const [editHeader, setEditHeader] = useState({ discount_amount: 0, adjustment_amount: 0, adjustment_reason: '', tax_amount: 0, freight_amount: 0, notes: '', due_date: '', review_notes: '' });

  useEffect(() => { fetchInvoices(); fetchPendingCount(); }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/api/sales/invoices', { params: { search, status: statusFilter } });
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch { setInvoices([]); }
  };

  const fetchPendingCount = async () => {
    try {
      const res = await api.get('/api/sales/invoices/pending-review/count');
      setPendingCount(res.data?.pending_count || 0);
    } catch { /* ignore */ }
  };

  const openDetail = async (invoice) => {
    try {
      const res = await api.get(`/api/sales/invoices/${invoice.id}`);
      setSelected(res.data);
      setActiveTab('Lines');
      setShowDetail(true);
      setReviewMode(false);
    } catch { toast.error('Failed to load invoice'); }
  };

  const enterReviewMode = () => {
    if (!selected) return;
    setEditLines((selected.lines || []).map(l => ({ ...l })));
    setEditHeader({
      discount_amount: Number(selected.discount_amount) || 0,
      adjustment_amount: Number(selected.adjustment_amount) || 0,
      adjustment_reason: selected.adjustment_reason || '',
      tax_amount: Number(selected.tax_amount) || 0,
      freight_amount: Number(selected.freight_amount) || 0,
      notes: selected.notes || '',
      due_date: selected.due_date ? new Date(selected.due_date).toISOString().split('T')[0] : '',
      review_notes: ''
    });
    setReviewMode(true);
    setActiveTab('Lines');
  };

  const handleSaveReview = async () => {
    try {
      await api.put(`/api/sales/invoices/${selected.id}/review`, {
        lines: editLines,
        ...editHeader
      });
      toast.success('Invoice reviewed and saved');
      setReviewMode(false);
      openDetail(selected);
      fetchPendingCount();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save review'); }
  };

  const handlePostInvoice = async () => {
    try {
      await api.post(`/api/sales/invoices/${selected.id}/post`);
      toast.success('Invoice posted successfully - AR updated');
      setShowPostConfirm(false);
      openDetail(selected);
      fetchInvoices();
      fetchPendingCount();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to post'); }
  };

  const handleRecordPayment = async () => {
    try {
      await api.post(`/api/sales/invoices/${selected.id}/payment`, {
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        payment_date: paymentForm.payment_date
      });
      toast.success('Payment recorded');
      setShowPayment(false);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleCreditMemo = async () => {
    try {
      await api.post(`/api/sales/invoices/${selected.id}/credit-memo`, {
        amount: parseFloat(creditForm.amount),
        reason: creditForm.reason,
        notes: creditForm.notes
      });
      toast.success('Credit memo issued');
      setShowCreditMemo(false);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleEmailInvoice = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'invoice', document_id: selected.id, to_email: emailTo, subject: `Invoice ${selected.invoice_number}` });
      toast.success('Email sent'); setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleVoidInvoice = async () => {
    if (!window.confirm('Are you sure you want to void this invoice? This action cannot be undone.')) return;
    try {
      await api.post(`/api/sales/invoices/${selected.id}/void`, { reason: 'Voided during review' });
      toast.success('Invoice voided');
      openDetail(selected);
      fetchInvoices();
      fetchPendingCount();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // Calculate review totals
  const reviewSubtotal = editLines.reduce((sum, l) => sum + ((Number(l.quantity) || 0) * (Number(l.unit_price) || 0)), 0);
  const reviewTotal = reviewSubtotal - (Number(editHeader.discount_amount) || 0) + (Number(editHeader.adjustment_amount) || 0) + (Number(editHeader.tax_amount) || 0) + (Number(editHeader.freight_amount) || 0);

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const formatCurrency = (v) => `$${parseFloat(v || 0).toFixed(2)}`;

  return (
    <ModulePage {...salesMenu}>
      <div className="p-3 h-full flex flex-col">
      {/* Pending Review Banner */}
      {pendingCount > 0 && (
        <div className="mb-2 p-2 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-2">
          <span className="text-amber-600 text-lg">&#9888;&#65039;</span>
          <span className="text-sm font-medium text-amber-800">
            {pendingCount} draft invoice{pendingCount > 1 ? 's' : ''} awaiting review &amp; approval
          </span>
          <button className="erp-btn erp-btn-sm ml-auto text-xs bg-amber-100 border-amber-300 text-amber-800" onClick={() => setStatusFilter('draft')}>
            View Drafts
          </button>
        </div>
      )}
      <div className="erp-toolbar mb-2">
        <input className="erp-form-input w-48" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All</option><option value="draft">Draft (Pending Review)</option><option value="posted">Posted</option><option value="partial">Partial Payment</option><option value="paid">Paid</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchInvoices}>Refresh</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Invoice#</th><th>Date</th><th>Customer</th><th>Order#</th><th>Shipment#</th><th>Total</th><th>Balance Due</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No invoices found</td></tr> : (invoices || []).map(inv => (
              <tr key={inv.id} onClick={() => openDetail(inv)} className={`cursor-pointer hover:bg-blue-50 ${inv.status === 'draft' ? 'bg-amber-50 border-l-4 border-l-amber-400' : ''}`}>
                <td className="font-medium text-blue-700">{inv.invoice_number}</td>
                <td>{formatDate(inv.invoice_date)}</td>
                <td>{inv.company_name || inv.customer_name}</td>
                <td className="text-purple-700">{inv.so_number || inv.order_number || '-'}</td>
                <td>{inv.shipment_number || '-'}</td>
                <td className="text-right font-bold">{formatCurrency(inv.total)}</td>
                <td className="text-right font-bold text-red-600">{formatCurrency(inv.balance || inv.balance_due)}</td>
                <td>
                  <span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>
                    {inv.status === 'draft' ? '\u23F3 DRAFT' : inv.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Panel */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => { setShowDetail(false); setReviewMode(false); }}>
          <div className="erp-modal" style={{ minWidth: '700px', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            {/* Draft Warning Banner */}
            {selected.status === 'draft' && !reviewMode && (
              <div className="bg-amber-50 border-b border-amber-300 p-3 flex items-center gap-2">
                <span className="text-2xl">&#9888;&#65039;</span>
                <div className="flex-1">
                  <p className="font-bold text-amber-800 text-sm">DRAFT - Requires Human Review Before Posting</p>
                  <p className="text-xs text-amber-700">This invoice was auto-generated from a shipment. Please verify pricing, quantities, tax, and adjustments before approving.</p>
                </div>
                <button className="erp-btn erp-btn-primary text-xs" onClick={enterReviewMode}>
                  Review &amp; Edit
                </button>
              </div>
            )}
            {/* Review Mode Banner */}
            {reviewMode && (
              <div className="bg-blue-50 border-b border-blue-300 p-3 flex items-center gap-2">
                <span className="text-2xl">&#128221;</span>
                <div className="flex-1">
                  <p className="font-bold text-blue-800 text-sm">REVIEW MODE - Edit pricing, quantities, and adjustments</p>
                  <p className="text-xs text-blue-700">Changes will be saved when you click "Save Review". You must then Post to finalize.</p>
                </div>
              </div>
            )}
            <div className="erp-modal-title">
              <span>Invoice {selected.invoice_number} &mdash; {selected.company_name || selected.customer_name}</span>
              <span className={`erp-status ml-2 erp-status-${(selected.status || '').toLowerCase()}`}>
                {selected.status === 'draft' ? '\u23F3 DRAFT' : selected.status?.toUpperCase()}
              </span>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              {/* Invoice Header Info */}
              <div className="grid grid-cols-4 gap-2 text-xs mb-3 p-2 bg-gray-50 rounded">
                <div><span className="text-gray-500">Date:</span> <strong>{formatDate(selected.invoice_date)}</strong></div>
                <div><span className="text-gray-500">Due:</span> <strong>{formatDate(selected.due_date)}</strong></div>
                <div><span className="text-gray-500">SO#:</span> <strong className="text-purple-700">{selected.so_number || selected.order_number || '-'}</strong></div>
                <div><span className="text-gray-500">Shipment:</span> <strong>{selected.shipment_number || '-'}</strong></div>
                <div><span className="text-gray-500">Terms:</span> <strong>{selected.payment_terms || 'Net 30'}</strong></div>
                <div><span className="text-gray-500">Subtotal:</span> <strong>{formatCurrency(selected.subtotal)}</strong></div>
                <div><span className="text-gray-500">Total:</span> <strong className="text-lg">{formatCurrency(selected.total)}</strong></div>
                <div><span className="text-gray-500">Balance:</span> <strong className={`text-lg ${Number(selected.balance) > 0 ? 'text-red-600' : 'text-green-600'}`}>{formatCurrency(selected.balance)}</strong></div>
              </div>
              {/* Review Info */}
              {selected.reviewed_by && (
                <div className="text-xs text-green-700 bg-green-50 p-2 rounded mb-2">
                  &#10003; Reviewed on {formatDate(selected.reviewed_at)} {selected.review_notes ? `\u2014 "${selected.review_notes}"` : ''}
                </div>
              )}
              {/* Tabs */}
              <div className="erp-tabs">
                {['Lines', 'Adjustments', 'Payments', 'Credit Memos', 'Serials', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="p-3 border border-t-0" style={{ minHeight: '180px' }}>
                {/* LINES TAB - View Mode */}
                {activeTab === 'Lines' && !reviewMode && (
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Description</th><th>Glass Specs</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                      {(selected.lines || []).map((l, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="font-medium">{l.description}</td>
                          <td className="text-[10px]">{[l.glass_type, l.thickness, l.width_inches && l.height_inches ? `${l.width_inches}"x${l.height_inches}"` : '', l.edge_type].filter(Boolean).join(' \u2022 ')}</td>
                          <td className="text-right">{l.quantity}</td>
                          <td className="text-right">{formatCurrency(l.unit_price)}</td>
                          <td className="text-right font-bold">{formatCurrency(l.line_total || l.total)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold"><td colSpan="5" className="text-right">Subtotal:</td><td className="text-right">{formatCurrency(selected.subtotal)}</td></tr>
                      {Number(selected.discount_amount) > 0 && <tr className="text-green-700"><td colSpan="5" className="text-right">Discount:</td><td className="text-right">-{formatCurrency(selected.discount_amount)}</td></tr>}
                      {Number(selected.tax_amount) > 0 && <tr><td colSpan="5" className="text-right">Tax:</td><td className="text-right">{formatCurrency(selected.tax_amount)}</td></tr>}
                      {Number(selected.freight_amount) > 0 && <tr><td colSpan="5" className="text-right">Freight:</td><td className="text-right">{formatCurrency(selected.freight_amount)}</td></tr>}
                      {Number(selected.adjustment_amount) !== 0 && <tr><td colSpan="5" className="text-right">Adjustment ({selected.adjustment_reason}):</td><td className="text-right">{formatCurrency(selected.adjustment_amount)}</td></tr>}
                      <tr className="bg-blue-50 font-bold text-lg"><td colSpan="5" className="text-right">Total:</td><td className="text-right">{formatCurrency(selected.total)}</td></tr>
                    </tbody>
                  </table>
                )}
                {/* LINES TAB - Review/Edit Mode */}
                {activeTab === 'Lines' && reviewMode && (
                  <div>
                    <table className="erp-grid text-xs">
                      <thead><tr><th>#</th><th className="w-1/3">Description</th><th>Qty</th><th>Unit Price</th><th>Line Total</th><th></th></tr></thead>
                      <tbody>
                        {editLines.map((l, i) => (
                          <tr key={i} className="bg-blue-50">
                            <td>{i + 1}</td>
                            <td><input className="erp-form-input w-full text-xs" value={l.description || ''} onChange={e => { const nl = [...editLines]; nl[i] = { ...nl[i], description: e.target.value }; setEditLines(nl); }} /></td>
                            <td><input className="erp-form-input w-16 text-xs text-right" type="number" value={l.quantity || ''} onChange={e => { const nl = [...editLines]; nl[i] = { ...nl[i], quantity: e.target.value }; setEditLines(nl); }} /></td>
                            <td><input className="erp-form-input w-24 text-xs text-right" type="number" step="0.01" value={l.unit_price || ''} onChange={e => { const nl = [...editLines]; nl[i] = { ...nl[i], unit_price: e.target.value }; setEditLines(nl); }} /></td>
                            <td className="text-right font-bold">{formatCurrency((Number(l.quantity) || 0) * (Number(l.unit_price) || 0))}</td>
                            <td><button className="text-red-500 text-xs" onClick={() => setEditLines(editLines.filter((_, idx) => idx !== i))}>&times;</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <button className="erp-btn text-xs mt-2" onClick={() => setEditLines([...editLines, { description: '', quantity: 1, unit_price: 0, item_id: null }])}>+ Add Line</button>
                    <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                      <div className="flex justify-between"><span>Subtotal:</span><strong>{formatCurrency(reviewSubtotal)}</strong></div>
                      <div className="flex justify-between text-green-700"><span>Discount:</span><strong>-{formatCurrency(editHeader.discount_amount)}</strong></div>
                      <div className="flex justify-between"><span>Tax:</span><strong>{formatCurrency(editHeader.tax_amount)}</strong></div>
                      <div className="flex justify-between"><span>Freight:</span><strong>{formatCurrency(editHeader.freight_amount)}</strong></div>
                      <div className="flex justify-between"><span>Adjustment:</span><strong>{formatCurrency(editHeader.adjustment_amount)}</strong></div>
                      <div className="flex justify-between text-lg font-bold border-t mt-1 pt-1"><span>Total:</span><strong>{formatCurrency(reviewTotal)}</strong></div>
                    </div>
                  </div>
                )}
                {/* ADJUSTMENTS TAB - View Mode */}
                {activeTab === 'Adjustments' && !reviewMode && (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-gray-500 text-xs">Discount:</label><p className="font-bold text-green-700">{formatCurrency(selected.discount_amount)}</p></div>
                      <div><label className="text-gray-500 text-xs">Tax:</label><p className="font-bold">{formatCurrency(selected.tax_amount)}</p></div>
                      <div><label className="text-gray-500 text-xs">Freight:</label><p className="font-bold">{formatCurrency(selected.freight_amount)}</p></div>
                      <div><label className="text-gray-500 text-xs">Adjustment:</label><p className="font-bold">{formatCurrency(selected.adjustment_amount)} {selected.adjustment_reason ? `(${selected.adjustment_reason})` : ''}</p></div>
                    </div>
                    <div><label className="text-gray-500 text-xs">Notes:</label><p>{selected.notes || 'No notes'}</p></div>
                  </div>
                )}
                {/* ADJUSTMENTS TAB - Review/Edit Mode */}
                {activeTab === 'Adjustments' && reviewMode && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="erp-form-group"><label className="erp-form-label">Discount Amount:</label><input className="erp-form-input" type="number" step="0.01" value={editHeader.discount_amount} onChange={e => setEditHeader({ ...editHeader, discount_amount: e.target.value })} /></div>
                      <div className="erp-form-group"><label className="erp-form-label">Tax Amount:</label><input className="erp-form-input" type="number" step="0.01" value={editHeader.tax_amount} onChange={e => setEditHeader({ ...editHeader, tax_amount: e.target.value })} /></div>
                      <div className="erp-form-group"><label className="erp-form-label">Freight Amount:</label><input className="erp-form-input" type="number" step="0.01" value={editHeader.freight_amount} onChange={e => setEditHeader({ ...editHeader, freight_amount: e.target.value })} /></div>
                      <div className="erp-form-group"><label className="erp-form-label">Adjustment Amount:</label><input className="erp-form-input" type="number" step="0.01" value={editHeader.adjustment_amount} onChange={e => setEditHeader({ ...editHeader, adjustment_amount: e.target.value })} /></div>
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label">Adjustment Reason:</label><input className="erp-form-input" value={editHeader.adjustment_reason} onChange={e => setEditHeader({ ...editHeader, adjustment_reason: e.target.value })} placeholder="e.g., Early payment discount, Freight surcharge" /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Due Date:</label><input className="erp-form-input" type="date" value={editHeader.due_date} onChange={e => setEditHeader({ ...editHeader, due_date: e.target.value })} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Invoice Notes:</label><textarea className="erp-form-input w-full h-16" value={editHeader.notes} onChange={e => setEditHeader({ ...editHeader, notes: e.target.value })} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Review Notes (internal):</label><textarea className="erp-form-input w-full h-12" value={editHeader.review_notes} onChange={e => setEditHeader({ ...editHeader, review_notes: e.target.value })} placeholder="Notes about your review (not shown to customer)" /></div>
                  </div>
                )}
                {/* PAYMENTS TAB */}
                {activeTab === 'Payments' && (
                  <div>
                    {selected.status !== 'draft' && <button className="erp-btn text-xs mb-2" onClick={() => { setPaymentForm({ amount: selected.balance || selected.balance_due || '', payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] }); setShowPayment(true); }}>+ Record Payment</button>}
                    {selected.status === 'draft' && <p className="text-amber-700 text-xs mb-2 bg-amber-50 p-2 rounded">Payments cannot be recorded on draft invoices. Post the invoice first.</p>}
                    {(selected.payments || []).length === 0 ? <p className="text-gray-500 text-center py-4">No payments recorded</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                        <tbody>{selected.payments?.map((p, i) => (
                          <tr key={i}><td>{formatDate(p.payment_date)}</td><td className="text-right font-bold text-green-700">{formatCurrency(p.amount)}</td><td>{p.payment_method}</td><td>{p.reference_number || '-'}</td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {/* CREDIT MEMOS TAB */}
                {activeTab === 'Credit Memos' && (
                  <div>
                    <button className="erp-btn text-xs mb-2" onClick={() => setShowCreditMemo(true)}>+ Issue Credit Memo</button>
                    {(selected.credit_memos || []).length === 0 ? <p className="text-gray-500 text-center py-4">No credit memos</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>CM#</th><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
                        <tbody>{selected.credit_memos?.map((cm, i) => (
                          <tr key={i}><td>{cm.credit_memo_number}</td><td>{formatDate(cm.created_at)}</td><td className="text-right">{formatCurrency(cm.amount)}</td><td>{cm.reason}</td><td><span className={`erp-status erp-status-${(cm.status || '').toLowerCase()}`}>{cm.status}</span></td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {/* SERIALS TAB */}
                {activeTab === 'Serials' && (
                  <SerialNumbersTab salesOrderId={selected?.sales_order_id} />
                )}
                {/* AUDIT TRAIL TAB */}
                {activeTab === 'Audit Trail' && (
                  <div className="text-xs text-gray-600 space-y-1 py-2">
                    <p><strong>Created:</strong> {formatDate(selected.created_at)}</p>
                    {selected.reviewed_at && <p><strong>Reviewed:</strong> {formatDate(selected.reviewed_at)} {selected.review_notes ? `\u2014 "${selected.review_notes}"` : ''}</p>}
                    {selected.posted_at && <p><strong>Posted:</strong> {formatDate(selected.posted_at)}</p>}
                    {selected.voided_at && <p><strong>Voided:</strong> {formatDate(selected.voided_at)} \u2014 {selected.void_reason}</p>}
                  </div>
                )}
              </div>
            </div>
            {/* Footer Actions */}
            <div className="erp-modal-footer flex-wrap gap-1">
              {/* Review Mode Actions */}
              {reviewMode && (
                <>
                  <button className="erp-btn erp-btn-primary" onClick={handleSaveReview}>Save Review</button>
                  <button className="erp-btn" onClick={() => setReviewMode(false)}>Cancel Edit</button>
                </>
              )}
              {/* Normal Mode Actions */}
              {!reviewMode && (
                <>
                  {selected.status === 'draft' && (
                    <>
                      <button className="erp-btn erp-btn-primary" onClick={enterReviewMode}>Review &amp; Edit</button>
                      <button className="erp-btn bg-green-600 text-white hover:bg-green-700" onClick={() => setShowPostConfirm(true)}>&#10003; Approve &amp; Post</button>
                      <button className="erp-btn erp-btn-danger text-xs" onClick={handleVoidInvoice}>Void</button>
                    </>
                  )}
                  {selected.status !== 'draft' && selected.status !== 'void' && (
                    <button className="erp-btn" onClick={() => { setPaymentForm({ amount: selected.balance || selected.balance_due || '', payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] }); setShowPayment(true); }}>Record Payment</button>
                  )}
                  <DocumentActions documentType="ar_invoice" documentId={selected.id} recipientEmail={selected.customer_email} recipientName={selected.company_name || selected.customer_name} compact />
                  {selected.status !== 'void' && <button className="erp-btn text-xs" onClick={() => setShowCreditMemo(true)}>Credit Memo</button>}
                  <button className="erp-btn" onClick={() => { setShowDetail(false); setReviewMode(false); }}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Post Confirmation Dialog */}
      {showPostConfirm && (
        <div className="erp-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowPostConfirm(false)}>
          <div className="erp-modal" style={{ minWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title bg-green-50"><span>Confirm: Post Invoice</span></div>
            <div className="erp-modal-body">
              <div className="text-center py-3">
                <p className="text-lg font-bold mb-2">Are you sure you want to post this invoice?</p>
                <p className="text-sm text-gray-600 mb-4">Once posted, this invoice will:</p>
                <ul className="text-left text-sm space-y-1 mx-auto max-w-xs">
                  <li className="flex items-center gap-2"><span className="text-green-600">&#10003;</span> Update Accounts Receivable</li>
                  <li className="flex items-center gap-2"><span className="text-green-600">&#10003;</span> Create GL journal entries</li>
                  <li className="flex items-center gap-2"><span className="text-green-600">&#10003;</span> Appear on AR Aging reports</li>
                  <li className="flex items-center gap-2"><span className="text-green-600">&#10003;</span> Be available for customer payment</li>
                </ul>
                <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                  <p><strong>{selected?.invoice_number}</strong> &mdash; {selected?.company_name || selected?.customer_name}</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(selected?.total)}</p>
                  <p className="text-xs text-gray-500">Due: {formatDate(selected?.due_date)}</p>
                </div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn bg-green-600 text-white hover:bg-green-700" onClick={handlePostInvoice}>&#10003; Yes, Post Invoice</button>
              <button className="erp-btn" onClick={() => setShowPostConfirm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {showPayment && (
        <div className="erp-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowPayment(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Record Payment</span></div>
            <div className="erp-modal-body">
              <p className="text-xs text-gray-600 mb-3">Payment for Invoice <strong>{selected?.invoice_number}</strong></p>
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input className="erp-form-input" type="number" step="0.01" value={paymentForm.amount} onChange={e => setPaymentForm({ ...paymentForm, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Date:</label><input className="erp-form-input" type="date" value={paymentForm.payment_date} onChange={e => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Method:</label>
                  <select className="erp-form-select" value={paymentForm.payment_method} onChange={e => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}>
                    <option value="check">Check</option><option value="wire">Wire Transfer</option><option value="credit_card">Credit Card</option><option value="ach">ACH</option><option value="cash">Cash</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference#:</label><input className="erp-form-input" value={paymentForm.reference_number} onChange={e => setPaymentForm({ ...paymentForm, reference_number: e.target.value })} placeholder="Check# or transaction ID" /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleRecordPayment} disabled={!paymentForm.amount}>Apply Payment</button>
              <button className="erp-btn" onClick={() => setShowPayment(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Email Dialog */}
      {showEmailDialog && (
        <div className="erp-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowEmailDialog(false)}>
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
      {/* Credit Memo Dialog */}
      {showCreditMemo && (
        <div className="erp-modal-overlay" style={{ zIndex: 1100 }} onClick={() => setShowCreditMemo(false)}>
          <div className="erp-modal" style={{ minWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Issue Credit Memo</span></div>
            <div className="erp-modal-body">
              <p className="text-xs text-gray-600 mb-3">Credit memo against Invoice {selected?.invoice_number}.</p>
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
    </ModulePage>
  );
}

export default Invoices;
