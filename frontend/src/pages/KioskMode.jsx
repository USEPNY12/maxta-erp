import { useState, useEffect, useRef, useCallback } from 'react';

const API = '/api/mobile';

export default function KioskMode() {
  const [station, setStation] = useState(null);
  const [stationCode, setStationCode] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [currentAction, setCurrentAction] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [productionQty, setProductionQty] = useState(1);
  const [issueType, setIssueType] = useState('');
  const [issueDesc, setIssueDesc] = useState('');
  const [lastActions, setLastActions] = useState([]);
  const [clock, setClock] = useState(new Date());
  const [idle, setIdle] = useState(0);
  const [locked, setLocked] = useState(false);
  const [stations, setStations] = useState([]);
  const idleTimer = useRef(null);
  const heartbeatTimer = useRef(null);

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Load available stations
  useEffect(() => {
    fetch(`${API}/kiosk/stations`).then(r => r.json()).then(setStations).catch(() => {});
  }, []);

  // Idle lock
  useEffect(() => {
    if (!station) return;
    const config = station.config || {};
    const timeout = (config.timeout || 120) * 1000;
    const resetIdle = () => { setIdle(0); setLocked(false); };
    window.addEventListener('touchstart', resetIdle);
    window.addEventListener('click', resetIdle);
    window.addEventListener('keydown', resetIdle);
    idleTimer.current = setInterval(() => {
      setIdle(prev => {
        if ((prev + 1) * 1000 >= timeout) { setLocked(true); }
        return prev + 1;
      });
    }, 1000);
    return () => {
      window.removeEventListener('touchstart', resetIdle);
      window.removeEventListener('click', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      clearInterval(idleTimer.current);
    };
  }, [station]);

  // Heartbeat
  useEffect(() => {
    if (!station) return;
    heartbeatTimer.current = setInterval(() => {
      fetch(`${API}/kiosk/heartbeat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: station.id })
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(heartbeatTimer.current);
  }, [station]);

  // Enter fullscreen
  const goFullscreen = () => {
    document.documentElement.requestFullscreen?.() || document.documentElement.webkitRequestFullscreen?.();
  };

  // Authenticate station
  const authenticate = async () => {
    setError('');
    try {
      const res = await fetch(`${API}/kiosk/authenticate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationCode, pin })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Authentication failed'); return; }
      setStation(data.station);
      goFullscreen();
    } catch (e) { setError('Connection error'); }
  };

  // Perform kiosk action
  const doAction = async (actionType, actionData = {}) => {
    try {
      const res = await fetch(`${API}/kiosk/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stationId: station.id, actionType, actionData })
      });
      const data = await res.json();
      setLastActions(prev => [{ type: actionType, time: new Date(), result: data }, ...prev.slice(0, 9)]);
      return data;
    } catch (e) { return { success: false, error: 'Connection error' }; }
  };

  // Scan WO barcode (simulated with text input for now)
  const handleScan = async (barcode) => {
    const result = await doAction('scan_wo', { barcode });
    setScanResult(result);
    setCurrentAction('scan_result');
  };

  // Log production
  const handleLogProduction = async () => {
    if (!scanResult?.workOrder) return;
    const result = await doAction('log_production', {
      workOrderId: scanResult.workOrder.id,
      quantity: productionQty,
      station: station.code
    });
    setScanResult(null);
    setCurrentAction('success');
    setTimeout(() => setCurrentAction(null), 3000);
  };

  // Report issue
  const handleReportIssue = async () => {
    await doAction('report_issue', {
      workOrderId: scanResult?.workOrder?.id,
      issueType,
      description: issueDesc
    });
    setIssueType(''); setIssueDesc('');
    setCurrentAction('success');
    setTimeout(() => setCurrentAction(null), 3000);
  };

  // Lock screen
  if (locked && station) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-3xl text-white font-bold mb-2">{station.name}</h2>
          <p className="text-gray-400 text-xl mb-8">Screen locked due to inactivity</p>
          <p className="text-gray-500 text-lg">Touch anywhere to unlock</p>
        </div>
      </div>
    );
  }

  // Station selection / login
  if (!station) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white">MaxTA ERP</h1>
            <p className="text-gray-400 mt-2 text-lg">Kiosk Mode</p>
          </div>
          {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-3 rounded-lg mb-4 text-center">{error}</div>}
          
          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-2">Station</label>
              <select 
                value={stationCode} onChange={e => setStationCode(e.target.value)}
                className="w-full p-4 bg-gray-700 text-white rounded-xl text-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select Station...</option>
                {stations.map(s => (
                  <option key={s.station_code} value={s.station_code}>{s.station_name} ({s.station_code})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-gray-300 text-sm font-medium block mb-2">PIN Code</label>
              <input
                type="password" value={pin} onChange={e => setPin(e.target.value)}
                placeholder="Enter PIN"
                className="w-full p-4 bg-gray-700 text-white rounded-xl text-lg text-center tracking-widest border border-gray-600 focus:border-blue-500 focus:outline-none"
                maxLength={6}
                onKeyDown={e => e.key === 'Enter' && authenticate()}
              />
            </div>
            <button
              onClick={authenticate}
              disabled={!stationCode || !pin}
              className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl text-xl font-bold transition-colors"
            >
              Enter Kiosk Mode
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Action buttons based on station config
  const actionButtons = {
    scan_wo: { label: 'Scan Work Order', icon: '📷', color: 'bg-blue-600 hover:bg-blue-700' },
    log_production: { label: 'Log Production', icon: '✅', color: 'bg-green-600 hover:bg-green-700' },
    report_issue: { label: 'Report Issue', icon: '⚠️', color: 'bg-yellow-600 hover:bg-yellow-700' },
    clock_in: { label: 'Clock In', icon: '🕐', color: 'bg-purple-600 hover:bg-purple-700' },
    clock_out: { label: 'Clock Out', icon: '🕕', color: 'bg-purple-600 hover:bg-purple-700' },
    quality_check: { label: 'Quality Check', icon: '🔍', color: 'bg-teal-600 hover:bg-teal-700' },
    scan_shipment: { label: 'Scan Shipment', icon: '📦', color: 'bg-blue-600 hover:bg-blue-700' },
    verify_packing: { label: 'Verify Packing', icon: '✓', color: 'bg-green-600 hover:bg-green-700' },
    log_dispatch: { label: 'Log Dispatch', icon: '🚚', color: 'bg-indigo-600 hover:bg-indigo-700' },
    scan_po: { label: 'Scan PO', icon: '📋', color: 'bg-blue-600 hover:bg-blue-700' },
    receive_item: { label: 'Receive Item', icon: '📥', color: 'bg-green-600 hover:bg-green-700' },
    inspect_quality: { label: 'Inspect Quality', icon: '🔬', color: 'bg-teal-600 hover:bg-teal-700' },
  };

  const allowedActions = station.allowedActions || [];

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-gray-800 border-b border-gray-700">
        <div>
          <h1 className="text-2xl font-bold">{station.name}</h1>
          <p className="text-gray-400 text-sm">{station.code}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-mono">{clock.toLocaleTimeString()}</div>
          <div className="text-gray-400 text-sm">{clock.toLocaleDateString()}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 overflow-auto">
        {/* Success feedback */}
        {currentAction === 'success' && (
          <div className="fixed inset-0 bg-green-900/80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="text-8xl mb-4">✅</div>
              <h2 className="text-4xl font-bold">Success!</h2>
            </div>
          </div>
        )}

        {/* Scan Result */}
        {currentAction === 'scan_result' && scanResult && (
          <div className="max-w-lg mx-auto">
            {scanResult.workOrder ? (
              <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
                <h2 className="text-2xl font-bold text-center">Work Order Found</h2>
                <div className="grid grid-cols-2 gap-4 text-lg">
                  <div className="text-gray-400">WO Number:</div>
                  <div className="font-bold">{scanResult.workOrder.wo_number}</div>
                  <div className="text-gray-400">Status:</div>
                  <div><span className="px-3 py-1 bg-blue-600 rounded-full text-sm">{scanResult.workOrder.status}</span></div>
                  <div className="text-gray-400">Product:</div>
                  <div>{scanResult.workOrder.product_type}</div>
                  <div className="text-gray-400">Quantity:</div>
                  <div>{scanResult.workOrder.quantity}</div>
                </div>
                <div className="flex gap-4 mt-6">
                  <button onClick={() => { setCurrentAction('log_qty'); }} className="flex-1 p-4 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-bold">
                    Log Production
                  </button>
                  <button onClick={() => setCurrentAction('issue_form')} className="flex-1 p-4 bg-yellow-600 hover:bg-yellow-700 rounded-xl text-xl font-bold">
                    Report Issue
                  </button>
                  <button onClick={() => { setCurrentAction(null); setScanResult(null); }} className="p-4 bg-gray-600 hover:bg-gray-700 rounded-xl text-xl">
                    ✕
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-red-900/50 rounded-2xl p-6 text-center">
                <div className="text-6xl mb-4">❌</div>
                <h2 className="text-2xl font-bold">Work Order Not Found</h2>
                <button onClick={() => { setCurrentAction(null); setScanResult(null); }} className="mt-4 p-4 bg-gray-600 rounded-xl text-lg">Back</button>
              </div>
            )}
          </div>
        )}

        {/* Log Production Quantity */}
        {currentAction === 'log_qty' && (
          <div className="max-w-md mx-auto bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Log Production Quantity</h2>
            <div className="flex items-center justify-center gap-6 mb-8">
              <button onClick={() => setProductionQty(Math.max(1, productionQty - 1))} className="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold">−</button>
              <div className="text-6xl font-bold w-24 text-center">{productionQty}</div>
              <button onClick={() => setProductionQty(productionQty + 1)} className="w-16 h-16 bg-gray-700 rounded-full text-3xl font-bold">+</button>
            </div>
            <div className="flex gap-4">
              <button onClick={handleLogProduction} className="flex-1 p-4 bg-green-600 hover:bg-green-700 rounded-xl text-xl font-bold">Confirm</button>
              <button onClick={() => setCurrentAction('scan_result')} className="p-4 bg-gray-600 rounded-xl text-xl">Back</button>
            </div>
          </div>
        )}

        {/* Report Issue Form */}
        {currentAction === 'issue_form' && (
          <div className="max-w-md mx-auto bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Report Issue</h2>
            <div className="space-y-4">
              <select value={issueType} onChange={e => setIssueType(e.target.value)} className="w-full p-4 bg-gray-700 rounded-xl text-lg border border-gray-600">
                <option value="">Select Issue Type...</option>
                <option value="breakage">Glass Breakage</option>
                <option value="defect">Quality Defect</option>
                <option value="machine">Machine Problem</option>
                <option value="material">Material Shortage</option>
                <option value="safety">Safety Concern</option>
                <option value="other">Other</option>
              </select>
              <textarea value={issueDesc} onChange={e => setIssueDesc(e.target.value)} placeholder="Describe the issue..." className="w-full p-4 bg-gray-700 rounded-xl text-lg border border-gray-600 h-32 resize-none" />
              <div className="flex gap-4">
                <button onClick={handleReportIssue} disabled={!issueType} className="flex-1 p-4 bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 rounded-xl text-xl font-bold">Submit</button>
                <button onClick={() => setCurrentAction('scan_result')} className="p-4 bg-gray-600 rounded-xl text-xl">Back</button>
              </div>
            </div>
          </div>
        )}

        {/* Scan Input */}
        {currentAction === 'scanning' && (
          <div className="max-w-md mx-auto bg-gray-800 rounded-2xl p-6">
            <h2 className="text-2xl font-bold text-center mb-6">Scan Barcode</h2>
            <p className="text-gray-400 text-center mb-4">Scan a barcode or type the WO number</p>
            <input
              type="text" autoFocus
              placeholder="WO-XXXXX"
              className="w-full p-4 bg-gray-700 rounded-xl text-2xl text-center border border-gray-600 focus:border-blue-500 focus:outline-none"
              onKeyDown={e => { if (e.key === 'Enter' && e.target.value) { handleScan(e.target.value); } }}
            />
            <button onClick={() => setCurrentAction(null)} className="w-full mt-4 p-4 bg-gray-600 rounded-xl text-lg">Cancel</button>
          </div>
        )}

        {/* Main Action Grid */}
        {!currentAction && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {allowedActions.map(action => {
              const btn = actionButtons[action] || { label: action, icon: '⚡', color: 'bg-gray-600' };
              return (
                <button
                  key={action}
                  onClick={() => {
                    if (action === 'scan_wo' || action === 'scan_shipment' || action === 'scan_po') {
                      setCurrentAction('scanning');
                    } else if (action === 'clock_in' || action === 'clock_out') {
                      doAction(action, { timestamp: new Date().toISOString() });
                      setCurrentAction('success');
                      setTimeout(() => setCurrentAction(null), 3000);
                    } else {
                      setCurrentAction('scanning');
                    }
                  }}
                  className={`${btn.color} rounded-2xl p-8 flex flex-col items-center justify-center gap-3 transition-transform active:scale-95`}
                >
                  <span className="text-5xl">{btn.icon}</span>
                  <span className="text-xl font-bold text-center">{btn.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Recent Actions Log */}
        {!currentAction && lastActions.length > 0 && (
          <div className="mt-8 max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-gray-400 mb-2">Recent Activity</h3>
            <div className="space-y-2">
              {lastActions.slice(0, 5).map((a, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800 rounded-lg px-4 py-2">
                  <span className="text-gray-300">{actionButtons[a.type]?.icon} {actionButtons[a.type]?.label || a.type}</span>
                  <span className="text-gray-500 text-sm">{a.time.toLocaleTimeString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-800 border-t border-gray-700">
        <button onClick={() => { setStation(null); setLastActions([]); document.exitFullscreen?.(); }} className="px-4 py-2 bg-red-600/50 hover:bg-red-600 rounded-lg text-sm">
          Exit Kiosk
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-gray-400 text-sm">Connected</span>
        </div>
      </div>
    </div>
  );
}
