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
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [newPO, setNewPO] = useState({
    vendor_id: '', ship_to_location: '', notes: '', required_date: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0 }]
  });

  useEffect(() => { fetchOrders(); fetchVendors(); fetchItems(); }, [statusFilter]);

  const fetchOrders = async () => {
    try { const res = await api.get('/api/purchasing/purchase-orders', { params: { search, status: statusFilter } }); setOrders(Array.isArray(res.data) ? res.data : res.data.orders || []); } catch { setOrders([]); }
  };

  const fetchVendors = async () => {
    try { const res = await api.get('/api/purchasing/vendors'); setVendors(Array.isArray(res.data) ? res.data : []); } catch { setVendors([]); }
  };

  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };

  const openDetail = async (po) => {
    try { const res = await api.get(`/api/purchasing/purchase-orders/${po.id}`); setSelected(res.data); setActiveTab('Lines'); setShowDetail(true); } catch { setSelected(po); setShowDetail(true); }
  };

  const handleCreatePO = async () => {
    try {
      await api.post('/api/purchasing/purchase-orders', {
        vendor_id: parseInt(newPO.vendor_id),
        ship_to_location: newPO.ship_to_location,
        notes: newPO.notes,
        required_date: newPO.required_date || null,
        lines: newPO.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0
        }))
      });
      toast.success('Purchase Order created');
      setShowNew(false);
      setNewPO({ vendor_id: '', ship_to_location: '', notes: '', required_date: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0 }] });
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create PO'); }
  };

  const handleApprovePO = async () => {
    try {
      await api.put(`/api/purchasing/purchase-orders/${selected.id}/approve`);
      toast.success('PO approved');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to approve PO'); }
  };

  const handleEmailPO = async () => {
    try {
      await api.post('/api/email/send', { document_type: 'purchase_order', document_id: selected.id, to_email: emailTo, subject: `Purchase Order ${selected.po_number}` });
      toast.success('PO emailed to vendor');
      setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send email'); }
  };

  const handleReceivePO = async () => {
    try {
      const lines = (selected.lines || []).map(l => ({
        po_line_id: l.id, item_id: l.item_id,
        quantity_received: l.quantity - (l.qty_received || 0)
      })).filter(l => l.quantity_received > 0);
      if (lines.length === 0) { toast.warning('Nothing to receive'); return; }
      await api.post('/api/purchasing/receipts', { purchase_order_id: selected.id, received_date: new Date().toISOString().split('T')[0], lines });
      toast.success('PO Receipt created');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create receipt'); }
  };

  const addLine = () => setNewPO({ ...newPO, lines: [...newPO.lines, { item_id: '', description: '', quantity: 1, unit_price: 0 }] });
  const updateLine = (idx, field, value) => {
    const lines = [...newPO.lines]; lines[idx] = { ...lines[idx], [field]: value };
    if (field === 'item_id' && value) { const item = items.find(i => i.id === parseInt(value)); if (item) { lines[idx].description = item.description; lines[idx].unit_price = item.standard_cost || item.unit_cost || 0; } }
    setNewPO({ ...newPO, lines });
  };
  const removeLine = (idx) => { const lines = newPO.lines.filter((_, i) => i !== idx); setNewPO({ ...newPO, lines: lines.length ? lines : [{ item_id: '', description: '', quantity: 1, unit_price: 0 }] }); };
  const getTotal = () => newPO.lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New PO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchOrders}>↻ Refresh</button>
        <button className="erp-toolbar-btn" disabled={!selected || selected?.status !== 'draft'} onClick={handleApprovePO}>✓ Approve</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) { setEmailTo(selected.vendor_email || ''); setShowEmailDialog(true); } }}>✉ Email to Vendor</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <button className="erp-toolbar-btn" disabled={!selected || !['open', 'approved', 'partial'].includes(selected?.status)} onClick={handleReceivePO}>📦 Receive</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchOrders}>Find</button>
        <div className="ml-auto text-xs">View:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="open">All Open</option><option value="">All</option><option value="draft">Draft</option><option value="received">Received</option><option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>PO Number</th><th>Date</th><th>Vendor</th><th>Required Date</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {orders.length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No purchase orders found</td></tr> : orders.map(po => (
              <tr key={po.id} className={`cursor-pointer ${selected?.id === po.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(po)}>
                <td className="text-blue-700 font-bold">{po.po_number}</td>
                <td>{po.order_date?.split('T')[0] || po.po_date?.split('T')[0]}</td>
                <td>{po.vendor_name}</td>
                <td>{po.required_date?.split('T')[0] || '-'}</td>
                <td className="text-right">${parseFloat(po.total_amount || po.total || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${(po.status || '').toLowerCase()}`}>{po.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Purchase Order - {selected.po_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">PO Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">PO No:</label><span className="font-bold">{selected.po_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Date:</label><span>{selected.order_date?.split('T')[0] || selected.po_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Required:</label><span>{selected.required_date?.split('T')[0] || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Vendor</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Name:</label><span>{selected.vendor_name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Contact:</label><span>{selected.contact_name || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Ship To:</label><span>{selected.ship_to_location || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3"><legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Subtotal:</label><span>${parseFloat(selected.subtotal || selected.total_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Tax:</label><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Total:</label><span className="font-bold">${parseFloat(selected.total_amount || selected.total || 0).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['Lines', 'Receipts', 'AP Invoices', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[180px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>Line</th><th>Item</th><th>Description</th><th>Qty Ordered</th><th>Qty Received</th><th>Unit Price</th><th>Line Total</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="7" className="text-center p-4 text-gray-500">No lines</td></tr> : (selected.lines || []).map((l, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{l.item_number || '-'}</td><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">{l.qty_received || 0}</td><td className="text-right">${parseFloat(l.unit_price || l.unit_cost || 0).toFixed(2)}</td><td className="text-right font-bold">${(parseFloat(l.quantity || 0) * parseFloat(l.unit_price || l.unit_cost || 0)).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Receipts' && (
                  <table className="erp-grid"><thead><tr><th>Receipt No.</th><th>Date</th><th>Received By</th><th>Status</th></tr></thead>
                    <tbody>{(selected.receipts || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No receipts yet</td></tr> : (selected.receipts || []).map((r, i) => (
                      <tr key={i}><td className="text-blue-700">{r.receipt_number}</td><td>{r.received_date?.split('T')[0]}</td><td>{r.received_by_name || '-'}</td><td><span className={`erp-status erp-status-${(r.status || '').toLowerCase()}`}>{r.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'AP Invoices' && (
                  <table className="erp-grid"><thead><tr><th>Invoice No.</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
                    <tbody>{(selected.ap_invoices || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No AP invoices linked</td></tr> : (selected.ap_invoices || []).map((inv, i) => (
                      <tr key={i}><td className="text-blue-700">{inv.invoice_number}</td><td>{inv.invoice_date?.split('T')[0]}</td><td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td><td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Audit Trail' && (
                  <table className="erp-grid"><thead><tr><th>Date/Time</th><th>User</th><th>Action</th></tr></thead>
                    <tbody><tr><td colSpan="3" className="text-center p-4 text-gray-500">Audit trail</td></tr></tbody></table>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleApprovePO}>Approve</button>}
              {['open', 'approved', 'partial'].includes(selected.status) && <button className="erp-btn" onClick={handleReceivePO}>📦 Receive All</button>}
              <button className="erp-btn" onClick={() => { setEmailTo(selected.vendor_email || ''); setShowEmailDialog(true); }}>✉ Email to Vendor</button>
              <button className="erp-btn" onClick={() => window.print()}>🖨 Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Purchase Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Vendor:</label>
                  <select className="erp-form-select" value={newPO.vendor_id} onChange={e => setNewPO({ ...newPO, vendor_id: e.target.value })}>
                    <option value="">Select Vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.company_name || v.name} ({v.vendor_number || v.vendor_no})</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Required Date:</label><input className="erp-form-input" type="date" value={newPO.required_date} onChange={e => setNewPO({ ...newPO, required_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship To:</label><input className="erp-form-input" value={newPO.ship_to_location} onChange={e => setNewPO({ ...newPO, ship_to_location: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><input className="erp-form-input" value={newPO.notes} onChange={e => setNewPO({ ...newPO, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2"><span className="text-xs font-bold">PO Lines</span><button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button></div>
              <table className="erp-grid"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Total</th><th></th></tr></thead>
                <tbody>{newPO.lines.map((line, idx) => (
                  <tr key={idx}>
                    <td><select className="erp-form-select w-full" value={line.item_id} onChange={e => updateLine(idx, 'item_id', e.target.value)}><option value="">Select...</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number || i.item_no} - {i.description}</option>)}</select></td>
                    <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                    <td><input className="erp-form-input w-16 text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                    <td><input className="erp-form-input w-20 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                    <td className="text-right font-bold">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0)).toFixed(2)}</td>
                    <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                  </tr>
                ))}
                <tr className="bg-gray-100"><td colSpan="4" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal().toFixed(2)}</td><td></td></tr>
                </tbody></table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreatePO} disabled={!newPO.vendor_id}>Save PO</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEmailDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowEmailDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Email PO to Vendor</span></div>
            <div className="erp-modal-body">
              <div className="erp-form-group mb-3"><label className="erp-form-label">To:</label><input className="erp-form-input w-full" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="vendor@email.com" /></div>
              <p className="text-xs text-gray-600">Purchase Order PDF will be attached automatically.</p>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleEmailPO} disabled={!emailTo}>Send</button>
              <button className="erp-btn" onClick={() => setShowEmailDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default PurchaseOrders;
