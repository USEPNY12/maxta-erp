import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function VendorPayments() {
  const [payments, setPayments] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [openInvoices, setOpenInvoices] = useState([]);
  const [form, setForm] = useState({
    vendor_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'check',
    check_number: '', amount: 0, notes: '', applied_invoices: []
  });

  useEffect(() => { fetchPayments(); }, []);

  const fetchPayments = async () => {
    try { const res = await api.get('/api/accounting/vendor-payments'); setPayments(res.data); } catch { setPayments([]); }
  };

  const fetchVendors = async () => {
    try { const res = await api.get('/api/purchasing/vendors'); setVendors(res.data); } catch { setVendors([]); }
  };

  const fetchOpenInvoices = async (vendorId) => {
    if (!vendorId) { setOpenInvoices([]); return; }
    try { const res = await api.get('/api/purchasing/ap-invoices', { params: { vendor_id: vendorId, status: 'open' } }); setOpenInvoices(res.data); } catch { setOpenInvoices([]); }
  };

  const handleNew = () => {
    fetchVendors();
    setForm({ vendor_id: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'check', check_number: '', amount: 0, notes: '', applied_invoices: [] });
    setShowModal(true);
  };

  const handleVendorChange = (vendorId) => {
    setForm({...form, vendor_id: vendorId});
    fetchOpenInvoices(vendorId);
  };

  const handleSave = async () => {
    try {
      await api.post('/api/accounting/vendor-payments', form);
      toast.success('Vendor payment recorded');
      setShowModal(false);
      fetchPayments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New Payment</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchPayments}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print Check</button>
        <button className="erp-toolbar-btn">Void</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Payment No.</th><th>Date</th><th>Vendor</th><th>Method</th><th>Check #</th><th>Amount</th><th>Status</th></tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id}>
                <td className="text-blue-700 font-bold">{p.payment_number}</td>
                <td>{p.payment_date}</td>
                <td>{p.vendor_name}</td>
                <td className="capitalize">{p.payment_method}</td>
                <td>{p.check_number || '-'}</td>
                <td className="text-right font-bold">${parseFloat(p.amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${p.posted ? 'posted' : 'draft'}`}>{p.posted ? 'Posted' : 'Draft'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '700px' }}>
            <div className="erp-modal-title"><span>Vendor Payment</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Vendor:</label>
                    <select className="erp-form-select" value={form.vendor_id} onChange={e => handleVendorChange(e.target.value)}>
                      <option value="">Select Vendor...</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_no} - {v.name}</option>)}
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Date:</label><input type="date" className="erp-form-input" value={form.payment_date} onChange={e => setForm({...form, payment_date: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Method:</label>
                    <select className="erp-form-select" value={form.payment_method} onChange={e => setForm({...form, payment_method: e.target.value})}>
                      <option value="check">Check</option><option value="wire">Wire Transfer</option><option value="ach">ACH</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Check #:</label><input className="erp-form-input" value={form.check_number} onChange={e => setForm({...form, check_number: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input type="number" step="0.01" className="erp-form-input" value={form.amount} onChange={e => setForm({...form, amount: parseFloat(e.target.value) || 0})} /></div>
                </div>
              </div>

              <div className="border-t border-gray-300 pt-2">
                <h4 className="text-xs font-bold mb-2">Apply to Open AP Invoices:</h4>
                <table className="erp-grid text-xs">
                  <thead><tr><th>Apply</th><th>Invoice #</th><th>Date</th><th>Amount</th><th>Balance</th><th>Apply Amount</th></tr></thead>
                  <tbody>
                    {openInvoices.length === 0 ? (
                      <tr><td colSpan="6" className="text-center p-2">Select a vendor to see open invoices</td></tr>
                    ) : openInvoices.map(inv => (
                      <tr key={inv.id}>
                        <td><input type="checkbox" /></td>
                        <td className="text-blue-700">{inv.invoice_number}</td>
                        <td>{inv.invoice_date}</td>
                        <td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td>
                        <td className="text-right font-bold">${parseFloat(inv.balance || 0).toFixed(2)}</td>
                        <td><input type="number" step="0.01" className="erp-form-input w-24" defaultValue={inv.balance} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-10" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
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

export default VendorPayments;
