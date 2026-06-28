import React, { useState, useEffect } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { FaDollarSign, FaIndustry, FaShoppingCart, FaTruck, FaExclamationTriangle, FaChartLine, FaBoxes, FaFileInvoiceDollar } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function KPICard({ icon: Icon, label, value, subtext, color, onClick }) {
  return (
    <div className="kpi-card" onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
      <div className="kpi-card-icon" style={{ background: `${color}15`, color }}>
        <Icon size={20} />
      </div>
      <div className="kpi-card-content">
        <div className="kpi-card-value">{value}</div>
        <div className="kpi-card-label">{label}</div>
        {subtext && <div className="kpi-card-subtext">{subtext}</div>}
      </div>
    </div>
  );
}

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [promotions, setPromotions] = useState([]);
  const navigate = useNavigate();

  // Load active promotions
  useEffect(() => {
    api.get('/api/dashboard-exec/promotions/active').then(res => setPromotions(Array.isArray(res.data) ? res.data : [])).catch(() => {});
  }, []);

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
    <div className="dashboard-loading" style={{ padding: '24px' }}>
      <div className="dashboard-loading-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '8px' }}></div>
        ))}
      </div>
    </div>
  );

  const chartColors = ['#2563eb', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#14b8a6'];
  const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(n || 0);

  const bookingsData = {
    labels: kpis.bookings_by_customer.slice(0, 6).map(c => (c.name || 'Unknown').substring(0, 15)),
    datasets: [{
      label: 'Bookings',
      data: kpis.bookings_by_customer.slice(0, 6).map(c => c.amount),
      backgroundColor: chartColors,
      borderRadius: 4,
      borderWidth: 0,
    }]
  };

  const arData = {
    labels: kpis.ar_by_customer.slice(0, 6).map(c => (c.name || 'Unknown').substring(0, 15)),
    datasets: [{
      data: kpis.ar_by_customer.slice(0, 6).map(c => c.amount),
      backgroundColor: chartColors,
      borderWidth: 2,
      borderColor: '#fff',
    }]
  };

  const hasBookings = kpis.bookings_by_customer.length > 0;
  const hasAR = kpis.ar_by_customer.length > 0;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6 } },
    scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } } }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 10 }, padding: 12, usePointStyle: true } }, tooltip: { backgroundColor: '#1e293b', padding: 10, cornerRadius: 6 } },
    cutout: '65%',
  };

  const dismissPromo = (id) => {
    api.post(`/api/dashboard-exec/promotions/${id}/interact`, { interaction_type: 'dismiss' }).catch(() => {});
    setPromotions(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="dashboard" style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      {/* Active Promotions/Announcements */}
      {promotions.filter(p => p.display_type === 'banner').map(promo => (
        <div key={promo.id} style={{ background: promo.bg_color || '#3b82f6', color: '#fff', padding: '10px 16px', borderRadius: '8px', marginBottom: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: '13px' }}>{promo.title}</strong>
            <span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.9 }}>{promo.message}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {promo.action_url && <button onClick={() => navigate(promo.action_url)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>{promo.action_label || 'View'}</button>}
            {promo.is_dismissible ? <button onClick={() => dismissPromo(promo.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '16px' }}>&times;</button> : null}
          </div>
        </div>
      ))}

      {/* Welcome Header */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', margin: 0 }}>Dashboard</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>Welcome back. Here's your business at a glance.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button onClick={() => navigate('/executive-dashboard')} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px' }}>Executive View</button>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        <div className="kpi-card" onClick={() => navigate('/sales')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#2563eb15', color: '#2563eb' }}><FaDollarSign size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{fmt(kpis.total_sales_mtd)}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Sales MTD</div><div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>YTD: {fmt(kpis.total_sales_ytd)}</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/sales/orders')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#10b98115', color: '#10b981' }}><FaFileInvoiceDollar size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{kpis.open_sales_orders}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Open Sales Orders</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/manufacturing/work-orders')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f59e0b15', color: '#f59e0b' }}><FaIndustry size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{kpis.open_mfg_orders}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Open Work Orders</div>{kpis.overdue_jobs > 0 && <div style={{ fontSize: '10px', color: '#ef4444' }}>{kpis.overdue_jobs} overdue</div>}</div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/purchasing')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#8b5cf615', color: '#8b5cf6' }}><FaShoppingCart size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{kpis.open_purchase_orders}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Open POs</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#06b6d415', color: '#06b6d4' }}><FaBoxes size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{fmt(kpis.total_inventory_value)}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Inventory Value</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/accounting')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#14b8a615', color: '#14b8a6' }}><FaChartLine size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{fmt(kpis.total_bank_balance)}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Bank Balance</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/sales/shipments')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: kpis.overdue_shipments > 0 ? '#ef444415' : '#10b98115', color: kpis.overdue_shipments > 0 ? '#ef4444' : '#10b981' }}><FaTruck size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{kpis.overdue_shipments}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overdue Shipments</div></div>
        </div>
        <div className="kpi-card" onClick={() => navigate('/manufacturing/work-orders')} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: kpis.overdue_jobs > 0 ? '#ef444415' : '#10b98115', color: kpis.overdue_jobs > 0 ? '#ef4444' : '#10b981' }}><FaExclamationTriangle size={20} /></div>
          <div><div style={{ fontSize: '18px', fontWeight: '700' }}>{kpis.overdue_jobs}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Overdue Jobs</div></div>
        </div>
      </div>

      {/* Charts Section */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '13px' }}>Bookings by Customer</div>
          <div style={{ padding: '16px', height: '250px' }}>
            {hasBookings ? (
              <Bar data={bookingsData} options={chartOptions} />
            ) : (
              <div className="empty-state"><div className="empty-state-text">No booking data available</div></div>
            )}
          </div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontWeight: '600', fontSize: '13px' }}>A/R by Customer</div>
          <div style={{ padding: '16px', height: '250px' }}>
            {hasAR ? (
              <Doughnut data={arData} options={doughnutOptions} />
            ) : (
              <div className="empty-state"><div className="empty-state-text">No receivables data</div></div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: 'var(--text-primary)' }}>Quick Actions</h3>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="erp-btn" onClick={() => navigate('/sales/quotes?new=true')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaDollarSign size={12} /> New Quote</button>
          <button className="erp-btn" onClick={() => navigate('/sales/orders?new=true')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaFileInvoiceDollar size={12} /> New Order</button>
          <button className="erp-btn" onClick={() => navigate('/manufacturing/work-orders')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaIndustry size={12} /> Work Orders</button>
          <button className="erp-btn" onClick={() => navigate('/scanner')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaBoxes size={12} /> Scanner</button>
          <button className="erp-btn" onClick={loadData} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FaChartLine size={12} /> Refresh</button>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
