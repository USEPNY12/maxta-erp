import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function ProductionSchedule() {
  const [workOrders, setWorkOrders] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // list or board
  const [filterStation, setFilterStation] = useState('');

  useEffect(() => { fetchSchedule(); fetchWorkCenters(); }, []);

  const fetchSchedule = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { status: 'scheduled,in_progress,planned' } }); setWorkOrders(Array.isArray(res.data) ? res.data : []); } catch { setWorkOrders([]); }
  };

  const fetchWorkCenters = async () => {
    try { const res = await api.get('/api/manufacturing/work-centers'); setWorkCenters(Array.isArray(res.data) ? res.data : []); } catch { setWorkCenters([]); }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'planned': return 'bg-gray-200 text-gray-700';
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100';
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'rush': return 'text-red-700 font-bold';
      case 'high': return 'text-orange-600 font-bold';
      default: return '';
    }
  };

  const filteredOrders = filterStation ? workOrders.filter(wo => wo.current_station === filterStation) : workOrders;

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={fetchSchedule}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">View:</span>
        <button className={`erp-toolbar-btn ${viewMode === 'list' ? 'bg-blue-100' : ''}`} onClick={() => setViewMode('list')}>List</button>
        <button className={`erp-toolbar-btn ${viewMode === 'board' ? 'bg-blue-100' : ''}`} onClick={() => setViewMode('board')}>Board</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Station:</span>
        <select className="erp-form-select w-40 ml-1" value={filterStation} onChange={e => setFilterStation(e.target.value)}>
          <option value="">All Stations</option>
          {workCenters.map(wc => <option key={wc.id} value={wc.name}>{wc.name}</option>)}
        </select>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn">Print Schedule</button>
        <button className="erp-toolbar-btn">Auto-Schedule</button>
      </div>

      {viewMode === 'list' ? (
        <div className="flex-1 overflow-auto">
          <table className="erp-grid">
            <thead>
              <tr><th>Priority</th><th>WO #</th><th>Item</th><th>Qty</th><th>Start</th><th>Due</th><th>Status</th><th>Current Station</th><th>% Complete</th></tr>
            </thead>
            <tbody>
              {filteredOrders.map(wo => (
                <tr key={wo.id}>
                  <td className={getPriorityColor(wo.priority)}>{(wo.priority || 'normal').toUpperCase()}</td>
                  <td className="text-blue-700 font-bold">{wo.wo_number}</td>
                  <td>{wo.item_number} - {wo.item_description}</td>
                  <td className="text-right">{wo.quantity}</td>
                  <td>{wo.start_date}</td>
                  <td className={wo.finish_date && new Date(wo.finish_date) < new Date() && wo.status !== 'completed' ? 'text-red-700 font-bold' : ''}>{wo.finish_date}</td>
                  <td><span className={`px-2 py-0.5 rounded text-xs ${getStatusColor(wo.status)}`}>{wo.status}</span></td>
                  <td>{wo.current_station || '-'}</td>
                  <td>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${wo.quantity > 0 ? Math.round((wo.qty_completed || 0) / wo.quantity * 100) : 0}%` }}></div>
                      </div>
                      <span className="text-xs">{wo.quantity > 0 ? Math.round((wo.qty_completed || 0) / wo.quantity * 100) : 0}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex-1 overflow-auto p-3">
          <div className="grid grid-cols-7 gap-2 h-full">
            {['Cutting', 'Polishing', 'Drilling/CNC', 'Lamination', 'Tempering', 'QC', 'Packing'].map(station => (
              <div key={station} className="bg-gray-50 border rounded p-2 overflow-auto">
                <div className="text-xs font-bold text-center border-b pb-1 mb-2 text-gray-700">{station}</div>
                {workOrders.filter(wo => wo.current_station === station).map(wo => (
                  <div key={wo.id} className={`p-2 mb-1 rounded border text-xs ${wo.priority === 'rush' ? 'border-red-400 bg-red-50' : 'bg-white'}`}>
                    <div className="font-bold text-blue-700">{wo.wo_number}</div>
                    <div className="text-gray-600 truncate">{wo.item_number}</div>
                    <div>Qty: {wo.quantity}</div>
                    <div className="text-gray-400">Due: {wo.finish_date}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductionSchedule;
