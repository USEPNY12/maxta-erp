import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function WorkOrders() {
  const [workOrders, setWorkOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('Materials');

  useEffect(() => { fetchWOs(); }, []);
  const fetchWOs = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { search } }); setWorkOrders(res.data); } catch { setWorkOrders([]); }
  };

  const openDetail = (wo) => { setSelected(wo); setShowDetail(true); setActiveTab('Materials'); };

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New</button>
        <button className="erp-toolbar-btn">Plan Work Order</button>
        <button className="erp-toolbar-btn text-red-600">✕ Delete</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn">Work Center Load</button>
        <button className="erp-toolbar-btn">Print ▾</button>
        <button className="erp-toolbar-btn">Buy-for-WO</button>
        <button className="erp-toolbar-btn">Subcontract PO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn">Close WO</button>
        <button className="erp-toolbar-btn">Re-Open WO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchWOs}>↻ Refresh</button>
        <div className="ml-auto text-xs">View: <select className="erp-form-select"><option>All Open</option><option>All</option><option>Scheduled</option><option>Released</option><option>Closed</option></select></div>
      </div>

      {/* Search */}
      <div className="bg-gray-100 border-b border-gray-300 p-1 flex gap-2 items-center text-xs">
        <span>Order No.:</span><input className="erp-form-input w-24" />
        <span>Priority:</span><input className="erp-form-input w-20" />
        <span>Item No.:</span><input className="erp-form-input w-32" value={search} onChange={e => setSearch(e.target.value)} />
        <span>Description:</span><input className="erp-form-input w-48" />
        <button className="erp-btn" onClick={fetchWOs}>Find</button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr>
              <th>Date</th><th>Order No.</th><th>Sales Ord</th><th>Priority</th><th>Item</th><th>Description</th><th>Qty</th><th>Status</th><th>Location</th><th>Start Date</th><th>Finish Date</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.length === 0 ? (
              <tr><td colSpan="11" className="text-center p-4">No work orders found</td></tr>
            ) : workOrders.map(wo => (
              <tr key={wo.id} className="cursor-pointer" onDoubleClick={() => openDetail(wo)}>
                <td>{wo.order_date}</td>
                <td className="text-blue-700 font-bold">{wo.wo_number}</td>
                <td>{wo.sales_order_no || ''}</td>
                <td>{wo.priority}</td>
                <td>{wo.item_no}</td>
                <td>{wo.description}</td>
                <td className="text-right">{wo.quantity}</td>
                <td><span className={`erp-status erp-status-${wo.status?.toLowerCase()}`}>{wo.status}</span></td>
                <td>{wo.location}</td>
                <td>{wo.start_date}</td>
                <td>{wo.finish_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Work Order Detail Modal */}
      {showDetail && selected && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '900px', maxHeight: '85vh' }}>
            <div className="erp-modal-title">
              <span>Work Order {selected.wo_number}</span>
              <button className="text-white" onClick={() => setShowDetail(false)}>✕</button>
            </div>
            <div className="erp-modal-body overflow-auto">
              {/* Header */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Order Info</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Order no.:</label><span className="font-bold">{selected.wo_number}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Item:</label><span>{selected.item_no} - {selected.description}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Customer:</label><span>{selected.customer_name || 'N/A'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Sales Order:</label><span>{selected.sales_order_no || 'N/A'}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Priority:</label><span>{selected.priority}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Scheduling:</label><span>Floating</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Additional Fields</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Glass Type:</label><span>{selected.glass_type || ''}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Thickness:</label><span>{selected.thickness || ''}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Edge Type:</label><span>{selected.edge_type || ''}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Tempering:</label><span>{selected.tempering || ''}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Width x Height:</label><span>{selected.width || ''} x {selected.height || ''}</span></div>
                  </div>
                </fieldset>
                <fieldset className="border border-gray-400 p-3">
                  <legend className="text-xs font-bold px-1">Status & Dates</legend>
                  <div className="space-y-1 text-xs">
                    <div className="erp-form-group"><label className="erp-form-label">Status:</label><span className={`erp-status erp-status-${selected.status?.toLowerCase()}`}>{selected.status}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Order Date:</label><span>{selected.order_date}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Quantity:</label><span>{selected.quantity}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Qty Received:</label><span>{selected.qty_received || 0}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Qty Scrapped:</label><span>{selected.qty_scrapped || 0}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Start Date:</label><span>{selected.start_date}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Finish Date:</label><span>{selected.finish_date}</span></div>
                    <div className="erp-form-group"><label className="erp-form-label">Location:</label><span>{selected.location}</span></div>
                  </div>
                </fieldset>
              </div>

              {/* Comments */}
              <div className="mb-3">
                <label className="text-xs font-bold">Comments:</label>
                <textarea className="erp-form-input w-full h-12" defaultValue={selected.comments || ''} />
              </div>

              {/* Tabs */}
              <div className="erp-tabs">
                {['Materials', 'Routing', 'Documents', 'Order List', 'Co-Products'].map(tab => (
                  <div key={tab} className={`erp-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>{tab}</div>
                ))}
              </div>

              {/* Tab Content */}
              <div className="border border-gray-300 p-2 min-h-[200px]">
                {activeTab === 'Materials' && (
                  <div>
                    <div className="flex gap-2 mb-2">
                      <button className="erp-btn text-xs">+ Add Item</button>
                      <button className="erp-btn text-xs">Item Status</button>
                      <button className="erp-btn text-xs">Swap Item</button>
                      <span className="text-xs ml-4">Item No:</span>
                      <input className="erp-form-input w-32" />
                    </div>
                    <table className="erp-grid">
                      <thead>
                        <tr><th>Line</th><th>Item no.</th><th>Description</th><th>Quantity</th><th>Waste %</th><th>Total Qty</th><th>Qty to Date</th></tr>
                      </thead>
                      <tbody>
                        <tr><td colSpan="7" className="text-center p-4 text-gray-500">Materials from BOM will appear here</td></tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {activeTab === 'Routing' && (
                  <table className="erp-grid">
                    <thead>
                      <tr><th>Seq</th><th>Work Center</th><th>Description</th><th>Setup Hrs</th><th>Run Hrs</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      <tr><td colSpan="6" className="text-center p-4 text-gray-500">Routing steps from item routing will appear here</td></tr>
                    </tbody>
                  </table>
                )}
                {activeTab === 'Documents' && <p className="text-xs text-gray-500 p-4">Attached documents and files</p>}
                {activeTab === 'Order List' && <p className="text-xs text-gray-500 p-4">Linked sales orders</p>}
                {activeTab === 'Co-Products' && <p className="text-xs text-gray-500 p-4">Co-products and by-products</p>}
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn">WO Receipt</button>
              <button className="erp-btn erp-btn-primary">OK</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkOrders;
