import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function WorkCenters() {
  const [centers, setCenters] = useState([]);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({});

  useEffect(() => { fetchCenters(); }, []);

  const fetchCenters = async () => {
    try { const res = await api.get('/api/manufacturing/work-centers'); setCenters(Array.isArray(res.data) ? res.data : []); } catch { setCenters([]); }
  };

  const openEdit = (wc) => {
    setEditForm({ ...wc });
    setShowEdit(true);
  };

  const handleSave = async () => {
    try {
      if (editForm.id) {
        await api.put(`/api/manufacturing/work-centers/${editForm.id}`, editForm);
        toast.success('Work Center updated');
      } else {
        await api.post('/api/manufacturing/work-centers', editForm);
        toast.success('Work Center created');
      }
      setShowEdit(false); fetchCenters();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const deptColors = { Cutting: 'bg-blue-100 text-blue-700', Edging: 'bg-cyan-100 text-cyan-700', CNC: 'bg-purple-100 text-purple-700', Washing: 'bg-gray-100 text-gray-700', Tempering: 'bg-red-100 text-red-700', Lamination: 'bg-green-100 text-green-700', IGU: 'bg-teal-100 text-teal-700', QC: 'bg-amber-100 text-amber-700', Packing: 'bg-gray-100 text-gray-700', Production: 'bg-green-100 text-green-700' };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Work Centers / Stations</span>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={() => { setEditForm({ code: '', name: '', department: '', icon: '', color: '#2563eb', capacity_per_hour: '', is_active: 1 }); setShowEdit(true); }}>
          <span className="text-green-600">+</span> New Station
        </button>
        <button className="erp-toolbar-btn" onClick={fetchCenters}>Refresh</button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {centers?.map(wc => (
            <div key={wc.id} className="border border-gray-300 rounded overflow-hidden cursor-pointer hover:shadow-md" onClick={() => openEdit(wc)}>
              <div className="text-white px-3 py-2 text-center" style={{ backgroundColor: wc.color || '#6b7280' }}>
                <div className="text-2xl">{wc.icon}</div>
                <div className="font-bold text-sm">{wc.name}</div>
                <div className="text-[10px] opacity-80">{wc.code}</div>
              </div>
              <div className="p-2 text-xs space-y-1 bg-white">
                <div className="flex justify-between"><span className="text-gray-500">Department:</span><span className={`px-1.5 py-0.5 rounded text-[10px] ${deptColors[wc.department] || 'bg-gray-100'}`}>{wc.department}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Capacity:</span><span>{wc.capacity_per_hour || '-'}/hr</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className={wc.is_active ? 'text-green-600' : 'text-red-600'}>{wc.is_active ? 'Active' : 'Inactive'}</span></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-[500px] p-4">
            <h3 className="font-bold text-lg mb-3">{editForm.id ? 'Edit' : 'New'} Work Center</h3>
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-600">Code *</label><input className="erp-form-input w-full" value={editForm.code || ''} onChange={e => setEditForm({...editForm, code: e.target.value})} /></div>
                <div><label className="text-xs text-gray-600">Name *</label><input className="erp-form-input w-full" value={editForm.name || ''} onChange={e => setEditForm({...editForm, name: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="text-xs text-gray-600">Department</label>
                  <select className="erp-form-select w-full" value={editForm.department || ''} onChange={e => setEditForm({...editForm, department: e.target.value})}>
                    <option value="">Select...</option>
                    <option>Cutting</option><option>Edging</option><option>CNC</option><option>Washing</option><option>Tempering</option><option>Lamination</option><option>IGU</option><option>QC</option><option>Packing</option><option>Production</option>
                  </select>
                </div>
                <div><label className="text-xs text-gray-600">Icon (emoji)</label><input className="erp-form-input w-full" value={editForm.icon || ''} onChange={e => setEditForm({...editForm, icon: e.target.value})} /></div>
                <div><label className="text-xs text-gray-600">Color</label><input type="color" className="w-full h-8" value={editForm.color || '#2563eb'} onChange={e => setEditForm({...editForm, color: e.target.value})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="text-xs text-gray-600">Capacity/Hour</label><input type="number" className="erp-form-input w-full" value={editForm.capacity_per_hour || ''} onChange={e => setEditForm({...editForm, capacity_per_hour: e.target.value})} /></div>
                <div><label className="text-xs text-gray-600">Active</label>
                  <select className="erp-form-select w-full" value={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: parseInt(e.target.value)})}>
                    <option value={1}>Active</option><option value={0}>Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button className="flex-1 bg-blue-600 text-white py-2 rounded font-bold" onClick={handleSave}>Save</button>
              <button className="flex-1 bg-gray-200 py-2 rounded" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
export default WorkCenters;
