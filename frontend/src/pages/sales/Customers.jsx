import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

const emptyForm = {
  customer_number: '', company_name: '', dba_name: '', status: 'active', parent_customer_id: '',
  contact_name: '', phone: '', fax: '', email: '', website: '',
  bill_address1: '', bill_address2: '', bill_city: '', bill_state: '', bill_zip: '', bill_country: 'USA',
  ship_address1: '', ship_address2: '', ship_city: '', ship_state: '', ship_zip: '', ship_country: 'USA',
  customer_type_id: '', tax_group_id: '', payment_terms: 'Net 30', payment_method: 'check', discount_percent: 0,
  credit_limit: '', credit_status: 'good', credit_approved_by: '', credit_approved_date: '',
  finance_charge_exempt: false, send_statements: true, statement_cycle: 'monthly', collection_priority: 'medium',
  price_list_id: '', salesperson_id: '', territory: '', account_manager: '', source: '', industry: '',
  carrier_id: '', default_ship_via: '', shipping_method: 'our_truck', freight_terms: 'prepaid',
  preferred_delivery_days: '', delivery_time_window: '', requires_appointment: false, requires_liftgate: false,
  loading_dock_available: true, requires_rack_return: false, rack_deposit_required: false, racks_at_customer: 0,
  max_truck_size: '', delivery_instructions: '', delivery_contact_name: '', delivery_contact_phone: '', route_zone: '',
  tax_exempt: false, tax_exempt_number: '', resale_cert_number: '', tax_exempt_expiry: '', tax_id: '',
  requires_coc: false, breakage_claim_days: 3, recut_policy: 'standard', quality_tier: 'standard',
  lead_time_days: '', min_order_amount: '', alert_message: '', notes: '', internal_notes: '', currency_code: 'USD'
};

const emptyContact = { name: '', title: '', role: '', phone: '', mobile: '', email: '', department: '', is_primary: false, receives_invoices: false, receives_statements: false, receives_quotes: false, receives_pos: false, notes: '' };
const emptyAddress = { address_type: 'shipping', label: '', attention_to: '', address1: '', address2: '', city: '', state: '', zip: '', country: 'USA', phone: '', is_default_billing: false, is_default_shipping: false, delivery_instructions: '', delivery_hours: '', requires_liftgate: false, requires_inside_delivery: false, loading_dock: false, floor_suite: '' };

