import DocumentActions from '../../components/DocumentActions';
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
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  const [showShipDialog, setShowShipDialog] = useState(false);
  const [shipForm, setShipForm] = useState({ carrier: '', tracking_number: '', ship_via: '', freight_charge: 0, notes: '', lines: [] });
  const [showDepositDialog, setShowDepositDialog] = useState(false);
  const [depositForm, setDepositForm] = useState({ amount: '', payment_method: 'check', reference_number: '' });
  const [newOrder, setNewOrder] = useState({
    customer_id: '', customer_po: '', project_name: '', required_date: '', notes: '',
    lines: [{ description: '', quantity_ordered: 1, unit_price: 0, product_type: '', glass_type: '', thickness: '', width_inches: '', height_inches: '', edge_type: '', manufacturing_notes: '' }]
  });

  useEffect(() => { fetchOrders(); fetchCustomers(); }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      const res = await api.get('/api/sales/orders', { params: { search, status: statusFilter } });
      setOrders(Array.isArray(res.data) ? res.data : []);
    } catch { setOrders([]); }
  };
  const fetchCustomers = async () => {
    try { const res = await api.get('/api/sales/customers'); setCustomers(Array.isArray(res.data) ? res.data : res.data.customers || []); } catch { setCustomers([]); }
  };

  const openDetail = async (order) => {
    try {
      const res = await api.get(`/api/sales/orders/${order.id}`);
      setSelected(res.data);
      setActiveTab('Lines');
      setShowDetail(true);
    } catch { toast.error('Failed to load order'); }
  };

  const handleCreateOrder = async () => {
    try {
      const payload = { ...newOrder, customer_id: parseInt(newOrder.customer_id), lines: newOrder.lines.filter(l => l.description).map(l => ({ ...l, quantity_ordered: parseFloat(l.quantity_ordered) || 1, unit_price: parseFloat(l.unit_price) || 0 })) };
      await api.post('/api/sales/orders', payload);
      toast.success('Sales Order created');
      setShowNew(false);
      fetchOrders();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleReleaseToProduction = async () => {
    try {
      const res = await api.post(`/api/sales/orders/${selected.id}/release-to-production`, {});
      toast.success(`${res.data.work_orders.length} Work Order(s) created!`);
      setShowReleaseDialog(false);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to release'); }
  };

  const handleCreateShipment = async () => {
    try {
      const payload = {
        sales_order_id: selected.id,
        carrier: shipForm.carrier,
        tracking_number: shipForm.tracking_number,
        ship_via: shipForm.ship_via,
        freight_charge: parseFloat(shipForm.freight_charge) || 0,
        notes: shipForm.notes,
        lines: shipForm.lines.filter(l => parseFloat(l.ship_qty) > 0).map(l => ({
          sales_order_line_id: l.id, quantity_shipped: parseFloat(l.ship_qty), description: l.description
        }))
      };
      await api.post('/api/sales/shipments', payload);
      toast.success('Shipment created');
      setShowShipDialog(false);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleAddDeposit = async () => {
    try {
      await api.post(`/api/sales/orders/${selected.id}/deposit`, { amount: parseFloat(depositForm.amount), payment_method: depositForm.payment_method, reference_number: depositForm.reference_number });
      toast.success('Deposit recorded');
      setShowDepositDialog(false);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const openShipDialog = () => {
    const lines = (selected.lines || []).map(l => ({
      ...l, ship_qty: Math.max(0, (parseFloat(l.quantity_ordered) || 0) - (parseFloat(l.quantity_shipped) || 0))
    }));
    setShipForm({ carrier: '', tracking_number: '', ship_via: '', freight_charge: 0, notes: '', lines });
    setShowShipDialog(true);
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const productTypes = ['tempered_panel', 'laminated', 'tempered_laminated', 'igu_standard', 'igu_low_e', 'heat_soaked', 'custom'];
  const glassTypes = ['Clear Float', 'Low-E', 'Tinted Grey', 'Tinted Bronze', 'Tinted Green', 'Starphire', 'Frosted'];
  const thicknesses = ['4mm', '5mm', '6mm', '8mm', '10mm', '12mm', '15mm', '19mm'];
  const edgeTypes = ['Seamed', 'Flat Polish', 'Pencil Polish', 'Beveled', 'Ogee', 'Mitered'];

  const addLine = () => setNewOrder({ ...newOrder, lines: [...newOrder.lines, { description: '', quantity_ordered: 1, unit_price: 0, product_type: '', glass_type: '', thickness: '', width_inches: '', height_inches: '', edge_type: '', manufacturing_notes: '' }] });
  const updateLine = (idx, field, value) => { const lines = [...newOrder.lines]; lines[idx] = { ...lines[idx], [field]: value }; setNewOrder({ ...newOrder, lines }); };
  const removeLine = (idx) => setNewOrder({ ...newOrder, lines: newOrder.lines.filter((_, i) => i !== idx) });

  const hasPendingLines = selected?.lines?.some(l => l.production_status === 'pending');
  const hasShippableLines = selected?.lines?.some(l => (parseFloat(l.quantity_ordered) || 0) > (parseFloat(l.quantity_shipped) || 0));

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="erp-toolbar mb-2">
        <button className="erp-btn erp-btn-primary" onClick={() => setShowNew(true)}>+ New Order</button>
        <div className="erp-toolbar-separator"></div>
        <input className="erp-form-input w-48" placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="open">All Open</option><option value="all">All</option><option value="invoiced">Invoiced</option><option value="shipped">Shipped</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchOrders}>Refresh</button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Order#</th><th>Date</th><th>Customer</th><th>Project</th><th>PO#</th><th>Total</th><th>WOs</th><th>Status</th></tr></thead>
          <tbody>
            {orders.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No orders found</td></tr> : orders.map(o => (
              <tr key={o.id} className="cursor-pointer" onClick={() => openDetail(o)}>
                <td className="text-blue-700 font-bold">{o.order_number}</td>
                <td>{formatDate(o.order_date)}</td>
                <td>{o.customer_name}</td>
                <td>{o.project_name || '-'}</td>
                <td>{o.customer_po || '-'}</td>
                <td className="text-right font-bold">${parseFloat(o.total || 0).toFixed(2)}</td>
                <td className="text-center">{o.wo_count || 0}</td>
                <td><span className={`erp-status erp-status-${(o.status || '').toLowerCase()}`}>{o.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '950px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Sales Order {selected.order_number} — {selected.project_name || selected.company_name}</span>
              <span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              {/* Header */}
              <div className="grid grid-cols-5 gap-3 mb-4 text-xs">
                <div><span className="text-gray-500">Customer:</span><br/><strong>{selected.company_name}</strong></div>
                <div><span className="text-gray-500">Order Date:</span><br/><strong>{formatDate(selected.order_date)}</strong></div>
                <div><span className="text-gray-500">Required:</span><br/><strong>{formatDate(selected.required_date)}</strong></div>
                <div><span className="text-gray-500">Customer PO:</span><br/><strong>{selected.customer_po || '-'}</strong></div>
                <div><span className="text-gray-500">Total:</span><br/><strong className="text-lg text-green-700">${parseFloat(selected.total || 0).toFixed(2)}</strong></div>
                {selected.quote_number && <div><span className="text-gray-500">From Quote:</span><br/><strong className="text-purple-700">{selected.quote_number}</strong></div>}
              </div>

              {/* Tabs */}
              <div className="erp-tabs">
                {['Lines', 'Production', 'Shipments', 'Invoices', 'Deposits'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}
                    {tab === 'Production' && selected.work_orders?.length > 0 && <span className="ml-1 bg-orange-200 text-orange-800 px-1 rounded text-[9px]">{selected.work_orders.length}</span>}
                    {tab === 'Shipments' && selected.shipments?.length > 0 && <span className="ml-1 bg-blue-200 text-blue-800 px-1 rounded text-[9px]">{selected.shipments.length}</span>}
                  </div>
                ))}
              </div>
              <div className="p-3 border border-t-0" style={{ minHeight: '220px' }}>
                {activeTab === 'Lines' && (
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Description</th><th>Product Type</th><th>Glass</th><th>Size</th><th>Edge</th><th>Qty</th><th>Shipped</th><th>Price</th><th>Total</th><th>Prod Status</th><th>WO#</th></tr></thead>
                    <tbody>
                      {(selected.lines || []).map((l, i) => (
                        <tr key={i}>
                          <td>{l.line_number}</td>
                          <td className="font-medium">{l.description}</td>
                          <td><span className="bg-blue-100 text-blue-800 px-1 rounded text-[10px]">{(l.product_type || '').replace(/_/g, ' ')}</span></td>
                          <td className="text-[10px]">{l.glass_type} {l.thickness}</td>
                          <td className="text-center text-[10px]">{l.width_inches && l.height_inches ? `${l.width_inches}"×${l.height_inches}"` : '-'}</td>
                          <td className="text-[10px]">{l.edge_type || '-'}</td>
                          <td className="text-right">{l.quantity_ordered}</td>
                          <td className="text-right">{l.quantity_shipped || 0}</td>
                          <td className="text-right">${parseFloat(l.unit_price || 0).toFixed(2)}</td>
                          <td className="text-right font-bold">${parseFloat(l.line_total || 0).toFixed(2)}</td>
                          <td><span className={`erp-status erp-status-${(l.production_status || 'pending').toLowerCase()}`}>{l.production_status || 'pending'}</span></td>
                          <td className="text-blue-700 text-[10px]">{l.wo_number || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {activeTab === 'Production' && (
                  <div>
                    {(selected.work_orders || []).length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-500 mb-3">No work orders created yet.</p>
                        {hasPendingLines && <button className="erp-btn erp-btn-primary" onClick={() => setShowReleaseDialog(true)}>🏭 Release to Production</button>}
                      </div>
                    ) : (
                      <table className="erp-grid">
                        <thead><tr><th>WO#</th><th>Product Type</th><th>Qty</th><th>Status</th></tr></thead>
                        <tbody>
                          {selected.work_orders.map((wo, i) => (
                            <tr key={i}>
                              <td className="text-blue-700 font-bold">{wo.order_number}</td>
                              <td><span className="bg-blue-100 text-blue-800 px-1 rounded text-[10px]">{(wo.product_type || '').replace(/_/g, ' ')}</span></td>
                              <td className="text-right">{wo.quantity}</td>
                              <td><span className={`erp-status erp-status-${(wo.status || '').toLowerCase()}`}>{wo.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'Shipments' && (
                  <div>
                    {(selected.shipments || []).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No shipments yet</p>
                    ) : (
                      <table className="erp-grid">
                        <thead><tr><th>Shipment#</th><th>Date</th><th>Carrier</th><th>Tracking</th><th>Status</th></tr></thead>
                        <tbody>{selected.shipments.map((s, i) => (
                          <tr key={i}>
                            <td className="text-blue-700 font-bold">{s.shipment_number}</td>
                            <td>{formatDate(s.shipment_date || s.ship_date)}</td>
                            <td>{s.carrier || '-'}</td>
                            <td>{s.tracking_number || '-'}</td>
                            <td><span className={`erp-status erp-status-${(s.status || '').toLowerCase()}`}>{s.status}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'Invoices' && (
                  <div>
                    {(selected.invoices || []).length === 0 ? (
                      <p className="text-gray-500 text-center py-8">No invoices yet</p>
                    ) : (
                      <table className="erp-grid">
                        <thead><tr><th>Invoice#</th><th>Date</th><th>Total</th><th>Balance</th><th>Status</th></tr></thead>
                        <tbody>{selected.invoices.map((inv, i) => (
                          <tr key={i}>
                            <td className="text-blue-700 font-bold">{inv.invoice_number}</td>
                            <td>{formatDate(inv.invoice_date)}</td>
                            <td className="text-right">${parseFloat(inv.total || 0).toFixed(2)}</td>
                            <td className="text-right font-bold text-red-600">${parseFloat(inv.balance || inv.balance_due || 0).toFixed(2)}</td>
                            <td><span className={`erp-status erp-status-${(inv.status || '').toLowerCase()}`}>{inv.status}</span></td>
                          </tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
                {activeTab === 'Deposits' && (
                  <div>
                    <button className="erp-btn text-xs mb-2" onClick={() => setShowDepositDialog(true)}>+ Record Deposit</button>
                    {(selected.deposits || []).length === 0 ? <p className="text-gray-500 text-center py-4">No deposits</p> : (
                      <table className="erp-grid">
                        <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Reference</th><th>Status</th></tr></thead>
                        <tbody>{selected.deposits.map((d, i) => (
                          <tr key={i}><td>{formatDate(d.deposit_date)}</td><td className="text-right font-bold">${parseFloat(d.amount || 0).toFixed(2)}</td><td>{d.payment_method}</td><td>{d.reference_number || '-'}</td><td><span className={`erp-status erp-status-${(d.status || '').toLowerCase()}`}>{d.status}</span></td></tr>
                        ))}</tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="erp-modal-footer">
              {hasPendingLines && <button className="erp-btn" style={{ background: '#e67e22', color: 'white' }} onClick={() => setShowReleaseDialog(true)}>🏭 Release to Production</button>}
              {hasShippableLines && <button className="erp-btn" style={{ background: '#2980b9', color: 'white' }} onClick={openShipDialog}>🚚 Create Shipment</button>}
              <button className="erp-btn" onClick={() => setShowDepositDialog(true)}>💰 Deposit</button>
              <DocumentActions documentType="sales_order" documentId={selected.id} recipientEmail={selected.customer_email} recipientName={selected.customer_name} compact />
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Release to Production Dialog */}
      {showReleaseDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowReleaseDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Release to Production</span></div>
            <div className="erp-modal-body">
              <p className="text-xs mb-3">This will create Work Orders for all pending lines on <strong>{selected?.order_number}</strong>. Each line will get its own WO with routing based on product type.</p>
              <div className="text-xs mb-2 font-bold">Lines to release:</div>
              <table className="erp-grid">
                <thead><tr><th>#</th><th>Description</th><th>Product Type</th><th>Qty</th></tr></thead>
                <tbody>{(selected?.lines || []).filter(l => l.production_status === 'pending').map((l, i) => (
                  <tr key={i}><td>{l.line_number}</td><td>{l.description}</td><td>{(l.product_type || '').replace(/_/g, ' ')}</td><td>{l.quantity_ordered}</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleReleaseToProduction}>🏭 Create Work Orders</button>
              <button className="erp-btn" onClick={() => setShowReleaseDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Shipment Dialog */}
      {showShipDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowShipDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '700px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Create Shipment from {selected?.order_number}</span></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Carrier:</label><input className="erp-form-input" value={shipForm.carrier} onChange={e => setShipForm({ ...shipForm, carrier: e.target.value })} placeholder="UPS, FedEx, LTL" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Tracking#:</label><input className="erp-form-input" value={shipForm.tracking_number} onChange={e => setShipForm({ ...shipForm, tracking_number: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship Via:</label><input className="erp-form-input" value={shipForm.ship_via} onChange={e => setShipForm({ ...shipForm, ship_via: e.target.value })} placeholder="Ground, Air, Flatbed" /></div>
              </div>
              <div className="text-xs font-bold mb-1">Select quantities to ship:</div>
              <table className="erp-grid">
                <thead><tr><th>Description</th><th>Glass</th><th>Ordered</th><th>Already Shipped</th><th>Ship Now</th></tr></thead>
                <tbody>{shipForm.lines.map((l, i) => (
                  <tr key={i}>
                    <td>{l.description}</td>
                    <td className="text-[10px]">{l.glass_type} {l.thickness} {l.width_inches && l.height_inches ? `${l.width_inches}"×${l.height_inches}"` : ''}</td>
                    <td className="text-right">{l.quantity_ordered}</td>
                    <td className="text-right">{l.quantity_shipped || 0}</td>
                    <td><input className="erp-form-input w-16 text-right" type="number" min="0" max={parseFloat(l.quantity_ordered) - parseFloat(l.quantity_shipped || 0)} value={l.ship_qty} onChange={e => { const lines = [...shipForm.lines]; lines[i] = { ...lines[i], ship_qty: e.target.value }; setShipForm({ ...shipForm, lines }); }} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateShipment} disabled={!shipForm.lines.some(l => parseFloat(l.ship_qty) > 0)}>🚚 Ship</button>
              <button className="erp-btn" onClick={() => setShowShipDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Deposit Dialog */}
      {showDepositDialog && (
        <div className="erp-modal-overlay" onClick={() => setShowDepositDialog(false)}>
          <div className="erp-modal" style={{ minWidth: '400px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Record Deposit</span></div>
            <div className="erp-modal-body">
              <div className="space-y-3">
                <div className="erp-form-group"><label className="erp-form-label">Amount:</label><input className="erp-form-input" type="number" step="0.01" value={depositForm.amount} onChange={e => setDepositForm({ ...depositForm, amount: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Method:</label>
                  <select className="erp-form-select" value={depositForm.payment_method} onChange={e => setDepositForm({ ...depositForm, payment_method: e.target.value })}>
                    <option value="check">Check</option><option value="wire">Wire Transfer</option><option value="credit_card">Credit Card</option><option value="ach">ACH</option>
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference#:</label><input className="erp-form-input" value={depositForm.reference_number} onChange={e => setDepositForm({ ...depositForm, reference_number: e.target.value })} /></div>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleAddDeposit} disabled={!depositForm.amount}>Save Deposit</button>
              <button className="erp-btn" onClick={() => setShowDepositDialog(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* New Order Modal */}
      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '950px', maxWidth: '95vw' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Sales Order</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body" style={{ maxHeight: '70vh' }}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="erp-form-group"><label className="erp-form-label">Customer*:</label>
                  <select className="erp-form-select" value={newOrder.customer_id} onChange={e => setNewOrder({ ...newOrder, customer_id: e.target.value })}>
                    <option value="">Select...</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}
                  </select></div>
                <div className="erp-form-group"><label className="erp-form-label">Project:</label><input className="erp-form-input" value={newOrder.project_name} onChange={e => setNewOrder({ ...newOrder, project_name: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Customer PO#:</label><input className="erp-form-input" value={newOrder.customer_po} onChange={e => setNewOrder({ ...newOrder, customer_po: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Required Date:</label><input className="erp-form-input" type="date" value={newOrder.required_date} onChange={e => setNewOrder({ ...newOrder, required_date: e.target.value })} /></div>
                <div className="erp-form-group col-span-2"><label className="erp-form-label">Notes:</label><input className="erp-form-input" value={newOrder.notes} onChange={e => setNewOrder({ ...newOrder, notes: e.target.value })} /></div>
              </div>
              <div className="mb-2 flex items-center gap-2"><span className="text-xs font-bold">Line Items</span><button className="erp-btn text-xs" onClick={addLine}>+ Add Line</button></div>
              <div className="overflow-x-auto">
                <table className="erp-grid" style={{ minWidth: '850px' }}>
                  <thead><tr><th>Description*</th><th>Product Type</th><th>Glass</th><th>Thickness</th><th>W"</th><th>H"</th><th>Edge</th><th>Qty</th><th>Price</th><th></th></tr></thead>
                  <tbody>{newOrder.lines.map((line, idx) => (
                    <tr key={idx}>
                      <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} /></td>
                      <td><select className="erp-form-select w-full" value={line.product_type} onChange={e => updateLine(idx, 'product_type', e.target.value)}><option value="">-</option>{productTypes.map(pt => <option key={pt} value={pt}>{pt.replace(/_/g,' ')}</option>)}</select></td>
                      <td><select className="erp-form-select w-full" value={line.glass_type} onChange={e => updateLine(idx, 'glass_type', e.target.value)}><option value="">-</option>{glassTypes.map(gt => <option key={gt} value={gt}>{gt}</option>)}</select></td>
                      <td><select className="erp-form-select w-20" value={line.thickness} onChange={e => updateLine(idx, 'thickness', e.target.value)}><option value="">-</option>{thicknesses.map(t => <option key={t} value={t}>{t}</option>)}</select></td>
                      <td><input className="erp-form-input w-14 text-right" type="number" value={line.width_inches} onChange={e => updateLine(idx, 'width_inches', e.target.value)} /></td>
                      <td><input className="erp-form-input w-14 text-right" type="number" value={line.height_inches} onChange={e => updateLine(idx, 'height_inches', e.target.value)} /></td>
                      <td><select className="erp-form-select w-full" value={line.edge_type} onChange={e => updateLine(idx, 'edge_type', e.target.value)}><option value="">-</option>{edgeTypes.map(et => <option key={et} value={et}>{et}</option>)}</select></td>
                      <td><input className="erp-form-input w-14 text-right" type="number" value={line.quantity_ordered} onChange={e => updateLine(idx, 'quantity_ordered', e.target.value)} /></td>
                      <td><input className="erp-form-input w-20 text-right" type="number" step="0.01" value={line.unit_price} onChange={e => updateLine(idx, 'unit_price', e.target.value)} /></td>
                      <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleCreateOrder} disabled={!newOrder.customer_id}>Save Order</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default SalesOrders;
