import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function FreightCosts() {
  const [costs, setCosts] = useState([]);
  const [summary, setSummary] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filter, setFilter] = useState({ date_from: '', date_to: '', cost_type: '' });
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [newCost, setNewCost] = useState({ cost_type: 'fuel', amount: '', description: '', cost_date: new Date().toISOString().split('T')[0], vehicle_id: '', driver_id: '', miles_driven: '', fuel_gallons: '', fuel_price_per_gallon: '', is_billable: true });

  useEffect(() => { loadCosts(); loadDrivers(); loadVehicles(); }, []);

  const loadCosts = async () => {
    try {
      const params = new URLSearchParams();
      if (filter.date_from) params.append('date_from', filter.date_from);
      if (filter.date_to) params.append('date_to', filter.date_to);
      if (filter.cost_type) params.append('cost_type', filter.cost_type);
      const r = await api.get(`/shipping/freight?${params}`);
      setCosts(r.data.costs || []);
      setSummary(r.data.summary || []);
    } catch(e) { console.error(e); }
  };
  const loadDrivers = async () => { try { const r = await api.get('/shipping/drivers'); setDrivers(r.data); } catch(e){} };
  const loadVehicles = async () => { try { const r = await api.get('/shipping/vehicles'); setVehicles(r.data); } catch(e){} };

  const addCost = async () => {
    try {
      await api.post('/shipping/freight', newCost);
      setShowAddModal(false);
      setNewCost({ cost_type: 'fuel', amount: '', description: '', cost_date: new Date().toISOString().split('T')[0], vehicle_id: '', driver_id: '', miles_driven: '', fuel_gallons: '', fuel_price_per_gallon: '', is_billable: true });
      loadCosts();
    } catch(e) { alert('Error adding cost'); }
  };

  const totalCost = costs?.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
  const costTypeColors = { fuel: '#f59e0b', labor: '#3b82f6', tolls: '#6b7280', maintenance: '#ef4444', insurance: '#8b5cf6', other: '#6b7280' };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold' }}>Freight Cost Tracking</h1>
        <button onClick={() => setShowAddModal(true)} style={{ padding: '10px 20px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600' }}>
          + Record Cost
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>Total (filtered)</div>
          <div style={{ fontSize: '22px', fontWeight: '700' }}>${totalCost.toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
          <div style={{ fontSize: '11px', color: '#9ca3af' }}>{costs.length} entries</div>
        </div>
        {summary?.map((s, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px', borderLeft: `4px solid ${costTypeColors[s.cost_type] || '#6b7280'}` }}>
            <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{s.cost_type}</div>
            <div style={{ fontSize: '18px', fontWeight: '700' }}>${parseFloat(s.total).toLocaleString(undefined, {minimumFractionDigits: 2})}</div>
            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.count} entries (30d)</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select value={filter.cost_type} onChange={e => setFilter({...filter, cost_type: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}>
          <option value="">All Types</option>
          <option value="fuel">Fuel</option>
          <option value="labor">Labor</option>
          <option value="tolls">Tolls</option>
          <option value="maintenance">Maintenance</option>
          <option value="insurance">Insurance</option>
          <option value="other">Other</option>
        </select>
        <input type="date" value={filter.date_from} onChange={e => setFilter({...filter, date_from: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        <input type="date" value={filter.date_to} onChange={e => setFilter({...filter, date_to: e.target.value})} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }} />
        <button onClick={loadCosts} style={{ padding: '8px 16px', background: '#f3f4f6', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Apply</button>
      </div>

      {/* Costs Table */}
      <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Date</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Type</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Description</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Route</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Vehicle</th>
              <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Driver</th>
              <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Miles</th>
              <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {costs?.map(cost => (
              <tr key={cost.id}>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{new Date(cost.cost_date).toLocaleDateString()}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: (costTypeColors[cost.cost_type] || '#6b7280') + '20', color: costTypeColors[cost.cost_type] || '#6b7280', fontWeight: '600', textTransform: 'capitalize' }}>
                    {cost.cost_type}
                  </span>
                </td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{cost.description || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{cost.route_number || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{cost.vehicle_number || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6' }}>{cost.driver_name || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' }}>{cost.miles_driven || '-'}</td>
                <td style={{ padding: '10px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', fontWeight: '600' }}>${parseFloat(cost.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {costs.length === 0 && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af' }}>No freight costs recorded</div>}
      </div>

      {/* Add Cost Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '520px', maxHeight: '90vh', overflow: 'auto' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Record Freight Cost</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Cost Type *</label><select value={newCost.cost_type} onChange={e => setNewCost({...newCost, cost_type: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="fuel">Fuel</option><option value="labor">Labor</option><option value="tolls">Tolls</option><option value="maintenance">Maintenance</option><option value="insurance">Insurance</option><option value="other">Other</option></select></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Amount *</label><input type="number" step="0.01" value={newCost.amount} onChange={e => setNewCost({...newCost, amount: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Description</label><input value={newCost.description} onChange={e => setNewCost({...newCost, description: e.target.value})} placeholder="e.g. Diesel fill-up at Shell" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Date *</label><input type="date" value={newCost.cost_date} onChange={e => setNewCost({...newCost, cost_date: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Vehicle</label><select value={newCost.vehicle_id} onChange={e => setNewCost({...newCost, vehicle_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="">-</option>{vehicles?.map(v => <option key={v.id} value={v.id}>{v.vehicle_number}</option>)}</select></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Driver</label><select value={newCost.driver_id} onChange={e => setNewCost({...newCost, driver_id: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }}><option value="">-</option>{drivers?.map(d => <option key={d.id} value={d.id}>{d.employee_name}</option>)}</select></div>
              </div>
              {newCost.cost_type === 'fuel' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Miles Driven</label><input type="number" value={newCost.miles_driven} onChange={e => setNewCost({...newCost, miles_driven: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                  <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Gallons</label><input type="number" step="0.01" value={newCost.fuel_gallons} onChange={e => setNewCost({...newCost, fuel_gallons: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                  <div><label style={{ fontSize: '13px', fontWeight: '500' }}>$/Gallon</label><input type="number" step="0.001" value={newCost.fuel_price_per_gallon} onChange={e => setNewCost({...newCost, fuel_price_per_gallon: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={newCost.is_billable} onChange={e => setNewCost({...newCost, is_billable: e.target.checked})} />
                <label style={{ fontSize: '13px' }}>Billable to customer</label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowAddModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addCost} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Save Cost</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
