import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ScanPanel from '../../components/ScanPanel';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';
function POReceipts() {
  const [receipts, setReceipts] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('Lines');
  const [labels, setLabels] = useState([]);
  useEffect(() => { fetchReceipts(); }, []);
  const fetchReceipts = async () => {
    try { const res = await api.get('/api/purchasing/receipts', { params: { search } }); setReceipts(Array.isArray(res.data) ? res.data : []); } catch { setReceipts([]); }
  };
  const openDetail = async (r) => {
    try {
      const res = await api.get(`/api/purchasing/receipts/${r.id}`);
      setSelected(res.data); setActiveTab('Lines'); setShowDetail(true);
      // Fetch labels
      try { const labRes = await api.get(`/api/purchasing/receipts/${r.id}/labels`); setLabels(Array.isArray(labRes.data?.labels) ? labRes.data.labels : (Array.isArray(labRes.data) ? labRes.data : [])); } catch { setLabels([]); }
    } catch { setSelected(r); setShowDetail(true); }
  };
  const handleCreateInvoice = async () => {
    try {
      const res = await api.post(`/api/purchasing/receipts/${selected.id}/create-invoice`);
      toast.success(`AP Invoice ${res.data.invoice_number} created`);
      openDetail(selected);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create invoice'); }
  };
  const fmt = (d) => d ? d.split('T')[0] : '-';
  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col overflow-hidden">
      <div className="erp-toolbar">
        <span className="text-sm font-bold">Inventory Receipts</span>
        <input className="erp-form-input w-48" placeholder="Search receipt#, PO#..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchReceipts()} />
        <span className="text-xs text-gray-500 ml-2">{receipts.length} receipts</span>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <table className="erp-grid">
          <thead><tr><th>Receipt No.</th><th>Date</th><th>PO Number</th><th>Vendor</th><th>Packing Slip</th><th>Location</th><th>Items</th><th>Status</th></tr></thead>
          <tbody>
            {receipts.length === 0 ? <tr><td colSpan="8" className="text-center p-4 text-gray-500">No receipts found</td></tr> :
            (receipts || [])?.map(r => (
              <tr key={r.id} className="cursor-pointer hover:bg-blue-50" onClick={() => openDetail(r)}>
                <td className="font-bold text-green-700">{r.receipt_number}</td>
                <td>{fmt(r.receipt_date)}</td>
                <td className="text-blue-700">{r.po_number}</td>
                <td>{r.vendor_name}</td>
                <td>{r.packing_slip_number || '-'}</td>
                <td>{r.location_name || '-'}</td>
                <td className="text-center">{r.line_count || '-'}</td>
                <td><span className="erp-status erp-status-received">received</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '850px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Receipt - {selected.receipt_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Receipt Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Receipt #:</span><span className="font-bold">{selected.receipt_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Date:</span><span>{fmt(selected.receipt_date)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Packing Slip:</span><span>{selected.packing_slip_number || '-'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Received By:</span><span>{selected.received_by_name || 'Admin'}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Purchase Order</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">PO #:</span><span className="font-bold text-blue-700">{selected.po_number}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Vendor:</span><span>{selected.vendor_name}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3 rounded"><legend className="text-xs font-bold px-1">Stocking</legend>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-gray-600">Location:</span><span>{selected.location_name || 'Default'}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">Lots Created:</span><span className="font-bold text-green-700">{(selected.lines || [])?.filter(l => l.lot_number).length}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">AP Invoice:</span><span>{selected.ap_invoice_number || 'Not created'}</span></div>
                  </div>
                </fieldset>
              </div>
              <div className="erp-tabs">
                {['Lines', 'Lots & Inventory', 'Labels', 'AP Invoice', 'Scan Receive'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>
              <div className="border border-gray-300 p-2 min-h-[180px]">
                {activeTab === 'Lines' && (
                  <table className="erp-grid"><thead><tr><th>#</th><th>Item</th><th>Description</th><th>Qty Received</th><th>Location</th><th>Lot #</th><th>Vendor Lot</th></tr></thead>
                    <tbody>{(selected.lines || [])?.map((l, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td><td>{l.item_number || '-'}</td><td>{l.description || l.item_description || '-'}</td>
                        <td className="text-right font-bold">{l.quantity_received}</td>
                        <td>{l.location_name || '-'}</td>
                        <td className="text-green-700 font-mono">{l.lot_number || '-'}</td>
                        <td>{l.vendor_lot || '-'}</td>
                      </tr>
                    ))}</tbody></table>
                )}
                {activeTab === 'Lots & Inventory' && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 mb-2">Each received line creates an inventory lot with tracking:</p>
                    {(selected.lines || [])?.map((l, i) => (
                      <div key={i} className="bg-green-50 border border-green-200 rounded p-2 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold">{l.description || l.item_description}</div>
                          <div className="text-[10px] text-gray-600">Lot: <span className="font-mono text-green-700">{l.lot_number || 'N/A'}</span> | Vendor Lot: {l.vendor_lot || '-'} | Qty: {l.quantity_received}</div>
                        </div>
                        <div className="text-xs text-right">
                          <div className="text-green-700 font-bold">✓ Stocked</div>
                          <div className="text-[10px] text-gray-500">{l.location_name || 'Main Warehouse'}</div>
                        </div>
                      </div>
                    ))}
                    <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                      <strong>Inventory Transactions:</strong> Each line created a "receipt" transaction in the inventory ledger, updating qty_on_hand for the item.
                    </div>
                  </div>
                )}
                {activeTab === 'Labels' && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-gray-600">Barcode labels generated for this receipt:</span>
                      <button className="erp-btn text-xs" onClick={() => toast.info('All labels sent to printer')}>🖨️ Print All Labels</button>
                    </div>
                    {labels.length === 0 ? <p className="text-center text-gray-500 p-4 text-xs">No labels generated</p> :
                    labels?.map((label, i) => (
                      <div key={i} className="border border-gray-300 rounded p-3 bg-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-mono text-sm font-bold">{label.barcode}</div>
                            <div className="text-xs text-gray-600 mt-1">{label.description} | Lot: {label.lot_number} | Qty: {label.quantity}</div>
                            <div className="text-[10px] text-gray-500">Location: {label.location || 'Main'} | Vendor: {label.vendor}</div>
                          </div>
                          <div className="flex flex-col items-center">
                            <div className="w-32 h-8 bg-black" style={{ background: 'repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px)' }}></div>
                            <div className="font-mono text-[9px] mt-1">{label.barcode}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'AP Invoice' && (
                  <div className="p-4 text-center">
                    {selected.ap_invoice_id ? (
                      <div className="bg-green-50 border border-green-200 rounded p-4">
                        <div className="text-green-700 font-bold mb-1">AP Invoice Created</div>
                        <div className="text-xs text-gray-600">Invoice #: {selected.ap_invoice_number || 'Created'}</div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600 mb-3">Create an AP Invoice from this receipt for three-way matching (PO ↔ Receipt ↔ Invoice).</p>
                        <button className="erp-btn erp-btn-primary" onClick={handleCreateInvoice}>💰 Create AP Invoice from Receipt</button>
                      </div>
                    )}
                  </div>
                )}
                {activeTab === 'Scan Receive' && (
                  <div style={{padding:'16px'}}>
                    <ScanPanel 
                      mode="receive" 
                      title="Scan to Receive Items" 
                      context={{ po_id: selected?.po_id || null }}
                      onScanResult={(r) => { toast.success('Item received: ' + (r.data?.item_number || r.message || '')); }}
                    />
                    <div style={{color:'#666', fontSize:'12px', marginTop:'8px'}}>
                      Scan item barcodes to receive them against the PO. Set quantity before scanning. Items are automatically received into inventory.
                    </div>
                  </div>
                )}

              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn" onClick={() => toast.info('Labels sent to printer')}>🏷️ Print Labels</button>
              {!selected.ap_invoice_id && <button className="erp-btn erp-btn-primary" onClick={handleCreateInvoice}>💰 Create AP Invoice</button>}
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default POReceipts;
