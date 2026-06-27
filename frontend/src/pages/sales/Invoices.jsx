import DocumentActions from '../../components/DocumentActions';
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

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/api/sales/invoices', { params: { search, status: statusFilter } });
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch { setInvoices([]); }
  };

  const openDetail = async (invoice) => {
    try {
      const res = await api.get(`/api/sales/invoices/${invoice.id}`);
      setSelected(res.data);
      setActiveTab('Lines');
      setShowDetail(true);
    } catch { toast.error('Failed to load invoice'); }
  };

  const handlePostInvoice = async () => {
    try {
      await api.post(`/api/sales/invoices/${selected.id}/post`);
      toast.success('Invoice posted');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
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

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <ModulePage {...salesMenu}>
      <div className="p-3 h-full flex flex-col">
      <div className="erp-toolbar mb-2">
        <input className="erp-form-input w-48" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="partial">Partial Payment</option><option value="paid">Paid</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchInvoices}>Refresh</button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Invoice#</th><th>Date</th><th>Customer</th><th>Order#</th><th>Shipment#</th><th>Total</th><th>Balance Due</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No invoices found</td></tr> : invoices.map(inv => (
              <tr key={inv.id} className="cursor-pointer" onClick={() => openDetail(inv)}>
                <td className="text-blue-700 font-bold">{inv.invoice_number}</td>
                <td>{formatDate(inv.invoice_date)}</td>
                <td>{inv.customer_name}</td>
                <td className="text-purple-700">{inv.order_number || '-'}</td>
                <td>{inv.shipment_number || '-'}</td>
                <td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td>
                <td className="text-right font-bold text-red-600">${parseFloat(inv.balance || inv.balance_due || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Invoice {selected.invoice_number}</span>
              <span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
                <div><span className="text-gray-500">Customer:</span><br/><strong>{selected.customer_name}</strong></div>
                <div><span className="text-gray-500">Invoice Date:</span><br/><strong>{formatDate(selected.invoice_date)}</strong></div>
                <div><span className="text-gray-500">Due Date:</span><br/><strong>{formatDate(selected.due_date)}</strong></div>
                <div><span className="text-gray-500">Payment Terms:</span><br/><strong>{selected.payment_terms || 'Net 30'}</strong></div>
                <div><span className="text-gray-500">Order#:</span><br/><strong className="text-purple-700">{selected.order_number || '-'}</strong></div>
                <div><span className="text-gray-500">Shipment#:</span><br/><strong>{selected.shipment_number || '-'}</strong></div>
                <div><span className="text-gray-500">Total:</span><br/><strong className="text-lg">${parseFloat(selected.total || 0).toFixed(2)}</strong></div>
                <div><span className="text-gray-500">Balance Due:</span><br/><strong className="text-lg text-red-600">${parseFloat(selected.balance || selected.balance_due || 0).toFixed(2)}</strong></div>
              </div>

              <div className="erp-tabs">
                {['Lines', 'Payments', 'Credit Memos', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="p-3 border border-t-0" style={{ minHeight: '180px' }}>
                {activeTab === 'Lines' && (
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Description</th><th>Glass Specs</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>
                      {(selected.lines || []).map((l, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="font-medium">{l.description}</td>
                          <td className="text-[10px]">{[l.glass_type, l.thickness, l.width_inches && l.height_inches ? `${l.width_inches}"×${l.height_inches}"` : '', l.edge_type].filter(Boolean).join(' • ')}</td>
                          <td className="text-right">{l.quantity}</td>
                          <td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
                          <td className="text-right font-bold">${parseFloat(l.line_total || l.total || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                      <tr className="bg-gray-100 font-bold"><td colSpan="5" className="text-right">Total:</td><td className="text-right">${parseFloat(selected.total || 0).toFixed(2)}</td></tr>
                    </tbody>
                  </table>
                )}
                {activeTab === 'Payments' && (
                  <div>
                    <button className="erp-btn text-xs mb-2" onClick={() => { setPaymentForm({ amount: selected.balance || selected.balance_due || '', payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] }); setShowPayment(true); }}>+ Record Payment</button>
                    {(selected.payments || []).length === 0 ? <p className="text-gray-500 text-center py-4">No payments recorded</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                        <tbody>{selected.payments.map((p, i) => (
                          <tr key={i}><td>{formatDate(p.payment_date)}</td><td className="text-right font-bold text-green-700">${parseFloat(p.amount || 0).toFixed(2)}</td><td>{p.payment_method}</td><td>{p.reference_number || '-'}</td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'Credit Memos' && (
                  <div>
                    <button className="erp-btn text-xs mb-2" onClick={() => setShowCreditMemo(true)}>+ Issue Credit Memo</button>
                    {(selected.credit_memos || []).length === 0 ? <p className="text-gray-500 text-center py-4">No credit memos</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>CM#</th><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
                        <tbody>{selected.credit_memos.map((cm, i) => (
                          <tr key={i}><td>{cm.credit_memo_number}</td><td>{formatDate(cm.created_at)}</td><td className="text-right">${parseFloat(cm.amount || 0).toFixed(2)}</td><td>{cm.reason}</td><td><span className={`erp-status erp-status-${(cm.status || '').toLowerCase()}`}>{cm.status}</span></td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'Audit Trail' && (
                  <div className="text-xs text-gray-500 text-center py-8">
                    <p>Created: {formatDate(selected.created_at)}</p>
                    {selected.posted_date && <p>Posted: {formatDate(selected.posted_date)}</p>}
                  </div>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handlePostInvoice}>✓ Post Invoice</button>}
              <button className="erp-btn" onClick={() => { setPaymentForm({ amount: selected.balance || selected.balance_due || '', payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] }); setShowPayment(true); }}>💰 Record Payment</button>
              
              <DocumentActions documentType="ar_invoice" documentId={selected.id} recipientEmail={selected.customer_email} recipientName={selected.customer_name} compact />
              <button className="erp-btn" onClick={() => setShowCreditMemo(true)}>Credit Memo</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Dialog */}
      {showPayment && (
        <div className="erp-modal-overlay" onClick={() => setShowPayment(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Record Payment</span></div>
            <div className="erp-modal-body">
              <p className="text-xs mb-3">Payment for Invoice <strong>{selected?.invoice_number}</strong></p>
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

      {/* Credit Memo Dialog */}
      {showCreditMemo && (
        <div className="erp-modal-overlay" onClick={() => setShowCreditMemo(false)}>
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
