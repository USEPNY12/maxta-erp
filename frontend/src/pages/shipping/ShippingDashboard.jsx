import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ShippingDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [freightSummary, setFreightSummary] = useState(null);

  useEffect(() => { loadDashboard(); loadFreight(); }, []);

  const loadDashboard = async () => {
    try { const r = await api.get('/shipping/dashboard'); setDashboard(r.data); } catch(e) { console.error(e); }
  };
  const loadFreight = async () => {
    try { const r = await api.get('/shipping/freight/summary?period=month'); setFreightSummary(r.data); } catch(e) { console.error(e); }
  };

  if (!dashboard) return <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af' }}>Loading...</div>;

  const kpiCards = [
    { label: "Today's Routes", value: dashboard.today.routes.total, sub: `${dashboard.today.routes.active} active, ${dashboard.today.routes.completed} done`, color: '#3b82f6' },
    { label: "Today's Stops", value: dashboard.today.stops.total, sub: `${dashboard.today.stops.delivered} delivered, ${dashboard.today.stops.pending} pending`, color: '#10b981' },
    { label: 'Active Drivers', value: dashboard.activeDrivers.length, sub: 'Currently on route', color: '#f59e0b' },
    { label: 'Week Freight Cost', value: `$${parseFloat(dashboard.weekFreightCost || 0).toLocaleString()}`, sub: 'Last 7 days', color: '#8b5cf6' },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Shipping & Logistics Dashboard</h1>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {kpiCards?.map((kpi, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px', borderLeft: `4px solid ${kpi.color}` }}>
            <div style={{ fontSize: '13px', color: '#6b7280', marginBottom: '4px' }}>{kpi.label}</div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: '#111827' }}>{kpi.value}</div>
            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Active Drivers */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Active Drivers</h2>
          {dashboard.activeDrivers.length > 0 ? dashboard.activeDrivers?.map(driver => (
            <div key={driver.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', borderRadius: '6px', background: '#f9fafb', marginBottom: '8px' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '14px' }}>{driver.employee_name}</div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>{driver.route_number} - {driver.route_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#10b981' }}>{driver.stops_done}/{driver.total_stops}</div>
                <div style={{ fontSize: '11px', color: '#6b7280' }}>stops done</div>
              </div>
            </div>
          )) : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No active drivers</div>}
        </div>

        {/* Rack Status */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Rack Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '8px' }}>
            {dashboard.racks?.map((rack, i) => (
              <div key={i} style={{ padding: '10px', borderRadius: '6px', border: '1px solid #e5e7eb', textAlign: 'center' }}>
                <div style={{ fontWeight: '700', fontSize: '14px' }}>{rack.rack_code}</div>
                <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'capitalize' }}>{rack.rack_type.replace('_', ' ')}</div>
                <div style={{ fontSize: '11px', marginTop: '4px', color: rack.load_status ? '#f59e0b' : '#10b981', fontWeight: '600' }}>
                  {rack.load_status ? `${rack.load_status} (${rack.total_pieces} pcs)` : 'Available'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Freight Cost Breakdown */}
        {freightSummary && (
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Freight Costs (30 Days)</h2>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '24px', fontWeight: '700' }}>${parseFloat(freightSummary.totals?.total_cost || 0).toLocaleString()}</div>
              <div style={{ fontSize: '12px', color: '#6b7280' }}>
                {freightSummary.totals?.total_routes || 0} routes | {parseFloat(freightSummary.totals?.total_miles || 0).toLocaleString()} miles | {parseFloat(freightSummary.totals?.total_fuel || 0).toFixed(0)} gal
              </div>
            </div>
            {freightSummary.byType?.map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '13px', textTransform: 'capitalize' }}>{item.cost_type}</span>
                <span style={{ fontSize: '13px', fontWeight: '600' }}>${parseFloat(item.total).toLocaleString()}</span>
              </div>
            ))}
            {(!freightSummary.byType || freightSummary.byType.length === 0) && <div style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>No freight costs recorded</div>}
          </div>
        )}

        {/* Delivery Zones */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px' }}>Quick Actions</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a href="/shipping/routes" style={{ display: 'block', padding: '12px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', textDecoration: 'none', fontWeight: '500' }}>
              Plan New Route →
            </a>
            <a href="/shipping/rack-loading" style={{ display: 'block', padding: '12px', borderRadius: '6px', background: '#f0fdf4', color: '#16a34a', textDecoration: 'none', fontWeight: '500' }}>
              Load Rack →
            </a>
            <a href="/shipping/freight" style={{ display: 'block', padding: '12px', borderRadius: '6px', background: '#faf5ff', color: '#7c3aed', textDecoration: 'none', fontWeight: '500' }}>
              Record Freight Cost →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
