import React, { useState } from 'react';
import api from '../services/api';

const REPORTS = {
  'Accounts Payable': [
    { id: 'ap-open', name: 'Open Payables', endpoint: '/api/reports/accounts-payable/open' },
    { id: 'ap-aged', name: 'Aged Payables', endpoint: '/api/reports/accounts-payable/aged' },
  ],
  'Accounts Receivable': [
    { id: 'ar-open', name: 'Open Receivables', endpoint: '/api/reports/accounts-receivable/open' },
    { id: 'ar-aged', name: 'Aged Receivables', endpoint: '/api/reports/accounts-receivable/aged' },
  ],
  'General Ledger': [
    { id: 'gl', name: 'General Ledger', endpoint: '/api/reports/general-ledger' },
    { id: 'tb', name: 'Trial Balance', endpoint: '/api/reports/trial-balance' },
  ],
  'Inventory': [
    { id: 'inv-value', name: 'Inventory Value', endpoint: '/api/reports/inventory/value' },
    { id: 'inv-stock', name: 'Stock Status', endpoint: '/api/reports/inventory/stock-status' },
    { id: 'inv-reorder', name: 'Reorder Report', endpoint: '/api/reports/inventory/reorder' },
  ],
  'Manufacturing': [
    { id: 'mfg-wo', name: 'Work Order Status', endpoint: '/api/reports/manufacturing/wo-status' },
    { id: 'mfg-eff', name: 'Production Efficiency', endpoint: '/api/reports/manufacturing/efficiency' },
  ],
  'Purchasing': [
    { id: 'po-status', name: 'PO Status', endpoint: '/api/reports/purchasing/po-status' },
  ],
  'Sales': [
    { id: 'sales-cust', name: 'Sales by Customer', endpoint: '/api/reports/sales/by-customer' },
  ],
};

function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const runReport = async (report) => {
    setActiveReport(report);
    setLoading(true);
    try {
      const res = await api.get(report.endpoint);
      setData(Array.isArray(res.data) ? res.data : []);
    } catch { setData([]); }
    setLoading(false);
  };

  const fmtVal = (v) => {
    if (v === null || v === undefined) return '';
    if (typeof v === 'boolean') return v ? 'Yes' : 'No';
    const n = Number(v);
    if (isNaN(n) || typeof v === 'string' && !v.match(/^-?\d+\.?\d*$/)) return String(v);
    if (Math.abs(n) >= 100 || String(v).match(/\.\d{2,4}$/)) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return String(v);
  };

  const renderData = () => {
    if (!data || data.length === 0) return <p className="text-center py-8 text-gray-400">No data for this report</p>;
    const cols = Object.keys(data[0]).filter(k => !['id','created_at','updated_at','entered_by'].includes(k));
    return (
      <div className="overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead><tr className="bg-gray-100 border-b">
            {cols.map(c => <th key={c} className="text-left p-2 text-xs font-medium whitespace-nowrap">{c.replace(/_/g,' ').replace(/\b\w/g,l=>l.toUpperCase())}</th>)}
          </tr></thead>
          <tbody>
            {data.map((r, i) => (
              <tr key={i} className="border-b hover:bg-blue-50">
                {cols.map(c => <td key={c} className="p-2 text-xs whitespace-nowrap">{fmtVal(r[c])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="p-2 text-xs text-gray-500 border-t">{data.length} record(s)</div>
      </div>
    );
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
            <div className="p-3 border-b flex justify-between items-center">
              <h3 className="font-bold">{activeReport.name}</h3>
              <div className="flex gap-2">
                <button onClick={() => runReport(activeReport)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs">Refresh</button>
                <button onClick={() => window.print()} className="px-3 py-1 bg-gray-600 text-white rounded text-xs">Print</button>
              </div>
            </div>
            {loading ? <p className="text-center py-8 text-gray-400">Loading...</p> : renderData()}
          </div>
        )}
      </div>
    </div>
  );
}

export default Reports;
