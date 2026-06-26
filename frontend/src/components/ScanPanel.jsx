import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

/**
 * ScanPanel - Reusable desktop barcode scanning component
 * 
 * Embeds directly into any ERP module page. Supports:
 * - USB/Bluetooth barcode scanners (keyboard wedge mode)
 * - Manual barcode entry
 * - Global keystroke capture (no focus required)
 * - Visual + audio feedback
 * - Scan history with results
 * 
 * Props:
 *   mode: 'lookup' | 'count' | 'receive' | 'transfer' | 'ship' | 'production' | 'location'
 *   context: { po_id, so_id, wo_id, from_location, to_location, count_id, station }
 *   onScanResult: (result) => void - callback when scan completes
 *   title: string - panel title
 *   compact: boolean - compact mode for sidebar embedding
 */
export default function ScanPanel({ mode = 'lookup', context = {}, onScanResult, title, compact = false }) {
  const [barcode, setBarcode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [status, setStatus] = useState('ready'); // ready, success, error, processing
  const [statusMsg, setStatusMsg] = useState('Ready to scan');
  const [globalCapture, setGlobalCapture] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const inputRef = useRef(null);
  const bufferRef = useRef('');
  const lastKeyTime = useRef(0);
  const timerRef = useRef(null);

  // Audio feedback using Web Audio API
  const playBeep = useCallback((type) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      if (type === 'success') {
        oscillator.frequency.value = 1200;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => { oscillator.frequency.value = 1600; }, 100);
        setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 200);
      } else {
        oscillator.frequency.value = 400;
        gainNode.gain.value = 0.3;
        oscillator.start();
        setTimeout(() => { oscillator.frequency.value = 200; }, 150);
        setTimeout(() => { oscillator.stop(); audioCtx.close(); }, 400);
      }
    } catch (e) { /* audio not available */ }
  }, []);

  // Process a scanned barcode
  const processScan = useCallback(async (scannedCode) => {
    if (!scannedCode || scannedCode.trim().length === 0) return;
    const code = scannedCode.trim();
    setScanning(true);
    setStatus('processing');
    setStatusMsg('Processing scan...');

    try {
      let result;
      
      switch (mode) {
        case 'lookup':
          result = await api.post('/api/labels/scan/lookup', { barcode: code });
          break;
        case 'count':
          if (context.count_id) {
            result = await api.post('/api/labels/scan/count', {
              barcode: code,
              count_id: context.count_id,
              quantity: parseFloat(quantity) || 1
            });
          } else {
            result = await api.post('/api/labels/scan/lookup', { barcode: code });
          }
          break;
        case 'receive':
          if (context.po_id) {
            result = await api.post('/api/labels/scan/receive', {
              barcode: code,
              po_id: context.po_id,
              quantity: parseFloat(quantity) || 1,
              location_id: context.location_id || null
            });
          } else {
            result = await api.post('/api/labels/scan/lookup', { barcode: code });
          }
          break;
        case 'transfer':
          result = await api.post('/api/labels/scan/transfer', {
            barcode: code,
            from_location_id: context.from_location || null,
            to_location_id: context.to_location || null,
            quantity: parseFloat(quantity) || 1
          });
          break;
        case 'ship':
          if (context.so_id) {
            result = await api.post('/api/labels/scan/ship', {
              barcode: code,
              so_id: context.so_id
            });
          } else {
            result = await api.post('/api/labels/scan/lookup', { barcode: code });
          }
          break;
        case 'production':
          result = await api.post('/api/labels/scan/production', {
            barcode: code,
            station: context.station || 'general',
            action: context.action || 'complete'
          });
          break;
        case 'location':
          result = await api.post('/api/labels/scan/lookup', { barcode: code });
          break;
        default:
          result = await api.post('/api/labels/scan/lookup', { barcode: code });
      }

      const data = result.data;
      setLastResult(data);
      setStatus('success');
      setStatusMsg(data.message || `Scanned: ${code}`);
      playBeep('success');
      
      const historyEntry = {
        barcode: code,
        time: new Date().toLocaleTimeString(),
        result: data,
        success: true
      };
      setScanHistory(prev => [historyEntry, ...prev].slice(0, 20));
      
      if (onScanResult) onScanResult(data);
      
    } catch (err) {
      const errMsg = err.response?.data?.error || err.message || 'Scan failed';
      setStatus('error');
      setStatusMsg(errMsg);
      playBeep('error');
      setLastResult({ error: errMsg });
      
      const historyEntry = {
        barcode: code,
        time: new Date().toLocaleTimeString(),
        result: { error: errMsg },
        success: false
      };
      setScanHistory(prev => [historyEntry, ...prev].slice(0, 20));
    } finally {
      setScanning(false);
      setBarcode('');
      // Re-focus input for next scan
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [mode, context, quantity, onScanResult, playBeep]);

  // Global keystroke listener for scanner detection (keyboard wedge)
  useEffect(() => {
    if (!globalCapture) return;

    const handleKeyDown = (e) => {
      // Don't capture if user is typing in another input (not our scan input)
      const target = e.target;
      if (target !== inputRef.current && 
          (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')) {
        return;
      }

      const now = Date.now();
      const timeDiff = now - lastKeyTime.current;
      
      if (e.key === 'Enter') {
        // End of scan - process buffer if it has content
        if (bufferRef.current.length >= 3) {
          e.preventDefault();
          processScan(bufferRef.current);
          bufferRef.current = '';
        }
        return;
      }

      // Only capture printable characters
      if (e.key.length === 1) {
        // If rapid input (< 50ms between keys), it's likely a scanner
        if (timeDiff < 50 || bufferRef.current.length > 0) {
          if (timeDiff > 500 && bufferRef.current.length > 0) {
            // Too long gap - reset buffer (user was typing something else)
            bufferRef.current = '';
          }
          bufferRef.current += e.key;
          e.preventDefault();
          setBarcode(bufferRef.current);
          
          // Auto-timeout: if no more input for 200ms, process what we have
          clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            if (bufferRef.current.length >= 3) {
              processScan(bufferRef.current);
              bufferRef.current = '';
            }
          }, 200);
        }
        lastKeyTime.current = now;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timerRef.current);
    };
  }, [globalCapture, processScan]);

  // Handle manual submit
  const handleSubmit = (e) => {
    e.preventDefault();
    if (barcode.trim()) {
      bufferRef.current = '';
      processScan(barcode.trim());
    }
  };

  // Status indicator color
  const statusColor = status === 'success' ? '#4caf50' : status === 'error' ? '#f44336' : status === 'processing' ? '#ff9800' : '#666';

  const modeLabels = {
    lookup: 'Lookup Item',
    count: 'Inventory Count',
    receive: 'Receive PO',
    transfer: 'Transfer',
    ship: 'Ship / Verify',
    production: 'Production',
    location: 'Location Lookup'
  };

  return (
    <div className={`scan-panel ${compact ? 'scan-panel-compact' : ''}`} style={{
      border: '2px solid #333',
      borderRadius: '8px',
      padding: compact ? '12px' : '16px',
      backgroundColor: '#1a1a2e',
      color: '#eee',
      marginBottom: '16px'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: '#4fc3f7', fontSize: compact ? '14px' : '16px' }}>
          {title || `Scan: ${modeLabels[mode] || mode}`}
        </h4>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <label style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={globalCapture} 
              onChange={(e) => setGlobalCapture(e.target.checked)}
              style={{ width: '14px', height: '14px' }}
            />
            Auto-Capture
          </label>
          <span style={{ 
            width: '10px', height: '10px', borderRadius: '50%', 
            backgroundColor: globalCapture ? '#4caf50' : '#666',
            display: 'inline-block',
            animation: globalCapture ? 'pulse 2s infinite' : 'none'
          }} />
        </div>
      </div>

      {/* Status Bar */}
      <div style={{ 
        padding: '8px 12px', 
        borderRadius: '4px', 
        backgroundColor: status === 'success' ? '#1b5e20' : status === 'error' ? '#b71c1c' : '#263238',
        marginBottom: '12px',
        fontSize: '13px',
        fontWeight: '500',
        borderLeft: `4px solid ${statusColor}`,
        transition: 'all 0.3s ease'
      }}>
        {statusMsg}
      </div>

      {/* Scan Input */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <input
          ref={inputRef}
          type="text"
          value={barcode}
          onChange={(e) => setBarcode(e.target.value)}
          placeholder="Scan barcode or type manually..."
          autoFocus
          style={{
            flex: 1,
            padding: '10px 14px',
            fontSize: '16px',
            fontFamily: 'monospace',
            fontWeight: 'bold',
            border: `2px solid ${globalCapture ? '#4fc3f7' : '#555'}`,
            borderRadius: '4px',
            backgroundColor: '#0d1117',
            color: '#fff',
            outline: 'none',
            letterSpacing: '1px'
          }}
        />
        <button 
          type="submit" 
          disabled={scanning || !barcode.trim()}
          style={{
            padding: '10px 16px',
            backgroundColor: '#1976d2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            opacity: scanning || !barcode.trim() ? 0.5 : 1
          }}
        >
          {scanning ? '...' : 'GO'}
        </button>
      </form>

      {/* Quantity input for count/receive/transfer modes */}
      {(mode === 'count' || mode === 'receive' || mode === 'transfer') && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <label style={{ fontSize: '12px', color: '#aaa' }}>Qty:</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            min="1"
            style={{
              width: '80px',
              padding: '6px 10px',
              fontSize: '14px',
              border: '1px solid #555',
              borderRadius: '4px',
              backgroundColor: '#0d1117',
              color: '#fff',
              textAlign: 'center'
            }}
          />
          <span style={{ fontSize: '11px', color: '#888' }}>Set quantity before scanning</span>
        </div>
      )}

      {/* Last Result Display */}
      {lastResult && (
        <div style={{ 
          padding: '10px', 
          borderRadius: '4px', 
          backgroundColor: '#0d1117', 
          marginBottom: '12px',
          fontSize: '12px',
          maxHeight: compact ? '120px' : '180px',
          overflowY: 'auto'
        }}>
          {lastResult.error ? (
            <span style={{ color: '#f44336' }}>{lastResult.error}</span>
          ) : lastResult.type === 'item' ? (
            <div>
              <div style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{lastResult.data?.item_number} - {lastResult.data?.description}</div>
              <div style={{ color: '#aaa', marginTop: '4px' }}>
                Type: {lastResult.data?.glass_type || 'N/A'} | Qty: {lastResult.data?.qty_on_hand || 0} | Location: {lastResult.data?.location || 'N/A'}
              </div>
            </div>
          ) : lastResult.type === 'location' ? (
            <div>
              <div style={{ color: '#66bb6a', fontWeight: 'bold' }}>Location: {lastResult.data?.code}</div>
              <div style={{ color: '#aaa', marginTop: '4px' }}>
                {lastResult.data?.name} | Items: {lastResult.data?.item_count || 0}
              </div>
            </div>
          ) : lastResult.type === 'work_order' ? (
            <div>
              <div style={{ color: '#ffa726', fontWeight: 'bold' }}>WO: {lastResult.data?.wo_number}</div>
              <div style={{ color: '#aaa', marginTop: '4px' }}>
                {lastResult.data?.item_desc} | Status: {lastResult.data?.status} | Qty: {lastResult.data?.quantity}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color: '#4fc3f7', fontWeight: 'bold' }}>{lastResult.message || 'Scan processed'}</div>
              {lastResult.data && (
                <pre style={{ color: '#aaa', marginTop: '4px', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(lastResult.data, null, 2).substring(0, 300)}
                </pre>
              )}
            </div>
          )}
        </div>
      )}

      {/* Scan History */}
      {scanHistory.length > 0 && !compact && (
        <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
          <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px', fontWeight: 'bold' }}>
            Recent Scans ({scanHistory.length})
          </div>
          {scanHistory.map((entry, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '4px 8px',
              fontSize: '11px',
              borderBottom: '1px solid #333',
              color: entry.success ? '#aaa' : '#f44336'
            }}>
              <span style={{ fontFamily: 'monospace' }}>{entry.barcode}</span>
              <span>{entry.time}</span>
            </div>
          ))}
        </div>
      )}

      {/* Compact history for compact mode */}
      {scanHistory.length > 0 && compact && (
        <div style={{ fontSize: '11px', color: '#888' }}>
          Last: <span style={{ fontFamily: 'monospace', color: scanHistory[0].success ? '#4caf50' : '#f44336' }}>
            {scanHistory[0].barcode}
          </span> at {scanHistory[0].time}
        </div>
      )}
    </div>
  );
}
