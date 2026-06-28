import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function ProductionSchedule() {
  const [schedule, setSchedule] = useState([]);
  const [dateRange, setDateRange] = useState('week');
  const [viewMode, setViewMode] = useState('list');
  const [filterStation, setFilterStation] = useState('');
  const [workCenters, setWorkCenters] = useState([]);
  const navigate = useNavigate();

  useEffect(() => { fetchSchedule(); fetchWorkCenters(); }, [dateRange]);

  const fetchSchedule = async () => {
    try {
      const res = await api.get('/api/manufacturing/schedule', { params: { range: dateRange } });
      setSchedule(Array.isArray(res.data) ? res.data : []);
    } catch { setSchedule([]); }
  };

  const fetchWorkCenters = async () => {
    try { const res = await api.get('/api/manufacturing/work-centers'); setWorkCenters(res.data || []); } catch { setWorkCenters([]); }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const isOverdue = (wo) => wo.finish_date && new Date(wo.finish_date) < new Date() && wo.status !== 'completed';
  const isDueSoon = (wo) => {
    if (!wo.finish_date) return false;
    const diff = (new Date(wo.finish_date) - new Date()) / (1000*60*60*24);
    return diff >= 0 && diff <= 2;
  };

  const statusColors = {
    planned: 'bg-gray-200 text-gray-700',
    scheduled: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-yellow-100 text-yellow-800',
    released: 'bg-purple-100 text-purple-700',
    completed: 'bg-green-100 text-green-700'
  };

  const priorityIcons = { urgent: '🔴', high: '🟠', normal: '🔵', low: '⚪' };

  const openWorkOrder = (wo) => {
    navigate(`/manufacturing/work-orders?wo=${wo.id}`);
  };

  const filteredSchedule = filterStation
    ? schedule?.filter(wo => wo.current_station_name === filterStation)
    : schedule;

  // Board view columns
  const boardStations = ['Cutting Table', 'Edge Polisher', 'CNC/Waterjet', 'Wash Line', 'Tempering Oven', 'Lamination Line', 'Quality Control', 'Packing Station'];

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Production Schedule</span>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchSchedule}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Period:</span>
        <select className="erp-form-select text-xs ml-1" value={dateRange} onChange={e => setDateRange(e.target.value)}>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
          <option value="all">All</option>
        </select>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">View:</span>
        <button className={`erp-toolbar-btn ${viewMode === 'list' ? 'bg-blue-100' : ''}`} onClick={() => setViewMode('list')}>📋 List</button>
        <button className={`erp-toolbar-btn ${viewMode === 'board' ? 'bg-blue-100' : ''}`} onClick={() => setViewMode('board')}>📊 Board</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Station:</span>
        <select className="erp-form-select text-xs ml-1 w-36" value={filterStation} onChange={e => setFilterStation(e.target.value)}>
          <option value="">All Stations</option>
          {workCenters?.map(wc => <option key={wc.id} value={wc.name}>{wc.name}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-gray-500">{filteredSchedule.length} work orders</span>
      </div>

      {/* Summary Bar */}
      <div className="flex gap-4 px-3 py-2 bg-gray-50 border-b text-xs">
        <span className="font-bold">Total: {schedule.length}</span>
        <span className="text-yellow-700">⚡ In Progress: {schedule?.filter(w => w.status === 'in_progress').length}</span>
        <span className="text-gray-600">📋 Planned: {schedule?.filter(w => w.status === 'planned').length}</span>
        <span className="text-blue-700">🔵 Scheduled: {schedule?.filter(w => w.status === 'scheduled').length}</span>
        <span className="text-red-700">⚠️ Overdue: {schedule?.filter(w => isOverdue(w)).length}</span>
        <span className="text-orange-600">⏰ Due Soon: {schedule?.filter(w => isDueSoon(w)).length}</span>
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-auto">
          <table className="erp-table w-full">
            <thead>
              <tr>
                <th className="w-8">Pri</th>
                <th>WO#</th>
                <th>Product Type</th>
                <th>Item</th>
                <th>Description</th>
                <th>Size</th>
                <th className="text-right">Qty</th>
                <th>Status</th>
                <th>Current Station</th>
                <th>Start Date</th>
                <th>Due Date</th>
                <th>Customer</th>
                <th>% Done</th>
              </tr>
            </thead>
            <tbody>
              {filteredSchedule?.map(wo => (
                <tr
                  key={wo.id}
                  className={`cursor-pointer hover:bg-blue-50 ${isOverdue(wo) ? 'bg-red-50 hover:bg-red-100' : isDueSoon(wo) ? 'bg-orange-50 hover:bg-orange-100' : ''}`}
                  onClick={() => openWorkOrder(wo)}
                >
                  <td className="text-center">{priorityIcons[wo.priority] || '🔵'}</td>
                  <td className="font-bold text-blue-700 underline cursor-pointer hover:text-blue-900 text-xs">{wo.order_number}</td>
                  <td className="text-xs capitalize">{(wo.product_type || 'custom').replace(/_/g, ' ')}</td>
                  <td className="text-xs font-mono">{wo.item_number || '-'}</td>
                  <td className="text-xs text-gray-600 truncate max-w-[150px]">{wo.item_description || wo.notes || '-'}</td>
                  <td className="text-xs">{wo.width && wo.height ? `${wo.width}" × ${wo.height}"` : '-'}</td>
                  <td className="text-xs font-bold text-right">{wo.quantity}</td>
                  <td><span className={`text-[10px] px-2 py-0.5 rounded ${statusColors[wo.status] || 'bg-gray-100'}`}>{(wo.status || '').replace(/_/g, ' ')}</span></td>
                  <td className="text-xs">{wo.station_icon || ''} {wo.current_station_name || <span className="text-gray-400 italic">Not assigned</span>}</td>
                  <td className="text-xs">{formatDate(wo.start_date)}</td>
                  <td className={`text-xs font-bold ${isOverdue(wo) ? 'text-red-700' : isDueSoon(wo) ? 'text-orange-600' : ''}`}>
                    {formatDate(wo.finish_date)}
                    {isOverdue(wo) && <span className="ml-1 text-[9px] bg-red-600 text-white px-1 rounded">OVERDUE</span>}
                  </td>
                  <td className="text-xs">{wo.customer_name || '-'}</td>
                  <td className="text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-12 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${wo.quantity > 0 ? Math.round((wo.qty_completed || 0) / wo.quantity * 100) : 0}%` }}></div>
                      </div>
                      <span>{wo.quantity > 0 ? Math.round((wo.qty_completed || 0) / wo.quantity * 100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredSchedule.length === 0 && <div className="text-center text-gray-500 py-8">No work orders found for this period</div>}
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-2">
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 h-full">
            {boardStations?.map(station => {
              const stationWOs = schedule?.filter(wo => wo.current_station_name === station);
              return (
                <div key={station} className="bg-gray-50 border rounded overflow-auto min-h-[200px]">
                  <div className="text-[10px] font-bold text-center border-b py-1 bg-gray-100 text-gray-700 sticky top-0">
                    {station}
                    <span className="ml-1 bg-blue-600 text-white rounded-full px-1.5 text-[9px]">{stationWOs.length}</span>
                  </div>
                  <div className="p-1 space-y-1">
                    {stationWOs?.map(wo => (
                      <div
                        key={wo.id}
                        className={`p-1.5 rounded border text-[10px] cursor-pointer hover:shadow-md transition-shadow ${wo.priority === 'urgent' ? 'border-red-400 bg-red-50' : wo.priority === 'high' ? 'border-orange-300 bg-orange-50' : 'bg-white'}`}
                        onClick={() => openWorkOrder(wo)}
                      >
                        <div className="font-bold text-blue-700">{wo.order_number}</div>
                        <div className="text-gray-600 truncate">{wo.item_number || 'Custom'}</div>
                        {wo.width && wo.height && <div className="text-gray-500">{wo.width}" × {wo.height}"</div>}
                        <div className="font-bold">Qty: {wo.quantity}</div>
                        {wo.customer_name && <div className="text-gray-500 truncate">📋 {wo.customer_name}</div>}
                        <div className={`${isOverdue(wo) ? 'text-red-700 font-bold' : 'text-gray-400'}`}>
                          Due: {formatDate(wo.finish_date)}
                        </div>
                      </div>
                    ))}
                    {stationWOs.length === 0 && <div className="text-center text-gray-300 text-[9px] py-4">Empty</div>}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Unassigned WOs */}
          {schedule?.filter(wo => !wo.current_station_name).length > 0 && (
            <div className="mt-3 border rounded p-2 bg-yellow-50">
              <div className="text-xs font-bold text-yellow-800 mb-2">⚠️ Unassigned to Station ({schedule?.filter(wo => !wo.current_station_name).length})</div>
              <div className="flex flex-wrap gap-2">
                {schedule?.filter(wo => !wo.current_station_name)?.map(wo => (
                  <div key={wo.id} className="p-2 bg-white border rounded text-[10px] cursor-pointer hover:shadow" onClick={() => openWorkOrder(wo)}>
                    <span className="font-bold text-blue-700">{wo.order_number}</span>
                    <span className="ml-2 text-gray-600">{wo.item_description || 'No item'}</span>
                    <span className="ml-2">Qty: {wo.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default ProductionSchedule;
