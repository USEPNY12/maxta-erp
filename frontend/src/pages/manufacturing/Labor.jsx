import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Labor() {
  const [entries, setEntries] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [workOrders, setWorkOrders] = useState([]);
  const [workCenters, setWorkCenters] = useState([]);
  const [form, setForm] = useState({
    work_order_id: '', work_center_id: '', employee_id: '', work_date: new Date().toISOString().split('T')[0],
    hours: '', rate: '', labor_type: 'run', notes: ''
  });

  useEffect(() => { fetchLabor(); }, []);

  const fetchLabor = async () => {
    try { const res = await api.get('/api/manufacturing/labor'); setEntries(res.data); } catch { setEntries([]); }
  };

  const fetchWorkOrders = async () => {
    try { const res = await api.get('/api/manufacturing/work-orders', { params: { status: 'in_progress' } }); setWorkOrders(res.data); } catch { setWorkOrders([]); }
  };

  const fetchWorkCenters = async () => {
    try { const res = await api.get('/api/manufacturing/work-centers'); setWorkCenters(res.data); } catch { setWorkCenters([]); }
  };

  const handleNew = () => {
    fetchWorkOrders();
    fetchWorkCenters();
    setForm({ work_order_id: '', work_center_id: '', employee_id: '', work_date: new Date().toISOString().split('T')[0], hours: '', rate: '', labor_type: 'run', notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.work_order_id || !form.hours) { toast.error('Work Order and Hours are required'); return; }
    try {
      await api.post('/api/manufacturing/labor', form);
      toast.success('Labor entry saved');
      setShowModal(false);
      fetchLabor();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New Labor Entry</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchLabor}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Batch Entry</button>
        <button className="erp-toolbar-btn">Print Timesheet</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Date</th><th>WO #</th><th>Work Center</th><th>Employee</th><th>Type</th><th>Hours</th><th>Rate</th><th>Cost</th></tr>
          </thead>
          <tbody>
            {entries.map(e => (
              <tr key={e.id}>
                <td>{e.work_date}</td>
                <td className="text-blue-700 font-bold">{e.wo_number}</td>
                <td>{e.work_center_name}</td>
                <td>{e.employee_name}</td>
                <td className="capitalize">{e.labor_type}</td>
                <td className="text-right">{parseFloat(e.hours || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(e.rate || 0).toFixed(2)}</td>
                <td className="text-right font-bold">${(parseFloat(e.hours || 0) * parseFloat(e.rate || 0)).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '550px' }}>
            <div className="erp-modal-title"><span>Labor Time Entry</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Work Order:</label>
                    <select className="erp-form-select" value={form.work_order_id} onChange={e => setForm({...form, work_order_id: e.target.value})}>
                      <option value="">Select WO...</option>
                      {workOrders.map(wo => <option key={wo.id} value={wo.id}>{wo.wo_number} - {wo.item_number}</option>)}
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Work Center:</label>
                    <select className="erp-form-select" value={form.work_center_id} onChange={e => setForm({...form, work_center_id: e.target.value})}>
                      <option value="">Select Station...</option>
                      {workCenters.map(wc => <option key={wc.id} value={wc.id}>{wc.name}</option>)}
                    </select>
                  </div>
                  <div className="erp-form-group"><label className="erp-form-label">Employee:</label><input className="erp-form-input" value={form.employee_id} onChange={e => setForm({...form, employee_id: e.target.value})} placeholder="Employee name or ID" /></div>
                </div>
                <div className="space-y-2">
                  <div className="erp-form-group"><label className="erp-form-label">Date:</label><input type="date" className="erp-form-input" value={form.work_date} onChange={e => setForm({...form, work_date: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Hours:</label><input type="number" step="0.25" className="erp-form-input" value={form.hours} onChange={e => setForm({...form, hours: e.target.value})} placeholder="e.g. 2.5" /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Rate ($/hr):</label><input type="number" step="0.01" className="erp-form-input" value={form.rate} onChange={e => setForm({...form, rate: e.target.value})} /></div>
                  <div className="erp-form-group"><label className="erp-form-label">Type:</label>
                    <select className="erp-form-select" value={form.labor_type} onChange={e => setForm({...form, labor_type: e.target.value})}>
                      <option value="run">Run</option><option value="setup">Setup</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="erp-form-group"><label className="erp-form-label">Notes:</label><textarea className="erp-form-input w-full h-10" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} /></div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave}>Save</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Labor;
