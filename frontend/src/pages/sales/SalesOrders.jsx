import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [showDetail, setShowDetail] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Lines');
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', payment_method: 'check', reference_number: '' });
  const [newOrder, setNewOrder] = useState({
    customer_id: '', customer_po: '', ship_date: '', notes: '',
    lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, discount_pct: 0 }]
  });

  useEffect(() => { fetchOrders(); fetchCustomers(); fetchItems(); }, []);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/sales/orders', { params: { search, status: statusFilter } });
      setOrders(Array.isArray(res.data) ? res.data : res.data.orders || []);
    } catch { setOrders([]); }
  };

  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const fetchItems = async () => {
    try { const res = await api.get('/api/inventory/items'); setItems(Array.isArray(res.data) ? res.data : res.data.items || []); } catch { setItems([]); }
  };

  const openDetail = async (order) => {
    try {
      const res = await api.get(`/api/sales/orders/${order.id}`);
      setSelected(res.data);
      setActiveTab('Lines');
      setShowDetail(true);
    } catch { toast.error('Failed to load order details'); }
  };

  const handleCreateOrder = async () => {
    try {
      const payload = {
        customer_id: parseInt(newOrder.customer_id),
        customer_po: newOrder.customer_po,
        ship_date: newOrder.ship_date || null,
        notes: newOrder.notes,
        lines: newOrder.lines.filter(l => l.item_id || l.description).map(l => ({
          item_id: l.item_id ? parseInt(l.item_id) : null,
          description: l.description,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          discount_pct: parseFloat(l.discount_pct) || 0
        }))
      };
      await api.post('/api/sales/orders', payload);
      toast.success('Sales Order created successfully');
      setShowNew(false);
      setNewOrder({ customer_id: '', customer_po: '', ship_date: '', notes: '', lines: [{ item_id: '', description: '', quantity: 1, unit_price: 0, discount_pct: 0 }] });
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create order'); }
  };

  const handleConfirmOrder = async () => {
    try {
      await api.put(`/api/sales/orders/${selected.id}/confirm`);
      toast.success('Order confirmed');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to confirm order'); }
  };

  const handleEmailOrder = async () => {
    try {
      await api.post('/api/email/send', {
        document_type: 'sales_order', document_id: selected.id,
        to_email: emailTo, subject: `Order Confirmation - ${selected.order_number || selected.order_no}`,
      });
      toast.success('Email sent successfully');
      setShowEmailDialog(false);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to send email'); }
  };

  const handleAddDeposit = async () => {
    try {
      await api.post(`/api/sales/orders/${selected.id}/deposit`, {
        amount: parseFloat(depositForm.amount),
        payment_method: depositForm.payment_method,
        reference_number: depositForm.reference_number
      });
      toast.success('Deposit recorded');
      setShowDepositDialog(false);
      setDepositForm({ amount: '', payment_method: 'check', reference_number: '' });
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to record deposit'); }
  };

  const handleCreateShipment = async () => {
    try {
      const lines = (selected.lines || []).map(l => ({
        sales_order_line_id: l.id, item_id: l.item_id,
        quantity_shipped: l.quantity - (l.qty_shipped || 0)
      })).filter(l => l.quantity_shipped > 0);
      if (lines.length === 0) { toast.warning('Nothing to ship'); return; }
      await api.post('/api/sales/shipments', { sales_order_id: selected.id, ship_date: new Date().toISOString().split('T')[0], lines });
      toast.success('Shipment created');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create shipment'); }
  };

  const handleCreateWO = async () => {
    try {
      const firstLine = (selected.lines || [])[0];
      await api.post('/api/manufacturing/work-orders', {
        item_id: firstLine?.item_id || 1, quantity: firstLine?.quantity || 1,
        sales_order_id: selected.id, priority: 'normal',
        notes: `WO from SO ${selected.order_number || selected.order_no}`
      });
      toast.success('Work Order created');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create WO'); }
  };

  const addLine = () => setNewOrder({ ...newOrder, lines: [...newOrder.lines, { item_id: '', description: '', quantity: 1, unit_price: 0, discount_pct: 0 }] });

  const updateLine = (idx, field, value) => {
    const lines = [...newOrder.lines];
    lines[idx] = { ...lines[idx], [field]: value };
    if (field === 'item_id' && value) {
      const item = items.find(i => i.id === parseInt(value));
      if (item) { lines[idx].description = item.description; lines[idx].unit_price = item.selling_price || item.unit_price || 0; }
    }
    setNewOrder({ ...newOrder, lines });
  };

  const removeLine = (idx) => {
    const lines = newOrder.lines.filter((_, i) => i !== idx);
    setNewOrder({ ...newOrder, lines: lines.length ? lines : [{ item_id: '', description: '', quantity: 1, unit_price: 0, discount_pct: 0 }] });
  };

  const getTotal = () => newOrder.lines.reduce((sum, l) => sum + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0) * (1 - (parseFloat(l.discount_pct) || 0) / 100), 0);

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New Order</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchOrders}>↻ Refresh</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={() => { if (selected) { setEmailTo(selected.customer_email || ''); setShowEmailDialog(true); } }}>✉ Email</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>🖨 Print</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" disabled={!selected} onClick={handleCreateWO}>Create WO</button>
        <button className="erp-toolbar-btn" disabled={!selected} onClick={handleCreateShipment}>Ship</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} placeholder="Order#, Customer, PO#" />
        <button className="erp-btn text-xs ml-1" onClick={fetchOrders}>Find</button>
        <div className="ml-auto text-xs">View:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchOrders, 0); }}>
            <option value="open">All Open</option><option value="">All</option><option value="confirmed">Confirmed</option><option value="shipped">Shipped</option><option value="invoiced">Invoiced</option><option value="closed">Closed</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Order No.</th><th>Date</th><th>Customer</th><th>PO Number</th><th>Ship Date</th><th>Amount</th><th>Deposit</th><th>Status</th><th>Salesperson</th></tr></thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="9" className="text-center p-4 text-gray-500">No orders found</td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className={`cursor-pointer ${selected?.id === o.id ? 'bg-blue-100' : ''}`} onClick={() => openDetail(o)}>
                <td className="text-blue-700 font-bold">{o.order_number || o.order_no}</td>
                <td>{o.order_date?.split('T')[0]}</td>
                <td>{o.customer_name}</td>
                <td>{o.customer_po}</td>
                <td>{o.ship_date?.split('T')[0]}</td>
                <td className="text-right">${parseFloat(o.total_amount || o.total || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(o.deposit_total || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${(o.status || '').toLowerCase()}`}>{o.status}</span></td>
                <td>{o.salesperson_name || o.salesperson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '900px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Sales Order - {selected.order_number || selected.order_no}</span>
              <button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button>
            </div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-4 mb-3">
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Order Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Order No:</label><span className="font-bold">{selected.order_number || selected.order_no}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Date:</label><span>{selected.order_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Customer PO:</label><span>{selected.customer_po}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Customer</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Name:</label><span>{selected.customer_name}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Ship To:</label><span>{selected.ship_address || selected.ship_city || '-'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Ship Date:</label><span>{selected.ship_date?.split('T')[0]}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Carrier:</label><span>{selected.carrier || '-'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Financial</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Subtotal:</label><span>${parseFloat(selected.subtotal || selected.total_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Tax:</label><span>${parseFloat(selected.tax_amount || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Total:</label><span className="font-bold">${parseFloat(selected.total_amount || selected.total || 0).toFixed(2)}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Deposits:</label><span className="text-green-700">${parseFloat(selected.deposit_total || 0).toFixed(2)}</span></div>
                  </div>
                </fieldset>
              </div>
              {selected.notes && <div className="mb-3 text-xs"><label className="font-bold">Notes: </label><span>{selected.notes}</span></div>}
              <div className="erp-tabs">
                {['Lines', 'Shipments', 'Deposits', 'Work Orders', 'Audit Trail'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[200px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>Line</th><th>Item</th><th>Description</th><th>Qty Ordered</th><th>Qty Shipped</th><th>Unit Price</th><th>Disc%</th><th>Line Total</th></tr></thead>
                    <tbody>{(selected.lines || []).length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No lines</td></tr> : (selected.lines || []).map((l, i) => (
                      <tr key={i}><td>{i + 1}</td><td>{l.item_number || l.item_no || '-'}</td><td>{l.description}</td><td className="text-right">{l.quantity}</td><td className="text-right">{l.qty_shipped || 0}</td><td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td><td className="text-right">{l.discount_pct || 0}%</td><td className="text-right font-bold">${(parseFloat(l.quantity || 0) * parseFloat(l.unit_price || 0) * (1 - (parseFloat(l.discount_pct) || 0) / 100)).toFixed(2)}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Shipments' && (
                  <table className="erp-grid"><thead><tr><th>Shipment No.</th><th>Date</th><th>Carrier</th><th>Tracking</th><th>Status</th></tr></thead>
                    <tbody>{(selected.shipments || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No shipments yet</td></tr> : (selected.shipments || []).map((s, i) => (
                      <tr key={i}><td className="text-blue-700">{s.shipment_number}</td><td>{s.ship_date?.split('T')[0]}</td><td>{s.carrier || '-'}</td><td>{s.tracking_number || '-'}</td><td><span className={`erp-status erp-status-${(s.status || '').toLowerCase()}`}>{s.status}</span></td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Deposits' && (
                  <div><div className="mb-2"><button className="erp-btn text-xs" onClick={() => setShowDepositDialog(true)}>+ Record Deposit</button></div>
                    <table className="erp-grid"><thead><tr><th>Deposit No.</th><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead>
                      <tbody>{(selected.deposits || []).length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No deposits recorded</td></tr> : (selected.deposits || []).map((d, i) => (
                        <tr key={i}><td>{d.deposit_number}</td><td>{d.deposit_date?.split('T')[0]}</td><td className="text-right font-bold">${parseFloat(d.amount || 0).toFixed(2)}</td><td>{d.payment_method}</td><td>{d.reference_number || '-'}</td><td><span className={`erp-status erp-status-${(d.status || '').toLowerCase()}`}>{d.status}</span></td></tr>
                      ))}</tbody></table></div>
                )}
                {activeTab === 'Work Orders' && (
                  <table className="erp-grid"><thead><tr><th>WO Number</th><th>Item</th><th>Qty</th><th>Status</th><th>Start Date</th></tr></thead>
                    <tbody>{(selected.work_orders || []).length === 0 ? <tr><td colSpan="5" className="text-center p-4 text-gray-500">No work orders linked</td></tr> : (selected.work_orders || []).map((wo, i) => (
                      <tr key={i}><td className="text-blue-700">{wo.order_number || wo.wo_number}</td><td>{wo.item_number || '-'}</td><td>{wo.quantity}</td><td><span className={`erp-status erp-status-${(wo.status || '').toLowerCase()}`}>{wo.status}</span></td><td>{wo.start_date?.split('T')[0]}</td></tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Audit Trail' && <AuditTrail entityType="sales_orders" entityId={selected.id} />}
              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={handleConfirmOrder}>Confirm Order</button>}
              {(selected.status === 'confirmed' || selected.status === 'open') && <button className="erp-btn" onClick={handleCreateShipment}>Create Shipment</button>}
              <button className="erp-btn" onClick={() => { setEmailTo(selected.customer_email || ''); setShowEmailDialog(true); }}>✉ Email</button>
              <button className="erp-btn" onClick={() => setShowDepositDialog(true)}>$ Deposit</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Sales Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer:</label>
                  <select className="erp-form-select" value={newOrder.customer_id} onChange={e => setNewOrder({ ...newOrder, customer_id: e.target.value })}>
                    <option value="">Select Customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name} ({c.customer_number || c.customer_no})</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Customer PO:</label><input className="erp-form-input" value={newOrder.customer_po} onChange={e => setNewOrder({ ...newOrder, customer_po: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship Date:</label><input className="erp-form-input" type="date" value={newOrder.ship_date} onChange={e => setNewOrder({ ...newOrder, ship_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Notes:</label><input className="erp-form-input" value={newOrder.notes} onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2"><span className="text-xs font-bold">Order Lines</span><button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button></div>
              <table className="erp-grid"><thead><tr><th>Item</th><th>Description</th><th>Qty</th><th>Unit Price</th><th>Disc %</th><th>Line Total</th><th></th></tr></thead>
                <tbody>
                  {newOrder.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td><select className="erp-form-select w-full" value={line.item_id} onChange={e => updateLine(idx, 'item_id', e.target.value)}><option value="">Select...</option>{items.map(i => <option key={i.id} value={i.id}>{i.item_number || i.item_no} - {i.description}</option>)}</select></td>
                      <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                      <td><input className="erp-form-input w-16 text-right" type="number" value={line.quantity} onChange={e => updateLine(idx, 'quantity', e.target.value)} /></td>
                      <td><input className="erp-form-input w-20 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                      <td><input className="erp-form-input w-14 text-right" type="number" value={line.discount_pct} onChange={e => updateLine(idx, 'discount_pct', e.target.value)} /></td>
                      <td className="text-right font-bold">${((parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0) * (1 - (parseFloat(line.discount_pct) || 0) / 100)).toFixed(2)}</td>
                      <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                    </tr>
                  ))}
                  <tr className="bg-gray-100"><td colSpan="5" className="text-right font-bold">Total:</td><td className="text-right font-bold">${getTotal().toFixed(2)}</td><td></td></tr>
                </tbody></table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateOrder} disabled={!newOrder.customer_id}>Save Order</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showEmailDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowEmailDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Email Order Confirmation</span></div>
            <div className="erp-modal-body">
              <div className="erp-form-group mb-3"><label className="erp-form-label">To:</label><input className="erp-form-input w-full" value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="customer@email.com" /></div>
              <p className="text-xs text-gray-600">Order confirmation PDF will be attached automatically.</p>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleEmailOrder} disabled={!emailTo}>Send</button>
              <button className="erp-btn" onClick={() => setShowEmailDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {showDepositDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowDepositDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Record Deposit</span></div>
            <div className="erp-modal-body">
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input className="erp-form-input" type="number" step="0.01" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Payment Method:</label>
                  <select className="erp-form-select" value={depositForm.payment_method} onChange={e => setDepositForm({ ...depositForm, payment_method: e.target.value })}>
                    <option value="check">Check</option><option value="credit_card">Credit Card</option><option value="wire_transfer">Wire Transfer</option><option value="ach">ACH</option><option value="cash">Cash</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference #:</label><input className="erp-form-input" value={depositForm.reference_number} onChange={e => setDepositForm({ ...depositForm, reference_number: e.target.value })} placeholder="Check#, CC last 4, Wire ref" /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleAddDeposit} disabled={!depositForm.amount}>Record</button>
              <button className="erp-btn" onClick={() => setShowDepositDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuditTrail({ entityType, entityId }) {
  const [logs, setLogs] = useState([]);
  useEffect(() => { api.get(`/api/audit/${entityType}/${entityId}`).then(res => setLogs(res.data || [])).catch(() => setLogs([])); }, [entityType, entityId]);
  return (
    <table className="erp-grid"><thead><tr><th>Date/Time</th><th>User</th><th>Action</th><th>Details</th></tr></thead>
      <tbody>{logs.length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No audit records</td></tr> : logs.map((l, i) => (
        <tr key={i}><td>{new Date(l.changed_at).toLocaleString()}</td><td>{l.username || l.user_full_name}</td><td>{l.operation}</td><td className="text-xs">{l.new_data ? JSON.stringify(l.new_data).substring(0, 100) : '-'}</td></tr>
      ))}</tbody></table>
  );
}

export default SalesOrders;
