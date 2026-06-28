import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

export default function BankReconciliation() {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState('');
  const [transactions, setTransactions] = useState([]);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState('reconcile');
  const [statementBalance, setStatementBalance] = useState('');
  const [statementDate, setStatementDate] = useState(new Date().toISOString().split('T')[0]);
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [newTxn, setNewTxn] = useState({ transaction_date: new Date().toISOString().split('T')[0], type: 'withdrawal', reference: '', description: '', amount: '' });
  const [filter, setFilter] = useState('uncleared');

  useEffect(() => { fetchBanks(); }, []);

  const fetchBanks = async () => {
    try { const res = await api.get('/api/accounting/bank-accounts'); setBanks(Array.isArray(res.data) ? res.data : []); } catch { setBanks([]); }
  };

  const fetchTransactions = async (bankId, f) => {
    if (!bankId) { setTransactions([]); return; }
    try {
      const res = await api.get(`/api/accounting/bank-reconciliation/${bankId}/transactions`, { params: { status: f || filter } });
      setTransactions(Array.isArray(res.data) ? res.data : []);
    } catch { setTransactions([]); }
  };

  const fetchHistory = async (bankId) => {
    if (!bankId) { setHistory([]); return; }
    try {
      const res = await api.get(`/api/accounting/bank-reconciliation/${bankId}/history`);
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch { setHistory([]); }
  };

  const handleBankChange = (bankId) => {
    setSelectedBank(bankId);
    fetchTransactions(bankId);
    fetchHistory(bankId);
  };

  const toggleCleared = (idx) => {
    const updated = [...transactions];
    updated[idx] = { ...updated[idx], _selected: !updated[idx]._selected };
    setTransactions(updated);
  };

  const selectAll = () => setTransactions((transactions || [])?.map(t => ({ ...t, _selected: true })));
  const deselectAll = () => setTransactions((transactions || [])?.map(t => ({ ...t, _selected: false })));

  const selectedTotal = transactions?.filter(t => t._selected)?.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
  const bankInfo = banks?.find(b => String(b.id) === String(selectedBank));
  const bookBalance = bankInfo ? parseFloat(bankInfo.current_balance || 0) : 0;
  const difference = parseFloat(statementBalance || 0) - (bookBalance + selectedTotal);

  const handleReconcile = async () => {
    const selectedIds = transactions?.filter(t => t._selected)?.map(t => t.id);
    if (selectedIds.length === 0) { toast.error('No transactions selected'); return; }
    if (!statementBalance) { toast.error('Enter statement balance'); return; }
    try {
      await api.post(`/api/accounting/bank-reconciliation/${selectedBank}/reconcile`, {
        statement_date: statementDate, statement_balance: parseFloat(statementBalance),
        cleared_transaction_ids: selectedIds, notes: `Reconciled ${selectedIds.length} transactions`
      });
      toast.success('Bank reconciled successfully!');
      fetchTransactions(selectedBank);
      fetchHistory(selectedBank);
      fetchBanks();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to reconcile'); }
  };

  const handleAddTransaction = async () => {
    if (!newTxn.amount || !newTxn.description) { toast.error('Amount and description required'); return; }
    try {
      await api.post(`/api/accounting/bank-reconciliation/${selectedBank}/transactions`, {
        ...newTxn,
        amount: newTxn.type === 'deposit' || newTxn.type === 'interest' ? Math.abs(parseFloat(newTxn.amount)) : -Math.abs(parseFloat(newTxn.amount))
      });
      toast.success('Transaction added');
      setShowAddTxn(false);
      setNewTxn({ transaction_date: new Date().toISOString().split('T')[0], type: 'withdrawal', reference: '', description: '', amount: '' });
      fetchTransactions(selectedBank);
      fetchBanks();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add transaction'); }
  };

  const handleFilterChange = (f) => { setFilter(f); fetchTransactions(selectedBank, f); };

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar flex-wrap gap-2">
        <span className="text-xs font-bold">Bank Account:</span>
        <select className="erp-form-select w-64" value={selectedBank} onChange={e => handleBankChange(e.target.value)}>
          <option value="">Select Bank Account...</option>
          {banks?.map(b => <option key={b.id} value={b.id}>{b.bank_name || b.account_name} - {b.account_number}</option>)}
        </select>
        {selectedBank && (
          <>
            <div className="erp-toolbar-separator" />
            <button className={`erp-btn text-xs ${tab === 'reconcile' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('reconcile')}>Reconcile</button>
            <button className={`erp-btn text-xs ${tab === 'history' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('history')}>History</button>
            <div className="ml-auto flex gap-2">
              <button className="erp-btn text-xs bg-green-600 text-white hover:bg-green-700" onClick={() => setShowAddTxn(true)}>+ Add Transaction</button>
            </div>
          </>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {!selectedBank ? (
          <div className="text-center p-8 text-gray-500">Select a bank account to begin reconciliation</div>
        ) : tab === 'reconcile' ? (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-3 bg-gray-50 border-b">
              <div className="text-xs"><span className="font-bold block text-gray-500">Book Balance</span><span className="font-mono text-lg">${bookBalance.toFixed(2)}</span></div>
              <div className="text-xs"><span className="font-bold block text-gray-500">Statement Date</span><input className="erp-form-input w-full text-sm" type="date" value={statementDate} onChange={e => setStatementDate(e.target.value)} /></div>
              <div className="text-xs"><span className="font-bold block text-gray-500">Statement Balance</span><input className="erp-form-input w-full text-right text-sm font-mono" type="number" step="0.01" value={statementBalance} onChange={e => setStatementBalance(e.target.value)} placeholder="0.00" /></div>
              <div className="text-xs"><span className="font-bold block text-gray-500">Selected Total</span><span className="font-mono text-lg">${selectedTotal.toFixed(2)}</span></div>
              <div className="text-xs"><span className="font-bold block text-gray-500">Difference</span><span className={`font-mono text-lg ${Math.abs(difference) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>${difference.toFixed(2)}</span>
                <button className="erp-btn erp-btn-primary text-xs ml-2" onClick={handleReconcile} disabled={!statementBalance}>Reconcile</button>
              </div>
            </div>
            <div className="flex gap-2 p-2 border-b bg-white">
              <button className={`text-xs px-2 py-1 rounded ${filter === 'uncleared' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => handleFilterChange('uncleared')}>Uncleared</button>
              <button className={`text-xs px-2 py-1 rounded ${filter === 'cleared' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => handleFilterChange('cleared')}>Cleared</button>
              <button className={`text-xs px-2 py-1 rounded ${filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`} onClick={() => handleFilterChange('all')}>All</button>
              <div className="ml-auto flex gap-2">
                <button className="text-xs text-blue-600 hover:underline" onClick={selectAll}>Select All</button>
                <button className="text-xs text-blue-600 hover:underline" onClick={deselectAll}>Deselect All</button>
              </div>
            </div>
            <table className="erp-grid">
              <thead><tr><th className="w-10">✓</th><th>Date</th><th>Type</th><th>Reference</th><th>Description</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr><td colSpan="7" className="text-center p-4 text-gray-500">No transactions found</td></tr>
                ) : (transactions || [])?.map((t, i) => (
                  <tr key={t.id || i} className={t._selected ? 'bg-blue-50' : t.cleared ? 'bg-green-50' : ''}>
                    <td className="text-center">{!t.cleared ? <input type="checkbox" checked={t._selected || false} onChange={() => toggleCleared(i)} /> : <span className="text-green-600">✓</span>}</td>
                    <td>{t.transaction_date?.split('T')[0] || '-'}</td>
                    <td><span className={`px-1.5 py-0.5 rounded text-xs ${t.type === 'deposit' || t.type === 'interest' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{(t.type || 'other').toUpperCase()}</span></td>
                    <td>{t.reference || '-'}</td>
                    <td>{t.description || '-'}</td>
                    <td className={`text-right font-mono ${parseFloat(t.amount) >= 0 ? 'text-green-700' : 'text-red-600'}`}>${parseFloat(t.amount || 0).toFixed(2)}</td>
                    <td>{t.cleared ? <span className="text-xs text-green-600 font-medium">Cleared</span> : <span className="text-xs text-gray-500">Open</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4">
            <h3 className="text-sm font-bold mb-3">Reconciliation History</h3>
            <table className="erp-grid">
              <thead><tr><th>Statement Date</th><th className="text-right">Statement Balance</th><th className="text-right">Book Balance</th><th className="text-right">Difference</th><th>Status</th><th>Reconciled</th></tr></thead>
              <tbody>
                {history.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-4 text-gray-500">No reconciliation history</td></tr>
                ) : history?.map(h => (
                  <tr key={h.id}>
                    <td>{h.statement_date?.split('T')[0]}</td>
                    <td className="text-right font-mono">${parseFloat(h.statement_balance || 0).toFixed(2)}</td>
                    <td className="text-right font-mono">${parseFloat(h.book_balance || 0).toFixed(2)}</td>
                    <td className={`text-right font-mono ${Math.abs(parseFloat(h.difference || 0)) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>${parseFloat(h.difference || 0).toFixed(2)}</td>
                    <td><span className={`px-2 py-0.5 rounded text-xs ${h.status === 'reconciled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{(h.status || '').toUpperCase()}</span></td>
                    <td>{h.reconciled_date ? new Date(h.reconciled_date).toLocaleDateString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddTxn && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[450px]">
            <h3 className="text-lg font-bold mb-4">Add Bank Transaction</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Date</label><input type="date" className="erp-form-input w-full" value={newTxn.transaction_date} onChange={e => setNewTxn({...newTxn, transaction_date: e.target.value})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                  <select className="erp-form-select w-full" value={newTxn.type} onChange={e => setNewTxn({...newTxn, type: e.target.value})}>
                    <option value="deposit">Deposit</option><option value="withdrawal">Withdrawal</option><option value="check">Check</option>
                    <option value="transfer">Transfer</option><option value="fee">Bank Fee</option><option value="interest">Interest</option><option value="adjustment">Adjustment</option>
                  </select>
                </div>
              </div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Reference / Check #</label><input type="text" className="erp-form-input w-full" value={newTxn.reference} onChange={e => setNewTxn({...newTxn, reference: e.target.value})} placeholder="Check # or reference" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Description</label><input type="text" className="erp-form-input w-full" value={newTxn.description} onChange={e => setNewTxn({...newTxn, description: e.target.value})} placeholder="Payee or description" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Amount</label><input type="number" step="0.01" className="erp-form-input w-full text-right font-mono" value={newTxn.amount} onChange={e => setNewTxn({...newTxn, amount: e.target.value})} placeholder="0.00" />
                <p className="text-xs text-gray-500 mt-1">Enter positive amount. Sign determined by type.</p></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowAddTxn(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
              <button onClick={handleAddTransaction} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Add Transaction</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
