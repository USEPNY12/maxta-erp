import DocumentActions from '../../components/DocumentActions';
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ScanPanel from '../../components/ScanPanel';

function Shipments() {
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Items');
  const [searchParams] = useSearchParams();
  const [showNew, setShowNew] = useState(searchParams.get('new') === 'true');
  const [orders, setOrders] = useState([]);
  const [form, setForm] = useState({ sales_order_id: '', ship_date: new Date().toISOString().split('T')[0], carrier: '', tracking_number: '', ship_via: '', freight_charge: 0, notes: '', lines: [] });

  useEffect(() => { fetchShipments(); }, [statusFilter]);

  const fetchShipments = async () => {
    try {
      const res = await api.get('/api/sales/shipments', { params: { search, status: statusFilter } });
      setShipments(Array.isArray(res.data) ? res.data : []);
    } catch { setShipments([]); }
  };

  const openDetail = async (shipment) => {
    try {
      const res = await api.get(`/api/sales/shipments/${shipment.id}`);
      setSelected(res.data);
      setActiveTab('Items');
      setShowDetail(true);
    } catch { toast.error('Failed to load shipment'); }
  };

  const openNew = async () => {
    try {
      const res = await api.get('/api/sales/orders', { params: { status: 'open' } });
      setOrders(Array.isArray(res.data) ? res.data : []);
      setForm({ sales_order_id: '', ship_date: new Date().toISOString().split('T')[0], carrier: '', tracking_number: '', ship_via: '', freight_charge: 0, notes: '', lines: [] });
      setShowNew(true);
    } catch { toast.error('Failed to load orders'); }
  };

  const handleOrderSelect = async (orderId) => {
    if (!orderId) { setForm({ ...form, sales_order_id: '', lines: [] }); return; }
    try {
      const res = await api.get(`/api/sales/orders/${orderId}`);
      const lines = (res.data.lines || []).map(l => ({
        ...l, ship_qty: Math.max(0, (parseFloat(l.quantity_ordered) || 0) - (parseFloat(l.quantity_shipped) || 0))
      }));
      setForm({ ...form, sales_order_id: orderId, lines });
    } catch { toast.error('Failed to load order lines'); }
  };

  const handleSave = async () => {
    try {
      const payload = {
        sales_order_id: parseInt(form.sales_order_id),
        ship_date: form.ship_date,
        carrier: form.carrier,
        tracking_number: form.tracking_number,
        ship_via: form.ship_via,
        freight_charge: parseFloat(form.freight_charge) || 0,
        notes: form.notes,
        lines: form.lines.filter(l => parseFloat(l.ship_qty) > 0).map(l => ({
          sales_order_line_id: l.id, quantity_shipped: parseFloat(l.ship_qty), description: l.description
        }))
      };
      await api.post('/api/sales/shipments', payload);
      toast.success('Shipment created');
      setShowNew(false);
      fetchShipments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleMarkShipped = async () => {
    try {
      await api.post(`/api/sales/shipments/${selected.id}/ship`);
      toast.success('Marked as shipped');
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleCreateInvoice = async (shipment) => {
    try {
      const s = shipment || selected;
      const res = await api.post(`/api/sales/shipments/${s.id}/create-invoice`);
      toast.success(`Invoice ${res.data.invoice_number} created`);
      if (selected) openDetail(selected);
      fetchShipments();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  const updateLineQty = (idx, val) => { const lines = [...form.lines]; lines[idx] = { ...lines[idx], ship_qty: val }; setForm({ ...form, lines }); };

  return (
    <div className="p-3 h-full flex flex-col">
      <div className="erp-toolbar mb-2">
        <button className="erp-btn erp-btn-primary" onClick={openNew}>+ New Shipment</button>
        <div className="erp-toolbar-separator"></div>
        <input className="erp-form-input w-48" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchShipments()} />
        <select className="erp-form-select ml-2" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All</option><option value="pending">Pending</option><option value="shipped">Shipped</option><option value="delivered">Delivered</option>
        </select>
        <button className="erp-btn ml-2" onClick={fetchShipments}>Refresh</button>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>Shipment#</th><th>Date</th><th>Order#</th><th>Customer</th><th>Carrier</th><th>Tracking</th><th>Items</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {shipments.length === 0 ? <tr><td colSpan="9" className="text-center p-4 text-gray-500">No shipments</td></tr> : shipments.map(s => (
              <tr key={s.id} className="cursor-pointer" onClick={() => openDetail(s)}>
                <td className="text-blue-700 font-bold">{s.shipment_number || s.shipment_no}</td>
                <td>{formatDate(s.ship_date || s.shipment_date)}</td>
                <td className="text-purple-700">{s.order_number || '-'}</td>
                <td>{s.customer_name || '-'}</td>
                <td>{s.carrier || '-'}</td>
                <td className="text-[10px]">{s.tracking_number || '-'}</td>
                <td className="text-center">{s.line_count || '-'}</td>
                <td><span className={`erp-status erp-status-${(s.status || '').toLowerCase()}`}>{s.status}</span></td>
                <td onClick={e => e.stopPropagation()}>
                  {s.status === 'pending' && <button className="erp-btn text-xs" onClick={() => handleCreateInvoice(s)}>Invoice</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '750px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title">
              <span>Shipment {selected.shipment_number}</span>
              <span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status?.toUpperCase()}</span>
            </div>
            <div className="erp-modal-body" style={{ maxHeight: '65vh' }}>
              <div className="grid grid-cols-4 gap-3 mb-4 text-xs">
                <div><span className="text-gray-500">Customer:</span><br/><strong>{selected.customer_name}</strong></div>
                <div><span className="text-gray-500">Order#:</span><br/><strong className="text-purple-700">{selected.order_number}</strong></div>
                <div><span className="text-gray-500">Ship Date:</span><br/><strong>{formatDate(selected.ship_date || selected.shipment_date)}</strong></div>
                <div><span className="text-gray-500">Carrier:</span><br/><strong>{selected.carrier || '-'}</strong></div>
                <div><span className="text-gray-500">Tracking:</span><br/><strong>{selected.tracking_number || '-'}</strong></div>
                <div><span className="text-gray-500">Ship Via:</span><br/><strong>{selected.ship_via || '-'}</strong></div>
                <div><span className="text-gray-500">Freight:</span><br/><strong>${parseFloat(selected.freight_charge || 0).toFixed(2)}</strong></div>
                {selected.rack_number && <div><span className="text-gray-500">Rack#:</span><br/><strong>{selected.rack_number}</strong></div>}
              </div>

              <div className="erp-tabs">
                {['Items', 'Delivery', 'Scan Verify'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="p-3 border border-t-0" style={{ minHeight: '150px' }}>
                {activeTab === 'Items' && (
                  <table className="erp-grid">
                    <thead><tr><th>#</th><th>Description</th><th>Glass Specs</th><th>Qty Shipped</th></tr></thead>
                    <tbody>
                      {(selected.lines || []).length === 0 ? <tr><td colSpan="4" className="text-center p-4 text-gray-500">No line items</td></tr> : selected.lines.map((l, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td className="font-medium">{l.description}</td>
                          <td className="text-[10px]">{[l.glass_type, l.thickness, l.width_inches && l.height_inches ? `${l.width_inches}"×${l.height_inches}"` : '', l.edge_type].filter(Boolean).join(' • ')}</td>
                          <td className="text-right font-bold">{l.quantity_shipped}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {activeTab === 'Delivery' && (
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <div className="font-bold mb-2">Shipping Details</div>
                      <div className="space-y-1">
                        <div><span className="text-gray-500">Carrier:</span> {selected.carrier || '-'}</div>
                        <div><span className="text-gray-500">Ship Via:</span> {selected.ship_via || '-'}</div>
                        <div><span className="text-gray-500">Tracking#:</span> {selected.tracking_number || '-'}</div>
                        <div><span className="text-gray-500">Freight Charge:</span> ${parseFloat(selected.freight_charge || 0).toFixed(2)}</div>
                      </div>
                    </div>
                    <div>
                      <div className="font-bold mb-2">Glass Handling</div>
                      <div className="space-y-1">
                        <div><span className="text-gray-500">Rack Number:</span> {selected.rack_number || 'Not assigned'}</div>
                        <div><span className="text-gray-500">Delivery Route:</span> {selected.delivery_route || 'Not assigned'}</div>
                        {selected.notes && <div><span className="text-gray-500">Notes:</span> {selected.notes}</div>}
                      </div>
                    </div>
                  </div>
                )}
                {activeTab === 'Scan Verify' && (
                  <div style={{padding:'16px'}}>
                    <ScanPanel 
                      mode="ship" 
                      title="Scan to Verify Shipment" 
                      context={{ so_id: selected?.sales_order_id || selected?.id || null }}
                      onScanResult={(r) => { toast.success('Verified: ' + (r.data?.item_number || r.message || '')); }}
                    />
                    <div style={{color:'#666', fontSize:'12px', marginTop:'8px'}}>
                      Scan each item barcode to verify it matches the sales order before shipping. Ensures correct items are packed.
                    </div>
                  </div>
                )}

              </div>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'pending' && <button className="erp-btn erp-btn-primary" onClick={handleMarkShipped}>📦 Mark as Shipped</button>}
              {['pending', 'shipped'].includes(selected.status) && <button className="erp-btn" style={{ background: '#8e44ad', color: 'white' }} onClick={() => handleCreateInvoice()}>💰 Create Invoice</button>}
              <DocumentActions documentType="packing_slip" documentId={selected.id} recipientEmail={selected.customer_email} recipientName={selected.customer_name} compact />
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* New Shipment Modal */}
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
                <div className="erp-form-group"><label className="erp-form-label">Carrier:</label><input className="erp-form-input" value={form.carrier} onChange={e => setForm({ ...form, carrier: e.target.value })} placeholder="UPS, FedEx, Flatbed" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Tracking#:</label><input className="erp-form-input" value={form.tracking_number} onChange={e => setForm({ ...form, tracking_number: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Ship Via:</label><input className="erp-form-input" value={form.ship_via} onChange={e => setForm({ ...form, ship_via: e.target.value })} placeholder="Ground, Air, LTL" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Freight $:</label><input className="erp-form-input" type="number" step="0.01" value={form.freight_charge} onChange={e => setForm({ ...form, freight_charge: e.target.value })} /></div>
              </div>
              {form.lines.length > 0 && (
                <div>
                  <div className="text-xs font-bold mb-1">Select quantities to ship:</div>
                  <table className="erp-grid">
                    <thead><tr><th>Description</th><th>Glass Specs</th><th>Ordered</th><th>Already Shipped</th><th>Ship Now</th></tr></thead>
                    <tbody>{form.lines.map((l, i) => (
                      <tr key={i}>
                        <td>{l.description}</td>
                        <td className="text-[10px]">{l.glass_type} {l.thickness} {l.width_inches && l.height_inches ? `${l.width_inches}"×${l.height_inches}"` : ''}</td>
                        <td className="text-right">{l.quantity_ordered}</td>
                        <td className="text-right">{l.quantity_shipped || 0}</td>
                        <td><input className="erp-form-input w-16 text-right" type="number" min="0" max={parseFloat(l.quantity_ordered) - parseFloat(l.quantity_shipped || 0)} value={l.ship_qty} onChange={e => updateLineQty(i, e.target.value)} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
              <div className="mt-2 erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-12" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!form.sales_order_id || form.lines.filter(l => parseFloat(l.ship_qty) > 0).length === 0}>🚚 Ship</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export default Shipments;
