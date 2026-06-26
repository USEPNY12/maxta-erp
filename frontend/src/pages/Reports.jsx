import React, { useState } from 'react';
import api from '../services/api';

const REPORTS = {
  'Financial Statements': [
    { id: 'fin-income', name: 'Income Statement', endpoint: '/api/reports/financial/income-statement', type: 'income-statement', hasDateRange: true },
    { id: 'fin-balance', name: 'Balance Sheet', endpoint: '/api/reports/financial/balance-sheet', type: 'balance-sheet' },
    { id: 'fin-trial', name: 'Trial Balance', endpoint: '/api/accounting/trial-balance', type: 'trial-balance' },
    { id: 'fin-gl', name: 'General Ledger', endpoint: '/api/reports/general-ledger', type: 'table', hasDateRange: true },
  ],
  'Accounts Receivable': [
    { id: 'ar-open', name: 'Open AR Invoices', endpoint: '/api/reports/accounts-receivable/open', type: 'table' },
    { id: 'ar-aged', name: 'AR Aging', endpoint: '/api/reports/accounts-receivable/aged', type: 'table' },
  ],
  'Accounts Payable': [
    { id: 'ap-open', name: 'Open AP Invoices', endpoint: '/api/reports/accounts-payable/open', type: 'table' },
    { id: 'ap-aged', name: 'AP Aging', endpoint: '/api/reports/accounts-payable/aged', type: 'table' },
  ],
  'Inventory': [
    { id: 'inv-value', name: 'Inventory Value', endpoint: '/api/reports/inventory/value', type: 'table' },
    { id: 'inv-stock', name: 'Stock Status', endpoint: '/api/reports/inventory/stock-status', type: 'table' },
    { id: 'inv-reorder', name: 'Reorder Report', endpoint: '/api/reports/inventory/reorder', type: 'table' },
    { id: 'inv-movement', name: 'Inventory Movement', endpoint: '/api/reports/inventory/movement', type: 'table', hasDateRange: true },
  ],
  'Manufacturing': [
    { id: 'mfg-wo', name: 'Work Order Status', endpoint: '/api/reports/manufacturing/wo-status', type: 'table' },
    { id: 'mfg-eff', name: 'Production Efficiency', endpoint: '/api/reports/manufacturing/efficiency', type: 'table' },
    { id: 'mfg-cost', name: 'WO Cost Summary', endpoint: '/api/reports/manufacturing/wo-cost', type: 'table' },
  ],
  'Sales': [
    { id: 'sales-cust', name: 'Sales by Customer', endpoint: '/api/reports/sales/by-customer', type: 'table' },
    { id: 'sales-prod', name: 'Sales by Product', endpoint: '/api/reports/sales/by-product', type: 'table' },
  ],
  'Purchasing': [
    { id: 'po-status', name: 'PO Status', endpoint: '/api/reports/purchasing/po-status', type: 'table' },
  ],
};

