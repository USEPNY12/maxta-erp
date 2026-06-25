import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

const STATIONS = [
  { id: 'cutting', name: 'Cutting Table', icon: '✂️', color: 'blue' },
  { id: 'edging', name: 'Polishing/Edging', icon: '💎', color: 'purple' },
  { id: 'drilling', name: 'CNC/Drilling', icon: '🔩', color: 'orange' },
  { id: 'lamination', name: 'Lamination', icon: '🔗', color: 'teal' },
  { id: 'tempering', name: 'Tempering Oven', icon: '🔥', color: 'red' },
  { id: 'qc', name: 'QC / Inspection', icon: '✅', color: 'green' },
  { id: 'packing', name: 'Packing/Shipping', icon: '📦', color: 'gray' },
];

function ShopFloor() {
  const [activeStation, setActiveStation] = useState('cutting');
  const [queue, setQueue] = useState([]);
  const [scanInput, setScanInput] = useState('');

  useEffect(() => { fetchQueue(); }, [activeStation]);

  const fetchQueue = async () => {
    try {
      const res = await api.get('/api/manufacturing/shop-floor/queue', { params: { station: activeStation } });
      setQueue(res.data || []);
    } catch { setQueue([]); }
  };

  const handleScan = async () => {
    if (!scanInput.trim()) return;
    try {
      await api.post('/api/manufacturing/shop-floor/scan', { barcode: scanInput, station: activeStation, action: 'receive' });
      toast.success(`Item received at ${STATIONS.find(s => s.id === activeStation)?.name}`);
      setScanInput('');
      fetchQueue();
    } catch (err) { toast.error(err.response?.data?.error || 'Scan failed'); }
  };

  const completeItem = async (itemId) => {
    try {
      await api.post('/api/manufacturing/shop-floor/complete', { tracking_id: itemId, station: activeStation });
      toast.success('Item completed! Label ready to print.');
      fetchQueue();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete'); }
  };

  const printLabel = async (itemId) => {
    try {
      const res = await api.get(`/api/labels/station/${itemId}`, { params: { station: activeStation }, responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `label_${itemId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Label downloaded');
    } catch { toast.error('Failed to generate label'); }
  };

  const flagRecut = async (itemId) => {
    const reason = prompt('Enter recut reason:');
    if (!reason) return;
    try {
      await api.post('/api/manufacturing/shop-floor/recut', { tracking_id: itemId, station: activeStation, reason });
      toast.warning('Item flagged for recut');
      fetchQueue();
    } catch (err) { toast.error('Failed to flag recut'); }
  };

  const station = STATIONS.find(s => s.id === activeStation);

  return (
    <div className="h-full flex">
      {/* Station Selector - Left Panel */}
      <div className="w-48 bg-gray-800 text-white flex flex-col">
        <div className="p-3 border-b border-gray-700">
          <h3 className="text-sm font-bold">Shop Floor</h3>
          <p className="text-xs text-gray-400">Select Station</p>
        </div>
        {STATIONS.map(s => (
          <button
            key={s.id}
            className={`text-left px-3 py-3 text-xs border-b border-gray-700 hover:bg-gray-700 transition ${activeStation === s.id ? 'bg-blue-900 border-l-4 border-l-blue-400' : ''}`}
            onClick={() => setActiveStation(s.id)}
          >
            <span className="mr-2">{s.icon}</span>{s.name}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Station Header */}
        <div className={`bg-${station?.color || 'blue'}-600 text-white p-4`} style={{ backgroundColor: station?.color === 'blue' ? '#2563eb' : station?.color === 'purple' ? '#7c3aed' : station?.color === 'orange' ? '#ea580c' : station?.color === 'teal' ? '#0d9488' : station?.color === 'red' ? '#dc2626' : station?.color === 'green' ? '#16a34a' : '#4b5563' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{station?.icon} {station?.name}</h2>
              <p className="text-sm opacity-80">{queue.length} items in queue</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                className="px-3 py-2 rounded text-black text-sm w-64"
                placeholder="Scan barcode or enter WO#..."
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
                autoFocus
              />
              <button className="bg-white text-gray-800 px-4 py-2 rounded text-sm font-bold" onClick={handleScan}>
                Scan In
              </button>
            </div>
          </div>
        </div>

        {/* Queue */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {queue.length === 0 ? (
            <div className="text-center text-gray-500 mt-16">
              <p className="text-4xl mb-4">{station?.icon}</p>
              <p className="text-lg">No items in queue</p>
              <p className="text-sm">Scan a barcode to receive items at this station</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {queue.map(item => (
                <div key={item.id} className="bg-white border border-gray-300 rounded shadow-sm">
                  {/* Card Header */}
                  <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-between items-center">
                    <span className="font-bold text-sm text-blue-700">WO# {item.wo_number}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${item.status === 'In Progress' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                      {item.status || 'Waiting'}
                    </span>
                  </div>
                  {/* Card Body */}
                  <div className="p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-600">Item:</span><span className="font-bold">{item.item_no}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Description:</span><span>{item.description}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Dimensions:</span><span className="font-bold">{item.width}" x {item.height}"</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Quantity:</span><span className="font-bold">{item.quantity}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Customer:</span><span>{item.customer_name || 'Stock'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Due Date:</span><span className="text-red-600 font-bold">{item.due_date || 'N/A'}</span></div>
                    {item.notes && <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">{item.notes}</div>}
                  </div>
                  {/* Card Actions */}
                  <div className="border-t border-gray-200 px-3 py-2 flex gap-2">
                    <button className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded font-bold hover:bg-green-700" onClick={() => completeItem(item.id)}>
                      ✓ Complete
                    </button>
                    <button className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded font-bold hover:bg-blue-700" onClick={() => printLabel(item.id)}>
                      🏷️ Print Label
                    </button>
                    <button className="bg-red-100 text-red-700 text-xs py-1.5 px-3 rounded font-bold hover:bg-red-200" onClick={() => flagRecut(item.id)}>
                      ⚠️ Recut
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ShopFloor;
