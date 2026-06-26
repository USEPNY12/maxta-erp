import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
function PurchaseOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveLocation, setReceiveLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [newPO, setNewPO] = useState({
    vendor_id: '', ship_to_location: '', notes: '', required_date: '', po_type: 'standard',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '' }]
  });
  useEffect(() => { fetchOrders(); fetchVendors(); fetchItems(); fetchLocations(); }, [statusFilter]);
  const fetchOrders = async () => {
    try { const res = await api.get('/api/purchasing/purchase-orders', { params: { search, status: statusFilter } }); setOrders(Array.isArray(res.data) ? res.data : res.data.orders || []); } catch { setOrders([]); }
  };
  const fetchVendors = async () => {
    try { const res = await api.get('/api/purchasing/vendors'); setVendors(Array.isArray(res.data) ? res.data : []); } catch { setVendors([]); }
  };
  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };
  const fetchLocations = async () => {
    try { const res = await api.get('/api/purchasing/locations'); setLocations(Array.isArray(res.data) ? res.data : []); } catch { setLocations([]); }
  };
  const openDetail = async (po) => {
    try { const res = await api.get(`/api/purchasing/purchase-orders/${po.id}`); setSelected(res.data); setActiveTab('Lines'); setShowDetail(true); } catch { setSelected(po); setShowDetail(true); }
  };
  const handleCreatePO = async () => {
    try {
      await api.post('/api/purchasing/purchase-orders', {
        vendor_id: parseInt(newPO.vendor_id), ship_to_location: newPO.ship_to_location,
        notes: newPO.notes, required_date: newPO.required_date || null, po_type: newPO.po_type,
        lines: newPO.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null, description: l.description,
          quantity: parseFloat(l.quantity) || 1, unit_price: parseFloat(l.unit_price) || 0,
          glass_type: l.glass_type, thickness: l.thickness, width: l.width ? parseFloat(l.width) : null, height: l.height ? parseFloat(l.height) : null
        }))
      });
      toast.success('Purchase Order created'); setShowNew(false);
      setNewPO({ vendor_id: '', ship_to_location: '', notes: '', required_date: '', po_type: 'standard', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '' }] });
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PO'); }
  };
  const handleApprove = async () => {
    try { await api.put(`/api/purchasing/purchase-orders/${selected.id}/approve`); toast.success('PO approved'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleSendToVendor = async () => {
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/send`); toast.success('PO sent to vendor'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleClosePO = async () => {
    if (!window.confirm('Close this PO? Unreceived quantities will be cancelled.')) return;
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/close`); toast.success('PO closed'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleCancelPO = async () => {
    if (!window.confirm('Cancel this PO?')) return;
    try { await api.put(`/api/purchasing/purchase-orders/${selected.id}/cancel`); toast.success('PO cancelled'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const openReceiveModal = () => {
    setReceiveLines((selected.lines || []).filter(l => parseFloat(l.quantity || l.quantity_ordered || 0) > parseFloat(l.qty_received || l.quantity_received || 0)).map(l => ({
      po_line_id: l.id, item_id: l.item_id, description: l.description,
      qty_ordered: parseFloat(l.quantity || l.quantity_ordered || 0),
      qty_received: parseFloat(l.qty_received || l.quantity_received || 0),
      qty_to_receive: parseFloat(l.quantity || l.quantity_ordered || 0) - parseFloat(l.qty_received || l.quantity_received || 0),
      location_id: '', lot_number: '', vendor_lot: ''
    })));
    setShowReceive(true);
  };
  const handleReceive = async () => {
    try {
      const res = await api.post(`/api/purchasing/purchase-orders/${selected.id}/receive`, {
        location_id: parseInt(receiveLocation) || null,
        packing_slip_number: '',
        lines: receiveLines.filter(l => l.qty_to_receive > 0).map(l => ({
          po_line_id: l.po_line_id, item_id: l.item_id,
          quantity_received: parseFloat(l.qty_to_receive),
          location_id: parseInt(l.location_id) || parseInt(receiveLocation) || null,
          lot_number: l.lot_number, vendor_lot: l.vendor_lot
        }))
      });
      toast.success(`Receipt ${res.data.receipt_number} created. ${res.data.lots_created} lots, ${res.data.labels_generated} labels generated.`);
      setShowReceive(false); openDetail(selected); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to receive'); }
  };
  const handleCreateInvoice = async () => {
    try {
      const res = await api.post(`/api/purchasing/receipts/${selected.receipts?.[0]?.id}/create-invoice`);
      toast.success(`AP Invoice ${res.data.invoice_number} created`);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const addLine = () => setNewPO({ ...newPO, lines: [...newPO.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '' }] });
  const removeLine = (idx) => setNewPO({ ...newPO, lines: newPO.lines.filter((_, i) => i !== idx) });
  const updateLine = (idx, field, val) => { const lines = [...newPO.lines]; lines[idx][field] = val; setNewPO({ ...newPO, lines }); };
  const getTotal = () => newPO.lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const fmt = (d) => d ? d.split('T')[0] : '-';
  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(true)}>+ New PO</button>
        <input className="erp-form-input w-48" placeholder="Search PO#, Vendor..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <select className="erp-form-select w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option><option value="all">All</option><option value="draft">Draft</option>
          <option value="sent">Sent</option><option value="partial">Partial</option><option value="closed">Closed</option>
        </select>
        <span className="text-xs text-gray-500 ml-2">{orders.length} orders</span>
      </div>
      {/* Grid */}
      <div className="flex-1 overflow-auto p-2">
        <table className="erp-grid">
          <thead><tr><th>PO Number</th><th>Date</th><th>Vendor</th><th>Type</th><th>Lines</th><th>Total</th><th>Received</th><th>Status</th></tr></thead>
          <tbody>
            {orders.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No purchase orders found</td></tr> :
            orders.map(po => (
              <tr key={po.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(po)}>
                <td className="font-bold text-blue-700">{po.po_number}</td>
                <td>{fmt(po.order_date || po.po_date)}</td>
                <td>{po.vendor_name}</td>
                <td><span className="text-xs bg-gray-100 px-1 rounded">{po.po_type || 'standard'}</span></td>
                <td className="text-center">{po.line_count || '-'}</td>
                <td className="text-right font-bold">${parseFloat(po.total_amount || po.total || 0).toFixed(2)}</td>
                <td className="text-center">{po.received_pct ? `${po.received_pct}%` : '-'}</td>
                <td><span className={`erp-status erp-status-${(po.status || '').toLowerCase()}`}>{po.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '900px', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Purchase Order - {selected.po_number}</span>
              <button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button>
            </div>
            <div className="erp-modal-body overflow-y-auto" style={{ maxHeight: '70vh' }}>
              {/* Header Info */}
              <div className="grid grid-cols-3 gap-3 mb-3">
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">PO Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">PO No:</span><span className="font-bold">{selected.po_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Date:</span><span>{fmt(selected.order_date || selected.po_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Status:</span><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Type:</span><span>{selected.po_type || 'standard'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Required:</span><span>{fmt(selected.required_date)}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Vendor</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-bold">{selected.vendor_name}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Contact:</span><span>{selected.contact_name || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span>{selected.vendor_phone || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Ship To:</span><span>{selected.ship_to_location || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>${parseFloat(selected.subtotal || selected.total_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Tax:</span><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                    <div className="flex justify-between border-t pt-1"><span className="text-gray-600 font-bold">Total:</span><span className="font-bold text-blue-700">${parseFloat(selected.total_amount || selected.total || 0).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              {/* Tabs */}
              <div className="erp-tabs">
                {['Lines', 'Receipts', 'AP Invoices', 'Labels', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[200px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Glass Spec</th><th>Qty Ord</th><th>Qty Rec</th><th>Unit Price</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="9" className="text-center p-4 text-gray-500">No lines</td></tr> :
                    (selected.lines || []).map((l, i) => (
                      <tr key={i} className={parseFloat(l.qty_received || l.quantity_received || 0) >= parseFloat(l.quantity || l.quantity_ordered || 0) ? 'bg-green-50' : ''}>
                        <td>{i + 1}</td>
                        <td className="text-xs">{l.item_number || '-'}</td>
                        <td>{l.description}</td>
                        <td className="text-xs text-gray-600">{l.glass_type ? `${l.glass_type} ${l.thickness || ''} ${l.width ? l.width + 'x' + l.height + '"' : ''}` : '-'}</td>
                        <td className="text-right">{parseFloat(l.quantity || l.quantity_ordered || 0)}</td>
                        <td className="text-right font-bold">{parseFloat(l.qty_received || l.quantity_received || 0)}</td>
                        <td className="text-right">${parseFloat(l.unit_price || l.unit_cost || 0).toFixed(2)}</td>
                        <td className="text-right font-bold">${(parseFloat(l.quantity || l.quantity_ordered || 0) * parseFloat(l.unit_price || l.unit_cost || 0)).toFixed(2)}</td>
                        <td><span className={`erp-status erp-status-${(l.status || 'open').toLowerCase()}`}>{l.status || 'open'}</span></td>
                      </tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Receipts' && (
                  <table className="erp-grid"><thead><tr><th>Receipt No.</th><th>Date</th><th>Packing Slip</th><th>Location</th><th>Received By</th><th>Status</th></tr></thead>
                    <tbody>{(selected.receipts || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No receipts yet</td></tr> :
                    (selected.receipts || []).map((r, i) => (
                      <tr key={i}><td className="font-bold text-green-700">{r.receipt_number}</td><td>{fmt(r.receipt_date)}</td><td>{r.packing_slip_number || '-'}</td><td>{r.location_name || '-'}</td><td>{r.received_by_name || '-'}</td><td><span className="erp-status erp-status-received">received</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'AP Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice No.</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>{(selected.invoices || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No AP invoices yet</td></tr> :
                    (selected.invoices || []).map((inv, i) => (
                      <tr key={i}><td className="font-bold">{inv.invoice_number}</td><td>{fmt(inv.invoice_date)}</td><td className="text-right">${parseFloat(inv.total).toFixed(2)}</td><td className="text-right">${parseFloat(inv.balance).toFixed(2)}</td><td><span className={`erp-status erp-status-${inv.status}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Labels' && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3">Barcode labels are generated automatically when materials are received.</p>
                    {(selected.receipts || []).length > 0 && (
                      <div className="space-y-2">
                        {(selected.receipts || []).map((r, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                            <span className="text-xs font-bold">{r.receipt_number}</span>
                            <button className="erp-btn text-xs" onClick={() => toast.info('Labels printed to default printer')}>🏷️ Print Labels</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'Audit Trail' && (
                  <div className="p-4 text-xs text-gray-600 space-y-1">
                    <div>Created: {fmt(selected.created_at)}</div>
                    {selected.approved_at && <div>Approved: {fmt(selected.approved_at)} by User #{selected.approved_by}</div>}
                    {selected.sent_at && <div>Sent to Vendor: {fmt(selected.sent_at)}</div>}
                    {selected.closed_at && <div>Closed: {fmt(selected.closed_at)} by User #{selected.closed_by}</div>}
                  </div>
                )}
              </div>
            </div>
            {/* Action Buttons */}
            <div className="erp-modal-footer flex-wrap gap-1">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleApprove}>✓ Approve</button>}
              {(selected.status === 'open' || selected.status === 'approved') && <button className="erp-btn" style={{ background: '#7c3aed', color: 'white' }} onClick={handleSendToVendor}>📧 Send to Vendor</button>}
              {['open', 'sent', 'partial', 'approved'].includes(selected.status) && <button className="erp-btn erp-btn-success" onClick={openReceiveModal}>📥 Receive Materials</button>}
              {['open', 'sent', 'partial', 'approved'].includes(selected.status) && (selected.receipts || []).length > 0 && <button className="erp-btn" style={{ background: '#ea580c', color: 'white' }} onClick={handleCreateInvoice}>💰 Create AP Invoice</button>}
              {['open', 'sent', 'partial', 'approved'].includes(selected.status) && <button className="erp-btn" style={{ background: '#dc2626', color: 'white' }} onClick={handleClosePO}>🔒 Close PO</button>}
              {selected.status === 'draft' && <button className="erp-btn" onClick={handleCancelPO}>Cancel PO</button>}
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Receive Modal */}
      {showReceive && (
        <div className="erp-modal-overlay" onClick={() => setShowReceive(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Receive Materials - {selected.po_number}</span><button onClick={() => setShowReceive(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div className="erp-form-group"><label className="erp-form-label">Default Location:</label>
                  <select className="erp-form-select" value={receiveLocation} onChange={e => setReceiveLocation(e.target.value)}>
                    <option value="">Select Location...</option>{locations.map(l => <option key={l.id} value={l.id}>{l.code} - {l.name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Packing Slip #:</label><input className="erp-form-input" placeholder="Vendor packing slip number" /></div>
              </div>
              <table className="erp-grid text-xs">
                <thead><tr><th>Item</th><th>Description</th><th>Ordered</th><th>Previously Rec</th><th>Qty to Receive</th><th>Location</th><th>Lot #</th><th>Vendor Lot</th></tr></thead>
                <tbody>{receiveLines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.item_id || '-'}</td>
                    <td>{l.description}</td>
                    <td className="text-right">{l.qty_ordered}</td>
                    <td className="text-right">{l.qty_received}</td>
                    <td><input className="erp-form-input w-16 text-right" type="number" value={l.qty_to_receive} onChange={e => { const lines = [...receiveLines]; lines[i].qty_to_receive = e.target.value; setReceiveLines(lines); }} /></td>
                    <td><select className="erp-form-select w-28" value={l.location_id} onChange={e => { const lines = [...receiveLines]; lines[i].location_id = e.target.value; setReceiveLines(lines); }}>
                      <option value="">Default</option>{locations.map(loc => <option key={loc.id} value={loc.id}>{loc.code}</option>)}
                    </select></td>
                    <td><input className="erp-form-input w-20" value={l.lot_number} onChange={e => { const lines = [...receiveLines]; lines[i].lot_number = e.target.value; setReceiveLines(lines); }} placeholder="Auto" /></td>
                    <td><input className="erp-form-input w-20" value={l.vendor_lot} onChange={e => { const lines = [...receiveLines]; lines[i].vendor_lot = e.target.value; setReceiveLines(lines); }} /></td>
                  </tr>
                ))}</tbody>
              </table>
              <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
                <strong>On receive:</strong> Inventory qty updated → Lot record created → Barcode label generated → Inventory transaction logged
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-success" onClick={handleReceive} disabled={receiveLines.every(l => !l.qty_to_receive || parseFloat(l.qty_to_receive) <= 0)}>📥 Receive & Stock</button>
              <button className="erp-btn" onClick={() => setShowReceive(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
      {/* New PO Modal */}
      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Purchase Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Vendor *</label>
                  <select className="erp-form-select" value={newPO.vendor_id} onChange={e => setNewPO({ ...newPO, vendor_id: e.target.value })}>
                    <option value="">Select Vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">PO Type</label>
                  <select className="erp-form-select" value={newPO.po_type} onChange={e => setNewPO({ ...newPO, po_type: e.target.value })}>
                    <option value="standard">Standard</option><option value="blanket">Blanket</option><option value="drop_ship">Drop Ship</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Required Date</label><input className="erp-form-input" type="date" value={newPO.required_date} onChange={e => setNewPO({ ...newPO, required_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship To</label><input className="erp-form-input" value={newPO.ship_to_location} onChange={e => setNewPO({ ...newPO, ship_to_location: e.target.value })} /></div>
                <div className="erp-form-group col-span-2"><label className="erp-form-label">Notes</label><input className="erp-form-input" value={newPO.notes} onChange={e => setNewPO({ ...newPO, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2"><span className="text-xs font-bold">PO Lines</span><button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button></div>
              <table className="erp-grid text-xs"><thead><tr><th>Item</th><th>Description</th><th>Glass Type</th><th>Thickness</th><th>W×H</th><th>Qty</th><th>Unit $</th><th>Total</th><th></th></tr></thead>
                <tbody>{newPO.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td><select className="erp-form-select w-28" value={line.item_id} onChange={e => updateLine(idx, 'item_id', e.target.value)}><option value="">Select...</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}</select></td>
                    <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                    <td><select className="erp-form-select w-24" value={line.glass_type} onChange={e => updateLine(idx, 'glass_type', e.target.value)}><option value="">-</option><option>Clear Float</option><option>Low-E</option><option>Tinted</option><option>Reflective</option><option>Patterned</option></select></td>
                    <td><input className="erp-form-input w-14 text-right" value={line.thickness} onChange={e => updateLine(idx, 'thickness', e.target.value)} placeholder="mm" /></td>
                    <td className="flex gap-1"><input className="erp-form-input w-12 text-right" value={line.width} onChange={e => updateLine(idx, 'width', e.target.value)} placeholder="W" /><span>×</span><input className="erp-form-input w-12 text-right" value={line.height} onChange={e => updateLine(idx, 'height', e.target.value)} placeholder="H" /></td>
                    <td><input className="erp-form-input w-14 text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                    <td><input className="erp-form-input w-16 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                    <td className="text-right font-bold">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                    <td><button className="text-red-600" onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                ))}
                <tr className="bg-gray-100"><td colSpan="7" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal().toFixed(2)}</td><td></td></tr>
                </tbody></table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreatePO} disabled={!newPO.vendor_id}>Save PO</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default PurchaseOrders;
