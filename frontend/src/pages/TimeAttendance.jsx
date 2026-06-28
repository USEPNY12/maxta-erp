import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaClock, FaUserClock, FaCalendarAlt, FaChartBar, FaSignInAlt, FaSignOutAlt, FaPlus } from 'react-icons/fa';

export default function TimeAttendance() {
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
        const res = await api.get('/api/time-attendance/dashboard');
        setData(res.data);
      } else if (tab === 'entries') {
        const res = await api.get('/api/time-attendance/entries');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'employees') {
        const res = await api.get('/api/time-attendance/employees');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'shifts') {
        const res = await api.get('/api/time-attendance/shifts');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'reports') {
        const res = await api.get('/api/time-attendance/reports/weekly');
        setData(res.data);
      }
    } catch (err) {
      console.error('Time & Attendance load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSchema = async () => {
    try {
      await api.post('/api/time-attendance/setup-schema');
      alert('Time & Attendance tables created and seeded successfully!');
      loadData();
    } catch (err) {
      alert('Schema setup error: ' + (err.response?.data?.error || err.message));
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaClock },
    { id: 'entries', label: 'Time Entries', icon: FaUserClock },
    { id: 'employees', label: 'Employees', icon: FaSignInAlt },
    { id: 'shifts', label: 'Shifts', icon: FaCalendarAlt },
    { id: 'reports', label: 'Reports', icon: FaChartBar },
  ];

  const getStatusColor = (status) => {
    const colors = { clocked_in: '#22c55e', clocked_out: '#6b7280', on_break: '#f59e0b', absent: '#ef4444', late: '#f97316', active: '#22c55e', inactive: '#6b7280' };
    return colors[status] || '#6b7280';
  };

  const formatHours = (minutes) => {
    if (!minutes) return '0:00';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}:${String(m).padStart(2, '0')}`;
  };

  const renderDashboard = () => {
    if (!data) return null;
    const stats = data.stats || {};
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.clocked_in || 0}</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>Currently Clocked In</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>{stats.on_break || 0}</div>
            <div style={{ color: '#92400e', fontSize: '0.85rem' }}>On Break</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>{stats.absent_today || 0}</div>
            <div style={{ color: '#991b1b', fontSize: '0.85rem' }}>Absent Today</div>
          </div>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.total_employees || 0}</div>
            <div style={{ color: '#1e40af', fontSize: '0.85rem' }}>Total Employees</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>{stats.overtime_hours || 0}h</div>
            <div style={{ color: '#5b21b6', fontSize: '0.85rem' }}>Overtime This Week</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.attendance_rate || 0}%</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>Attendance Rate</div>
          </div>
        </div>

        {data.currentlyIn && data.currentlyIn.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaSignInAlt style={{ color: '#16a34a' }} /> Currently Clocked In</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#f0fdf4' }}><th style={{ padding: '8px', textAlign: 'left' }}>Employee</th><th style={{ padding: '8px' }}>Department</th><th style={{ padding: '8px' }}>Clock In</th><th style={{ padding: '8px' }}>Hours Today</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
              <tbody>
                {data.currentlyIn.map(e => (
                  <tr key={e.id} style={{ borderBottom: '1px solid #dcfce7' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{e.employee_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.department}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.clock_in_time}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.hours_today}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(e.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{e.status?.replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.lateArrivals && data.lateArrivals.length > 0 && (
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f97316' }}><FaUserClock /> Late Arrivals Today</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#fff7ed' }}><th style={{ padding: '8px', textAlign: 'left' }}>Employee</th><th style={{ padding: '8px' }}>Scheduled</th><th style={{ padding: '8px' }}>Actual</th><th style={{ padding: '8px' }}>Late By</th></tr></thead>
              <tbody>
                {data.lateArrivals.map((e, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #fed7aa' }}>
                    <td style={{ padding: '8px' }}>{e.employee_name}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.scheduled_time}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{e.actual_time}</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: '#ea580c', fontWeight: 'bold' }}>{e.late_minutes} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  const renderEntries = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Employee</th><th style={{ padding: '8px' }}>Date</th><th style={{ padding: '8px' }}>Clock In</th><th style={{ padding: '8px' }}>Clock Out</th><th style={{ padding: '8px' }}>Regular</th><th style={{ padding: '8px' }}>Overtime</th><th style={{ padding: '8px' }}>Break</th><th style={{ padding: '8px' }}>Total</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
        <tbody>
          {data.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontWeight: '500' }}>{e.employee_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.work_date?.split('T')[0]}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.clock_in?.slice(11, 16) || '-'}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.clock_out?.slice(11, 16) || <span style={{ color: '#16a34a' }}>Active</span>}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{formatHours(e.regular_minutes)}</td>
              <td style={{ padding: '8px', textAlign: 'center', color: e.overtime_minutes > 0 ? '#dc2626' : 'inherit' }}>{formatHours(e.overtime_minutes)}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{formatHours(e.break_minutes)}</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{formatHours(e.total_minutes)}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(e.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{e.status?.replace(/_/g, ' ')}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderEmployees = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Employee #</th><th style={{ padding: '8px', textAlign: 'left' }}>Name</th><th style={{ padding: '8px' }}>Department</th><th style={{ padding: '8px' }}>Shift</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Hours This Week</th><th style={{ padding: '8px' }}>Hire Date</th></tr></thead>
        <tbody>
          {data.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{e.employee_number}</td>
              <td style={{ padding: '8px', fontWeight: '500' }}>{e.name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.department}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.shift_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(e.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{e.status}</span></td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{e.hours_this_week || 0}h</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{e.hire_date?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderShifts = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Shift Name</th><th style={{ padding: '8px' }}>Start</th><th style={{ padding: '8px' }}>End</th><th style={{ padding: '8px' }}>Break (min)</th><th style={{ padding: '8px' }}>Days</th><th style={{ padding: '8px' }}>Employees</th><th style={{ padding: '8px' }}>Status</th></tr></thead>
        <tbody>
          {data.map(s => (
            <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontWeight: '500' }}>{s.shift_name}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.start_time}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.end_time}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.break_duration}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.work_days}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{s.employee_count}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(s.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{s.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderReports = () => {
    if (!data) return null;
    const report = data;
    return (
      <div>
        <h3>Weekly Summary</h3>
        {report.summary && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.summary.total_hours || 0}h</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Total Hours</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.summary.regular_hours || 0}h</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Regular Hours</div>
            </div>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626' }}>{report.summary.overtime_hours || 0}h</div>
              <div style={{ fontSize: '0.8rem', color: '#991b1b' }}>Overtime Hours</div>
            </div>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{report.summary.attendance_rate || 0}%</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Attendance Rate</div>
            </div>
          </div>
        )}
        {report.byDepartment && report.byDepartment.length > 0 && (
          <div>
            <h4>Hours by Department</h4>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Department</th><th style={{ padding: '8px' }}>Employees</th><th style={{ padding: '8px' }}>Regular</th><th style={{ padding: '8px' }}>Overtime</th><th style={{ padding: '8px' }}>Total</th><th style={{ padding: '8px' }}>Avg/Employee</th></tr></thead>
              <tbody>
                {report.byDepartment.map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontWeight: '500' }}>{d.department}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{d.employee_count}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{d.regular_hours}h</td>
                    <td style={{ padding: '8px', textAlign: 'center', color: d.overtime_hours > 0 ? '#dc2626' : 'inherit' }}>{d.overtime_hours}h</td>
                    <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>{d.total_hours}h</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{d.avg_per_employee}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaClock /> Time & Attendance</h1>
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
          {tab === 'entries' && renderEntries()}
          {tab === 'employees' && renderEmployees()}
          {tab === 'shifts' && renderShifts()}
          {tab === 'reports' && renderReports()}
        </>
      )}
    </div>
  );
}
