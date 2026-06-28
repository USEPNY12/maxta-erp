import { useState, useEffect } from 'react';
import api from '../services/api';
import ModulePage from '../components/ModulePage';
import { salesMenu } from '../config/moduleMenus';

/**
 * Pricing Matrix Management - Configure glass type pricing
 * Admin page for managing the CPQ pricing engine data
 */
export default function PricingMatrix() {
  const [matrix, setMatrix] = useState([]);
  const [quantityBreaks, setQuantityBreaks] = useState([]);
  const [activeTab, setActiveTab] = useState('matrix');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntry, setNewEntry] = useState({ glass_type: '', thickness: '', price_per_sqft: '', min_sqft: 3, min_charge: 0, markup_percent: 0 });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [matrixRes, qbRes] = await Promise.all([
        api.get('/api/cpq/pricing-matrix'),
        api.get('/api/cpq/quantity-breaks')
      ]);
      setMatrix(Array.isArray(matrixRes.data) ? matrixRes.data : []);
      setQuantityBreaks(Array.isArray(qbRes.data) ? qbRes.data : []);
    } catch (err) {
      console.error('Failed to load pricing data:', err);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditData({ ...item });
  };

  const saveEdit = async () => {
    try {
      await api.put(`/api/cpq/pricing-matrix/${editingId}`, editData);
      setEditingId(null);
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleAdd = async () => {
    try {
      await api.post('/api/cpq/pricing-matrix', newEntry);
      setShowAddForm(false);
      setNewEntry({ glass_type: '', thickness: '', price_per_sqft: '', min_sqft: 3, min_charge: 0, markup_percent: 0 });
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this pricing entry?')) return;
    try {
      await api.delete(`/api/cpq/pricing-matrix/${id}`);
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  // Group matrix by glass type
  const grouped = matrix.reduce((acc, item) => {
    if (!acc[item.glass_type]) acc[item.glass_type] = [];
    acc[item.glass_type].push(item);
    return acc;
  }, {});

  return (
    <ModulePage title="Pricing Matrix" menuItems={salesMenu}>
      <div className="pricing-matrix-page">
        <div className="pm-header">
          <h2>Glass Pricing Matrix</h2>
          <button className="pm-add-btn" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? 'Cancel' : '+ Add Entry'}
          </button>
        </div>

        {/* Add Form */}
        {showAddForm && (
          <div className="pm-add-form">
            <input placeholder="Glass Type (e.g., Clear Annealed)" value={newEntry.glass_type}
              onChange={e => setNewEntry(p => ({ ...p, glass_type: e.target.value }))} />
            <input placeholder='Thickness (e.g., 1/4")' value={newEntry.thickness}
              onChange={e => setNewEntry(p => ({ ...p, thickness: e.target.value }))} />
            <input type="number" step="0.01" placeholder="$/sqft" value={newEntry.price_per_sqft}
              onChange={e => setNewEntry(p => ({ ...p, price_per_sqft: e.target.value }))} />
            <input type="number" step="0.01" placeholder="Min sqft" value={newEntry.min_sqft}
              onChange={e => setNewEntry(p => ({ ...p, min_sqft: e.target.value }))} />
            <input type="number" step="0.01" placeholder="Min charge $" value={newEntry.min_charge}
              onChange={e => setNewEntry(p => ({ ...p, min_charge: e.target.value }))} />
            <button className="pm-save-btn" onClick={handleAdd}>Add</button>
          </div>
        )}

        {/* Tabs */}
        <div className="pm-tabs">
          <button className={activeTab === 'matrix' ? 'active' : ''} onClick={() => setActiveTab('matrix')}>
            Price per Sq Ft ({matrix.length} entries)
          </button>
          <button className={activeTab === 'breaks' ? 'active' : ''} onClick={() => setActiveTab('breaks')}>
            Quantity Breaks
          </button>
        </div>

        {loading ? <div className="pm-loading">Loading...</div> : (
          <>
            {activeTab === 'matrix' && (
              <div className="pm-groups">
                {Object.entries(grouped).map(([glassType, items]) => (
                  <div key={glassType} className="pm-group">
                    <h3 className="pm-group-title">{glassType}</h3>
                    <table className="pm-table">
                      <thead>
                        <tr>
                          <th>Thickness</th>
                          <th>$/Sq Ft</th>
                          <th>Min Sq Ft</th>
                          <th>Min Charge</th>
                          <th>Markup %</th>
                          <th>Active</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(items || []).map(item => (
                          <tr key={item.id}>
                            {editingId === item.id ? (
                              <>
                                <td>{item.thickness}</td>
                                <td><input type="number" step="0.01" value={editData.price_per_sqft}
                                  onChange={e => setEditData(p => ({ ...p, price_per_sqft: e.target.value }))} /></td>
                                <td><input type="number" step="0.01" value={editData.min_sqft}
                                  onChange={e => setEditData(p => ({ ...p, min_sqft: e.target.value }))} /></td>
                                <td><input type="number" step="0.01" value={editData.min_charge}
                                  onChange={e => setEditData(p => ({ ...p, min_charge: e.target.value }))} /></td>
                                <td><input type="number" step="0.01" value={editData.markup_percent}
                                  onChange={e => setEditData(p => ({ ...p, markup_percent: e.target.value }))} /></td>
                                <td><input type="checkbox" checked={editData.is_active}
                                  onChange={e => setEditData(p => ({ ...p, is_active: e.target.checked ? 1 : 0 }))} /></td>
                                <td>
                                  <button className="pm-btn pm-btn-save" onClick={saveEdit}>Save</button>
                                  <button className="pm-btn pm-btn-cancel" onClick={() => setEditingId(null)}>Cancel</button>
                                </td>
                              </>
                            ) : (
                              <>
                                <td>{item.thickness}</td>
                                <td><strong>${parseFloat(item.price_per_sqft).toFixed(2)}</strong></td>
                                <td>{parseFloat(item.min_sqft).toFixed(1)}</td>
                                <td>${parseFloat(item.min_charge).toFixed(2)}</td>
                                <td>{parseFloat(item.markup_percent).toFixed(1)}%</td>
                                <td>{item.is_active ? '✅' : '❌'}</td>
                                <td>
                                  <button className="pm-btn pm-btn-edit" onClick={() => startEdit(item)}>Edit</button>
                                  <button className="pm-btn pm-btn-delete" onClick={() => handleDelete(item.id)}>Del</button>
                                </td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'breaks' && (
              <div className="pm-table-wrap">
                <table className="pm-table">
                  <thead>
                    <tr>
                      <th>Tier Name</th>
                      <th>Min Qty</th>
                      <th>Max Qty</th>
                      <th>Discount %</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quantityBreaks || []).map(qb => (
                      <tr key={qb.id}>
                        <td><strong>{qb.name}</strong></td>
                        <td>{qb.min_qty}</td>
                        <td>{qb.max_qty >= 999999 ? '∞' : qb.max_qty}</td>
                        <td>{parseFloat(qb.discount_percent).toFixed(1)}%</td>
                        <td>{qb.is_active ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ModulePage>
  );
}
