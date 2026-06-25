import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function GLAccounts() {
  const [accounts, setAccounts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ account_code: '', account_name: '', account_type: 'Asset', sub_type: '', normal_balance: 'Debit', active: true });

  useEffect(() => { fetchAccounts(); }, []);
  const fetchAccounts = async () => {
    try { const res = await api.get('/api/accounting/gl-accounts'); setAccounts(res.data); } catch { setAccounts([]); }
  };

  const handleSave = async () => {
    try {
      await api.post('/api/accounting/gl-accounts', form);
      toast.success('Account saved');
      setShowModal(false);
      fetchAccounts();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => { setForm({ account_code: '', account_name: '', account_type: 'Asset', sub_type: '', normal_balance: 'Debit', active: true }); setShowModal(true); }}>
          <span className="text-green-600">+</span> New Account
        </button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchAccounts}>↻ Refresh</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Account Code</th><th>Account Name</th><th>Type</th><th>Sub Type</th><th>Normal Balance</th><th>Active</th></tr>
          </thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id}>
                <td className="text-blue-700 font-bold">{a.account_code}</td>
                <td>{a.account_name}</td>
                <td>{a.account_type}</td>
                <td>{a.sub_type}</td>
                <td>{a.normal_balance}</td>
                <td>{a.active ? '✓' : '✕'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '500px' }}>
            <div className="erp-modal-title"><span>GL Account</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="erp-form-group"><label className="erp-form-label">Account Code:</label><input className="erp-form-input" value={form.account_code} onChange={e => setForm({...form, account_code: e.target.value})} /></div>
              <div className="erp-form-group"><label className="erp-form-label">Account Name:</label><input className="erp-form-input" value={form.account_name} onChange={e => setForm({...form, account_name: e.target.value})} /></div>
              <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                <select className="erp-form-select" value={form.account_type} onChange={e => setForm({...form, account_type: e.target.value})}>
                  <option value="Asset">Asset</option><option value="Liability">Liability</option><option value="Equity">Equity</option><option value="Revenue">Revenue</option><option value="Expense">Expense</option><option value="COGS">COGS</option>
                </select>
              </div>
              <div className="erp-form-group"><label className="erp-form-label">Sub Type:</label><input className="erp-form-input" value={form.sub_type} onChange={e => setForm({...form, sub_type: e.target.value})} /></div>
              <div className="erp-form-group"><label className="erp-form-label">Normal Balance:</label>
                <select className="erp-form-select" value={form.normal_balance} onChange={e => setForm({...form, normal_balance: e.target.value})}>
                  <option value="Debit">Debit</option><option value="Credit">Credit</option>
                </select>
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

export default GLAccounts;
