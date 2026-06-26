import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function BankReconciliation() {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [statementBalance, setStatementBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => { fetchBanks(); }, []);

  const fetchBanks = async () => {
    try { const res = await api.get('/api/accounting/bank-accounts'); setBanks(Array.isArray(res.data) ? res.data : []); } catch { setBanks([]); }
  };

  const fetchTransactions = async (bankId) => {
    if (!bankId) { setTransactions([]); return; }
    try { const res = await api.get(`/api/accounting/bank-reconciliation/${bankId}/transactions`); setTransactions(Array.isArray(res.data) ? res.data : res.data.transactions || []); } catch { setTransactions([]); }
  };

  const handleBankChange = (bankId) => { setSelectedBank(bankId); fetchTransactions(bankId); };

  const toggleCleared = (idx) => {
    const updated = [...transactions];
    updated[idx].cleared = !updated[idx].cleared;
    setTransactions(updated);
  };

  const clearedBalance = transactions.filter(t => t.cleared).reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const difference = parseFloat(statementBalance || 0) - clearedBalance;

  const handleReconcile = async () => {
    if (Math.abs(difference) > 0.01) { toast.error('Statement balance does not match cleared items'); return; }
    try {
      await api.post('/api/accounting/bank-reconciliation', { bank_id: selectedBank, statement_date: statementDate, statement_balance: parseFloat(statementBalance), cleared_transactions: transactions.filter(t => t.cleared).map(t => t.id) });
      toast.success('Bank reconciled successfully'); fetchTransactions(selectedBank);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reconcile'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="text-xs font-bold">Bank Account:</span>
        <select className="erp-form-select ml-2 w-64" value={selectedBank} onChange={e => handleBankChange(e.target.value)}>
          <option value="">Select Bank Account...</option>{banks.map(b => <option key={b.id} value={b.id}>{b.bank_name || b.account_name} - {b.account_number}</option>)}
        </select>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Statement Date:</span>
        <input className="erp-form-input w-32 ml-1" type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} />
        <span className="text-xs ml-3">Statement Balance:</span>
        <input className="erp-form-input w-32 ml-1 text-right" type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="0.00" />
        <div className="ml-auto">
          <button className="erp-btn erp-btn-primary text-xs" onClick={handleReconcile} disabled={!selectedBank || Math.abs(difference) > 0.01}>Reconcile</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {!selectedBank ? (
          <div className="text-center p-8 text-gray-500">Select a bank account to begin reconciliation</div>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-4 p-3 bg-gray-50 border-b text-xs">
              <div><span className="font-bold">Cleared Total:</span> <span className="font-mono">${clearedBalance.toFixed(2)}</span></div>
              <div><span className="font-bold">Statement Balance:</span> <span className="font-mono">${parseFloat(statementBalance || 0).toFixed(2)}</span></div>
              <div><span className="font-bold">Difference:</span> <span className={`font-mono ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>${difference.toFixed(2)}</span></div>
            </div>
            <table className="erp-grid">
              <thead><tr><th>Clear</th><th>Date</th><th>Type</th><th>Reference</th><th>Payee/Description</th><th>Amount</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No unreconciled transactions</td></tr> : transactions.map((t, i) => (
                  <tr key={t.id || i} className={t.cleared ? 'bg-green-50' : ''}>
                    <td><input type="checkbox" checked={t.cleared || false} onChange={() => toggleCleared(i)} /></td>
                    <td>{t.transaction_date?.split('T')[0] || t.date}</td>
                    <td>{t.type || '-'}</td>
                    <td>{t.reference || '-'}</td>
                    <td>{t.description || t.payee || '-'}</td>
                    <td className={`text-right font-mono ${parseFloat(t.amount) < 0 ? 'text-red-600' : 'text-green-700'}`}>${parseFloat(t.amount || 0).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default BankReconciliation;
