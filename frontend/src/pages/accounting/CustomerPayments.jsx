import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [form, setForm] = useState({ customer_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Check', reference_no: '', amount: 0, applied_invoices: [] });

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try { const res = await api.get('/api/accounting/payments'); setPayments(res.data); } catch { setPayments([]); }
  };

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(res.data); } catch { setCustomers([]); }
  };

  const fetchOpenInvoices = async (customerId) => {
    if (!customerId) { setOpenInvoices([]); return; }
    try { const res = await api.get('/api/accounting/invoices', { params: { customer_id: customerId, status: 'Open' } }); setOpenInvoices(res.data); } catch { setOpenInvoices([]); }
  };

  const handleNewPayment = () => {
    fetchCustomers();
    setForm({ customer_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'Check', reference_no: '', amount: 0, applied_invoices: [] });
    setShowModal(true);
  };

  const handleCustomerChange = (customerId) => {
    setForm({...form, customer_id: customerId});
    fetchOpenInvoices(customerId);
  };

  const handleSave = async () => {
    try {
      await api.post('/api/accounting/payments', form);
      toast.success('Payment recorded');
      setShowModal(false);
      fetchPayments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNewPayment}><span className="text-green-600">+</span> New Payment</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchPayments}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Post</button>
        <button className="erp-toolbar-btn">Print Receipt</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Payment No.</th><th>Date</th><th>Customer</th><th>Method</th><th>Reference</th><th>Amount</th><th>Applied</th><th>Status</th></tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="text-blue-700 font-bold">{p.payment_no}</td>
                <td>{p.payment_date}</td>
                <td>{p.customer_name}</td>
                <td>{p.payment_method}</td>
                <td>{p.reference_no}</td>
                <td className="text-right font-bold">${parseFloat(p.amount || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(p.applied_amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${p.posted ? 'posted' : 'draft'}`}>{p.posted ? 'Posted' : 'Draft'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '700px' }}>
            <div className="erp-modal-title"><span>Customer Payment</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Customer:</label>
                    <select className="erp-form-select" value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)}>
                      <option value="">Select Customer...</option>
                      {customers.map(c => <option key={c.id} value={c.id}>{c.customer_no} - {c.name}</option>)}
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Date:</label><input type="date" className="erp-form-input" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Method:</label>
                    <select className="erp-form-select" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                      <option value="Check">Check</option><option value="Wire">Wire Transfer</option><option value="ACH">ACH</option><option value="Credit Card">Credit Card</option><option value="Cash">Cash</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Reference #:</label><input className="erp-form-input" value={form.reference_no} onChange={e => setForm({...form, reference_no: e.target.value})} placeholder="Check# or Trans ID" /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input type="number" step="0.01" className="erp-form-input" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} /></div>
                </div>
              </div>

              {/* Open Invoices to Apply */}
              <div className="border-t border-gray-300 pt-2">
                <h4 className="text-xs font-bold mb-2">Apply to Open Invoices:</h4>
                <table className="erp-grid text-xs">
                  <thead><tr><th>Apply</th><th>Invoice#</th><th>Date</th><th>Amount</th><th>Balance</th><th>Apply Amount</th></tr></thead>
                  <tbody>
                    {openInvoices.length === 0 ? (
                      <tr><td colSpan="6" className="text-center p-2">Select a customer to see open invoices</td></tr>
                    ) : openInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td><input type="checkbox" /></td>
                        <td className="text-blue-700">{inv.invoice_number}</td>
                        <td>{inv.invoice_date}</td>
                        <td className="text-right">${parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                        <td className="text-right font-bold">${parseFloat(inv.balance || 0).toFixed(2)}</td>
                        <td><input type="number" step="0.01" className="erp-form-input w-24" defaultValue={inv.balance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave}>Save & Post</button>
              <button className="erp-btn" onClick={handleSave}>Save Draft</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPayments;
