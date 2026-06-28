import { useState, useEffect } from 'react';
import api from '../../services/api';
import { toast } from 'react-toastify';
import ModulePage from '../../components/ModulePage';
import { inventoryMenu } from '../../config/moduleMenus';

export default function InventoryTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({
    item_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reason: '', notes: ''
  });

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const [trRes, itemRes, locRes] = await Promise.all([
        api.get('/api/inventory/transfers'),
        api.get('/api/inventory/items'),
        api.get('/api/inventory/locations')
      ]);
      setTransfers(trRes.data);
      setItems(Array.isArray(itemRes.data) ? itemRes.data : []);
      setLocations(Array.isArray(locRes.data) ? locRes.data : []);
    } catch (e) { toast.error('Failed to load transfers'); }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.item_id || !form.from_location_id || !form.to_location_id || !form.quantity) {
      toast.error('Item, From Location, To Location, and Quantity are required');
      return;
    }
    if (form.from_location_id === form.to_location_id) {
      toast.error('From and To locations must be different');
      return;
    }
    try {
      await api.post('/api/inventory/transfers', form);
      toast.success('Transfer completed successfully');
      setShowNew(false);
      setForm({ item_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reason: '', notes: '' });
      load();
    } catch (e) { toast.error(e.response?.data?.error || 'Failed to process transfer'); }
  }

  return (
    <ModulePage {...inventoryMenu}>
      <div className="erp-page">
      <div className="erp-toolbar">
        <h2>Inventory Transfers</h2>
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(!showNew)}>+ New Transfer</button>
      </div>

      {showNew && (
        <div className="erp-panel" style={{ marginBottom: '1rem', padding: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>New Transfer</h3>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label className="erp-label">Item *</label>
              <select className="erp-input" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}>
                <option value="">Select Item...</option>
                {(items || []).map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-label">From Location *</label>
              <select className="erp-input" value={form.from_location_id} onChange={e => setForm({...form, from_location_id: e.target.value})}>
                <option value="">Select Location...</option>
                {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-label">To Location *</label>
              <select className="erp-input" value={form.to_location_id} onChange={e => setForm({...form, to_location_id: e.target.value})}>
                <option value="">Select Location...</option>
                {(locations || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
            </div>
            <div>
              <label className="erp-label">Quantity *</label>
              <input className="erp-input" type="number" step="0.01" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
            </div>
            <div>
              <label className="erp-label">Lot Number</label>
              <input className="erp-input" type="text" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} placeholder="Optional" />
            </div>
            <div>
              <label className="erp-label">Reason</label>
              <input className="erp-input" type="text" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} placeholder="Optional" />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="erp-label">Notes</label>
              <input className="erp-input" type="text" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Optional notes" />
            </div>
            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="erp-btn erp-btn-primary">Process Transfer</button>
              <button type="button" className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="erp-panel">
        {loading ? <p style={{ padding: '1rem' }}>Loading...</p> : transfers.length === 0 ? (
          <p style={{ padding: '1rem', color: '#666' }}>No transfers recorded yet.</p>
        ) : (
          <table className="erp-table">
            <thead>
              <tr>
                <th>Transfer #</th>
                <th>Date</th>
                <th>Item</th>
                <th>From</th>
                <th>To</th>
                <th>Quantity</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map(t => (
                <tr key={t.id}>
                  <td>{t.transfer_number}</td>
                  <td>{t.created_at ? new Date(t.created_at).toLocaleDateString() : '-'}</td>
                  <td>{t.item_number} - {t.item_description}</td>
                  <td>{t.from_location || '-'}</td>
                  <td>{t.to_location || '-'}</td>
                  <td style={{ textAlign: 'right' }}>{parseFloat(t.quantity).toFixed(2)}</td>
                  <td>{t.reason || '-'}</td>
                  <td>{t.transferred_by_name || '-'}</td>
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
