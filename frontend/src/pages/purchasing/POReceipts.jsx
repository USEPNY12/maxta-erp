import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function POReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poLines, setPoLines] = useState([]);
  const [form, setForm] = useState({
    purchase_order_id: '', receipt_date: new Date().toISOString().split('T')[0], location_id: '', notes: '', lines: []
  });

  useEffect(() => { fetchReceipts(); }, []);

  const fetchReceipts = async () => {
    try { const res = await api.get('/api/purchasing/receipts'); setReceipts(Array.isArray(res.data) ? res.data : []); } catch { setReceipts([]); }
  };

  const fetchPOs = async () => {
    try { const res = await api.get('/api/purchasing/purchase-orders', { params: { status: 'approved' } }); setPurchaseOrders(Array.isArray(res.data) ? res.data : res.data.orders || []); } catch { setPurchaseOrders([]); }
  };

  const handlePOChange = async (poId) => {
    setForm({...form, purchase_order_id: poId, lines: []});
    if (!poId) { setPoLines([]); return; }
    try {
      const res = await api.get(`/api/purchasing/purchase-orders/${poId}`);
      const lines = (res.data.lines || []).map(l => ({
        po_line_id: l.id, item_id: l.item_id, item_number: l.item_number, item_description: l.description,
        qty_ordered: l.quantity, qty_received: l.quantity_received || 0, quantity_received: 0, lot_number: '', serial_number: ''
      }));
      setPoLines(lines);
      setForm(f => ({...f, lines}));
    } catch { setPoLines([]); }
  };

  const updateLine = (idx, field, value) => {
    const lines = [...form.lines];
    lines[idx] = {...lines[idx], [field]: value};
    setForm({...form, lines});
  };

  const handleNew = () => {
    fetchPOs();
    setForm({ purchase_order_id: '', receipt_date: new Date().toISOString().split('T')[0], location_id: '', notes: '', lines: [] });
    setPoLines([]);
    setShowModal(true);
  };

  const handleSave = async () => {
    const linesToSend = form.lines.filter(l => l.quantity_received > 0);
    if (linesToSend.length === 0) { toast.error('Enter quantities to receive'); return; }
    try {
      await api.post('/api/purchasing/receipts', { ...form, lines: linesToSend });
      toast.success('PO Receipt created - inventory updated');
      setShowModal(false);
      fetchReceipts();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> Receive PO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchReceipts}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print Receipt</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Receipt #</th><th>PO #</th><th>Vendor</th><th>Date</th><th>Items Received</th></tr>
          </thead>
          <tbody>
            {receipts.map(r => (
              <tr key={r.id}>
                <td className="text-blue-700 font-bold">{r.receipt_number}</td>
                <td>{r.po_number}</td>
                <td>{r.vendor_name}</td>
                <td>{r.receipt_date}</td>
                <td>{r.line_count || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '850px' }}>
            <div className="erp-modal-title"><span>Receive Purchase Order</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="erp-form-group"><label className="erp-form-label">Purchase Order:</label>
                  <select className="erp-form-select" value={form.purchase_order_id} onChange={e => handlePOChange(e.target.value)}>
                    <option value="">Select PO...</option>
                    {purchaseOrders.map(po => <option key={po.id} value={po.id}>{po.po_number} - {po.vendor_name}</option>)}
                  </select>
                </div>
                <div className="erp-form-group"><label className="erp-form-label">Receipt Date:</label><input type="date" className="erp-form-input" value={form.receipt_date} onChange={e => setForm({...form, receipt_date: e.target.value})} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Location:</label><input className="erp-form-input" value={form.location_id} onChange={e => setForm({...form, location_id: e.target.value})} placeholder="Warehouse / Bin" /></div>
              </div>

              <div className="border-t border-gray-300 pt-2">
                <h4 className="text-xs font-bold mb-2">PO Lines - Enter Quantities Received:</h4>
                <table className="erp-grid text-xs">
                  <thead><tr><th>Item #</th><th>Description</th><th>Ordered</th><th>Previously Rcvd</th><th>Receive Now</th><th>Lot #</th></tr></thead>
                  <tbody>
                    {form.lines.length === 0 ? (
                      <tr><td colSpan="6" className="text-center p-3 text-gray-500">Select a PO to see lines</td></tr>
                    ) : form.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td className="font-bold">{line.item_number}</td>
                        <td>{line.item_description}</td>
                        <td className="text-right">{line.qty_ordered}</td>
                        <td className="text-right">{line.qty_received}</td>
                        <td><input type="number" className="erp-form-input w-20 text-xs" value={line.quantity_received} onChange={e => updateLine(idx, 'quantity_received', parseFloat(e.target.value) || 0)} /></td>
                        <td><input className="erp-form-input w-28 text-xs" value={line.lot_number} onChange={e => updateLine(idx, 'lot_number', e.target.value)} placeholder="Lot/Batch #" /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-10" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave}>Receive & Update Inventory</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default POReceipts;
