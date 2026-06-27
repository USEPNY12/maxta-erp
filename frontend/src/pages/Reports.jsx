import { useState } from 'react';
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
    setData(null);
    try {
      const params = {};
      if (report.hasDateRange) { params.from_date = fromDate; params.to_date = toDate; }
      const res = await api.get(report.endpoint, { params });
      setData(res.data);
    } catch { setData(null); }
    setLoading(false);
  };

  const fmtCurrency = (v) => '$' + Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Smart column type detection
  const CURRENCY_KEYWORDS = ['cost', 'price', 'amount', 'total', 'revenue', 'value', 'subtotal', 'freight', 'tax', 'balance', 'debit', 'credit', 'avg_price', 'current_amt', 'days_30', 'days_60', 'days_90'];
  const QTY_KEYWORDS = ['qty', 'quantity', 'count', 'on_hand', 'ordered', 'shipped', 'completed', 'scrapped', 'lead_time', 'actual_days'];
  const DATE_KEYWORDS = ['date', '_at'];

  const isCurrencyCol = (col) => CURRENCY_KEYWORDS.some(k => col.toLowerCase().includes(k));
  const isQtyCol = (col) => QTY_KEYWORDS.some(k => col.toLowerCase().includes(k));
  const isDateCol = (col) => DATE_KEYWORDS.some(k => col.toLowerCase().endsWith(k) || col.toLowerCase().includes('date'));

  const fmtVal = (v, col) => {
    if (v === null || v === undefined || v === '') return '-';
    if (typeof v === 'boolean' || v === 0 || v === 1) {
      if (col && (col.includes('printed') || col.includes('has_'))) return v ? 'Yes' : 'No';
    }
    // Date formatting
    if (col && isDateCol(col) && typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}/)) {
      return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const n = Number(v);
    if (isNaN(n) || (typeof v === 'string' && !v.match(/^-?\d+\.?\d*$/))) return String(v);
    if (col && isCurrencyCol(col)) return fmtCurrency(n);
    if (col && isQtyCol(col)) return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
    return n.toLocaleString('en-US', { maximumFractionDigits: 4 });
  };

  // Hide internal/technical columns for cleaner reports
  const HIDDEN_COLS = ['id', 'created_at', 'updated_at', 'entered_by', 'created_by', 'approved_by', 'closed_by', 'sent_by',
    'vendor_id', 'customer_id', 'item_id', 'location_id', 'from_location_id', 'to_location_id',
    'sales_order_id', 'sales_order_line_id', 'sales_order_line', 'work_order_id', 'purchase_order_id',
    'ship_to_location_id', 'routing_template_id', 'current_station_id', 'item_type_id',
    'wo_printed', 'po_printed', 'approved_date', 'approved_at', 'closed_at', 'sent_at',
    'scheduling_type', 'has_holes', 'has_notches', 'hole_specs', 'interlayer_type',
    'wo_type', 'release_date', 'order_date', 'requested_date', 'project_number',
    'purchase_order', 'service_job', 'fob', 'ship_via', 'vendor_contact', 'payment_terms', 'freight_terms',
    'internal_notes', 'reference_id', 'wo_number'];

  const renderIncomeStatement = () => {
    if (!data) return null;
    const { revenue = [], cogs = [], expenses = [], total_revenue = 0, total_cogs = 0, gross_profit = 0, total_expenses = 0, net_income = 0 } = data;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center">Max TA Group LLC</h2>
        <h3 className="text-center text-gray-600 mb-4">Income Statement {fromDate} to {toDate}</h3>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Revenue</h4>
          {revenue.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total Revenue</span><span className="font-mono">{fmtCurrency(total_revenue)}</span></div>
        </div>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Cost of Goods Sold</h4>
          {cogs.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total COGS</span><span className="font-mono">{fmtCurrency(total_cogs)}</span></div>
        </div>
        <div className="flex justify-between font-bold bg-blue-50 p-2 rounded mb-4"><span>Gross Profit</span><span className="font-mono">{fmtCurrency(gross_profit)}</span></div>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Operating Expenses</h4>
          {expenses.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total Expenses</span><span className="font-mono">{fmtCurrency(total_expenses)}</span></div>
        </div>
        <div className={`flex justify-between font-bold text-lg p-2 rounded ${Number(net_income) >= 0 ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}><span>Net Income</span><span className="font-mono">{fmtCurrency(net_income)}</span></div>
      </div>
    );
  };

  const renderBalanceSheet = () => {
    if (!data) return null;
    const { assets = [], liabilities = [], equity = [], total_assets = 0, total_liabilities = 0, total_equity = 0 } = data;
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-center">Max TA Group LLC</h2>
        <h3 className="text-center text-gray-600 mb-4">Balance Sheet as of {toDate}</h3>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Assets</h4>
          {assets.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1 bg-blue-50 p-1 rounded"><span>Total Assets</span><span className="font-mono">{fmtCurrency(total_assets)}</span></div>
        </div>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Liabilities</h4>
          {liabilities.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total Liabilities</span><span className="font-mono">{fmtCurrency(total_liabilities)}</span></div>
        </div>
        <div className="mb-4">
          <h4 className="font-bold border-b pb-1">Equity</h4>
          {equity.map(a => <div key={a.account_number} className="flex justify-between py-1 pl-4"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmtCurrency(a.balance)}</span></div>)}
          <div className="flex justify-between font-bold border-t mt-1 pt-1"><span>Total Equity</span><span className="font-mono">{fmtCurrency(total_equity)}</span></div>
        </div>
        <div className="flex justify-between font-bold bg-gray-100 p-2 rounded"><span>Total Liabilities + Equity</span><span className="font-mono">{fmtCurrency(Number(total_liabilities) + Number(total_equity))}</span></div>
      </div>
    );
  };

  const renderTrialBalance = () => {
    if (!data) return null;
    const { accounts = [], total_debits = 0, total_credits = 0, is_balanced } = data;
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <h2 className="text-xl font-bold text-center">Max TA Group LLC</h2>
        <h3 className="text-center text-gray-600 mb-4">Trial Balance</h3>
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-100 border-b"><th className="p-2 text-left">Account #</th><th className="p-2 text-left">Account Name</th><th className="p-2 text-left">Type</th><th className="p-2 text-right">Debits</th><th className="p-2 text-right">Credits</th><th className="p-2 text-right">Balance</th></tr></thead>
          <tbody>
            {accounts.map(a => (
              <tr key={a.account_number} className="border-b hover:bg-blue-50"><td className="p-2">{a.account_number}</td><td className="p-2">{a.account_name}</td><td className="p-2 capitalize">{a.account_type}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.total_debits)}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.total_credits)}</td><td className="p-2 text-right font-mono">{fmtCurrency(a.balance)}</td></tr>
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
    const cols = Object.keys(rows[0]).filter(k => !HIDDEN_COLS.includes(k));
    return (
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-100 border-b sticky top-0">{cols.map(c => <th key={c} className={`p-2 text-xs font-medium whitespace-nowrap ${isCurrencyCol(c) || isQtyCol(c) ? 'text-right' : 'text-left'}`}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>)}</tr></thead>
          <tbody>{rows.map((r, i) => (<tr key={i} className="border-b hover:bg-blue-50">{cols.map(c => <td key={c} className={`p-2 text-xs whitespace-nowrap ${isCurrencyCol(c) || isQtyCol(c) ? 'text-right font-mono' : ''}`}>{fmtVal(r[c], c)}</td>)}</tr>))}</tbody>
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
                  {reports.map(r => <div key={r.id} className="text-xs text-gray-600 py-0.5 cursor-pointer hover:text-blue-600" onClick={() => runReport(r)}>{r.name}</div>)}
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
                <button onClick={() => runReport(activeReport)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Refresh</button>
                <button onClick={() => window.print()} className="px-3 py-1 bg-gray-600 text-white rounded text-xs hover:bg-gray-700">Print</button>
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
