import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

export default function RoutingTemplatesManager() {
  const [templates, setTemplates] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({ code: '', name: '', product_type: '', description: '' });
  const [operations, setOperations] = useState([]);
  const [viewDetail, setViewDetail] = useState(null);
  const [detailOps, setDetailOps] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [tRes, wcRes] = await Promise.all([
        api.get('/api/manufacturing/routing-templates'),
        api.get('/api/manufacturing/work-centers')
      ]);
      setTemplates(Array.isArray(tRes.data) ? tRes.data : []);
      setWorkCenters(Array.isArray(wcRes.data) ? wcRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditRow(null);
    setForm({ code: '', name: '', product_type: '', description: '' });
    setOperations([]);
    setShowModal(true);
  };

  const openEdit = async (row) => {
    setEditRow(row);
    setForm({
      code: row.code || '',
      name: row.name || '',
      product_type: row.product_type || '',
      description: row.description || '',
      is_active: row.is_active === 1 || row.is_active === true
    });
    // Load operations for this template
    try {
      const res = await api.get(`/api/manufacturing/routing-templates/${row.id}`);
      setOperations(res.data.operations || []);
    } catch { setOperations([]); }
    setShowModal(true);
  };

  const viewTemplate = async (row) => {
    try {
      const res = await api.get(`/api/manufacturing/routing-templates/${row.id}`);
      setViewDetail(row);
      setDetailOps(res.data.operations || []);
    } catch { setDetailOps([]); }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...form,
        is_active: form.is_active !== false ? 1 : 0,
        operations: operations.map((op, i) => ({
          sequence: op.sequence || (i + 1) * 10,
          work_center_id: parseInt(op.work_center_id),
          operation_description: op.operation_description || '',
          setup_time_hours: parseFloat(op.setup_time_hours) || 0,
          run_time_per_unit: parseFloat(op.run_time_per_unit) || 0,
          qc_required: op.qc_required ? 1 : 0,
          notes: op.notes || ''
        }))
      };
      if (editRow) {
        await api.put(`/api/manufacturing/routing-templates/${editRow.id}`, payload);
      } else {
        await api.post('/api/manufacturing/routing-templates', payload);
      }
      setShowModal(false);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error saving'); }
  };

  const handleDelete = async (row) => {
    if (!confirm(`Deactivate routing template "${row.name}"?`)) return;
    try {
      await api.delete(`/api/manufacturing/routing-templates/${row.id}`);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  // Operations management
  const addOperation = () => {
    const nextSeq = operations.length > 0 ? Math.max(...operations.map(o => o.sequence || 0)) + 10 : 10;
    setOperations([...operations, { sequence: nextSeq, work_center_id: workCenters[0]?.id || '', operation_description: '', setup_time_hours: 0, run_time_per_unit: 0, qc_required: false, notes: '' }]);
  };

  const updateOperation = (idx, field, value) => {
    const updated = [...operations];
    updated[idx] = { ...updated[idx], [field]: value };
    setOperations(updated);
  };

  const removeOperation = (idx) => {
    setOperations(operations.filter((_, i) => i !== idx));
  };

  const moveOperation = (idx, direction) => {
    if ((direction === -1 && idx === 0) || (direction === 1 && idx === operations.length - 1)) return;
    const updated = [...operations];
    const swapIdx = idx + direction;
    [updated[idx], updated[swapIdx]] = [updated[swapIdx], updated[idx]];
    // Recalculate sequences
    updated.forEach((op, i) => { op.sequence = (i + 1) * 10; });
    setOperations(updated);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading Routing Templates...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>Routing Templates</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Define manufacturing step sequences. Each template specifies which work centers a product passes through during production.</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add Template</button>
      </div>

      {/* Templates Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
        {templates.map(t => (
          <div key={t.id} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', opacity: t.is_active ? 1 : 0.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b' }}>{t.name}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Code: <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '1px 4px', borderRadius: 3 }}>{t.code}</span></div>
              </div>
              <span style={{ background: '#eff6ff', color: '#2563eb', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>{t.product_type}</span>
            </div>
            {t.description && <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 12px', lineHeight: 1.4 }}>{t.description}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button onClick={() => viewTemplate(t)} style={btnSmStyle('#0891b2')}>View Steps</button>
              <button onClick={() => openEdit(t)} style={btnSmStyle('#2563eb')}>Edit</button>
              <button onClick={() => handleDelete(t)} style={btnSmStyle('#dc2626')}>Deactivate</button>
            </div>
          </div>
        ))}
      </div>

      {/* View Detail Panel */}
      {viewDetail && (
        <div style={{ background: '#fff', borderRadius: 8, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b' }}>Steps: {viewDetail.name} ({viewDetail.code})</h3>
            <button onClick={() => setViewDetail(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#64748b' }}>✕</button>
          </div>
          {detailOps.length === 0 ? (
            <p style={{ color: '#94a3b8', fontSize: 13 }}>No operations defined for this template.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
              {detailOps.map((op, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ background: op.color || '#e2e8f0', color: '#fff', padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, minWidth: 80, textAlign: 'center' }}>
                    <div>{op.work_center_code}</div>
                    <div style={{ fontSize: 10, opacity: 0.9, fontWeight: 400 }}>{op.work_center_name}</div>
                  </div>
                  {i < detailOps.length - 1 && <span style={{ color: '#94a3b8', fontSize: 16 }}>→</span>}
                </div>
              ))}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16, fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th style={thStyleSm}>Seq</th>
                <th style={thStyleSm}>Work Center</th>
                <th style={thStyleSm}>Operation</th>
                <th style={thStyleSm}>Setup (hrs)</th>
                <th style={thStyleSm}>Run/Unit (hrs)</th>
                <th style={thStyleSm}>QC</th>
              </tr>
            </thead>
            <tbody>
              {detailOps.map((op, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={tdStyleSm}>{op.sequence}</td>
                  <td style={tdStyleSm}><span style={{ fontWeight: 600 }}>{op.work_center_code}</span> - {op.work_center_name}</td>
                  <td style={tdStyleSm}>{op.operation_description}</td>
                  <td style={tdStyleSm}>{op.setup_time_hours}</td>
                  <td style={tdStyleSm}>{op.run_time_per_unit}</td>
                  <td style={tdStyleSm}>{op.qc_required ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 2000, padding: '40px 16px', overflowY: 'auto' }} onClick={() => setShowModal(false)}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 700, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>{editRow ? 'Edit Routing Template' : 'Add New Routing Template'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
            </div>

            {/* Template Info */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Code *</label>
                <input value={form.code} onChange={e => setForm({...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '')})} style={inputStyle} placeholder="e.g. TRIPLE_IGU" />
              </div>
              <div>
                <label style={labelStyle}>Name *</label>
                <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} style={inputStyle} placeholder="e.g. Triple IGU" />
              </div>
              <div>
                <label style={labelStyle}>Product Type *</label>
                <input value={form.product_type} onChange={e => setForm({...form, product_type: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')})} style={inputStyle} placeholder="e.g. triple_igu" />
                <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0' }}>Unique key used to link item types to this routing.</p>
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
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={labelStyle}>Description</label>
                <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} style={inputStyle} placeholder="Brief description of this routing" />
              </div>
            </div>

            {/* Operations / Steps */}
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h4 style={{ margin: 0, fontSize: 14, color: '#1e293b' }}>Manufacturing Steps ({operations.length})</h4>
                <button onClick={addOperation} style={{ padding: '5px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>+ Add Step</button>
              </div>

              {operations.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: 20 }}>No steps defined. Click "+ Add Step" to add manufacturing operations.</p>
              ) : (
                <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                  {operations.map((op, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b', minWidth: 24 }}>#{idx + 1}</span>
                      <select value={op.work_center_id} onChange={e => updateOperation(idx, 'work_center_id', e.target.value)} style={{ ...inputStyle, width: 160, flex: 'none' }}>
                        <option value="">Select Work Center</option>
                        {workCenters.map(wc => (
                          <option key={wc.id} value={wc.id}>{wc.code} - {wc.name}</option>
                        ))}
                      </select>
                      <input value={op.operation_description} onChange={e => updateOperation(idx, 'operation_description', e.target.value)} style={{ ...inputStyle, flex: 1, minWidth: 120 }} placeholder="Operation description" />
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>
                        <input type="checkbox" checked={op.qc_required} onChange={e => updateOperation(idx, 'qc_required', e.target.checked)} /> QC
                      </label>
                      <div style={{ display: 'flex', gap: 2 }}>
                        <button onClick={() => moveOperation(idx, -1)} disabled={idx === 0} style={{ ...btnIconStyle, opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                        <button onClick={() => moveOperation(idx, 1)} disabled={idx === operations.length - 1} style={{ ...btnIconStyle, opacity: idx === operations.length - 1 ? 0.3 : 1 }}>▼</button>
                        <button onClick={() => removeOperation(idx)} style={{ ...btnIconStyle, color: '#dc2626' }}>✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button onClick={() => setShowModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
              <button onClick={handleSave} style={{ ...btnSmStyle('#2563eb'), padding: '8px 20px' }}>Save Template</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase' };
const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#334155' };
const thStyleSm = { padding: '6px 10px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569' };
const tdStyleSm = { padding: '6px 10px', fontSize: 12, color: '#334155' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };
const btnIconStyle = { background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, width: 24, height: 24, cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' };
function btnSmStyle(color) { return { padding: '5px 12px', background: color, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' }; }
