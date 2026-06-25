import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function SalesOrders() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchOrders(); }, []);
  const fetchOrders = async () => {
    try { const res = await api.get('/api/sales/orders', { params: { search } }); setOrders(res.data); } catch { setOrders([]); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Order</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchOrders}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print</button>
        <button className="erp-toolbar-btn">Create WO</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchOrders()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchOrders}>Find</button>
        <div className="ml-auto text-xs">View: <select className="erp-form-select"><option>All Open</option><option>All</option><option>Shipped</option><option>Closed</option></select></div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Order No.</th><th>Date</th><th>Customer</th><th>PO Number</th><th>Ship Date</th><th>Amount</th><th>Status</th><th>Salesperson</th></tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr><td colSpan="8" className="text-center p-4">No orders found</td></tr>
            ) : orders.map(o => (
              <tr key={o.id} className="cursor-pointer">
                <td className="text-blue-700 font-bold">{o.order_no}</td>
                <td>{o.order_date}</td>
                <td>{o.customer_name}</td>
                <td>{o.customer_po}</td>
                <td>{o.ship_date}</td>
                <td className="text-right">${parseFloat(o.total_amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${o.status?.toLowerCase()}`}>{o.status}</span></td>
                <td>{o.salesperson}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default SalesOrders;
