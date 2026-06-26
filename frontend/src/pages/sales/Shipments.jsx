import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [orders, setOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form, setForm] = useState({ sales_order_id: '', ship_date: new Date().toISOString().split('T')[0], carrier: '', tracking_number: '', ship_via: '', freight_charge: '', notes: '', lines: [] });

  useEffect(() => { fetchShipments(); }, []);

  const fetchShipments = async () => {
    try { const res = await api.get('/api/sales/shipments'); setShipments(Array.isArray(res.data) ? res.data : res.data.shipments || []); } catch { setShipments([]); }
  };

  const fetchOrders = async () => {
    try { const res = await api.get('/api/sales/orders', { params: { status: 'open' } }); const data = res.data; setOrders(Array.isArray(data) ? data : data.orders || []); } catch { setOrders([]); }
  };

  const handleOrderSelect = async (orderId) => {
    if (!orderId) { setSelectedOrder(null); setForm({ ...form, sales_order_id: '', lines: [] }); return; }
    try {
      const res = await api.get(`/api/sales/orders/${orderId}`);
      const order = res.data;
      setSelectedOrder(order);
      const lines = (order.lines || []).map(l => ({ sales_order_line_id: l.id, item_id: l.item_id, item_number: l.item_number || l.item_no, description: l.description, ordered_qty: l.quantity, shipped_qty: l.shipped_qty || 0, ship_qty: Math.max(0, (l.quantity || 0) - (l.shipped_qty || 0)) }));
      setForm({ ...form, sales_order_id: orderId, lines });
    } catch { toast.error('Failed to load order details'); }
  };

  const updateLineQty = (idx, qty) => {
    const lines = [...form.lines];
    lines[idx].ship_qty = parseFloat(qty) || 0;
    setForm({ ...form, lines });
  };

  const handleSave = async () => {
    const shipLines = form.lines.filter(l => l.ship_qty > 0);
    if (shipLines.length === 0) { toast.error('At least one line must have a ship quantity'); return; }
    try {
      await api.post('/api/sales/shipments', { ...form, lines: shipLines.map(l => ({ sales_order_line_id: l.sales_order_line_id, item_id: l.item_id, quantity: l.ship_qty })) });
      toast.success('Shipment created'); setShowNew(false); fetchShipments();
      setForm({ sales_order_id: '', ship_date: new Date().toISOString().split('T')[0], carrier: '', tracking_number: '', ship_via: '', freight_charge: '', notes: '', lines: [] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create shipment'); }
  };

  const handleEmail = async (shipment) => {
    try { await api.post('/api/email/send', { document_type: 'packing_list', document_id: shipment.id }); toast.success('Packing list emailed'); } catch { toast.error('Failed to send email'); }
  };

  const handleCreateInvoice = async (shipment) => {
    try { await api.post('/api/sales/invoices/from-shipment', { shipment_id: shipment.id }); toast.success('Invoice created from shipment'); } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => { setShowNew(true); fetchOrders(); }}><span className="text-green-600">+</span> New Shipment</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchShipments}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>Print</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Shipment#</th><th>Date</th><th>Order#</th><th>Customer</th><th>Carrier</th><th>Tracking</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {shipments.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No shipments</td></tr> : shipments.map(s => (
              <tr key={s.id}>
                <td className="text-blue-700 font-bold">{s.shipment_number || s.shipment_no}</td>
                <td>{(s.ship_date || s.shipment_date || '')?.split('T')[0]}</td>
                <td>{s.order_number || s.order_no || '-'}</td>
                <td>{s.customer_name || '-'}</td>
                <td>{s.carrier || '-'}</td>
                <td>{s.tracking_number || '-'}</td>
                <td><span className={`erp-status erp-status-${(s.status || '').toLowerCase()}`}>{s.status}</span></td>
                <td>
                  <button className="erp-btn text-xs" onClick={() => handleEmail(s)}>Email</button>
                  <button className="erp-btn text-xs ml-1" onClick={() => handleCreateInvoice(s)}>Invoice</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Shipment</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Sales Order*:</label>
                  <select className="erp-form-select" value={form.sales_order_id} onChange={e => handleOrderSelect(e.target.value)}>
                    <option value="">Select Order...</option>{orders.map(o => <option key={o.id} value={o.id}>{o.order_number} - {o.customer_name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship Date:</label><input className="erp-form-input" type="date" value={form.ship_date} onChange={e => setForm({ ...form, ship_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Carrier:</label><input className="erp-form-input" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="UPS, FedEx, etc." /></div>
                <div className="erp-form-group"><label className="erp-form-label">Tracking#:</label><input className="erp-form-input" value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship Via:</label><input className="erp-form-input" value={form.ship_via} onChange={e => setForm({ ...form, ship_via: e.target.value })} placeholder="Ground, Air, LTL" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Freight:</label><input className="erp-form-input" type="number" step="0.01" value={form.freight_charge} onChange={e => setForm({ ...form, freight_charge: e.target.value })} /></div>
              </div>
              {form.lines.length > 0 && (
                <table className="erp-grid">
                  <thead><tr><th>Item#</th><th>Description</th><th>Ordered</th><th>Already Shipped</th><th>Ship Now</th></tr></thead>
                  <tbody>{form.lines.map((l, i) => (
                    <tr key={i}>
                      <td className="font-mono">{l.item_number}</td>
                      <td>{l.description}</td>
                      <td className="text-right">{l.ordered_qty}</td>
                      <td className="text-right">{l.shipped_qty}</td>
                      <td><input className="erp-form-input w-20 text-right" type="number" value={l.ship_qty} onChange={e => updateLineQty(i, e.target.value)} max={l.ordered_qty - l.shipped_qty} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <div className="mt-2 erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-12" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.sales_order_id || form.lines.filter(l => l.ship_qty > 0).length === 0}>Ship</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shipments;
