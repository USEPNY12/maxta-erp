import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const SCAN_MODES = [
  { id: 'lookup', label: '🔍 Lookup', desc: 'Scan any barcode to view its record' },
  { id: 'count', label: '📋 Inventory Count', desc: 'Scan items to count inventory' },
  { id: 'receive', label: '📦 Receive PO', desc: 'Scan items to receive against a PO' },
  { id: 'transfer', label: '🔄 Transfer', desc: 'Scan to move inventory between locations' },
  { id: 'ship', label: '🚚 Ship/Verify', desc: 'Scan to verify items for shipment' },
  { id: 'production', label: '⚙️ Production', desc: 'Scan WO at production stations' },
  { id: 'location', label: '📍 Location', desc: 'Scan a location to see its inventory' }
];

const STATIONS = ['Cutting Table', 'CNC Drilling', 'Edging', 'Tempering', 'Laminating', 'Washing', 'Inspection', 'Packaging'];

export default function Scanner() {
  const [mode, setMode] = useState('lookup');
  const [scanInput, setScanInput] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Mode-specific state
  const [countId, setCountId] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [soNumber, setSoNumber] = useState('');
  const [fromLoc, setFromLoc] = useState('');
  const [toLoc, setToLoc] = useState('');
  const [station, setStation] = useState('Cutting Table');
  const [quantity, setQuantity] = useState(1);
  const [locationCode, setLocationCode] = useState('');

  const inputRef = useRef(null);
  const scanBufferRef = useRef('');
  const scanTimerRef = useRef(null);

  // Auto-focus input for hardware scanner support
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [mode]);

  // Listen for hardware barcode scanner input (rapid keystrokes)
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Hardware scanners type very fast and end with Enter
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;

      if (e.key === 'Enter' && scanBufferRef.current.length > 2) {
        setScanInput(scanBufferRef.current);
        handleScan(scanBufferRef.current);
        scanBufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        scanBufferRef.current += e.key;
        clearTimeout(scanTimerRef.current);
        scanTimerRef.current = setTimeout(() => { scanBufferRef.current = ''; }, 100);
      }
    };
    document.addEventListener('keypress', handleKeyPress);
    return () => document.removeEventListener('keypress', handleKeyPress);
  }, [mode, quantity, countId, poNumber, soNumber, fromLoc, toLoc, station, locationCode]);

  const handleScan = async (barcode) => {
    if (!barcode || barcode.trim() === '') return;
    const code = barcode.trim();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let res;
      switch (mode) {
        case 'lookup':
          res = await api.post('/api/labels/scan/lookup', { barcode: code });
          setResult({ scanMode: 'lookup', type: res.data.type, record: res.data.data, message: res.data.message });
          break;

        case 'count':
          if (!countId) { setError('Please enter a Physical Count ID first'); break; }
          res = await api.post('/api/labels/scan/count', {
            physical_count_id: countId, barcode: code, quantity, location_code: locationCode || undefined
          });
          setResult({ type: 'count', ...res.data });
          break;

        case 'receive':
          if (!poNumber) { setError('Please enter a PO Number first'); break; }
          res = await api.post('/api/labels/scan/receive', {
            po_number: poNumber, barcode: code, quantity, location_code: locationCode || undefined
          });
          setResult({ type: 'receive', ...res.data });
          break;

        case 'transfer':
          if (!fromLoc || !toLoc) { setError('Please set From and To locations'); break; }
          res = await api.post('/api/labels/scan/transfer', {
            barcode: code, from_location_code: fromLoc, to_location_code: toLoc, quantity
          });
          setResult({ type: 'transfer', ...res.data });
          break;

        case 'ship':
          if (!soNumber) { setError('Please enter a Sales Order Number first'); break; }
          res = await api.post('/api/labels/scan/ship', {
            so_number: soNumber, barcode: code, quantity
          });
          setResult({ type: 'ship', ...res.data });
          break;

        case 'production':
          res = await api.post('/api/labels/scan/production', {
            barcode: code, station, status: 'completed'
          });
          setResult({ type: 'production', ...res.data });
          break;

        case 'location':
          res = await api.post('/api/labels/scan/location-inventory', { location_code: code });
          setResult({ type: 'location', ...res.data });
          break;
      }

      if (res?.data) {
        setHistory(prev => [{ barcode: code, mode, time: new Date().toLocaleTimeString(), ...res.data }, ...prev].slice(0, 50));
      }
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
    setScanInput('');
    if (inputRef.current) inputRef.current.focus();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleScan(scanInput);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4" style={{ maxWidth: '600px', margin: '0 auto' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📱 MaxTA Scanner</h1>
        <a href="/" className="text-blue-400 text-sm">← Back to ERP</a>
      </div>

      {/* Mode Selector */}
      <div className="grid grid-cols-4 gap-1 mb-4">
        {SCAN_MODES?.map(m => (
          <button key={m.id}
            className={`text-xs py-2 px-1 rounded font-bold ${mode === m.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
            onClick={() => { setMode(m.id); setResult(null); setError(''); }}>
            {m.label}
          </button>
        ))}
      </div>

      {/* Mode-specific inputs */}
      <div className="bg-gray-800 rounded-lg p-3 mb-4">
        <p className="text-xs text-gray-400 mb-2">{SCAN_MODES?.find(m => m.id === mode)?.desc}</p>

        {mode === 'count' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="Count ID" value={countId} onChange={e => setCountId(e.target.value)} />
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="Location (optional)" value={locationCode} onChange={e => setLocationCode(e.target.value)} />
          </div>
        )}

        {mode === 'receive' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="PO Number" value={poNumber} onChange={e => setPoNumber(e.target.value)} />
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="Location" value={locationCode} onChange={e => setLocationCode(e.target.value)} />
          </div>
        )}

        {mode === 'transfer' && (
          <div className="grid grid-cols-2 gap-2 mb-2">
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="From Location" value={fromLoc} onChange={e => setFromLoc(e.target.value)} />
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm" placeholder="To Location" value={toLoc} onChange={e => setToLoc(e.target.value)} />
          </div>
        )}

        {mode === 'ship' && (
          <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm w-full mb-2" placeholder="Sales Order Number" value={soNumber} onChange={e => setSoNumber(e.target.value)} />
        )}

        {mode === 'production' && (
          <select className="bg-gray-700 text-white rounded px-3 py-2 text-sm w-full mb-2" value={station} onChange={e => setStation(e.target.value)}>
            {STATIONS?.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        )}

        {/* Quantity (for count, receive, transfer, ship) */}
        {['count', 'receive', 'transfer', 'ship'].includes(mode) && (
          <div className="flex items-center gap-2 mb-2">
            <label className="text-xs text-gray-400">Qty:</label>
            <button className="bg-gray-600 text-white w-8 h-8 rounded" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
            <input className="bg-gray-700 text-white rounded px-3 py-2 text-sm w-16 text-center" type="number" value={quantity} onChange={e => setQuantity(parseInt(e.target.value) || 1)} />
            <button className="bg-gray-600 text-white w-8 h-8 rounded" onClick={() => setQuantity(quantity + 1)}>+</button>
          </div>
        )}

        {/* Scan Input */}
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input ref={inputRef}
            className="flex-1 bg-gray-700 text-white rounded px-3 py-3 text-lg font-mono"
            placeholder="Scan barcode or type here..."
            value={scanInput}
            onChange={e => setScanInput(e.target.value)}
            autoFocus autoComplete="off" />
          <button type="submit" className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded font-bold text-lg" disabled={loading}>
            {loading ? '...' : '→'}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-900 border border-red-600 text-red-200 rounded-lg p-3 mb-4">
          ❌ {error}
        </div>
      )}

      {/* Result */}
      {result && <ScanResult result={result} />}

      {/* History */}
      {history.length > 0 && (
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold text-gray-400">Scan History</h3>
            <button className="text-xs text-red-400" onClick={() => setHistory([])}>Clear</button>
          </div>
          <div className="space-y-1 max-h-48 overflow-auto">
            {history?.map((h, i) => (
              <div key={i} className="bg-gray-800 rounded px-3 py-2 flex justify-between items-center text-xs">
                <span className="font-mono text-blue-400">{h.barcode}</span>
                <span className="text-gray-500">{h.mode} | {h.time}</span>
                {h.success && <span className="text-green-400">✓</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ScanResult({ result }) {
  if (result.scanMode === 'lookup') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-blue-600">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-400 font-bold text-sm uppercase">{result.type === 'unknown' ? '❓ Not Found' : `📋 ${result.type?.replace('_', ' ')}`}</span>
        </div>
        {result.record && (
          <div className="space-y-1">
            {Object.entries(result.record)?.map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-400">{k.replace(/_/g, ' ')}:</span>
                <span className="text-white font-mono">{String(v)}</span>
              </div>
            ))}
          </div>
        )}
        {result.message && <p className="text-yellow-400 text-sm mt-2">{result.message}</p>}
      </div>
    );
  }

  if (result.type === 'location') {
    return (
      <div className="bg-gray-800 rounded-lg p-4 border border-purple-600">
        <div className="text-purple-400 font-bold text-sm mb-2">📍 {result.location?.location_code || result.location?.code} - {result.location?.name}</div>
        {result.inventory?.length === 0 ? (
          <p className="text-gray-400 text-sm">No inventory at this location</p>
        ) : (
          <div className="space-y-1 max-h-48 overflow-auto">
            {result.inventory?.map((item, i) => (
              <div key={i} className="flex justify-between text-sm bg-gray-700 rounded px-2 py-1">
                <span className="text-white">{item.item_number}</span>
                <span className="text-gray-300 text-xs flex-1 mx-2 truncate">{item.description}</span>
                <span className="text-green-400 font-bold">{item.quantity_on_hand}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Success results (count, receive, transfer, ship, production)
  const isSuccess = result.success;
  return (
    <div className={`rounded-lg p-4 border ${isSuccess ? 'bg-green-900 border-green-600' : 'bg-yellow-900 border-yellow-600'}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-2xl">{isSuccess ? '✅' : '⚠️'}</span>
        <span className={`font-bold ${isSuccess ? 'text-green-400' : 'text-yellow-400'}`}>
          {result.type === 'count' && 'Counted'}
          {result.type === 'receive' && 'Received'}
          {result.type === 'transfer' && 'Transferred'}
          {result.type === 'ship' && (result.verified ? 'Verified' : 'Mismatch')}
          {result.type === 'production' && 'Logged'}
        </span>
      </div>
      <div className="space-y-1 text-sm">
        {result.item && <div className="text-white">Item: <span className="font-mono text-blue-400">{result.item}</span></div>}
        {result.description && <div className="text-gray-300">{result.description}</div>}
        {result.quantity !== undefined && <div className="text-white">Qty: <span className="font-bold text-green-400">{result.quantity}</span></div>}
        {result.from && <div className="text-white">From: {result.from} → To: {result.to}</div>}
        {result.remaining !== undefined && <div className="text-gray-400">Remaining on order: {result.remaining}</div>}
        {result.wo && <div className="text-white">WO: {result.wo} | Station: {result.station}</div>}
        {result.timestamp && <div className="text-gray-500 text-xs">{new Date(result.timestamp).toLocaleString()}</div>}
      </div>
    </div>
  );
}
