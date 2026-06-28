import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [searchParams] = useSearchParams();
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Orders');
  const [form, setForm] = useState({ customer_number: '', name: '', contact_name: '', phone: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US', payment_terms: 'Net 30', credit_limit: '', tax_exempt: false, notes: '' });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers', { params: { search } }); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const openDetail = async (cust) => {
    try { const res = await api.get(`/api/sales/customers/${cust.id}`); setSelected(res.data); setActiveTab('Orders'); setShowDetail(true); } catch { setSelected(cust); setShowDetail(true); }
  };

  const handleNew = () => {
    setForm({ customer_number: '', name: '', contact_name: '', phone: '', email: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US', payment_terms: 'Net 30', credit_limit: '', tax_exempt: false, notes: '' });
    setShowNew(true);
  };

  const handleSave = async () => {
    try {
      await api.post('/api/sales/customers', { ...form, credit_limit: form.credit_limit ? parseFloat(form.credit_limit) : null });
      toast.success('Customer created'); setShowNew(false); fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save customer'); }
  };

  return (
    <ModulePage {...salesMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchCustomers}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCustomers()} placeholder="Name, number, or phone..." />
        <button className="erp-btn text-xs ml-1" onClick={fetchCustomers}>Find</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Customer#</th><th>Company Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>City</th><th>State</th><th>Terms</th><th>Balance</th></tr></thead>
          <tbody>
            {customers.length === 0 ? <tr><td colSpan="9" className="text-center p-4 text-gray-500">No customers found</td></tr> : (customers || [])?.map(c => (
              <tr key={c.id} className={`cursor-pointer ${selected?.id === c.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(c)}>
                <td className="text-blue-700 font-bold">{c.customer_number}</td>
                <td>{c.company_name || c.name}</td>
                <td>{c.contact_name || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.city || '-'}</td>
                <td>{c.state || '-'}</td>
                <td>{c.payment_terms || '-'}</td>
                <td className="text-right">${parseFloat(c.balance || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Customer - {selected.company_name || selected.name}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">General</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Customer#:</label><span className="font-bold">{selected.customer_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Company:</label><span>{selected.company_name || selected.name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Contact:</label><span>{selected.contact_name || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Phone:</label><span>{selected.phone || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Email:</label><span>{selected.email || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Billing</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Address:</label><span>{selected.bill_address1 || selected.address1 || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">City/St/Zip:</label><span>{selected.city || '-'}, {selected.state || '-'} {selected.zip || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Terms:</label><span>{selected.payment_terms || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Credit Limit:</label><span>${parseFloat(selected.credit_limit || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Tax Exempt:</label><span>{selected.tax_exempt ? 'Yes' : 'No'}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['Orders', 'Invoices', 'Payments', 'Credits', 'Deposits', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[150px]">
                {activeTab === 'Orders' && (
                  <table className="erp-grid"><thead><tr><th>Order#</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>{(selected.orders || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No orders</td></tr> : (selected.orders || [])?.map((o, i) => (
                      <tr key={i}><td className="text-blue-700">{o.order_number}</td><td>{o.order_date?.split('T')[0]}</td><td className="text-right">${parseFloat(o.total || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(o.status || '').toLowerCase()}`}>{o.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice#</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>{(selected.invoices || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No invoices</td></tr> : (selected.invoices || [])?.map((inv, i) => (
                      <tr key={i}><td className="text-blue-700">{inv.invoice_number}</td><td>{inv.invoice_date?.split('T')[0]}</td><td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td><td className="text-right">${parseFloat(inv.balance || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Payments' && (
                  <table className="erp-grid"><thead><tr><th>Payment#</th><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
                    <tbody>{(selected.payments || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No payments</td></tr> : (selected.payments || [])?.map((p, i) => (
                      <tr key={i}><td>{p.payment_number}</td><td>{p.payment_date?.split('T')[0]}</td><td className="text-right">${parseFloat(p.amount || 0).toFixed(2)}</td><td>{p.payment_method || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Credits' && (
                  <table className="erp-grid"><thead><tr><th>Credit#</th><th>Date</th><th>Amount</th><th>Reason</th><th>Status</th></tr></thead>
                    <tbody>{(selected.credits || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No credit memos</td></tr> : (selected.credits || [])?.map((cr, i) => (
                      <tr key={i}><td>{cr.credit_memo_number}</td><td>{cr.credit_date?.split('T')[0]}</td><td className="text-right">${parseFloat(cr.amount || 0).toFixed(2)}</td><td>{cr.reason || '-'}</td><td><span className={`erp-status erp-status-${(cr.status || '').toLowerCase()}`}>{cr.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Deposits' && (
                  <table className="erp-grid"><thead><tr><th>Deposit#</th><th>Order#</th><th>Date</th><th>Amount</th><th>Method</th></tr></thead>
                    <tbody>{(selected.deposits || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No deposits</td></tr> : (selected.deposits || [])?.map((d, i) => (
                      <tr key={i}><td>{d.deposit_number || '-'}</td><td>{d.order_number || '-'}</td><td>{d.deposit_date?.split('T')[0]}</td><td className="text-right">${parseFloat(d.amount || 0).toFixed(2)}</td><td>{d.payment_method || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Audit Trail' && (
                  <table className="erp-grid"><thead><tr><th>Date/Time</th><th>User</th><th>Action</th></tr></thead>
                    <tbody><tr><td colSpan="3" className="text-center p-4 text-gray-500">Audit trail records</td></tr></tbody></table>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '600px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Customer</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div className="erp-form-group"><label className="erp-form-label">Customer#:</label><input className="erp-form-input" value={form.customer_number} onChange={e => setForm({ ...form, customer_number: e.target.value })} placeholder="Auto-generated if blank" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Company Name*:</label><input className="erp-form-input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Contact:</label><input className="erp-form-input" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Phone:</label><input className="erp-form-input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Email:</label><input className="erp-form-input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Address:</label><input className="erp-form-input" value={form.address1} onChange={e => setForm({ ...form, address1: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">City:</label><input className="erp-form-input" value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">State:</label><input className="erp-form-input w-16" value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Zip:</label><input className="erp-form-input w-24" value={form.zip} onChange={e => setForm({ ...form, zip: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Terms:</label>
                  <select className="erp-form-select" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })}>
                    <option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option><option>COD</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Credit Limit:</label><input className="erp-form-input" type="number" value={form.credit_limit} onChange={e => setForm({ ...form, credit_limit: e.target.value })} /></div>
              </div>
              <div className="mt-2 erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-12" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.name}>Save</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default Customers;
