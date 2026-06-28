import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';
import { formatDate } from '../../utils/formatDate';

function PendingReceipts() {
  const [pendingWOs, setPendingWOs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedWO, setSelectedWO] = useState(null);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState([]);
  const [form, setForm] = useState({
    quantity_completed: '',
    quantity_scrapped: '',
    serial_number_start: '',
    serial_number_end: '',
    lot_number: '',
    location_id: '',
    notes: ''
  });

  useEffect(() => { fetchPending(); fetchLocations(); }, []);

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/manufacturing/work-orders/awaiting-receipt');
      setPendingWOs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error('Failed to load pending receipts');
      setPendingWOs([]);
    }
    setLoading(false);
  };

  const fetchLocations = async () => {
    try {
      const res = await api.get('/api/inventory/locations');
      setLocations(Array.isArray(res.data) ? res.data : []);
    } catch { setLocations([]); }
  };

  const openReceiptForm = (wo) => {
    setSelectedWO(wo);
    setForm({
      quantity_completed: wo.quantity_completed || wo.quantity || '',
      quantity_scrapped: wo.qty_scrapped || '0',
      serial_number_start: '',
      serial_number_end: '',
      lot_number: wo.lot_number || '',
      location_id: wo.location_id || '',
      notes: ''
    });
    setShowReceiptForm(true);
  };

  const closeForm = () => {
    setShowReceiptForm(false);
    setSelectedWO(null);
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!form.quantity_completed || parseFloat(form.quantity_completed) <= 0) {
      toast.error('Quantity completed is required');
      return;
    }
    if (!form.serial_number_start) {
      toast.error('Serial number start is required for traceability');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        work_order_id: selectedWO.id,
        quantity_completed: parseFloat(form.quantity_completed),
        quantity_scrapped: parseFloat(form.quantity_scrapped) || 0,
        serial_number_start: form.serial_number_start.trim(),
        serial_number_end: form.serial_number_end.trim() || form.serial_number_start.trim(),
        lot_number: form.lot_number.trim() || null,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        notes: form.notes.trim() || null
      };
      const res = await api.post('/api/manufacturing/receipts', payload);
      toast.success(`Receipt ${res.data.receipt_number || ''} created successfully! Inventory updated.`);
      closeForm();
      fetchPending();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit receipt');
    }
    setSubmitting(false);
  };

  const generateSerialSuggestion = () => {
    if (!selectedWO) return;
    const today = new Date();
    const prefix = `SN-${today.getFullYear()}-`;
    const qty = parseInt(form.quantity_completed) || 1;
    const startNum = String(Math.floor(Math.random() * 900) + 100).padStart(4, '0');
    const endNum = String(parseInt(startNum) + qty - 1).padStart(4, '0');
    setForm(f => ({
      ...f,
      serial_number_start: `${prefix}${startNum}`,
      serial_number_end: `${prefix}${endNum}`
    }));
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="erp-toolbar flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 mr-2">Pending Receipts</h2>
          <span className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">
            {pendingWOs.length} Awaiting Verification
          </span>
          <div className="flex-1" />
          <button className="erp-toolbar-btn" onClick={fetchPending}>↻ Refresh</button>
        </div>

        {/* Info Banner */}
        <div className="mx-4 mt-2 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
          <strong>Human Verification Required:</strong> These work orders have completed production and are waiting for a human to verify quantity, enter serial numbers, and confirm quality before receiving finished goods into inventory.
        </div>

        {/* Pending WOs List */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : pendingWOs.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-2">✅</div>
              <div className="text-gray-600 font-medium">No Work Orders Awaiting Receipt</div>
              <div className="text-gray-400 text-sm mt-1">All completed WOs have been received into inventory.</div>
            </div>
          ) : (
            <div className="grid gap-3">
              {pendingWOs.map(wo => (
                <div key={wo.id} className="bg-white border border-orange-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-900 text-sm">{wo.order_number}</span>
                        <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded font-medium">
                          Awaiting Receipt
                        </span>
                        {wo.priority && wo.priority !== 'normal' && (
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            wo.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                            wo.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {wo.priority.toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm text-gray-700">
                        <span className="font-medium">{wo.item_number}</span>
                        {wo.item_description && <span className="text-gray-500 ml-1">— {wo.item_description}</span>}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span>Qty: <strong className="text-gray-800">{parseFloat(wo.quantity).toFixed(0)}</strong></span>
                        {wo.product_type && <span>Type: {wo.product_type.replace(/_/g, ' ')}</span>}
                        {wo.glass_type && <span>Glass: {wo.glass_type}</span>}
                        {wo.thickness && <span>{wo.thickness}mm</span>}
                        {wo.width && wo.height && <span>{parseFloat(wo.width).toFixed(0)}x{parseFloat(wo.height).toFixed(0)}</span>}
                        {wo.customer_name && <span>Customer: {wo.customer_name}</span>}
                        {wo.so_number && <span>SO: {wo.so_number}</span>}
                        {wo.actual_finish_date && <span>Finished: {formatDate(wo.actual_finish_date)}</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => openReceiptForm(wo)}
                      className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded shadow-sm whitespace-nowrap"
                    >
                      Receive
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Receipt Form Modal */}
        {showReceiptForm && selectedWO && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-auto">
              {/* Modal Header */}
              <div className="bg-green-600 text-white p-4 rounded-t-lg">
                <h3 className="font-bold text-lg">Receive Work Order</h3>
                <div className="text-green-100 text-sm mt-0.5">
                  {selectedWO.order_number} — {selectedWO.item_number} {selectedWO.item_description}
                </div>
              </div>

              <form onSubmit={handleSubmitReceipt} className="p-4 space-y-4">
                {/* Quantity Section */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Qty Completed <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      className="erp-form-input w-full"
                      value={form.quantity_completed}
                      onChange={e => setForm(f => ({ ...f, quantity_completed: e.target.value }))}
                      required
                    />
                    <div className="text-xs text-gray-400 mt-0.5">WO Qty: {parseFloat(selectedWO.quantity).toFixed(0)}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Qty Scrapped</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      className="erp-form-input w-full"
                      value={form.quantity_scrapped}
                      onChange={e => setForm(f => ({ ...f, quantity_scrapped: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Serial Number Section */}
                <div className="border border-blue-200 bg-blue-50 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-blue-800">
                      Serial Numbers <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={generateSerialSuggestion}
                      className="text-xs text-blue-600 hover:text-blue-800 underline"
                    >
                      Auto-generate
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">Start</label>
                      <input
                        type="text"
                        placeholder="e.g. SN-2026-001"
                        className="erp-form-input w-full text-sm"
                        value={form.serial_number_start}
                        onChange={e => setForm(f => ({ ...f, serial_number_start: e.target.value }))}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-0.5">End</label>
                      <input
                        type="text"
                        placeholder="e.g. SN-2026-010"
                        className="erp-form-input w-full text-sm"
                        value={form.serial_number_end}
                        onChange={e => setForm(f => ({ ...f, serial_number_end: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="text-xs text-blue-600 mt-1.5">
                    Each piece gets a unique serial number for warranty & defect tracking.
                  </div>
                </div>

                {/* Lot & Location */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Lot Number</label>
                    <input
                      type="text"
                      placeholder="e.g. LOT-2026-06-28"
                      className="erp-form-input w-full"
                      value={form.lot_number}
                      onChange={e => setForm(f => ({ ...f, lot_number: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                    <select
                      className="erp-form-input w-full"
                      value={form.location_id}
                      onChange={e => setForm(f => ({ ...f, location_id: e.target.value }))}
                    >
                      <option value="">-- Select --</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.location_name || loc.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Notes / QC Comments */}
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes / QC Comments</label>
                  <textarea
                    rows={3}
                    placeholder="Quality inspection notes, visual defects, packaging info..."
                    className="erp-form-input w-full text-sm"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  />
                </div>

                {/* Summary */}
                <div className="bg-gray-50 border rounded p-3 text-xs text-gray-600">
                  <strong>On Submit:</strong> Materials will be backflushed from inventory, finished goods added to stock, GL entries posted, and WO status set to Completed.
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded shadow text-sm"
                  >
                    {submitting ? 'Processing...' : 'Confirm Receipt & Update Inventory'}
                  </button>
                  <button
                    type="button"
                    onClick={closeForm}
                    className="px-4 py-2.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}

export default PendingReceipts;
