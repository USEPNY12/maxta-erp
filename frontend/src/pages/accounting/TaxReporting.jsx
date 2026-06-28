import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

export default function TaxReporting() {
  const [jurisdictions, setJurisdictions] = useState([]);
  const [liability, setLiability] = useState(null);
  const [returns, setReturns] = useState([]);
  const [tab, setTab] = useState('liability');
  const [showAddJurisdiction, setShowAddJurisdiction] = useState(false);
  const [showCreateReturn, setShowCreateReturn] = useState(false);
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });
  const [newJurisdiction, setNewJurisdiction] = useState({ name: '', jurisdiction_code: '', jurisdiction_type: 'state', tax_rate: '', effective_date: new Date().toISOString().split('T')[0] });
  const [newReturn, setNewReturn] = useState({ jurisdiction_id: '', period_start: '', period_end: '', filing_frequency: 'monthly' });

  useEffect(() => { fetchJurisdictions(); fetchLiability(); fetchReturns(); }, []);

  const fetchJurisdictions = async () => {
    try { const res = await api.get('/api/accounting-advanced/tax/jurisdictions'); setJurisdictions(Array.isArray(res.data) ? res.data : []); } catch { setJurisdictions([]); }
  };

  const fetchLiability = async () => {
    try {
      const res = await api.get(`/api/accounting-advanced/tax/liability?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`);
      setLiability(res.data);
    } catch(e) { toast.error('Failed to load tax liability'); }
  };

  const fetchReturns = async () => {
    try { const res = await api.get('/api/accounting-advanced/tax/returns'); setReturns(Array.isArray(res.data) ? res.data : []); } catch { setReturns([]); }
  };

  const handleAddJurisdiction = async () => {
    if (!newJurisdiction.name || !newJurisdiction.jurisdiction_code || !newJurisdiction.tax_rate) {
      toast.error('Name, code, and rate required'); return;
    }
    try {
      await api.post('/api/accounting-advanced/tax/jurisdictions', newJurisdiction);
      toast.success('Jurisdiction added');
      setShowAddJurisdiction(false);
      setNewJurisdiction({ name: '', jurisdiction_code: '', jurisdiction_type: 'state', tax_rate: '', effective_date: new Date().toISOString().split('T')[0] });
      fetchJurisdictions();
    } catch(e) { toast.error('Failed to add jurisdiction'); }
  };

  const handleCreateReturn = async () => {
    if (!newReturn.jurisdiction_id || !newReturn.period_start || !newReturn.period_end) {
      toast.error('Jurisdiction and period required'); return;
    }
    try {
      const res = await api.post('/api/accounting-advanced/tax/returns', newReturn);
      toast.success(`Tax return created. Net tax due: $${res.data.net_tax_due}`);
      setShowCreateReturn(false);
      setNewReturn({ jurisdiction_id: '', period_start: '', period_end: '', filing_frequency: 'monthly' });
      fetchReturns();
    } catch(e) { toast.error('Failed to create return'); }
  };

  const handleFileReturn = async (id) => {
    const confirmation = prompt('Enter confirmation number:');
    if (!confirmation) return;
    try {
      await api.post(`/api/accounting-advanced/tax/returns/${id}/file`, { confirmation_number: confirmation });
      toast.success('Tax return marked as filed');
      fetchReturns();
    } catch(e) { toast.error('Failed to file return'); }
  };

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
        <div className="erp-toolbar flex-wrap gap-2">
          <button className={`erp-btn text-xs ${tab === 'liability' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('liability')}>Tax Liability</button>
          <button className={`erp-btn text-xs ${tab === 'jurisdictions' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('jurisdictions')}>Jurisdictions</button>
          <button className={`erp-btn text-xs ${tab === 'returns' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('returns')}>Tax Returns</button>
          <div className="ml-auto flex gap-2">
            <button className="erp-btn text-xs bg-green-600 text-white hover:bg-green-700" onClick={() => setShowAddJurisdiction(true)}>+ Jurisdiction</button>
            <button className="erp-btn text-xs bg-purple-600 text-white hover:bg-purple-700" onClick={() => setShowCreateReturn(true)}>+ Tax Return</button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          {/* Tax Liability Summary */}
          {tab === 'liability' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                  <input type="date" className="erp-form-input" value={dateRange.start_date} onChange={e => setDateRange({...dateRange, start_date: e.target.value})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                  <input type="date" className="erp-form-input" value={dateRange.end_date} onChange={e => setDateRange({...dateRange, end_date: e.target.value})} /></div>
                <button className="erp-btn erp-btn-primary text-xs" onClick={fetchLiability}>Calculate</button>
              </div>

              {liability && (
                <>
                  <div className="bg-white border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold">Tax Liability by Jurisdiction</h3>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">Total Net Liability</p>
                        <p className={`text-xl font-bold font-mono ${liability.total_net_liability >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${liability.total_net_liability.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <table className="erp-grid text-xs">
                      <thead>
                        <tr><th>Jurisdiction</th><th>Code</th><th>Type</th><th className="text-right">Rate</th><th className="text-right">Taxable Sales</th><th className="text-right">Tax Collected</th><th className="text-right">Tax Paid</th><th className="text-right">Net Liability</th><th className="text-center">Txns</th></tr>
                      </thead>
                      <tbody>
                        {(liability.jurisdictions || [])?.map(j => (
                          <tr key={j.id}>
                            <td className="font-medium">{j.name}</td>
                            <td>{j.jurisdiction_code}</td>
                            <td><span className={`px-1.5 py-0.5 rounded text-xs ${
                              j.jurisdiction_type === 'state' ? 'bg-blue-100 text-blue-700' :
                              j.jurisdiction_type === 'county' ? 'bg-purple-100 text-purple-700' :
                              j.jurisdiction_type === 'city' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>{j.jurisdiction_type}</span></td>
                            <td className="text-right font-mono">{(parseFloat(j.tax_rate) * 100).toFixed(2)}%</td>
                            <td className="text-right font-mono">${j.taxable_sales.toLocaleString()}</td>
                            <td className="text-right font-mono text-green-600">${j.total_collected.toLocaleString()}</td>
                            <td className="text-right font-mono text-red-600">${j.total_paid.toLocaleString()}</td>
                            <td className={`text-right font-mono font-bold ${j.net_liability >= 0 ? 'text-red-600' : 'text-green-600'}`}>${j.net_liability.toLocaleString()}</td>
                            <td className="text-center">{j.transaction_count}</td>
                          </tr>
                        ))}
                        {(liability.jurisdictions || []).length === 0 && (
                          <tr><td colSpan="9" className="text-center p-4 text-gray-500">No tax transactions in this period</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Jurisdictions Tab */}
          {tab === 'jurisdictions' && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="erp-grid">
                <thead>
                  <tr><th>Name</th><th>Code</th><th>Type</th><th className="text-right">Rate</th><th>Effective Date</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {jurisdictions.length === 0 ? (
                    <tr><td colSpan="6" className="text-center p-4 text-gray-500">No jurisdictions configured</td></tr>
                  ) : jurisdictions?.map(j => (
                    <tr key={j.id}>
                      <td className="font-medium">{j.name}</td>
                      <td className="font-mono">{j.jurisdiction_code}</td>
                      <td><span className={`px-2 py-0.5 rounded text-xs ${
                        j.jurisdiction_type === 'state' ? 'bg-blue-100 text-blue-700' :
                        j.jurisdiction_type === 'county' ? 'bg-purple-100 text-purple-700' :
                        j.jurisdiction_type === 'city' ? 'bg-orange-100 text-orange-700' :
                        j.jurisdiction_type === 'district' ? 'bg-teal-100 text-teal-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>{j.jurisdiction_type}</span></td>
                      <td className="text-right font-mono">{(parseFloat(j.tax_rate) * 100).toFixed(4)}%</td>
                      <td>{j.effective_date?.split('T')[0] || '-'}</td>
                      <td><span className={`px-2 py-0.5 rounded text-xs ${j.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{j.is_active ? 'Active' : 'Inactive'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tax Returns Tab */}
          {tab === 'returns' && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="erp-grid">
                <thead>
                  <tr><th>Jurisdiction</th><th>Period</th><th>Frequency</th><th className="text-right">Taxable Sales</th><th className="text-right">Tax Collected</th><th className="text-right">Net Due</th><th>Status</th><th>Filed</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {returns.length === 0 ? (
                    <tr><td colSpan="9" className="text-center p-4 text-gray-500">No tax returns created</td></tr>
                  ) : returns?.map(r => (
                    <tr key={r.id}>
                      <td className="font-medium">{r.jurisdiction_name}</td>
                      <td className="text-xs">{r.period_start?.split('T')[0]} to {r.period_end?.split('T')[0]}</td>
                      <td><span className="px-1.5 py-0.5 rounded text-xs bg-gray-100">{r.filing_frequency}</span></td>
                      <td className="text-right font-mono">${parseFloat(r.total_taxable_sales || 0).toLocaleString()}</td>
                      <td className="text-right font-mono">${parseFloat(r.total_tax_collected || 0).toLocaleString()}</td>
                      <td className="text-right font-mono font-bold text-red-600">${parseFloat(r.net_tax_due || 0).toLocaleString()}</td>
                      <td>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          r.status === 'paid' ? 'bg-green-100 text-green-700' :
                          r.status === 'filed' ? 'bg-blue-100 text-blue-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>{(r.status || 'open').toUpperCase()}</span>
                      </td>
                      <td className="text-xs">{r.filed_date?.split('T')[0] || '-'}</td>
                      <td>
                        {r.status === 'open' && (
                          <button className="text-blue-600 hover:underline text-xs" onClick={() => handleFileReturn(r.id)}>File</button>
                        )}
                        {r.confirmation_number && <span className="text-xs text-gray-500 ml-2">#{r.confirmation_number}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Jurisdiction Modal */}
        {showAddJurisdiction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[450px]">
              <h3 className="text-lg font-bold mb-4">Add Tax Jurisdiction</h3>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
                  <input className="erp-form-input w-full" value={newJurisdiction.name} onChange={e => setNewJurisdiction({...newJurisdiction, name: e.target.value})} placeholder="e.g. Texas State Sales Tax" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                    <input className="erp-form-input w-full" value={newJurisdiction.jurisdiction_code} onChange={e => setNewJurisdiction({...newJurisdiction, jurisdiction_code: e.target.value})} placeholder="e.g. TX" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                    <select className="erp-form-select w-full" value={newJurisdiction.jurisdiction_type} onChange={e => setNewJurisdiction({...newJurisdiction, jurisdiction_type: e.target.value})}>
                      <option value="federal">Federal</option><option value="state">State</option><option value="county">County</option><option value="city">City</option><option value="district">District</option>
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Tax Rate (decimal, e.g. 6.25 for 6.25%)</label>
                    <input type="number" step="0.0001" className="erp-form-input w-full" value={newJurisdiction.tax_rate} onChange={e => setNewJurisdiction({...newJurisdiction, tax_rate: e.target.value})} placeholder="6.2500" /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Effective Date</label>
                    <input type="date" className="erp-form-input w-full" value={newJurisdiction.effective_date} onChange={e => setNewJurisdiction({...newJurisdiction, effective_date: e.target.value})} /></div>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowAddJurisdiction(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
                <button onClick={handleAddJurisdiction} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Add Jurisdiction</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Tax Return Modal */}
        {showCreateReturn && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-[450px]">
              <h3 className="text-lg font-bold mb-4">Create Tax Return</h3>
              <div className="space-y-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Jurisdiction</label>
                  <select className="erp-form-select w-full" value={newReturn.jurisdiction_id} onChange={e => setNewReturn({...newReturn, jurisdiction_id: e.target.value})}>
                    <option value="">Select Jurisdiction...</option>
                    {jurisdictions?.map(j => <option key={j.id} value={j.id}>{j.name} ({j.jurisdiction_code})</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Period Start</label>
                    <input type="date" className="erp-form-input w-full" value={newReturn.period_start} onChange={e => setNewReturn({...newReturn, period_start: e.target.value})} /></div>
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">Period End</label>
                    <input type="date" className="erp-form-input w-full" value={newReturn.period_end} onChange={e => setNewReturn({...newReturn, period_end: e.target.value})} /></div>
                </div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">Filing Frequency</label>
                  <select className="erp-form-select w-full" value={newReturn.filing_frequency} onChange={e => setNewReturn({...newReturn, filing_frequency: e.target.value})}>
                    <option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annually">Annually</option>
                  </select></div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setShowCreateReturn(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
                <button onClick={handleCreateReturn} className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Create Return</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
