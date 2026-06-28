import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

export default function FinancialDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/accounting-advanced/dashboard');
      setData(res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null);
    } catch(e) { toast.error('Failed to load financial dashboard'); }
    setLoading(false);
  };

  if (loading) return <ModulePage {...accountingMenu}><div className="p-6 text-center">Loading financial dashboard...</div></ModulePage>;
  if (!data) return <ModulePage {...accountingMenu}><div className="p-6 text-center text-red-500">Failed to load dashboard data</div></ModulePage>;

  const totalAR = (data.ar_aging?.current || 0) + (data.ar_aging?.days_1_30 || 0) + (data.ar_aging?.days_31_60 || 0) + (data.ar_aging?.days_61_90 || 0) + (data.ar_aging?.over_90 || 0);
  const totalAP = (data.ap_aging?.current || 0) + (data.ap_aging?.days_1_30 || 0) + (data.ap_aging?.days_31_60 || 0) + (data.ap_aging?.over_60 || 0);

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full overflow-auto p-3 space-y-4">
        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">Cash Position</p>
            <p className="text-2xl font-bold text-blue-600 font-mono">${(data.cash_position || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">All bank accounts</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">MTD Revenue</p>
            <p className="text-2xl font-bold text-green-600 font-mono">${(data.mtd_revenue || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Month to date</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">MTD Expenses</p>
            <p className="text-2xl font-bold text-red-600 font-mono">${(data.mtd_expenses || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Month to date</p>
          </div>
          <div className="bg-white border rounded-lg p-4">
            <p className="text-xs text-gray-500 font-medium uppercase">MTD Net Income</p>
            <p className={`text-2xl font-bold font-mono ${(data.mtd_net_income || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>${(data.mtd_net_income || 0).toLocaleString()}</p>
            <p className="text-xs text-gray-400 mt-1">Revenue - Expenses</p>
          </div>
        </div>

        {/* AR & AP Aging */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* AR Aging */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">Accounts Receivable Aging</h3>
              <span className="text-lg font-bold font-mono text-green-600">${totalAR.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Current', value: data.ar_aging?.current || 0, color: 'bg-green-500' },
                { label: '1-30 Days', value: data.ar_aging?.days_1_30 || 0, color: 'bg-yellow-500' },
                { label: '31-60 Days', value: data.ar_aging?.days_31_60 || 0, color: 'bg-orange-500' },
                { label: '61-90 Days', value: data.ar_aging?.days_61_90 || 0, color: 'bg-red-400' },
                { label: 'Over 90', value: data.ar_aging?.over_90 || 0, color: 'bg-red-700' },
              ].map(bucket => (
                <div key={bucket.label} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-gray-600">{bucket.label}</span>
                  <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                    <div className={`h-full ${bucket.color} rounded`} style={{ width: `${totalAR > 0 ? (bucket.value / totalAR * 100) : 0}%` }}></div>
                  </div>
                  <span className="text-xs font-mono w-24 text-right">${bucket.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AP Aging */}
          <div className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold">Accounts Payable Aging</h3>
              <span className="text-lg font-bold font-mono text-red-600">${totalAP.toLocaleString()}</span>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Current', value: data.ap_aging?.current || 0, color: 'bg-green-500' },
                { label: '1-30 Days', value: data.ap_aging?.days_1_30 || 0, color: 'bg-yellow-500' },
                { label: '31-60 Days', value: data.ap_aging?.days_31_60 || 0, color: 'bg-orange-500' },
                { label: 'Over 60', value: data.ap_aging?.over_60 || 0, color: 'bg-red-600' },
              ].map(bucket => (
                <div key={bucket.label} className="flex items-center gap-2">
                  <span className="text-xs w-20 text-gray-600">{bucket.label}</span>
                  <div className="flex-1 bg-gray-100 rounded h-4 overflow-hidden">
                    <div className={`h-full ${bucket.color} rounded`} style={{ width: `${totalAP > 0 ? (bucket.value / totalAP * 100) : 0}%` }}></div>
                  </div>
                  <span className="text-xs font-mono w-24 text-right">${bucket.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Active Budget */}
        {data.active_budget && (
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-bold mb-2">Active Budget: {data.active_budget.name}</h3>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">Total: <span className="font-mono font-bold">${parseFloat(data.active_budget.total_amount || 0).toLocaleString()}</span></span>
              <span className={`px-2 py-0.5 rounded text-xs ${data.active_budget.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{(data.active_budget.status || '').toUpperCase()}</span>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <a href="/accounting/budget-manager" className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">📊</p>
            <p className="text-xs font-medium text-gray-700">Budget Manager</p>
          </a>
          <a href="/accounting/cash-flow" className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">💰</p>
            <p className="text-xs font-medium text-gray-700">Cash Flow</p>
          </a>
          <a href="/accounting/tax-reporting" className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">🏛️</p>
            <p className="text-xs font-medium text-gray-700">Tax Reporting</p>
          </a>
          <a href="/accounting/bank-recon" className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow text-center">
            <p className="text-2xl mb-1">🏦</p>
            <p className="text-xs font-medium text-gray-700">Bank Reconciliation</p>
          </a>
        </div>
      </div>
    </ModulePage>
  );
}
