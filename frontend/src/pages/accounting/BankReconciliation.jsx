import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function BankReconciliation() {
  const [reconciliations, setReconciliations] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');

  useEffect(() => { fetchBankAccounts(); fetchReconciliations(); }, []);

  const fetchBankAccounts = async () => {
    try { const res = await api.get('/api/accounting/bank-accounts'); setBankAccounts(res.data); } catch { setBankAccounts([]); }
  };

  const fetchReconciliations = async () => {
    try { const res = await api.get('/api/accounting/bank-reconciliation', { params: { bank_account_id: selectedBank || undefined } }); setReconciliations(res.data); } catch { setReconciliations([]); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Reconciliation</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchReconciliations}>↻ Refresh</button>
        <span className="text-xs ml-2">Bank Account:</span>
        <select className="erp-form-select w-48 ml-1" value={selectedBank} onChange={e => { setSelectedBank(e.target.value); }}>
          <option value="">All Accounts</option>
          {bankAccounts.map(b => <option key={b.id} value={b.id}>{b.account_name}</option>)}
        </select>
        <button className="erp-btn text-xs ml-1" onClick={fetchReconciliations}>Filter</button>
      </div>
      <div className="flex-1 overflow-auto">
        {/* Bank Account Summary */}
        {bankAccounts.length > 0 && (
          <div className="grid grid-cols-4 gap-3 p-3 bg-gray-50 border-b">
            {bankAccounts.map(b => (
              <div key={b.id} className="bg-white border rounded p-3 shadow-sm">
                <div className="text-xs text-gray-500">{b.account_name}</div>
                <div className="text-lg font-bold text-blue-800">${parseFloat(b.current_balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-400">Acct: ****{(b.account_number || '').slice(-4)}</div>
              </div>
            ))}
          </div>
        )}

        <table className="erp-grid">
          <thead>
            <tr><th>Bank</th><th>Statement Date</th><th>Statement Balance</th><th>Book Balance</th><th>Difference</th><th>Status</th></tr>
          </thead>
          <tbody>
            {reconciliations.length === 0 ? (
              <tr><td colSpan="6" className="text-center p-4 text-gray-500">No reconciliations found. Click "New Reconciliation" to start.</td></tr>
            ) : reconciliations.map(r => (
              <tr key={r.id}>
                <td>{r.account_name}</td>
                <td>{r.statement_date}</td>
                <td className="text-right font-bold">${parseFloat(r.statement_balance || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(r.book_balance || 0).toFixed(2)}</td>
                <td className={`text-right font-bold ${parseFloat(r.difference || 0) !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ${parseFloat(r.difference || 0).toFixed(2)}
                </td>
                <td><span className={`erp-status erp-status-${r.status}`}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default BankReconciliation;
