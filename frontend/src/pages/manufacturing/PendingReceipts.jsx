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
  const [sequences, setSequences] = useState([]);
  const [generatedSerials, setGeneratedSerials] = useState(null); // after receipt
  const [serialLookup, setSerialLookup] = useState('');
  const [serialResult, setSerialResult] = useState(null);
  const [serialStats, setSerialStats] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // pending | lookup | all
  const [allSerials, setAllSerials] = useState([]);
  const [serialFilter, setSerialFilter] = useState({ search: '', status: '', work_order_id: '' });
  const [form, setForm] = useState({
    quantity_completed: '',
    quantity_scrapped: '',
    serial_prefix: '',
    serial_pad_length: '4',
    lot_number: '',
    location_id: '',
    notes: ''
  });

  useEffect(() => { fetchPending(); fetchLocations(); fetchSequences(); fetchStats(); }, []);

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

  const fetchSequences = async () => {
    try {
      const res = await api.get('/api/manufacturing/serial-number-sequences');
      setSequences(Array.isArray(res.data) ? res.data : []);
    } catch { setSequences([]); }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/api/manufacturing/serial-numbers-summary');
      setSerialStats(res.data);
    } catch { }
  };

  const fetchAllSerials = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.work_order_id) params.append('work_order_id', filters.work_order_id);
      const res = await api.get(`/api/manufacturing/serial-numbers?${params.toString()}`);
      setAllSerials(Array.isArray(res.data) ? res.data : []);
    } catch { setAllSerials([]); }
  };

  const openReceiptForm = (wo) => {
    setSelectedWO(wo);
    // Auto-suggest prefix: use item's serial_prefix if set, otherwise derive from item_number
    const itemPrefix = wo.item_serial_prefix || (wo.item_number ? wo.item_number.replace(/[^A-Z0-9]/gi, '') + '-' : 'SN-');
    setForm({
      quantity_completed: wo.quantity || '',
      quantity_scrapped: '0',
      serial_prefix: wo.serial_control ? itemPrefix : '',
      serial_pad_length: '4',
      lot_number: `LOT-${new Date().toISOString().slice(0,10)}`,
      location_id: wo.location_id || '',
      notes: ''
    });
    setGeneratedSerials(null);
    setShowReceiptForm(true);
  };

  const closeForm = () => {
    setShowReceiptForm(false);
    setSelectedWO(null);
    setGeneratedSerials(null);
  };

  // Preview what serial numbers will be generated
  const getSerialPreview = () => {
    if (!form.serial_prefix || !form.quantity_completed) return [];
    const qty = parseInt(form.quantity_completed) || 0;
    const padLen = parseInt(form.serial_pad_length) || 4;
    // Find the next number for this prefix from sequences
    const seq = sequences.find(s => s.prefix === form.serial_prefix);
    const nextNum = seq ? seq.next_number : 1;
    const preview = [];
    const showMax = Math.min(qty, 10);
    for (let i = 0; i < showMax; i++) {
      preview.push(form.serial_prefix + String(nextNum + i).padStart(padLen, '0'));
    }
    if (qty > 10) preview.push(`... and ${qty - 10} more`);
    return preview;
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (!form.quantity_completed || parseFloat(form.quantity_completed) <= 0) {
      toast.error('Quantity completed is required');
      return;
    }
    if (selectedWO.serial_control && !form.serial_prefix) {
      toast.error('Serial number prefix is required for serial-controlled items');
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        work_order_id: selectedWO.id,
        quantity_completed: parseFloat(form.quantity_completed),
        quantity_scrapped: parseFloat(form.quantity_scrapped) || 0,
        serial_prefix: form.serial_prefix.trim(),
        serial_pad_length: parseInt(form.serial_pad_length) || 4,
        lot_number: form.lot_number.trim() || null,
        location_id: form.location_id ? parseInt(form.location_id) : null,
        notes: form.notes.trim() || null
      };
      const res = await api.post('/api/manufacturing/receipts', payload);
      toast.success(`Receipt ${res.data.receipt_number || ''} created! ${res.data.serial_count} serial numbers generated.`);
      setGeneratedSerials(res.data.serial_numbers || []);
      fetchPending();
      fetchSequences();
      fetchStats();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit receipt');
    }
    setSubmitting(false);
  };

  const handleSerialLookup = async () => {
    if (!serialLookup.trim()) return;
    try {
      const res = await api.get(`/api/manufacturing/serial-numbers/${encodeURIComponent(serialLookup.trim())}`);
      setSerialResult(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Serial number not found');
        setSerialResult(null);
      } else {
        toast.error('Lookup failed');
      }
    }
  };

  const statusColor = (status) => {
    const colors = {
      available: 'bg-green-100 text-green-800',
      reserved: 'bg-blue-100 text-blue-800',
      sold: 'bg-purple-100 text-purple-800',
      scrapped: 'bg-red-100 text-red-800',
      in_service: 'bg-yellow-100 text-yellow-800',
      in_transit: 'bg-orange-100 text-orange-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="erp-toolbar flex items-center gap-2 flex-wrap">
          <h2 className="text-base font-bold text-gray-800 mr-2">Serial Number Management</h2>
          {serialStats && (
            <div className="flex gap-2 text-xs">
              <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">{serialStats.available || 0} Available</span>
              <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">{serialStats.reserved || 0} Reserved</span>
              <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded">{serialStats.sold || 0} Sold</span>
              <span className="bg-orange-100 text-orange-800 px-2 py-0.5 rounded">{pendingWOs.length} Pending Receipt</span>
            </div>
          )}
          <div className="flex-1" />
          <button className="erp-toolbar-btn" onClick={() => { fetchPending(); fetchStats(); }}>↻ Refresh</button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-4">
          <div className="flex gap-4">
            {[
              { id: 'pending', label: 'Pending Receipts', count: pendingWOs.length },
              { id: 'lookup', label: 'Serial Lookup' },
              { id: 'all', label: 'All Serial Numbers' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); if (tab.id === 'all') fetchAllSerials(serialFilter); }}
                className={`py-2 px-1 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-600 text-green-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label} {tab.count != null && <span className="ml-1 bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded">{tab.count}</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-auto p-4">
          {/* ===== PENDING RECEIPTS TAB ===== */}
          {activeTab === 'pending' && (
            <>
              <div className="mb-3 bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800">
                <strong>Human Verification Required:</strong> These work orders have completed production. Verify quantity, enter serial number prefix, and confirm quality before receiving into inventory. Each piece will get a unique serial number for full traceability.
              </div>
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
                            <span className="bg-orange-100 text-orange-700 text-xs px-1.5 py-0.5 rounded font-medium">Awaiting Receipt</span>
                            {wo.priority && wo.priority !== 'normal' && (
                              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                wo.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                                wo.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                              }`}>{wo.priority.toUpperCase()}</span>
                            )}
                          </div>
                          <div className="mt-1 text-sm text-gray-700">
                            <span className="font-medium">{wo.item_number}</span>
                            {wo.item_description && <span className="text-gray-500 ml-1">— {wo.item_description}</span>}
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                            <span>Qty: <strong className="text-gray-800">{parseFloat(wo.quantity).toFixed(0)}</strong> pieces</span>
                            {wo.customer_name && <span>Customer: {wo.customer_name}</span>}
                            {wo.so_number && <span>SO: {wo.so_number}</span>}
                            {wo.actual_finish_date && <span>Finished: {formatDate(wo.actual_finish_date)}</span>}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {wo.serial_control ? (
                            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Serial Tracked</span>
                          ) : (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">No Serial</span>
                          )}
                          <button
                            onClick={() => openReceiptForm(wo)}
                            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded shadow-sm whitespace-nowrap"
                          >
                            {wo.serial_control ? 'Receive & Assign Serials' : 'Receive into Inventory'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ===== SERIAL LOOKUP TAB ===== */}
          {activeTab === 'lookup' && (
            <div className="max-w-2xl">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Enter Serial Number</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="erp-form-input flex-1"
                    placeholder="e.g. TG001-0001"
                    value={serialLookup}
                    onChange={e => setSerialLookup(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSerialLookup()}
                  />
                  <button onClick={handleSerialLookup} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium">
                    Lookup
                  </button>
                </div>
              </div>

              {serialResult && (
                <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                  <div className="bg-gray-50 p-4 border-b">
                    <h3 className="font-bold text-lg text-gray-900">{serialResult.serial_number}</h3>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded ${statusColor(serialResult.status)}`}>
                      {serialResult.status?.toUpperCase()}
                    </span>
                  </div>
                  <div className="p-4">
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Full Traceability Chain</h4>
                    <div className="space-y-3">
                      {/* Manufacturing */}
                      <div className="flex items-start gap-3 p-3 bg-blue-50 rounded">
                        <div className="text-blue-600 text-lg">🏭</div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-blue-800">MANUFACTURED</div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            <div>Item: <strong>{serialResult.item_number}</strong> — {serialResult.item_description}</div>
                            <div>Work Order: <strong>{serialResult.wo_number || '—'}</strong></div>
                            <div>Receipt: {serialResult.receipt_number || '—'} ({serialResult.receipt_date ? formatDate(serialResult.receipt_date) : '—'})</div>
                            <div>Lot: {serialResult.lot_number || '—'} | Location: {serialResult.location_name || '—'}</div>
                            <div>QC: <span className={serialResult.qc_status === 'passed' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>{serialResult.qc_status?.toUpperCase()}</span></div>
                          </div>
                        </div>
                      </div>
                      {/* Sales */}
                      <div className="flex items-start gap-3 p-3 bg-green-50 rounded">
                        <div className="text-green-600 text-lg">📋</div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-green-800">SALES ORDER</div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            {serialResult.so_number ? (
                              <>
                                <div>Order: <strong>{serialResult.so_number}</strong></div>
                                <div>Customer: <strong>{serialResult.customer_name || '—'}</strong></div>
                              </>
                            ) : <div className="text-gray-400 italic">Not yet assigned to a sales order</div>}
                          </div>
                        </div>
                      </div>
                      {/* Shipment */}
                      <div className="flex items-start gap-3 p-3 bg-purple-50 rounded">
                        <div className="text-purple-600 text-lg">🚚</div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-purple-800">SHIPMENT</div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            {serialResult.shipment_number ? (
                              <>
                                <div>Shipment: <strong>{serialResult.shipment_number}</strong></div>
                                <div>Ship Date: {serialResult.ship_date ? formatDate(serialResult.ship_date) : '—'}</div>
                              </>
                            ) : <div className="text-gray-400 italic">Not yet shipped</div>}
                          </div>
                        </div>
                      </div>
                      {/* Invoice */}
                      <div className="flex items-start gap-3 p-3 bg-yellow-50 rounded">
                        <div className="text-yellow-600 text-lg">💰</div>
                        <div className="flex-1">
                          <div className="text-xs font-bold text-yellow-800">INVOICE</div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            {serialResult.invoice_number ? (
                              <div>Invoice: <strong>{serialResult.invoice_number}</strong></div>
                            ) : <div className="text-gray-400 italic">No invoice linked</div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    {serialResult.qc_notes && (
                      <div className="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <strong>Notes:</strong> {serialResult.qc_notes}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== ALL SERIAL NUMBERS TAB ===== */}
          {activeTab === 'all' && (
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                <input
                  type="text"
                  className="erp-form-input w-48"
                  placeholder="Search serial..."
                  value={serialFilter.search}
                  onChange={e => setSerialFilter(f => ({ ...f, search: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && fetchAllSerials(serialFilter)}
                />
                <select
                  className="erp-form-input w-36"
                  value={serialFilter.status}
                  onChange={e => { const f = { ...serialFilter, status: e.target.value }; setSerialFilter(f); fetchAllSerials(f); }}
                >
                  <option value="">All Status</option>
                  <option value="available">Available</option>
                  <option value="reserved">Reserved</option>
                  <option value="sold">Sold</option>
                  <option value="scrapped">Scrapped</option>
                </select>
                <button onClick={() => fetchAllSerials(serialFilter)} className="erp-toolbar-btn">Search</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left p-2 font-medium">Serial Number</th>
                      <th className="text-left p-2 font-medium">Item</th>
                      <th className="text-left p-2 font-medium">Work Order</th>
                      <th className="text-left p-2 font-medium">Sales Order</th>
                      <th className="text-left p-2 font-medium">Customer</th>
                      <th className="text-left p-2 font-medium">Status</th>
                      <th className="text-left p-2 font-medium">Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allSerials.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-400">No serial numbers found. Use filters or receive a WO to generate serials.</td></tr>
                    ) : allSerials.map(sn => (
                      <tr key={sn.id} className="border-b hover:bg-gray-50 cursor-pointer" onClick={() => { setSerialLookup(sn.serial_number); setActiveTab('lookup'); handleSerialLookup(); }}>
                        <td className="p-2 font-mono font-medium text-blue-700">{sn.serial_number}</td>
                        <td className="p-2">{sn.item_number || '—'}</td>
                        <td className="p-2">{sn.wo_number || '—'}</td>
                        <td className="p-2">{sn.so_number || '—'}</td>
                        <td className="p-2">{sn.customer_name || '—'}</td>
                        <td className="p-2"><span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(sn.status)}`}>{sn.status}</span></td>
                        <td className="p-2">{sn.location_name || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

              {generatedSerials ? (
                // ===== POST-RECEIPT: Show generated serial numbers =====
                <div className="p-4">
                  <div className="bg-green-50 border border-green-200 rounded p-3 mb-4">
                    <div className="text-green-800 font-bold text-sm">✅ Receipt Complete!</div>
                    <div className="text-green-700 text-xs mt-1">{generatedSerials.length} serial numbers generated and assigned to this work order.</div>
                  </div>
                  <div className="border rounded max-h-60 overflow-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="text-left p-2">#</th>
                          <th className="text-left p-2">Serial Number</th>
                          <th className="text-left p-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {generatedSerials.map((sn, idx) => (
                          <tr key={idx} className="border-t">
                            <td className="p-2 text-gray-400">{idx + 1}</td>
                            <td className="p-2 font-mono font-medium text-blue-700">{sn}</td>
                            <td className="p-2"><span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded text-xs">Available</span></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => { navigator.clipboard.writeText(generatedSerials.join('\n')); toast.success('Serial numbers copied to clipboard'); }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded"
                    >
                      Copy All to Clipboard
                    </button>
                    <button onClick={closeForm} className="flex-1 border border-gray-300 text-gray-700 text-sm py-2 rounded hover:bg-gray-50">
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                // ===== RECEIPT FORM =====
                <form onSubmit={handleSubmitReceipt} className="p-4 space-y-4">
                  {/* Quantity Section */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Qty Completed <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number" step="1" min="1"
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
                        type="number" step="1" min="0"
                        className="erp-form-input w-full"
                        value={form.quantity_scrapped}
                        onChange={e => setForm(f => ({ ...f, quantity_scrapped: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Serial Number Prefix Section - only for serial-controlled items */}
                  {selectedWO.serial_control ? (
                  <div className="border border-blue-200 bg-blue-50 rounded p-3">
                    <label className="text-xs font-bold text-blue-800 block mb-2">
                      Serial Number Generation <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-0.5">Prefix</label>
                        <input
                          type="text"
                          placeholder="e.g. TG001-"
                          className="erp-form-input w-full text-sm font-mono"
                          value={form.serial_prefix}
                          onChange={e => setForm(f => ({ ...f, serial_prefix: e.target.value }))}
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-0.5">Digits</label>
                        <select
                          className="erp-form-input w-full text-sm"
                          value={form.serial_pad_length}
                          onChange={e => setForm(f => ({ ...f, serial_pad_length: e.target.value }))}
                        >
                          <option value="3">3 (001)</option>
                          <option value="4">4 (0001)</option>
                          <option value="5">5 (00001)</option>
                          <option value="6">6 (000001)</option>
                        </select>
                      </div>
                    </div>
                    {/* Preview */}
                    {form.serial_prefix && form.quantity_completed && (
                      <div className="mt-2 p-2 bg-white rounded border border-blue-100">
                        <div className="text-xs font-medium text-gray-600 mb-1">Preview ({parseInt(form.quantity_completed) || 0} serials):</div>
                        <div className="flex flex-wrap gap-1">
                          {getSerialPreview().map((sn, i) => (
                            <span key={i} className="font-mono text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                              {sn}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-blue-600 mt-1.5">
                      Each piece gets a unique serial number. Numbers auto-increment from last used.
                    </div>
                  </div>
                  ) : (
                  <div className="border border-gray-200 bg-gray-50 rounded p-3">
                    <div className="text-xs text-gray-600">
                      <strong>No Serial Tracking:</strong> This item does not have serial control enabled. To enable serial numbers, go to Inventory → Items → edit this item and check "Serial Control".
                    </div>
                  </div>
                  )}

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

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Notes / QC Comments</label>
                    <textarea
                      rows={2}
                      placeholder="Quality inspection notes..."
                      className="erp-form-input w-full text-sm"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    />
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 border rounded p-3 text-xs text-gray-600">
                    <strong>On Submit:</strong> {selectedWO.serial_control
                      ? `${parseInt(form.quantity_completed) || 0} individual serial numbers will be created, materials backflushed, finished goods added to stock, and GL entries posted.`
                      : `Qty ${parseInt(form.quantity_completed) || 0} will be received into inventory, materials backflushed, and GL entries posted (no serial numbers).`
                    }
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-medium py-2.5 rounded shadow text-sm"
                    >
                      {submitting ? 'Processing...' : (selectedWO.serial_control ? `Receive & Generate ${parseInt(form.quantity_completed) || 0} Serial Numbers` : `Receive ${parseInt(form.quantity_completed) || 0} into Inventory`)}
                    </button>
                    <button type="button" onClick={closeForm} className="px-4 py-2.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-sm">
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}

export default PendingReceipts;
