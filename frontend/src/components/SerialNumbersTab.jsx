import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { formatDate } from '../utils/formatDate';

/**
 * Reusable Serial Numbers Tab component.
 * Can be embedded in Work Orders, Sales Orders, Shipments, and Invoices.
 * Props:
 *   - workOrderId: filter by WO
 *   - salesOrderId: filter by SO
 *   - shipmentId: filter by shipment
 *   - customerId: filter by customer
 *   - showAssign: show assign-to-order/shipment buttons
 *   - assignContext: { sales_order_id, shipment_id } for assignment actions
 */
function SerialNumbersTab({ workOrderId, salesOrderId, shipmentId, customerId, showAssign, assignContext }) {
  const [serials, setSerials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => { fetchSerials(); }, [workOrderId, salesOrderId, shipmentId, customerId]);

  const fetchSerials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (workOrderId) params.append('work_order_id', workOrderId);
      if (salesOrderId) params.append('sales_order_id', salesOrderId);
      if (shipmentId) params.append('shipment_id', shipmentId);
      if (customerId) params.append('customer_id', customerId);
      const res = await api.get(`/api/manufacturing/serial-numbers?${params.toString()}`);
      setSerials(Array.isArray(res.data) ? res.data : []);
    } catch { setSerials([]); }
    setLoading(false);
  };

  const toggleSelect = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selected.length === serials.length) setSelected([]);
    else setSelected(serials.map(s => s.id));
  };

  const handleAssignToOrder = async () => {
    if (!assignContext?.sales_order_id || selected.length === 0) return;
    setAssigning(true);
    try {
      await api.post('/api/manufacturing/serial-numbers/assign-to-order', {
        serial_ids: selected,
        sales_order_id: assignContext.sales_order_id
      });
      setSelected([]);
      fetchSerials();
    } catch { }
    setAssigning(false);
  };

  const handleAssignToShipment = async () => {
    if (!assignContext?.shipment_id || selected.length === 0) return;
    setAssigning(true);
    try {
      await api.post('/api/manufacturing/serial-numbers/assign-to-shipment', {
        serial_ids: selected,
        shipment_id: assignContext.shipment_id,
        sales_order_id: assignContext.sales_order_id
      });
      setSelected([]);
      fetchSerials();
    } catch { }
    setAssigning(false);
  };

  const handleUnassign = async () => {
    if (selected.length === 0) return;
    setAssigning(true);
    try {
      await api.post('/api/manufacturing/serial-numbers/unassign', { serial_ids: selected });
      setSelected([]);
      fetchSerials();
    } catch { }
    setAssigning(false);
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

  if (loading) return <div className="text-center py-6 text-gray-500 text-sm">Loading serial numbers...</div>;

  return (
    <div>
      {/* Action Bar */}
      {showAssign && serials.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs text-gray-500">{selected.length} selected</span>
          {assignContext?.sales_order_id && (
            <button
              onClick={handleAssignToOrder}
              disabled={selected.length === 0 || assigning}
              className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white px-3 py-1 rounded"
            >
              Assign to Order
            </button>
          )}
          {assignContext?.shipment_id && (
            <button
              onClick={handleAssignToShipment}
              disabled={selected.length === 0 || assigning}
              className="text-xs bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white px-3 py-1 rounded"
            >
              Assign to Shipment (Mark Sold)
            </button>
          )}
          {selected.length > 0 && (
            <button
              onClick={handleUnassign}
              disabled={assigning}
              className="text-xs bg-gray-500 hover:bg-gray-600 text-white px-3 py-1 rounded"
            >
              Unassign
            </button>
          )}
        </div>
      )}

      {serials.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          No serial numbers found for this record.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border">
            <thead className="bg-gray-100">
              <tr>
                {showAssign && (
                  <th className="px-2 py-2 w-8">
                    <input type="checkbox" checked={selected.length === serials.length} onChange={selectAll} />
                  </th>
                )}
                <th className="px-3 py-2 text-left font-medium">Serial Number</th>
                <th className="px-3 py-2 text-left font-medium">Item</th>
                <th className="px-3 py-2 text-left font-medium">Status</th>
                <th className="px-3 py-2 text-left font-medium">WO</th>
                <th className="px-3 py-2 text-left font-medium">SO</th>
                <th className="px-3 py-2 text-left font-medium">Customer</th>
                <th className="px-3 py-2 text-left font-medium">Location</th>
                <th className="px-3 py-2 text-left font-medium">Manufactured</th>
              </tr>
            </thead>
            <tbody>
              {serials.map(sn => (
                <tr key={sn.id} className="border-t hover:bg-gray-50">
                  {showAssign && (
                    <td className="px-2 py-2">
                      <input type="checkbox" checked={selected.includes(sn.id)} onChange={() => toggleSelect(sn.id)} />
                    </td>
                  )}
                  <td className="px-3 py-2 font-mono font-medium text-blue-700">{sn.serial_number}</td>
                  <td className="px-3 py-2">{sn.item_number || sn.item_description || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${statusColor(sn.status)}`}>
                      {sn.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{sn.wo_number || '—'}</td>
                  <td className="px-3 py-2">{sn.so_number || '—'}</td>
                  <td className="px-3 py-2">{sn.customer_name || '—'}</td>
                  <td className="px-3 py-2">{sn.location_name || '—'}</td>
                  <td className="px-3 py-2">{sn.manufactured_date ? formatDate(sn.manufactured_date) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-2 text-xs text-gray-400">{serials.length} serial number(s)</div>
        </div>
      )}
    </div>
  );
}

export default SerialNumbersTab;
