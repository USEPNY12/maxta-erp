import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function WorkOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Materials');
  const [items, setItems] = useState([]);
  const [newWO, setNewWO] = useState({ item_id: '', quantity: '', priority: 'normal', sales_order_id: '', notes: '' });

  useEffect(() => { fetchOrders(); fetchItems(); }, []);

  const fetchOrders = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { search, status: statusFilter } }); setOrders(Array.isArray(res.data) ? res.data : res.data.orders || []); } catch { setOrders([]); }
  };

  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };

  const openDetail = async (wo) => {
    try { const res = await api.get(`/api/manufacturing/work-orders/${wo.id}`); setSelected(res.data); setActiveTab('Materials'); setShowDetail(true); } catch { setSelected(wo); setShowDetail(true); }
  };

  const handleCreateWO = async () => {
    try {
      await api.post('/api/manufacturing/work-orders', {
        item_id: parseInt(newWO.item_id), quantity: parseFloat(newWO.quantity),
        priority: newWO.priority, sales_order_id: newWO.sales_order_id ? parseInt(newWO.sales_order_id) : null, notes: newWO.notes
      });
      toast.success('Work Order created');
      setShowNew(false); setNewWO({ item_id: '', quantity: '', priority: 'normal', sales_order_id: '', notes: '' }); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create WO'); }
  };

  const handleRelease = async () => {
    try { await api.put(`/api/manufacturing/work-orders/${selected.id}/release`); toast.success('Work Order released'); openDetail(selected); } catch (err) { toast.error(err.response?.data?.error || 'Failed to release WO'); }
  };

  const handleComplete = async () => {
    try { await api.put(`/api/manufacturing/work-orders/${selected.id}/complete`); toast.success('Work Order completed'); openDetail(selected); } catch (err) { toast.error(err.response?.data?.error || 'Failed to complete WO'); }
  };

  const handleClose = async () => {
    try { await api.put(`/api/manufacturing/work-orders/${selected.id}/close`); toast.success('Work Order closed'); openDetail(selected); } catch (err) { toast.error(err.response?.data?.error || 'Failed to close WO'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New WO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchOrders}>↻ Refresh</button>
        <button className="erp-toolbar-btn" disabled={!selected || selected?.status !== 'planned'} onClick={handleRelease}>▶ Release</button>
        <button className="erp-toolbar-btn" disabled={!selected || !['released', 'in_progress'].includes(selected?.status)} onClick={handleComplete}>✓ Complete</button>
        <button className="erp-toolbar-btn" disabled={!selected || selected?.status !== 'completed'} onClick={handleClose}>🔒 Close</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchOrders}>Find</button>
        <div className="ml-auto text-xs">View:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchOrders, 0); }}>
            <option value="open">All Open</option><option value="">All</option><option value="planned">Planned</option><option value="released">Released</option><option value="in_progress">In Progress</option><option value="completed">Completed</option><option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>WO Number</th><th>Item</th><th>Description</th><th>Qty</th><th>Qty Done</th><th>Priority</th><th>Start</th><th>Due</th><th>Status</th></tr></thead>
          <tbody>
            {orders.length === 0 ? <tr><td colSpan="9" className="text-center p-4 text-gray-500">No work orders found</td></tr> : orders.map(wo => (
              <tr key={wo.id} className={`cursor-pointer ${selected?.id === wo.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(wo)}>
                <td className="text-blue-700 font-bold">{wo.order_number || wo.wo_number}</td>
                <td>{wo.item_number || '-'}</td>
                <td>{wo.item_description || wo.description || '-'}</td>
                <td className="text-right">{wo.quantity}</td>
                <td className="text-right">{wo.qty_completed || 0}</td>
                <td><span className={`erp-status erp-status-${(wo.priority || '').toLowerCase()}`}>{wo.priority}</span></td>
                <td>{wo.start_date?.split('T')[0] || '-'}</td>
                <td>{wo.due_date?.split('T')[0] || '-'}</td>
                <td><span className={`erp-status erp-status-${(wo.status || '').toLowerCase()}`}>{wo.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Work Order - {selected.order_number || selected.wo_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Work Order</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">WO No:</label><span className="font-bold">{selected.order_number || selected.wo_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Priority:</label><span>{selected.priority}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">SO#:</label><span>{selected.so_number || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Product</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Item:</label><span>{selected.item_number || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Description:</label><span>{selected.item_description || selected.description || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Qty Ordered:</label><span className="font-bold">{selected.quantity}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Qty Completed:</label><span>{selected.qty_completed || 0}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Schedule</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Start:</label><span>{selected.start_date?.split('T')[0] || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Due:</label><span>{selected.due_date?.split('T')[0] || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Actual Start:</label><span>{selected.actual_start_date?.split('T')[0] || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Actual Finish:</label><span>{selected.actual_finish_date?.split('T')[0] || '-'}</span></div>
                  </div>
                </fieldset>
              </div>
              {selected.notes && <div className="mb-3 text-xs"><label className="font-bold">Notes: </label><span>{selected.notes}</span></div>}
              <div className="erp-tabs">
                {['Materials', 'Routing', 'Labor', 'Receipts', 'Scrap/Recuts', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[180px]">
                {activeTab === 'Materials' && (
                  <table className="erp-grid"><thead><tr><th>Line</th><th>Item</th><th>Description</th><th>Qty Required</th><th>Qty Issued</th><th>UOM</th></tr></thead>
                    <tbody>{(selected.materials || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No materials (add from BOM)</td></tr> : (selected.materials || []).map((m, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{m.item_number || '-'}</td><td>{m.description}</td><td className="text-right">{m.qty_required || m.quantity}</td><td className="text-right">{m.qty_issued || 0}</td><td>{m.uom || 'EA'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Routing' && (
                  <table className="erp-grid"><thead><tr><th>Op#</th><th>Work Center</th><th>Operation</th><th>Setup Hrs</th><th>Run Hrs</th><th>Status</th></tr></thead>
                    <tbody>{(selected.routing || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No routing steps</td></tr> : (selected.routing || []).map((r, i) => (
                      <tr key={i}><td>{r.operation_number || r.sequence || i + 1}</td><td>{r.work_center_name || '-'}</td><td>{r.operation_description || r.description}</td><td className="text-right">{r.setup_time_hrs || 0}</td><td className="text-right">{r.run_time_hrs || 0}</td><td><span className={`erp-status erp-status-${(r.status || 'pending').toLowerCase()}`}>{r.status || 'pending'}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Labor' && (
                  <table className="erp-grid"><thead><tr><th>Date</th><th>Employee</th><th>Work Center</th><th>Hours</th><th>Rate</th><th>Amount</th></tr></thead>
                    <tbody>{(selected.labor || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No labor entries</td></tr> : (selected.labor || []).map((l, i) => (
                      <tr key={i}><td>{l.work_date?.split('T')[0]}</td><td>{l.employee_name || '-'}</td><td>{l.work_center_name || '-'}</td><td className="text-right">{l.hours_worked || l.hours}</td><td className="text-right">${parseFloat(l.labor_rate || l.rate || 0).toFixed(2)}</td><td className="text-right">${((l.hours_worked || l.hours || 0) * (l.labor_rate || l.rate || 0)).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Receipts' && (
                  <table className="erp-grid"><thead><tr><th>Date</th><th>Qty Good</th><th>Qty Scrap</th><th>Location</th><th>Lot#</th></tr></thead>
                    <tbody>{(selected.receipts || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No receipts yet</td></tr> : (selected.receipts || []).map((r, i) => (
                      <tr key={i}><td>{r.receipt_date?.split('T')[0]}</td><td className="text-right">{r.qty_good || r.quantity_good}</td><td className="text-right">{r.qty_scrap || r.quantity_scrap || 0}</td><td>{r.location || '-'}</td><td>{r.lot_number || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Scrap/Recuts' && (
                  <table className="erp-grid"><thead><tr><th>Date</th><th>Qty</th><th>Reason</th><th>Recut WO#</th><th>Cost</th></tr></thead>
                    <tbody>{(selected.recuts || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No scrap/recut records</td></tr> : (selected.recuts || []).map((r, i) => (
                      <tr key={i}><td>{r.recut_date?.split('T')[0]}</td><td className="text-right">{r.quantity}</td><td>{r.reason}</td><td>{r.recut_wo_number || '-'}</td><td className="text-right">${parseFloat(r.cost || 0).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Audit Trail' && (
                  <table className="erp-grid"><thead><tr><th>Date/Time</th><th>User</th><th>Action</th></tr></thead>
                    <tbody><tr><td colSpan="3" className="text-center p-4 text-gray-500">Audit trail</td></tr></tbody></table>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'planned' && <button className="erp-btn erp-btn-primary" onClick={handleRelease}>▶ Release</button>}
              {['released', 'in_progress'].includes(selected.status) && <button className="erp-btn erp-btn-primary" onClick={handleComplete}>✓ Complete</button>}
              {selected.status === 'completed' && <button className="erp-btn" onClick={handleClose}>🔒 Close</button>}
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Work Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Item to Produce:</label>
                  <select className="erp-form-select" value={newWO.item_id} onChange={e => setNewWO({ ...newWO, item_id: e.target.value })}>
                    <option value="">Select Item...</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number || i.item_no} - {i.description}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Quantity:</label><input className="erp-form-input" type="number" value={newWO.quantity} onChange={e => setNewWO({ ...newWO, quantity: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Priority:</label>
                  <select className="erp-form-select" value={newWO.priority} onChange={e => setNewWO({ ...newWO, priority: e.target.value })}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Sales Order ID (optional):</label><input className="erp-form-input" value={newWO.sales_order_id} onChange={e => setNewWO({ ...newWO, sales_order_id: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-16" value={newWO.notes} onChange={e => setNewWO({ ...newWO, notes: e.target.value })} /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateWO} disabled={!newWO.item_id || !newWO.quantity}>Save WO</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkOrders;