function Customers() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [searchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(searchParams.get('new') === 'true');
  const [isEdit, setIsEdit] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [formTab, setFormTab] = useState('General');
  const [contacts, setContacts] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ ...emptyContact });
  const [editContactIdx, setEditContactIdx] = useState(-1);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({ ...emptyAddress });
  const [editAddressIdx, setEditAddressIdx] = useState(-1);
  const [lookups, setLookups] = useState({ customerTypes: [], salespeople: [], carriers: [], priceLists: [] });
  // Detail view state
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [detailTab, setDetailTab] = useState('Orders');

  useEffect(() => { fetchCustomers(); fetchLookups(); }, []);

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers', { params: { search } }); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const fetchLookups = async () => {
    try {
      const [ct, sp] = await Promise.all([
        api.get('/api/sales/customer-types').catch(() => ({ data: [] })),
        api.get('/api/system/salespeople').catch(() => ({ data: [] }))
      ]);
      setLookups({ customerTypes: Array.isArray(ct.data) ? ct.data : [], salespeople: Array.isArray(sp.data) ? sp.data : [], carriers: [], priceLists: [] });
    } catch {}
  };

  const openDetail = async (cust) => {
    try { const res = await api.get(`/api/sales/customers/${cust.id}`); setSelected(res.data); setDetailTab('Orders'); setShowDetail(true); } catch { setSelected(cust); setShowDetail(true); }
  };

  const handleNew = () => {
    setForm({ ...emptyForm }); setContacts([]); setAddresses([]); setIsEdit(false); setFormTab('General'); setShowForm(true);
  };

  const handleEdit = () => {
    if (!selected) return;
    const f = { ...emptyForm };
    Object.keys(f).forEach(k => { if (selected[k] !== undefined && selected[k] !== null) f[k] = selected[k]; });
    // Fix booleans
    ['tax_exempt','finance_charge_exempt','send_statements','requires_appointment','requires_liftgate','loading_dock_available','requires_rack_return','rack_deposit_required','requires_coc'].forEach(k => { f[k] = !!f[k]; });
    setForm(f);
    setContacts(selected.contacts || []);
    setAddresses(selected.addresses || []);
    setIsEdit(true); setFormTab('General'); setShowDetail(false); setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.company_name) return toast.error('Company Name is required');
    try {
      const payload = { ...form, contacts, addresses };
      if (isEdit) {
        await api.put(`/api/sales/customers/${selected.id}`, payload);
        // Save contacts separately for edit
        for (const c of contacts) {
          if (c.id) await api.put(`/api/sales/customers/${selected.id}/contacts/${c.id}`, c);
          else await api.post(`/api/sales/customers/${selected.id}/contacts`, c);
        }
        for (const a of addresses) {
          if (a.id) await api.put(`/api/sales/customers/${selected.id}/addresses/${a.id}`, a);
          else await api.post(`/api/sales/customers/${selected.id}/addresses`, a);
        }
        toast.success('Customer updated');
      } else {
        await api.post('/api/sales/customers', payload);
        toast.success('Customer created');
      }
      setShowForm(false); fetchCustomers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save customer'); }
  };

  const copyBillToShip = () => {
    setForm(f => ({ ...f, ship_address1: f.bill_address1, ship_address2: f.bill_address2, ship_city: f.bill_city, ship_state: f.bill_state, ship_zip: f.bill_zip, ship_country: f.bill_country }));
  };

  const addContact = () => { setContactForm({ ...emptyContact }); setEditContactIdx(-1); setShowContactForm(true); };
  const editContact = (idx) => { setContactForm({ ...contacts[idx] }); setEditContactIdx(idx); setShowContactForm(true); };
  const saveContact = () => {
    if (!contactForm.name) return toast.error('Contact name required');
    if (editContactIdx >= 0) { const c = [...contacts]; c[editContactIdx] = contactForm; setContacts(c); }
    else setContacts([...contacts, contactForm]);
    setShowContactForm(false);
  };
  const removeContact = (idx) => { setContacts(contacts.filter((_, i) => i !== idx)); };

  const addAddress = () => { setAddressForm({ ...emptyAddress }); setEditAddressIdx(-1); setShowAddressForm(true); };
  const editAddress = (idx) => { setAddressForm({ ...addresses[idx] }); setEditAddressIdx(idx); setShowAddressForm(true); };
  const saveAddress = () => {
    if (!addressForm.address1) return toast.error('Address line 1 required');
    if (editAddressIdx >= 0) { const a = [...addresses]; a[editAddressIdx] = addressForm; setAddresses(a); }
    else setAddresses([...addresses, addressForm]);
    setShowAddressForm(false);
  };
  const removeAddress = (idx) => { setAddresses(addresses.filter((_, i) => i !== idx)); };

  const F = (label, field, opts = {}) => {
    const { type = 'text', width, options, placeholder, checkbox, textarea, disabled } = opts;
    if (checkbox) return (
      <label className="flex items-center gap-1 text-xs cursor-pointer"><input type="checkbox" checked={!!form[field]} onChange={e => setForm({ ...form, [field]: e.target.checked })} />{label}</label>
    );
    if (textarea) return (
      <div className="erp-form-group col-span-2"><label className="erp-form-label">{label}:</label><textarea className="erp-form-input w-full h-16" value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder} /></div>
    );
    if (options) return (
      <div className="erp-form-group"><label className="erp-form-label">{label}:</label>
        <select className="erp-form-select" style={width ? { width } : {}} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} disabled={disabled}>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select></div>
    );
    return (
      <div className="erp-form-group"><label className="erp-form-label">{label}:</label>
        <input className="erp-form-input" style={width ? { width } : {}} type={type} value={form[field] || ''} onChange={e => setForm({ ...form, [field]: e.target.value })} placeholder={placeholder} disabled={disabled} /></div>
    );
  };

  const formTabs = ['General', 'Contacts', 'Addresses', 'Financial', 'Shipping', 'Glass/QC', 'Notes'];

  return (
    <ModulePage {...salesMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchCustomers}>&#8635; Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>Print</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchCustomers()} placeholder="Name, number, or phone..." />
        <button className="erp-btn text-xs ml-1" onClick={fetchCustomers}>Find</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Customer#</th><th>Company Name</th><th>Contact</th><th>Phone</th><th>Email</th><th>City</th><th>State</th><th>Type</th><th>Terms</th><th>Status</th><th>Balance</th></tr></thead>
          <tbody>
            {customers.length === 0 ? <tr><td colSpan="11" className="text-center p-4 text-gray-500">No customers found</td></tr> : customers.map(c => (
              <tr key={c.id} className={`cursor-pointer hover:bg-blue-50 ${selected?.id === c.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(c)}>
                <td className="text-blue-700 font-bold">{c.customer_number}</td>
                <td>{c.company_name}</td>
                <td>{c.contact_name || '-'}</td>
                <td>{c.phone || '-'}</td>
                <td>{c.email || '-'}</td>
                <td>{c.bill_city || c.city || '-'}</td>
                <td>{c.bill_state || c.state || '-'}</td>
                <td>{c.customer_type_name || '-'}</td>
                <td>{c.payment_terms || '-'}</td>
                <td><span className={`erp-status erp-status-${c.status || (c.is_active ? 'active' : 'inactive')}`}>{c.status || (c.is_active ? 'Active' : 'Inactive')}</span></td>
                <td className="text-right">${parseFloat(c.current_balance || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* DETAIL VIEW */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '900px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Customer - {selected.company_name} ({selected.customer_number})</span>
              <button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">&#10005;</button>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {selected.alert_message && <div className="bg-yellow-100 border border-yellow-400 text-yellow-800 p-2 rounded mb-2 text-xs font-bold">&#9888; {selected.alert_message}</div>}
              <div className="grid grid-cols-3 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">General</legend>
                  <div className="space-y-1 text-xs">
                    <div><b>Customer#:</b> {selected.customer_number}</div>
                    <div><b>Company:</b> {selected.company_name}</div>
                    {selected.dba_name && <div><b>DBA:</b> {selected.dba_name}</div>}
                    <div><b>Type:</b> {selected.customer_type_name || '-'}</div>
                    <div><b>Status:</b> <span className={`erp-status erp-status-${selected.status}`}>{selected.status}</span></div>
                    <div><b>Contact:</b> {selected.contact_name || '-'}</div>
                    <div><b>Phone:</b> {selected.phone || '-'}</div>
                    <div><b>Email:</b> {selected.email || '-'}</div>
                    {selected.website && <div><b>Website:</b> {selected.website}</div>}
                    <div><b>Salesperson:</b> {selected.salesperson_name || '-'}</div>
                    <div><b>Territory:</b> {selected.territory || '-'}</div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Billing Address</legend>
                  <div className="space-y-1 text-xs">
                    <div>{selected.bill_address1 || '-'}</div>
                    {selected.bill_address2 && <div>{selected.bill_address2}</div>}
                    <div>{selected.bill_city || '-'}, {selected.bill_state || '-'} {selected.bill_zip || '-'}</div>
                    <div>{selected.bill_country || 'USA'}</div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div><b>Terms:</b> {selected.payment_terms || '-'}</div>
                    <div><b>Method:</b> {selected.payment_method || '-'}</div>
                    <div><b>Credit Limit:</b> ${parseFloat(selected.credit_limit || 0).toLocaleString()}</div>
                    <div><b>Credit Status:</b> <span className={`erp-status erp-status-${selected.credit_status}`}>{selected.credit_status}</span></div>
                    <div><b>Balance:</b> ${parseFloat(selected.current_balance || 0).toFixed(2)}</div>
                    <div><b>Tax Exempt:</b> {selected.tax_exempt ? 'Yes' : 'No'}</div>
                    {selected.discount_percent > 0 && <div><b>Discount:</b> {selected.discount_percent}%</div>}
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['Orders', 'Invoices', 'Payments', 'Contacts', 'Addresses', 'Deposits', 'Shipping'].map(tab => (
                  <div key={tab} className={`erp-tab ${detailTab === tab ? 'active' : ''}`} onClick={() => setDetailTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[150px]">
                {detailTab === 'Orders' && (
                  <table className="erp-grid"><thead><tr><th>Order#</th><th>Date</th><th>Project</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>{(selected.recent_orders || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No orders</td></tr> : selected.recent_orders.map((o, i) => (
                      <tr key={i}><td className="text-blue-700">{o.order_number}</td><td>{o.order_date?.split('T')[0]}</td><td>{o.project_name || '-'}</td><td className="text-right">${parseFloat(o.total || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(o.status||'').toLowerCase()}`}>{o.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice#</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>{(selected.open_invoices || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No invoices</td></tr> : selected.open_invoices.map((inv, i) => (
                      <tr key={i}><td className="text-blue-700">{inv.invoice_number}</td><td>{inv.invoice_date?.split('T')[0]}</td><td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td><td className="text-right">${parseFloat(inv.balance || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(inv.status||'').toLowerCase()}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Payments' && (
                  <table className="erp-grid"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th></tr></thead>
                    <tbody>{(selected.payments || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No payments</td></tr> : selected.payments.map((p, i) => (
                      <tr key={i}><td>{p.payment_date?.split('T')[0]}</td><td className="text-right">${parseFloat(p.amount || 0).toFixed(2)}</td><td>{p.payment_method || '-'}</td><td>{p.reference_number || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Contacts' && (
                  <table className="erp-grid"><thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Phone</th><th>Email</th><th>Primary</th></tr></thead>
                    <tbody>{(selected.contacts || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No contacts</td></tr> : selected.contacts.map((c, i) => (
                      <tr key={i}><td className="font-bold">{c.name}</td><td>{c.title || '-'}</td><td>{c.role || '-'}</td><td>{c.phone || '-'}</td><td>{c.email || '-'}</td><td>{c.is_primary ? 'Yes' : ''}</td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Addresses' && (
                  <table className="erp-grid"><thead><tr><th>Label</th><th>Type</th><th>Address</th><th>City</th><th>State</th><th>Default Ship</th></tr></thead>
                    <tbody>{(selected.addresses || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No additional addresses</td></tr> : selected.addresses.map((a, i) => (
                      <tr key={i}><td className="font-bold">{a.label || '-'}</td><td>{a.address_type}</td><td>{a.address1}</td><td>{a.city || '-'}</td><td>{a.state || '-'}</td><td>{a.is_default_shipping ? 'Yes' : ''}</td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Deposits' && (
                  <table className="erp-grid"><thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                    <tbody>{(selected.deposits || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No deposits</td></tr> : selected.deposits.map((d, i) => (
                      <tr key={i}><td>{d.deposit_date?.split('T')[0]}</td><td className="text-right">${parseFloat(d.amount || 0).toFixed(2)}</td><td>{d.payment_method || '-'}</td><td>{d.status}</td></tr>
                    ))}</tbody></table>
                )}
                {detailTab === 'Shipping' && (
                  <div className="text-xs space-y-1 p-2">
                    <div><b>Ship Via:</b> {selected.default_ship_via || '-'}</div>
                    <div><b>Method:</b> {selected.shipping_method || '-'}</div>
                    <div><b>Freight Terms:</b> {selected.freight_terms || '-'}</div>
                    <div><b>Delivery Days:</b> {selected.preferred_delivery_days || '-'}</div>
                    <div><b>Time Window:</b> {selected.delivery_time_window || '-'}</div>
                    <div><b>Requires Appointment:</b> {selected.requires_appointment ? 'Yes' : 'No'}</div>
                    <div><b>Liftgate:</b> {selected.requires_liftgate ? 'Yes' : 'No'}</div>
                    <div><b>Loading Dock:</b> {selected.loading_dock_available ? 'Yes' : 'No'}</div>
                    <div><b>Rack Return:</b> {selected.requires_rack_return ? 'Yes' : 'No'}</div>
                    <div><b>Racks at Customer:</b> {selected.racks_at_customer || 0}</div>
                    <div><b>Route/Zone:</b> {selected.route_zone || '-'}</div>
                    <div><b>Delivery Contact:</b> {selected.delivery_contact_name || '-'} {selected.delivery_contact_phone || ''}</div>
                    {selected.delivery_instructions && <div><b>Instructions:</b> {selected.delivery_instructions}</div>}
                  </div>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleEdit}>Edit</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* NEW/EDIT FORM */}
      {showForm && (
        <div className="erp-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="erp-modal" style={{ minWidth: '950px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>{isEdit ? 'Edit' : 'New'} Customer</span><button onClick={() => setShowForm(false)} className="text-white hover:text-gray-300">&#10005;</button></div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {/* Tabs */}
              <div className="erp-tabs mb-3">
                {formTabs.map(tab => (
                  <div key={tab} className={`erp-tab ${formTab === tab ? 'active' : ''}`} onClick={() => setFormTab(tab)}>{tab}</div>
                ))}
              </div>

              {/* GENERAL TAB */}
              {formTab === 'General' && (
                <div className="space-y-3">
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Identity</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Customer#', 'customer_number', { placeholder: 'Auto-generated if blank' })}
                      {F('Company Name*', 'company_name')}
                      {F('DBA / Trade Name', 'dba_name')}
                      {F('Status', 'status', { options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'on_hold', label: 'On Hold' }, { value: 'prospect', label: 'Prospect' }, { value: 'cod_only', label: 'COD Only' }] })}
                      {F('Customer Type', 'customer_type_id', { options: [{ value: '', label: '-- Select --' }, ...lookups.customerTypes.map(t => ({ value: t.id, label: t.name }))] })}
                      {F('Industry', 'industry', { placeholder: 'e.g., Construction, Architecture' })}
                      {F('Source', 'source', { options: [{ value: '', label: '-- Select --' }, { value: 'referral', label: 'Referral' }, { value: 'trade_show', label: 'Trade Show' }, { value: 'web', label: 'Website' }, { value: 'cold_call', label: 'Cold Call' }, { value: 'existing', label: 'Existing' }] })}
                      {F('Website', 'website', { placeholder: 'www.example.com' })}
                      {F('Currency', 'currency_code', { options: [{ value: 'USD', label: 'USD' }, { value: 'CAD', label: 'CAD' }] })}
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Primary Contact</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Contact Name', 'contact_name')}
                      {F('Phone', 'phone')}
                      {F('Fax', 'fax')}
                      {F('Email', 'email', { type: 'email' })}
                    </div>
                  </fieldset>
                  <div className="grid grid-cols-2 gap-3">
                    <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Billing Address</legend>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Address 1:</label><input className="erp-form-input w-full" value={form.bill_address1} onChange={e => setForm({ ...form, bill_address1: e.target.value })} /></div>
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Address 2:</label><input className="erp-form-input w-full" value={form.bill_address2} onChange={e => setForm({ ...form, bill_address2: e.target.value })} /></div>
                        {F('City', 'bill_city')}
                        {F('State', 'bill_state', { width: '60px' })}
                        {F('Zip', 'bill_zip', { width: '80px' })}
                        {F('Country', 'bill_country', { width: '80px' })}
                      </div>
                    </fieldset>
                    <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Default Shipping Address <button className="text-blue-600 text-xs ml-2 underline" onClick={copyBillToShip}>Copy from Billing</button></legend>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Address 1:</label><input className="erp-form-input w-full" value={form.ship_address1} onChange={e => setForm({ ...form, ship_address1: e.target.value })} /></div>
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Address 2:</label><input className="erp-form-input w-full" value={form.ship_address2} onChange={e => setForm({ ...form, ship_address2: e.target.value })} /></div>
                        {F('City', 'ship_city')}
                        {F('State', 'ship_state', { width: '60px' })}
                        {F('Zip', 'ship_zip', { width: '80px' })}
                        {F('Country', 'ship_country', { width: '80px' })}
                      </div>
                    </fieldset>
                  </div>
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Sales Assignment</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Salesperson', 'salesperson_id', { options: [{ value: '', label: '-- Select --' }, ...lookups.salespeople.map(s => ({ value: s.id, label: s.name }))] })}
                      {F('Territory', 'territory')}
                      {F('Account Manager', 'account_manager')}
                    </div>
                  </fieldset>
                </div>
              )}

              {/* CONTACTS TAB */}
              {formTab === 'Contacts' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold">Contacts ({contacts.length})</span>
                    <button className="erp-btn text-xs" onClick={addContact}>+ Add Contact</button>
                  </div>
                  <table className="erp-grid">
                    <thead><tr><th>Name</th><th>Title</th><th>Role</th><th>Phone</th><th>Mobile</th><th>Email</th><th>Primary</th><th>Actions</th></tr></thead>
                    <tbody>
                      {contacts.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No contacts added. Click "+ Add Contact" to add one.</td></tr> : contacts.map((c, i) => (
                        <tr key={i}>
                          <td className="font-bold">{c.name}</td><td>{c.title || '-'}</td><td>{c.role || '-'}</td>
                          <td>{c.phone || '-'}</td><td>{c.mobile || '-'}</td><td>{c.email || '-'}</td>
                          <td>{c.is_primary ? 'Yes' : ''}</td>
                          <td><button className="text-blue-600 text-xs mr-2" onClick={() => editContact(i)}>Edit</button><button className="text-red-600 text-xs" onClick={() => removeContact(i)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {showContactForm && (
                    <div className="mt-3 border border-blue-300 bg-blue-50 p-3 rounded">
                      <div className="text-xs font-bold mb-2">{editContactIdx >= 0 ? 'Edit' : 'New'} Contact</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="erp-form-group"><label className="erp-form-label">Name*:</label><input className="erp-form-input" value={contactForm.name} onChange={e => setContactForm({ ...contactForm, name: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Title:</label><input className="erp-form-input" value={contactForm.title} onChange={e => setContactForm({ ...contactForm, title: e.target.value })} placeholder="e.g., VP Purchasing" /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Role:</label>
                          <select className="erp-form-select" value={contactForm.role} onChange={e => setContactForm({ ...contactForm, role: e.target.value })}>
                            <option value="">-- Select --</option><option>Purchasing</option><option>Accounts Payable</option><option>Project Manager</option><option>Receiving</option><option>Owner</option><option>Estimator</option><option>General</option>
                          </select></div>
                        <div className="erp-form-group"><label className="erp-form-label">Phone:</label><input className="erp-form-input" value={contactForm.phone} onChange={e => setContactForm({ ...contactForm, phone: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Mobile:</label><input className="erp-form-input" value={contactForm.mobile} onChange={e => setContactForm({ ...contactForm, mobile: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Email:</label><input className="erp-form-input" value={contactForm.email} onChange={e => setContactForm({ ...contactForm, email: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Department:</label><input className="erp-form-input" value={contactForm.department} onChange={e => setContactForm({ ...contactForm, department: e.target.value })} /></div>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!contactForm.is_primary} onChange={e => setContactForm({ ...contactForm, is_primary: e.target.checked })} /> Primary Contact</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!contactForm.receives_invoices} onChange={e => setContactForm({ ...contactForm, receives_invoices: e.target.checked })} /> Receives Invoices</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!contactForm.receives_statements} onChange={e => setContactForm({ ...contactForm, receives_statements: e.target.checked })} /> Receives Statements</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!contactForm.receives_quotes} onChange={e => setContactForm({ ...contactForm, receives_quotes: e.target.checked })} /> Receives Quotes</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!contactForm.receives_pos} onChange={e => setContactForm({ ...contactForm, receives_pos: e.target.checked })} /> Receives POs</label>
                      </div>
                      <div className="mt-2 erp-form-group"><label className="erp-form-label text-xs">Notes:</label><input className="erp-form-input w-full" value={contactForm.notes || ''} onChange={e => setContactForm({ ...contactForm, notes: e.target.value })} /></div>
                      <div className="mt-2 flex gap-2">
                        <button className="erp-btn erp-btn-primary text-xs" onClick={saveContact}>Save Contact</button>
                        <button className="erp-btn text-xs" onClick={() => setShowContactForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ADDRESSES TAB */}
              {formTab === 'Addresses' && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold">Additional Addresses ({addresses.length})</span>
                    <button className="erp-btn text-xs" onClick={addAddress}>+ Add Address</button>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">Add multiple ship-to addresses, job sites, or alternate billing addresses. The default billing/shipping is on the General tab.</p>
                  <table className="erp-grid">
                    <thead><tr><th>Label</th><th>Type</th><th>Address</th><th>City</th><th>State</th><th>Zip</th><th>Default Ship</th><th>Actions</th></tr></thead>
                    <tbody>
                      {addresses.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No additional addresses. Click "+ Add Address" to add one.</td></tr> : addresses.map((a, i) => (
                        <tr key={i}>
                          <td className="font-bold">{a.label || '-'}</td><td>{a.address_type}</td><td>{a.address1}</td>
                          <td>{a.city || '-'}</td><td>{a.state || '-'}</td><td>{a.zip || '-'}</td>
                          <td>{a.is_default_shipping ? 'Yes' : ''}</td>
                          <td><button className="text-blue-600 text-xs mr-2" onClick={() => editAddress(i)}>Edit</button><button className="text-red-600 text-xs" onClick={() => removeAddress(i)}>Remove</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {showAddressForm && (
                    <div className="mt-3 border border-blue-300 bg-blue-50 p-3 rounded">
                      <div className="text-xs font-bold mb-2">{editAddressIdx >= 0 ? 'Edit' : 'New'} Address</div>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="erp-form-group"><label className="erp-form-label">Label:</label><input className="erp-form-input" value={addressForm.label} onChange={e => setAddressForm({ ...addressForm, label: e.target.value })} placeholder="e.g., Warehouse, Job Site #3" /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                          <select className="erp-form-select" value={addressForm.address_type} onChange={e => setAddressForm({ ...addressForm, address_type: e.target.value })}>
                            <option value="shipping">Shipping</option><option value="billing">Billing</option><option value="job_site">Job Site</option><option value="mailing">Mailing</option>
                          </select></div>
                        <div className="erp-form-group"><label className="erp-form-label">Attention To:</label><input className="erp-form-input" value={addressForm.attention_to} onChange={e => setAddressForm({ ...addressForm, attention_to: e.target.value })} /></div>
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Address 1*:</label><input className="erp-form-input w-full" value={addressForm.address1} onChange={e => setAddressForm({ ...addressForm, address1: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Address 2:</label><input className="erp-form-input" value={addressForm.address2} onChange={e => setAddressForm({ ...addressForm, address2: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">City:</label><input className="erp-form-input" value={addressForm.city} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">State:</label><input className="erp-form-input" style={{ width: '60px' }} value={addressForm.state} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Zip:</label><input className="erp-form-input" style={{ width: '80px' }} value={addressForm.zip} onChange={e => setAddressForm({ ...addressForm, zip: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Phone:</label><input className="erp-form-input" value={addressForm.phone} onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })} /></div>
                        <div className="erp-form-group"><label className="erp-form-label">Floor/Suite:</label><input className="erp-form-input" value={addressForm.floor_suite} onChange={e => setAddressForm({ ...addressForm, floor_suite: e.target.value })} /></div>
                        <div className="col-span-2 erp-form-group"><label className="erp-form-label">Delivery Hours:</label><input className="erp-form-input w-full" value={addressForm.delivery_hours} onChange={e => setAddressForm({ ...addressForm, delivery_hours: e.target.value })} placeholder="e.g., 7am-3pm weekdays" /></div>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs">
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!addressForm.is_default_shipping} onChange={e => setAddressForm({ ...addressForm, is_default_shipping: e.target.checked })} /> Default Shipping</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!addressForm.is_default_billing} onChange={e => setAddressForm({ ...addressForm, is_default_billing: e.target.checked })} /> Default Billing</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!addressForm.requires_liftgate} onChange={e => setAddressForm({ ...addressForm, requires_liftgate: e.target.checked })} /> Requires Liftgate</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!addressForm.requires_inside_delivery} onChange={e => setAddressForm({ ...addressForm, requires_inside_delivery: e.target.checked })} /> Inside Delivery</label>
                        <label className="flex items-center gap-1"><input type="checkbox" checked={!!addressForm.loading_dock} onChange={e => setAddressForm({ ...addressForm, loading_dock: e.target.checked })} /> Loading Dock</label>
                      </div>
                      <div className="mt-2 erp-form-group"><label className="erp-form-label text-xs">Delivery Instructions:</label><textarea className="erp-form-input w-full h-12" value={addressForm.delivery_instructions || ''} onChange={e => setAddressForm({ ...addressForm, delivery_instructions: e.target.value })} placeholder="Special instructions for this address..." /></div>
                      <div className="mt-2 flex gap-2">
                        <button className="erp-btn erp-btn-primary text-xs" onClick={saveAddress}>Save Address</button>
                        <button className="erp-btn text-xs" onClick={() => setShowAddressForm(false)}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* FINANCIAL TAB */}
              {formTab === 'Financial' && (
                <div className="space-y-3">
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Payment & Credit</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Payment Terms', 'payment_terms', { options: [{ value: 'Net 30', label: 'Net 30' }, { value: 'Net 15', label: 'Net 15' }, { value: 'Net 45', label: 'Net 45' }, { value: 'Net 60', label: 'Net 60' }, { value: 'Net 90', label: 'Net 90' }, { value: 'Due on Receipt', label: 'Due on Receipt' }, { value: 'COD', label: 'COD' }, { value: 'Prepaid', label: 'Prepaid' }, { value: '2/10 Net 30', label: '2/10 Net 30' }] })}
                      {F('Payment Method', 'payment_method', { options: [{ value: 'check', label: 'Check' }, { value: 'wire', label: 'Wire Transfer' }, { value: 'ach', label: 'ACH' }, { value: 'credit_card', label: 'Credit Card' }, { value: 'cod', label: 'COD' }] })}
                      {F('Discount %', 'discount_percent', { type: 'number' })}
                      {F('Credit Limit', 'credit_limit', { type: 'number', placeholder: '0.00' })}
                      {F('Credit Status', 'credit_status', { options: [{ value: 'good', label: 'Good' }, { value: 'warning', label: 'Warning' }, { value: 'hold', label: 'Hold' }, { value: 'cod_only', label: 'COD Only' }] })}
                      {F('Collection Priority', 'collection_priority', { options: [{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }] })}
                      {F('Credit Approved By', 'credit_approved_by')}
                      {F('Credit Approved Date', 'credit_approved_date', { type: 'date' })}
                      {F('Min Order Amount', 'min_order_amount', { type: 'number', placeholder: '0.00' })}
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Tax Information</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Tax ID / EIN', 'tax_id')}
                      <div className="erp-form-group">{F('', 'tax_exempt', { checkbox: true, label: 'Tax Exempt' })}</div>
                      {F('Tax Exempt #', 'tax_exempt_number')}
                      {F('Resale Cert #', 'resale_cert_number')}
                      {F('Exempt Expiry', 'tax_exempt_expiry', { type: 'date' })}
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Statements & Charges</legend>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="erp-form-group">{F('', 'send_statements', { checkbox: true, label: 'Send Statements' })}</div>
                      {F('Statement Cycle', 'statement_cycle', { options: [{ value: 'monthly', label: 'Monthly' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-Weekly' }] })}
                      <div className="erp-form-group">{F('', 'finance_charge_exempt', { checkbox: true, label: 'Finance Charge Exempt' })}</div>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* SHIPPING TAB */}
              {formTab === 'Shipping' && (
                <div className="space-y-3">
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Default Shipping Preferences</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Ship Via / Carrier', 'default_ship_via', { placeholder: 'e.g., Our Truck, FedEx' })}
                      {F('Shipping Method', 'shipping_method', { options: [{ value: 'our_truck', label: 'Our Truck' }, { value: 'common_carrier', label: 'Common Carrier' }, { value: 'customer_pickup', label: 'Customer Pickup' }, { value: 'will_call', label: 'Will Call' }] })}
                      {F('Freight Terms', 'freight_terms', { options: [{ value: 'prepaid', label: 'Prepaid' }, { value: 'collect', label: 'Collect' }, { value: 'prepaid_add', label: 'Prepaid & Add' }, { value: 'fob_origin', label: 'FOB Origin' }, { value: 'fob_destination', label: 'FOB Destination' }] })}
                      {F('Route / Zone', 'route_zone', { placeholder: 'e.g., Zone A, North Route' })}
                      {F('Preferred Delivery Days', 'preferred_delivery_days', { placeholder: 'e.g., Mon, Wed, Fri' })}
                      {F('Delivery Time Window', 'delivery_time_window', { placeholder: 'e.g., 7am-3pm' })}
                      {F('Max Truck Size', 'max_truck_size', { placeholder: 'e.g., 26ft, 53ft' })}
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Delivery Requirements</legend>
                    <div className="grid grid-cols-4 gap-2">
                      <div>{F('', 'requires_appointment', { checkbox: true, label: 'Requires Appointment' })}</div>
                      <div>{F('', 'requires_liftgate', { checkbox: true, label: 'Requires Liftgate' })}</div>
                      <div>{F('', 'loading_dock_available', { checkbox: true, label: 'Loading Dock Available' })}</div>
                      <div>{F('', 'requires_rack_return', { checkbox: true, label: 'Requires Rack Return' })}</div>
                      <div>{F('', 'rack_deposit_required', { checkbox: true, label: 'Rack Deposit Required' })}</div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {F('Racks at Customer', 'racks_at_customer', { type: 'number' })}
                      {F('Delivery Contact', 'delivery_contact_name')}
                      {F('Delivery Phone', 'delivery_contact_phone')}
                    </div>
                  </fieldset>
                  {F('Delivery Instructions', 'delivery_instructions', { textarea: true, placeholder: 'Special delivery instructions for all shipments to this customer...' })}
                </div>
              )}

              {/* GLASS/QC TAB */}
              {formTab === 'Glass/QC' && (
                <div className="space-y-3">
                  <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Glass Fabrication Preferences</legend>
                    <div className="grid grid-cols-3 gap-2">
                      {F('Quality Tier', 'quality_tier', { options: [{ value: 'standard', label: 'Standard' }, { value: 'premium', label: 'Premium' }, { value: 'architectural', label: 'Architectural' }] })}
                      {F('Lead Time (days)', 'lead_time_days', { type: 'number', placeholder: 'Override default' })}
                      {F('Recut Policy', 'recut_policy', { options: [{ value: 'standard', label: 'Standard' }, { value: 'free_recuts', label: 'Free Recuts' }, { value: 'charge_all', label: 'Charge All' }, { value: 'first_free', label: 'First Free' }] })}
                      {F('Breakage Claim Days', 'breakage_claim_days', { type: 'number' })}
                      <div>{F('', 'requires_coc', { checkbox: true, label: 'Requires Certificate of Conformance (COC)' })}</div>
                    </div>
                  </fieldset>
                </div>
              )}

              {/* NOTES TAB */}
              {formTab === 'Notes' && (
                <div className="space-y-3">
                  {F('Alert Message (shows when creating orders)', 'alert_message', { textarea: true, placeholder: 'Warning message that pops up when creating orders for this customer...' })}
                  {F('Notes (appears on documents)', 'notes', { textarea: true, placeholder: 'Customer-facing notes...' })}
                  {F('Internal Notes (not visible to customer)', 'internal_notes', { textarea: true, placeholder: 'Internal notes about this customer...' })}
                </div>
              )}
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.company_name}>Save Customer</button>
              <button className="erp-btn" onClick={() => setShowForm(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default Customers;
