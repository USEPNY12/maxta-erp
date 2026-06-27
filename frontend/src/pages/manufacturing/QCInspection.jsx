import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function QCInspection() {
  const [tab, setTab] = useState('inspect');
  const [checkpoints, setCheckpoints] = useState([]);
  const [results, setResults] = useState([]);
  const [summary, setSummary] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [selectedWC, setSelectedWC] = useState('');
  const [inspectionMode, setInspectionMode] = useState(false);
  const [inspectionData, setInspectionData] = useState(null);
  const [inspectionResults, setInspectionResults] = useState([]);
  const [woRoutingId, setWoRoutingId] = useState('');
  const [showAddCheckpoint, setShowAddCheckpoint] = useState(false);
  const [cpForm, setCpForm] = useState({ work_center_id: '', checkpoint_name: '', checkpoint_code: '', inspection_type: 'visual', measurement_type: 'pass_fail', is_critical: false, sequence: 10, instructions: '' });

  useEffect(() => { fetchAll(); }, []);

  async function fetchAll() {
    try {
      const [cpRes, resRes, sumRes, wcRes] = await Promise.all([
        api.get('/manufacturing-advanced/qc/checkpoints'),
        api.get('/manufacturing-advanced/qc/results', { params: { limit: 50 } }),
        api.get('/manufacturing-advanced/qc/summary'),
        api.get('/manufacturing/work-centers')
      ]);
      setCheckpoints(cpRes.data);
      setResults(resRes.data);
      setSummary(sumRes.data);
      setWorkCenters(wcRes.data);
    } catch (err) { console.error(err); }
  }

  async function startInspection() {
    if (!woRoutingId) { alert('Enter a WO Routing ID'); return; }
    try {
      const res = await api.get(`/manufacturing-advanced/qc/inspect/${woRoutingId}`);
      setInspectionData(res.data);
      setInspectionResults(res.data.checkpoints.map(cp => ({
        checkpoint_id: cp.id,
        result: res.data.existing_results.find(r => r.checkpoint_id === cp.id)?.result || '',
        measured_value: res.data.existing_results.find(r => r.checkpoint_id === cp.id)?.measured_value || '',
        notes: ''
      })));
      setInspectionMode(true);
    } catch (err) { alert('Error: ' + (err.response?.data?.error || err.message)); }
  }

  async function submitInspection() {
    const incomplete = inspectionResults.filter(r => !r.result);
    if (incomplete.length > 0) { alert(`${incomplete.length} checkpoints not completed`); return; }
    try {
      const res = await api.post(`/manufacturing-advanced/qc/inspect/${woRoutingId}`, { results: inspectionResults });
      alert(res.data.passed ? 'All checkpoints PASSED!' : `FAILED - ${res.data.critical_fail ? 'CRITICAL FAILURE - NCR Created' : 'Non-critical failure'}`);
      setInspectionMode(false);
      setInspectionData(null);
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  }

  async function addCheckpoint(e) {
    e.preventDefault();
    try {
      await api.post('/manufacturing-advanced/qc/checkpoints', cpForm);
      setShowAddCheckpoint(false);
      setCpForm({ work_center_id: '', checkpoint_name: '', checkpoint_code: '', inspection_type: 'visual', measurement_type: 'pass_fail', is_critical: false, sequence: 10, instructions: '' });
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Quality Control</h1>
        <button onClick={() => setShowAddCheckpoint(true)} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">+ Add Checkpoint</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {[['inspect', 'Inspection'], ['checkpoints', 'Checkpoints'], ['results', 'Results History'], ['summary', 'Pass Rate Summary']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 text-sm font-medium border-b-2 ${tab === key ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Inspection Tab */}
      {tab === 'inspect' && !inspectionMode && (
        <div className="bg-white rounded-lg shadow p-6 max-w-md mx-auto text-center">
          <div className="text-4xl mb-3">🔍</div>
          <h2 className="font-semibold text-lg mb-2">Start QC Inspection</h2>
          <p className="text-sm text-gray-500 mb-4">Enter the WO Routing ID to begin inspection</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={woRoutingId}
              onChange={e => setWoRoutingId(e.target.value)}
              placeholder="WO Routing ID"
              className="flex-1 border rounded px-3 py-2"
            />
            <button onClick={startInspection} className="px-4 py-2 bg-blue-600 text-white rounded font-medium">Start</button>
          </div>
        </div>
      )}

      {tab === 'inspect' && inspectionMode && inspectionData && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="font-semibold text-lg">Inspecting: {inspectionData.routing.wo_number}</h2>
              <p className="text-sm text-gray-500">Operation #{inspectionData.routing.sequence} at WC #{inspectionData.routing.work_center_id}</p>
            </div>
            <button onClick={() => setInspectionMode(false)} className="px-3 py-1 bg-gray-200 rounded text-sm">Cancel</button>
          </div>

          <div className="space-y-3">
            {inspectionData.checkpoints.map((cp, i) => {
              const result = inspectionResults[i];
              return (
                <div key={cp.id} className={`border rounded-lg p-3 ${result?.result === 'pass' ? 'border-green-300 bg-green-50' : result?.result === 'fail' ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-gray-100 px-1 rounded">{cp.checkpoint_code}</span>
                      <span className="font-medium text-sm">{cp.checkpoint_name}</span>
                      {cp.is_critical && <span className="text-xs bg-red-100 text-red-700 px-1 rounded">CRITICAL</span>}
                    </div>
                    <span className="text-xs text-gray-400">{cp.inspection_type} | {cp.measurement_type}</span>
                  </div>
                  {cp.instructions && <p className="text-xs text-gray-500 mb-2 italic">{cp.instructions}</p>}
                  
                  <div className="flex items-center gap-3">
                    {/* Result buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={() => { const r = [...inspectionResults]; r[i] = { ...r[i], result: 'pass' }; setInspectionResults(r); }}
                        className={`px-3 py-1 rounded text-sm font-medium ${result?.result === 'pass' ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-green-100'}`}
                      >✓ Pass</button>
                      <button
                        onClick={() => { const r = [...inspectionResults]; r[i] = { ...r[i], result: 'fail' }; setInspectionResults(r); }}
                        className={`px-3 py-1 rounded text-sm font-medium ${result?.result === 'fail' ? 'bg-red-600 text-white' : 'bg-gray-100 hover:bg-red-100'}`}
                      >✗ Fail</button>
                      <button
                        onClick={() => { const r = [...inspectionResults]; r[i] = { ...r[i], result: 'na' }; setInspectionResults(r); }}
                        className={`px-3 py-1 rounded text-sm font-medium ${result?.result === 'na' ? 'bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                      >N/A</button>
                    </div>

                    {/* Measurement input */}
                    {(cp.measurement_type === 'numeric' || cp.measurement_type === 'range') && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={result?.measured_value || ''}
                          onChange={e => { const r = [...inspectionResults]; r[i] = { ...r[i], measured_value: e.target.value }; setInspectionResults(r); }}
                          placeholder={cp.target_value ? `Target: ${cp.target_value}` : 'Measured'}
                          className="w-24 border rounded px-2 py-1 text-sm"
                        />
                        {cp.unit_of_measure && <span className="text-xs text-gray-400">{cp.unit_of_measure}</span>}
                        {cp.min_value !== null && cp.max_value !== null && (
                          <span className="text-xs text-gray-400">({cp.min_value} to {cp.max_value})</span>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <input
                      type="text"
                      value={result?.notes || ''}
                      onChange={e => { const r = [...inspectionResults]; r[i] = { ...r[i], notes: e.target.value }; setInspectionResults(r); }}
                      placeholder="Notes..."
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex justify-end gap-2">
            <button onClick={() => setInspectionMode(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
            <button onClick={submitInspection} className="px-6 py-2 bg-blue-600 text-white rounded font-medium">Submit Inspection</button>
          </div>
        </div>
      )}

      {/* Checkpoints Tab */}
      {tab === 'checkpoints' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-3 border-b">
            <select value={selectedWC} onChange={e => setSelectedWC(e.target.value)} className="border rounded px-2 py-1 text-sm">
              <option value="">All Work Centers</option>
              {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>)}
            </select>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Checkpoint</th>
                <th className="px-3 py-2 text-left">Station</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Measurement</th>
                <th className="px-3 py-2">Range</th>
                <th className="px-3 py-2">Critical</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.filter(cp => !selectedWC || cp.work_center_id == selectedWC).map(cp => (
                <tr key={cp.id} className="border-t hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono text-xs">{cp.checkpoint_code}</td>
                  <td className="px-3 py-2 font-medium">{cp.checkpoint_name}</td>
                  <td className="px-3 py-2 text-xs">{cp.work_center_code}</td>
                  <td className="px-3 py-2 text-center text-xs">{cp.inspection_type}</td>
                  <td className="px-3 py-2 text-center text-xs">{cp.measurement_type}</td>
                  <td className="px-3 py-2 text-center text-xs">
                    {cp.min_value !== null ? `${cp.min_value} to ${cp.max_value} ${cp.unit_of_measure || ''}` : '-'}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {cp.is_critical ? <span className="text-red-600 font-bold">YES</span> : <span className="text-gray-400">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Results History Tab */}
      {tab === 'results' && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left">WO</th>
                <th className="px-3 py-2 text-left">Checkpoint</th>
                <th className="px-3 py-2 text-left">Station</th>
                <th className="px-3 py-2">Result</th>
                <th className="px-3 py-2">Measured</th>
                <th className="px-3 py-2 text-left">Time</th>
              </tr>
            </thead>
            <tbody>
              {results.map(r => (
                <tr key={r.id} className={`border-t ${r.result === 'fail' ? 'bg-red-50' : ''}`}>
                  <td className="px-3 py-2 font-mono text-xs text-blue-600">{r.wo_number}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.checkpoint_name}</span>
                    {r.is_critical && <span className="ml-1 text-xs text-red-500">⚠</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.work_center_name}</td>
                  <td className="px-3 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${r.result === 'pass' ? 'bg-green-100 text-green-700' : r.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                      {r.result.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center text-xs">{r.measured_value || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-400">{new Date(r.inspected_at).toLocaleString()}</td>
                </tr>
              ))}
              {results.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">No inspection results yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Pass Rate Summary Tab */}
      {tab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.map(s => (
            <div key={s.code} className="bg-white rounded-lg shadow p-4">
              <h3 className="font-semibold mb-2">{s.code} - {s.work_center}</h3>
              <div className="flex items-center gap-3 mb-2">
                <div className="text-3xl font-bold" style={{ color: s.pass_rate >= 95 ? '#16a34a' : s.pass_rate >= 85 ? '#ca8a04' : '#dc2626' }}>
                  {s.pass_rate}%
                </div>
                <div className="text-xs text-gray-500">
                  <div>{s.passed} passed</div>
                  <div>{s.failed} failed</div>
                  <div>{s.total_inspections} total</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className={`h-3 rounded-full ${s.pass_rate >= 95 ? 'bg-green-500' : s.pass_rate >= 85 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${s.pass_rate}%` }}></div>
              </div>
            </div>
          ))}
          {summary.length === 0 && <div className="col-span-3 text-center text-gray-400 py-8">No QC data yet - start inspecting!</div>}
        </div>
      )}

      {/* Add Checkpoint Modal */}
      {showAddCheckpoint && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddCheckpoint(false)}>
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-lg mb-4">Add QC Checkpoint</h3>
            <form onSubmit={addCheckpoint} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium">Work Center</label>
                  <select value={cpForm.work_center_id} onChange={e => setCpForm(f => ({ ...f, work_center_id: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required>
                    <option value="">Select...</option>
                    {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Code</label>
                  <input type="text" value={cpForm.checkpoint_code} onChange={e => setCpForm(f => ({ ...f, checkpoint_code: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" placeholder="e.g. CUT-004" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium">Checkpoint Name</label>
                  <input type="text" value={cpForm.checkpoint_name} onChange={e => setCpForm(f => ({ ...f, checkpoint_name: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" required />
                </div>
                <div>
                  <label className="text-xs font-medium">Inspection Type</label>
                  <select value={cpForm.inspection_type} onChange={e => setCpForm(f => ({ ...f, inspection_type: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="visual">Visual</option><option value="measurement">Measurement</option><option value="functional">Functional</option><option value="documentation">Documentation</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Measurement Type</label>
                  <select value={cpForm.measurement_type} onChange={e => setCpForm(f => ({ ...f, measurement_type: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm">
                    <option value="pass_fail">Pass/Fail</option><option value="numeric">Numeric</option><option value="range">Range</option><option value="text">Text</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium">Sequence</label>
                  <input type="number" value={cpForm.sequence} onChange={e => setCpForm(f => ({ ...f, sequence: parseInt(e.target.value) }))} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={cpForm.is_critical} onChange={e => setCpForm(f => ({ ...f, is_critical: e.target.checked }))} />
                  <label className="text-xs font-medium">Critical (creates NCR on fail)</label>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium">Instructions</label>
                <textarea value={cpForm.instructions} onChange={e => setCpForm(f => ({ ...f, instructions: e.target.value }))} className="w-full border rounded px-2 py-1 text-sm" rows={2}></textarea>
              </div>
              <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded font-medium">Add Checkpoint</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
