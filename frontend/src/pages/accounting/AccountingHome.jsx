import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

function AccountingHome() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [trialBalance, setTrialBalance] = useState(null);
  const [incomeStmt, setIncomeStmt] = useState(null);
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [periods, setPeriods] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    api.get('/api/accounting/dashboard').then(r => setDashboard(r.data)).catch(() => setDashboard({}));
    api.get('/api/setup/accounting-periods').then(r => setPeriods(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const loadTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'trial-balance') api.get('/api/accounting/trial-balance').then(r => setTrialBalance(r.data)).catch(() => {});
    if (tab === 'income-statement') api.get('/api/accounting/income-statement').then(r => setIncomeStmt(r.data)).catch(() => {});
    if (tab === 'balance-sheet') api.get('/api/accounting/balance-sheet').then(r => setBalanceSheet(r.data)).catch(() => {});
  };

  const fmt = (v) => Number(v || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const handlePeriodClose = async (id) => {
    if (!window.confirm('Close this accounting period?')) return;
    await api.post('/api/accounting/period-close', { period_id: id });
    const r = await api.get('/api/setup/accounting-periods');
    setPeriods(Array.isArray(r.data) ? r.data : []);
  };

  const FinSection = ({ title, items, totalLabel, totalValue }) => (
    <div className="mb-4">
      <h4 className="font-bold text-sm border-b pb-1 mb-2">{title}</h4>
      {(items || [])?.map(a => (<div key={a.account_number} className="flex justify-between text-sm py-1"><span>{a.account_number} - {a.account_name}</span><span className="font-mono">{fmt(a.balance)}</span></div>))}
      <div className="flex justify-between font-bold text-sm border-t pt-1 mt-1"><span>{totalLabel}</span><span className="font-mono">{fmt(totalValue)}</span></div>
    </div>
  );

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full overflow-auto bg-[#c8c8d4] p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
        {[{l:'Open A/R',v:dashboard?.open_ar,c:'blue'},{l:'Open A/P',v:dashboard?.open_ap,c:'red'},{l:'Bank Balance',v:dashboard?.bank_balance,c:'green'},{l:'MTD Revenue',v:dashboard?.mtd_revenue,c:'purple'},{l:'YTD Revenue',v:dashboard?.ytd_revenue,c:'indigo'},{l:'Overdue A/R',v:dashboard?.overdue_ar,c:'orange'}].map(k => (
          <div key={k.l} className={`bg-white rounded shadow p-3 border-l-4 border-${k.c}-500`}><p className="text-xs text-gray-500">{k.l}</p><p className="text-lg font-bold">{fmt(k.v)}</p></div>
        ))}
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        <button onClick={() => navigate('/accounting/gl-accounts')} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm">Chart of Accounts</button>
        <button onClick={() => navigate('/accounting/journal-vouchers')} className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm">Journal Vouchers</button>
        <button onClick={() => navigate('/accounting/customer-payments')} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm">Customer Payments</button>
        <button onClick={() => navigate('/accounting/vendor-payments')} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm">Vendor Payments</button>
        <button onClick={() => navigate('/accounting/bank-recon')} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm">Bank Reconciliation</button>
      </div>
      <div className="flex border-b border-gray-400 mb-3">
        {['overview','trial-balance','income-statement','balance-sheet','periods'].map(t => (
          <button key={t} onClick={() => loadTab(t)} className={`px-4 py-2 text-sm font-medium capitalize ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600'}`}>{t.replace(/-/g,' ')}</button>
        ))}
      </div>

      {activeTab === 'overview' && dashboard && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-3">A/R Aging Summary</h3>
            <table className="w-full text-sm"><tbody>
              {[['Current',dashboard.ar_aging?.current],['1-30 Days',dashboard.ar_aging?.days_30],['31-60 Days',dashboard.ar_aging?.days_60],['60+ Days',dashboard.ar_aging?.days_90_plus]].map(([l,v]) => (
                <tr key={l} className="border-b"><td className="p-2">{l}</td><td className="p-2 text-right font-mono">{fmt(v)}</td></tr>
              ))}
            </tbody></table>
          </div>
          <div className="bg-white rounded shadow p-4">
            <h3 className="font-bold mb-3">Monthly Process</h3>
            <div className="space-y-2 text-sm">
              {['Post A/R & A/P Invoices','Record Customer Payments','Issue Vendor Payments','Bank Reconciliation','Post Journal Vouchers','Review Trial Balance','Financial Statements','Close Period'].map((s,i) => (
                <div key={i} className="flex items-center gap-2"><span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-bold">{i+1}</span><span>{s}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'trial-balance' && trialBalance && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex justify-between mb-3"><h3 className="font-bold">Trial Balance</h3><span className={`px-3 py-1 rounded text-sm ${trialBalance.is_balanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{trialBalance.is_balanced ? 'BALANCED' : 'OUT OF BALANCE'}</span></div>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">Acct#</th><th className="text-left p-2">Name</th><th className="text-left p-2">Type</th><th className="text-right p-2">Debits</th><th className="text-right p-2">Credits</th><th className="text-right p-2">Balance</th></tr></thead>
            <tbody>
              {(trialBalance.accounts||[])?.map(a => (<tr key={a.id} className="border-b"><td className="p-2 font-mono">{a.account_number}</td><td className="p-2">{a.account_name}</td><td className="p-2 text-xs capitalize">{a.account_type}</td><td className="p-2 text-right font-mono">{fmt(a.total_debits)}</td><td className="p-2 text-right font-mono">{fmt(a.total_credits)}</td><td className="p-2 text-right font-mono font-bold">{fmt(a.balance)}</td></tr>))}
              <tr className="bg-gray-200 font-bold"><td colSpan="3" className="p-2">TOTALS</td><td className="p-2 text-right font-mono">{fmt(trialBalance.total_debits)}</td><td className="p-2 text-right font-mono">{fmt(trialBalance.total_credits)}</td><td></td></tr>
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'income-statement' && incomeStmt && (
        <div className="bg-white rounded shadow p-4 max-w-2xl">
          <h3 className="font-bold text-center mb-4">Income Statement</h3>
          <FinSection title="Revenue" items={incomeStmt.revenue||[]} totalLabel="Total Revenue" totalValue={incomeStmt.total_revenue} />
          <FinSection title="Cost of Goods Sold" items={incomeStmt.cogs||[]} totalLabel="Total COGS" totalValue={incomeStmt.total_cogs} />
          <div className="flex justify-between font-bold bg-blue-50 p-2 rounded mb-4"><span>Gross Profit</span><span className="font-mono">{fmt(incomeStmt.gross_profit)}</span></div>
          <FinSection title="Operating Expenses" items={incomeStmt.expenses||[]} totalLabel="Total Expenses" totalValue={incomeStmt.total_expenses} />
          <div className={`flex justify-between font-bold text-lg p-3 rounded ${Number(incomeStmt.net_income)>=0?'bg-green-100 text-green-800':'bg-red-100 text-red-800'}`}><span>Net Income</span><span className="font-mono">{fmt(incomeStmt.net_income)}</span></div>
        </div>
      )}

      {activeTab === 'balance-sheet' && balanceSheet && (
        <div className="bg-white rounded shadow p-4 max-w-2xl">
          <div className="flex justify-between mb-4"><h3 className="font-bold">Balance Sheet</h3><span className={`px-3 py-1 rounded text-sm ${balanceSheet.is_balanced?'bg-green-100 text-green-700':'bg-red-100 text-red-700'}`}>{balanceSheet.is_balanced?'BALANCED':'OUT OF BALANCE'}</span></div>
          <FinSection title="Assets" items={balanceSheet.assets||[]} totalLabel="Total Assets" totalValue={balanceSheet.total_assets} />
          <FinSection title="Liabilities" items={balanceSheet.liabilities||[]} totalLabel="Total Liabilities" totalValue={balanceSheet.total_liabilities} />
          <FinSection title="Equity" items={balanceSheet.equity||[]} totalLabel="Total Equity" totalValue={balanceSheet.total_equity} />
          <div className="flex justify-between font-bold bg-gray-100 p-2 rounded"><span>Total L + E</span><span className="font-mono">{fmt(Number(balanceSheet.total_liabilities)+Number(balanceSheet.total_equity))}</span></div>
        </div>
      )}

      {activeTab === 'periods' && (
        <div className="bg-white rounded shadow p-4">
          <h3 className="font-bold mb-3">Accounting Periods</h3>
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">Period</th><th className="text-left p-2">Year</th><th className="text-left p-2">Start</th><th className="text-left p-2">End</th><th className="text-left p-2">Status</th><th className="p-2">Action</th></tr></thead>
            <tbody>{periods?.map(p => (<tr key={p.id} className="border-b"><td className="p-2">{p.period_number}</td><td className="p-2">{p.period_year}</td><td className="p-2 text-xs">{p.start_date?new Date(p.start_date).toLocaleDateString():''}</td><td className="p-2 text-xs">{p.end_date?new Date(p.end_date).toLocaleDateString():''}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${p.status==='closed'?'bg-gray-200':'bg-green-100 text-green-700'}`}>{p.status}</span></td><td className="p-2">{p.status==='open'&&<button onClick={()=>handlePeriodClose(p.id)} className="text-xs text-red-600 hover:underline">Close</button>}</td></tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default AccountingHome;
