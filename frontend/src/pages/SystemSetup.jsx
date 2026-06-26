import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const SETUP_SECTIONS = {
  General: [
    { key: 'company', label: 'Your Company', type: 'company' },
    { key: 'users', label: 'User Security', type: 'users' },
    { key: 'accounting-periods', label: 'Accounting Periods', type: 'table' },
    { key: 'currencies', label: 'Currencies', type: 'table' },
    { key: 'departments', label: 'Departments', type: 'table' },
  ],
  Sales: [
    { key: 'customer-types', label: 'Customer Types', type: 'table' },
    { key: 'tax-codes', label: 'Tax Codes', type: 'table' },
    { key: 'payment-terms', label: 'Payment Terms', type: 'table' },
    { key: 'carriers', label: 'Carriers', type: 'table' },
    { key: 'price-lists', label: 'Price Lists', type: 'table' },
  ],
  Inventory: [
    { key: 'item-types', label: 'Item Types', type: 'table' },
    { key: 'location-groups', label: 'Location Groups', type: 'table' },
    { key: 'locations', label: 'Locations', type: 'table' },
    { key: 'adjustment-codes', label: 'Adjustment Codes', type: 'table' },
  ],
  Manufacturing: [
    { key: 'work-centers', label: 'Work Centers', type: 'table' },
    { key: 'scrap-codes', label: 'Scrap Codes', type: 'table' },
  ],
  Purchasing: [
    { key: 'vendor-types', label: 'Vendor Types', type: 'table' },
  ],
  Accounting: [
    { key: 'banks', label: 'Banks', type: 'table' },
    { key: 'bank-accounts', label: 'Bank Accounts', type: 'table' },
  ],
};

