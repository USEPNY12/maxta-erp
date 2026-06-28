import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaHardHat, FaMapMarkerAlt, FaUserTie, FaCalendarAlt, FaClipboardCheck, FaTruck, FaPlus } from 'react-icons/fa';

export default function FieldService() {
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
        const res = await api.get('/api/field-service/dashboard');
        setData(res.data);
      } else if (tab === 'jobs') {
        const res = await api.get('/api/field-service/jobs');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'crews') {
        const res = await api.get('/api/field-service/crews');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'visits') {
        const res = await api.get('/api/field-service/visits');
        setData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Field Service load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSchema = async () => {
    try {
      await api.post('/api/field-service/setup-schema');
      alert('Field Service tables created and seeded successfully!');
      loadData();
    } catch (err) {
      alert('Schema setup error: ' + (err.response?.data?.error || err.message));
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaHardHat },
    { id: 'jobs', label: 'Install Jobs', icon: FaClipboardCheck },
    { id: 'crews', label: 'Field Crews', icon: FaUserTie },
    { id: 'visits', label: 'Site Visits', icon: FaMapMarkerAlt },
  ];

  const getStatusColor = (status) => {
    const colors = { scheduled: '#3b82f6', in_progress: '#f59e0b', completed: '#22c55e', on_hold: '#6b7280', cancelled: '#ef4444', pending: '#8b5cf6', available: '#22c55e', on_site: '#f59e0b', off_duty: '#6b7280' };
    return colors[status] || '#6b7280';
  };

  const renderDashboard = () => {
    if (!data) return null;
    const stats = data.stats || {};
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.active_jobs || 0}</div>
            <div style={{ color: '#1e40af', fontSize: '0.85rem' }}>Active Jobs</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.completed_this_month || 0}</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>Completed This Month</div>
          </div>
          <div style={{ background: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ca8a04' }}>{stats.crews_on_site || 0}</div>
            <div style={{ color: '#854d0e', fontSize: '0.85rem' }}>Crews On Site</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{stats.pending_signoffs || 0}</div>
            <div style={{ color: '#5b21b6', fontSize: '0.85rem' }}>Pending Sign-offs</div>
          </div>
        </div>

        {data.todayVisits && data.todayVisits.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaCalendarAlt /> Today's Site Visits</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Job</th><th style={{ padding: '8px', textAlign: 'left' }}>Site</th><th style={{ padding: '8px', textAlign: 'left' }}>Crew</th><th style={{ padding: '8px' }}>Time</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
              <tbody>
                {data.todayVisits.map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px' }}>{v.job_name}</td>
                    <td style={{ padding: '8px' }}>{v.site_address}</td>
                    <td style={{ padding: '8px' }}>{v.crew_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{v.scheduled_time}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(v.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{v.status?.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.recentJobs && data.recentJobs.length > 0 && (
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaTruck /> Recent Jobs</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Job #</th><th style={{ padding: '8px', textAlign: 'left' }}>Project</th><th style={{ padding: '8px', textAlign: 'left' }}>Customer</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Phase</th></tr></thead>
              <tbody>
                {data.recentJobs.map(j => (
                  <tr key={j.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{j.job_number}</td>
                    <td style={{ padding: '8px' }}>{j.project_name}</td>
                    <td style={{ padding: '8px' }}>{j.customer_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(j.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{j.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{j.current_phase}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderJobs = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Job #</th><th style={{ padding: '8px', textAlign: 'left' }}>Project</th><th style={{ padding: '8px', textAlign: 'left' }}>Customer</th><th style={{ padding: '8px', textAlign: 'left' }}>Site Address</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Start</th><th style={{ padding: '8px' }}>Est. Complete</th></tr></thead>
        <tbody>
          {data.map(j => (
            <tr key={j.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{j.job_number}</td>
              <td style={{ padding: '8px', fontWeight: '500' }}>{j.project_name}</td>
              <td style={{ padding: '8px' }}>{j.customer_name}</td>
              <td style={{ padding: '8px' }}>{j.site_address}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(j.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{j.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{j.start_date?.split('T')[0]}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{j.estimated_completion?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderCrews = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Crew Name</th><th style={{ padding: '8px', textAlign: 'left' }}>Lead</th><th style={{ padding: '8px' }}>Members</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px', textAlign: 'left' }}>Current Job</th><th style={{ padding: '8px', textAlign: 'left' }}>Vehicle</th></tr></thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontWeight: '500' }}>{c.crew_name}</td>
              <td style={{ padding: '8px' }}>{c.lead_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{c.member_count}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(c.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{c.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px' }}>{c.current_job || '-'}</td>
              <td style={{ padding: '8px' }}>{c.vehicle || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderVisits = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Date</th><th style={{ padding: '8px', textAlign: 'left' }}>Job</th><th style={{ padding: '8px', textAlign: 'left' }}>Site</th><th style={{ padding: '8px', textAlign: 'left' }}>Crew</th><th style={{ padding: '8px' }}>Purpose</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px', textAlign: 'left' }}>Notes</th></tr></thead>
        <tbody>
          {data.map(v => (
            <tr key={v.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px' }}>{v.visit_date?.split('T')[0]}</td>
              <td style={{ padding: '8px' }}>{v.job_name}</td>
              <td style={{ padding: '8px' }}>{v.site_address}</td>
              <td style={{ padding: '8px' }}>{v.crew_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{v.purpose}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(v.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{v.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.notes || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaHardHat /> Field Service & Installation</h1>
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
          {tab === 'jobs' && renderJobs()}
          {tab === 'crews' && renderCrews()}
          {tab === 'visits' && renderVisits()}
        </>
      )}
    </div>
  );
}
