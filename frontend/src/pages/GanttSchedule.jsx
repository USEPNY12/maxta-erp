import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaCalendarAlt, FaPlus, FaMagic, FaChevronLeft, FaChevronRight, FaExpand } from 'react-icons/fa';

export default function GanttSchedule() {
  const [entries, setEntries] = useState([]);
  const [capacity, setCapacity] = useState([]);
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewDays, setViewDays] = useState(14);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCapacity, setShowCapacity] = useState(false);
  const ganttRef = useRef(null);

  useEffect(() => { loadData(); }, [startDate, viewDays]);

  const loadData = async () => {
    setLoading(true);
    try {
      const end = new Date(startDate);
      end.setDate(end.getDate() + viewDays);
      const [entriesRes, capRes, woRes] = await Promise.all([
        api.get('/api/scheduling/entries', { params: { start_date: startDate, end_date: end.toISOString().split('T')[0] } }),
        api.get('/api/scheduling/capacity', { params: { date: startDate } }),
        api.get('/api/manufacturing/work-orders', { params: { status: 'open,released,in-progress' } })
      ]);
      setEntries(entriesRes.data.entries || []);
      setCapacity(capRes.data.capacity || []);
      setWorkOrders(woRes.data.work_orders || woRes.data || []);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const autoSchedule = async (woId) => {
    try {
      const res = await api.post(`/api/scheduling/auto-schedule/${woId}`);
      toast.success(res.data.message);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const updateEntry = async (id, updates) => {
    try {
      await api.put(`/api/scheduling/entries/${id}`, updates);
      loadData();
    } catch (err) { toast.error('Failed to update'); }
  };

  const deleteEntry = async (id) => {
    try {
      await api.delete(`/api/scheduling/entries/${id}`);
      toast.info('Entry removed');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const shiftDays = (days) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + days);
    setStartDate(d.toISOString().split('T')[0]);
  };

  // Generate date columns
  const dates = [];
  for (let i = 0; i < viewDays; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }

  // Group entries by work center
  const workCenters = [...new Set((entries || []).map(e => e.work_center_name || 'Unassigned'))];
  const groupedEntries = {};
  workCenters.forEach(wc => { groupedEntries[wc] = entries.filter(e => (e.work_center_name || 'Unassigned') === wc); });

  // Calculate bar position
  const getBarStyle = (entry) => {
    const start = new Date(entry.scheduled_start);
    const end = new Date(entry.scheduled_end);
    const viewStart = new Date(startDate);
    const totalMs = viewDays * 86400000;
    const left = Math.max(0, ((start - viewStart) / totalMs) * 100);
    const width = Math.min(100 - left, ((end - start) / totalMs) * 100);
    return { left: `${left}%`, width: `${Math.max(width, 1)}%` };
  };

  const statusColors = { planned: '#94a3b8', scheduled: '#6366f1', 'in-progress': '#f59e0b', completed: '#10b981', delayed: '#ef4444', blocked: '#dc2626' };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaCalendarAlt className="text-indigo-600" />
          <h1 className="text-lg font-bold text-gray-800">Production Gantt Schedule</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shiftDays(-viewDays)} className="p-1 border rounded hover:bg-gray-100"><FaChevronLeft /></button>
          <input type="date" className="border rounded px-2 py-1 text-xs" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <button onClick={() => shiftDays(viewDays)} className="p-1 border rounded hover:bg-gray-100"><FaChevronRight /></button>
          <select className="border rounded px-2 py-1 text-xs" value={viewDays} onChange={e => setViewDays(parseInt(e.target.value))}>
            <option value="7">1 Week</option><option value="14">2 Weeks</option><option value="30">1 Month</option>
          </select>
          <button onClick={() => setShowCapacity(!showCapacity)} className={`px-2 py-1 text-xs rounded border ${showCapacity ? 'bg-indigo-100 text-indigo-700' : ''}`}>Capacity</button>
          <button onClick={() => setStartDate(new Date().toISOString().split('T')[0])} className="px-2 py-1 text-xs rounded border hover:bg-gray-100">Today</button>
        </div>
      </div>

      {/* Capacity Panel */}
      {showCapacity && (
        <div className="bg-indigo-50 border-b px-4 py-2 overflow-x-auto">
          <div className="flex gap-3">
            {capacity.map(c => {
              const utilization = c.effective_capacity ? (c.scheduled_hours / c.effective_capacity * 100) : 0;
              const barColor = utilization > 100 ? 'bg-red-500' : utilization > 80 ? 'bg-yellow-500' : 'bg-green-500';
              return (
                <div key={c.id} className="min-w-[140px] bg-white rounded border p-2 text-xs">
                  <div className="font-medium">{c.name}</div>
                  <div className="text-gray-500">{c.scheduled_hours?.toFixed(1)}h / {c.effective_capacity || 0}h</div>
                  <div className="w-full bg-gray-200 rounded h-2 mt-1">
                    <div className={`h-2 rounded ${barColor}`} style={{ width: `${Math.min(utilization, 100)}%` }}></div>
                  </div>
                  {c.is_closed && <div className="text-red-500 mt-1">CLOSED: {c.override_reason}</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Work Orders */}
        <div className="w-64 border-r bg-gray-50 overflow-auto">
          <div className="p-2 border-b bg-white sticky top-0">
            <h3 className="text-xs font-bold text-gray-700">Unscheduled Work Orders</h3>
          </div>
          <div className="p-2 space-y-1">
            {(Array.isArray(workOrders) ? workOrders : []).filter(wo => !entries.some(e => e.work_order_id === wo.id)).slice(0, 20).map(wo => (
              <div key={wo.id} className="bg-white border rounded p-2 text-xs">
                <div className="font-medium">{wo.wo_number}</div>
                <div className="text-gray-500 truncate">{wo.product_description}</div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-gray-400">Qty: {wo.quantity}</span>
                  <button onClick={() => autoSchedule(wo.id)} className="px-2 py-0.5 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700 flex items-center gap-1"><FaMagic size={8} /> Schedule</button>
                </div>
              </div>
            ))}
            {(Array.isArray(workOrders) ? workOrders : []).filter(wo => !entries.some(e => e.work_order_id === wo.id)).length === 0 && (
              <div className="text-xs text-gray-400 text-center p-4">All work orders scheduled</div>
            )}
          </div>
        </div>

        {/* Gantt Chart */}
        <div className="flex-1 overflow-auto" ref={ganttRef}>
          {/* Date Headers */}
          <div className="sticky top-0 bg-white border-b z-10 flex">
            <div className="w-32 min-w-[128px] border-r p-1 text-xs font-medium bg-gray-100">Work Center</div>
            <div className="flex-1 flex">
              {dates.map((d, i) => {
                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                const isToday = d.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
                return (
                  <div key={i} className={`flex-1 min-w-[40px] text-center text-xs p-1 border-r ${isWeekend ? 'bg-gray-100' : ''} ${isToday ? 'bg-blue-50 font-bold' : ''}`}>
                    <div>{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                    <div>{d.getDate()}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt Rows */}
          {workCenters.length === 0 && (
            <div className="p-8 text-center text-gray-400 text-sm">
              No scheduled entries. Select a work order from the left panel and click "Schedule" to auto-schedule it.
            </div>
          )}
          {workCenters.map(wc => (
            <div key={wc} className="flex border-b min-h-[48px]">
              <div className="w-32 min-w-[128px] border-r p-1 text-xs font-medium bg-gray-50 flex items-center">{wc}</div>
              <div className="flex-1 relative">
                {/* Grid lines */}
                <div className="absolute inset-0 flex">
                  {dates.map((d, i) => (
                    <div key={i} className={`flex-1 border-r ${d.getDay() === 0 || d.getDay() === 6 ? 'bg-gray-50' : ''}`}></div>
                  ))}
                </div>
                {/* Bars */}
                {groupedEntries[wc]?.map(entry => {
                  const style = getBarStyle(entry);
                  return (
                    <div key={entry.id} className="absolute top-1 h-8 rounded px-1 flex items-center text-xs text-white cursor-pointer group" style={{ ...style, backgroundColor: entry.color || statusColors[entry.status] || '#6366f1', minWidth: '20px' }} title={`${entry.wo_number} - ${entry.title}\n${new Date(entry.scheduled_start).toLocaleString()} → ${new Date(entry.scheduled_end).toLocaleString()}`}>
                      <span className="truncate text-[10px]">{entry.wo_number}</span>
                      <div className="hidden group-hover:flex absolute -top-6 left-0 bg-black text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap z-20">
                        {entry.wo_number} | {entry.title} | {entry.duration_hours}h
                      </div>
                      {/* Status actions on hover */}
                      <div className="hidden group-hover:flex absolute -bottom-6 left-0 gap-1 z-20">
                        {entry.status !== 'completed' && <button onClick={() => updateEntry(entry.id, { status: 'in-progress' })} className="px-1 py-0.5 bg-yellow-500 text-white rounded text-[9px]">Start</button>}
                        {entry.status !== 'completed' && <button onClick={() => updateEntry(entry.id, { status: 'completed' })} className="px-1 py-0.5 bg-green-500 text-white rounded text-[9px]">Done</button>}
                        <button onClick={() => deleteEntry(entry.id)} className="px-1 py-0.5 bg-red-500 text-white rounded text-[9px]">×</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="bg-gray-100 border-t px-4 py-1 flex items-center gap-4 text-xs">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: color }}></div>
            <span className="capitalize">{status}</span>
          </div>
        ))}
        <span className="ml-auto text-gray-500">{entries.length} entries scheduled</span>
      </div>
    </div>
  );
}
