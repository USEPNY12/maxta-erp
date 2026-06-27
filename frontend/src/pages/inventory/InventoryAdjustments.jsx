import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { inventoryMenu } from '../../config/moduleMenus';

export default function InventoryAdjustments() {
  const [adjustments, setAdjustments] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    item_id: '', location_id: '', adjustment_type: 'add', quantity: '', reason_code: 'cycle_count',
    lot_number: '', serial_number: '', cost: '', notes: ''
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [adjRes, itemRes, locRes] = await Promise.all([
        api.get('/api/inventory/adjustments'),
        api.get('/api/inventory/items'),
        api.get('/api/inventory/locations')
      ]);
      setAdjustments(adjRes.data);
      setItems(itemRes.data);
      setLocations(locRes.data);
    } catch (e) { toast.error('Failed to load adjustments'); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.item_id || !form.location_id || !form.quantity) {
      toast.error('Item, Location, and Quantity are required');
      return;
    }
    try {
      await api.post('/api/inventory/adjustments', form);
      toast.success('Adjustment posted successfully');
      setShowNew(false);
      setForm({ item_id: '', location_id: '', adjustment_type: 'add', quantity: '', reason_code: 'cycle_count', lot_number: '', serial_number: '', cost: '', notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to post adjustment'); }
  }

  return (
    <ModulePage {...inventoryMenu}>
      <div className="erp-page">
      <div className="erp-toolbar">
        <h2>Inventory Adjustments</h2>
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(!showNew)}>+ New Adjustment</button>
      </div>

      {showNew && (
        <div className="erp-panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>New Adjustment</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label className="erp-label">Item *</label>
              <select className="erp-input" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}>
                <option value="">Select Item...</option>
                {items.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-label">Location *</label>
              <select className="erp-input" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})}>
                <option value="">Select Location...</option>
                {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-label">Type</label>
              <select className="erp-input" value={form.adjustment_type} onChange={e => setForm({...form, adjustment_type: e.target.value})}>
                <option value="add">Add (Increase)</option>
                <option value="subtract">Subtract (Decrease)</option>
                <option value="set">Set (Override)</option>
              </select>
            </div>
            <div>
              <label className="erp-label">Quantity *</label>
              <input className="erp-input" type="number" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </div>
            <div>
              <label className="erp-label">Reason Code</label>
              <select className="erp-input" value={form.reason_code} onChange={e => setForm({...form, reason_code: e.target.value})}>
                <option value="cycle_count">Cycle Count</option>
                <option value="damage">Damage</option>
                <option value="scrap">Scrap</option>
                <option value="correction">Correction</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="erp-label">Cost</label>
              <input className="erp-input" type="number" step="0.01" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} placeholder="Optional" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="erp-label">Notes</label>
              <input className="erp-input" type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="erp-btn erp-btn-primary">Post Adjustment</button>
              <button type="button" className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="erp-panel">
        {loading ? <p style={{ padding: '1rem' }}>Loading...</p> : adjustments.length === 0 ? (
          <p style={{ padding: '1rem', color: '#666' }}>No adjustments recorded yet.</p>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Adj #</th>
                <th>Date</th>
                <th>Item</th>
                <th>Location</th>
                <th>Type</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>Notes</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map(a => (
                <tr key={a.id}>
                  <td>{a.adjustment_number}</td>
                  <td>{a.adjustment_date ? new Date(a.adjustment_date).toLocaleDateString() : '-'}</td>
                  <td>{a.item_number} - {a.item_description}</td>
                  <td>{a.location_name || '-'}</td>
                  <td><span className={`erp-badge ${a.adjustment_type === 'add' ? 'erp-badge-green' : a.adjustment_type === 'subtract' ? 'erp-badge-red' : 'erp-badge-blue'}`}>{a.adjustment_type}</span></td>
                  <td style={{ textAlign: 'right' }}>{parseFloat(a.quantity).toFixed(2)}</td>
                  <td>{a.reason_code}</td>
                  <td>{a.notes || '-'}</td>
                  <td>{a.adjusted_by_name || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </ModulePage>
  );
}
