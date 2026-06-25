import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    customer_no: '', name: '', customer_type: '', address1: '', address2: '',
    city: '', state: '', zip: '', country: 'US', phone: '', fax: '', email: '',
    website: '', contact_name: '', payment_terms: 'Net 30', credit_limit: 0,
    tax_code: '', salesperson: '', price_list: '', notes: ''
  });

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/api/sales/customers', { params: { search } });
      setCustomers(res.data);
    } catch { setCustomers([]); }
  };

  const handleSave = async () => {
    try {
      if (selected) {
        await api.put(`/api/sales/customers/${selected.id}`, form);
        toast.success('Customer updated');
      } else {
        await api.post('/api/sales/customers', form);
        toast.success('Customer created');
      }
      setShowModal(false);
      fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
  };

  const openNew = () => {
    setSelected(null);
    setForm({ customer_no: '', name: '', customer_type: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'US', phone: '', fax: '', email: '', website: '', contact_name: '', payment_terms: 'Net 30', credit_limit: 0, tax_code: '', salesperson: '', price_list: '', notes: '' });
    setShowModal(true);
  };

  const openEdit = (cust) => {
    setSelected(cust);
    setForm(cust);
    setShowModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={openNew}><span className="text-green-600">+</span> New</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchCustomers}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs ml-2">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCustomers()} placeholder="Customer name or number..." />
        <button className="erp-btn text-xs ml-1" onClick={fetchCustomers}>Find</button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr>
              <th>Customer No.</th>
              <th>Name</th>
              <th>Type</th>
              <th>City</th>
              <th>State</th>
              <th>Phone</th>
              <th>Contact</th>
              <th>Terms</th>
              <th>Salesperson</th>
            </tr>
          </thead>
          <tbody>
            {customers.map(c => (
              <tr key={c.id} className="cursor-pointer" onDoubleClick={() => openEdit(c)}>
                <td className="text-blue-700 font-bold">{c.customer_no}</td>
                <td>{c.name}</td>
                <td>{c.customer_type}</td>
                <td>{c.city}</td>
                <td>{c.state}</td>
                <td>{c.phone}</td>
                <td>{c.contact_name}</td>
                <td>{c.payment_terms}</td>
                <td>{c.salesperson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '700px' }}>
            <div className="erp-modal-title">
              <span>{selected ? `Customer: ${form.name}` : 'New Customer'}</span>
              <button className="text-white" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4">
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">General Info</legend>
                  <div className="space-y-2">
                    <div className="erp-form-group"><label className="erp-form-label">Customer No.:</label><input className="erp-form-input" value={form.customer_no} onChange={e => setForm({...form, customer_no: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Name:</label><input className="erp-form-input" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                      <select className="erp-form-select" value={form.customer_type} onChange={e => setForm({...form, customer_type: e.target.value})}>
                        <option value="">Select...</option>
                        <option value="Dealer">Dealer</option>
                        <option value="Contractor">Contractor</option>
                        <option value="Direct">Direct</option>
                        <option value="Wholesale">Wholesale</option>
                      </select>
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label">Contact:</label><input className="erp-form-input" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Phone:</label><input className="erp-form-input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Email:</label><input className="erp-form-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} /></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Address & Financials</legend>
                  <div className="space-y-2">
                    <div className="erp-form-group"><label className="erp-form-label">Address:</label><input className="erp-form-input" value={form.address1} onChange={e => setForm({...form, address1: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">City:</label><input className="erp-form-input" value={form.city} onChange={e => setForm({...form, city: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">State:</label><input className="erp-form-input" value={form.state} onChange={e => setForm({...form, state: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Zip:</label><input className="erp-form-input" value={form.zip} onChange={e => setForm({...form, zip: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Terms:</label>
                      <select className="erp-form-select" value={form.payment_terms} onChange={e => setForm({...form, payment_terms: e.target.value})}>
                        <option value="Net 30">Net 30</option>
                        <option value="Net 15">Net 15</option>
                        <option value="Net 60">Net 60</option>
                        <option value="COD">COD</option>
                        <option value="Prepaid">Prepaid</option>
                      </select>
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label">Credit Limit:</label><input className="erp-form-input" type="number" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} /></div>
                    <div className="erp-form-group"><label className="erp-form-label">Salesperson:</label><input className="erp-form-input" value={form.salesperson} onChange={e => setForm({...form, salesperson: e.target.value})} /></div>
                  </div>
                </fieldset>
              </div>
              <div className="mt-3">
                <label className="text-xs font-bold">Notes:</label>
                <textarea className="erp-form-input w-full h-16" value={form.notes || ''} onChange={e => setForm({...form, notes: e.target.value})} />
              </div>
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

export default Customers;
