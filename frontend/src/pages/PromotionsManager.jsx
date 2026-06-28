import React, { useState, useEffect } from 'react';
import { FaBullhorn, FaPlus, FaEdit, FaTrash, FaChartBar, FaEye, FaMousePointer, FaTimes, FaToggleOn, FaToggleOff } from 'react-icons/fa';
import api from '../services/api';

const PROMO_TYPES = ['announcement', 'promotion', 'alert', 'maintenance', 'feature'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const DISPLAY_TYPES = ['banner', 'modal', 'toast', 'sidebar'];
const ROLES = ['admin', 'manager', 'sales', 'production', 'purchasing', 'accounting', 'shipping', 'readonly'];

const TYPE_COLORS = { announcement: '#3b82f6', promotion: '#10b981', alert: '#ef4444', maintenance: '#f59e0b', feature: '#8b5cf6' };
const PRIORITY_COLORS = { low: '#9ca3af', normal: '#3b82f6', high: '#f59e0b', urgent: '#ef4444' };

function PromoForm({ promo, onSave, onCancel }) {
  const [form, setForm] = useState(promo || {
    title: '', message: '', promo_type: 'announcement', priority: 'normal', display_type: 'banner',
    target_roles: null, start_date: new Date().toISOString()?.slice(0, 16), end_date: '',
    is_dismissible: true, action_url: '', action_label: '', bg_color: '#3b82f6', icon: 'info'
  });
  const [targetAll, setTargetAll] = useState(!promo?.target_roles);
  const [selectedRoles, setSelectedRoles] = useState(promo?.target_roles ? (typeof promo.target_roles === 'string' ? JSON.parse(promo.target_roles) : promo.target_roles) : []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...form, target_roles: targetAll ? null : selectedRoles };
    onSave(data);
  };

  const toggleRole = (role) => {
    setSelectedRoles(prev => prev?.includes(role) ? prev?.filter(r => r !== role) : [...prev, role]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ background: '#fff', borderRadius: '12px', padding: '24px', maxWidth: '650px', width: '100%', maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{promo ? 'Edit Promotion' : 'Create Promotion'}</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Title *</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Message *</label>
              <textarea value={form.message} onChange={e => setForm({...form, message: e.target.value})} required rows={3} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px', resize: 'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Type</label>
              <select value={form.promo_type} onChange={e => setForm({...form, promo_type: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }}>
                {PROMO_TYPES?.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Priority</label>
              <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }}>
                {PRIORITIES?.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Display Type</label>
              <select value={form.display_type} onChange={e => setForm({...form, display_type: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }}>
                {DISPLAY_TYPES?.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Background Color</label>
              <input type="color" value={form.bg_color} onChange={e => setForm({...form, bg_color: e.target.value})} style={{ width: '100%', height: '36px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px', cursor: 'pointer' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Start Date *</label>
              <input type="datetime-local" value={form.start_date?.slice(0,16)} onChange={e => setForm({...form, start_date: e.target.value})} required style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>End Date</label>
              <input type="datetime-local" value={form.end_date?.slice(0,16) || ''} onChange={e => setForm({...form, end_date: e.target.value})} style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Action URL (optional)</label>
              <input value={form.action_url || ''} onChange={e => setForm({...form, action_url: e.target.value})} placeholder="/sales" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Action Label</label>
              <input value={form.action_label || ''} onChange={e => setForm({...form, action_label: e.target.value})} placeholder="View Now" style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px', marginTop: '4px' }} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="checkbox" checked={form.is_dismissible} onChange={e => setForm({...form, is_dismissible: e.target.checked})} />
                Allow users to dismiss
              </label>
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Target Audience</label>
              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <input type="checkbox" checked={targetAll} onChange={e => setTargetAll(e.target.checked)} />
                  All users (broadcast)
                </label>
                {!targetAll && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ROLES?.map(role => (
                      <button key={role} type="button" onClick={() => toggleRole(role)}
                        style={{ padding: '4px 10px', borderRadius: '12px', fontSize: '11px', cursor: 'pointer',
                          background: selectedRoles?.includes(role) ? '#3b82f6' : '#f3f4f6',
                          color: selectedRoles?.includes(role) ? '#fff' : '#374151',
                          border: `1px solid ${selectedRoles?.includes(role) ? '#3b82f6' : '#d1d5db'}` }}>
                        {role}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onCancel} style={{ padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: '6px', cursor: 'pointer', background: '#fff' }}>Cancel</button>
            <button type="submit" style={{ padding: '8px 16px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {promo ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PromotionsManager() {
  const [promotions, setPromotions] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [tab, setTab] = useState('list');
  const [showForm, setShowForm] = useState(false);
  const [editPromo, setEditPromo] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const [promosRes, analyticsRes] = await Promise.all([
        api.get('/api/dashboard-exec/promotions'),
        api.get('/api/dashboard-exec/promotions/analytics')
      ]);
      setPromotions(Array.isArray(promosRes.data) ? promosRes.data : []);
      setAnalytics(Array.isArray(analyticsRes.data) ? analyticsRes.data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    try {
      if (editPromo) {
        await api.put(`/api/dashboard-exec/promotions/${editPromo.id}`, data);
      } else {
        await api.post('/api/dashboard-exec/promotions', data);
      }
      setShowForm(false);
      setEditPromo(null);
      load();
    } catch (e) { alert('Error: ' + (e.response?.data?.error || e.message)); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this promotion?')) return;
    try { await api.delete(`/api/dashboard-exec/promotions/${id}`); load(); } catch (e) { alert('Error: ' + e.message); }
  };

  const handleToggle = async (promo) => {
    try {
      await api.put(`/api/dashboard-exec/promotions/${promo.id}`, { ...promo, is_active: !promo.is_active, target_roles: promo.target_roles ? (typeof promo.target_roles === 'string' ? JSON.parse(promo.target_roles) : promo.target_roles) : null });
      load();
    } catch (e) { alert('Error: ' + e.message); }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FaBullhorn color="#3b82f6" /> Promotions & Announcements
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#6b7280' }}>Manage in-app announcements, alerts, and promotions for ERP users</p>
        </div>
        <button onClick={() => { setEditPromo(null); setShowForm(true); }} style={{ background: '#3b82f6', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FaPlus size={12}/> New Promotion
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: '1px solid #e5e7eb', paddingBottom: '8px' }}>
        {[{ key: 'list', label: 'All Promotions' }, { key: 'analytics', label: 'Analytics' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: tab === t.key ? '600' : '400', background: tab === t.key ? '#eff6ff' : 'transparent', color: tab === t.key ? '#3b82f6' : '#6b7280' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Loading...</p> : tab === 'list' ? (
        <div style={{ display: 'grid', gap: '12px' }}>
          {(promotions || [])?.map(promo => (
            <div key={promo.id} style={{ border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', background: '#fff', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '4px', height: '50px', borderRadius: '2px', background: TYPE_COLORS[promo.promo_type] || '#3b82f6' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600', fontSize: '14px', color: '#1f2937' }}>{promo.title}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `${TYPE_COLORS[promo.promo_type]}20`, color: TYPE_COLORS[promo.promo_type] }}>{promo.promo_type}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `${PRIORITY_COLORS[promo.priority]}20`, color: PRIORITY_COLORS[promo.priority] }}>{promo.priority}</span>
                  <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: promo.is_active ? '#dcfce7' : '#fee2e2', color: promo.is_active ? '#16a34a' : '#dc2626' }}>{promo.is_active ? 'Active' : 'Inactive'}</span>
                </div>
                <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>{promo.message?.slice(0, 100)}{promo.message?.length > 100 ? '...' : ''}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '4px', fontSize: '11px', color: '#9ca3af' }}>
                  <span>Display: {promo.display_type}</span>
                  <span>Target: {promo.target_roles ? (typeof promo.target_roles === 'string' ? JSON.parse(promo.target_roles) : promo.target_roles).join(', ') : 'All'}</span>
                  <span>Views: {promo.view_count} | Clicks: {promo.click_count} | Dismissed: {promo.dismiss_count}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={() => handleToggle(promo)} title={promo.is_active ? 'Deactivate' : 'Activate'} style={{ background: 'none', border: 'none', cursor: 'pointer', color: promo.is_active ? '#10b981' : '#9ca3af' }}>
                  {promo.is_active ? <FaToggleOn size={20}/> : <FaToggleOff size={20}/>}
                </button>
                <button onClick={() => { setEditPromo(promo); setShowForm(true); }} style={{ background: '#f3f4f6', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><FaEdit size={12} color="#6b7280"/></button>
                <button onClick={() => handleDelete(promo.id)} style={{ background: '#fee2e2', border: 'none', padding: '6px', borderRadius: '4px', cursor: 'pointer' }}><FaTrash size={12} color="#ef4444"/></button>
              </div>
            </div>
          ))}
          {promotions.length === 0 && <p style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>No promotions yet. Create your first one!</p>}
        </div>
      ) : (
        <div>
          <h4 style={{ fontSize: '14px', color: '#374151', marginBottom: '12px' }}>Promotion Performance</h4>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ textAlign: 'left', padding: '8px', color: '#6b7280' }}>Title</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>Type</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>Display</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}><FaEye size={10}/> Views</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}><FaMousePointer size={10}/> Clicks</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}><FaTimes size={10}/> Dismissals</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>CTR</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>Dismiss Rate</th>
                <th style={{ textAlign: 'center', padding: '8px', color: '#6b7280' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {analytics?.map(a => (
                <tr key={a.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '8px', fontWeight: '500' }}>{a.title}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: `${TYPE_COLORS[a.promo_type]}20`, color: TYPE_COLORS[a.promo_type] }}>{a.promo_type}</span></td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#6b7280' }}>{a.display_type}</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}>{a.view_count}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#3b82f6' }}>{a.click_count}</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#ef4444' }}>{a.dismiss_count}</td>
                  <td style={{ padding: '8px', textAlign: 'center', fontWeight: '600', color: '#10b981' }}>{a.ctr}%</td>
                  <td style={{ padding: '8px', textAlign: 'center', color: '#f59e0b' }}>{a.dismiss_rate}%</td>
                  <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '10px', background: a.is_active ? '#dcfce7' : '#fee2e2', color: a.is_active ? '#16a34a' : '#dc2626' }}>{a.is_active ? 'Active' : 'Off'}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && <PromoForm promo={editPromo} onSave={handleSave} onCancel={() => { setShowForm(false); setEditPromo(null); }} />}
    </div>
  );
}
