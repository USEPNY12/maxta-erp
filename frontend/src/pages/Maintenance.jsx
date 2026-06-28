import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaTools, FaWrench, FaCalendarCheck, FaClipboardList, FaCogs, FaExclamationTriangle, FaCheckCircle, FaClock, FaPlus } from 'react-icons/fa';

export default function Maintenance() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'dashboard') {
        const res = await api.get('/api/maintenance/dashboard');
        setData(res.data);
      } else if (tab === 'assets') {
        const res = await api.get('/api/maintenance/assets');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'schedules') {
        const res = await api.get('/api/maintenance/schedules');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'work-orders') {
        const res = await api.get('/api/maintenance/work-orders');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'parts') {
        const res = await api.get('/api/maintenance/parts');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'downtime') {
        const res = await api.get('/api/maintenance/downtime');
        setData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Maintenance load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSchema = async () => {
    try {
      await api.post('/api/maintenance/setup-schema');
      alert('Maintenance tables created and seeded successfully!');
      loadData();
    } catch (err) {
      alert('Schema setup error: ' + (err.response?.data?.error || err.message));
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaTools },
    { id: 'assets', label: 'Equipment', icon: FaCogs },
    { id: 'schedules', label: 'PM Schedules', icon: FaCalendarCheck },
    { id: 'work-orders', label: 'Work Orders', icon: FaClipboardList },
    { id: 'parts', label: 'Spare Parts', icon: FaWrench },
    { id: 'downtime', label: 'Downtime Log', icon: FaClock },
  ];

  const getStatusColor = (status) => {
    const colors = { operational: '#22c55e', maintenance: '#f59e0b', breakdown: '#ef4444', decommissioned: '#6b7280', open: '#3b82f6', in_progress: '#f59e0b', completed: '#22c55e', on_hold: '#6b7280', cancelled: '#ef4444' };
    return colors[status] || '#6b7280';
  };

  const getPriorityColor = (priority) => {
    const colors = { critical: '#ef4444', high: '#f97316', medium: '#f59e0b', low: '#22c55e' };
    return colors[priority] || '#6b7280';
  };

  const renderDashboard = () => {
    if (!data) return null;
    const stats = data.stats || {};
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.operational_count || 0}</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>Operational</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>{stats.in_maintenance_count || 0}</div>
            <div style={{ color: '#92400e', fontSize: '0.85rem' }}>In Maintenance</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.breakdown_count || 0}</div>
            <div style={{ color: '#991b1b', fontSize: '0.85rem' }}>Breakdown</div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.open_wo_count || 0}</div>
            <div style={{ color: '#1e40af', fontSize: '0.85rem' }}>Open Work Orders</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.overdue_pm_count || 0}</div>
            <div style={{ color: '#991b1b', fontSize: '0.85rem' }}>Overdue PMs</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{Math.round((stats.monthly_downtime_mins || 0) / 60)}h</div>
            <div style={{ color: '#5b21b6', fontSize: '0.85rem' }}>Monthly Downtime</div>
          </div>
        </div>

        {data.overduePM && data.overduePM.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#dc2626', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaExclamationTriangle /> Overdue PM Tasks</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#fef2f2' }}><th style={{ padding: '8px', textAlign: 'left' }}>Asset</th><th style={{ padding: '8px', textAlign: 'left' }}>Task</th><th style={{ padding: '8px' }}>Due Date</th><th style={{ padding: '8px' }}>Priority</th></tr></thead>
              <tbody>
                {data.overduePM.map(pm => (
                  <tr key={pm.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                    <td style={{ padding: '8px' }}>{pm.asset_name} ({pm.asset_code})</td>
                    <td style={{ padding: '8px' }}>{pm.schedule_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{pm.next_due?.split('T')[0]}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getPriorityColor(pm.priority), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{pm.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.upcomingPM && data.upcomingPM.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ color: '#2563eb', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaCalendarCheck /> Upcoming PM (Next 14 Days)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#eff6ff' }}><th style={{ padding: '8px', textAlign: 'left' }}>Asset</th><th style={{ padding: '8px', textAlign: 'left' }}>Task</th><th style={{ padding: '8px' }}>Due Date</th><th style={{ padding: '8px' }}>Priority</th></tr></thead>
              <tbody>
                {data.upcomingPM.map(pm => (
                  <tr key={pm.id} style={{ borderBottom: '1px solid #dbeafe' }}>
                    <td style={{ padding: '8px' }}>{pm.asset_name} ({pm.asset_code})</td>
                    <td style={{ padding: '8px' }}>{pm.schedule_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{pm.next_due?.split('T')[0]}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getPriorityColor(pm.priority), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{pm.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.lowParts && data.lowParts.length > 0 && (
          <div>
            <h3 style={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaExclamationTriangle /> Low Stock Parts</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#fffbeb' }}><th style={{ padding: '8px', textAlign: 'left' }}>Part #</th><th style={{ padding: '8px', textAlign: 'left' }}>Name</th><th style={{ padding: '8px' }}>On Hand</th><th style={{ padding: '8px' }}>Reorder Point</th><th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th></tr></thead>
              <tbody>
                {data.lowParts.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #fde68a' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.part_number}</td>
                    <td style={{ padding: '8px' }}>{p.name}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: p.qty_on_hand === 0 ? '#dc2626' : '#d97706', fontWeight: 'bold' }}>{p.qty_on_hand}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{p.reorder_point}</td>
                    <td style={{ padding: '8px' }}>{p.supplier}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderAssets = () => {
    if (!Array.isArray(data)) return null;
    return (
      <div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Code</th><th style={{ padding: '8px', textAlign: 'left' }}>Name</th><th style={{ padding: '8px' }}>Category</th><th style={{ padding: '8px' }}>Location</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Criticality</th></tr></thead>
          <tbody>
            {data.map(a => (
              <tr key={a.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ padding: '8px', fontFamily: 'monospace' }}>{a.asset_code}</td>
                <td style={{ padding: '8px', fontWeight: '500' }}>{a.name}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{a.category?.replace(/_/g, ' ')}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}>{a.location}</td>
                <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(a.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{a.status}</span></td>
                <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getPriorityColor(a.criticality), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{a.criticality}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderSchedules = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Asset</th><th style={{ padding: '8px', textAlign: 'left' }}>Task</th><th style={{ padding: '8px' }}>Frequency</th><th style={{ padding: '8px' }}>Next Due</th><th style={{ padding: '8px' }}>Priority</th><th style={{ padding: '8px' }}>Shutdown?</th></tr></thead>
        <tbody>
          {data.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0', background: s.next_due && new Date(s.next_due) < new Date() ? '#fef2f2' : 'transparent' }}>
              <td style={{ padding: '8px' }}>{s.asset_name} ({s.asset_code})</td>
              <td style={{ padding: '8px' }}>{s.schedule_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.frequency_days ? `Every ${s.frequency_days} days` : 'Runtime-based'}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.next_due?.split('T')[0]}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getPriorityColor(s.priority), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.priority}</span></td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.requires_shutdown ? '⚠️ Yes' : 'No'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderWorkOrders = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>WO #</th><th style={{ padding: '8px', textAlign: 'left' }}>Asset</th><th style={{ padding: '8px' }}>Type</th><th style={{ padding: '8px' }}>Priority</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px', textAlign: 'left' }}>Assigned To</th><th style={{ padding: '8px', textAlign: 'left' }}>Title</th></tr></thead>
        <tbody>
          {data.map(wo => (
            <tr key={wo.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{wo.wo_number}</td>
              <td style={{ padding: '8px' }}>{wo.asset_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{wo.type}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getPriorityColor(wo.priority), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{wo.priority}</span></td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(wo.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{wo.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px' }}>{wo.assigned_to || '-'}</td>
              <td style={{ padding: '8px' }}>{wo.title}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderParts = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Part #</th><th style={{ padding: '8px', textAlign: 'left' }}>Name</th><th style={{ padding: '8px' }}>Category</th><th style={{ padding: '8px' }}>Qty</th><th style={{ padding: '8px' }}>Reorder Pt</th><th style={{ padding: '8px' }}>Cost</th><th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th></tr></thead>
        <tbody>
          {data.map(p => (
            <tr key={p.id} style={{ borderBottom: '1px solid #e2e8f0', background: p.qty_on_hand <= p.reorder_point ? '#fffbeb' : 'transparent' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{p.part_number}</td>
              <td style={{ padding: '8px' }}>{p.name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{p.category}</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold', color: p.qty_on_hand <= p.reorder_point ? '#d97706' : '#16a34a' }}>{p.qty_on_hand}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{p.reorder_point}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>${p.unit_cost?.toFixed(2)}</td>
              <td style={{ padding: '8px' }}>{p.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderDowntime = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Asset</th><th style={{ padding: '8px' }}>Reason</th><th style={{ padding: '8px' }}>Started</th><th style={{ padding: '8px' }}>Ended</th><th style={{ padding: '8px' }}>Duration</th><th style={{ padding: '8px', textAlign: 'left' }}>Notes</th></tr></thead>
        <tbody>
          {data.map(d => (
            <tr key={d.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px' }}>{d.asset_name} ({d.asset_code})</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{d.reason?.replace(/_/g, ' ')}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{d.started_at?.replace('T', ' ').slice(0, 16)}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{d.ended_at ? d.ended_at.replace('T', ' ').slice(0, 16) : <span style={{ color: '#dc2626' }}>Ongoing</span>}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{d.duration_minutes ? `${d.duration_minutes} min` : '-'}</td>
              <td style={{ padding: '8px' }}>{d.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaTools /> Preventive Maintenance (CMMS)</h1>
        <button onClick={setupSchema} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <FaPlus style={{ marginRight: '4px' }} /> Initialize Tables
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '8px 16px', border: tab === t.id ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '6px', background: tab === t.id ? '#eff6ff' : '#fff', color: tab === t.id ? '#1d4ed8' : '#374151', cursor: 'pointer', fontWeight: tab === t.id ? '600' : '400', fontSize: '0.85rem' }}>
            <t.icon /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
      
      {!loading && !error && (
        <>
          {tab === 'dashboard' && renderDashboard()}
          {tab === 'assets' && renderAssets()}
          {tab === 'schedules' && renderSchedules()}
          {tab === 'work-orders' && renderWorkOrders()}
          {tab === 'parts' && renderParts()}
          {tab === 'downtime' && renderDowntime()}
        </>
      )}
    </div>
  );
}
