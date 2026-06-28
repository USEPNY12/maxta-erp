import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaSync, FaCog, FaLink, FaHistory, FaShoppingCart, FaCheck, FaBan, FaExternalLinkAlt } from 'react-icons/fa';

export default function SmartGlazier() {
  const [tab, setTab] = useState('orders');
  const [config, setConfig] = useState({});
  const [orders, setOrders] = useState([]);
  const [syncLog, setSyncLog] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderLines, setOrderLines] = useState([]);
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'orders') {
        const res = await api.get('/api/smartglazier/orders');
        setOrders(res.data.orders || []);
      } else if (tab === 'log') {
        const res = await api.get('/api/smartglazier/sync-log');
        setSyncLog(res.data.logs || []);
      }
      const cfgRes = await api.get('/api/smartglazier/config');
      setConfig(cfgRes.data.config || {});
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const handleSync = async () => {
    try {
      setLoading(true);
      const res = await api.post('/api/smartglazier/sync');
      toast.success(res.data.message);
      loadData();
    } catch (err) { toast.error('Sync failed'); }
    setLoading(false);
  };

  const handleSyncOrder = async (id) => {
    try {
      const res = await api.post(`/api/smartglazier/orders/${id}/sync`);
      toast.success(res.data.message + ' → ' + res.data.so_number);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Sync failed'); }
  };

  const handleIgnoreOrder = async (id) => {
    try {
      await api.post(`/api/smartglazier/orders/${id}/ignore`);
      toast.info('Order ignored');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const viewOrderDetail = async (order) => {
    try {
      const res = await api.get(`/api/smartglazier/orders/${order.id}`);
      setSelectedOrder(res.data.order);
      setOrderLines(res.data.lines || []);
    } catch (err) { toast.error('Failed to load details'); }
  };

  const saveConfig = async () => {
    try {
      await api.put('/api/smartglazier/config', config);
      toast.success('Configuration saved');
      setShowConfig(false);
    } catch (err) { toast.error('Failed to save'); }
  };

  const statusBadge = (status) => {
    const colors = { pending: 'bg-yellow-100 text-yellow-800', synced: 'bg-green-100 text-green-800', error: 'bg-red-100 text-red-800', ignored: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaLink className="text-blue-600" />
          <h1 className="text-lg font-bold text-gray-800">Smart Glazier Integration</h1>
          <a href="https://smartglazier.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
            <FaExternalLinkAlt size={10} /> smartglazier.com
          </a>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-1 rounded ${config.sync_enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            {config.sync_enabled ? '● Sync Active' : '○ Sync Disabled'}
          </span>
          {config.last_sync_at && <span className="text-xs text-gray-500">Last: {new Date(config.last_sync_at).toLocaleString()}</span>}
          <button onClick={handleSync} disabled={loading} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1">
            <FaSync className={loading ? 'animate-spin' : ''} /> Sync Now
          </button>
          <button onClick={() => setShowConfig(!showConfig)} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center gap-1">
            <FaCog /> Settings
          </button>
        </div>
      </div>

      {/* Config Panel */}
      {showConfig && (
        <div className="bg-blue-50 border-b px-4 py-3">
          <div className="grid grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-medium mb-1">API URL</label>
              <input className="w-full border rounded px-2 py-1" value={config.api_url || ''} onChange={e => setConfig({...config, api_url: e.target.value})} />
            </div>
            <div>
              <label className="block font-medium mb-1">API Key</label>
              <input className="w-full border rounded px-2 py-1" value={config.api_key || ''} onChange={e => setConfig({...config, api_key: e.target.value})} />
            </div>
            <div>
              <label className="block font-medium mb-1">Company ID</label>
              <input className="w-full border rounded px-2 py-1" value={config.company_id || ''} onChange={e => setConfig({...config, company_id: e.target.value})} />
            </div>
            <div>
              <label className="block font-medium mb-1">Sync Interval (min)</label>
              <input type="number" className="w-full border rounded px-2 py-1" value={config.sync_interval_minutes || 15} onChange={e => setConfig({...config, sync_interval_minutes: parseInt(e.target.value)})} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.sync_enabled || false} onChange={e => setConfig({...config, sync_enabled: e.target.checked})} />
              <label className="font-medium">Enable Auto-Sync</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.auto_create_so || false} onChange={e => setConfig({...config, auto_create_so: e.target.checked})} />
              <label className="font-medium">Auto-Create Sales Orders</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={config.auto_create_wo || false} onChange={e => setConfig({...config, auto_create_wo: e.target.checked})} />
              <label className="font-medium">Auto-Create Work Orders</label>
            </div>
            <div className="flex items-end">
              <button onClick={saveConfig} className="px-4 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Save Settings</button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-gray-50 border-b px-4 flex gap-1">
        {[{id:'orders', label:'Orders', icon: FaShoppingCart}, {id:'log', label:'Sync Log', icon: FaHistory}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1 ${tab === t.id ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'orders' && (
          <div className="flex gap-4 h-full">
            {/* Orders List */}
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border">SG Order #</th>
                    <th className="text-left p-2 border">Customer</th>
                    <th className="text-left p-2 border">Date</th>
                    <th className="text-right p-2 border">Total</th>
                    <th className="text-center p-2 border">Status</th>
                    <th className="text-left p-2 border">Local SO</th>
                    <th className="text-center p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No Smart Glazier orders synced yet. Configure your API key and click "Sync Now" to pull orders.</td></tr>}
                  {(orders || [])?.map(o => (
                    <tr key={o.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => viewOrderDetail(o)}>
                      <td className="p-2 border font-medium">{o.sg_order_number || o.sg_order_id}</td>
                      <td className="p-2 border">{o.sg_customer_name}</td>
                      <td className="p-2 border">{o.sg_order_date ? new Date(o.sg_order_date).toLocaleDateString() : '-'}</td>
                      <td className="p-2 border text-right">${parseFloat(o.sg_total || 0).toFixed(2)}</td>
                      <td className="p-2 border text-center">{statusBadge(o.sync_status)}</td>
                      <td className="p-2 border">{o.local_so_number || '-'}</td>
                      <td className="p-2 border text-center">
                        {o.sync_status === 'pending' && (
                          <div className="flex gap-1 justify-center">
                            <button onClick={(e) => { e.stopPropagation(); handleSyncOrder(o.id); }} className="px-2 py-0.5 bg-green-600 text-white rounded text-xs hover:bg-green-700" title="Create Sales Order"><FaCheck /></button>
                            <button onClick={(e) => { e.stopPropagation(); handleIgnoreOrder(o.id); }} className="px-2 py-0.5 bg-gray-400 text-white rounded text-xs hover:bg-gray-500" title="Ignore"><FaBan /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Order Detail Panel */}
            {selectedOrder && (
              <div className="w-80 bg-white border rounded p-3 overflow-auto">
                <h3 className="font-bold text-sm mb-2">Order Detail</h3>
                <div className="text-xs space-y-1">
                  <p><span className="font-medium">SG Order:</span> {selectedOrder.sg_order_number}</p>
                  <p><span className="font-medium">Customer:</span> {selectedOrder.sg_customer_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedOrder.sg_customer_email}</p>
                  <p><span className="font-medium">Date:</span> {selectedOrder.sg_order_date ? new Date(selectedOrder.sg_order_date).toLocaleDateString() : '-'}</p>
                  <p><span className="font-medium">Total:</span> ${parseFloat(selectedOrder.sg_total || 0).toFixed(2)}</p>
                  <p><span className="font-medium">Status:</span> {statusBadge(selectedOrder.sync_status)}</p>
                </div>
                {orderLines.length > 0 && (
                  <div className="mt-3">
                    <h4 className="font-medium text-xs mb-1">Line Items:</h4>
                    {orderLines?.map((l, i) => (
                      <div key={i} className="border rounded p-2 mb-1 text-xs bg-gray-50">
                        <p className="font-medium">{l.product_type}</p>
                        <p>{l.width}" × {l.height}" × {l.thickness}mm</p>
                        <p>Qty: {l.quantity} | ${parseFloat(l.unit_price || 0).toFixed(2)} ea</p>
                        {l.edge_work && <p>Edge: {l.edge_work}</p>}
                        {l.glass_type && <p>Glass: {l.glass_type}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'log' && (
          <table className="w-full text-xs border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Time</th>
                <th className="text-left p-2 border">Type</th>
                <th className="text-left p-2 border">Direction</th>
                <th className="text-center p-2 border">Processed</th>
                <th className="text-center p-2 border">Created</th>
                <th className="text-center p-2 border">Failed</th>
                <th className="text-center p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {syncLog.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No sync history yet</td></tr>}
              {syncLog?.map(l => (
                <tr key={l.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{new Date(l.started_at).toLocaleString()}</td>
                  <td className="p-2 border capitalize">{l.sync_type}</td>
                  <td className="p-2 border capitalize">{l.direction}</td>
                  <td className="p-2 border text-center">{l.records_processed}</td>
                  <td className="p-2 border text-center">{l.records_created}</td>
                  <td className="p-2 border text-center">{l.records_failed}</td>
                  <td className="p-2 border text-center">{statusBadge(l.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
