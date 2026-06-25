import React, { useState, useEffect } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [topTab, setTopTab] = useState('bookings_customer');
  const [bottomLeftTab, setBottomLeftTab] = useState('ar_customer');
  const [bottomRightTab, setBottomRightTab] = useState('sales_salesperson');
  const [summaryTab, setSummaryTab] = useState('summary');

  useEffect(() => {
    api.get('/api/reports/dashboard').then(res => setKpis(res.data)).catch(() => {
      // Use demo data if API not ready
      setKpis({
        open_sales_orders: 675,
        open_mfg_orders: 51,
        open_purchase_orders: 83,
        total_sales_mtd: 320144.18,
        total_sales_qtd: 1210147.15,
        total_sales_ytd: 2309809.30,
        total_bank_balance: 120116452.92,
        total_inventory_value: 11867573.52,
        bookings_by_customer: [
          { name: 'Basic Metals', amount: 327000 },
          { name: 'Trucks Trailers and More', amount: 278000 },
          { name: 'Republic County Transportation', amount: 187000 },
          { name: 'DC LOGISTICS AND HAULING LLC', amount: 174000 },
          { name: 'Adventure Accessories', amount: 139000 },
          { name: 'Autumn Landscaping', amount: 137000 },
          { name: 'Rydemore Heavy Duty Truck Parts', amount: 59785 },
          { name: 'BOSTIC MOTORS, INC', amount: 96100 },
          { name: 'USM PARTS, INC', amount: 192669 },
          { name: 'Commander Auto Spare Parts', amount: 250000 },
        ],
        ar_by_customer: [
          { name: 'MAX TA GROUP LLC', amount: 349878.55 },
          { name: 'USLS INC', amount: 163977 },
          { name: 'Accurate Engines', amount: 87000 },
          { name: 'ADVANCED VEHICLE ASSEMBLY', amount: 81490.88 },
          { name: 'Flight Systems Electronics', amount: 64862.64 },
          { name: 'FLIGHT SYSTEMS AUTOMOTIVE', amount: 49733.75 },
          { name: 'WOLF PACK ENTERPRISES', amount: 45170 },
          { name: '9390-5024 QUEBEC INC', amount: 34630 },
          { name: 'USM PARTS, INC', amount: 34629.50 },
          { name: 'BOSTIC MOTORS, INC', amount: 26889.67 },
        ],
        sales_by_salesperson: [
          { name: 'Eric', amount: 120299.09 },
          { name: 'Eddie Eddie', amount: 7100 },
          { name: 'House Account', amount: 0 },
        ]
      });
    });
  }, []);

  if (!kpis) return <div className="p-4">Loading dashboard...</div>;

  const bookingsData = {
    labels: kpis.bookings_by_customer?.map(c => c.name) || [],
    datasets: [{
      data: kpis.bookings_by_customer?.map(c => c.amount) || [],
      backgroundColor: ['#4472c4', '#ed7d31', '#a5a5a5', '#ffc000', '#5b9bd5', '#70ad47', '#264478', '#9e480e', '#636363', '#997300'],
    }]
  };

  const arData = {
    labels: kpis.ar_by_customer?.map(c => c.name) || [],
    datasets: [{
      data: kpis.ar_by_customer?.map(c => c.amount) || [],
      backgroundColor: ['#ffc000', '#4472c4', '#ed7d31', '#a5a5a5', '#5b9bd5', '#70ad47', '#264478', '#9e480e', '#636363', '#997300'],
    }]
  };

  const salesPieData = {
    labels: kpis.sales_by_salesperson?.map(s => s.name) || [],
    datasets: [{
      data: kpis.sales_by_salesperson?.map(s => s.amount) || [],
      backgroundColor: ['#ffc000', '#c0c0c0', '#7f6084'],
    }]
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span>Refresh</span></button>
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
            <Bar data={bookingsData} options={{
              indexAxis: 'y',
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { callback: v => '$' + (v/1000) + 'k' } }
              }
            }} />
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
          </div>
        </div>

        {/* Bottom Left - Open AR by Customer */}
        <div className="erp-panel">
          <div className="erp-panel-header">
            <span className="text-red-600">Open AR by Customer</span>
            <span className="text-xs font-normal cursor-pointer">&#x25A1;</span>
          </div>
          <div className="erp-panel-content">
            <Bar data={arData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                x: { ticks: { maxRotation: 45, font: { size: 9 } } },
                y: { ticks: { callback: v => '$' + (v/1000) + 'k' } }
              }
            }} />
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
            <span className="text-red-600">Sales by Salesperson</span>
            <span className="text-xs font-normal cursor-pointer">&#x25A1;</span>
          </div>
          <div className="erp-panel-content flex items-center justify-center">
            <div style={{ width: '80%', maxWidth: '300px' }}>
              <Pie data={salesPieData} options={{
                responsive: true,
                plugins: {
                  legend: { position: 'right', labels: { font: { size: 10 } } },
                  tooltip: { callbacks: { label: ctx => ctx.label + ': $' + ctx.raw.toLocaleString() } }
                }
              }} />
            </div>
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
