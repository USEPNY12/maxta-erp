import { formatDate } from '../../utils/formatDate';
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

function ARInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({
    customer_id: '', sales_order_id: '', invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', subtotal: 0, tax_amount: 0, freight: 0, notes: ''
  });

  useEffect(() => { fetchInvoices(); }, []);

  const fetchInvoices = async () => {
    try { const res = await api.get('/api/sales/invoices'); setInvoices(Array.isArray(res.data) ? res.data : res.data.invoices || []); } catch { setInvoices([]); }
  };

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const handleNew = () => {
    fetchCustomers();
    setForm({ customer_id: '', sales_order_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', subtotal: 0, tax_amount: 0, freight: 0, notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    const total = (parseFloat(form.subtotal) || 0) + (parseFloat(form.tax_amount) || 0) + (parseFloat(form.freight) || 0);
    try {
      await api.post('/api/sales/invoices', { ...form, total });
      toast.success('AR Invoice created');
      setShowModal(false);
      fetchInvoices();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const getTotal = () => (parseFloat(form.subtotal) || 0) + (parseFloat(form.tax_amount) || 0) + (parseFloat(form.freight) || 0);

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New AR Invoice</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchInvoices}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Post Selected</button>
        <button className="erp-toolbar-btn">Print</button>
        <button className="erp-toolbar-btn">Email</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Invoice #</th><th>Customer</th><th>Date</th><th>Due Date</th><th>Total</th><th>Balance</th><th>Status</th></tr>
          </thead>
          <tbody>
            {(invoices || [])?.map(inv => (
              <tr key={inv.id}>
                <td className="text-blue-700 font-bold">{inv.invoice_number}</td>
                <td>{inv.customer_name}</td>
                <td>{formatDate(inv.invoice_date)}</td>
                <td className={inv.due_date && new Date(inv.due_date) < new Date() && inv.status === 'open' ? 'text-red-700 font-bold' : ''}>{formatDate(inv.due_date)}</td>
                <td className="text-right font-bold">${parseFloat(inv.total || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(inv.balance || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${inv.status}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '600px' }}>
            <div className="erp-modal-title"><span>AR Invoice</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Customer:</label>
                    <select className="erp-form-select" value={form.customer_id} onChange={e => setForm({...form, customer_id: e.target.value})}>
                      <option value="">Select Customer...</option>
                      {(customers || [])?.map(c => <option key={c.id} value={c.id}>{c.customer_no} - {c.company_name}</option>)}
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Invoice Date:</label><input type="date" className="erp-form-input" value={form.invoice_date} onChange={e => setForm({...form, invoice_date: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Due Date:</label><input type="date" className="erp-form-input" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Subtotal:</label><input type="number" step="0.01" className="erp-form-input" value={form.subtotal} onChange={e => setForm({...form, subtotal: parseFloat(e.target.value) || 0})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Tax:</label><input type="number" step="0.01" className="erp-form-input" value={form.tax_amount} onChange={e => setForm({...form, tax_amount: parseFloat(e.target.value) || 0})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Freight:</label><input type="number" step="0.01" className="erp-form-input" value={form.freight} onChange={e => setForm({...form, freight: parseFloat(e.target.value) || 0})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label font-bold">Total:</label><div className="erp-form-input bg-gray-100 font-bold">${getTotal().toFixed(2)}</div></div>
                </div>
              </div>
              <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-10" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave}>Save</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default ARInvoices;
