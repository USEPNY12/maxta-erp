import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';

export default function BarcodeStation() {
  const [barcode, setBarcode] = useState('');
  const [scanType, setScanType] = useState('station_in');
  const [workCenterId, setWorkCenterId] = useState('');
  const [workCenters, setWorkCenters] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const [woStatus, setWoStatus] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchWorkCenters();
    fetchHistory();
    // Focus barcode input
    if (inputRef.current) inputRef.current.focus();
  }, []);

  async function fetchWorkCenters() {
    try {
      const res = await api.get('/manufacturing/work-centers');
      setWorkCenters(res.data);
    } catch (err) { console.error(err); }
  }

  async function fetchHistory() {
    try {
      const params = {};
      if (workCenterId) params.work_center_id = workCenterId;
      const res = await api.get('/manufacturing-advanced/scan/history', { params: { ...params, limit: 20 } });
      setScanHistory(res.data);
    } catch (err) { console.error(err); }
  }

  async function handleScan(e) {
    e.preventDefault();
    if (!barcode.trim()) return;

    try {
      const res = await api.post('/manufacturing-advanced/scan', {
        barcode: barcode.trim(),
        scan_type: scanType,
        work_center_id: workCenterId || null,
        quantity
      });
      setLastResult(res.data);
      
      // Auto-lookup WO status
      if (res.data.work_order_id) {
        const statusRes = await api.get(`/manufacturing-advanced/scan/wo-status/${barcode.trim()}`);
        setWoStatus(statusRes.data);
      }

      fetchHistory();
      setBarcode('');
      if (inputRef.current) inputRef.current.focus();
    } catch (err) {
      setLastResult({ error: err.response?.data?.error || err.message });
    }
  }

  async function lookupWO() {
    if (!barcode.trim()) return;
    try {
      const res = await api.get(`/manufacturing-advanced/scan/wo-status/${barcode.trim()}`);
      setWoStatus(res.data);
    } catch (err) {
      setWoStatus(null);
      alert('Work order not found');
    }
  }

  const scanTypeConfig = {
    station_in: { label: 'Station In (Start)', color: 'bg-green-600', icon: '▶️' },
    station_out: { label: 'Station Out (Complete)', color: 'bg-blue-600', icon: '✅' },
    wo_start: { label: 'WO Start', color: 'bg-green-700', icon: '🟢' },
    wo_complete: { label: 'WO Complete', color: 'bg-blue-700', icon: '🏁' },
    wo_pause: { label: 'WO Pause', color: 'bg-yellow-600', icon: '⏸️' },
    qc_pass: { label: 'QC Pass', color: 'bg-emerald-600', icon: '✓' },
    qc_fail: { label: 'QC Fail', color: 'bg-red-600', icon: '✗' },
    material_issue: { label: 'Material Issue', color: 'bg-purple-600', icon: '📦' },
    rack_load: { label: 'Rack Load', color: 'bg-indigo-600', icon: '📥' },
    rack_unload: { label: 'Rack Unload', color: 'bg-indigo-500', icon: '📤' }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold text-gray-800">Barcode Scanning Station</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Scanner Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Work Center Selection */}
          <div className="bg-white rounded-lg shadow p-4">
            <label className="text-sm font-medium text-gray-700">Current Station</label>
            <select value={workCenterId} onChange={e => { setWorkCenterId(e.target.value); }} className="w-full mt-1 border rounded px-3 py-2 text-sm">
              <option value="">-- Select Work Center --</option>
              {workCenters?.map(wc => <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>)}
            </select>
          </div>

          {/* Scan Type Buttons */}
          <div className="bg-white rounded-lg shadow p-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Scan Action</label>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(scanTypeConfig)?.map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => setScanType(key)}
                  className={`px-2 py-2 rounded text-xs font-medium transition-all ${scanType === key ? `${cfg.color} text-white shadow-lg scale-105` : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>
          </div>

          {/* Barcode Input */}
          <div className="bg-white rounded-lg shadow p-4">
            <form onSubmit={handleScan}>
              <label className="text-sm font-medium text-gray-700">Scan / Enter Barcode</label>
              <div className="flex gap-2 mt-1">
                <input
                  ref={inputRef}
                  type="text"
                  value={barcode}
                  onChange={e => setBarcode(e.target.value)}
                  placeholder="WO-00001 or WO-00001-OP-10"
                  className="flex-1 border rounded px-3 py-2 text-lg font-mono"
                  autoFocus
                />
                <button type="submit" className={`px-4 py-2 ${scanTypeConfig[scanType].color} text-white rounded font-medium`}>
                  Scan
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <label className="text-xs text-gray-500">Qty:</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} className="w-16 border rounded px-2 py-1 text-sm" />
                <button type="button" onClick={lookupWO} className="ml-auto text-xs text-blue-600 hover:underline">Lookup WO</button>
              </div>
            </form>
          </div>

          {/* Last Scan Result */}
          {lastResult && (
            <div className={`rounded-lg shadow p-4 ${lastResult.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
              <h3 className="font-semibold text-sm mb-1">{lastResult.error ? '❌ Scan Error' : '✅ Scan Successful'}</h3>
              {lastResult.error ? (
                <p className="text-sm text-red-700">{lastResult.error}</p>
              ) : (
                <div className="text-sm space-y-1">
                  <p><span className="text-gray-500">Barcode:</span> <span className="font-mono">{lastResult.barcode}</span></p>
                  <p><span className="text-gray-500">Action:</span> {lastResult.action || lastResult.scan_type}</p>
                  {lastResult.wo_number && <p><span className="text-gray-500">WO:</span> {lastResult.wo_number}</p>}
                  {lastResult.remaining_ops !== undefined && <p><span className="text-gray-500">Remaining Ops:</span> {lastResult.remaining_ops}</p>}
                </div>
              )}
            </div>
          )}
        </div>

        {/* WO Status Panel */}
        <div className="lg:col-span-2 space-y-4">
          {woStatus ? (
            <div className="bg-white rounded-lg shadow p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-lg font-bold">{woStatus.work_order.wo_number}</h2>
                  <p className="text-sm text-gray-600">{woStatus.work_order.description || woStatus.work_order.product_type}</p>
                  <p className="text-xs text-gray-400">{woStatus.work_order.customer_name}</p>
                </div>
                <StatusBadge status={woStatus.work_order.status} />
              </div>

              {/* Routing Progress */}
              <h3 className="font-semibold text-sm mb-2">Routing Progress</h3>
              <div className="space-y-1">
                {woStatus.routing?.map((op, i) => (
                  <div key={op.id} className={`flex items-center gap-2 p-2 rounded text-sm ${op.status === 'in_progress' ? 'bg-blue-50 border border-blue-200' : op.status === 'complete' || op.status === 'completed' ? 'bg-green-50' : 'bg-gray-50'}`}>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-white border">
                      {op.status === 'complete' || op.status === 'completed' ? '✓' : op.status === 'in_progress' ? '▶' : i + 1}
                    </span>
                    <span className="font-medium flex-1">{op.work_center_code} - {op.work_center_name}</span>
                    <span className="text-xs text-gray-500">{op.status}</span>
                    {op.qc_passed === 1 && <span className="text-green-600 text-xs">QC✓</span>}
                    {op.qc_passed === 0 && <span className="text-red-600 text-xs">QC✗</span>}
                  </div>
                ))}
              </div>

              {/* Recent Scans for this WO */}
              {woStatus.recent_scans?.length > 0 && (
                <div className="mt-3">
                  <h3 className="font-semibold text-sm mb-1">Recent Scans</h3>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {woStatus.recent_scans?.map(scan => (
                      <div key={scan.id} className="flex justify-between text-xs border-b py-1">
                        <span className="font-medium">{scan.scan_type}</span>
                        <span className="text-gray-400">{new Date(scan.scanned_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
              <div className="text-4xl mb-2">📷</div>
              <p>Scan a WO barcode to see status</p>
              <p className="text-xs mt-1">Format: WO-XXXXX or WO-XXXXX-OP-XX</p>
            </div>
          )}

          {/* Scan History */}
          <div className="bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-2">Scan History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Time</th>
                    <th className="px-2 py-1 text-left">Barcode</th>
                    <th className="px-2 py-1 text-left">Action</th>
                    <th className="px-2 py-1 text-left">WO</th>
                    <th className="px-2 py-1 text-left">Station</th>
                  </tr>
                </thead>
                <tbody>
                  {scanHistory?.map(scan => (
                    <tr key={scan.id} className="border-t">
                      <td className="px-2 py-1">{new Date(scan.scanned_at).toLocaleTimeString()}</td>
                      <td className="px-2 py-1 font-mono">{scan.barcode}</td>
                      <td className="px-2 py-1"><span className="bg-gray-100 px-1 rounded">{scan.scan_type}</span></td>
                      <td className="px-2 py-1 text-blue-600">{scan.wo_number || '-'}</td>
                      <td className="px-2 py-1">{scan.work_center_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const colors = {
    planned: 'bg-gray-100 text-gray-700',
    released: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-green-100 text-green-700',
    closed: 'bg-gray-200 text-gray-600',
    cancelled: 'bg-red-100 text-red-700'
  };
  return <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
}
