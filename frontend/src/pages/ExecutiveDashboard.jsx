import React, { useState, useEffect, useCallback } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { FaDollarSign, FaChartLine, FaShoppingCart, FaIndustry, FaBoxes, FaTruck, FaExclamationTriangle, FaUsers, FaPercent, FaCog, FaTimes, FaExpand, FaArrowUp, FaArrowDown, FaMinus, FaBullhorn } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const ICON_MAP = {
  sales_mtd: FaDollarSign, sales_pipeline: FaChartLine, open_orders: FaShoppingCart,
  ar_aging: FaDollarSign, ap_aging: FaDollarSign, cash_position: FaDollarSign,
  revenue_trend: FaChartLine, production_status: FaIndustry, wo_throughput: FaIndustry,
  inventory_value: FaBoxes, low_stock_alerts: FaExclamationTriangle, overdue_pos: FaExclamationTriangle,
  shipments_today: FaTruck, top_customers: FaUsers, profit_margin: FaPercent,
  bookings_chart: FaChartLine, overdue_invoices: FaExclamationTriangle, active_users: FaUsers
};

const COLOR_MAP = {
  sales_mtd: '#10b981', sales_pipeline: '#6366f1', open_orders: '#f59e0b',
  ar_aging: '#ef4444', ap_aging: '#f97316', cash_position: '#10b981',
  revenue_trend: '#3b82f6', production_status: '#8b5cf6', wo_throughput: '#06b6d4',
  inventory_value: '#6366f1', low_stock_alerts: '#ef4444', overdue_pos: '#f97316',
  shipments_today: '#14b8a6', top_customers: '#8b5cf6', profit_margin: '#10b981',
  bookings_chart: '#3b82f6', overdue_invoices: '#ef4444', active_users: '#06b6d4'
};

function formatCurrency(val) {
  if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}K`;
  return `$${(val || 0).toFixed(0)}`;
}

function TrendBadge({ trend, change }) {
  if (!trend && !change) return null;
  const isUp = trend === 'up' || change > 0;
  const isDown = trend === 'down' || change < 0;
  return (
    <span style={{ fontSize: '11px', color: isUp ? '#10b981' : isDown ? '#ef4444' : '#6b7280', display: 'flex', alignItems: 'center', gap: '2px' }}>
      {isUp ? <FaArrowUp size={9}/> : isDown ? <FaArrowDown size={9}/> : <FaMinus size={9}/>}
      {change ? `${Math.abs(change)}%` : ''}
    </span>
  );
}

function KPIWidget({ widget, data, onDrillDown }) {
  const Icon = ICON_MAP[widget.widget_key] || FaChartLine;
  const color = COLOR_MAP[widget.widget_key] || '#3b82f6';
  const value = data?.value;
  const isFinancial = ['sales_mtd','sales_pipeline','cash_position','inventory_value'].includes(widget.widget_key);
  
  return (
    <div className="exec-widget exec-widget-kpi" onClick={() => onDrillDown(widget, data)} style={{ cursor: 'pointer', borderLeft: `3px solid ${color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{widget.title}</div>
          <div style={{ fontSize: '22px', fontWeight: '700', color: '#1f2937' }}>
            {isFinancial ? formatCurrency(value) : (value ?? '—')}
          </div>
        </div>
        <div style={{ background: `${color}15`, borderRadius: '8px', padding: '8px' }}>
          <Icon size={18} color={color} />
        </div>
      </div>
      {(data?.trend || data?.change) && <TrendBadge trend={data.trend} change={data.change} />}
    </div>
  );
}

