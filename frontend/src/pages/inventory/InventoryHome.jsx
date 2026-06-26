import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

function InventoryHome() {
  const navigate = useNavigate();
  const [kpis, setKpis] = useState(null);
  const [stockStatus, setStockStatus] = useState([]);
  const [lots, setLots] = useState([]);
  const [activeTab, setActiveTab] = useState('stock');

  useEffect(() => {
    api.get('/api/inventory/dashboard').then(r => setKpis(r.data)).catch(() => setKpis({ total_items: 0, total_value: 0, low_stock: 0, out_of_stock: 0 }));
    api.get('/api/inventory/stock-status').then(r => setStockStatus(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/inventory/lots').then(r => setLots(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);

  const fmt = (v) => v ? Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00';

  return (
    <div className="h-full overflow-auto bg-[#c8c8d4] p-4">
      <div className="grid grid-cols-4 gap-4 mb-4">
        {[
          { label: 'Total Items', value: kpis?.total_items || 0, color: 'blue', icon: '📦' },
          { label: 'Total Value', value: fmt(kpis?.total_value), color: 'green', icon: '💰' },
          { label: 'Low Stock', value: kpis?.low_stock || 0, color: 'yellow', icon: '⚠️' },
          { label: 'Out of Stock', value: kpis?.out_of_stock || 0, color: 'red', icon: '🚫' },
        ].map(k => (
          <div key={k.label} className={`bg-white rounded shadow p-4 border-l-4 border-${k.color}-500`}>
            <div className="flex justify-between items-center">
              <div><p className="text-xs text-gray-500 uppercase">{k.label}</p><p className="text-2xl font-bold">{k.value}</p></div>
              <span className="text-2xl">{k.icon}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => navigate('/inventory/items?new=true')} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">+ New Item</button>
        <button onClick={() => navigate('/inventory/items')} className="px-3 py-1.5 bg-gray-600 text-white rounded text-sm hover:bg-gray-700">Item List</button>
        <button onClick={() => setActiveTab('adjustments')} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">Adjustments</button>
        <button onClick={() => setActiveTab('transfers')} className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700">Transfers</button>
        <button onClick={() => setActiveTab('lots')} className="px-3 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-700">Lot Tracking</button>
      </div>
      <div className="flex border-b border-gray-400 mb-3">
        {['stock','lots','adjustments','transfers'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2 text-sm font-medium ${activeTab === t ? 'border-b-2 border-blue-600 text-blue-700' : 'text-gray-600 hover:text-gray-800'}`}>
            {t === 'stock' ? 'Stock Status' : t === 'lots' ? 'Lot Tracking' : t === 'adjustments' ? 'Adjustments' : 'Transfers'}
          </button>
        ))}
      </div>
      {activeTab === 'stock' && (
        <div className="bg-white rounded shadow overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 border-b">
              <th className="text-left p-2">Item #</th><th className="text-left p-2">Description</th>
              <th className="text-left p-2">Type</th><th className="text-right p-2">Qty On Hand</th>
              <th className="text-right p-2">Min Qty</th><th className="text-right p-2">Std Cost</th>
              <th className="text-right p-2">Value</th><th className="text-center p-2">Status</th>
            </tr></thead>
            <tbody>
              {stockStatus.map(s => (
                <tr key={s.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => navigate(`/inventory/items/${s.id}`)}>
                  <td className="p-2 font-medium text-blue-700">{s.item_number}</td>
                  <td className="p-2">{s.description}</td>
                  <td className="p-2 text-xs">{s.item_type}</td>
                  <td className="p-2 text-right font-medium">{Number(s.qty_on_hand).toFixed(0)}</td>
                  <td className="p-2 text-right text-gray-500">{Number(s.minimum_qty).toFixed(0)}</td>
                  <td className="p-2 text-right">{fmt(s.standard_cost)}</td>
                  <td className="p-2 text-right">{fmt(s.extended_value)}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.stock_status === 'out_of_stock' ? 'bg-red-100 text-red-700' : s.stock_status === 'low_stock' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                      {s.stock_status === 'out_of_stock' ? 'OUT' : s.stock_status === 'low_stock' ? 'LOW' : 'OK'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {stockStatus.length === 0 && <p className="text-center py-6 text-gray-400">No items in inventory</p>}
        </div>
      )}
      {activeTab === 'lots' && (
        <div className="bg-white rounded shadow overflow-auto">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-100 border-b">
              <th className="text-left p-2">Lot #</th><th className="text-left p-2">Item</th>
              <th className="text-right p-2">Qty</th><th className="text-left p-2">Location</th>
              <th className="text-left p-2">Status</th><th className="text-left p-2">Received</th>
              <th className="text-left p-2">PO #</th>
            </tr></thead>
            <tbody>
              {lots.map(l => (
                <tr key={l.id} className="border-b hover:bg-blue-50">
                  <td className="p-2 font-medium">{l.lot_number}</td>
                  <td className="p-2">{l.item_number || `Item #${l.item_id}`}</td>
                  <td className="p-2 text-right">{Number(l.quantity).toFixed(0)}</td>
                  <td className="p-2">{l.location_name || `Loc #${l.location_id}`}</td>
                  <td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${l.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{l.status}</span></td>
                  <td className="p-2 text-xs">{l.received_date ? new Date(l.received_date).toLocaleDateString() : ''}</td>
                  <td className="p-2 text-xs">{l.po_number || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {lots.length === 0 && <p className="text-center py-6 text-gray-400">No lots tracked</p>}
        </div>
      )}
      {activeTab === 'adjustments' && <AdjustmentsPanel />}
      {activeTab === 'transfers' && <TransfersPanel />}
    </div>
  );
}

function AdjustmentsPanel() {
  const [adjustments, setAdjustments] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ item_id: '', location_id: '', adjustment_type: 'increase', quantity: '', reason_code: '', lot_number: '', notes: '' });
  useEffect(() => {
    api.get('/api/inventory/adjustments').then(r => setAdjustments(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/inventory/items').then(r => setItems(Array.isArray(r.data) ? r.data : r.data?.items || [])).catch(() => {});
    api.get('/api/inventory/locations').then(r => setLocations(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  const handleSave = async () => {
    try {
      await api.post('/api/inventory/adjustments', { ...form, quantity: Number(form.quantity) });
      setShowNew(false); setForm({ item_id: '', location_id: '', adjustment_type: 'increase', quantity: '', reason_code: '', lot_number: '', notes: '' });
      const r = await api.get('/api/inventory/adjustments'); setAdjustments(Array.isArray(r.data) ? r.data : []);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Inventory Adjustments</h3>
        <button onClick={() => setShowNew(!showNew)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">+ New Adjustment</button>
      </div>
      {showNew && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded grid grid-cols-4 gap-3">
          <select className="border rounded px-2 py-1 text-sm" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}><option value="">Select Item</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}</select>
          <select className="border rounded px-2 py-1 text-sm" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})}><option value="">Select Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select className="border rounded px-2 py-1 text-sm" value={form.adjustment_type} onChange={e => setForm({...form, adjustment_type: e.target.value})}><option value="increase">Increase</option><option value="decrease">Decrease</option></select>
          <input type="number" placeholder="Quantity" className="border rounded px-2 py-1 text-sm" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input placeholder="Reason Code" className="border rounded px-2 py-1 text-sm" value={form.reason_code} onChange={e => setForm({...form, reason_code: e.target.value})} />
          <input placeholder="Lot Number" className="border rounded px-2 py-1 text-sm" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} />
          <input placeholder="Notes" className="border rounded px-2 py-1 text-sm col-span-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <div className="col-span-4 flex gap-2"><button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Save</button><button onClick={() => setShowNew(false)} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Cancel</button></div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">Adj #</th><th className="text-left p-2">Item</th><th className="text-left p-2">Type</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Location</th><th className="text-left p-2">Reason</th><th className="text-left p-2">Date</th></tr></thead>
        <tbody>{adjustments.map(a => (<tr key={a.id} className="border-b hover:bg-blue-50"><td className="p-2 font-medium">{a.adjustment_number}</td><td className="p-2">{a.item_number}</td><td className="p-2"><span className={`px-2 py-0.5 rounded text-xs ${a.adjustment_type === 'increase' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{a.adjustment_type}</span></td><td className="p-2 text-right font-medium">{Number(a.quantity).toFixed(0)}</td><td className="p-2">{a.location_name || ''}</td><td className="p-2 text-xs">{a.reason_code || ''}</td><td className="p-2 text-xs">{a.adjustment_date ? new Date(a.adjustment_date).toLocaleDateString() : ''}</td></tr>))}</tbody>
      </table>
      {adjustments.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No adjustments</p>}
    </div>
  );
}

function TransfersPanel() {
  const [transfers, setTransfers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [items, setItems] = useState([]);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({ item_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reason: '', notes: '' });
  useEffect(() => {
    api.get('/api/inventory/transfers').then(r => setTransfers(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/inventory/items').then(r => setItems(Array.isArray(r.data) ? r.data : r.data?.items || [])).catch(() => {});
    api.get('/api/inventory/locations').then(r => setLocations(Array.isArray(r.data) ? r.data : [])).catch(() => {});
  }, []);
  const handleSave = async () => {
    try {
      await api.post('/api/inventory/transfers', { ...form, quantity: Number(form.quantity) });
      setShowNew(false); setForm({ item_id: '', from_location_id: '', to_location_id: '', quantity: '', lot_number: '', reason: '', notes: '' });
      const r = await api.get('/api/inventory/transfers'); setTransfers(Array.isArray(r.data) ? r.data : []);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
  };
  return (
    <div className="bg-white rounded shadow p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold">Stock Transfers</h3>
        <button onClick={() => setShowNew(!showNew)} className="px-3 py-1 bg-green-600 text-white rounded text-sm">+ New Transfer</button>
      </div>
      {showNew && (
        <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded grid grid-cols-4 gap-3">
          <select className="border rounded px-2 py-1 text-sm" value={form.item_id} onChange={e => setForm({...form, item_id: e.target.value})}><option value="">Select Item</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}</select>
          <select className="border rounded px-2 py-1 text-sm" value={form.from_location_id} onChange={e => setForm({...form, from_location_id: e.target.value})}><option value="">From Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <select className="border rounded px-2 py-1 text-sm" value={form.to_location_id} onChange={e => setForm({...form, to_location_id: e.target.value})}><option value="">To Location</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          <input type="number" placeholder="Quantity" className="border rounded px-2 py-1 text-sm" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
          <input placeholder="Lot Number" className="border rounded px-2 py-1 text-sm" value={form.lot_number} onChange={e => setForm({...form, lot_number: e.target.value})} />
          <input placeholder="Reason" className="border rounded px-2 py-1 text-sm" value={form.reason} onChange={e => setForm({...form, reason: e.target.value})} />
          <input placeholder="Notes" className="border rounded px-2 py-1 text-sm col-span-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
          <div className="col-span-4 flex gap-2"><button onClick={handleSave} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Transfer</button><button onClick={() => setShowNew(false)} className="px-3 py-1 bg-gray-400 text-white rounded text-sm">Cancel</button></div>
        </div>
      )}
      <table className="w-full text-sm">
        <thead><tr className="bg-gray-100 border-b"><th className="text-left p-2">Transfer #</th><th className="text-left p-2">Item</th><th className="text-left p-2">From</th><th className="text-left p-2">To</th><th className="text-right p-2">Qty</th><th className="text-left p-2">Lot</th><th className="text-left p-2">Date</th><th className="text-left p-2">Status</th></tr></thead>
        <tbody>{transfers.map(t => (<tr key={t.id} className="border-b hover:bg-blue-50"><td className="p-2 font-medium">{t.transfer_number}</td><td className="p-2">{t.item_number}</td><td className="p-2">{t.from_location_name}</td><td className="p-2">{t.to_location_name}</td><td className="p-2 text-right font-medium">{Number(t.quantity).toFixed(0)}</td><td className="p-2 text-xs">{t.lot_number || ''}</td><td className="p-2 text-xs">{t.transfer_date ? new Date(t.transfer_date).toLocaleDateString() : ''}</td><td className="p-2"><span className="px-2 py-0.5 rounded text-xs bg-green-100 text-green-700">{t.status}</span></td></tr>))}</tbody>
      </table>
      {transfers.length === 0 && <p className="text-center py-4 text-gray-400 text-sm">No transfers</p>}
    </div>
  );
}

export default InventoryHome;
