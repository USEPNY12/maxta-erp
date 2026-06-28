import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaTruck, FaBoxes, FaRoute, FaPlus, FaCheck, FaUndo, FaMapMarkerAlt } from 'react-icons/fa';

export default function Dispatch() {
  const [tab, setTab] = useState('racks');
  const [racks, setRacks] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [routeStops, setRouteStops] = useState([]);
  const [rackForm, setRackForm] = useState({ rack_number: '', rack_type: 'a-frame', capacity_sqft: '', capacity_pieces: '', max_weight_lbs: '', max_height_inches: '', max_width_inches: '' });
  const [routeForm, setRouteForm] = useState({ route_date: new Date().toISOString().split('T')[0], driver_name: '', vehicle: '', estimated_start: '07:00', estimated_end: '17:00' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'racks') {
        const res = await api.get('/api/dispatch/racks');
        setRacks(res.data.racks || []);
      } else {
        const res = await api.get('/api/dispatch/routes');
        setRoutes(res.data.routes || []);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const createRack = async () => {
    try {
      await api.post('/api/dispatch/racks', rackForm);
      toast.success('Rack created');
      setShowForm(false);
      setRackForm({ rack_number: '', rack_type: 'a-frame', capacity_sqft: '', capacity_pieces: '', max_weight_lbs: '', max_height_inches: '', max_width_inches: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const createRoute = async () => {
    try {
      const res = await api.post('/api/dispatch/routes', routeForm);
      toast.success(`Route ${res.data.route_number} created`);
      setShowForm(false);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateRackStatus = async (id, status) => {
    try {
      await api.put(`/api/dispatch/racks/${id}/status`, { status, current_location: status === 'available' ? 'Warehouse' : null });
      toast.success('Status updated');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const unloadRack = async (id) => {
    try {
      await api.put(`/api/dispatch/racks/${id}/unload`);
      toast.success('Rack unloaded & returned');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const viewRoute = async (route) => {
    try {
      const res = await api.get(`/api/dispatch/routes/${route.id}`);
      setSelectedRoute(res.data.route);
      setRouteStops(res.data.stops || []);
    } catch (err) { toast.error('Failed to load route'); }
  };

  const updateRouteStatus = async (id, status) => {
    try {
      await api.put(`/api/dispatch/routes/${id}`, { ...selectedRoute, status });
      toast.success('Route status updated');
      loadData();
      if (selectedRoute) viewRoute({ id });
    } catch (err) { toast.error('Failed'); }
  };

  const statusColor = (status) => {
    const map = { available: 'bg-green-100 text-green-800', loaded: 'bg-blue-100 text-blue-800', 'in-transit': 'bg-yellow-100 text-yellow-800', 'at-customer': 'bg-purple-100 text-purple-800', maintenance: 'bg-red-100 text-red-800', retired: 'bg-gray-100 text-gray-600', planning: 'bg-gray-100 text-gray-700', confirmed: 'bg-blue-100 text-blue-800', 'in-progress': 'bg-yellow-100 text-yellow-800', completed: 'bg-green-100 text-green-800', cancelled: 'bg-red-100 text-red-600' };
    return map[status] || 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaTruck className="text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-800">Dispatch & Rack Management</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="px-3 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 flex items-center gap-1">
          <FaPlus /> {tab === 'racks' ? 'New Rack' : 'New Route'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border-b px-4 flex gap-1">
        {[{id:'racks', label:'Racks & Stillages', icon: FaBoxes}, {id:'routes', label:'Delivery Routes', icon: FaRoute}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedRoute(null); }} className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1 ${tab === t.id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-96" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">{tab === 'racks' ? 'New Rack' : 'New Delivery Route'}</h3>
            {tab === 'racks' ? (
              <div className="space-y-2 text-xs">
                <div><label className="block font-medium">Rack Number</label><input className="w-full border rounded px-2 py-1" value={rackForm.rack_number} onChange={e => setRackForm({...rackForm, rack_number: e.target.value})} placeholder="RACK-009" /></div>
                <div><label className="block font-medium">Type</label>
                  <select className="w-full border rounded px-2 py-1" value={rackForm.rack_type} onChange={e => setRackForm({...rackForm, rack_type: e.target.value})}>
                    <option value="a-frame">A-Frame</option><option value="l-rack">L-Rack</option><option value="stillage">Stillage</option><option value="flat-bed">Flat Bed</option><option value="custom">Custom</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block font-medium">Capacity (sqft)</label><input type="number" className="w-full border rounded px-2 py-1" value={rackForm.capacity_sqft} onChange={e => setRackForm({...rackForm, capacity_sqft: e.target.value})} /></div>
                  <div><label className="block font-medium">Capacity (pcs)</label><input type="number" className="w-full border rounded px-2 py-1" value={rackForm.capacity_pieces} onChange={e => setRackForm({...rackForm, capacity_pieces: e.target.value})} /></div>
                  <div><label className="block font-medium">Max Weight (lbs)</label><input type="number" className="w-full border rounded px-2 py-1" value={rackForm.max_weight_lbs} onChange={e => setRackForm({...rackForm, max_weight_lbs: e.target.value})} /></div>
                  <div><label className="block font-medium">Max Height (in)</label><input type="number" className="w-full border rounded px-2 py-1" value={rackForm.max_height_inches} onChange={e => setRackForm({...rackForm, max_height_inches: e.target.value})} /></div>
                </div>
                <button onClick={createRack} className="w-full mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">Create Rack</button>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <div><label className="block font-medium">Route Date</label><input type="date" className="w-full border rounded px-2 py-1" value={routeForm.route_date} onChange={e => setRouteForm({...routeForm, route_date: e.target.value})} /></div>
                <div><label className="block font-medium">Driver</label><input className="w-full border rounded px-2 py-1" value={routeForm.driver_name} onChange={e => setRouteForm({...routeForm, driver_name: e.target.value})} /></div>
                <div><label className="block font-medium">Vehicle</label><input className="w-full border rounded px-2 py-1" value={routeForm.vehicle} onChange={e => setRouteForm({...routeForm, vehicle: e.target.value})} placeholder="Truck #, plate..." /></div>
                <div className="grid grid-cols-2 gap-2">
                  <div><label className="block font-medium">Est. Start</label><input type="time" className="w-full border rounded px-2 py-1" value={routeForm.estimated_start} onChange={e => setRouteForm({...routeForm, estimated_start: e.target.value})} /></div>
                  <div><label className="block font-medium">Est. End</label><input type="time" className="w-full border rounded px-2 py-1" value={routeForm.estimated_end} onChange={e => setRouteForm({...routeForm, estimated_end: e.target.value})} /></div>
                </div>
                <button onClick={createRoute} className="w-full mt-2 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700">Create Route</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'racks' && (
          <div>
            {/* Summary Cards */}
            <div className="grid grid-cols-6 gap-3 mb-4">
              {['available','loaded','in-transit','at-customer','maintenance'].map(s => {
                const count = racks.filter(r => r.status === s).length;
                return (
                  <div key={s} className="bg-white border rounded p-2 text-center">
                    <div className="text-lg font-bold">{count}</div>
                    <div className={`text-xs capitalize px-1 py-0.5 rounded ${statusColor(s)}`}>{s}</div>
                  </div>
                );
              })}
              <div className="bg-white border rounded p-2 text-center">
                <div className="text-lg font-bold">{racks.length}</div>
                <div className="text-xs text-gray-500">Total</div>
              </div>
            </div>
            {/* Racks Table */}
            <table className="w-full text-xs border-collapse bg-white">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="text-left p-2 border">Rack #</th>
                  <th className="text-left p-2 border">Type</th>
                  <th className="text-center p-2 border">Status</th>
                  <th className="text-left p-2 border">Location</th>
                  <th className="text-right p-2 border">Capacity</th>
                  <th className="text-right p-2 border">Max Size</th>
                  <th className="text-center p-2 border">Loads</th>
                  <th className="text-center p-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(racks || []).map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-2 border font-medium">{r.rack_number}</td>
                    <td className="p-2 border capitalize">{r.rack_type}</td>
                    <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.status)}`}>{r.status}</span></td>
                    <td className="p-2 border">{r.current_location || '-'}</td>
                    <td className="p-2 border text-right">{r.capacity_pieces} pcs / {r.capacity_sqft} sqft</td>
                    <td className="p-2 border text-right">{r.max_height_inches}"H × {r.max_width_inches}"W</td>
                    <td className="p-2 border text-center">{r.active_loads || 0}</td>
                    <td className="p-2 border text-center">
                      <div className="flex gap-1 justify-center">
                        {r.status === 'loaded' && <button onClick={() => updateRackStatus(r.id, 'in-transit')} className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs" title="Mark In-Transit">🚚</button>}
                        {r.status === 'in-transit' && <button onClick={() => updateRackStatus(r.id, 'at-customer')} className="px-2 py-0.5 bg-purple-500 text-white rounded text-xs" title="Delivered">📍</button>}
                        {(r.status === 'at-customer' || r.status === 'loaded') && <button onClick={() => unloadRack(r.id)} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs" title="Unload & Return"><FaUndo /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'routes' && (
          <div className="flex gap-4 h-full">
            {/* Routes List */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse bg-white">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border">Route #</th>
                    <th className="text-left p-2 border">Date</th>
                    <th className="text-left p-2 border">Driver</th>
                    <th className="text-left p-2 border">Vehicle</th>
                    <th className="text-center p-2 border">Stops</th>
                    <th className="text-center p-2 border">Delivered</th>
                    <th className="text-center p-2 border">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No delivery routes yet. Create one to start planning deliveries.</td></tr>}
                  {routes.map(r => (
                    <tr key={r.id} className={`hover:bg-blue-50 cursor-pointer ${selectedRoute?.id === r.id ? 'bg-blue-50' : ''}`} onClick={() => viewRoute(r)}>
                      <td className="p-2 border font-medium">{r.route_number}</td>
                      <td className="p-2 border">{new Date(r.route_date).toLocaleDateString()}</td>
                      <td className="p-2 border">{r.driver_name || '-'}</td>
                      <td className="p-2 border">{r.vehicle || '-'}</td>
                      <td className="p-2 border text-center">{r.stop_count}</td>
                      <td className="p-2 border text-center">{r.delivered_count}/{r.stop_count}</td>
                      <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusColor(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Route Detail */}
            {selectedRoute && (
              <div className="w-80 bg-white border rounded p-3 overflow-auto">
                <h3 className="font-bold text-sm mb-2">{selectedRoute.route_number}</h3>
                <div className="text-xs space-y-1 mb-3">
                  <p><span className="font-medium">Date:</span> {new Date(selectedRoute.route_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Driver:</span> {selectedRoute.driver_name}</p>
                  <p><span className="font-medium">Vehicle:</span> {selectedRoute.vehicle}</p>
                  <p><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded ${statusColor(selectedRoute.status)}`}>{selectedRoute.status}</span></p>
                </div>
                <div className="flex gap-1 mb-3">
                  {selectedRoute.status === 'planning' && <button onClick={() => updateRouteStatus(selectedRoute.id, 'confirmed')} className="px-2 py-1 bg-blue-600 text-white rounded text-xs">Confirm</button>}
                  {selectedRoute.status === 'confirmed' && <button onClick={() => updateRouteStatus(selectedRoute.id, 'in-progress')} className="px-2 py-1 bg-yellow-600 text-white rounded text-xs">Start</button>}
                  {selectedRoute.status === 'in-progress' && <button onClick={() => updateRouteStatus(selectedRoute.id, 'completed')} className="px-2 py-1 bg-green-600 text-white rounded text-xs">Complete</button>}
                </div>
                <h4 className="font-medium text-xs mb-1">Stops ({routeStops.length}):</h4>
                {routeStops.map((s, i) => (
                  <div key={s.id} className="border rounded p-2 mb-1 text-xs">
                    <div className="flex items-center gap-1">
                      <FaMapMarkerAlt className="text-red-500" />
                      <span className="font-medium">Stop {s.stop_sequence}</span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded text-xs ${statusColor(s.status)}`}>{s.status}</span>
                    </div>
                    <p className="mt-1">{s.customer_name || s.address}</p>
                    {s.shipment_number && <p className="text-gray-500">Shipment: {s.shipment_number}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
