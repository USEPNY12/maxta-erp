import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaBell, FaCog, FaCheck, FaTrash, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaTimesCircle, FaSync } from 'react-icons/fa';

export default function Notifications() {
  const [tab, setTab] = useState('inbox');
  const [notifications, setNotifications] = useState([]);
  const [rules, setRules] = useState([]);
  const [preferences, setPreferences] = useState({});
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { loadData(); }, [tab, filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'inbox') {
        const params = {};
        if (filter !== 'all') params.category = filter;
        const res = await api.get('/api/notifications', { params });
        setNotifications(res.data.notifications || []);
        setUnreadCount(res.data.unread_count || 0);
      } else if (tab === 'rules') {
        const res = await api.get('/api/notifications/rules');
        setRules(res.data.rules || []);
      } else if (tab === 'preferences') {
        const res = await api.get('/api/notifications/preferences');
        setPreferences(res.data.preferences || {});
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const markRead = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/read`);
      loadData();
    } catch (err) { console.error(err); }
  };

  const markAllRead = async () => {
    try {
      await api.put('/api/notifications/read-all');
      toast.success('All marked as read');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const dismiss = async (id) => {
    try {
      await api.put(`/api/notifications/${id}/dismiss`);
      loadData();
    } catch (err) { console.error(err); }
  };

  const runCheck = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/notifications/check');
      toast.success(res.data.message);
      loadData();
    } catch (err) { toast.error('Check failed'); }
    setLoading(false);
  };

  const toggleRule = async (rule) => {
    try {
      await api.put(`/api/notifications/rules/${rule.id}`, { ...rule, is_active: !rule.is_active });
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const savePreferences = async () => {
    try {
      await api.put('/api/notifications/preferences', preferences);
      toast.success('Preferences saved');
    } catch (err) { toast.error('Failed'); }
  };

  const typeIcon = (type) => {
    switch(type) {
      case 'warning': return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error': return <FaTimesCircle className="text-red-500" />;
      case 'success': return <FaCheckCircle className="text-green-500" />;
      default: return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const categories = ['all', 'inventory', 'sales', 'purchasing', 'manufacturing', 'accounting', 'system', 'dispatch'];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaBell className="text-amber-500" />
          <h1 className="text-lg font-bold text-gray-800">Notifications & Alerts</h1>
          {unreadCount > 0 && <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{unreadCount} unread</span>}
        </div>
        <div className="flex gap-2">
          <button onClick={runCheck} disabled={loading} className="px-3 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700 flex items-center gap-1">
            <FaSync className={loading ? 'animate-spin' : ''} /> Run Checks
          </button>
          <button onClick={markAllRead} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center gap-1">
            <FaCheck /> Mark All Read
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border-b px-4 flex gap-1">
        {[{id:'inbox', label:'Inbox'}, {id:'rules', label:'Alert Rules'}, {id:'preferences', label:'Preferences'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-xs font-medium border-b-2 ${tab === t.id ? 'border-amber-600 text-amber-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'inbox' && (
          <div>
            {/* Category Filter */}
            <div className="flex gap-1 mb-3">
              {categories.map(c => (
                <button key={c} onClick={() => setFilter(c)} className={`px-2 py-1 text-xs rounded capitalize ${filter === c ? 'bg-amber-100 text-amber-700 font-medium' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
              ))}
            </div>
            {/* Notifications List */}
            <div className="space-y-1">
              {notifications.length === 0 && <div className="text-center text-gray-400 py-8">No notifications. Click "Run Checks" to scan for alerts.</div>}
              {notifications.map(n => (
                <div key={n.id} className={`flex items-start gap-3 p-3 rounded border ${n.is_read ? 'bg-white' : 'bg-amber-50 border-amber-200'}`}>
                  <div className="mt-0.5">{typeIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{n.title}</span>
                      <span className="text-xs text-gray-400 capitalize bg-gray-100 px-1.5 py-0.5 rounded">{n.category}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    <span className="text-xs text-gray-400">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <div className="flex gap-1">
                    {!n.is_read && <button onClick={() => markRead(n.id)} className="p-1 text-gray-400 hover:text-green-600" title="Mark read"><FaCheck size={12} /></button>}
                    <button onClick={() => dismiss(n.id)} className="p-1 text-gray-400 hover:text-red-600" title="Dismiss"><FaTrash size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'rules' && (
          <div>
            <p className="text-xs text-gray-500 mb-3">Configure which events trigger notifications and who receives them.</p>
            <table className="w-full text-xs border-collapse bg-white">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-2 border">Rule Name</th>
                  <th className="text-left p-2 border">Type</th>
                  <th className="text-left p-2 border">Notify Roles</th>
                  <th className="text-left p-2 border">Method</th>
                  <th className="text-left p-2 border">Frequency</th>
                  <th className="text-center p-2 border">Active</th>
                </tr>
              </thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="p-2 border font-medium">{r.rule_name}</td>
                    <td className="p-2 border capitalize">{r.rule_type?.replace(/_/g, ' ')}</td>
                    <td className="p-2 border">{(() => { try { return JSON.parse(r.notify_roles).join(', '); } catch { return r.notify_roles; } })()}</td>
                    <td className="p-2 border capitalize">{r.notify_method?.replace('_', ' ')}</td>
                    <td className="p-2 border capitalize">{r.frequency?.replace('_', ' ')}</td>
                    <td className="p-2 border text-center">
                      <button onClick={() => toggleRule(r)} className={`px-2 py-0.5 rounded text-xs ${r.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {r.is_active ? 'Active' : 'Disabled'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'preferences' && (
          <div className="max-w-md">
            <h3 className="font-medium text-sm mb-3">Your Notification Preferences</h3>
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={preferences.in_app_enabled !== false} onChange={e => setPreferences({...preferences, in_app_enabled: e.target.checked})} />
                <label>In-App Notifications</label>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={preferences.email_enabled !== false} onChange={e => setPreferences({...preferences, email_enabled: e.target.checked})} />
                <label>Email Notifications</label>
              </div>
              <div>
                <label className="block font-medium mb-1">Digest Frequency</label>
                <select className="border rounded px-2 py-1 w-full" value={preferences.digest_frequency || 'immediate'} onChange={e => setPreferences({...preferences, digest_frequency: e.target.value})}>
                  <option value="immediate">Immediate</option>
                  <option value="daily">Daily Digest</option>
                  <option value="weekly">Weekly Digest</option>
                  <option value="none">None (Muted)</option>
                </select>
              </div>
              <button onClick={savePreferences} className="px-4 py-1.5 bg-amber-600 text-white rounded text-xs hover:bg-amber-700">Save Preferences</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
