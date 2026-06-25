import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function PurchaseOrders() {
  const [pos, setPos] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchPOs(); }, []);
  const fetchPOs = async () => {
    try { const res = await api.get('/api/purchasing/purchase-orders', { params: { search } }); setPos(res.data); } catch { setPos([]); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New PO</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchPOs}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print</button>
        <button className="erp-toolbar-btn">Receive</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchPOs()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchPOs}>Find</button>
        <div className="ml-auto text-xs">View: <select className="erp-form-select"><option>All Open</option><option>All</option><option>Received</option><option>Closed</option></select></div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>PO No.</th><th>Date</th><th>Vendor</th><th>Type</th><th>Amount</th><th>Status</th><th>Expected Date</th><th>WO Link</th></tr>
          </thead>
          <tbody>
            {pos.length === 0 ? (
              <tr><td colSpan="8" className="text-center p-4">No purchase orders found</td></tr>
            ) : pos.map(po => (
              <tr key={po.id} className="cursor-pointer">
                <td className="text-blue-700 font-bold">{po.po_number}</td>
                <td>{po.po_date}</td>
                <td>{po.vendor_name}</td>
                <td>{po.po_type}</td>
                <td className="text-right">${parseFloat(po.total_amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${po.status?.toLowerCase()}`}>{po.status}</span></td>
                <td>{po.expected_date}</td>
                <td>{po.wo_number || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default PurchaseOrders;
