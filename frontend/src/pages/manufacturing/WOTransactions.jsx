import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function WOTransactions() {
  const [receipts, setReceipts] = useState([]);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [filter, setFilter] = useState({ start_date: '' });

  useEffect(() => { fetchReceipts(); }, []);

  const fetchReceipts = async () => {
    try {
      const res = await api.get('/api/manufacturing/receipts', { params: filter });
      setReceipts(Array.isArray(res.data) ? res.data : []);
    } catch { setReceipts([]); }
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Receipt</button>
        <button className="erp-toolbar-btn">WO Material</button>
        <button className="erp-toolbar-btn">WO Labor</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn">Delete</button>
        <button className="erp-toolbar-btn">Post</button>
        <button className="erp-toolbar-btn">Print</button>
        <button className="erp-toolbar-btn" onClick={fetchReceipts}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Start Date:</span>
        <input type="date" className="erp-form-input w-32 ml-1" value={filter.start_date} onChange={e => setFilter({...filter, start_date: e.target.value})} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Sidebar */}
        <div className="w-44 bg-gray-50 border-r border-gray-300 flex flex-col text-xs">
          <div className="p-2 border-b border-gray-200">
            <a href="#" className="text-green-700 block mb-1">New Receipt</a>
            <a href="#" className="text-red-600 block mb-1">Delete Selected Receipt</a>
            <a href="#" className="text-blue-700 block">Post Receipts</a>
          </div>
          <div className="p-2 border-b border-gray-200">
            <span className="font-bold">Print</span>
            <a href="#" className="text-blue-700 block mt-1">Receipts Listing</a>
            <a href="#" className="text-blue-700 block">Print Receipt Labels</a>
            <a href="#" className="text-blue-700 block">Preview Receipt Labels</a>
          </div>
          <div className="p-2 border-b border-gray-200 flex-1">
            <div className="font-bold mb-1">Navigation</div>
            <a href="/manufacturing" className="block text-blue-700 mb-1">Manufacturing Home</a>
            <a href="/manufacturing/work-orders" className="block text-blue-700 mb-1">Work Orders</a>
            <a href="/manufacturing/labor" className="block text-blue-700 mb-1">Labor</a>
            <a href="#" className="block text-blue-700 mb-1 font-bold bg-orange-100 px-1">WO Transactions</a>
            <a href="/manufacturing/bom" className="block text-blue-700 mb-1">Bill of Materials (BOM)</a>
            <a href="#" className="block text-blue-700 mb-1">Forecasting</a>
            <a href="#" className="block text-blue-700 mb-1">MRP</a>
            <a href="#" className="block text-blue-700 mb-1">Production Schedule</a>
            <a href="#" className="block text-blue-700 mb-1">Finished Goods</a>
          </div>
          <div className="p-2 border-t border-gray-200">
            <span className="font-bold">Reports</span>
            <div className="mt-1">
              <label className="text-xs">Type:</label>
              <select className="erp-form-select w-full"><option>Manufacturing</option></select>
            </div>
            <div className="mt-1">
              <label className="text-xs">Report:</label>
              <select className="erp-form-select w-full"><option>Work Order Status</option></select>
            </div>
            <a href="#" className="text-blue-700 text-xs mt-1 block">Go</a>
          </div>
        </div>

        {/* Middle - Receipt List */}
        <div className="w-96 border-r border-gray-300 overflow-auto">
          <table className="erp-grid text-xs">
            <thead>
              <tr><th>Date</th><th>Receipt No.</th><th>Type</th><th>Order No.</th><th>WO Type</th><th>Qty Received</th><th>Item No</th></tr>
            </thead>
            <tbody>
              {(receipts || [])?.map(r => (
                <tr key={r.id} className={`cursor-pointer ${selectedReceipt?.id === r.id ? 'bg-blue-200' : ''}`} onClick={() => setSelectedReceipt(r)}>
                  <td>{r.receipt_date}</td>
                  <td className="font-bold">{r.receipt_no}</td>
                  <td>{r.type || 'Receipt'}</td>
                  <td>{r.wo_number}</td>
                  <td>{r.wo_type}</td>
                  <td className="text-right">{r.qty_completed}</td>
                  <td>{r.item_no}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Right - Receipt Detail */}
        <div className="flex-1 overflow-auto p-3">
          {selectedReceipt ? (
            <div className="border border-gray-400 bg-white">
              <div className="bg-gray-200 border-b border-gray-400 px-3 py-1 flex justify-between">
                <span className="font-bold text-sm">Receipt {selectedReceipt.receipt_no}</span>
                <span className={`text-xs px-2 py-0.5 rounded ${selectedReceipt.posted ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>
                  {selectedReceipt.posted ? 'POSTED' : 'DRAFT'}
                </span>
              </div>
              <div className="p-3 text-xs space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex"><span className="w-24 text-gray-600">Order no.:</span><span className="font-bold">{selectedReceipt.wo_number}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Receipt no.:</span><span>{selectedReceipt.receipt_no}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Date:</span><span>{selectedReceipt.receipt_date}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Item:</span><span className="font-bold">{selectedReceipt.item_no}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Qty Completed:</span><span className="font-bold">{selectedReceipt.qty_completed}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Qty Scrapped:</span><span>{selectedReceipt.qty_scrapped || 0}</span></div>
                    <div className="flex"><span className="w-24 text-gray-600">Location:</span><span>{selectedReceipt.location}</span></div>
                  </div>
                  <div className="space-y-1">
                    <div className="font-bold border-b border-gray-300 pb-1 mb-1">Cost Details</div>
                    <div className="grid grid-cols-3 gap-1 text-center">
                      <span></span><span className="font-bold">Estimated</span><span className="font-bold">Actual</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span>Material:</span><span className="text-right">${selectedReceipt.est_material_cost || '0.00'}</span><span className="text-right">${selectedReceipt.act_material_cost || '0.00'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span>Labor:</span><span className="text-right">${selectedReceipt.est_labor_cost || '0.00'}</span><span className="text-right">${selectedReceipt.act_labor_cost || '0.00'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      <span>Overhead:</span><span className="text-right">${selectedReceipt.est_overhead_cost || '0.00'}</span><span className="text-right">${selectedReceipt.act_overhead_cost || '0.00'}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1 font-bold border-t border-gray-300 pt-1">
                      <span>Total:</span><span className="text-right">${selectedReceipt.est_total || '0.00'}</span><span className="text-right">${selectedReceipt.act_total || '0.00'}</span>
                    </div>
                  </div>
                </div>

                {/* Materials Tab */}
                <div className="border-t border-gray-300 pt-2">
                  <div className="flex gap-4 border-b border-gray-300 mb-2">
                    <span className="text-xs font-bold border-b-2 border-blue-600 pb-1">Materials</span>
                    <span className="text-xs text-gray-500 pb-1">Routing</span>
                    <span className="text-xs text-gray-500 pb-1">Co-Products</span>
                  </div>
                  <table className="erp-grid text-xs">
                    <thead><tr><th>Seq</th><th>Item No.</th><th>Description</th><th>Remaining</th><th>Qty Used</th><th>Total Qty</th><th>Qty To Date</th></tr></thead>
                    <tbody>
                      {(selectedReceipt.materials || [])?.map((m, i) => (
                        <tr key={i}>
                          <td>{m.seq}</td><td className="text-blue-700">{m.item_no}</td><td>{m.description}</td>
                          <td className="text-right">{m.remaining}</td><td className="text-right">{m.qty_used}</td>
                          <td className="text-right">{m.total_qty}</td><td className="text-right">{m.qty_to_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="border-t border-gray-300 p-2 flex gap-2 justify-end">
                <button className="erp-btn text-xs">Print Receipt Label</button>
                <button className="erp-btn erp-btn-primary text-xs">Save & Post</button>
                <button className="erp-btn text-xs">OK</button>
                <button className="erp-btn text-xs">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500 mt-16">Select a receipt from the list to view details</div>
          )}
        </div>
      </div>
    </div>
    </ModulePage>
  );
}

export default WOTransactions;
