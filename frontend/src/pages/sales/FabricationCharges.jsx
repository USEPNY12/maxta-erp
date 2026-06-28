/**
 * Sales > Fabrication Charges
 * ===========================
 * Manages fabrication charge types and pricing used in quotes and sales orders.
 * Categories: Edgework, Holes, Notches, Cutouts, Tempering, Coating, Shape, Other
 *
 * This page is accessible from:
 * - Sales module tab bar: /sales/fabrication-charges
 * - System Setup: /setup?tab=fabrication-charges
 */
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

const CATEGORIES = ['Edgework', 'Holes', 'Notches', 'Cutouts', 'Tempering', 'Coating', 'Shape', 'Other'];
const PRICING_METHODS = [
  { value: 'per_hole', label: 'Per Hole' },
  { value: 'per_linear_foot', label: 'Per Linear Foot' },
  { value: 'per_piece', label: 'Per Piece' },
  { value: 'per_sq_ft', label: 'Per Sq Ft' },
  { value: 'per_notch', label: 'Per Notch' },
  { value: 'per_cutout', label: 'Per Cutout' },
  { value: 'per_corner', label: 'Per Corner' },
];

export default function SalesFabricationCharges() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [form, setForm] = useState({
    category: 'Edgework', name: '', description: '',
    pricing_method: 'per_hole', default_rate: '', sort_order: 0
  });

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
    setForm({
      category: item.category, name: item.name, description: item.description || '',
      pricing_method: item.pricing_method, default_rate: item.default_rate, sort_order: item.sort_order || 0
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    try {
      if (editItem) {
        await api.put(`/api/sales/fabrication-charges/${editItem.id}`, form);
        toast.success('Fabrication charge updated');
      } else {
        await api.post('/api/sales/fabrication-charges', form);
        toast.success('Fabrication charge created');
      }
      setShowModal(false);
      loadCharges();
    } catch (e) { toast.error(e.response?.data?.error || 'Save failed'); }
  };

  const toggleActive = async (item) => {
    try {
      await api.put(`/api/sales/fabrication-charges/${item.id}`, { ...item, is_active: item.is_active ? 0 : 1 });
      toast.success(item.is_active ? 'Charge deactivated' : 'Charge activated');
      loadCharges();
    } catch (e) { toast.error('Update failed'); }
  };

  const filtered = filterCategory === 'All' ? charges : charges?.filter(c => c.category === filterCategory);

  return (
    <ModulePage {...salesMenu}>
      <div style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>Fabrication Charges</h2>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="erp-form-select"
              style={{ fontSize: '0.85rem' }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={openAdd} className="erp-btn erp-btn-primary" style={{ fontSize: '0.85rem' }}>
              + Add Charge
            </button>
          </div>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="erp-table" style={{ width: '100%', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Name</th>
                  <th>Pricing Method</th>
                  <th>Default Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(filtered || [])?.map(item => (
                  <tr key={item.id} style={{ opacity: item.is_active ? 1 : 0.5 }}>
                    <td><span style={{ background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{item.category}</span></td>
                    <td style={{ fontWeight: 500 }}>{item.name}</td>
                    <td>{PRICING_METHODS?.find(p => p.value === item.pricing_method)?.label || item.pricing_method}</td>
                    <td>${Number(item.default_rate || 0).toFixed(2)}</td>
                    <td>
                      <span style={{ color: item.is_active ? '#059669' : '#dc2626', fontWeight: 500 }}>
                        {item.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td>
                      <button onClick={() => openEdit(item)} style={{ marginRight: '8px', cursor: 'pointer', background: 'none', border: 'none', color: '#2563eb' }}>Edit</button>
                      <button onClick={() => toggleActive(item)} style={{ cursor: 'pointer', background: 'none', border: 'none', color: item.is_active ? '#dc2626' : '#059669' }}>
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: '#6b7280' }}>No fabrication charges found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Add/Edit Modal */}
        {showModal && (
          <div className="erp-modal-overlay" onClick={() => setShowModal(false)}>
            <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
              <div className="erp-modal-header">
                <h3>{editItem ? 'Edit' : 'Add'} Fabrication Charge</h3>
                <button onClick={() => setShowModal(false)} className="erp-modal-close">&times;</button>
              </div>
              <div className="erp-modal-body" style={{ display: 'grid', gap: '12px' }}>
                <div>
                  <label className="erp-label">Category</label>
                  <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="erp-form-select" style={{ width: '100%' }}>
                    {CATEGORIES?.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="erp-label">Name *</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="erp-form-input" style={{ width: '100%' }} placeholder="e.g., Standard Polish" />
                </div>
                <div>
                  <label className="erp-label">Description</label>
                  <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="erp-form-input" style={{ width: '100%' }} placeholder="Optional description" />
                </div>
                <div>
                  <label className="erp-label">Pricing Method</label>
                  <select value={form.pricing_method} onChange={e => setForm({ ...form, pricing_method: e.target.value })} className="erp-form-select" style={{ width: '100%' }}>
                    {PRICING_METHODS?.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label className="erp-label">Default Rate ($)</label>
                    <input type="number" step="0.01" value={form.default_rate} onChange={e => setForm({ ...form, default_rate: e.target.value })} className="erp-form-input" style={{ width: '100%' }} />
                  </div>
                  <div>
                    <label className="erp-label">Sort Order</label>
                    <input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: e.target.value })} className="erp-form-input" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
              <div className="erp-modal-footer">
                <button onClick={() => setShowModal(false)} className="erp-btn">Cancel</button>
                <button onClick={handleSave} className="erp-btn erp-btn-primary">
                  {editItem ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
