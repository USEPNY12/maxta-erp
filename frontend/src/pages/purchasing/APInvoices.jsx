import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';
function APInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('Lines');
  const [showPay, setShowPay] = useState(false);
  const [payment, setPayment] = useState({ amount: '', payment_method: 'check', reference_number: '', payment_date: '' });
  const [showMatch, setShowMatch] = useState(false);
  const [matchData, setMatchData] = useState(null);
  useEffect(() => { fetchInvoices(); }, [statusFilter]);
  const fetchInvoices = async () => {
    try { const res = await api.get('/api/purchasing/ap-invoices', { params: { search, status: statusFilter } }); setInvoices(Array.isArray(res.data) ? res.data : []); } catch { setInvoices([]); }
  };
  const openDetail = async (inv) => {
    try { const res = await api.get(`/api/purchasing/ap-invoices/${inv.id}`); setSelected(res.data); setActiveTab('Lines'); setShowDetail(true); } catch { setSelected(inv); setShowDetail(true); }
  };
  const handlePost = async () => {
    try { await api.post(`/api/purchasing/ap-invoices/${selected.id}/post`); toast.success('Invoice posted'); openDetail(selected); fetchInvoices(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleVoid = async () => {
    if (!window.confirm('Void this invoice?')) return;
    try { await api.post(`/api/purchasing/ap-invoices/${selected.id}/void`); toast.success('Invoice voided'); openDetail(selected); fetchInvoices(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const openPayModal = () => {
    setPayment({ amount: parseFloat(selected.balance || 0).toFixed(2), payment_method: 'check', reference_number: '', payment_date: new Date().toISOString().split('T')[0] });
    setShowPay(true);
  };
  const handlePay = async () => {
    try {
      const res = await api.post(`/api/purchasing/ap-invoices/${selected.id}/pay`, {
        amount: parseFloat(payment.amount), payment_method: payment.payment_method,
        reference_number: payment.reference_number, payment_date: payment.payment_date
      });
      toast.success(`Payment recorded (${res.data.payment_number}). Balance: $${parseFloat(res.data.new_balance).toFixed(2)}`);
      setShowPay(false); openDetail(selected); fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const viewThreeWayMatch = async (invoice) => {
    try {
      const res = await api.get(`/api/purchasing/three-way-match/${invoice.id}`);
      setMatchData(res.data);
      setShowMatch(true);
    } catch (err) { toast.error('Failed to load match data'); }
  };
  const fmt = (d) => d ? d.split('T')[0] : '-';
  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col overflow-hidden">
      <div className="erp-toolbar">
        <span className="text-sm font-bold">A/P Invoices</span>
        <input className="erp-form-input w-48" placeholder="Search invoice#, vendor..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} />
        <select className="erp-form-select w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">Open</option><option value="all">All</option><option value="posted">Posted</option><option value="paid">Paid</option><option value="partial">Partial</option>
        </select>
        <span className="text-xs text-gray-500 ml-2">{invoices.length} invoices</span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <table className="erp-grid">
          <thead><tr><th>Invoice No.</th><th>Date</th><th>Vendor</th><th>PO #</th><th>Due Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {invoices.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No invoices found</td></tr> :
            invoices.map(inv => (
              <tr key={inv.id} className={`cursor-pointer hover:bg-blue-50 ${inv.status === 'overdue' ? 'bg-red-50' : ''}`} onClick={() => openDetail(inv)}>
                <td className="font-bold">{inv.invoice_number}</td>
                <td>{fmt(inv.invoice_date)}</td>
                <td>{inv.vendor_name}</td>
                <td className="text-blue-700">{inv.po_number || '-'}</td>
                <td className={parseFloat(inv.balance) > 0 && new Date(inv.due_date) < new Date() ? 'text-red-600 font-bold' : ''}>{fmt(inv.due_date)}</td>
                <td className="text-right">${parseFloat(inv.total).toFixed(2)}</td>
                <td className="text-right font-bold">${parseFloat(inv.balance).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${inv.status}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>AP Invoice - {selected.invoice_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Invoice Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Invoice #:</span><span className="font-bold">{selected.invoice_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Date:</span><span>{fmt(selected.invoice_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Due Date:</span><span>{fmt(selected.due_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Status:</span><span className={`erp-status erp-status-${selected.status}`}>{selected.status?.toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Terms:</span><span>{selected.terms || 'Net 30'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Vendor</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-bold">{selected.vendor_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">PO #:</span><span className="text-blue-700">{selected.po_number || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Receipt #:</span><span>{selected.receipt_number || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Amount:</span><span>${parseFloat(selected.amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Tax:</span><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Total:</span><span className="font-bold">${parseFloat(selected.total || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1"><span className="text-gray-600">Paid:</span><span className="text-green-700">${parseFloat(selected.amount_paid || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600 font-bold">Balance:</span><span className="font-bold text-red-700">${parseFloat(selected.balance || 0).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              {/* Three-Way Match Indicator */}
              <div className="mb-3 p-2 bg-gray-50 border rounded flex items-center gap-4 text-xs">
                <span className="font-bold">3-Way Match:</span>
                <span className={selected.po_number ? 'text-green-700' : 'text-gray-400'}>✓ PO ({selected.po_number || 'N/A'})</span>
                <span className={selected.receipt_number ? 'text-green-700' : 'text-gray-400'}>✓ Receipt ({selected.receipt_number || 'N/A'})</span>
                <span className="text-green-700">✓ Invoice ({selected.invoice_number})</span>
              </div>
              <div className="erp-tabs">
                {['Lines', 'Payments', 'Audit'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[150px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>#</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No line details</td></tr> :
                    (selected.lines || []).map((l, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">${parseFloat(l.unit_price || l.unit_cost || 0).toFixed(2)}</td><td className="text-right font-bold">${parseFloat(l.total || (l.quantity * (l.unit_price || l.unit_cost || 0))).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Payments' && (
                  <table className="erp-grid"><thead><tr><th>Payment #</th><th>Date</th><th>Method</th><th>Reference</th><th>Amount</th></tr></thead>
                    <tbody>{(selected.payments || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No payments recorded</td></tr> :
                    (selected.payments || []).map((p, i) => (
                      <tr key={i}><td className="font-bold">{p.payment_number}</td><td>{fmt(p.payment_date)}</td><td>{p.payment_method}</td><td>{p.reference_number || '-'}</td><td className="text-right font-bold text-green-700">${parseFloat(p.amount).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Audit' && (
                  <div className="p-4 text-xs text-gray-600 space-y-1">
                    <div>Created: {fmt(selected.created_at)}</div>
                    {selected.posted_date && <div>Posted: {fmt(selected.posted_date)}</div>}
                    {selected.notes && <div>Notes: {selected.notes}</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handlePost}>✓ Post Invoice</button>}
              <button className="erp-btn text-xs" onClick={() => viewThreeWayMatch(selected)}>3-Way Match</button>
              {['posted', 'partial'].includes(selected.status) && parseFloat(selected.balance) > 0 && <button className="erp-btn erp-btn-success" onClick={openPayModal}>💵 Record Payment</button>}
              {selected.status === 'draft' && <button className="erp-btn" style={{ background: '#dc2626', color: 'white' }} onClick={handleVoid}>Void</button>}
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Payment Modal */}
      {showPay && (
        <div className="erp-modal-overlay" onClick={() => setShowPay(false)}>
          <div className="erp-modal" style={{ minWidth: '450px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Record Payment - {selected.invoice_number}</span></div>
            <div className="erp-modal-body">
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Amount ($):</label><input className="erp-form-input" type="number" step="0.01" value={payment.amount} onChange={e => setPayment({ ...payment, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Method:</label>
                  <select className="erp-form-select" value={payment.payment_method} onChange={e => setPayment({ ...payment, payment_method: e.target.value })}>
                    <option value="check">Check</option><option value="wire">Wire Transfer</option><option value="ach">ACH</option><option value="credit_card">Credit Card</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference #:</label><input className="erp-form-input" value={payment.reference_number} onChange={e => setPayment({ ...payment, reference_number: e.target.value })} placeholder="Check number, wire ref..." /></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Date:</label><input className="erp-form-input" type="date" value={payment.payment_date} onChange={e => setPayment({ ...payment, payment_date: e.target.value })} /></div>
                <div className="p-2 bg-gray-50 border rounded text-xs">
                  <div className="flex justify-between"><span>Invoice Total:</span><span>${parseFloat(selected.total).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span>Previously Paid:</span><span>${parseFloat(selected.amount_paid || 0).toFixed(2)}</span></div>
                  <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Balance Due:</span><span className="text-red-700">${parseFloat(selected.balance).toFixed(2)}</span></div>
                </div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-success" onClick={handlePay} disabled={!payment.amount || parseFloat(payment.amount) <= 0}>Apply Payment</button>
              <button className="erp-btn" onClick={() => setShowPay(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* Three-Way Match Modal */}
      {showMatch && matchData && (
        <div className="erp-modal-overlay" onClick={() => setShowMatch(false)}>
          <div className="erp-modal" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-header"><h3>Three-Way Match</h3><button onClick={() => setShowMatch(false)}>&times;</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="p-3 border rounded bg-blue-50">
                  <div className="text-xs font-bold text-blue-700 mb-1">Purchase Order</div>
                  <div className="font-bold">{matchData.purchase_order?.number || 'N/A'}</div>
                  <div className="text-lg font-mono">${Number(matchData.purchase_order?.total || 0).toFixed(2)}</div>
                </div>
                <div className="p-3 border rounded bg-green-50">
                  <div className="text-xs font-bold text-green-700 mb-1">Receipt</div>
                  <div className="font-bold">{matchData.receipt?.number || 'N/A'}</div>
                  <div className="text-lg font-mono">${Number(matchData.receipt?.total || 0).toFixed(2)}</div>
                </div>
                <div className="p-3 border rounded bg-purple-50">
                  <div className="text-xs font-bold text-purple-700 mb-1">AP Invoice</div>
                  <div className="font-bold">{matchData.invoice?.number || 'N/A'}</div>
                  <div className="text-lg font-mono">${Number(matchData.invoice?.total || 0).toFixed(2)}</div>
                </div>
              </div>
              <div className="p-3 border rounded text-center">
                <div className="text-xs font-bold mb-1">Match Status</div>
                <span className={`px-3 py-1 rounded text-sm font-bold ${matchData.match_status === 'matched' ? 'bg-green-100 text-green-700' : matchData.match_status === 'within_tolerance' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {matchData.match_status === 'matched' ? 'MATCHED' : matchData.match_status === 'within_tolerance' ? 'WITHIN TOLERANCE' : matchData.match_status === 'no_receipt' ? 'NO RECEIPT' : 'VARIANCE'}
                </span>
                {matchData.variance !== null && matchData.variance !== undefined && (
                  <div className="mt-2 text-sm">Variance: <span className={`font-mono font-bold ${Math.abs(matchData.variance) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>${Number(matchData.variance).toFixed(2)} ({matchData.variance_percent}%)</span></div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default APInvoices;
