import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

export default function BudgetManager() {
  const [budgets, setBudgets] = useState([]);
  const [selectedBudget, setSelectedBudget] = useState(null);
  const [budgetDetail, setBudgetDetail] = useState(null);
  const [variance, setVariance] = useState(null);
  const [tab, setTab] = useState('list');
  const [showCreate, setShowCreate] = useState(false);
  const [showAddLine, setShowAddLine] = useState(false);
  const [glAccounts, setGlAccounts] = useState([]);
  const [newBudget, setNewBudget] = useState({ name: '', fiscal_year: new Date().getFullYear(), budget_type: 'annual', notes: '' });
  const [newLine, setNewLine] = useState({ gl_account_id: '', period_1: 0, period_2: 0, period_3: 0, period_4: 0, period_5: 0, period_6: 0, period_7: 0, period_8: 0, period_9: 0, period_10: 0, period_11: 0, period_12: 0 });
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  useEffect(() => { fetchBudgets(); fetchGLAccounts(); }, []);

  const fetchBudgets = async () => {
    try { const res = await api.get('/api/accounting-advanced/budgets'); setBudgets(Array.isArray(res.data) ? res.data : []); } catch { setBudgets([]); }
  };

  const fetchGLAccounts = async () => {
    try { const res = await api.get('/api/accounting/gl-accounts'); setGlAccounts(Array.isArray(res.data) ? res.data : []); } catch { setGlAccounts([]); }
  };

  const fetchBudgetDetail = async (id) => {
    try {
      const res = await api.get(`/api/accounting-advanced/budgets/${id}`);
      setBudgetDetail(res.data);
      setSelectedBudget(id);
      setTab('detail');
    } catch(e) { toast.error('Failed to load budget detail'); }
  };

  const fetchVariance = async (id) => {
    try {
      const res = await api.get(`/api/accounting-advanced/budgets/${id}/variance`);
      setVariance(res.data);
      setTab('variance');
    } catch(e) { toast.error('Failed to load variance report'); }
  };

  const handleCreate = async () => {
    if (!newBudget.name || !newBudget.fiscal_year) { toast.error('Name and fiscal year required'); return; }
    try {
      await api.post('/api/accounting-advanced/budgets', newBudget);
      toast.success('Budget created');
      setShowCreate(false);
      setNewBudget({ name: '', fiscal_year: new Date().getFullYear(), budget_type: 'annual', notes: '' });
      fetchBudgets();
    } catch(e) { toast.error('Failed to create budget'); }
  };

  const handleAddLine = async () => {
    if (!newLine.gl_account_id) { toast.error('Select a GL account'); return; }
    try {
      await api.post(`/api/accounting-advanced/budgets/${selectedBudget}/lines`, newLine);
      toast.success('Budget line saved');
      setShowAddLine(false);
      setNewLine({ gl_account_id: '', period_1: 0, period_2: 0, period_3: 0, period_4: 0, period_5: 0, period_6: 0, period_7: 0, period_8: 0, period_9: 0, period_10: 0, period_11: 0, period_12: 0 });
      fetchBudgetDetail(selectedBudget);
    } catch(e) { toast.error('Failed to save budget line'); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this budget?')) return;
    try {
      await api.post(`/api/accounting-advanced/budgets/${id}/approve`);
      toast.success('Budget approved');
      fetchBudgets();
      if (budgetDetail && budgetDetail.id === id) fetchBudgetDetail(id);
    } catch(e) { toast.error('Failed to approve'); }
  };

  const lineTotal = Object.keys(newLine)?.filter(k => k.startsWith('period_'))?.reduce((s, k) => s + parseFloat(newLine[k] || 0), 0);

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
        <div className="erp-toolbar flex-wrap gap-2">
          <button className={`erp-btn text-xs ${tab === 'list' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('list')}>Budget List</button>
          {selectedBudget && <button className={`erp-btn text-xs ${tab === 'detail' ? 'erp-btn-primary' : ''}`} onClick={() => fetchBudgetDetail(selectedBudget)}>Detail</button>}
          {selectedBudget && <button className={`erp-btn text-xs ${tab === 'variance' ? 'erp-btn-primary' : ''}`} onClick={() => fetchVariance(selectedBudget)}>Variance Report</button>}
          <div className="ml-auto">
            <button className="erp-btn text-xs bg-green-600 text-white hover:bg-green-700" onClick={() => setShowCreate(true)}>+ New Budget</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {/* Budget List */}
          {tab === 'list' && (
            <table className="erp-grid">
              <thead>
                <tr><th>Name</th><th>Fiscal Year</th><th>Type</th><th className="text-right">Total Amount</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {budgets.length === 0 ? (
                  <tr><td colSpan="6" className="text-center p-4 text-gray-500">No budgets found. Create one to get started.</td></tr>
                ) : budgets?.map(b => (
                  <tr key={b.id}>
                    <td className="font-medium">{b.name}</td>
                    <td>{b.fiscal_year}</td>
                    <td><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">{b.budget_type}</span></td>
                    <td className="text-right font-mono">${parseFloat(b.total_amount || 0).toLocaleString()}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        b.status === 'active' ? 'bg-green-100 text-green-700' :
                        b.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                        b.status === 'closed' ? 'bg-gray-100 text-gray-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{(b.status || 'draft').toUpperCase()}</span>
                    </td>
                    <td className="space-x-2">
                      <button className="text-blue-600 hover:underline text-xs" onClick={() => fetchBudgetDetail(b.id)}>View</button>
                      <button className="text-purple-600 hover:underline text-xs" onClick={() => fetchVariance(b.id)}>Variance</button>
                      {b.status === 'draft' && <button className="text-green-600 hover:underline text-xs" onClick={() => handleApprove(b.id)}>Approve</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Budget Detail */}
          {tab === 'detail' && budgetDetail && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-lg font-bold">{budgetDetail.name}</h2>
                  <p className="text-sm text-gray-500">FY{budgetDetail.fiscal_year} | {budgetDetail.budget_type} | Total: ${parseFloat(budgetDetail.total_amount || 0).toLocaleString()}</p>
                </div>
                <button className="erp-btn text-xs bg-green-600 text-white hover:bg-green-700" onClick={() => setShowAddLine(true)}>+ Add Line</button>
              </div>
              <div className="overflow-x-auto">
                <table className="erp-grid text-xs">
                  <thead>
                    <tr>
                      <th className="sticky left-0 bg-white z-10">Account</th>
                      {months?.map(m => <th key={m} className="text-right min-w-[70px]">{m}</th>)}
                      <th className="text-right font-bold">Annual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(budgetDetail.lines || []).length === 0 ? (
                      <tr><td colSpan="14" className="text-center p-4 text-gray-500">No budget lines. Add GL accounts to build your budget.</td></tr>
                    ) : (budgetDetail.lines || [])?.map(line => (
                      <tr key={line.id}>
                        <td className="sticky left-0 bg-white z-10 font-medium whitespace-nowrap">{line.account_number} - {line.account_name}</td>
                        {Array.from({length: 12}, (_, i) => (
                          <td key={i} className="text-right font-mono">${parseFloat(line[`period_${i+1}`] || 0).toLocaleString()}</td>
                        ))}
                        <td className="text-right font-mono font-bold">${parseFloat(line.annual_total || 0).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                  {(budgetDetail.lines || []).length > 0 && (
                    <tfoot>
                      <tr className="font-bold bg-gray-50">
                        <td className="sticky left-0 bg-gray-50 z-10">TOTAL</td>
                        {Array.from({length: 12}, (_, i) => (
                          <td key={i} className="text-right font-mono">
                            ${(budgetDetail.lines || [])?.reduce((s, l) => s + parseFloat(l[`period_${i+1}`] || 0), 0).toLocaleString()}
                          </td>
                        ))}
                        <td className="text-right font-mono">${(budgetDetail.lines || [])?.reduce((s, l) => s + parseFloat(l.annual_total || 0), 0).toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}

          {/* Variance Report */}
          {tab === 'variance' && variance && (
            <div>
              <h2 className="text-lg font-bold mb-2">Budget vs Actual - {variance.budget?.name}</h2>
              <p className="text-sm text-gray-500 mb-4">FY{variance.budget?.fiscal_year} Year-to-Date Variance</p>
              <table className="erp-grid">
                <thead>
                  <tr><th>Account</th><th>Type</th><th className="text-right">Budget (Annual)</th><th className="text-right">YTD Actual</th><th className="text-right">Variance ($)</th><th className="text-right">% Used</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {(variance.lines || []).length === 0 ? (
                    <tr><td colSpan="7" className="text-center p-4 text-gray-500">No budget lines to compare</td></tr>
                  ) : (variance.lines || [])?.map(line => {
                    const pct = parseFloat(line.variance_pct || 0);
                    const overBudget = pct > 100;
                    return (
                      <tr key={line.id}>
                        <td className="font-medium">{line.account_number} - {line.account_name}</td>
                        <td><span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">{line.account_type}</span></td>
                        <td className="text-right font-mono">${parseFloat(line.annual_total || 0).toLocaleString()}</td>
                        <td className="text-right font-mono">${parseFloat(line.ytd_actual || 0).toLocaleString()}</td>
                        <td className={`text-right font-mono ${parseFloat(line.variance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${parseFloat(line.variance || 0).toLocaleString()}
                        </td>
                        <td className="text-right font-mono">{pct}%</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-xs ${overBudget ? 'bg-red-100 text-red-700' : pct > 80 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            {overBudget ? 'OVER' : pct > 80 ? 'WARNING' : 'OK'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Budget Modal */}
        {showCreate && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[450px]">
              <h3 className="text-lg font-bold mb-4">Create New Budget</h3>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Budget Name</label>
                  <input className="erp-form-input w-full" value={newBudget.name} onChange={e => setNewBudget({...newBudget, name: e.target.value})} placeholder="e.g. FY2026 Operating Budget" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Fiscal Year</label>
                    <input type="number" className="erp-form-input w-full" value={newBudget.fiscal_year} onChange={e => setNewBudget({...newBudget, fiscal_year: e.target.value})} /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select className="erp-form-select w-full" value={newBudget.budget_type} onChange={e => setNewBudget({...newBudget, budget_type: e.target.value})}>
                      <option value="annual">Annual</option><option value="quarterly">Quarterly</option><option value="monthly">Monthly</option>
                    </select></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
                  <textarea className="erp-form-input w-full" rows="2" value={newBudget.notes} onChange={e => setNewBudget({...newBudget, notes: e.target.value})} /></div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
                <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create Budget</button>
              </div>
            </div>
          </div>
        )}

        {/* Add Budget Line Modal */}
        {showAddLine && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[700px] max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-bold mb-4">Add/Update Budget Line</h3>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">GL Account</label>
                <select className="erp-form-select w-full" value={newLine.gl_account_id} onChange={e => setNewLine({...newLine, gl_account_id: e.target.value})}>
                  <option value="">Select Account...</option>
                  {glAccounts?.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.account_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-6 gap-2 mb-4">
                {months?.map((m, i) => (
                  <div key={m}>
                    <label className="block text-xs text-gray-500">{m}</label>
                    <input type="number" step="0.01" className="erp-form-input w-full text-right text-xs font-mono"
                      value={newLine[`period_${i+1}`]} onChange={e => setNewLine({...newLine, [`period_${i+1}`]: parseFloat(e.target.value) || 0})} />
                  </div>
                ))}
              </div>
              <p className="text-sm font-medium text-right mb-4">Annual Total: <span className="font-mono text-blue-600">${lineTotal.toLocaleString()}</span></p>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowAddLine(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
                <button onClick={handleAddLine} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Line</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