function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; });
  const [toDate, setToDate] = useState(new Date().toISOString().split('T')[0]);

  const runReport = async (report) => {
    setActiveReport(report);
    setLoading(true);
    try {
      const params = {};
      if (report.hasDateRange) { params.from_date = fromDate; params.to_date = toDate; }
      const res = await api.get(report.endpoint, { params });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  const fmtCurrency = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const fmtVal = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    const n = Number(v);
    if (isNaN(n) || (typeof v === 'string' && !v.match(/^-?\d+\.?\d*$/))) return String(v);
    if (Math.abs(n) >= 100 || String(v).match(/\.\d{2,4}$/)) return fmtCurrency(n);
    return String(v);
  };

  const renderIncomeStatement = () => {
    if (!data) return null;
    const { revenue = [], cogs = [], expenses = [], total_revenue = 0, total_cogs = 0, gross_profit = 0, total_expenses = 0, net_income = 0 } = data;
    return (
      <div className="p-4">
        <h2 className="text-center text-lg font-bold mb-1">Max TA Group LLC</h2>
        <h3 className="text-center text-sm text-gray-600 mb-4">Income Statement {fromDate} to {toDate}</h3>
        <div className="max-w-lg mx-auto">
          <div className="font-bold text-sm border-b pb-1 mb-2">Revenue</div>
          {revenue.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total Revenue</span><span className="font-mono">{fmtCurrency(total_revenue)}</span></div>
          <div className="font-bold text-sm border-b pb-1 mb-2 mt-4">Cost of Goods Sold</div>
          {cogs.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total COGS</span><span className="font-mono">{fmtCurrency(total_cogs)}</span></div>
          <div className="flex justify-between font-bold text-sm bg-blue-50 p-2 rounded mt-2"><span>Gross Profit</span><span className="font-mono">{fmtCurrency(gross_profit)}</span></div>
          <div className="font-bold text-sm border-b pb-1 mb-2 mt-4">Operating Expenses</div>
          {expenses.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total Expenses</span><span className="font-mono">{fmtCurrency(total_expenses)}</span></div>
          <div className={`flex justify-between font-bold text-base p-2 rounded mt-3 ${net_income >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}><span>Net Income</span><span className="font-mono">{fmtCurrency(net_income)}</span></div>
        </div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!data) return null;
    const { assets = [], liabilities = [], equity = [], total_assets = 0, total_liabilities = 0, total_equity = 0 } = data;
    return (
      <div className="p-4">
        <h2 className="text-center text-lg font-bold mb-1">Max TA Group LLC</h2>
        <h3 className="text-center text-sm text-gray-600 mb-4">Balance Sheet as of {toDate}</h3>
        <div className="max-w-lg mx-auto">
          <div className="font-bold text-sm border-b pb-1 mb-2">Assets</div>
          {assets.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1 bg-blue-50 p-1 rounded"><span>Total Assets</span><span className="font-mono">{fmtCurrency(total_assets)}</span></div>
          <div className="font-bold text-sm border-b pb-1 mb-2 mt-4">Liabilities</div>
          {liabilities.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total Liabilities</span><span className="font-mono">{fmtCurrency(total_liabilities)}</span></div>
          <div className="font-bold text-sm border-b pb-1 mb-2 mt-4">Equity</div>
          {equity.map(r => <div key={r.account_number} className="flex justify-between text-sm pl-4"><span>{r.account_number} - {r.account_name}</span><span className="font-mono">{fmtCurrency(r.balance)}</span></div>)}
          <div className="flex justify-between font-bold text-sm border-t mt-1 pt-1"><span>Total Equity</span><span className="font-mono">{fmtCurrency(total_equity)}</span></div>
          <div className="flex justify-between font-bold text-sm bg-green-50 p-2 rounded mt-3"><span>Total Liabilities + Equity</span><span className="font-mono">{fmtCurrency(total_liabilities + total_equity)}</span></div>
        </div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!data) return null;
    const { accounts = [], total_debits = 0, total_credits = 0, is_balanced } = data;
    return (
      <div className="p-4">
        <h2 className="text-center text-lg font-bold mb-1">Max TA Group LLC</h2>
        <h3 className="text-center text-sm text-gray-600 mb-4">Trial Balance</h3>
        <table className="w-full text-sm max-w-2xl mx-auto">
          <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">Account #</th><th className="text-left p-2">Account Name</th><th className="text-left p-2">Type</th><th className="text-right p-2">Debits</th><th className="text-right p-2">Credits</th><th className="text-right p-2">Balance</th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.id} className="border-b"><td className="p-2">{a.account_number}</td><td className="p-2">{a.account_name}</td><td className="p-2 capitalize">{a.account_type}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.total_debits)}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.total_credits)}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.balance)}</td></tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-gray-100 font-bold"><td colSpan="3" className="p-2">TOTALS</td><td className="p-2 text-right font-mono">{fmtCurrency(total_debits)}</td><td className="p-2 text-right font-mono">{fmtCurrency(total_credits)}</td><td className="p-2 text-right">{is_balanced ? <span className="text-green-600">BALANCED</span> : <span className="text-red-600">OUT OF BALANCE</span>}</td></tr>
          </tfoot>
        </table>
      </div>
    );
  };

  const renderTable = () => {
    const rows = Array.isArray(data) ? data : [];
    if (rows.length === 0) return <p className="text-center py-8 text-gray-400">No data for this report</p>;
    const cols = Object.keys(rows[0]).filter(k => !['id','created_at','updated_at','entered_by'].includes(k));
    return (
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-100 border-b">{cols.map(c => <th key={c} className="text-left p-2 text-xs font-medium whitespace-nowrap">{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-b hover:bg-blue-50">{cols.map(c => <td key={c} className="p-2 text-xs whitespace-nowrap">{fmtVal(r[c])}</td>)}</tr>))}</tbody>
        </table>
        <div className="p-2 text-xs text-gray-500 border-t">{rows.length} record(s)</div>
      </div>
    );
  };

  const renderReport = () => {
    if (loading) return <p className="text-center py-8 text-gray-400">Loading...</p>;
    if (!data) return <p className="text-center py-8 text-gray-400">No data</p>;
    switch (activeReport?.type) {
      case 'income-statement': return renderIncomeStatement();
      case 'balance-sheet': return renderBalanceSheet();
      case 'trial-balance': return renderTrialBalance();
      default: return renderTable();
    }
  };

  return (
    <div className="h-full flex bg-[#c8c8d4]">
      <div className="w-56 bg-white border-r border-gray-300 overflow-auto">
        <div className="p-3 bg-gray-800 text-white text-sm font-bold">Reports</div>
        {Object.entries(REPORTS).map(([cat, reports]) => (
          <div key={cat} className="border-b border-gray-200">
            <div className="px-3 py-2 bg-gray-50 text-xs font-bold text-gray-700 uppercase">{cat}</div>
            {reports.map(r => (
              <div key={r.id} onClick={() => runReport(r)} className={`px-4 py-1.5 text-sm cursor-pointer hover:bg-blue-50 ${activeReport?.id === r.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-700'}`}>{r.name}</div>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-4">
        {!activeReport && (
          <div className="text-center py-12 text-gray-500">
            <h2 className="text-xl font-bold mb-2">Reports Center</h2>
            <p>Select a report from the left panel to generate it.</p>
            <div className="mt-6 grid grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
              {Object.entries(REPORTS).map(([cat, reports]) => (
                <div key={cat} className="bg-white rounded shadow p-3">
                  <h4 className="font-bold text-sm mb-2">{cat}</h4>
                  {reports.map(r => <div key={r.id} className="text-xs text-gray-600 py-0.5">{r.name}</div>)}
                </div>
              ))}
            </div>
          </div>
        )}
        {activeReport && (
          <div className="bg-white rounded shadow">
            <div className="p-3 border-b flex justify-between items-center flex-wrap gap-2">
              <h3 className="font-bold">{activeReport.name}</h3>
              <div className="flex gap-2 items-center">
                {activeReport.hasDateRange && (
                  <>
                    <label className="text-xs text-gray-500">From:</label>
                    <input type="date" className="erp-form-input text-xs w-32" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                    <label className="text-xs text-gray-500">To:</label>
                    <input type="date" className="erp-form-input text-xs w-32" value={toDate} onChange={e => setToDate(e.target.value)} />
                  </>
                )}
                <button onClick={() => runReport(activeReport)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Refresh</button>
                <button onClick={() => window.print()} className="px-3 py-1 bg-gray-600 text-white rounded text-xs">Print</button>
              </div>
            </div>
            {renderReport()}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
