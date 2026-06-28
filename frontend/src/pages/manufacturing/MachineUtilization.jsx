import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function MachineUtilization() {
  const [tab, setTab] = useState('oee');
  const [summary, setSummary] = useState([]);
  const [downtime, setDowntime] = useState([]);
  const [paretoData, setParetoData] = useState([]);
  const [logs, setLogs] = useState([]);
  const [showLogForm, setShowLogForm] = useState(false);
  const [showDowntimeForm, setShowDowntimeForm] = useState(false);
  const [workCenters, setWorkCenters] = useState([]);
  const [logForm, setLogForm] = useState({ work_center_id: '', log_date: new Date().toISOString().split('T')[0], shift: 'day', available_hours: 8, productive_hours: 0, setup_hours: 0, idle_hours: 0, downtime_hours: 0, total_pieces_produced: 0, total_sqft_produced: 0, scrap_pieces: 0 });
  const [dtForm, setDtForm] = useState({ work_center_id: '', reason_code: 'breakdown', reason_detail: '', severity: 'medium', downtime_start: new Date().toISOString()?.slice(0, 16) });

  useEffect(() => {
    fetchAll();
  }, []);

  async function fetchAll() {
    try {
      const [sumRes, dtRes, paretoRes, logRes, wcRes] = await Promise.all([
        api.get('/api/manufacturing-advanced/utilization/summary', { params: { days: 30 } }),
        api.get('/api/manufacturing-advanced/downtime'),
        api.get('/api/manufacturing-advanced/downtime/analysis', { params: { days: 30 } }),
        api.get('/api/manufacturing-advanced/utilization', { params: { start_date: addDays(-7) } }),
        api.get('/api/manufacturing/work-centers')
      ]);
      setSummary(Array.isArray(sumRes.data) ? sumRes.data : []);
      setDowntime(Array.isArray(dtRes.data) ? dtRes.data : []);
      setParetoData(Array.isArray(paretoRes.data) ? paretoRes.data : []);
      setLogs(Array.isArray(logRes.data) ? logRes.data : []);
      setWorkCenters(Array.isArray(wcRes.data) ? wcRes.data : []);
    } catch (err) { console.error(err); }
  }

  function addDays(days) { return new Date(Date.now() + days * 86400000).toISOString().split('T')[0]; }

  async function submitLog(e) {
    e.preventDefault();
    try {
      await api.post('/api/manufacturing-advanced/utilization', logForm);
      setShowLogForm(false);
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function submitDowntime(e) {
    e.preventDefault();
    try {
      await api.post('/api/manufacturing-advanced/downtime', dtForm);
      setShowDowntimeForm(false);
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function resolveDowntime(id) {
    const notes = prompt('Resolution notes:');
    if (notes === null) return;
    try {
      await api.put(`/api/manufacturing-advanced/downtime/${id}/resolve`, { resolution_notes: notes });
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Machine Utilization & OEE</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowLogForm(true)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ Log Utilization</button>
          <button onClick={() => setShowDowntimeForm(true)} className="px-3 py-1 bg-red-600 text-white rounded text-sm">+ Log Downtime</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[['oee', 'OEE Summary'], ['downtime', 'Downtime Events'], ['pareto', 'Pareto Analysis'], ['history', 'Utilization History']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* OEE Summary Tab */}
      {tab === 'oee' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary?.map(wc => (
            <div key={wc.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">{wc.code} - {wc.name}</h3>
                <OEEBadge value={wc.avg_oee} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <Stat label="Avg Efficiency" value={`${wc.avg_efficiency || 0}%`} />
                <Stat label="Avg OEE" value={`${wc.avg_oee || 0}%`} />
                <Stat label="Productive Hrs" value={wc.total_productive_hours || 0} />
                <Stat label="Downtime Hrs" value={wc.total_downtime_hours || 0} />
                <Stat label="Total Pieces" value={wc.total_pieces || 0} />
                <Stat label="Scrap Rate" value={`${wc.scrap_rate || 0}%`} />
              </div>
              {/* OEE Gauge */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className={`h-3 rounded-full ${getOEEColor(wc.avg_oee)}`} style={{ width: `${Math.min(wc.avg_oee || 0, 100)}%` }}></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Downtime Events Tab */}
      {tab === 'downtime' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Station</th>
                <th className="px-3 py-2 text-left">Reason</th>
                <th className="px-3 py-2 text-left">Start</th>
                <th className="px-3 py-2 text-left">Duration</th>
                <th className="px-3 py-2 text-left">Severity</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {downtime?.map(dt => (
                <tr key={dt.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-medium">{dt.work_center_code}</td>
                  <td className="px-3 py-2"><span className="bg-gray-100 px-2 py-0.5 rounded text-xs">{dt.reason_code}</span></td>
                  <td className="px-3 py-2 text-xs">{new Date(dt.downtime_start).toLocaleString()}</td>
                  <td className="px-3 py-2">{dt.duration_minutes ? `${Math.round(dt.duration_minutes)} min` : 'Ongoing'}</td>
                  <td className="px-3 py-2"><SeverityBadge severity={dt.severity} /></td>
                  <td className="px-3 py-2">{dt.downtime_end ? '✅ Resolved' : '🔴 Active'}</td>
                  <td className="px-3 py-2 text-center">
                    {!dt.downtime_end && (
                      <button onClick={() => resolveDowntime(dt.id)} className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">Resolve</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pareto Analysis Tab */}
      {tab === 'pareto' && (
        <div className="bg-white rounded-lg shadow p-4">
          <h2 className="font-semibold mb-3">Downtime Pareto (Last 30 Days)</h2>
          <div className="space-y-2">
            {paretoData?.map((item, i) => {
              const maxMinutes = Math.max(...paretoData?.map(p => p.total_minutes || 0), 1);
              const pct = ((item.total_minutes || 0) / maxMinutes) * 100;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-32 text-sm font-medium">{item.reason_code}</span>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div className="bg-red-500 h-6 rounded-full flex items-center px-2" style={{ width: `${pct}%` }}>
                      <span className="text-white text-xs font-bold">{Math.round(item.total_minutes || 0)} min</span>
                    </div>
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">{item.event_count} events</span>
                </div>
              );
            })}
            {paretoData.length === 0 && <div className="text-center text-gray-400 py-8">No downtime data recorded yet</div>}
          </div>
        </div>
      )}

      {/* Utilization History Tab */}
      {tab === 'history' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Date</th>
                <th className="px-3 py-2 text-left">Station</th>
                <th className="px-3 py-2">Shift</th>
                <th className="px-3 py-2">Productive</th>
                <th className="px-3 py-2">Downtime</th>
                <th className="px-3 py-2">Pieces</th>
                <th className="px-3 py-2">Efficiency</th>
                <th className="px-3 py-2">OEE</th>
              </tr>
            </thead>
            <tbody>
              {logs?.map(log => (
                <tr key={log.id} className="border-t">
                  <td className="px-3 py-2">{new Date(log.log_date).toLocaleDateString()}</td>
                  <td className="px-3 py-2 font-medium">{log.work_center_code}</td>
                  <td className="px-3 py-2 text-center">{log.shift}</td>
                  <td className="px-3 py-2 text-center">{log.productive_hours}h</td>
                  <td className="px-3 py-2 text-center">{log.downtime_hours}h</td>
                  <td className="px-3 py-2 text-center">{log.total_pieces_produced}</td>
                  <td className="px-3 py-2 text-center">{log.efficiency_percent}%</td>
                  <td className="px-3 py-2 text-center"><OEEBadge value={log.oee_percent} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Log Utilization Modal */}
      {showLogForm && (
        <Modal title="Log Utilization" onClose={() => setShowLogForm(false)}>
          <form onSubmit={submitLog} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Work Center</label>
                <select value={logForm.work_center_id} onChange={e => setLogForm(f => ({ ...f, work_center_id: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required>
                  <option value="">Select...</option>
                  {workCenters?.map(wc => <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Date</label>
                <input type="date" value={logForm.log_date} onChange={e => setLogForm(f => ({ ...f, log_date: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required />
              </div>
              <div>
                <label className="text-xs font-medium">Shift</label>
                <select value={logForm.shift} onChange={e => setLogForm(f => ({ ...f, shift: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="day">Day</option><option value="evening">Evening</option><option value="night">Night</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Available Hours</label>
                <input type="number" step="0.5" value={logForm.available_hours} onChange={e => setLogForm(f => ({ ...f, available_hours: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Productive Hours</label>
                <input type="number" step="0.25" value={logForm.productive_hours} onChange={e => setLogForm(f => ({ ...f, productive_hours: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Setup Hours</label>
                <input type="number" step="0.25" value={logForm.setup_hours} onChange={e => setLogForm(f => ({ ...f, setup_hours: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Downtime Hours</label>
                <input type="number" step="0.25" value={logForm.downtime_hours} onChange={e => setLogForm(f => ({ ...f, downtime_hours: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Pieces Produced</label>
                <input type="number" value={logForm.total_pieces_produced} onChange={e => setLogForm(f => ({ ...f, total_pieces_produced: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">Scrap Pieces</label>
                <input type="number" value={logForm.scrap_pieces} onChange={e => setLogForm(f => ({ ...f, scrap_pieces: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
              <div>
                <label className="text-xs font-medium">SqFt Produced</label>
                <input type="number" step="0.01" value={logForm.total_sqft_produced} onChange={e => setLogForm(f => ({ ...f, total_sqft_produced: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-medium">Save Utilization Log</button>
          </form>
        </Modal>
      )}

      {/* Log Downtime Modal */}
      {showDowntimeForm && (
        <Modal title="Log Downtime Event" onClose={() => setShowDowntimeForm(false)}>
          <form onSubmit={submitDowntime} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium">Work Center</label>
                <select value={dtForm.work_center_id} onChange={e => setDtForm(f => ({ ...f, work_center_id: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required>
                  <option value="">Select...</option>
                  {workCenters?.map(wc => <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Reason Code</label>
                <select value={dtForm.reason_code} onChange={e => setDtForm(f => ({ ...f, reason_code: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="breakdown">Breakdown</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="changeover">Changeover</option>
                  <option value="material_wait">Material Wait</option>
                  <option value="operator_wait">Operator Wait</option>
                  <option value="quality_hold">Quality Hold</option>
                  <option value="power_outage">Power Outage</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Severity</label>
                <select value={dtForm.severity} onChange={e => setDtForm(f => ({ ...f, severity: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                  <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium">Start Time</label>
                <input type="datetime-local" value={dtForm.downtime_start} onChange={e => setDtForm(f => ({ ...f, downtime_start: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium">Details</label>
              <textarea value={dtForm.reason_detail} onChange={e => setDtForm(f => ({ ...f, reason_detail: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" rows={2}></textarea>
            </div>
            <button type="submit" className="w-full py-2 bg-red-600 text-white rounded font-medium">Log Downtime</button>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-semibold">{value}</div>
    </div>
  );
}

function OEEBadge({ value }) {
  const v = parseFloat(value) || 0;
  const color = v >= 85 ? 'bg-green-100 text-green-700' : v >= 65 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded text-xs font-bold ${color}`}>{v}%</span>;
}

function SeverityBadge({ severity }) {
  const colors = { low: 'bg-gray-100 text-gray-600', medium: 'bg-yellow-100 text-yellow-700', high: 'bg-orange-100 text-orange-700', critical: 'bg-red-100 text-red-700' };
  return <span className={`px-2 py-0.5 rounded text-xs ${colors[severity] || colors.medium}`}>{severity}</span>;
}

function getOEEColor(value) {
  const v = parseFloat(value) || 0;
  if (v >= 85) return 'bg-green-500';
  if (v >= 65) return 'bg-yellow-500';
  return 'bg-red-500';
}
