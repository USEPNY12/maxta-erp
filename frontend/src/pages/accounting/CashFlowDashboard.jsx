import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

export default function CashFlowDashboard() {
  const [projection, setProjection] = useState(null);
  const [statement, setStatement] = useState(null);
  const [categories, setCategories] = useState([]);
  const [days, setDays] = useState(90);
  const [tab, setTab] = useState('projection');
  const [dateRange, setDateRange] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => { fetchProjection(); fetchCategories(); }, [days]);

  const fetchProjection = async () => {
    try {
      const res = await api.get(`/api/accounting-advanced/cash-flow/projection?days=${days}`);
      setProjection(res.data);
    } catch(e) { toast.error('Failed to load projection'); }
  };

  const fetchStatement = async () => {
    try {
      const res = await api.get(`/api/accounting-advanced/cash-flow/statement?start_date=${dateRange.start_date}&end_date=${dateRange.end_date}`);
      setStatement(res.data);
    } catch(e) { toast.error('Failed to load cash flow statement'); }
  };

  const fetchCategories = async () => {
    try { const res = await api.get('/api/accounting-advanced/cash-flow/categories'); setCategories(Array.isArray(res.data) ? res.data : []); } catch { setCategories([]); }
  };

  const getBarWidth = (amount, max) => {
    if (!max || max === 0) return 0;
    return Math.min(Math.abs(amount) / max * 100, 100);
  };

  const maxWeeklyAmount = projection ? Math.max(...(projection.weekly_breakdown || []).map(w => Math.max(w.inflows, w.outflows)), 1) : 1;

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
        <div className="erp-toolbar flex-wrap gap-2">
          <button className={`erp-btn text-xs ${tab === 'projection' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('projection')}>Cash Projection</button>
          <button className={`erp-btn text-xs ${tab === 'statement' ? 'erp-btn-primary' : ''}`} onClick={() => { setTab('statement'); fetchStatement(); }}>Cash Flow Statement</button>
          <button className={`erp-btn text-xs ${tab === 'categories' ? 'erp-btn-primary' : ''}`} onClick={() => setTab('categories')}>Categories</button>
          <div className="erp-toolbar-separator" />
          {tab === 'projection' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">Forecast:</span>
              {[30, 60, 90].map(d => (
                <button key={d} className={`text-xs px-2 py-1 rounded ${days === d ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`} onClick={() => setDays(d)}>{d} Days</button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-auto p-3">
          {/* Cash Projection Tab */}
          {tab === 'projection' && projection && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Current Cash</p>
                  <p className="text-xl font-bold text-blue-600 font-mono">${projection.current_cash.toLocaleString()}</p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Expected Collections</p>
                  <p className="text-xl font-bold text-green-600 font-mono">${projection.expected_collections.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{projection.ar_invoice_count} invoices</p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Expected Payments</p>
                  <p className="text-xl font-bold text-red-600 font-mono">${projection.expected_payments.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">{projection.ap_invoice_count} invoices</p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Net Cash Flow</p>
                  <p className={`text-xl font-bold font-mono ${(projection.expected_collections - projection.expected_payments) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${(projection.expected_collections - projection.expected_payments).toLocaleString()}
                  </p>
                </div>
                <div className="bg-white border rounded-lg p-3">
                  <p className="text-xs text-gray-500 font-medium">Projected End Balance</p>
                  <p className={`text-xl font-bold font-mono ${projection.projected_end_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    ${projection.projected_end_balance.toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Weekly Breakdown Chart (horizontal bars) */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-sm font-bold mb-3">Weekly Cash Flow Breakdown ({days}-Day Forecast)</h3>
                <div className="space-y-2">
                  <div className="grid grid-cols-[80px_1fr_1fr_100px] gap-2 text-xs font-medium text-gray-500 border-b pb-1">
                    <span>Week</span><span>Inflows</span><span>Outflows</span><span className="text-right">Balance</span>
                  </div>
                  {(projection.weekly_breakdown || []).map(week => (
                    <div key={week.week} className="grid grid-cols-[80px_1fr_1fr_100px] gap-2 items-center text-xs">
                      <span className="font-medium text-gray-600">Wk {week.week}</span>
                      <div className="flex items-center gap-1">
                        <div className="h-4 bg-green-400 rounded" style={{ width: `${getBarWidth(week.inflows, maxWeeklyAmount)}%`, minWidth: week.inflows > 0 ? '4px' : '0' }}></div>
                        <span className="font-mono text-green-700">${week.inflows.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="h-4 bg-red-400 rounded" style={{ width: `${getBarWidth(week.outflows, maxWeeklyAmount)}%`, minWidth: week.outflows > 0 ? '4px' : '0' }}></div>
                        <span className="font-mono text-red-700">${week.outflows.toLocaleString()}</span>
                      </div>
                      <span className={`font-mono text-right ${week.projected_balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${week.projected_balance.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Weekly Detail Table */}
              <div className="bg-white border rounded-lg overflow-hidden">
                <table className="erp-grid text-xs">
                  <thead>
                    <tr><th>Week</th><th>Start</th><th>End</th><th className="text-right">Inflows</th><th className="text-right">Outflows</th><th className="text-right">Net</th><th className="text-right">Projected Balance</th></tr>
                  </thead>
                  <tbody>
                    {(projection.weekly_breakdown || []).map(week => (
                      <tr key={week.week}>
                        <td className="font-medium">Week {week.week}</td>
                        <td>{week.start_date}</td>
                        <td>{week.end_date}</td>
                        <td className="text-right font-mono text-green-600">${week.inflows.toLocaleString()}</td>
                        <td className="text-right font-mono text-red-600">${week.outflows.toLocaleString()}</td>
                        <td className={`text-right font-mono ${week.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>${week.net.toLocaleString()}</td>
                        <td className={`text-right font-mono font-bold ${week.projected_balance >= 0 ? 'text-blue-700' : 'text-red-700'}`}>${week.projected_balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Cash Flow Statement Tab */}
          {tab === 'statement' && (
            <div className="space-y-4">
              <div className="flex gap-3 items-end">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">From</label>
                  <input type="date" className="erp-form-input" value={dateRange.start_date} onChange={e => setDateRange({...dateRange, start_date: e.target.value})} /></div>
                <div><label className="block text-xs font-medium text-gray-700 mb-1">To</label>
                  <input type="date" className="erp-form-input" value={dateRange.end_date} onChange={e => setDateRange({...dateRange, end_date: e.target.value})} /></div>
                <button className="erp-btn erp-btn-primary text-xs" onClick={fetchStatement}>Generate</button>
              </div>

              {statement && (
                <div className="bg-white border rounded-lg p-4">
                  <h3 className="text-lg font-bold mb-4 text-center">Statement of Cash Flows</h3>
                  <p className="text-sm text-center text-gray-500 mb-6">{statement.period.start_date} to {statement.period.end_date}</p>
                  
                  <div className="space-y-4 max-w-lg mx-auto">
                    <div className="border-b pb-3">
                      <h4 className="font-bold text-sm mb-2">Operating Activities</h4>
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Customer Collections</span><span className="font-mono text-green-600">${statement.operating.customer_collections.toLocaleString()}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-gray-600">Vendor Payments</span><span className="font-mono text-red-600">(${ statement.operating.vendor_payments.toLocaleString()})</span></div>
                      <div className="flex justify-between text-sm font-bold mt-2 pt-1 border-t"><span>Net Operating</span><span className={`font-mono ${statement.operating.net_operating >= 0 ? 'text-green-700' : 'text-red-700'}`}>${statement.operating.net_operating.toLocaleString()}</span></div>
                    </div>
                    <div className="border-b pb-3">
                      <h4 className="font-bold text-sm mb-2">Investing Activities</h4>
                      <div className="flex justify-between text-sm font-bold"><span>Net Investing</span><span className="font-mono">${statement.investing.net_investing.toLocaleString()}</span></div>
                    </div>
                    <div className="border-b pb-3">
                      <h4 className="font-bold text-sm mb-2">Financing Activities</h4>
                      <div className="flex justify-between text-sm font-bold"><span>Net Financing</span><span className="font-mono">${statement.financing.net_financing.toLocaleString()}</span></div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between text-base font-bold"><span>Net Change in Cash</span><span className={`font-mono ${statement.net_change >= 0 ? 'text-green-700' : 'text-red-700'}`}>${statement.net_change.toLocaleString()}</span></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Categories Tab */}
          {tab === 'categories' && (
            <div className="bg-white border rounded-lg overflow-hidden">
              <table className="erp-grid">
                <thead>
                  <tr><th>Category</th><th>Type</th><th>Direction</th><th>Sort Order</th></tr>
                </thead>
                <tbody>
                  {categories.length === 0 ? (
                    <tr><td colSpan="4" className="text-center p-4 text-gray-500">No categories defined</td></tr>
                  ) : (categories || []).map(c => (
                    <tr key={c.id}>
                      <td className="font-medium">{c.name}</td>
                      <td><span className={`px-2 py-0.5 rounded text-xs ${
                        c.category_type === 'operating' ? 'bg-blue-100 text-blue-700' :
                        c.category_type === 'investing' ? 'bg-purple-100 text-purple-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>{c.category_type}</span></td>
                      <td><span className={`text-xs ${c.is_inflow ? 'text-green-600' : 'text-red-600'}`}>{c.is_inflow ? 'Inflow' : 'Outflow'}</span></td>
                      <td>{c.sort_order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </ModulePage>
  );
}
