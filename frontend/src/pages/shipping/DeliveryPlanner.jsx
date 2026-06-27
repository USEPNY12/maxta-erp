import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DeliveryPlanner() {
  const [routes, setRoutes] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddStopModal, setShowAddStopModal] = useState(false);
  const [filter, setFilter] = useState({ status: '', date_from: '', date_to: '' });
  const [newRoute, setNewRoute] = useState({ route_name: '', route_date: new Date().toISOString().split('T')[0], driver_id: '', vehicle_id: '', notes: '' });
  const [newStop, setNewStop] = useState({ customer_id: '', delivery_address: '', city: '', state: 'TX', zip: '', pieces_count: 0, weight_lbs: 0, special_instructions: '' });
  const [customers, setCustomers] = useState([]);

  useEffect(() => { loadRoutes(); loadDrivers(); loadVehicles(); loadCustomers(); }, []);

  const loadRoutes = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.status) params.append('status', filter.status);
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      const res = await api.get(`/shipping/routes?${params}`);
      setRoutes(res.data);
    } catch (e) { console.error(e); }
  };
  const loadDrivers = async () => { try { const r = await api.get('/shipping/drivers'); setDrivers(r.data); } catch(e){} };
  const loadVehicles = async () => { try { const r = await api.get('/shipping/vehicles'); setVehicles(r.data); } catch(e){} };
  const loadCustomers = async () => { try { const r = await api.get('/customers'); setCustomers(r.data || []); } catch(e){} };

  const loadRouteDetail = async (id) => {
    try { const r = await api.get(`/shipping/routes/${id}`); setSelectedRoute(r.data); } catch(e) { console.error(e); }
  };

  const createRoute = async () => {
    try {
      await api.post('/shipping/routes', newRoute);
      setShowCreateModal(false);
      setNewRoute({ route_name: '', route_date: new Date().toISOString().split('T')[0], driver_id: '', vehicle_id: '', notes: '' });
      loadRoutes();
    } catch(e) { alert(e.response?.data?.error || 'Error creating route'); }
  };

  const addStop = async () => {
    try {
      await api.post('/shipping/stops', { ...newStop, route_id: selectedRoute.id });
      setShowAddStopModal(false);
      setNewStop({ customer_id: '', delivery_address: '', city: '', state: 'TX', zip: '', pieces_count: 0, weight_lbs: 0, special_instructions: '' });
      loadRouteDetail(selectedRoute.id);
    } catch(e) { alert(e.response?.data?.error || 'Error adding stop'); }
  };

  const optimizeRoute = async () => {
    try {
      await api.post(`/shipping/routes/${selectedRoute.id}/optimize`);
      loadRouteDetail(selectedRoute.id);
    } catch(e) { alert('Error optimizing route'); }
  };

  const startRoute = async () => {
    try {
      await api.post(`/shipping/routes/${selectedRoute.id}/start`);
      loadRouteDetail(selectedRoute.id);
      loadRoutes();
    } catch(e) { alert('Error starting route'); }
  };

  const statusColors = { planning: '#6b7280', confirmed: '#3b82f6', in_progress: '#f59e0b', completed: '#10b981', cancelled: '#ef4444' };
  const stopStatusColors = { pending: '#6b7280', en_route: '#3b82f6', arrived: '#f59e0b', delivered: '#10b981', failed: '#ef4444', skipped: '#9ca3af' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Delivery Route Planner</h1>
        <button onClick={() => setShowCreateModal(true)} style={{ background: '#2563eb', color: 'white', padding: '10px 20px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
          + New Route
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <select value={filter.status} onChange={e => setFilter({...filter, status: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
          <option value="">All Statuses</option>
          <option value="planning">Planning</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <input type="date" value={filter.date_from} onChange={e => setFilter({...filter, date_from: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        <input type="date" value={filter.date_to} onChange={e => setFilter({...filter, date_to: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        <button onClick={loadRoutes} style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Filter</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedRoute ? '1fr 1.5fr' : '1fr', gap: '20px' }}>
        {/* Routes List */}
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', background: '#f9fafb', borderBottom: '1px solid #e5e7eb', fontWeight: '600' }}>
            Routes ({routes.length})
          </div>
          <div style={{ maxHeight: '600px', overflow: 'auto' }}>
            {routes.map(route => (
              <div key={route.id} onClick={() => loadRouteDetail(route.id)}
                style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedRoute?.id === route.id ? '#eff6ff' : 'white' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{route.route_number} - {route.route_name}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{new Date(route.route_date).toLocaleDateString()} | {route.driver_name || 'Unassigned'}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: statusColors[route.status] + '20', color: statusColors[route.status], fontWeight: '600' }}>
                      {route.status}
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>{route.delivered_count}/{route.stop_count} stops</span>
                  </div>
                </div>
              </div>
            ))}
            {routes.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No routes found</div>}
          </div>
        </div>

        {/* Route Detail */}
        {selectedRoute && (
          <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{selectedRoute.route_number} - {selectedRoute.route_name}</h2>
                  <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                    {selectedRoute.driver_name || 'No driver'} | {selectedRoute.vehicle_number || 'No vehicle'} | {new Date(selectedRoute.route_date).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {selectedRoute.status === 'planning' && (
                    <>
                      <button onClick={() => setShowAddStopModal(true)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>+ Add Stop</button>
                      <button onClick={optimizeRoute} style={{ padding: '6px 12px', background: '#8b5cf6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Optimize</button>
                      <button onClick={startRoute} style={{ padding: '6px 12px', background: '#f59e0b', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Start Route</button>
                    </>
                  )}
                </div>
              </div>
            </div>
            {/* Stops */}
            <div style={{ padding: '16px' }}>
              <h3 style={{ fontWeight: '600', marginBottom: '12px' }}>Stops ({selectedRoute.stops?.length || 0})</h3>
              {selectedRoute.stops?.map((stop, idx) => (
                <div key={stop.id} style={{ display: 'flex', gap: '12px', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', marginBottom: '8px' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: stopStatusColors[stop.status] + '20', color: stopStatusColors[stop.status], display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px', flexShrink: 0 }}>
                    {stop.stop_sequence}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{stop.customer_name || `Customer #${stop.customer_id}`}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>{stop.delivery_address}, {stop.city} {stop.state} {stop.zip}</div>
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                      {stop.pieces_count} pcs | {stop.weight_lbs} lbs
                      {stop.special_instructions && <span style={{ color: '#f59e0b' }}> | {stop.special_instructions}</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: stopStatusColors[stop.status] + '20', color: stopStatusColors[stop.status], fontWeight: '600', height: 'fit-content' }}>
                    {stop.status}
                  </span>
                </div>
              ))}
              {(!selectedRoute.stops || selectedRoute.stops.length === 0) && (
                <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>No stops added yet</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Create Route Modal */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Create Delivery Route</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Route Name *</label><input value={newRoute.route_name} onChange={e => setNewRoute({...newRoute, route_name: e.target.value})} placeholder="e.g. Houston Metro - Monday" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Date *</label><input type="date" value={newRoute.route_date} onChange={e => setNewRoute({...newRoute, route_date: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Driver</label><select value={newRoute.driver_id} onChange={e => setNewRoute({...newRoute, driver_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="">Select Driver</option>{drivers.map(d => <option key={d.id} value={d.id}>{d.employee_name}</option>)}</select></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Vehicle</label><select value={newRoute.vehicle_id} onChange={e => setNewRoute({...newRoute, vehicle_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v.id} value={v.id}>{v.vehicle_number} - {v.make} {v.model}</option>)}</select></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Notes</label><textarea value={newRoute.notes} onChange={e => setNewRoute({...newRoute, notes: e.target.value})} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createRoute} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Create Route</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stop Modal */}
      {showAddStopModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add Delivery Stop</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Customer *</label><select value={newStop.customer_id} onChange={e => setNewStop({...newStop, customer_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="">Select Customer</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}</select></div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Delivery Address *</label><input value={newStop.delivery_address} onChange={e => setNewStop({...newStop, delivery_address: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>City</label><input value={newStop.city} onChange={e => setNewStop({...newStop, city: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>State</label><input value={newStop.state} onChange={e => setNewStop({...newStop, state: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Zip</label><input value={newStop.zip} onChange={e => setNewStop({...newStop, zip: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Pieces</label><input type="number" value={newStop.pieces_count} onChange={e => setNewStop({...newStop, pieces_count: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Weight (lbs)</label><input type="number" value={newStop.weight_lbs} onChange={e => setNewStop({...newStop, weight_lbs: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Special Instructions</label><textarea value={newStop.special_instructions} onChange={e => setNewStop({...newStop, special_instructions: e.target.value})} rows={2} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowAddStopModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addStop} style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Add Stop</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