function ChartWidget({ widget, data, onDrillDown }) {
  if (!data || !data.labels) return <div className="exec-widget"><p style={{ color: '#9ca3af' }}>Loading...</p></div>;
  const color = COLOR_MAP[widget.widget_key] || '#3b82f6';
  const isLine = widget.widget_key === 'revenue_trend';
  const isDoughnut = widget.widget_key === 'production_status';

  const chartData = {
    labels: data.labels,
    datasets: data.datasets?.map((ds, i) => ({
      ...ds,
      backgroundColor: isDoughnut ? ['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'] : isLine ? `${color}20` : `${color}cc`,
      borderColor: isLine ? color : undefined,
      fill: isLine,
      tension: 0.4,
    }))
  };
  const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: isDoughnut, position: 'bottom' } }, scales: isDoughnut ? {} : { y: { beginAtZero: true } } };

  return (
    <div className="exec-widget exec-widget-chart" onClick={() => onDrillDown(widget, data)} style={{ cursor: 'pointer' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{widget.title}</div>
      <div style={{ height: '180px' }}>
        {isDoughnut ? <Doughnut data={chartData} options={options} /> : isLine ? <Line data={chartData} options={options} /> : <Bar data={chartData} options={options} />}
      </div>
    </div>
  );
}

function ListWidget({ widget, data, onDrillDown }) {
  if (!data || !Array.isArray(data)) return <div className="exec-widget"><p style={{ color: '#9ca3af' }}>No data</p></div>;
  return (
    <div className="exec-widget exec-widget-list">
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
        <span>{widget.title}</span>
        <span style={{ background: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 8px', fontSize: '11px' }}>{data.length}</span>
      </div>
      <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
        {data?.slice(0, 8)?.map((item, i) => (
          <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6', fontSize: '12px', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#374151' }}>{item.item_number || item.po_number || item.shipment_number || item.invoice_number || item.description || `Item ${i+1}`}</span>
            <span style={{ color: '#6b7280' }}>
              {item.days_overdue ? `${item.days_overdue}d overdue` : item.quantity_on_hand !== undefined ? `Qty: ${item.quantity_on_hand}` : item.total ? formatCurrency(item.total) : item.customer || ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableWidget({ widget, data }) {
  if (!data || !Array.isArray(data) || !data.length) return <div className="exec-widget"><p style={{ color: '#9ca3af' }}>No data</p></div>;
  return (
    <div className="exec-widget exec-widget-table">
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#374151', marginBottom: '8px' }}>{widget.title}</div>
      <table style={{ width: '100%', fontSize: '11px', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
            <th style={{ textAlign: 'left', padding: '4px', color: '#6b7280' }}>Customer</th>
            <th style={{ textAlign: 'right', padding: '4px', color: '#6b7280' }}>Revenue</th>
            <th style={{ textAlign: 'right', padding: '4px', color: '#6b7280' }}>Invoices</th>
          </tr>
        </thead>
        <tbody>
          {data?.slice(0, 8)?.map((row, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
              <td style={{ padding: '4px', color: '#1f2937' }}>{row.company_name}</td>
              <td style={{ padding: '4px', textAlign: 'right', color: '#10b981', fontWeight: '600' }}>{formatCurrency(parseFloat(row.mtd_revenue))}</td>
              <td style={{ padding: '4px', textAlign: 'right', color: '#6b7280' }}>{row.invoice_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DrillDownModal({ widget, data, onClose }) {
  if (!widget) return null;
  const drilldown = data?.drilldown || data?.accounts || data;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '700px', width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>{widget.title} — Detail</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes size={18}/></button>
        </div>
        {Array.isArray(drilldown) && drilldown.length > 0 ? (
          <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                {Object.keys(drilldown[0])?.map(k => (
                  <th key={k} style={{ textAlign: 'left', padding: '8px', color: '#6b7280', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drilldown?.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  {Object.values(row)?.map((v, j) => (
                    <td key={j} style={{ padding: '8px', color: '#1f2937' }}>{typeof v === 'number' && v > 100 ? formatCurrency(v) : String(v ?? '')}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: '#9ca3af' }}>
            {data?.quotes && (
              <div style={{ textAlign: 'left' }}>
                <p><strong>Open Quotes:</strong> {data.quotes.count} ({formatCurrency(data.quotes.value)})</p>
                <p><strong>Open Orders:</strong> {data.orders.count} ({formatCurrency(data.orders.value)})</p>
                <p><strong>Total Pipeline:</strong> {formatCurrency(data.value)}</p>
              </div>
            )}
            {data?.revenue !== undefined && (
              <div style={{ textAlign: 'left' }}>
                <p><strong>Revenue MTD:</strong> {formatCurrency(data.revenue)}</p>
                <p><strong>COGS MTD:</strong> {formatCurrency(data.cogs)}</p>
                <p><strong>Gross Margin:</strong> {data.value}%</p>
              </div>
            )}
            {!data?.quotes && data?.revenue === undefined && <p>No drill-down data available</p>}
          </div>
        )}
      </div>
    </div>
  );
}

function PromoBanner({ promotions, onDismiss, onAction }) {
  if (!promotions || !promotions.length) return null;
  return (
    <div style={{ marginBottom: '16px' }}>
      {promotions?.filter(p => p.display_type === 'banner')?.map(promo => (
        <div key={promo.id} style={{ background: promo.bg_color || '#3b82f6', color: '#fff', padding: '10px 16px', borderRadius: '8px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
            <FaBullhorn size={16} />
            <div>
              <strong style={{ fontSize: '13px' }}>{promo.title}</strong>
              <span style={{ fontSize: '12px', marginLeft: '8px', opacity: 0.9 }}>{promo.message}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {promo.action_url && (
              <button onClick={() => onAction(promo)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.4)', color: '#fff', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>
                {promo.action_label || 'View'}
              </button>
            )}
            {promo.is_dismissible ? (
              <button onClick={() => onDismiss(promo.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer' }}><FaTimes size={14}/></button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ExecutiveDashboard() {
  const [widgets, setWidgets] = useState([]);
  const [layout, setLayout] = useState([]);
  const [widgetData, setWidgetData] = useState({});
  const [promotions, setPromotions] = useState([]);
  const [drillDown, setDrillDown] = useState({ widget: null, data: null });
  const [loading, setLoading] = useState(true);
  const [showWidgetPicker, setShowWidgetPicker] = useState(false);
  const navigate = useNavigate();

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [widgetsRes, configRes, promosRes] = await Promise.all([
        api.get('/api/dashboard-exec/widgets'),
        api.get('/api/dashboard-exec/config'),
        api.get('/api/dashboard-exec/promotions/active')
      ]);
      const safeWidgets = Array.isArray(widgetsRes.data) ? widgetsRes.data : (widgetsRes.data?.widgets || []);
      setWidgets(safeWidgets);
      setPromotions(Array.isArray(promosRes.data) ? promosRes.data : []);
      
      const config = configRes.data;
      const layoutData = typeof config.layout === 'string' ? JSON.parse(config.layout) : (config.layout || []);
      setLayout(layoutData);

      // Load data for each widget in layout
      const allowedKeys = new Set(safeWidgets.map(w => w.widget_key));
      const activeWidgets = layoutData?.filter(l => allowedKeys.has(l.widget));
      
      const dataPromises = activeWidgets?.map(async (l) => {
        const w = safeWidgets.find(wd => wd.widget_key === l.widget);
        if (!w) return null;
        try {
          const res = await api.get(w.data_endpoint);
          return { key: l.widget, data: res.data };
        } catch { return { key: l.widget, data: null }; }
      });
      
      const results = await Promise.all(dataPromises);
      const dataMap = {};
      results?.forEach(r => { if (r) dataMap[r.key] = r.data; });
      setWidgetData(dataMap);
    } catch (e) { console.error('Dashboard load error:', e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const handleDismiss = async (promoId) => {
    try {
      await api.post(`/api/dashboard-exec/promotions/${promoId}/interact`, { interaction_type: 'dismiss' });
      setPromotions(prev => prev?.filter(p => p.id !== promoId));
    } catch (e) { console.error(e); }
  };

  const handlePromoAction = (promo) => {
    api.post(`/api/dashboard-exec/promotions/${promo.id}/interact`, { interaction_type: 'click' }).catch(() => {});
    if (promo.action_url) navigate(promo.action_url);
  };

  const handleDrillDown = (widget, data) => {
    setDrillDown({ widget, data });
  };

  const addWidget = async (widgetKey) => {
    const newLayout = [...layout, { widget: widgetKey, x: 0, y: layout.length, w: 1, h: 1 }];
    setLayout(newLayout);
    setShowWidgetPicker(false);
    try { await api.put('/api/dashboard-exec/config', { layout: newLayout }); } catch (e) { console.error(e); }
    // Load data for new widget
    const w = widgets?.find(wd => wd.widget_key === widgetKey);
    if (w) {
      try { const res = await api.get(w.data_endpoint); setWidgetData(prev => ({ ...prev, [widgetKey]: res.data })); } catch {}
    }
  };

  const removeWidget = async (widgetKey) => {
    const newLayout = layout?.filter(l => l.widget !== widgetKey);
    setLayout(newLayout);
    try { await api.put('/api/dashboard-exec/config', { layout: newLayout }); } catch (e) { console.error(e); }
  };

  const renderWidget = (layoutItem) => {
    const widget = widgets?.find(w => w.widget_key === layoutItem.widget);
    if (!widget) return null;
    const data = widgetData[layoutItem.widget];

    switch (widget.widget_type) {
      case 'kpi': case 'gauge':
        return <KPIWidget key={widget.widget_key} widget={widget} data={data} onDrillDown={handleDrillDown} />;
      case 'chart':
        return <ChartWidget key={widget.widget_key} widget={widget} data={data} onDrillDown={handleDrillDown} />;
      case 'list':
        return <ListWidget key={widget.widget_key} widget={widget} data={data} onDrillDown={handleDrillDown} />;
      case 'table':
        return <TableWidget key={widget.widget_key} widget={widget} data={data} />;
      default:
        return <KPIWidget key={widget.widget_key} widget={widget} data={data} onDrillDown={handleDrillDown} />;
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>Loading dashboard...</div>;

  // Separate KPIs from larger widgets for grid layout
  const kpiWidgets = layout?.filter(l => { const w = widgets?.find(wd => wd.widget_key === l.widget); return w && (w.widget_type === 'kpi' || w.widget_type === 'gauge'); });
  const chartWidgets = layout?.filter(l => { const w = widgets?.find(wd => wd.widget_key === l.widget); return w && w.widget_type === 'chart'; });
  const listWidgets = layout?.filter(l => { const w = widgets?.find(wd => wd.widget_key === l.widget); return w && (w.widget_type === 'list' || w.widget_type === 'table'); });

  return (
    <div className="exec-dashboard" style={{ padding: '20px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937' }}>Executive Dashboard</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Real-time business intelligence • Role-based view</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowWidgetPicker(true)} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <FaCog size={12}/> Customize
          </button>
          <button onClick={loadDashboard} style={{ background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb', padding: '8px 14px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>
            Refresh
          </button>
        </div>
      </div>

      {/* Promotions Banner */}
      <PromoBanner promotions={promotions} onDismiss={handleDismiss} onAction={handlePromoAction} />

      {/* KPI Row */}
      {kpiWidgets.length > 0 && (
        <div className="exec-kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {kpiWidgets?.map(l => renderWidget(l))}
        </div>
      )}

      {/* Charts Row */}
      {chartWidgets.length > 0 && (
        <div className="exec-chart-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {chartWidgets?.map(l => renderWidget(l))}
        </div>
      )}

      {/* Lists/Tables Row */}
      {listWidgets.length > 0 && (
        <div className="exec-list-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {listWidgets?.map(l => renderWidget(l))}
        </div>
      )}

      {/* Drill-down Modal */}
      {drillDown.widget && <DrillDownModal widget={drillDown.widget} data={drillDown.data} onClose={() => setDrillDown({ widget: null, data: null })} />}

      {/* Widget Picker Modal */}
      {showWidgetPicker && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={() => setShowWidgetPicker(false)}>
          <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '600px', width: '100%', maxHeight: '80vh', overflow: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Customize Dashboard</h3>
              <button onClick={() => setShowWidgetPicker(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><FaTimes size={18}/></button>
            </div>
            <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '16px' }}>Add or remove widgets based on your permissions. Only widgets you have access to are shown.</p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {(widgets || [])?.map(w => {
                const isActive = layout?.some(l => l.widget === w.widget_key);
                const Icon = ICON_MAP[w.widget_key] || FaChartLine;
                return (
                  <div key={w.widget_key} style={{ padding: '10px', border: `1px solid ${isActive ? '#3b82f6' : '#e5e7eb'}`, borderRadius: '8px', background: isActive ? '#eff6ff' : '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Icon size={14} color={isActive ? '#3b82f6' : '#6b7280'} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', color: '#1f2937' }}>{w.title}</div>
                      <div style={{ fontSize: '10px', color: '#6b7280' }}>{w.category} • {w.widget_type}</div>
                    </div>
                    {isActive ? (
                      <button onClick={() => removeWidget(w.widget_key)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Remove</button>
                    ) : (
                      <button onClick={() => addWidget(w.widget_key)} style={{ background: '#dbeafe', color: '#3b82f6', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '10px' }}>Add</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
