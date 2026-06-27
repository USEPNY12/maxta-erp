import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function DriverView() {
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [zones, setZones] = useState([]);
  const [activeTab, setActiveTab] = useState('drivers');
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [newDriver, setNewDriver] = useState({ employee_name: '', phone: '', email: '', license_number: '', license_expiry: '', license_class: 'Class B', home_zip: '' });
  const [newVehicle, setNewVehicle] = useState({ vehicle_number: '', vehicle_type: 'flatbed', make: '', model: '', year: '', license_plate: '', max_weight_lbs: '', max_rack_count: 2, fuel_type: 'diesel', mpg_estimate: '' });

  useEffect(() => { loadDrivers(); loadVehicles(); loadZones(); }, []);

  const loadDrivers = async () => { try { const r = await api.get('/shipping/drivers'); setDrivers(r.data); } catch(e){} };
  const loadVehicles = async () => { try { const r = await api.get('/shipping/vehicles'); setVehicles(r.data); } catch(e){} };
  const loadZones = async () => { try { const r = await api.get('/shipping/zones'); setZones(r.data); } catch(e){} };

  const createDriver = async () => {
    try { await api.post('/shipping/drivers', newDriver); setShowAddDriverModal(false); loadDrivers(); } catch(e) { alert('Error'); }
  };
  const createVehicle = async () => {
    try { await api.post('/shipping/vehicles', newVehicle); setShowAddVehicleModal(false); loadVehicles(); } catch(e) { alert('Error'); }
  };

  const tabs = [
    { id: 'drivers', label: 'Drivers', count: drivers.length },
    { id: 'vehicles', label: 'Vehicles', count: vehicles.length },
    { id: 'zones', label: 'Delivery Zones', count: zones.length },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Fleet & Drivers</h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            style={{ padding: '10px 20px', border: 'none', background: activeTab === tab.id ? 'white' : 'transparent', borderBottom: activeTab === tab.id ? '2px solid #2563eb' : '2px solid transparent', marginBottom: '-2px', cursor: 'pointer', fontWeight: activeTab === tab.id ? '600' : '400', color: activeTab === tab.id ? '#2563eb' : '#6b7280' }}>
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Drivers Tab */}
      {activeTab === 'drivers' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowAddDriverModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>+ Add Driver</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
            {drivers.map(driver => (
              <div key={driver.id} style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', color: '#2563eb' }}>
                      {driver.employee_name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600' }}>{driver.employee_name}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>{driver.employee_id}</div>
                    </div>
                  </div>
                  {driver.active_routes > 0 && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', fontWeight: '600' }}>On Route</span>}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '12px', color: '#4b5563' }}>
                  <div>Phone: {driver.phone || '-'}</div>
                  <div>License: {driver.license_class}</div>
                  <div>Email: {driver.email || '-'}</div>
                  <div>Expires: {driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : '-'}</div>
                </div>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#6b7280' }}>
                  Today: {driver.today_routes} route(s) | Active: {driver.active_routes}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vehicles Tab */}
      {activeTab === 'vehicles' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button onClick={() => setShowAddVehicleModal(true)} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>+ Add Vehicle</button>
          </div>
          <table style={{ width: '100%', background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Vehicle #</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Make/Model</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Plate</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Max Weight</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Racks</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>MPG</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map(v => (
                <tr key={v.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', fontWeight: '600' }}>{v.vehicle_number}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textTransform: 'capitalize' }}>{v.vehicle_type.replace('_', ' ')}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{v.year} {v.make} {v.model}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{v.license_plate}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{parseFloat(v.max_weight_lbs || 0).toLocaleString()} lbs</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>{v.max_rack_count}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{v.mpg_estimate || '-'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>
                    <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: v.in_use ? '#fef3c7' : '#d1fae5', color: v.in_use ? '#d97706' : '#059669', fontWeight: '600' }}>
                      {v.in_use ? 'In Use' : 'Available'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Zones Tab */}
      {activeTab === 'zones' && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Zone</th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Code</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Base Fee</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Per Mile</th>
                <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Free Delivery Min</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Transit Days</th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Max Pieces</th>
              </tr>
            </thead>
            <tbody>
              {zones.map(zone => (
                <tr key={zone.id}>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', fontWeight: '600' }}>{zone.zone_name}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{zone.zone_code}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>${parseFloat(zone.base_delivery_fee).toFixed(2)}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>${parseFloat(zone.per_mile_rate).toFixed(2)}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{zone.min_order_free_delivery ? `$${parseFloat(zone.min_order_free_delivery).toLocaleString()}` : '-'}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>{zone.estimated_transit_days}</td>
                  <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'center' }}>{zone.max_pieces_per_trip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Driver Modal */}
      {showAddDriverModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add Driver</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Name *</label><input value={newDriver.employee_name} onChange={e => setNewDriver({...newDriver, employee_name: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Phone</label><input value={newDriver.phone} onChange={e => setNewDriver({...newDriver, phone: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Email</label><input value={newDriver.email} onChange={e => setNewDriver({...newDriver, email: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>License #</label><input value={newDriver.license_number} onChange={e => setNewDriver({...newDriver, license_number: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Expiry</label><input type="date" value={newDriver.license_expiry} onChange={e => setNewDriver({...newDriver, license_expiry: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Class</label><input value={newDriver.license_class} onChange={e => setNewDriver({...newDriver, license_class: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowAddDriverModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createDriver} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Add Driver</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add Vehicle</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Vehicle # *</label><input value={newVehicle.vehicle_number} onChange={e => setNewVehicle({...newVehicle, vehicle_number: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Type</label><select value={newVehicle.vehicle_type} onChange={e => setNewVehicle({...newVehicle, vehicle_type: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="flatbed">Flatbed</option><option value="box_truck">Box Truck</option><option value="van">Van</option><option value="trailer">Trailer</option><option value="pickup">Pickup</option></select></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Make</label><input value={newVehicle.make} onChange={e => setNewVehicle({...newVehicle, make: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Model</label><input value={newVehicle.model} onChange={e => setNewVehicle({...newVehicle, model: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Year</label><input type="number" value={newVehicle.year} onChange={e => setNewVehicle({...newVehicle, year: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Max Weight</label><input type="number" value={newVehicle.max_weight_lbs} onChange={e => setNewVehicle({...newVehicle, max_weight_lbs: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Max Racks</label><input type="number" value={newVehicle.max_rack_count} onChange={e => setNewVehicle({...newVehicle, max_rack_count: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>MPG</label><input type="number" value={newVehicle.mpg_estimate} onChange={e => setNewVehicle({...newVehicle, mpg_estimate: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowAddVehicleModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createVehicle} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Add Vehicle</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
