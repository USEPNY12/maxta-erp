import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

function GLAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [form, setForm] = useState({ account_number: '', account_name: '', account_type: 'asset', sub_type: '', description: '', is_active: true });

  useEffect(() => { fetchAccounts(); }, []);

  const fetchAccounts = async () => {
    try { const res = await api.get('/api/accounting/gl-accounts', { params: { search, type: typeFilter } }); setAccounts(Array.isArray(res.data) ? res.data : res.data.accounts || []); } catch { setAccounts([]); }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/accounting/gl-accounts', form);
      toast.success('GL Account created'); setShowNew(false); fetchAccounts();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create account'); }
  };

  const getTypeColor = (type) => {
    const colors = { asset: 'bg-blue-100 text-blue-800', liability: 'bg-red-100 text-red-800', equity: 'bg-purple-100 text-purple-800', revenue: 'bg-green-100 text-green-800', expense: 'bg-orange-100 text-orange-800' };
    return colors[type] || 'bg-gray-100';
  };

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New Account</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchAccounts}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print Chart</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAccounts()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchAccounts}>Find</button>
        <div className="ml-auto text-xs">Type:
          <select className="erp-form-select ml-1" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setTimeout(fetchAccounts, 0); }}>
            <option value="">All</option><option value="asset">Assets</option><option value="liability">Liabilities</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expenses</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Account#</th><th>Account Name</th><th>Type</th><th>Sub-Type</th><th>Balance</th><th>Active</th></tr></thead>
          <tbody>
            {accounts.length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No accounts found</td></tr> : accounts.map(a => (
              <tr key={a.id}>
                <td className="font-mono font-bold">{a.account_number}</td>
                <td>{a.account_name}</td>
                <td><span className={`px-2 py-0.5 rounded text-xs ${getTypeColor(a.account_type)}`}>{a.account_type}</span></td>
                <td>{a.sub_type || '-'}</td>
                <td className="text-right font-mono">${parseFloat(a.balance || 0).toFixed(2)}</td>
                <td>{a.is_active ? '✓' : '✕'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New GL Account</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Account#:</label><input className="erp-form-input" value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} placeholder="e.g. 1000" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Account Name:</label><input className="erp-form-input" value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                  <select className="erp-form-select" value={form.account_type} onChange={e => setForm({ ...form, account_type: e.target.value })}>
                    <option value="asset">Asset</option><option value="liability">Liability</option><option value="equity">Equity</option><option value="revenue">Revenue</option><option value="expense">Expense</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Sub-Type:</label><input className="erp-form-input" value={form.sub_type} onChange={e => setForm({ ...form, sub_type: e.target.value })} placeholder="e.g. Current Asset, Fixed Asset" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Description:</label><textarea className="erp-form-input w-full h-12" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.account_number || !form.account_name}>Save</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default GLAccounts;
