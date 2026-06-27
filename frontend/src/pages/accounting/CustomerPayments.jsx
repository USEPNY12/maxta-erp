import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function CustomerPayments() {
  const [payments, setPayments] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [banks, setBanks] = useState([]);
  const [form, setForm] = useState({ customer_id: '', payment_date: new Date().toISOString().split('T')[0], amount: '', payment_method: 'check', reference_number: '', bank_account_id: '', notes: '', applied_invoices: [] });

  useEffect(() => { fetchPayments(); fetchCustomers(); fetchBanks(); }, []);

  const fetchPayments = async () => {
    try { const res = await api.get('/api/accounting/customer-payments'); setPayments(Array.isArray(res.data) ? res.data : res.data.payments || []); } catch { setPayments([]); }
  };

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); const data = res.data; setCustomers(Array.isArray(data) ? data : data.customers || []); } catch { setCustomers([]); }
  };

  const fetchBanks = async () => {
    try { const res = await api.get('/api/accounting/bank-accounts'); setBanks(Array.isArray(res.data) ? res.data : []); } catch { setBanks([]); }
  };

  const fetchOpenInvoices = async (customerId) => {
    if (!customerId) { setOpenInvoices([]); return; }
    try { const res = await api.get('/api/accounting/ar-invoices', { params: { customer_id: customerId, status: 'posted' } }); const invs = Array.isArray(res.data) ? res.data : res.data.invoices || []; setOpenInvoices(invs.filter(i => parseFloat(i.balance || i.total || 0) > 0)); } catch { setOpenInvoices([]); }
  };

  const handleCustomerChange = (customerId) => {
    setForm({ ...form, customer_id: customerId, applied_invoices: [] });
    fetchOpenInvoices(customerId);
  };

  const toggleInvoice = (inv) => {
    const existing = form.applied_invoices.find(a => a.ar_invoice_id === inv.id);
    if (existing) {
      setForm({ ...form, applied_invoices: form.applied_invoices.filter(a => a.ar_invoice_id !== inv.id) });
    } else {
      setForm({ ...form, applied_invoices: [...form.applied_invoices, { ar_invoice_id: inv.id, amount: parseFloat(inv.balance || inv.total || 0) }] });
    }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/accounting/customer-payments', form);
      toast.success('Payment recorded'); setShowNew(false); fetchPayments();
      setForm({ customer_id: '', payment_date: new Date().toISOString().split('T')[0], amount: '', payment_method: 'check', reference_number: '', bank_account_id: '', notes: '', applied_invoices: [] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to record payment'); }
  };

  const handleEmail = async (payment) => {
    try { await api.post('/api/email/send', { document_type: 'payment_receipt', document_id: payment.id }); toast.success('Receipt emailed'); } catch { toast.error('Failed to send email'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> Receive Payment</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchPayments}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>Print</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Payment#</th><th>Date</th><th>Customer</th><th>Amount</th><th>Method</th><th>Reference</th><th>Actions</th></tr></thead>
          <tbody>
            {payments.length === 0 ? <tr><td colSpan="7" className="text-center p-4 text-gray-500">No payments recorded</td></tr> : payments.map(p => (
              <tr key={p.id}>
                <td className="text-blue-700 font-bold">{p.payment_number}</td>
                <td>{p.payment_date?.split('T')[0]}</td>
                <td>{p.customer_name || '-'}</td>
                <td className="text-right font-bold">${parseFloat(p.amount || 0).toFixed(2)}</td>
                <td><span className="px-2 py-0.5 rounded text-xs bg-blue-100">{p.payment_method}</span></td>
                <td>{p.reference_number || p.check_number || '-'}</td>
                <td>
                  <button className="erp-btn text-xs" onClick={() => handleEmail(p)}>Email</button>
                  <button className="erp-btn text-xs ml-1" onClick={() => window.print()}>Print</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Receive Customer Payment</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer*:</label>
                  <select className="erp-form-select" value={form.customer_id} onChange={e => handleCustomerChange(e.target.value)}>
                    <option value="">Select Customer...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name} ({c.customer_number})</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Date:</label><input className="erp-form-input" type="date" value={form.payment_date} onChange={e => setForm({ ...form, payment_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Amount*:</label><input className="erp-form-input" type="number" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Method:</label>
                  <select className="erp-form-select" value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                    <option value="check">Check</option><option value="credit_card">Credit Card</option><option value="wire">Wire Transfer</option><option value="ach">ACH</option><option value="cash">Cash</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference/Check#:</label><input className="erp-form-input" value={form.reference_number} onChange={e => setForm({ ...form, reference_number: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Deposit To:</label>
                  <select className="erp-form-select" value={form.bank_account_id} onChange={e => setForm({ ...form, bank_account_id: e.target.value })}>
                    <option value="">Select Bank...</option>{banks.map(b => <option key={b.id} value={b.id}>{b.bank_name || b.account_name} - {b.account_number}</option>)}
                  </select></div>
              </div>
              {openInvoices.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold mb-1">Apply to Open Invoices:</h4>
                  <table className="erp-grid">
                    <thead><tr><th>Apply</th><th>Invoice#</th><th>Date</th><th>Total</th><th>Balance</th><th>Apply Amt</th></tr></thead>
                    <tbody>{openInvoices.map(inv => {
                      const applied = form.applied_invoices.find(a => a.ar_invoice_id === inv.id);
                      return (
                        <tr key={inv.id}>
                          <td><input type="checkbox" checked={!!applied} onChange={() => toggleInvoice(inv)} /></td>
                          <td>{inv.invoice_number}</td>
                          <td>{inv.invoice_date?.split('T')[0]}</td>
                          <td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td>
                          <td className="text-right">${parseFloat(inv.balance || inv.total || 0).toFixed(2)}</td>
                          <td>{applied && <input className="erp-form-input w-24 text-right" type="number" step="0.01" value={applied.amount} onChange={e => { const apps = form.applied_invoices.map(a => a.ar_invoice_id === inv.id ? { ...a, amount: parseFloat(e.target.value) || 0 } : a); setForm({ ...form, applied_invoices: apps }); }} />}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-12" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.customer_id || !form.amount}>Record Payment</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerPayments;
