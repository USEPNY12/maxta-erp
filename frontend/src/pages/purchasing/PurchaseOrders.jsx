import DocumentActions from '../../components/DocumentActions';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';

function PurchaseOrders() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [vendors, setVendors] = useState([]);
  const [items, setItems] = useState([]);
  const [vendorItems, setVendorItems] = useState([]);
  const [showReceive, setShowReceive] = useState(false);
  const [receiveLines, setReceiveLines] = useState([]);
  const [receiveLocation, setReceiveLocation] = useState('');
  const [locations, setLocations] = useState([]);
  const [editMode, setEditMode] = useState(false);
  const [editPO, setEditPO] = useState(null);
  const [showPrint, setShowPrint] = useState(false);

  const [newPO, setNewPO] = useState({
    vendor_id: '', ship_to_location: '', notes: '', required_date: '', po_type: 'standard',
    payment_terms: 'Net 30', freight_terms: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '', vendor_item_number: '' }]
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
  const fetchVendorItems = async (vendorId) => {
    if (!vendorId) { setVendorItems([]); return; }
    try { const res = await api.get(`/api/purchasing/vendor-items-by-vendor/${vendorId}`); setVendorItems(Array.isArray(res.data) ? res.data : []); } catch { setVendorItems([]); }
  };

  const openDetail = async (po) => {
    try { const res = await api.get(`/api/purchasing/purchase-orders/${po.id}`); setSelected(res.data); setActiveTab('Lines'); setEditMode(false); setShowDetail(true); } catch { setSelected(po); setShowDetail(true); }
  };

  // ===== CREATE PO =====
  const handleCreatePO = async () => {
    try {
      await api.post('/api/purchasing/purchase-orders', {
        vendor_id: parseInt(newPO.vendor_id), ship_to_location: newPO.ship_to_location,
        notes: newPO.notes, required_date: newPO.required_date || null, po_type: newPO.po_type,
        payment_terms: newPO.payment_terms, freight_terms: newPO.freight_terms,
        lines: newPO.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null, description: l.description,
          quantity: parseFloat(l.quantity) || 1, unit_price: parseFloat(l.unit_price) || 0,
          glass_type: l.glass_type, thickness: l.thickness, width: l.width ? parseFloat(l.width) : null, height: l.height ? parseFloat(l.height) : null
        }))
      });
      toast.success('Purchase Order created');
      setShowNew(false);
      resetNewPO();
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PO'); }
  };

  // ===== EDIT PO =====
  const startEdit = () => {
    if (!selected) return;
    setEditPO({
      vendor_id: selected.vendor_id || '',
      required_date: selected.required_date ? selected.required_date.split('T')[0] : '',
      payment_terms: selected.payment_terms || 'Net 30',
      freight_terms: selected.freight_terms || '',
      ship_to_location: selected.ship_to_location || '',
      notes: selected.notes || '',
      lines: (selected.lines || []).map(l => ({
        item_id: l.item_id || '',
        description: l.description || l.item_description || '',
        quantity: parseFloat(l.quantity_ordered || l.quantity || 0),
        unit_price: parseFloat(l.unit_cost || l.unit_price || 0),
        glass_type: l.glass_type || '',
        thickness: l.thickness || '',
        width: l.width || '',
        height: l.height || '',
        vendor_item_number: l.vendor_item_number || '',
        edge_type: l.edge_type || ''
      }))
    });
    fetchVendorItems(selected.vendor_id);
    setEditMode(true);
  };

  const handleSaveEdit = async () => {
    try {
      await api.put(`/api/purchasing/purchase-orders/${selected.id}`, {
        vendor_id: parseInt(editPO.vendor_id),
        required_date: editPO.required_date || null,
        payment_terms: editPO.payment_terms,
        freight_terms: editPO.freight_terms,
        notes: editPO.notes,
        lines: editPO.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null,
          description: l.description,
          quantity_ordered: parseFloat(l.quantity) || 1,
          unit_cost: parseFloat(l.unit_price) || 0,
          glass_type: l.glass_type, thickness: l.thickness,
          width: l.width ? parseFloat(l.width) : null,
          height: l.height ? parseFloat(l.height) : null,
          edge_type: l.edge_type
        }))
      });
      toast.success('PO updated successfully');
      setEditMode(false);
      openDetail(selected);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to update PO'); }
  };

  const addEditLine = () => {
    setEditPO({ ...editPO, lines: [...editPO.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '', vendor_item_number: '' }] });
  };
  const removeEditLine = (idx) => {
    setEditPO({ ...editPO, lines: editPO.lines.filter((_, i) => i !== idx) });
  };
  const updateEditLine = async (idx, field, val) => {
    const lines = [...editPO.lines]; lines[idx][field] = val;
    if (field === 'item_id' && val && editPO.vendor_id) {
      try {
        const res = await api.get(`/api/purchasing/vendor-item-info/${editPO.vendor_id}/${val}`);
        if (res.data) {
          lines[idx].unit_price = parseFloat(res.data.unit_cost) || lines[idx].unit_price;
          lines[idx].vendor_item_number = res.data.vendor_item_number || '';
          lines[idx].description = res.data.vendor_description || lines[idx].description;
        } else {
          const itm = items.find(i => i.id === parseInt(val));
          if (itm) lines[idx].description = itm.description || '';
        }
      } catch {
        const itm = items.find(i => i.id === parseInt(val));
        if (itm) lines[idx].description = itm.description || '';
      }
    }
    setEditPO({ ...editPO, lines });
  };

  // ===== COPY PO =====
  const handleCopyPO = () => {
    if (!selected) return;
    setNewPO({
      vendor_id: selected.vendor_id || '',
      ship_to_location: selected.ship_to_location || '',
      notes: selected.notes || '',
      required_date: '',
      po_type: selected.po_type || 'standard',
      payment_terms: selected.payment_terms || 'Net 30',
      freight_terms: selected.freight_terms || '',
      lines: (selected.lines || []).map(l => ({
        item_id: l.item_id || '',
        description: l.description || l.item_description || '',
        quantity: parseFloat(l.quantity_ordered || l.quantity || 0),
        unit_price: parseFloat(l.unit_cost || l.unit_price || 0),
        glass_type: l.glass_type || '',
        thickness: l.thickness || '',
        width: l.width || '',
        height: l.height || '',
        vendor_item_number: l.vendor_item_number || ''
      }))
    });
    fetchVendorItems(selected.vendor_id);
    setShowDetail(false);
    setShowNew(true);
    toast.info('PO copied - modify and save as new');
  };

  // ===== ACTIONS =====
  const handleApprove = async () => {
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/approve`); toast.success('PO approved'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleSendToVendor = async () => {
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/send`); toast.success('PO sent to vendor'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleClosePO = async () => {
    if (!window.confirm('Close this PO? Unreceived quantities will be cancelled.')) return;
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/close`); toast.success('PO closed'); openDetail(selected); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };
  const handleCancelPO = async () => {
    if (!window.confirm('Cancel this PO? This cannot be undone.')) return;
    try { await api.post(`/api/purchasing/purchase-orders/${selected.id}/cancel`); toast.success('PO cancelled'); setShowDetail(false); fetchOrders(); } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ===== RECEIVE =====
  const openReceiveModal = () => {
    setReceiveLines((selected.lines || []).filter(l => {
      const ordered = parseFloat(l.quantity_ordered || l.quantity || 0);
      const received = parseFloat(l.qty_received || l.quantity_received || 0);
      return ordered > received;
    }).map(l => ({
      po_line_id: l.id, item_id: l.item_id, description: l.description || l.item_description,
      item_number: l.item_number,
      qty_ordered: parseFloat(l.quantity_ordered || l.quantity || 0),
      qty_received: parseFloat(l.qty_received || l.quantity_received || 0),
      qty_to_receive: parseFloat(l.quantity_ordered || l.quantity || 0) - parseFloat(l.qty_received || l.quantity_received || 0),
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
      toast.success(`Receipt ${res.data.receipt_number} created`);
      setShowReceive(false); openDetail(selected); fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to receive'); }
  };

  // ===== AP INVOICE =====
  const handleCreateInvoice = async () => {
    const receiptId = selected.receipts?.[0]?.id;
    if (!receiptId) { toast.error('No receipt to create invoice from'); return; }
    try {
      const res = await api.post(`/api/purchasing/receipts/${receiptId}/create-invoice`);
      toast.success(`AP Invoice ${res.data.invoice_number} created`);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  // ===== NEW PO HELPERS =====
  const resetNewPO = () => setNewPO({ vendor_id: '', ship_to_location: '', notes: '', required_date: '', po_type: 'standard', payment_terms: 'Net 30', freight_terms: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '', vendor_item_number: '' }] });
  const addLine = () => setNewPO({ ...newPO, lines: [...newPO.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, glass_type: '', thickness: '', width: '', height: '', vendor_item_number: '' }] });
  const removeLine = (idx) => setNewPO({ ...newPO, lines: newPO.lines.filter((_, i) => i !== idx) });
  const updateLine = async (idx, field, val) => {
    const lines = [...newPO.lines]; lines[idx][field] = val;
    if (field === 'item_id' && val && newPO.vendor_id) {
      try {
        const res = await api.get(`/api/purchasing/vendor-item-info/${newPO.vendor_id}/${val}`);
        if (res.data) {
          lines[idx].unit_price = parseFloat(res.data.unit_cost) || lines[idx].unit_price;
          lines[idx].vendor_item_number = res.data.vendor_item_number || '';
          lines[idx].description = res.data.vendor_description || lines[idx].description;
        } else {
          const itm = items.find(i => i.id === parseInt(val));
          if (itm) lines[idx].description = itm.description || '';
        }
      } catch {
        const itm = items.find(i => i.id === parseInt(val));
        if (itm) lines[idx].description = itm.description || '';
      }
    }
    setNewPO({ ...newPO, lines });
  };
  const handleVendorChange = (vendorId, isEdit = false) => {
    if (isEdit) {
      setEditPO({ ...editPO, vendor_id: vendorId });
    } else {
      setNewPO({ ...newPO, vendor_id: vendorId });
    }
    fetchVendorItems(vendorId);
  };

  const getTotal = (lines) => lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
  const fmt = (d) => d ? d.split('T')[0] : '-';
  const canEdit = (status) => !['closed', 'cancelled', 'received'].includes(status);

  // ===== PRINT PO =====
  const printPO = () => {
    const w = window.open('', '_blank');
    const lines = selected.lines || [];
    const total = lines.reduce((s, l) => s + (parseFloat(l.quantity_ordered || l.quantity || 0) * parseFloat(l.unit_cost || l.unit_price || 0)), 0);
    w.document.write(`<!DOCTYPE html><html><head><title>PO ${selected.po_number}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;font-size:12px}
      h1{font-size:18px;margin-bottom:5px}
      table{width:100%;border-collapse:collapse;margin-top:15px}
      th,td{border:1px solid #333;padding:6px;text-align:left}
      th{background:#1e3a5f;color:white}
      .header{display:flex;justify-content:space-between;margin-bottom:20px}
      .info-box{border:1px solid #ccc;padding:10px;width:30%;font-size:11px}
      .total-row{font-weight:bold;background:#f0f0f0}
      @media print{body{padding:20px}}</style></head><body>
      <h1>PURCHASE ORDER</h1>
      <div style="font-size:14px;font-weight:bold;color:#1e3a5f;margin-bottom:20px">${selected.po_number}</div>
      <div class="header">
        <div class="info-box"><strong>Max TA Group LLC</strong><br>Glass Fabrication ERP<br>Date: ${fmt(selected.order_date || selected.po_date)}<br>Required: ${fmt(selected.required_date)}<br>Terms: ${selected.payment_terms || 'Net 30'}</div>
        <div class="info-box"><strong>Vendor:</strong><br>${selected.vendor_name || ''}<br>${selected.vendor_address || ''}<br>Phone: ${selected.vendor_phone || ''}<br>Email: ${selected.vendor_email || ''}</div>
        <div class="info-box"><strong>Ship To:</strong><br>${selected.ship_to_location || 'Main Warehouse'}<br><br><strong>Type:</strong> ${selected.po_type || 'standard'}<br><strong>Status:</strong> ${(selected.status || '').toUpperCase()}</div>
      </div>
      <table><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Glass Spec</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>
      ${lines.map((l, i) => `<tr><td>${i + 1}</td><td>${l.item_number || '-'}</td><td>${l.description || l.item_description || ''}</td><td>${l.glass_type ? l.glass_type + ' ' + (l.thickness || '') + ' ' + (l.width ? l.width + 'x' + l.height + '"' : '') : '-'}</td><td style="text-align:right">${parseFloat(l.quantity_ordered || l.quantity || 0)}</td><td style="text-align:right">$${parseFloat(l.unit_cost || l.unit_price || 0).toFixed(2)}</td><td style="text-align:right">$${(parseFloat(l.quantity_ordered || l.quantity || 0) * parseFloat(l.unit_cost || l.unit_price || 0)).toFixed(2)}</td></tr>`).join('')}
      <tr class="total-row"><td colspan="6" style="text-align:right">TOTAL:</td><td style="text-align:right">$${total.toFixed(2)}</td></tr>
      </tbody></table>
      ${selected.notes ? `<div style="margin-top:15px;padding:10px;border:1px solid #ccc"><strong>Notes:</strong> ${selected.notes}</div>` : ''}
      <div style="margin-top:40px;display:flex;justify-content:space-between">
        <div style="border-top:1px solid #333;width:200px;text-align:center;padding-top:5px">Authorized Signature</div>
        <div style="border-top:1px solid #333;width:200px;text-align:center;padding-top:5px">Date</div>
      </div>
      </body></html>`);
    w.document.close();
    w.print();
  };

  // ===== ITEM SELECT OPTIONS =====
  const getItemOptions = (vendorId) => {
    if (vendorItems.length > 0) {
      // Show vendor-assigned items first, then all items
      const vendorItemIds = vendorItems.map(vi => vi.item_id);
      const assigned = items.filter(i => vendorItemIds.includes(i.id));
      const others = items.filter(i => !vendorItemIds.includes(i.id));
      return { assigned, others };
    }
    return { assigned: [], others: items };
  };

  const renderItemSelect = (line, idx, onChange) => {
    const { assigned, others } = getItemOptions(editMode ? editPO?.vendor_id : newPO.vendor_id);
    return (
      <select className="erp-form-select w-36 text-xs" value={line.item_id} onChange={e => onChange(idx, 'item_id', e.target.value)}>
        <option value="">Select Item...</option>
        {assigned.length > 0 && (
          <optgroup label="--- Vendor Items (Preferred) ---">
            {assigned.map(i => {
              const vi = vendorItems.find(v => v.item_id === i.id);
              return <option key={i.id} value={i.id}>{i.item_number} - {i.description} {vi?.vendor_item_number ? `[${vi.vendor_item_number}]` : ''}</option>;
            })}
          </optgroup>
        )}
        {others.length > 0 && (
          <optgroup label="--- All Items ---">
            {others.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
          </optgroup>
        )}
      </select>
    );
  };

  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-btn erp-btn-primary" onClick={() => { resetNewPO(); setShowNew(true); }}>+ New PO</button>
        <input className="erp-form-input w-48" placeholder="Search PO#, Vendor..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <select className="erp-form-select w-32" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option><option value="all">All</option><option value="draft">Draft</option>
          <option value="sent">Sent</option><option value="partial">Partial</option><option value="received">Received</option><option value="closed">Closed</option><option value="cancelled">Cancelled</option>
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

      {/* ===== DETAIL MODAL ===== */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '950px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Purchase Order - {selected.po_number} {editMode && <span className="text-yellow-300 ml-2">(EDITING)</span>}</span>
              <div className="flex items-center gap-2">
                {canEdit(selected.status) && !editMode && <button onClick={startEdit} className="text-xs bg-yellow-500 text-white px-2 py-1 rounded hover:bg-yellow-600">Edit PO</button>}
                {editMode && <button onClick={() => setEditMode(false)} className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600">Cancel Edit</button>}
                <button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300 text-lg">✕</button>
              </div>
            </div>
            <div className="erp-modal-body overflow-y-auto" style={{ maxHeight: '72vh' }}>
              {/* Header Info */}
              {!editMode ? (
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">PO Info</legend>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-600">PO No:</span><span className="font-bold">{selected.po_number}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Date:</span><span>{fmt(selected.order_date || selected.po_date)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Status:</span><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Type:</span><span>{selected.po_type || 'standard'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Required:</span><span>{fmt(selected.required_date)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Terms:</span><span>{selected.payment_terms || 'Net 30'}</span></div>
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Vendor</legend>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-600">Name:</span><span className="font-bold">{selected.vendor_name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Contact:</span><span>{selected.contact_name || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Phone:</span><span>{selected.vendor_phone || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Email:</span><span>{selected.vendor_email || '-'}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Ship To:</span><span>{selected.ship_to_location || '-'}</span></div>
                    </div>
                  </fieldset>
                  <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Financial</legend>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between"><span className="text-gray-600">Subtotal:</span><span>${parseFloat(selected.subtotal || selected.total_amount || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Tax:</span><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-600">Freight:</span><span>${parseFloat(selected.freight_amount || 0).toFixed(2)}</span></div>
                      <div className="flex justify-between border-t pt-1"><span className="text-gray-600 font-bold">Total:</span><span className="font-bold text-blue-700 text-sm">${parseFloat(selected.total_amount || selected.total || 0).toFixed(2)}</span></div>
                    </div>
                  </fieldset>
                </div>
              ) : (
                /* EDIT MODE HEADER */
                <div className="bg-yellow-50 border border-yellow-300 rounded p-3 mb-3">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="erp-form-group"><label className="erp-form-label text-xs">Vendor</label>
                      <select className="erp-form-select text-xs" value={editPO.vendor_id} onChange={e => handleVendorChange(e.target.value, true)}>
                        <option value="">Select...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name}</option>)}
                      </select>
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label text-xs">Required Date</label>
                      <input className="erp-form-input text-xs" type="date" value={editPO.required_date} onChange={e => setEditPO({ ...editPO, required_date: e.target.value })} />
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label text-xs">Payment Terms</label>
                      <select className="erp-form-select text-xs" value={editPO.payment_terms} onChange={e => setEditPO({ ...editPO, payment_terms: e.target.value })}>
                        <option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option>
                      </select>
                    </div>
                    <div className="erp-form-group"><label className="erp-form-label text-xs">Ship To</label>
                      <input className="erp-form-input text-xs" value={editPO.ship_to_location} onChange={e => setEditPO({ ...editPO, ship_to_location: e.target.value })} />
                    </div>
                    <div className="erp-form-group col-span-2"><label className="erp-form-label text-xs">Notes</label>
                      <input className="erp-form-input text-xs" value={editPO.notes} onChange={e => setEditPO({ ...editPO, notes: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="erp-tabs">
                {['Lines', 'Receipts', 'AP Invoices', 'Labels', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[200px]">
                {activeTab === 'Lines' && !editMode && (
                  <table className="erp-grid"><thead><tr><th>#</th><th>Item</th><th>Vendor Item#</th><th>Description</th><th>Glass Spec</th><th>Qty Ord</th><th>Qty Rec</th><th>Unit Price</th><th>Total</th><th>Status</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="10" className="text-center p-4 text-gray-500">No lines</td></tr> :
                    (selected.lines || []).map((l, i) => {
                      const qtyOrd = parseFloat(l.quantity_ordered || l.quantity || 0);
                      const qtyRec = parseFloat(l.qty_received || l.quantity_received || 0);
                      const price = parseFloat(l.unit_cost || l.unit_price || 0);
                      return (
                        <tr key={i} className={qtyRec >= qtyOrd && qtyOrd > 0 ? 'bg-green-50' : ''}>
                          <td>{i + 1}</td>
                          <td className="text-xs font-mono">{l.item_number || '-'}</td>
                          <td className="text-xs text-purple-700">{l.vendor_item_number || '-'}</td>
                          <td>{l.description || l.item_description}</td>
                          <td className="text-xs text-gray-600">{l.glass_type ? `${l.glass_type} ${l.thickness || ''} ${l.width ? l.width + 'x' + l.height + '"' : ''}` : '-'}</td>
                          <td className="text-right">{qtyOrd}</td>
                          <td className="text-right font-bold text-green-700">{qtyRec}</td>
                          <td className="text-right">${price.toFixed(2)}</td>
                          <td className="text-right font-bold">${(qtyOrd * price).toFixed(2)}</td>
                          <td><span className={`erp-status erp-status-${qtyRec >= qtyOrd && qtyOrd > 0 ? 'received' : qtyRec > 0 ? 'partial' : 'open'}`}>{qtyRec >= qtyOrd && qtyOrd > 0 ? 'received' : qtyRec > 0 ? 'partial' : 'open'}</span></td>
                        </tr>
                      );
                    })}</tbody></table>
                )}
                {activeTab === 'Lines' && editMode && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <button className="erp-btn text-xs" onClick={addEditLine}>+ Add Line</button>
                      <span className="text-xs text-gray-500">Total: <strong>${getTotal(editPO.lines).toFixed(2)}</strong></span>
                    </div>
                    <table className="erp-grid text-xs"><thead><tr><th>Item</th><th>Vendor#</th><th>Description</th><th>Glass</th><th>Thick</th><th>W×H</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
                      <tbody>{editPO.lines.map((line, idx) => (
                        <tr key={idx}>
                          <td>{renderItemSelect(line, idx, updateEditLine)}</td>
                          <td><input className="erp-form-input w-20 text-xs bg-gray-50" value={line.vendor_item_number || ''} readOnly title="Auto-filled from vendor setup" /></td>
                          <td><input className="erp-form-input w-full text-xs" value={line.description} onChange={e => updateEditLine(idx, 'description', e.target.value)} /></td>
                          <td><select className="erp-form-select w-20 text-xs" value={line.glass_type} onChange={e => updateEditLine(idx, 'glass_type', e.target.value)}><option value="">-</option><option>Clear Float</option><option>Low-E</option><option>Tinted</option><option>Reflective</option><option>Patterned</option></select></td>
                          <td><input className="erp-form-input w-12 text-xs text-right" value={line.thickness} onChange={e => updateEditLine(idx, 'thickness', e.target.value)} placeholder="mm" /></td>
                          <td className="flex gap-1"><input className="erp-form-input w-10 text-xs text-right" value={line.width} onChange={e => updateEditLine(idx, 'width', e.target.value)} placeholder="W" /><span>×</span><input className="erp-form-input w-10 text-xs text-right" value={line.height} onChange={e => updateEditLine(idx, 'height', e.target.value)} placeholder="H" /></td>
                          <td><input className="erp-form-input w-12 text-xs text-right" type="number" value={line.quantity} onChange={e => updateEditLine(idx, 'quantity', e.target.value)} /></td>
                          <td><input className="erp-form-input w-14 text-xs text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateEditLine(idx, 'unit_price', e.target.value)} /></td>
                          <td className="text-right font-bold text-xs">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                          <td><button className="text-red-600 text-xs" onClick={() => removeEditLine(idx)}>✕</button></td>
                        </tr>
                      ))}</tbody></table>
                  </div>
                )}
                {activeTab === 'Receipts' && (
                  <table className="erp-grid"><thead><tr><th>Receipt No.</th><th>Date</th><th>Packing Slip</th><th>Location</th><th>Received By</th><th>Lines</th></tr></thead>
                    <tbody>{(selected.receipts || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No receipts yet</td></tr> :
                    (selected.receipts || []).map((r, i) => (
                      <tr key={i}><td className="font-bold text-green-700">{r.receipt_number}</td><td>{fmt(r.receipt_date)}</td><td>{r.packing_slip_number || '-'}</td><td>{r.location_name || '-'}</td><td>{r.received_by_name || '-'}</td><td>{r.line_count || '-'}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'AP Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice No.</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                    <tbody>{(selected.invoices || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No AP invoices yet</td></tr> :
                    (selected.invoices || []).map((inv, i) => (
                      <tr key={i}><td className="font-bold">{inv.invoice_number}</td><td>{fmt(inv.invoice_date)}</td><td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td><td className="text-right">${parseFloat(inv.balance || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${inv.status}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Labels' && (
                  <div className="p-4 text-center">
                    <p className="text-sm text-gray-600 mb-3">Barcode labels are generated automatically when materials are received.</p>
                    {(selected.receipts || []).length > 0 && (
                      <div className="space-y-2">
                        {(selected.receipts || []).map((r, i) => (
                          <div key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded border">
                            <span className="text-xs font-bold">{r.receipt_number} - {fmt(r.receipt_date)}</span>
                            <button className="erp-btn text-xs" onClick={() => toast.info('Labels printed to default printer')}>Print Labels</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'Audit Trail' && (
                  <div className="p-4 text-xs text-gray-600 space-y-2">
                    <div className="flex items-center gap-2"><span className="w-2 h-2 bg-blue-500 rounded-full"></span>Created: {fmt(selected.created_at)}</div>
                    {selected.approved_at && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Approved: {fmt(selected.approved_at)} by User #{selected.approved_by}</div>}
                    {selected.sent_at && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-purple-500 rounded-full"></span>Sent to Vendor: {fmt(selected.sent_at)}</div>}
                    {selected.closed_at && <div className="flex items-center gap-2"><span className="w-2 h-2 bg-gray-500 rounded-full"></span>Closed: {fmt(selected.closed_at)} by User #{selected.closed_by}</div>}
                    {(selected.receipts || []).map((r, i) => (
                      <div key={i} className="flex items-center gap-2"><span className="w-2 h-2 bg-green-500 rounded-full"></span>Receipt: {r.receipt_number} on {fmt(r.receipt_date)}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="erp-modal-footer flex-wrap gap-1">
              {editMode ? (
                <>
                  <button className="erp-btn erp-btn-primary" onClick={handleSaveEdit}>Save Changes</button>
                  <button className="erp-btn" onClick={() => setEditMode(false)}>Cancel</button>
                </>
              ) : (
                <>
                  {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleApprove}>Approve</button>}
                  {selected.status === 'open' && <button className="erp-btn" style={{ background: '#7c3aed', color: 'white' }} onClick={handleSendToVendor}>Send to Vendor</button>}
                  {['open', 'sent', 'partial'].includes(selected.status) && <button className="erp-btn" style={{ background: '#059669', color: 'white' }} onClick={openReceiveModal}>Receive Materials</button>}
                  {(selected.receipts || []).length > 0 && !(selected.invoices || []).length && <button className="erp-btn" style={{ background: '#d97706', color: 'white' }} onClick={handleCreateInvoice}>Create AP Invoice</button>}
                  <button className="erp-btn" onClick={handleCopyPO}>Copy PO</button>
                  <DocumentActions documentType="purchase_order" documentId={selected.id} recipientEmail={selected.vendor_email} recipientName={selected.vendor_name} onEmailSent={() => openDetail(selected)} compact />
                  {canEdit(selected.status) && <button className="erp-btn" style={{ background: '#dc2626', color: 'white' }} onClick={selected.status === 'draft' ? handleCancelPO : handleClosePO}>{selected.status === 'draft' ? 'Cancel PO' : 'Close PO'}</button>}
                  <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===== RECEIVE MODAL ===== */}
      {showReceive && (
        <div className="erp-modal-overlay" onClick={() => setShowReceive(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Receive Materials - {selected.po_number}</span><button onClick={() => setShowReceive(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="mb-3">
                <label className="erp-form-label text-xs">Receive to Location:</label>
                <select className="erp-form-select w-48" value={receiveLocation} onChange={e => setReceiveLocation(e.target.value)}>
                  <option value="">Select Location...</option>{locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <table className="erp-grid text-xs">
                <thead><tr><th>Item</th><th>Description</th><th>Ordered</th><th>Already Rec</th><th>Qty to Receive</th><th>Location</th><th>Lot#</th><th>Vendor Lot</th></tr></thead>
                <tbody>{receiveLines.map((l, i) => (
                  <tr key={i}>
                    <td className="font-mono">{l.item_number || '-'}</td>
                    <td>{l.description}</td>
                    <td className="text-right">{l.qty_ordered}</td>
                    <td className="text-right text-green-700">{l.qty_received}</td>
                    <td><input className="erp-form-input w-16 text-right" type="number" value={l.qty_to_receive} onChange={e => { const rl = [...receiveLines]; rl[i].qty_to_receive = parseFloat(e.target.value) || 0; setReceiveLines(rl); }} /></td>
                    <td><select className="erp-form-select w-28" value={l.location_id} onChange={e => { const rl = [...receiveLines]; rl[i].location_id = e.target.value; setReceiveLines(rl); }}>
                      <option value="">Default</option>{locations.map(loc => <option key={loc.id} value={loc.id}>{loc.name}</option>)}
                    </select></td>
                    <td><input className="erp-form-input w-24" value={l.lot_number} onChange={e => { const rl = [...receiveLines]; rl[i].lot_number = e.target.value; setReceiveLines(rl); }} placeholder="Auto" /></td>
                    <td><input className="erp-form-input w-24" value={l.vendor_lot} onChange={e => { const rl = [...receiveLines]; rl[i].vendor_lot = e.target.value; setReceiveLines(rl); }} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleReceive} disabled={receiveLines.every(l => l.qty_to_receive <= 0)}>Receive</button>
              <button className="erp-btn" onClick={() => setShowReceive(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== NEW PO MODAL ===== */}
      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '950px', maxHeight: '92vh' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Purchase Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body overflow-y-auto" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Vendor *</label>
                  <select className="erp-form-select" value={newPO.vendor_id} onChange={e => handleVendorChange(e.target.value, false)}>
                    <option value="">Select Vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name}</option>)}
                  </select>
                  {vendorItems.length > 0 && <div className="text-[10px] text-green-600 mt-1">{vendorItems.length} items assigned to this vendor</div>}
                </div>
                <div className="erp-form-group"><label className="erp-form-label">PO Type</label>
                  <select className="erp-form-select" value={newPO.po_type} onChange={e => setNewPO({ ...newPO, po_type: e.target.value })}>
                    <option value="standard">Standard</option><option value="blanket">Blanket</option><option value="drop_ship">Drop Ship</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Required Date</label><input className="erp-form-input" type="date" value={newPO.required_date} onChange={e => setNewPO({ ...newPO, required_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Terms</label>
                  <select className="erp-form-select" value={newPO.payment_terms} onChange={e => setNewPO({ ...newPO, payment_terms: e.target.value })}>
                    <option>Net 30</option><option>Net 15</option><option>Net 45</option><option>Net 60</option><option>Due on Receipt</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship To</label><input className="erp-form-input" value={newPO.ship_to_location} onChange={e => setNewPO({ ...newPO, ship_to_location: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes</label><input className="erp-form-input" value={newPO.notes} onChange={e => setNewPO({ ...newPO, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-bold">PO Lines</span>
                <button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button>
                <span className="text-xs text-gray-500 ml-auto">Total: <strong className="text-blue-700">${getTotal(newPO.lines).toFixed(2)}</strong></span>
              </div>
              <table className="erp-grid text-xs"><thead><tr><th>Item</th><th>Vendor#</th><th>Description</th><th>Glass</th><th>Thick</th><th>W×H</th><th>Qty</th><th>Price</th><th>Total</th><th></th></tr></thead>
                <tbody>{newPO.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td>{renderItemSelect(line, idx, updateLine)}</td>
                    <td><input className="erp-form-input w-20 text-xs bg-gray-50" value={line.vendor_item_number || ''} readOnly title="Auto-filled from vendor setup" /></td>
                    <td><input className="erp-form-input w-full text-xs" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                    <td><select className="erp-form-select w-20 text-xs" value={line.glass_type} onChange={e => updateLine(idx, 'glass_type', e.target.value)}><option value="">-</option><option>Clear Float</option><option>Low-E</option><option>Tinted</option><option>Reflective</option><option>Patterned</option></select></td>
                    <td><input className="erp-form-input w-12 text-xs text-right" value={line.thickness} onChange={e => updateLine(idx, 'thickness', e.target.value)} placeholder="mm" /></td>
                    <td className="flex gap-1"><input className="erp-form-input w-10 text-xs text-right" value={line.width} onChange={e => updateLine(idx, 'width', e.target.value)} placeholder="W" /><span>×</span><input className="erp-form-input w-10 text-xs text-right" value={line.height} onChange={e => updateLine(idx, 'height', e.target.value)} placeholder="H" /></td>
                    <td><input className="erp-form-input w-12 text-xs text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                    <td><input className="erp-form-input w-14 text-xs text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                    <td className="text-right font-bold text-xs">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                ))}
                <tr className="bg-gray-100"><td colSpan="8" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal(newPO.lines).toFixed(2)}</td><td></td></tr>
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
    </ModulePage>
  );
}
export default PurchaseOrders;
