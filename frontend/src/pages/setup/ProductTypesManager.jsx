import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function ProductTypesManager() {
  const [itemTypes, setItemTypes] = useState([]);
  const [routingTemplates, setRoutingTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', product_type: '', routing_template_id: '', is_inventory: true, costing_method: 'standard' });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [typesRes, templatesRes] = await Promise.all([
        api.get('/api/manufacturing/item-types'),
        api.get('/api/manufacturing/routing-templates')
      ]);
      setItemTypes(Array.isArray(typesRes.data) ? typesRes.data : []);
      setRoutingTemplates(Array.isArray(templatesRes.data) ? templatesRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditRow(null);
    setForm({ name: '', description: '', product_type: '', routing_template_id: '', is_inventory: true, costing_method: 'standard' });
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    setForm({
      name: row.name || '',
      description: row.description || '',
      product_type: row.product_type || '',
      routing_template_id: row.routing_template_id || '',
      is_inventory: row.is_inventory === 1 || row.is_inventory === true,
      costing_method: row.costing_method || 'standard',
      is_active: row.is_active === 1 || row.is_active === true
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        routing_template_id: form.routing_template_id ? parseInt(form.routing_template_id) : null,
        is_inventory: form.is_inventory ? 1 : 0,
        is_active: form.is_active !== false ? 1 : 0
      };
      if (editRow) {
        await api.put(`/api/manufacturing/item-types/${editRow.id}`, payload);
      } else {
        await api.post('/api/manufacturing/item-types', payload);
      }
      setShowModal(false);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error saving'); }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Deactivate item type "${row.name}"?`)) return;
    try {
      await api.delete(`/api/manufacturing/item-types/${row.id}`);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Item Types...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>Item Types & Product Routing</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Manage item types and assign routing templates. When you create/edit an item, its type automatically determines the manufacturing routing.</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add Item Type</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>ID</th>
              <th style={thStyle}>Name</th>
              <th style={thStyle}>Product Type</th>
              <th style={thStyle}>Routing Template</th>
              <th style={thStyle}>Inventory</th>
              <th style={thStyle}>Costing</th>
              <th style={thStyle}>Active</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {itemTypes.map(row => (
              <tr key={row.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: row.is_active ? 1 : 0.5 }}>
                <td style={tdStyle}>{row.id}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{row.name}</td>
                <td style={tdStyle}>
                  {row.product_type ? (
                    <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>{row.product_type}</span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>None (no routing)</span>
                  )}
                </td>
                <td style={tdStyle}>
                  {row.routing_template_name ? (
                    <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontSize: 12, fontWeight: 500 }}>
                      {row.routing_template_code} - {row.routing_template_name}
                    </span>
                  ) : (
                    <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>
                  )}
                </td>
                <td style={tdStyle}>{row.is_inventory ? <span style={{ color: '#16a34a' }}>Yes</span> : <span style={{ color: '#dc2626' }}>No</span>}</td>
                <td style={tdStyle}><span style={{ fontSize: 12, textTransform: 'capitalize' }}>{row.costing_method}</span></td>
                <td style={tdStyle}>{row.is_active ? <span style={{ color: '#16a34a' }}>Active</span> : <span style={{ color: '#dc2626' }}>Inactive</span>}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={() => openEdit(row)} style={btnSmStyle('#2563eb')}>Edit</button>
                    <button onClick={() => handleDelete(row)} style={btnSmStyle('#dc2626')}>Deactivate</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 520, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>{editRow ? 'Edit Item Type' : 'Add New Item Type'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} placeholder="e.g. Tempered Glass" />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={inputStyle} placeholder="Brief description" />
              </div>
              <div>
                <label style={labelStyle}>Product Type Code</label>
                <input value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value})} style={inputStyle} placeholder="e.g. tempered_panel" />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Used internally for routing. Use snake_case. Leave blank for non-manufactured items.</p>
              </div>
              <div>
                <label style={labelStyle}>Routing Template</label>
                <select value={form.routing_template_id} onChange={e => setForm({...form, routing_template_id: e.target.value})} style={inputStyle}>
                  <option value="">None (no manufacturing routing)</option>
                  {routingTemplates.map(t => (
                    <option key={t.id} value={t.id}>{t.code} - {t.name}</option>
                  ))}
                </select>
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Determines which work center steps are created on Work Orders.</p>
              </div>
              <div>
                <label style={labelStyle}>Costing Method</label>
                <select value={form.costing_method} onChange={e => setForm({...form, costing_method: e.target.value})} style={inputStyle}>
                  <option value="standard">Standard</option>
                  <option value="average">Average</option>
                  <option value="fifo">FIFO</option>
                  <option value="lifo">LIFO</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Track Inventory</label>
                <select value={form.is_inventory ? '1' : '0'} onChange={e => setForm({...form, is_inventory: e.target.value === '1'})} style={inputStyle}>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              {editRow && (
                <div>
                  <label style={labelStyle}>Status</label>
                  <select value={form.is_active !== false ? '1' : '0'} onChange={e => setForm({...form, is_active: e.target.value === '1'})} style={inputStyle}>
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
              <button onClick={handleSave} style={{ ...btnSmStyle('#2563eb'), padding: '8px 20px' }}>Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#334155' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
function btnSmStyle(color) { return { padding: '5px 12px', background: color, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }; }
