import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';

function ProductionSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [dateRange, setDateRange] = useState('week');

  useEffect(() => { fetchSchedule(); }, [dateRange]);

  const fetchSchedule = async () => {
    try { const res = await api.get('/api/manufacturing/schedule', { params: { range: dateRange } }); setSchedule(Array.isArray(res.data) ? res.data : []); } catch { setSchedule([]); }
  };

  const statusColors = { planned: 'bg-gray-200 text-gray-700', scheduled: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', completed: 'bg-green-100 text-green-700' };
  const priorityIcons = { urgent: '🔴', high: '🟠', normal: '🔵', low: '⚪' };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Production Schedule</span>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchSchedule}>Refresh</button>
        <div className="erp-toolbar-separator" />
        <select className="erp-form-select text-xs" value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="erp-table w-full">
          <thead><tr>
            <th>Pri</th><th>WO#</th><th>Product Type</th><th>Item</th><th>Size</th><th>Qty</th><th>Status</th><th>Current Station</th><th>Start Date</th><th>Due Date</th><th>Customer</th>
          </tr></thead>
          <tbody>
            {schedule.map(wo => (
              <tr key={wo.id} className={wo.priority === 'urgent' ? 'bg-red-50' : ''}>
                <td className="text-center">{priorityIcons[wo.priority] || '🔵'}</td>
                <td className="font-bold text-blue-700 text-xs">{wo.order_number}</td>
                <td className="text-xs capitalize">{(wo.product_type || '').replace(/_/g, ' ')}</td>
                <td className="text-xs">{wo.item_number}</td>
                <td className="text-xs">{wo.width && wo.height ? `${wo.width}" x ${wo.height}"` : '-'}</td>
                <td className="text-xs font-bold">{wo.quantity}</td>
                <td><span className={`text-[10px] px-2 py-0.5 rounded ${statusColors[wo.status] || ''}`}>{wo.status}</span></td>
                <td className="text-xs">{wo.station_icon} {wo.current_station_name || '-'}</td>
                <td className="text-xs">{formatDate(wo.start_date)}</td>
                <td className="text-xs text-red-600 font-bold">{formatDate(wo.finish_date)}</td>
                <td className="text-xs">{wo.customer_name || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {schedule.length === 0 && <div className="text-center text-gray-500 py-8">No scheduled work orders</div>}
      </div>
    </div>
  );
}
export default ProductionSchedule;
