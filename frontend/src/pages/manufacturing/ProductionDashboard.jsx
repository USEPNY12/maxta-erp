import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function ProductionDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await api.get('/api/manufacturing-advanced/dashboard');
      setData(res.data && typeof res.data === 'object' && !Array.isArray(res.data) ? res.data : null);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
    if (autoRefresh) {
      const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [fetchDashboard, autoRefresh]);

  if (loading) return <div className="p-6 text-center">Loading Production Dashboard...</div>;
  if (!data) return <div className="p-6 text-center text-red-500">Failed to load dashboard</div>;

  const { kpis, stationActivity, activeDowntime, recentCompletions, throughputTrend } = data;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Production Dashboard</h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1 text-sm">
            <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} className="rounded" />
            Auto-refresh (30s)
          </label>
          <button onClick={fetchDashboard} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Refresh Now
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KPICard title="Active WOs" value={kpis?.active_wos || 0} color="blue" icon="⚙️" />
        <KPICard title="Completed Today" value={kpis?.completed_today || 0} color="green" icon="✅" />
        <KPICard title="Pieces Today" value={kpis?.pieces_today || 0} color="indigo" icon="📦" />
        <KPICard title="Queued" value={kpis?.queued_wos || 0} color="yellow" icon="📋" />
        <KPICard title="Overdue" value={kpis?.overdue_wos || 0} color={kpis?.overdue_wos > 0 ? 'red' : 'gray'} icon="⚠️" />
      </div>

      {/* Station Activity Grid */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">Station Activity</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {stationActivity?.map(station => (
            <div key={station.id} className="border rounded-lg p-3 relative">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-3 h-3 rounded-full ${station.active_ops > 0 ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></span>
                <span className="font-medium text-sm">{station.code}</span>
              </div>
              <div className="text-xs text-gray-600">{station.name}</div>
              <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
                <div>
                  <div className="font-bold text-green-600">{station.active_ops}</div>
                  <div className="text-gray-400">Active</div>
                </div>
                <div>
                  <div className="font-bold text-yellow-600">{station.queued_ops}</div>
                  <div className="text-gray-400">Queue</div>
                </div>
                <div>
                  <div className="font-bold text-blue-600">{station.completed_ops}</div>
                  <div className="text-gray-400">Done</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Active Downtime Alerts */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <span className={activeDowntime?.length > 0 ? 'text-red-500' : 'text-green-500'}>
              {activeDowntime?.length > 0 ? '🔴' : '🟢'}
            </span>
            Active Downtime
          </h2>
          {activeDowntime?.length === 0 ? (
            <div className="text-center text-green-600 py-4">All stations operational</div>
          ) : (
            <div className="space-y-2">
              {activeDowntime?.map(dt => (
                <div key={dt.id} className="border border-red-200 bg-red-50 rounded p-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{dt.work_center_code} - {dt.work_center_name}</span>
                    <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{dt.reason_code}</span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1">
                    Since: {new Date(dt.downtime_start).toLocaleTimeString()} | {dt.reason_detail || 'No details'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Completions */}
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="text-lg font-semibold mb-3">Recent Completions (2h)</h2>
          {recentCompletions?.length === 0 ? (
            <div className="text-center text-gray-400 py-4">No recent completions</div>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {recentCompletions?.map(c => (
                <div key={c.id} className="flex justify-between items-center text-sm border-b py-1">
                  <span className="font-mono text-blue-600">{c.wo_number}</span>
                  <span className="text-gray-600">{c.station}</span>
                  <span className="text-xs text-gray-400">{new Date(c.actual_finish).toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Throughput Trend */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-3">7-Day Throughput Trend</h2>
        <div className="flex items-end gap-1 h-32">
          {throughputTrend?.map((day, i) => {
            const maxPieces = Math.max(...throughputTrend?.map(d => d.pieces || 0), 1);
            const height = ((day.pieces || 0) / maxPieces) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium">{day.pieces || 0}</span>
                <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%`, minHeight: '4px' }}></div>
                <span className="text-xs text-gray-400">{new Date(day.day).toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            );
          })}
          {(!throughputTrend || throughputTrend.length === 0) && (
            <div className="w-full text-center text-gray-400 py-8">No throughput data yet</div>
          )}
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, color, icon }) {
  const colors = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    gray: 'bg-gray-50 border-gray-200 text-gray-700',
  };
  return (
    <div className={`rounded-lg border p-3 ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        <span className="text-2xl font-bold">{value}</span>
      </div>
      <div className="text-xs mt-1 opacity-80">{title}</div>
    </div>
  );
}
