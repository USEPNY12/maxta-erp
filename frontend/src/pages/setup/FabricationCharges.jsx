import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const CATEGORIES = ['Edgework', 'Holes', 'Notches', 'Cutouts', 'Tempering', 'Coating', 'Shape', 'Other'];
const PRICING_METHODS = [
  { value: 'per_hole', label: 'Per Hole' },
  { value: 'per_linear_foot', label: 'Per Linear Foot' },
  { value: 'per_piece', label: 'Per Piece' },
  { value: 'per_sq_ft', label: 'Per Sq Ft' },
  { value: 'per_notch', label: 'Per Notch' },
  { value: 'per_cutout', label: 'Per Cutout' },
  { value: 'per_corner', label: 'Per Corner' }
];

export default function FabricationCharges() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [form, setForm] = useState({ category: 'Edgework', name: '', description: '', pricing_method: 'per_hole', default_rate: '', sort_order: 0 });

  useEffect(() => { loadCharges(); }, []);

  const loadCharges = async () => {
    try {
      const res = await api.get('/api/sales/fabrication-charges/all');
      setCharges(res.data);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const openAdd = () => {
    setEditItem(null);
    setForm({ category: 'Edgework', name: '', description: '', pricing_method: 'per_hole', default_rate: '', sort_order: 0 });
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditItem(item);
    setForm({ category: item.category, name: item.name, description: item.description || '', pricing_method: item.pricing_method, default_rate: item.default_rate, sort_order: item.sort_order || 0 });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      if (editItem) {
        await api.put(`/api/sales/fabrication-charges/${editItem.id}`, { ...form, is_active: editItem.is_active });
      } else {
        await api.post('/api/sales/fabrication-charges', form);
      }
      setShowModal(false);
      loadCharges();
    } catch (e) { alert('Error saving: ' + e.message); }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/api/sales/fabrication-charges/${item.id}`, { ...item, is_active: item.is_active ? 0 : 1 });
      loadCharges();
    } catch (e) { alert('Error: ' + e.message); }
  };

  const filtered = filterCategory === 'All' ? charges : charges.filter(c => c.category === filterCategory);

  const getPricingLabel = (method) => {
    const m = PRICING_METHODS.find(p => p.value === method);
    return m ? m.label : method;
  };

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>Fabrication Charges</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Configure charges for glass processing (holes, edgework, notches, etc.)</p>
        </div>
        <button onClick={openAdd} className="erp-btn erp-btn-primary">+ Add Charge</button>
      </div>

      {/* Category Filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setFilterCategory('All')} className={`erp-btn ${filterCategory === 'All' ? 'erp-btn-primary' : ''}`} style={{ fontSize: 12, padding: '4px 10px' }}>All</button>
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => setFilterCategory(cat)} className={`erp-btn ${filterCategory === cat ? 'erp-btn-primary' : ''}`} style={{ fontSize: 12, padding: '4px 10px' }}>{cat}</button>
        ))}
      </div>

      {/* Charges Table */}
      <div style={{ overflowX: 'auto' }}>
        <table className="erp-table" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Category</th>
              <th>Name</th>
              <th>Description</th>
              <th>Pricing Method</th>
              <th style={{ textAlign: 'right' }}>Default Rate</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                <td><span style={{ background: getCategoryColor(item.category), color: '#fff', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{item.category}</span></td>
                <td style={{ fontWeight: 500 }}>{item.name}</td>
                <td style={{ fontSize: 12, color: '#64748b' }}>{item.description}</td>
                <td><span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 11 }}>{getPricingLabel(item.pricing_method)}</span></td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>${Number(item.default_rate).toFixed(2)}</td>
                <td>
                  <span style={{ color: item.is_active ? '#16a34a' : '#dc2626', fontSize: 12 }}>
                    {item.is_active ? '● Active' : '● Inactive'}
                  </span>
                </td>
                <td>
                  <button onClick={() => openEdit(item)} className="erp-btn" style={{ fontSize: 11, padding: '2px 8px', marginRight: 4 }}>Edit</button>
                  <button onClick={() => toggleActive(item)} className="erp-btn" style={{ fontSize: 11, padding: '2px 8px', color: item.is_active ? '#dc2626' : '#16a34a' }}>
                    {item.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p style={{ textAlign: 'center', color: '#64748b', padding: 20 }}>No charges found in this category.</p>}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="erp-modal-overlay" onClick={() => setShowModal(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
            <h3 style={{ marginTop: 0 }}>{editItem ? 'Edit' : 'Add'} Fabrication Charge</h3>
            <div style={{ display: 'grid', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="erp-input" style={{ width: '100%' }}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Name</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="erp-input" style={{ width: '100%' }} placeholder="e.g., Flat Polish, Standard Hole" />
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Description</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="erp-input" style={{ width: '100%' }} placeholder="Brief description of the charge" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Pricing Method</label>
                  <select value={form.pricing_method} onChange={e => setForm({ ...form, pricing_method: e.target.value })} className="erp-input" style={{ width: '100%' }}>
                    {PRICING_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Default Rate ($)</label>
                  <input type="number" step="0.01" value={form.default_rate} onChange={e => setForm({ ...form, default_rate: e.target.value })} className="erp-input" style={{ width: '100%' }} placeholder="0.00" />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>Sort Order</label>
                <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="erp-input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button onClick={() => setShowModal(false)} className="erp-btn">Cancel</button>
              <button onClick={handleSave} className="erp-btn erp-btn-primary" disabled={!form.name}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getCategoryColor(cat) {
  const colors = {
    'Edgework': '#2563eb',
    'Holes': '#7c3aed',
    'Notches': '#dc2626',
    'Cutouts': '#ea580c',
    'Tempering': '#ca8a04',
    'Coating': '#0891b2',
    'Shape': '#16a34a',
    'Other': '#64748b'
  };
  return colors[cat] || '#64748b';
}
