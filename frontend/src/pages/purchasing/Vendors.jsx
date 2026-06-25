import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Vendors() {
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    vendor_no: '', name: '', vendor_type: '', address1: '', city: '', state: '', zip: '',
    country: 'US', phone: '', email: '', contact_name: '', payment_terms: 'Net 30', notes: ''
  });

  useEffect(() => { fetchVendors(); }, []);
  const fetchVendors = async () => {
    try { const res = await api.get('/api/purchasing/vendors', { params: { search } }); setVendors(res.data); } catch { setVendors([]); }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/purchasing/vendors', form);
      toast.success('Vendor saved');
      setShowModal(false);
      fetchVendors();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => { setForm({ vendor_no: '', name: '', vendor_type: '', address1: '', city: '', state: '', zip: '', country: 'US', phone: '', email: '', contact_name: '', payment_terms: 'Net 30', notes: '' }); setShowModal(true); }}>
          <span className="text-green-600">+</span> New Vendor
        </button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchVendors}>↻ Refresh</button>
        <span className="text-xs ml-2">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchVendors()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchVendors}>Find</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Vendor No.</th><th>Name</th><th>Type</th><th>City</th><th>State</th><th>Phone</th><th>Contact</th><th>Terms</th></tr>
          </thead>
          <tbody>
            {vendors.map(v => (
              <tr key={v.id} className="cursor-pointer" onDoubleClick={() => { setForm(v); setShowModal(true); }}>
                <td className="text-blue-700 font-bold">{v.vendor_no}</td>
                <td>{v.name}</td>
                <td>{v.vendor_type}</td>
                <td>{v.city}</td>
                <td>{v.state}</td>
                <td>{v.phone}</td>
                <td>{v.contact_name}</td>
                <td>{v.payment_terms}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '600px' }}>
            <div className="erp-modal-title"><span>Vendor</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Vendor No.:</label><input className="erp-form-input" value={form.vendor_no} onChange={e => setForm({...form, vendor_no: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Name:</label><input className="erp-form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                    <select className="erp-form-select" value={form.vendor_type} onChange={e => setForm({...form, vendor_type: e.target.value})}>
                      <option value="">Select...</option>
                      <option value="Glass Supplier">Glass Supplier</option>
                      <option value="Hardware Supplier">Hardware Supplier</option>
                      <option value="Chemical Supplier">Chemical Supplier</option>
                      <option value="Freight">Freight</option>
                      <option value="Subcontractor">Subcontractor</option>
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Contact:</label><input className="erp-form-input" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Phone:</label><input className="erp-form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Email:</label><input className="erp-form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                </div>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Address:</label><input className="erp-form-input" value={form.address1} onChange={e => setForm({...form, address1: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">City:</label><input className="erp-form-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">State:</label><input className="erp-form-input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Zip:</label><input className="erp-form-input" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Terms:</label>
                    <select className="erp-form-select" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})}>
                      <option value="Net 30">Net 30</option><option value="Net 15">Net 15</option><option value="Net 60">Net 60</option><option value="COD">COD</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="mt-3"><label className="text-xs font-bold">Notes:</label><textarea className="erp-form-input w-full h-12" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave}>OK</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Vendors;