function SystemSetup() {
  const [activeSection, setActiveSection] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [company, setCompany] = useState({});
  const [users, setUsers] = useState([]);

  const fetchRecords = async (key) => {
    setLoading(true);
    try {
      const res = await api.get(`/api/setup/${key}`);
      setRecords(Array.isArray(res.data) ? res.data : []);
    } catch { setRecords([]); }
    setLoading(false);
  };

  const fetchCompany = async () => {
    try { const res = await api.get('/api/setup/company'); setCompany(res.data || {}); } catch { setCompany({}); }
  };

  const fetchUsers = async () => {
    try { const res = await api.get('/api/setup/users'); setUsers(Array.isArray(res.data) ? res.data : []); } catch { setUsers([]); }
  };

  const handleSelect = (item) => {
    setActiveSection(item);
    setShowNew(false); setEditId(null); setForm({});
    if (item.type === 'company') fetchCompany();
    else if (item.type === 'users') fetchUsers();
    else fetchRecords(item.key);
  };

  const handleSave = async () => {
    try {
      if (editId) {
        await api.put(`/api/setup/${activeSection.key}/${editId}`, form);
        toast.success('Record updated');
      } else {
        await api.post(`/api/setup/${activeSection.key}`, form);
        toast.success('Record created');
      }
      setShowNew(false); setEditId(null); setForm({});
      fetchRecords(activeSection.key);
    } catch (err) { toast.error(err.response?.data?.error || 'Save failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this record?')) return;
    try {
      await api.delete(`/api/setup/${activeSection.key}/${id}`);
      toast.success('Record deactivated');
      fetchRecords(activeSection.key);
    } catch (err) { toast.error('Delete failed'); }
  };

  const handleCompanySave = async () => {
    try {
      await api.put('/api/setup/company', company);
      toast.success('Company info saved');
    } catch (err) { toast.error('Save failed'); }
  };

  const handleRoleChange = async (userId, role) => {
    try {
      await api.put(`/api/setup/users/${userId}/role`, { role });
      toast.success('Role updated');
      fetchUsers();
    } catch { toast.error('Failed to update role'); }
  };

  const getColumns = () => {
    if (records.length === 0) return [];
    return Object.keys(records[0]).filter(k => !['created_at','updated_at'].includes(k));
  };

  const renderCompanyForm = () => (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">Company Information</h3>
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        {['company_name','address_line1','address_line2','city','state','zip','country','phone','fax','email','website','tax_id'].map(f => (
          <div key={f}>
            <label className="block text-xs font-medium text-gray-600 mb-1">{f.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
            <input className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={company[f] || ''} onChange={e => setCompany({...company, [f]: e.target.value})} />
          </div>
        ))}
      </div>
      <button onClick={handleCompanySave} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Company Info</button>
    </div>
  );

  const renderUsersTable = () => (
    <div className="p-4">
      <h3 className="text-lg font-bold mb-4">User Security</h3>
      <table className="w-full text-sm border-collapse">
        <thead><tr className="bg-gray-100 border-b">
          <th className="text-left p-2">Username</th><th className="text-left p-2">Name</th>
          <th className="text-left p-2">Email</th><th className="text-left p-2">Role</th>
          <th className="text-left p-2">Active</th><th className="text-left p-2">Last Login</th>
        </tr></thead>
        <tbody>
          {users.map(u => (
            <tr key={u.id} className="border-b hover:bg-blue-50">
              <td className="p-2 font-medium">{u.username}</td>
              <td className="p-2">{u.first_name} {u.last_name}</td>
              <td className="p-2">{u.email}</td>
              <td className="p-2">
                <select value={u.role} onChange={e => handleRoleChange(u.id, e.target.value)} className="border rounded px-1 py-0.5 text-xs">
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="user">User</option>
                  <option value="viewer">Viewer</option>
                </select>
              </td>
              <td className="p-2">{u.is_active ? 'Yes' : 'No'}</td>
              <td className="p-2 text-xs text-gray-500">{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTable = () => {
    const cols = getColumns();
    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">{activeSection.label}</h3>
          <button onClick={() => { setShowNew(true); setEditId(null); setForm({}); }} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">+ New</button>
        </div>
        {(showNew || editId) && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <div className="grid grid-cols-3 gap-3">
              {cols.filter(c => c !== 'id' && c !== 'is_active').map(col => (
                <div key={col}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{col.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</label>
                  <input className="w-full border border-gray-300 rounded px-2 py-1 text-sm" value={form[col] || ''} onChange={e => setForm({...form, [col]: e.target.value})} />
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">{editId ? 'Update' : 'Create'}</button>
              <button onClick={() => { setShowNew(false); setEditId(null); }} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Cancel</button>
            </div>
          </div>
        )}
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-100 border-b">
            {cols.map(c => <th key={c} className="text-left p-2 text-xs font-medium">{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</th>)}
            <th className="text-left p-2 text-xs">Actions</th>
          </tr></thead>
          <tbody>
            {records.map(r => (
              <tr key={r.id} className="border-b hover:bg-blue-50">
                {cols.map(c => <td key={c} className="p-2 text-xs">{r[c] === true || r[c] === 1 ? 'Yes' : r[c] === false || r[c] === 0 ? (c === 'id' ? '0' : 'No') : (r[c] ?? '')}</td>)}
                <td className="p-2">
                  <button onClick={() => { setEditId(r.id); setForm(r); setShowNew(true); }} className="text-blue-600 text-xs mr-2 hover:underline">Edit</button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 text-xs hover:underline">Deactivate</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && !loading && <p className="text-center text-gray-400 py-4 text-sm">No records found</p>}
      </div>
    );
  };

  return (
    <div className="h-full flex bg-[#c8c8d4]">
      <div className="w-56 bg-white border-r border-gray-300 overflow-auto">
        <div className="p-3 bg-gray-800 text-white text-sm font-bold">System Setup</div>
        {Object.entries(SETUP_SECTIONS).map(([section, items]) => (
          <div key={section} className="border-b border-gray-200">
            <div className="px-3 py-2 bg-gray-50 text-xs font-bold text-gray-700 uppercase tracking-wide">{section}</div>
            {items.map(item => (
              <div
                key={item.key}
                onClick={() => handleSelect(item)}
                className={`px-4 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${activeSection?.key === item.key ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        {!activeSection && (
          <div className="p-8 text-center text-gray-500">
            <h2 className="text-xl font-bold mb-2">System Setup</h2>
            <p>Select a category from the left panel to view and manage configuration data.</p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              {Object.entries(SETUP_SECTIONS).map(([section, items]) => (
                <div key={section} className="bg-white rounded shadow p-3">
                  <h4 className="font-bold text-sm text-gray-800 mb-2">{section}</h4>
                  <div className="space-y-1">{items.map(i => <div key={i.key} className="text-xs text-gray-600">{i.label}</div>)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {activeSection?.type === 'company' && renderCompanyForm()}
        {activeSection?.type === 'users' && renderUsersTable()}
        {activeSection?.type === 'table' && renderTable()}
      </div>
    </div>
  );
}

export default SystemSetup;
