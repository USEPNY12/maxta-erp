import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function RackLoading() {
  const [racks, setRacks] = useState([]);
  const [selectedRack, setSelectedRack] = useState(null);
  const [rackLoad, setRackLoad] = useState(null);
  const [showCreateLoadModal, setShowCreateLoadModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [newItem, setNewItem] = useState({ slot_number: 1, item_description: '', width_inches: '', height_inches: '', thickness_mm: '', weight_lbs: '', glass_type: '' });

  useEffect(() => { loadRacks(); }, []);

  const loadRacks = async () => {
    try { const r = await api.get('/shipping/racks'); setRacks(r.data); } catch(e) { console.error(e); }
  };

  const createLoad = async () => {
    try {
      const res = await api.post('/shipping/racks/loads', { rack_id: selectedRack.id, load_date: new Date().toISOString().split('T')[0] });
      setShowCreateLoadModal(false);
      loadRackDetail(res.data.id);
    } catch(e) { alert('Error creating load'); }
  };

  const loadRackDetail = async (loadId) => {
    try { const r = await api.get(`/shipping/racks/loads/${loadId}`); setRackLoad(r.data); } catch(e) { console.error(e); }
  };

  const addItem = async () => {
    try {
      await api.post(`/shipping/racks/loads/${rackLoad.id}/items`, newItem);
      setShowAddItemModal(false);
      setNewItem({ slot_number: (rackLoad.items?.length || 0) + 1, item_description: '', width_inches: '', height_inches: '', thickness_mm: '', weight_lbs: '', glass_type: '' });
      loadRackDetail(rackLoad.id);
    } catch(e) { alert('Error adding item'); }
  };

  const optimizeLoad = async () => {
    try {
      await api.post(`/shipping/racks/loads/${rackLoad.id}/optimize`);
      loadRackDetail(rackLoad.id);
    } catch(e) { alert('Error optimizing'); }
  };

  const rackTypeIcons = { a_frame: '△', l_frame: '⌐', flat_bed: '▬', custom: '◇' };
  const statusColors = { planning: '#6b7280', loading: '#f59e0b', loaded: '#10b981', in_transit: '#3b82f6', unloading: '#8b5cf6', empty: '#d1d5db' };

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '24px' }}>Rack Loading Optimization</h1>

      {/* Rack Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {racks.map(rack => (
          <div key={rack.id} onClick={() => { setSelectedRack(rack); setShowCreateLoadModal(true); }}
            style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '16px', cursor: 'pointer', transition: 'box-shadow 0.2s' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '24px' }}>{rackTypeIcons[rack.rack_type]}</span>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '16px' }}>{rack.rack_code}</div>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'capitalize' }}>{rack.rack_type.replace('_', ' ')}</div>
                </div>
              </div>
              {rack.current_loads > 0 && <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '12px', background: '#fef3c7', color: '#d97706', fontWeight: '600' }}>In Use</span>}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: '#4b5563' }}>
              <div>Max Weight: <strong>{rack.max_weight_lbs} lbs</strong></div>
              <div>Max Pieces: <strong>{rack.max_pieces}</strong></div>
              <div>Slots: <strong>{rack.slot_count}</strong></div>
              <div>Size: <strong>{rack.width_inches}"×{rack.height_inches}"</strong></div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Rack Load Detail */}
      {rackLoad && (
        <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Rack {rackLoad.rack_code} - Load Plan</h2>
              <div style={{ fontSize: '13px', color: '#6b7280' }}>
                {rackLoad.rack_type.replace('_', ' ')} | {rackLoad.total_pieces}/{rackLoad.max_pieces} pieces | {rackLoad.total_weight_lbs}/{rackLoad.max_weight_lbs} lbs
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setShowAddItemModal(true)} style={{ padding: '6px 12px', background: '#10b981', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>+ Add Glass</button>
              <button onClick={optimizeLoad} style={{ padding: '6px 12px', background: '#8b5cf6', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontSize: '12px' }}>Optimize Order</button>
            </div>
          </div>

          {/* Visual Rack Representation */}
          <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>Rack Slots ({rackLoad.items?.length || 0}/{rackLoad.slot_count})</div>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {Array.from({ length: rackLoad.slot_count }, (_, i) => {
                const item = rackLoad.items?.find(it => it.slot_number === i + 1);
                return (
                  <div key={i} style={{ width: '60px', height: '80px', borderRadius: '4px', border: item ? '2px solid #3b82f6' : '2px dashed #d1d5db', background: item ? '#eff6ff' : 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: '10px', padding: '4px' }}>
                    <div style={{ fontWeight: '700' }}>#{i + 1}</div>
                    {item && (
                      <>
                        <div style={{ fontSize: '9px', color: '#3b82f6', textAlign: 'center' }}>{item.width_inches}"×{item.height_inches}"</div>
                        <div style={{ fontSize: '9px', color: '#6b7280' }}>{item.weight_lbs}lb</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Items Table */}
          <table style={{ width: '100%', fontSize: '13px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Slot</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Description</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Size</th>
                <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Glass Type</th>
                <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e5e7eb' }}>Weight</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Load #</th>
                <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e5e7eb' }}>Unload #</th>
              </tr>
            </thead>
            <tbody>
              {rackLoad.items?.map(item => (
                <tr key={item.id}>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{item.slot_number}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{item.item_description || item.wo_number || '-'}</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{item.width_inches}"×{item.height_inches}" ({item.thickness_mm}mm)</td>
                  <td style={{ padding: '8px', borderBottom: '1px solid #f3f4f6' }}>{item.glass_type || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #f3f4f6' }}>{item.weight_lbs} lbs</td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{item.load_sequence || '-'}</td>
                  <td style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #f3f4f6' }}>{item.unload_sequence || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!rackLoad.items || rackLoad.items.length === 0) && <div style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>No items loaded yet</div>}

          {/* Capacity Bar */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
              <span>Weight: {rackLoad.total_weight_lbs} / {rackLoad.max_weight_lbs} lbs</span>
              <span>{Math.round((rackLoad.total_weight_lbs / rackLoad.max_weight_lbs) * 100)}%</span>
            </div>
            <div style={{ height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min(100, (rackLoad.total_weight_lbs / rackLoad.max_weight_lbs) * 100)}%`, background: (rackLoad.total_weight_lbs / rackLoad.max_weight_lbs) > 0.9 ? '#ef4444' : '#10b981', borderRadius: '4px' }} />
            </div>
          </div>
        </div>
      )}

      {/* Create Load Modal */}
      {showCreateLoadModal && selectedRack && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '400px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '12px' }}>Create Load for {selectedRack.rack_code}</h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '16px' }}>
              {selectedRack.rack_type.replace('_', ' ')} | {selectedRack.max_pieces} pieces max | {selectedRack.max_weight_lbs} lbs max
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button onClick={() => setShowCreateLoadModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={createLoad} style={{ padding: '8px 16px', background: '#2563eb', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Start Loading</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '24px', width: '480px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px' }}>Add Glass to Rack</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Description</label><input value={newItem.item_description} onChange={e => setNewItem({...newItem, item_description: e.target.value})} placeholder="e.g. Tempered Clear 6mm" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Width (in)</label><input type="number" value={newItem.width_inches} onChange={e => setNewItem({...newItem, width_inches: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Height (in)</label><input type="number" value={newItem.height_inches} onChange={e => setNewItem({...newItem, height_inches: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Thickness (mm)</label><input type="number" value={newItem.thickness_mm} onChange={e => setNewItem({...newItem, thickness_mm: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Weight (lbs)</label><input type="number" value={newItem.weight_lbs} onChange={e => setNewItem({...newItem, weight_lbs: e.target.value})} style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
                <div><label style={{ fontSize: '13px', fontWeight: '500' }}>Glass Type</label><input value={newItem.glass_type} onChange={e => setNewItem({...newItem, glass_type: e.target.value})} placeholder="e.g. Tempered Clear" style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db', marginTop: '4px' }} /></div>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowAddItemModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer' }}>Cancel</button>
              <button onClick={addItem} style={{ padding: '8px 16px', background: '#10b981', color: 'white', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Add to Rack</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
