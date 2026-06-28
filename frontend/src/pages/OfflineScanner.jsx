import { useState, useEffect, useRef } from 'react';

const API = '/api/mobile';
const DB_NAME = 'maxta_offline_scans';
const STORE_NAME = 'scan_queue';
const DB_VERSION = 1;

// IndexedDB helper
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('actionType', 'actionType', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addToQueue(action) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.add({ ...action, status: 'pending', queuedAt: new Date().toISOString(), deviceId: getDeviceId() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueue() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function clearSynced() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('status');
    const request = index.openCursor(IDBKeyRange.only('synced'));
    request.onsuccess = (e) => {
      const cursor = e.target.result;
      if (cursor) { cursor.delete(); cursor.continue(); }
    };
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function markSynced(ids) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    ids.forEach(id => {
      const req = store.get(id);
      req.onsuccess = () => {
        const item = req.result;
        if (item) { item.status = 'synced'; item.syncedAt = new Date().toISOString(); store.put(item); }
      };
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getDeviceId() {
  let id = localStorage.getItem('maxta_device_id');
  if (!id) { id = 'dev_' + Math.random().toString(36).substr(2, 9); localStorage.setItem('maxta_device_id', id); }
  return id;
}

export default function OfflineScanner() {
  const [online, setOnline] = useState(navigator.onLine);
  const [scanMode, setScanMode] = useState('production'); // production, inventory, receiving, shipping
  const [barcode, setBarcode] = useState('');
  const [queue, setQueue] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [showQueue, setShowQueue] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const inputRef = useRef(null);
  const token = localStorage.getItem('erp_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => { setOnline(true); syncQueue(); };
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    // Listen for SW sync message
    navigator.serviceWorker?.addEventListener('message', (e) => {
      if (e.data?.type === 'SYNC_OFFLINE_SCANS') syncQueue();
    });
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); };
  }, []);

  // Load queue on mount
  useEffect(() => { loadQueue(); loadConflicts(); }, []);

  const loadQueue = async () => {
    const items = await getQueue();
    setQueue(items.filter(i => i.status === 'pending'));
  };

  const loadConflicts = async () => {
    if (!navigator.onLine) return;
    try {
      const res = await fetch(`${API}/offline/conflicts`, { headers });
      if (res.ok) setConflicts(await res.json());
    } catch (e) {}
  };

  // Sync queue to server
  const syncQueue = async () => {
    if (syncing) return;
    setSyncing(true);
    try {
      const items = await getQueue();
      const pending = items.filter(i => i.status === 'pending');
      if (pending.length === 0) { setSyncing(false); return; }

      const actions = pending.map(item => ({
        actionType: item.actionType,
        payload: item.payload,
        queuedAt: item.queuedAt,
        deviceId: item.deviceId
      }));

      const res = await fetch(`${API}/offline/sync`, {
        method: 'POST', headers,
        body: JSON.stringify({ actions })
      });

      if (res.ok) {
        const result = await res.json();
        // Mark successful ones as synced
        const syncedIds = pending.filter((_, i) => result.results[i]?.success).map(p => p.id);
        await markSynced(syncedIds);
        await clearSynced();
        await loadQueue();
        loadConflicts();
      }
    } catch (e) { console.error('Sync failed:', e); }
    setSyncing(false);
  };

  // Handle scan
  const handleScan = async (code) => {
    if (!code.trim()) return;
    const scanData = {
      actionType: scanMode === 'production' ? 'production_scan' :
                  scanMode === 'inventory' ? 'inventory_transfer' :
                  scanMode === 'receiving' ? 'receiving_scan' : 'shipping_verify',
      payload: buildPayload(scanMode, code),
    };

    // Always queue locally first (works offline)
    await addToQueue(scanData);
    
    const historyEntry = { code, mode: scanMode, time: new Date(), status: online ? 'syncing' : 'queued' };
    setScanHistory(prev => [historyEntry, ...prev.slice(0, 49)]);
    setLastScan(historyEntry);
    setBarcode('');
    await loadQueue();

    // If online, try immediate sync
    if (online) {
      await syncQueue();
      historyEntry.status = 'synced';
      setScanHistory(prev => [historyEntry, ...prev.slice(1)]);
    }

    // Focus input for next scan
    inputRef.current?.focus();
  };

  const buildPayload = (mode, code) => {
    switch (mode) {
      case 'production': return { barcode: code, stationId: 0, timestamp: new Date().toISOString() };
      case 'inventory': return { barcode: code, itemId: null, fromLocation: 'scan', toLocation: 'pending', quantity: 1 };
      case 'receiving': return { barcode: code, poId: null, itemId: null, quantity: 1 };
      case 'shipping': return { barcode: code, shipmentId: null, verified: true };
      default: return { barcode: code };
    }
  };

  const modeConfig = {
    production: { label: 'Production Tracking', icon: '🏭', color: 'bg-blue-600', desc: 'Scan WO barcode at each station' },
    inventory: { label: 'Inventory Transfer', icon: '📦', color: 'bg-green-600', desc: 'Scan item → scan destination' },
    receiving: { label: 'Receiving', icon: '📥', color: 'bg-purple-600', desc: 'Scan PO items as they arrive' },
    shipping: { label: 'Shipping Verify', icon: '🚚', color: 'bg-orange-600', desc: 'Verify items against packing list' }
  };

  const pendingCount = queue.length;

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-4">
      {/* Header with online/offline indicator */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Offline Scanner</h1>
          <p className="text-gray-400 text-sm">Scans work even without internet</p>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-3 py-1 bg-yellow-600/30 text-yellow-400 rounded-full text-sm font-medium">
              {pendingCount} pending
            </span>
          )}
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${online ? 'bg-green-600/30 text-green-400' : 'bg-red-600/30 text-red-400'}`}>
            <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
            {online ? 'Online' : 'Offline'}
          </div>
        </div>
      </div>

      {/* Scan Mode Selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {Object.entries(modeConfig).map(([mode, config]) => (
          <button
            key={mode}
            onClick={() => setScanMode(mode)}
            className={`p-3 rounded-xl border-2 transition-all ${scanMode === mode ? `${config.color} border-white/30` : 'bg-gray-800 border-gray-700 hover:border-gray-500'}`}
          >
            <div className="text-2xl mb-1">{config.icon}</div>
            <div className="text-white text-sm font-medium">{config.label}</div>
          </button>
        ))}
      </div>

      {/* Scan Input */}
      <div className="bg-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">{modeConfig[scanMode].icon}</span>
          <span className="text-white font-medium">{modeConfig[scanMode].label}</span>
          <span className="text-gray-500 text-sm ml-2">{modeConfig[scanMode].desc}</span>
        </div>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={barcode}
            onChange={e => setBarcode(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleScan(barcode); }}
            placeholder="Scan barcode or type code..."
            className="flex-1 p-4 bg-gray-700 text-white rounded-xl text-lg border border-gray-600 focus:border-blue-500 focus:outline-none"
            autoFocus
          />
          <button
            onClick={() => handleScan(barcode)}
            disabled={!barcode.trim()}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl text-lg font-bold"
          >
            Scan
          </button>
        </div>
      </div>

      {/* Last Scan Result */}
      {lastScan && (
        <div className={`rounded-xl p-4 flex items-center gap-3 ${lastScan.status === 'synced' ? 'bg-green-900/30 border border-green-700' : 'bg-yellow-900/30 border border-yellow-700'}`}>
          <span className="text-2xl">{lastScan.status === 'synced' ? '✅' : '⏳'}</span>
          <div>
            <div className="text-white font-medium">{lastScan.code}</div>
            <div className="text-gray-400 text-sm">{modeConfig[lastScan.mode]?.label} • {lastScan.status === 'synced' ? 'Synced' : 'Queued for sync'}</div>
          </div>
        </div>
      )}

      {/* Sync Button */}
      {pendingCount > 0 && online && (
        <button
          onClick={syncQueue}
          disabled={syncing}
          className="w-full p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-xl text-lg font-bold flex items-center justify-center gap-2"
        >
          {syncing ? (
            <><span className="animate-spin">⟳</span> Syncing...</>
          ) : (
            <>⬆️ Sync {pendingCount} Pending Scan{pendingCount > 1 ? 's' : ''}</>
          )}
        </button>
      )}

      {/* Queue / History Toggle */}
      <div className="flex gap-2">
        <button onClick={() => setShowQueue(false)} className={`flex-1 p-3 rounded-xl text-sm font-medium ${!showQueue ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          Scan History ({scanHistory.length})
        </button>
        <button onClick={() => setShowQueue(true)} className={`flex-1 p-3 rounded-xl text-sm font-medium ${showQueue ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
          Sync Queue ({pendingCount})
        </button>
      </div>

      {/* History / Queue List */}
      <div className="bg-gray-800 rounded-xl overflow-hidden">
        {!showQueue ? (
          scanHistory.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No scans yet. Start scanning above.</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {scanHistory.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{modeConfig[item.mode]?.icon}</span>
                    <div>
                      <div className="text-white text-sm font-mono">{item.code}</div>
                      <div className="text-gray-500 text-xs">{item.time.toLocaleTimeString()}</div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${item.status === 'synced' ? 'bg-green-600/30 text-green-400' : 'bg-yellow-600/30 text-yellow-400'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )
        ) : (
          queue.length === 0 ? (
            <div className="p-8 text-center text-gray-500">Queue is empty. All scans synced.</div>
          ) : (
            <div className="divide-y divide-gray-700">
              {(queue || []).map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-white text-sm">{item.actionType}</div>
                    <div className="text-gray-500 text-xs">{new Date(item.queuedAt).toLocaleString()}</div>
                  </div>
                  <span className="px-2 py-1 bg-yellow-600/30 text-yellow-400 rounded text-xs">{item.status}</span>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <div className="bg-red-900/20 border border-red-700 rounded-xl p-4">
          <h3 className="text-red-400 font-bold mb-2">Sync Conflicts ({conflicts.length})</h3>
          <div className="space-y-2">
            {conflicts.map(c => (
              <div key={c.id} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
                <div>
                  <div className="text-white text-sm">{c.action_type}</div>
                  <div className="text-red-400 text-xs">{c.error_message}</div>
                </div>
                <div className="flex gap-2">
                  <button className="px-2 py-1 bg-blue-600 rounded text-xs text-white">Retry</button>
                  <button className="px-2 py-1 bg-gray-600 rounded text-xs text-white">Discard</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
