import { useState, useEffect } from 'react';
import api from '../../services/api';

export default function ScheduleGantt() {
  const [ganttData, setGanttData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ start: today(), end: addDays(today(), 14) });
  const [selectedBlock, setSelectedBlock] = useState(null);
  const [showAutoSchedule, setShowAutoSchedule] = useState(false);
  const [capacityView, setCapacityView] = useState([]);

  function today() { return new Date().toISOString().split('T')[0]; }
  function addDays(date, days) { return new Date(new Date(date).getTime() + days * 86400000).toISOString().split('T')[0]; }

  useEffect(() => { fetchGantt(); fetchCapacity(); }, [dateRange]);

  async function fetchGantt() {
    try {
      setLoading(true);
      const res = await api.get('/manufacturing-advanced/schedule/gantt', { params: { start_date: dateRange.start, end_date: dateRange.end } });
      setGanttData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function fetchCapacity() {
    try {
      const res = await api.get('/manufacturing-advanced/schedule/capacity', { params: { start_date: dateRange.start, end_date: dateRange.end } });
      setCapacityView(res.data);
    } catch (err) { console.error(err); }
  }

  async function handleAutoSchedule() {
    try {
      const res = await api.post('/manufacturing-advanced/schedule/auto-schedule', { start_date: dateRange.start });
      alert(`Auto-scheduled ${res.data.scheduled} operations`);
      fetchGantt();
      fetchCapacity();
    } catch (err) { alert('Auto-schedule failed: ' + err.message); }
  }

  async function handleDeleteBlock(id) {
    if (!confirm('Remove this scheduling block?')) return;
    try {
      await api.delete(`/manufacturing-advanced/schedule/blocks/${id}`);
      setSelectedBlock(null);
      fetchGantt();
    } catch (err) { alert('Delete failed'); }
  }

  // Calculate Gantt timeline
  const startDate = new Date(dateRange.start);
  const endDate = new Date(dateRange.end);
  const totalDays = Math.ceil((endDate - startDate) / 86400000) + 1;
  const dayWidth = 120; // pixels per day

  function getBlockPosition(block) {
    const blockStart = new Date(block.block_start);
    const blockEnd = new Date(block.block_end);
    const left = ((blockStart - startDate) / 86400000) * dayWidth;
    const width = Math.max(((blockEnd - blockStart) / 86400000) * dayWidth, 20);
    return { left, width };
  }

  if (loading && !ganttData) return <div className="p-6 text-center">Loading Schedule...</div>;

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-2xl font-bold text-gray-800">Finite Capacity Schedule</h1>
        <div className="flex items-center gap-2">
          <input type="date" value={dateRange.start} onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
          <span className="text-gray-400">to</span>
          <input type="date" value={dateRange.end} onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))} className="border rounded px-2 py-1 text-sm" />
          <button onClick={handleAutoSchedule} className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700">
            Auto-Schedule
          </button>
          <button onClick={fetchGantt} className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
            Refresh
          </button>
        </div>
      </div>

      {/* Capacity Utilization Bar */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-sm font-semibold mb-2 text-gray-600">Capacity Utilization</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          {capacityView?.map(wc => (
            <div key={wc.id} className="text-center">
              <div className="text-xs font-medium mb-1">{wc.code}</div>
              <div className="w-full bg-gray-200 rounded-full h-4 relative">
                <div
                  className={`h-4 rounded-full ${wc.utilization_percent > 90 ? 'bg-red-500' : wc.utilization_percent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(wc.utilization_percent, 100)}%` }}
                ></div>
                <span className="absolute inset-0 text-xs font-bold flex items-center justify-center">{wc.utilization_percent}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <div style={{ minWidth: `${totalDays * dayWidth + 160}px` }}>
            {/* Timeline Header */}
            <div className="flex border-b bg-gray-50 sticky top-0 z-10">
              <div className="w-40 flex-shrink-0 px-3 py-2 font-semibold text-sm border-r">Work Center</div>
              <div className="flex">
                {Array.from({ length: totalDays }, (_, i) => {
                  const d = new Date(startDate.getTime() + i * 86400000);
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                  return (
                    <div key={i} className={`text-center text-xs py-2 border-r ${isWeekend ? 'bg-gray-100' : ''}`} style={{ width: dayWidth }}>
                      <div className="font-medium">{d.toLocaleDateString('en', { weekday: 'short' })}</div>
                      <div className="text-gray-400">{d.getMonth() + 1}/{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gantt Rows */}
            {ganttData?.workCenters?.map(wc => {
              const wcBlocks = ganttData.blocks?.filter(b => b.work_center_id === wc.id);
              return (
                <div key={wc.id} className="flex border-b hover:bg-gray-50">
                  <div className="w-40 flex-shrink-0 px-3 py-3 text-sm font-medium border-r flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: wc.color || '#3b82f6' }}></span>
                    {wc.code}
                  </div>
                  <div className="relative" style={{ width: totalDays * dayWidth, height: '48px' }}>
                    {/* Weekend shading */}
                    {Array.from({ length: totalDays }, (_, i) => {
                      const d = new Date(startDate.getTime() + i * 86400000);
                      if (d.getDay() === 0 || d.getDay() === 6) {
                        return <div key={i} className="absolute top-0 bottom-0 bg-gray-100 opacity-50" style={{ left: i * dayWidth, width: dayWidth }}></div>;
                      }
                      return null;
                    })}
                    {/* Blocks */}
                    {wcBlocks?.map(block => {
                      const pos = getBlockPosition(block);
                      const typeColors = { production: '#3b82f6', setup: '#f59e0b', maintenance: '#ef4444', reserved: '#8b5cf6', break: '#6b7280' };
                      return (
                        <div
                          key={block.id}
                          className="absolute top-2 h-8 rounded cursor-pointer shadow-sm hover:shadow-md transition-shadow flex items-center px-1 overflow-hidden"
                          style={{ left: pos.left, width: pos.width, backgroundColor: typeColors[block.block_type] || '#3b82f6' }}
                          onClick={() => setSelectedBlock(block)}
                          title={`${block.wo_number || 'N/A'} | ${block.block_type} | ${new Date(block.block_start).toLocaleString()}`}
                        >
                          <span className="text-white text-xs font-medium truncate">{block.wo_number || block.block_type}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Block Detail Panel */}
      {selectedBlock && (
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{selectedBlock.wo_number || 'Block'} - {selectedBlock.block_type}</h3>
              <p className="text-sm text-gray-600">{selectedBlock.work_center_name} ({selectedBlock.work_center_code})</p>
              <p className="text-sm text-gray-500 mt-1">
                {new Date(selectedBlock.block_start).toLocaleString()} → {new Date(selectedBlock.block_end).toLocaleString()}
              </p>
              {selectedBlock.wo_description && <p className="text-sm mt-1">{selectedBlock.wo_description}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleDeleteBlock(selectedBlock.id)} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">Remove</button>
              <button onClick={() => setSelectedBlock(null)} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-600">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500"></span> Production</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500"></span> Setup</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500"></span> Maintenance</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-purple-500"></span> Reserved</span>
      </div>
    </div>
  );
}
