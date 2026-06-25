import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function Shipments() {
  const [shipments, setShipments] = useState([]);
  useEffect(() => { api.get('/api/sales/shipments').then(r => setShipments(r.data)).catch(() => {}); }, []);

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Shipment</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn">↻ Refresh</button>
        <button className="erp-toolbar-btn">Print BOL</button>
        <button className="erp-toolbar-btn">Print Labels</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Shipment No.</th><th>Date</th><th>Order No.</th><th>Customer</th><th>Carrier</th><th>Tracking</th><th>Status</th></tr>
          </thead>
          <tbody>
            {shipments.length === 0 ? (
              <tr><td colSpan="7" className="text-center p-4">No shipments found</td></tr>
            ) : shipments.map(s => (
              <tr key={s.id}>
                <td className="text-blue-700 font-bold">{s.shipment_no}</td>
                <td>{s.ship_date}</td>
                <td>{s.order_no}</td>
                <td>{s.customer_name}</td>
                <td>{s.carrier}</td>
                <td>{s.tracking_number}</td>
                <td><span className={`erp-status erp-status-${s.status?.toLowerCase()}`}>{s.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Shipments;
