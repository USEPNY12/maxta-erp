import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [topTab, setTopTab] = useState('bookings_customer');
  const [bottomLeftTab, setBottomLeftTab] = useState('ar_customer');
  const [bottomRightTab, setBottomRightTab] = useState('sales_salesperson');
  const [summaryTab, setSummaryTab] = useState('summary');

  const loadData = () => {
    setLoading(true);
    api.get('/api/reports/dashboard').then(res => {
      const d = res.data;
      // Map API response to dashboard format
      setKpis({
        open_sales_orders: d.summary?.open_sales_orders || 0,
        open_mfg_orders: d.summary?.open_mfg_orders || 0,
        open_purchase_orders: d.summary?.open_purchase_orders || 0,
        total_sales_mtd: parseFloat(d.summary?.sales_mtd) || 0,
        total_sales_qtd: parseFloat(d.summary?.sales_qtd) || 0,
        total_sales_ytd: parseFloat(d.summary?.sales_ytd) || 0,
        total_bank_balance: parseFloat(d.summary?.bank_balance) || 0,
        total_inventory_value: parseFloat(d.summary?.inventory_value) || 0,
        overdue_shipments: d.summary?.overdue_shipments || 0,
        overdue_jobs: d.summary?.overdue_jobs || 0,
        bookings_by_customer: (d.bookings_by_customer || []).map(c => ({
          name: c.company_name || c.name,
          amount: parseFloat(c.total || c.amount) || 0
        })),
        ar_by_customer: (d.ar_by_customer || []).map(c => ({
          name: c.company_name || c.name,
          amount: parseFloat(c.total || c.amount) || 0
        })),
        sales_by_salesperson: (d.sales_by_salesperson || []).map(s => ({
          name: s.name || s.salesperson,
          amount: parseFloat(s.total || s.amount) || 0
        }))
      });
      setLoading(false);
    }).catch(() => {
      // Fallback demo data
      setKpis({
        open_sales_orders: 0,
        open_mfg_orders: 0,
        open_purchase_orders: 0,
        total_sales_mtd: 0,
        total_sales_qtd: 0,
        total_sales_ytd: 0,
        total_bank_balance: 0,
        total_inventory_value: 0,
        overdue_shipments: 0,
        overdue_jobs: 0,
        bookings_by_customer: [],
        ar_by_customer: [],
        sales_by_salesperson: []
      });
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, []);

  if (loading || !kpis) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <div className="text-lg text-gray-500">Loading Dashboard...</div>
        <div className="text-sm text-gray-400 mt-2">Fetching KPIs and charts</div>
      </div>
    </div>
  );

  const chartColors = ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47', '#264478', '#9e480e', '#636363', '#997300'];

  const bookingsData = {
    labels: kpis.bookings_by_customer.map(c => c.name.length > 20 ? c.name.substring(0, 20) + '...' : c.name),
    datasets: [{
      label: 'Amount',
      data: kpis.bookings_by_customer.map(c => c.amount),
      backgroundColor: chartColors,
      borderWidth: 1,
    }]
  };

  const arData = {
    labels: kpis.ar_by_customer.map(c => c.name.length > 15 ? c.name.substring(0, 15) + '...' : c.name),
    datasets: [{
      label: 'Balance',
      data: kpis.ar_by_customer.map(c => c.amount),
      backgroundColor: chartColors,
      borderWidth: 1,
    }]
  };

  const salesPieData = {
    labels: kpis.sales_by_salesperson.map(s => s.name),
    datasets: [{
      data: kpis.sales_by_salesperson.map(s => s.amount),
      backgroundColor: ['#ffc000', '#4472c4', '#ed7d31', '#a5a5a5', '#5b9bd5', '#70ad47'],
      borderWidth: 1,
    }]
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const hasBookings = kpis.bookings_by_customer.length > 0;
  const hasAR = kpis.ar_by_customer.length > 0;
  const hasSales = kpis.sales_by_salesperson.length > 0 && kpis.sales_by_salesperson.some(s => s.amount > 0);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={loadData}><span>Refresh</span></button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn"><span>KPI Settings</span></button>
      </div>

      {/* 4-Panel Grid */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-1 p-1 overflow-hidden">
        {/* Top Left - Bookings by Customer */}
        <div className="erp-panel">
          <div className="erp-panel-header">
            <span>Bookings Ranked by Customer</span>
            <span className="text-xs font-normal cursor-pointer">&#x25A1;</span>
          </div>
          <div className="erp-panel-content">
            {hasBookings ? (
              <Bar data={bookingsData} options={{
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v } }
                }
              }} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No booking data available
              </div>
            )}
          </div>
          <div className="erp-panel-footer">
            <button className="erp-btn text-xs">Print</button>
            <button className="erp-btn text-xs">Customize Chart</button>
            <span className="ml-auto text-xs text-gray-500">Bar diagram</span>
          </div>
          <div className="erp-panel-tabs">
            {['Bookings by Customer', 'Bookings by Item', 'Sales by Customer', 'Sales by Item'].map(t => (
              <div key={t} className={`erp-panel-tab ${topTab === t ? 'active' : ''}`} onClick={() => setTopTab(t)}>{t}</div>
            ))}
          </div>
        </div>

        {/* Top Right - Summary */}
        <div className="erp-panel">
          <div className="erp-panel-tabs">
            {['Summary', 'Overdue Shipments', 'Overdue Jobs', 'Backorders by Item', 'Items with zero UOH'].map(t => (
              <div key={t} className={`erp-panel-tab ${summaryTab === t.toLowerCase() ? 'active' : ''}`} onClick={() => setSummaryTab(t.toLowerCase())}>{t}</div>
            ))}
          </div>
          <div className="erp-panel-content p-4">
            {summaryTab === 'summary' && (
              <div className="space-y-3">
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Open Sales Orders:</span>
                  <span className="erp-kpi-value text-blue-600 cursor-pointer">{kpis.open_sales_orders}</span>
                </div>
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Open Mfg Orders:</span>
                  <span className="erp-kpi-value text-blue-600 cursor-pointer">{kpis.open_mfg_orders}</span>
                </div>
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Open Purchase Orders:</span>
                  <span className="erp-kpi-value text-blue-600 cursor-pointer">{kpis.open_purchase_orders}</span>
                </div>
                <hr className="my-2" />
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Total Sales Month to date:</span>
                  <span className="erp-kpi-value">{fmt(kpis.total_sales_mtd)}</span>
                </div>
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Total Sales Quarter to date:</span>
                  <span className="erp-kpi-value">{fmt(kpis.total_sales_qtd)}</span>
                </div>
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label">Total Sales Year to date:</span>
                  <span className="erp-kpi-value">{fmt(kpis.total_sales_ytd)}</span>
                </div>
                <hr className="my-2" />
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label font-bold">Total Bank Balance:</span>
                  <span className="erp-kpi-value">{fmt(kpis.total_bank_balance)}</span>
                </div>
                <div className="erp-kpi-row">
                  <span className="erp-kpi-label font-bold">Total Inventory Value:</span>
                  <span className="erp-kpi-value">{fmt(kpis.total_inventory_value)}</span>
                </div>
              </div>
            )}
            {summaryTab === 'overdue shipments' && (
              <div className="text-center text-gray-500 mt-8">
                {kpis.overdue_shipments > 0 ? `${kpis.overdue_shipments} overdue shipments` : 'No overdue shipments'}
              </div>
            )}
            {summaryTab === 'overdue jobs' && (
              <div className="text-center text-gray-500 mt-8">
                {kpis.overdue_jobs > 0 ? `${kpis.overdue_jobs} overdue jobs` : 'No overdue jobs'}
              </div>
            )}
            {summaryTab === 'backorders by item' && (
              <div className="text-center text-gray-500 mt-8">No backorders</div>
            )}
            {summaryTab === 'items with zero uoh' && (
              <div className="text-center text-gray-500 mt-8">Check Inventory module for stock status</div>
            )}
          </div>
        </div>

        {/* Bottom Left - Open AR by Customer */}
        <div className="erp-panel">
          <div className="erp-panel-header">
            <span>Open AR by Customer</span>
            <span className="text-xs font-normal cursor-pointer">&#x25A1;</span>
          </div>
          <div className="erp-panel-content">
            {hasAR ? (
              <Bar data={arData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { maxRotation: 45, font: { size: 9 } } },
                  y: { ticks: { callback: v => v >= 1000 ? '$' + (v/1000).toFixed(0) + 'k' : '$' + v } }
                }
              }} />
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                No open AR balances
              </div>
            )}
          </div>
          <div className="erp-panel-footer">
            <button className="erp-btn text-xs">Print</button>
            <button className="erp-btn text-xs">Customize Chart</button>
            <span className="ml-auto text-xs text-gray-500">Column diagram</span>
          </div>
          <div className="erp-panel-tabs">
            {['Open AR by Customer', 'Open AP by Vendor', 'Purchases by Vendor', 'Purchase by Item'].map(t => (
              <div key={t} className={`erp-panel-tab ${bottomLeftTab === t ? 'active' : ''}`} onClick={() => setBottomLeftTab(t)}>{t}</div>
            ))}
          </div>
        </div>

        {/* Bottom Right - Sales by Salesperson */}
        <div className="erp-panel">
          <div className="erp-panel-header">
            <span>Sales by Salesperson</span>
            <span className="text-xs font-normal cursor-pointer">&#x25A1;</span>
          </div>
          <div className="erp-panel-content flex items-center justify-center">
            {hasSales ? (
              <div style={{ width: '80%', maxWidth: '300px' }}>
                <Pie data={salesPieData} options={{
                  responsive: true,
                  plugins: {
                    legend: { position: 'right', labels: { font: { size: 10 } } },
                    tooltip: { callbacks: { label: ctx => ctx.label + ': $' + ctx.raw.toLocaleString() } }
                  }
                }} />
              </div>
            ) : (
              <div className="text-gray-400 text-sm">No sales data available</div>
            )}
          </div>
          <div className="erp-panel-footer">
            <button className="erp-btn text-xs">Print</button>
            <button className="erp-btn text-xs">Customize Chart</button>
            <span className="ml-auto text-xs text-gray-500">Pie diagram</span>
          </div>
          <div className="erp-panel-tabs">
            {['Sales YTD', 'Cashflow YTD', 'Sales by Salesperson'].map(t => (
              <div key={t} className={`erp-panel-tab ${bottomRightTab === t ? 'active' : ''}`} onClick={() => setBottomRightTab(t)}>{t}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
