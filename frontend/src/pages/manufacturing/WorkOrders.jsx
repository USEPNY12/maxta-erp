import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';

function WorkOrders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [productFilter, setProductFilter] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Routing');
  const [items, setItems] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [newWO, setNewWO] = useState({ item_id: '', quantity: '', priority: 'normal', product_type: 'tempered_panel', glass_type: 'Clear Float', thickness: '6', width: '', height: '', edge_type: 'Flat Polish', interlayer_type: '', has_holes: false, has_notches: false, hole_specs: '', notes: '', use_template: true });

  useEffect(() => { fetchOrders(); fetchItems(); fetchTemplates(); }, [statusFilter, productFilter]);

  const fetchOrders = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { search, status: statusFilter, product_type: productFilter || undefined } }); setOrders(Array.isArray(res.data) ? res.data : []); } catch { setOrders([]); }
  };
  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : []); } catch { setItems([]); }
  };
  const fetchTemplates = async () => {
    try { const res = await api.get('/api/manufacturing/routing-templates'); setTemplates(Array.isArray(res.data) ? res.data : []); } catch { setTemplates([]); }
  };
  const openDetail = async (wo) => {
    try { const res = await api.get(`/api/manufacturing/work-orders/${wo.id}`); setSelected(res.data); setActiveTab('Routing'); setShowDetail(true); } catch { setSelected(wo); setShowDetail(true); }
  };
  const handleCreateWO = async () => {
    try {
      const payload = { ...newWO, item_id: parseInt(newWO.item_id), quantity: parseFloat(newWO.quantity), thickness: parseFloat(newWO.thickness) || null, width: parseFloat(newWO.width) || null, height: parseFloat(newWO.height) || null, has_holes: newWO.has_holes ? 1 : 0, has_notches: newWO.has_notches ? 1 : 0 };
      await api.post('/api/manufacturing/work-orders', payload);
      toast.success('Work Order created with routing');
      setShowNew(false); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create WO'); }
  };
  const handleAction = async (action) => {
    try { await api.post(`/api/manufacturing/work-orders/${selected.id}/${action}`); toast.success(`Work Order ${action}d`); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || `Failed to ${action}`); }
  };

  const priorityColors = { urgent: 'text-red-700 bg-red-50', high: 'text-orange-700 bg-orange-50', normal: 'text-blue-700 bg-blue-50', low: 'text-gray-600 bg-gray-50' };
  const statusColors = { planned: 'bg-gray-100 text-gray-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700', closed: 'bg-gray-200 text-gray-500' };
  const productTypes = [{ value: 'tempered_panel', label: 'Tempered Panel' }, { value: 'laminated', label: 'Laminated Glass' }, { value: 'tempered_laminated', label: 'Tempered Laminated' }, { value: 'igu', label: 'Standard IGU' }, { value: 'low_e_igu', label: 'Low-E IGU' }, { value: 'heat_soaked', label: 'Heat Soaked' }, { value: 'custom', label: 'Custom' }];

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New WO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchOrders}>Refresh</button>
        <div className="erp-toolbar-separator" />
        <select className="erp-form-select text-xs" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option>
          <option value="planned">Planned</option>
          <option value="scheduled">Scheduled</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="all">All</option>
        </select>
        <select className="erp-form-select text-xs" value={productFilter} onChange={e => setProductFilter(e.target.value)}>
          <option value="">All Products</option>
          {productTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
        </select>
        <input className="erp-form-input text-xs w-48" placeholder="Search WO#..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto">
        <table className="erp-table w-full">
          <thead><tr>
            <th>WO#</th><th>Product Type</th><th>Item</th><th>Size</th><th>Qty</th><th>Priority</th><th>Status</th><th>Station</th><th>Customer</th><th>Due Date</th>
          </tr></thead>
          <tbody>
            {orders.map(wo => (
              <tr key={wo.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(wo)}>
                <td className="font-bold text-blue-700">{wo.order_number || `WO-${wo.id}`}</td>
                <td className="capitalize text-xs">{(wo.product_type || 'custom').replace(/_/g, ' ')}</td>
                <td>{wo.item_number}</td>
                <td className="text-xs">{wo.width && wo.height ? `${wo.width}" x ${wo.height}"` : '-'}</td>
                <td className="font-bold">{wo.quantity}</td>
                <td><span className={`text-[10px] px-1.5 py-0.5 rounded ${priorityColors[wo.priority] || ''}`}>{wo.priority}</span></td>
                <td><span className={`text-[10px] px-1.5 py-0.5 rounded ${statusColors[wo.status] || ''}`}>{wo.status}</span></td>
                <td className="text-xs">{wo.station_icon} {wo.current_station_name || '-'}</td>
                <td className="text-xs">{wo.customer_name || '-'}</td>
                <td className="text-xs">{formatDate(wo.finish_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {orders.length === 0 && <div className="text-center text-gray-500 py-8">No work orders found</div>}
      </div>

      {/* Detail Panel */}
      {showDetail && selected && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-4 overflow-auto">
          <div className="bg-white rounded shadow-xl w-[900px] max-h-[90vh] overflow-auto">
            {/* Header */}
            <div className="bg-gray-100 border-b px-4 py-3 flex justify-between items-center sticky top-0">
              <div>
                <h3 className="font-bold">WO# {selected.order_number || selected.id} - {selected.item_description}</h3>
                <p className="text-xs text-gray-600 capitalize">{(selected.product_type || '').replace(/_/g, ' ')} | {selected.glass_type} {selected.thickness}mm | {selected.width}" x {selected.height}" | {selected.edge_type}</p>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-1 rounded font-bold ${statusColors[selected.status] || ''}`}>{selected.status}</span>
                {selected.status === 'planned' && <button className="bg-blue-600 text-white text-xs px-3 py-1 rounded" onClick={() => handleAction('release')}>Release</button>}
                {selected.status === 'scheduled' && <button className="bg-green-600 text-white text-xs px-3 py-1 rounded" onClick={() => handleAction('start')}>Start</button>}
                {['in_progress','scheduled','released'].includes(selected.status) && <button className="bg-green-700 text-white text-xs px-3 py-1 rounded" onClick={() => handleAction('complete')}>Complete</button>}
                <button className="text-gray-500 text-xl px-2" onClick={() => setShowDetail(false)}>x</button>
              </div>
            </div>

            {/* Glass Specs Summary */}
            <div className="px-4 py-2 bg-blue-50 border-b text-xs grid grid-cols-8 gap-2">
              <div><span className="text-gray-500">Glass:</span> <strong>{selected.glass_type || '-'}</strong></div>
              <div><span className="text-gray-500">Thick:</span> <strong>{selected.thickness}mm</strong></div>
              <div><span className="text-gray-500">Size:</span> <strong>{selected.width}" x {selected.height}"</strong></div>
              <div><span className="text-gray-500">Edge:</span> <strong>{selected.edge_type || '-'}</strong></div>
              <div><span className="text-gray-500">Qty:</span> <strong>{selected.quantity}</strong></div>
              <div><span className="text-gray-500">Station:</span> <strong>{selected.station_icon} {selected.current_station_name || '-'}</strong></div>
              <div><span className="text-gray-500">Holes:</span> <strong>{selected.has_holes ? 'Yes' : 'No'}</strong></div>
              <div><span className="text-gray-500">Interlayer:</span> <strong>{selected.interlayer_type || '-'}</strong></div>
            </div>

            {/* Tabs */}
            <div className="border-b flex">
              {['Routing', 'Materials', 'Labor', 'Tracking', 'QC', 'Recuts', 'Receipts'].map(tab => (
                <button key={tab} className={`px-4 py-2 text-xs font-bold border-b-2 ${activeTab === tab ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`} onClick={() => setActiveTab(tab)}>{tab}</button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 min-h-[300px]">
              {activeTab === 'Routing' && (
                <div>
                  <h4 className="font-bold text-sm mb-2">Production Routing Steps</h4>
                  <div className="space-y-2">
                    {(selected.routing || []).map((r, i) => (
                      <div key={i} className={`flex items-center gap-3 p-2 rounded border ${r.status === 'complete' ? 'bg-green-50 border-green-200' : r.status === 'in_progress' ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200'}`}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: r.color || '#6b7280' }}>{r.icon || (i+1)}</div>
                        <div className="flex-1">
                          <div className="font-bold text-xs">{r.work_center_name} <span className="text-gray-400 font-normal">({r.work_center_code})</span></div>
                          <div className="text-[10px] text-gray-600">{r.operation_description}</div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] px-2 py-0.5 rounded ${r.status === 'complete' ? 'bg-green-100 text-green-700' : r.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'}`}>{r.status || 'pending'}</span>
                          {r.qc_required === 1 && <div className="text-[9px] text-amber-600 mt-0.5">QC Required</div>}
                        </div>
                      </div>
                    ))}
                    {(!selected.routing || selected.routing.length === 0) && <p className="text-gray-500 text-sm">No routing defined</p>}
                  </div>
                </div>
              )}
              {activeTab === 'Materials' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Item#</th><th>Description</th><th>UOM</th><th>Qty Required</th><th>Qty Issued</th></tr></thead>
                <tbody>{(selected.materials || []).map((m, i) => (<tr key={i}><td>{m.item_number}</td><td>{m.item_description}</td><td>{m.uom}</td><td>{m.quantity_required}</td><td>{m.quantity_issued || 0}</td></tr>))}</tbody></table>
              )}
              {activeTab === 'Labor' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Date</th><th>Station</th><th>Hours</th><th>Type</th><th>Notes</th></tr></thead>
                <tbody>{(selected.labor || []).map((l, i) => (<tr key={i}><td>{formatDate(l.work_date)}</td><td>{l.work_center_name}</td><td>{l.hours}</td><td>{l.labor_type}</td><td>{l.notes}</td></tr>))}</tbody></table>
              )}
              {activeTab === 'Tracking' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Station</th><th>Status</th><th>Started</th><th>Completed</th><th>Qty Good</th><th>Qty Scrap</th></tr></thead>
                <tbody>{(selected.tracking || []).map((t, i) => (<tr key={i}><td>{t.station_icon} {t.station_name}</td><td>{t.status}</td><td>{formatDate(t.started_at)}</td><td>{formatDate(t.completed_at)}</td><td>{t.quantity_good || '-'}</td><td>{t.quantity_scrap || '-'}</td></tr>))}</tbody></table>
              )}
              {activeTab === 'QC' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Date</th><th>Station</th><th>Type</th><th>Result</th><th>Qty Inspected</th><th>Qty Failed</th><th>Defect</th></tr></thead>
                <tbody>{(selected.qc_inspections || []).map((q, i) => (<tr key={i} className={q.result === 'fail' ? 'bg-red-50' : ''}><td>{formatDate(q.inspection_date)}</td><td>{q.work_center_name}</td><td>{q.inspection_type}</td><td className={q.result === 'pass' ? 'text-green-700 font-bold' : 'text-red-700 font-bold'}>{q.result}</td><td>{q.quantity_inspected}</td><td>{q.quantity_failed}</td><td>{q.defect_type}</td></tr>))}</tbody></table>
              )}
              {activeTab === 'Recuts' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Date</th><th>Station</th><th>Qty</th><th>Reason</th><th>Notes</th></tr></thead>
                <tbody>{(selected.recuts || []).map((r, i) => (<tr key={i}><td>{formatDate(r.reported_at)}</td><td>{r.work_center_name}</td><td>{r.quantity}</td><td>{r.reason_code}</td><td>{r.notes}</td></tr>))}</tbody></table>
              )}
              {activeTab === 'Receipts' && (
                <table className="erp-table w-full text-xs"><thead><tr><th>Receipt#</th><th>Date</th><th>Qty Completed</th><th>Qty Scrapped</th><th>Total Cost</th></tr></thead>
                <tbody>{(selected.receipts || []).map((r, i) => (<tr key={i}><td>{r.receipt_number}</td><td>{formatDate(r.receipt_date)}</td><td>{r.quantity_completed}</td><td>{r.quantity_scrapped}</td><td>${r.total_cost || 0}</td></tr>))}</tbody></table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New Work Order Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/30 flex items-start justify-center z-50 pt-4 overflow-auto">
          <div className="bg-white rounded shadow-xl w-[700px] max-h-[90vh] overflow-auto">
            <div className="bg-gray-100 border-b px-4 py-3 flex justify-between items-center">
              <h3 className="font-bold">New Work Order - Glass Fabrication</h3>
              <button className="text-gray-500 text-xl" onClick={() => setShowNew(false)}>x</button>
            </div>
            <div className="p-4 space-y-3">
              {/* Product Type */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-600">Product Type *</label>
                  <select className="erp-form-select w-full" value={newWO.product_type} onChange={e => setNewWO({...newWO, product_type: e.target.value})}>
                    {productTypes.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-600">Item *</label>
                  <select className="erp-form-select w-full" value={newWO.item_id} onChange={e => setNewWO({...newWO, item_id: e.target.value})}>
                    <option value="">Select item...</option>
                    {items.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
                  </select>
                </div>
              </div>
              {/* Glass Specs */}
              <div className="border border-gray-200 rounded p-3">
                <h4 className="font-bold text-xs text-gray-700 mb-2">Glass Specifications</h4>
                <div className="grid grid-cols-4 gap-2">
                  <div><label className="text-[10px] text-gray-500">Glass Type</label><select className="erp-form-select w-full text-xs" value={newWO.glass_type} onChange={e => setNewWO({...newWO, glass_type: e.target.value})}>
                    <option>Clear Float</option><option>Low Iron</option><option>Tinted Gray</option><option>Tinted Bronze</option><option>Tinted Green</option><option>Low-E</option><option>Reflective</option><option>Patterned</option><option>Wired</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-500">Thickness (mm)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.thickness} onChange={e => setNewWO({...newWO, thickness: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-500">Width (inches)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.width} onChange={e => setNewWO({...newWO, width: e.target.value})} /></div>
                  <div><label className="text-[10px] text-gray-500">Height (inches)</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.height} onChange={e => setNewWO({...newWO, height: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <div><label className="text-[10px] text-gray-500">Edge Type</label><select className="erp-form-select w-full text-xs" value={newWO.edge_type} onChange={e => setNewWO({...newWO, edge_type: e.target.value})}>
                    <option>Flat Polish</option><option>Pencil Polish</option><option>Beveled</option><option>Seamed</option><option>Mitered</option><option>OG Edge</option><option>Waterfall</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-500">Interlayer (if lam)</label><select className="erp-form-select w-full text-xs" value={newWO.interlayer_type} onChange={e => setNewWO({...newWO, interlayer_type: e.target.value})}>
                    <option value="">N/A</option><option>PVB Clear</option><option>PVB White</option><option>PVB Color</option><option>SGP</option><option>EVA</option>
                  </select></div>
                  <div><label className="text-[10px] text-gray-500">Quantity *</label><input type="number" className="erp-form-input w-full text-xs" value={newWO.quantity} onChange={e => setNewWO({...newWO, quantity: e.target.value})} /></div>
                </div>
              </div>
              {/* Fabrication Options */}
              <div className="border border-gray-200 rounded p-3">
                <h4 className="font-bold text-xs text-gray-700 mb-2">Fabrication Options</h4>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newWO.has_holes} onChange={e => setNewWO({...newWO, has_holes: e.target.checked})} /> Holes Required</label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newWO.has_notches} onChange={e => setNewWO({...newWO, has_notches: e.target.checked})} /> Notches Required</label>
                  <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={newWO.use_template} onChange={e => setNewWO({...newWO, use_template: e.target.checked})} /> Auto-Populate Routing</label>
                </div>
                {newWO.has_holes && <div className="mt-2"><label className="text-[10px] text-gray-500">Hole Specs (positions, diameters)</label><input className="erp-form-input w-full text-xs" placeholder="e.g., 4 holes, 12mm dia, 2in from edges" value={newWO.hole_specs} onChange={e => setNewWO({...newWO, hole_specs: e.target.value})} /></div>}
              </div>
              {/* Priority & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-xs font-bold text-gray-600">Priority</label>
                  <select className="erp-form-select w-full" value={newWO.priority} onChange={e => setNewWO({...newWO, priority: e.target.value})}>
                    <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="urgent">Urgent</option>
                  </select>
                </div>
                <div><label className="text-xs font-bold text-gray-600">Notes</label><textarea className="erp-form-input w-full text-xs" rows="2" value={newWO.notes} onChange={e => setNewWO({...newWO, notes: e.target.value})} /></div>
              </div>
              {/* Routing Preview */}
              {newWO.use_template && newWO.product_type && (
                <div className="bg-gray-50 border rounded p-2 text-xs">
                  <strong>Routing Template:</strong> {productTypes.find(p => p.value === newWO.product_type)?.label || 'Custom'}
                  {newWO.product_type === 'tempered_panel' && <span className="text-gray-600 ml-2">Cut → Edge → Wash → Temper → QC → Pack</span>}
                  {newWO.product_type === 'laminated' && <span className="text-gray-600 ml-2">Cut → Edge → Wash → Laminate → QC → Pack</span>}
                  {newWO.product_type === 'tempered_laminated' && <span className="text-gray-600 ml-2">Cut → Edge → CNC → Wash → Temper → QC → Wash → Laminate → QC → Pack</span>}
                  {newWO.product_type === 'igu' && <span className="text-gray-600 ml-2">Cut → Edge → Wash → Temper → QC → IGU → QC → Pack</span>}
                  {newWO.product_type === 'heat_soaked' && <span className="text-gray-600 ml-2">Cut → Edge → CNC → Wash → Temper → HST → QC → Pack</span>}
                </div>
              )}
              <div className="flex gap-2 pt-2">
                <button className="flex-1 bg-blue-600 text-white py-2 rounded font-bold" onClick={handleCreateWO}>Create Work Order</button>
                <button className="flex-1 bg-gray-200 py-2 rounded" onClick={() => setShowNew(false)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default WorkOrders;
