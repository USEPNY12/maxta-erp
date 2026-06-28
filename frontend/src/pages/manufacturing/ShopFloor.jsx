import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function ShopFloor() {
  const [searchParams] = useSearchParams();
  const [stations, setStations] = useState([]);
  const [activeStation, setActiveStation] = useState(null);
  const [queue, setQueue] = useState([]);
  const [scanInput, setScanInput] = useState('');
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showRecutModal, setShowRecutModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [completeForm, setCompleteForm] = useState({ quantity_good: '', quantity_scrap: 0, scrap_reason: '', notes: '' });
  const [recutForm, setRecutForm] = useState({ quantity: 1, reason_code: '', notes: '' });

  useEffect(() => { fetchStations(); }, []);
  useEffect(() => { if (activeStation) fetchQueue(); }, [activeStation]);

  const fetchStations = async () => {
    try {
      const res = await api.get('/api/manufacturing/shop-floor/overview');
      const data = Array.isArray(res.data) ? res.data : [];
      setStations(data);
      const paramStation = searchParams.get('station');
      if (paramStation) setActiveStation(parseInt(paramStation));
      else if (data.length > 0) setActiveStation(data[0].id);
    } catch { setStations([]); }
  };

  const fetchQueue = async () => {
    try {
      const res = await api.get(`/api/manufacturing/shop-floor/queue/${activeStation}`);
      setQueue(Array.isArray(res.data) ? res.data : []);
    } catch { setQueue([]); }
  };

  const station = stations?.find(s => s.id === activeStation);

  const handleScan = () => {
    if (!scanInput.trim()) return;
    toast.info(`Scanned: ${scanInput}`);
    setScanInput('');
  };

  const startItem = async (item) => {
    try {
      await api.post('/api/manufacturing/shop-floor/start', { wo_routing_id: item.routing_id, operator_name: 'Operator' });
      toast.success('Operation started');
      fetchQueue();
      fetchStations();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to start'); }
  };

  const openCompleteModal = (item) => {
    setSelectedItem(item);
    setCompleteForm({ quantity_good: item.quantity || '', quantity_scrap: 0, scrap_reason: '', notes: '' });
    setShowCompleteModal(true);
  };

  const handleComplete = async () => {
    try {
      const res = await api.post('/api/manufacturing/shop-floor/complete', {
        wo_routing_id: selectedItem.routing_id,
        quantity_good: parseFloat(completeForm.quantity_good) || 0,
        quantity_scrap: parseFloat(completeForm.quantity_scrap) || 0,
        scrap_reason: completeForm.scrap_reason, notes: completeForm.notes
      });
      if (res.data.all_complete) toast.success('All operations complete - WO finished!');
      else toast.success('Operation completed - moved to next station');
      setShowCompleteModal(false);
      fetchQueue();
      fetchStations();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openRecutModal = (item) => {
    setSelectedItem(item);
    setRecutForm({ quantity: 1, reason_code: '', notes: '' });
    setShowRecutModal(true);
  };

  const handleRecut = async () => {
    try {
      await api.post('/api/manufacturing/shop-floor/recut', {
        wo_routing_id: selectedItem.routing_id,
        quantity: parseInt(recutForm.quantity) || 1,
        reason_code: recutForm.reason_code, notes: recutForm.notes
      });
      toast.success('Recut flagged');
      setShowRecutModal(false);
      fetchQueue();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const priorityColors = { urgent: 'bg-red-600', high: 'bg-orange-500', normal: 'bg-blue-500', low: 'bg-gray-400' };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex">
      {/* Station Sidebar */}
      <div className="w-56 bg-gray-900 text-white overflow-y-auto flex-shrink-0">
        <div className="p-3 border-b border-gray-700">
          <h3 className="font-bold text-sm">Stations</h3>
          <p className="text-[10px] text-gray-400">Select department</p>
        </div>
        {(stations || [])?.map(s => (
          <button
            key={s.id}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-gray-800 border-b border-gray-800 ${activeStation === s.id ? 'bg-blue-900 border-l-4 border-l-blue-400' : ''}`}
            onClick={() => setActiveStation(s.id)}
          >
            <span><span className="mr-1">{s.icon}</span>{s.name}</span>
            {s.queue_count > 0 && <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{s.queue_count}</span>}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Station Header */}
        <div className="text-white p-4 flex-shrink-0" style={{ backgroundColor: station?.color || '#2563eb' }}>
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold">{station?.icon} {station?.name || 'Select Station'}</h2>
              <p className="text-sm opacity-80">{station?.department} Department - {queue.length} items in queue ({queue?.filter(q => q.op_status === 'in_progress').length} active)</p>
            </div>
            <div className="flex gap-2 items-center">
              <input
                className="px-3 py-2 rounded text-black text-sm w-64"
                placeholder="Scan barcode or enter WO#..."
                value={scanInput}
                onChange={e => setScanInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleScan()}
              />
              <button className="bg-white text-gray-800 px-4 py-2 rounded text-sm font-bold" onClick={handleScan}>Scan</button>
            </div>
          </div>
        </div>

        {/* Queue Cards */}
        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {queue.length === 0 ? (
            <div className="text-center text-gray-500 mt-16">
              <p className="text-5xl mb-4">{station?.icon || '🏭'}</p>
              <p className="text-lg font-bold">No items in queue</p>
              <p className="text-sm">This station is clear. Scan a barcode to receive items.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-3">
              {(queue || [])?.map(item => (
                <div key={item.routing_id} className="bg-white border border-gray-300 rounded shadow-sm hover:shadow-md transition-shadow">
                  {/* Card Header */}
                  <div className="bg-gray-100 border-b border-gray-300 px-3 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${priorityColors[item.priority] || 'bg-blue-500'}`}></span>
                      <span className="font-bold text-sm text-blue-700">WO# {item.wo_number}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${item.op_status === 'in_progress' ? 'bg-yellow-100 text-yellow-800 border border-yellow-300' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                      {item.op_status === 'in_progress' ? 'IN PROGRESS' : 'WAITING'}
                    </span>
                  </div>

                  {/* Card Body - Glass Specs */}
                  <div className="p-3 text-xs space-y-1">
                    <div className="flex justify-between"><span className="text-gray-500">Item:</span><span className="font-bold">{item.item_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Product:</span><span className="font-bold capitalize">{(item.product_type || '').replace(/_/g, ' ')}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Glass:</span><span>{item.glass_type || '-'} {item.thickness ? `${item.thickness}mm` : ''}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Size:</span><span className="font-bold text-blue-700">{item.width}" x {item.height}"</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Edge:</span><span>{item.edge_type || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Qty:</span><span className="font-bold">{item.quantity}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Customer:</span><span>{item.customer_name || 'Stock'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Due:</span><span className="text-red-600 font-bold">{formatDate(item.finish_date)}</span></div>
                    {item.has_holes === 1 && <div className="text-purple-700 font-bold">🕳️ HOLES REQUIRED {item.hole_specs ? `- ${item.hole_specs}` : ''}</div>}
                    {item.has_notches === 1 && <div className="text-purple-700 font-bold">🔧 NOTCHES REQUIRED</div>}
                    {item.interlayer_type && <div className="text-green-700 font-bold">🧪 Interlayer: {item.interlayer_type}</div>}
                    {item.operation_description && <div className="mt-1 p-1.5 bg-blue-50 border border-blue-200 rounded text-[10px]"><strong>Operation:</strong> {item.operation_description}</div>}
                    {item.wo_notes && <div className="mt-1 p-1.5 bg-yellow-50 border border-yellow-200 rounded text-[10px]">{item.wo_notes}</div>}
                  </div>

                  {/* Card Actions */}
                  <div className="border-t border-gray-200 px-3 py-2 flex gap-2">
                    {item.op_status !== 'in_progress' ? (
                      <button className="flex-1 bg-blue-600 text-white text-xs py-1.5 rounded font-bold hover:bg-blue-700" onClick={() => startItem(item)}>
                        ▶ Start
                      </button>
                    ) : (
                      <button className="flex-1 bg-green-600 text-white text-xs py-1.5 rounded font-bold hover:bg-green-700" onClick={() => openCompleteModal(item)}>
                        ✓ Complete
                      </button>
                    )}
                    <button className="bg-red-100 text-red-700 text-xs py-1.5 px-3 rounded font-bold hover:bg-red-200" onClick={() => openRecutModal(item)}>
                      ⚠️ Recut
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-4">
            <h3 className="font-bold text-lg mb-3">Complete Operation</h3>
            <p className="text-sm text-gray-600 mb-3">WO# {selectedItem?.wo_number} - {selectedItem?.operation_description}</p>
            <div className="space-y-2">
              <div><label className="text-xs text-gray-600">Qty Good:</label><input type="number" className="erp-form-input w-full" value={completeForm.quantity_good} onChange={e => setCompleteForm({...completeForm, quantity_good: e.target.value})} /></div>
              <div><label className="text-xs text-gray-600">Qty Scrap:</label><input type="number" className="erp-form-input w-full" value={completeForm.quantity_scrap} onChange={e => setCompleteForm({...completeForm, quantity_scrap: e.target.value})} /></div>
              {completeForm.quantity_scrap > 0 && <div><label className="text-xs text-gray-600">Scrap Reason:</label><input className="erp-form-input w-full" value={completeForm.scrap_reason} onChange={e => setCompleteForm({...completeForm, scrap_reason: e.target.value})} /></div>}
              <div><label className="text-xs text-gray-600">Notes:</label><textarea className="erp-form-input w-full" rows="2" value={completeForm.notes} onChange={e => setCompleteForm({...completeForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-green-600 text-white py-2 rounded font-bold" onClick={handleComplete}>Complete</button>
              <button className="flex-1 bg-gray-200 py-2 rounded" onClick={() => setShowCompleteModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Recut Modal */}
      {showRecutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-96 p-4">
            <h3 className="font-bold text-lg mb-3 text-red-700">Flag Recut</h3>
            <p className="text-sm text-gray-600 mb-3">WO# {selectedItem?.wo_number}</p>
            <div className="space-y-2">
              <div><label className="text-xs text-gray-600">Qty to Recut:</label><input type="number" className="erp-form-input w-full" value={recutForm.quantity} onChange={e => setRecutForm({...recutForm, quantity: e.target.value})} /></div>
              <div><label className="text-xs text-gray-600">Reason:</label>
                <select className="erp-form-select w-full" value={recutForm.reason_code} onChange={e => setRecutForm({...recutForm, reason_code: e.target.value})}>
                  <option value="">Select reason...</option>
                  <option value="breakage">Breakage</option>
                  <option value="scratch">Scratch/Damage</option>
                  <option value="wrong_size">Wrong Size</option>
                  <option value="chip">Chip/Edge Defect</option>
                  <option value="inclusion">Inclusion/NiS</option>
                  <option value="warp">Warp/Roller Wave</option>
                  <option value="delamination">Delamination</option>
                  <option value="seal_failure">Seal Failure</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div><label className="text-xs text-gray-600">Notes:</label><textarea className="erp-form-input w-full" rows="2" value={recutForm.notes} onChange={e => setRecutForm({...recutForm, notes: e.target.value})} /></div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-red-600 text-white py-2 rounded font-bold" onClick={handleRecut}>Flag Recut</button>
              <button className="flex-1 bg-gray-200 py-2 rounded" onClick={() => setShowRecutModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default ShopFloor;
