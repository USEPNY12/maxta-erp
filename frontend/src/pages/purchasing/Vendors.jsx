import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';

function Vendors() {
  const [searchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('PurchaseOrders');
  const [form, setForm] = useState({ vendor_number: '', name: '', contact_name: '', phone: '', email: '', address1: '', city: '', state: '', zip: '', country: 'US', payment_terms: 'Net 30', notes: '' });

  useEffect(() => { fetchVendors(); }, []);

  const fetchVendors = async () => {
    try { const res = await api.get('/api/purchasing/vendors', { params: { search } }); setVendors(Array.isArray(res.data) ? res.data : res.data.vendors || []); } catch { setVendors([]); }
  };

  const openDetail = async (v) => {
    try { const res = await api.get(`/api/purchasing/vendors/${v.id}`); setSelected(res.data); setActiveTab('PurchaseOrders'); setShowDetail(true); } catch { setSelected(v); setShowDetail(true); }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/purchasing/vendors', form);
      toast.success('Vendor created'); setShowNew(false); fetchVendors();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save vendor'); }
  };

  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchVendors}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchVendors()} placeholder="Name, number..." />
        <button className="erp-btn text-xs ml-1" onClick={fetchVendors}>Find</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Vendor#</th><th>Company Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>City</th><th>State</th><th>Terms</th></tr></thead>
          <tbody>
            {vendors.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No vendors found</td></tr> : (vendors || []).map(v => (
              <tr key={v.id} className={`cursor-pointer ${selected?.id === v.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(v)}>
                <td className="text-blue-700 font-bold">{v.vendor_number}</td>
                <td>{v.company_name || v.name}</td>
                <td>{v.contact_name || '-'}</td>
                <td>{v.phone || '-'}</td>
                <td>{v.email || '-'}</td>
                <td>{v.city || '-'}</td>
                <td>{v.state || '-'}</td>
                <td>{v.payment_terms || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Vendor - {selected.company_name || selected.name}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">General</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Vendor#:</label><span className="font-bold">{selected.vendor_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Company:</label><span>{selected.company_name || selected.name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Contact:</label><span>{selected.contact_name || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Phone:</label><span>{selected.phone || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Email:</label><span>{selected.email || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Address & Terms</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Address:</label><span>{selected.address1 || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">City/St/Zip:</label><span>{selected.city || '-'}, {selected.state || '-'} {selected.zip || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Terms:</label><span>{selected.payment_terms || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">1099 Vendor:</label><span>{selected.is_1099 ? 'Yes' : 'No'}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['PurchaseOrders', 'Receipts', 'AP Invoices', 'Payments', 'Items', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[150px]">
                {activeTab === 'PurchaseOrders' && (
                  <table className="erp-grid"><thead><tr><th>PO#</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>{(selected.recent_pos || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No purchase orders</td></tr> : (selected.recent_pos || []).map((po, i) => (
                      <tr key={i}><td className="text-blue-700">{po.po_number}</td><td>{po.order_date?.split('T')[0]}</td><td className="text-right">${parseFloat(po.total || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(po.status || '').toLowerCase()}`}>{po.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Receipts' && (
                  <table className="erp-grid"><thead><tr><th>Receipt#</th><th>PO#</th><th>Date</th><th>Status</th></tr></thead>
                    <tbody>{(selected.receipts || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No receipts</td></tr> : (selected.receipts || []).map((r, i) => (
                      <tr key={i}><td>{r.receipt_number}</td><td>{r.po_number || '-'}</td><td>{r.receipt_date?.split('T')[0]}</td><td><span className={`erp-status erp-status-${(r.status || '').toLowerCase()}`}>{r.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'AP Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice#</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>{(selected.open_ap || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No AP invoices</td></tr> : (selected.open_ap || []).map((inv, i) => (
                      <tr key={i}><td className="text-blue-700">{inv.invoice_number}</td><td>{inv.invoice_date?.split('T')[0]}</td><td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td><td className="text-right">${parseFloat(inv.balance || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Payments' && (
                  <table className="erp-grid"><thead><tr><th>Payment#</th><th>Date</th><th>Amount</th><th>Method</th><th>Check#</th></tr></thead>
                    <tbody>{(selected.payments || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No payments</td></tr> : (selected.payments || []).map((p, i) => (
                      <tr key={i}><td>{p.payment_number}</td><td>{p.payment_date?.split('T')[0]}</td><td className="text-right">${parseFloat(p.amount || 0).toFixed(2)}</td><td>{p.payment_method || '-'}</td><td>{p.check_number || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Items' && (
                  <table className="erp-grid"><thead><tr><th>Item#</th><th>Description</th><th>Vendor Part#</th><th>Lead Time</th><th>Last Cost</th></tr></thead>
                    <tbody>{(selected.items || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No vendor items</td></tr> : (selected.items || []).map((item, i) => (
                      <tr key={i}><td>{item.item_number}</td><td>{item.description}</td><td>{item.vendor_item_number || '-'}</td><td>{item.lead_time_days || '-'} days</td><td className="text-right">${parseFloat(item.unit_cost || 0).toFixed(2)}</td></tr>
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
            <div className="erp-modal-title"><span>New Vendor</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-3">
                <div className="erp-form-group"><label className="erp-form-label">Vendor#:</label><input className="erp-form-input" value={form.vendor_number} onChange={e => setForm({ ...form, vendor_number: e.target.value })} placeholder="Auto if blank" /></div>
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
                    <option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option>
                  </select></div>
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

export default Vendors;
