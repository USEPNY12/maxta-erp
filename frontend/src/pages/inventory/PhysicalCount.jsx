import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { inventoryMenu } from '../../config/moduleMenus';

export default function PhysicalCount() {
  const [counts, setCounts] = useState([]);
  const [selectedCount, setSelectedCount] = useState(null);
  const [countLines, setCountLines] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newCount, setNewCount] = useState({ description: '', location_id: '' });
  const [locations, setLocations] = useState([]);
  const [items, setItems] = useState([]);

  useEffect(() => {
    loadCounts();
    api.get('/api/inventory/locations').then(r => setLocations(Array.isArray(r.data) ? r.data : [])).catch(() => {});
    api.get('/api/inventory/items').then(r => setItems(Array.isArray(r.data) ? r.data : (r.data?.items || []))).catch(() => {});
  }, []);

  const loadCounts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/physical-counts');
      setCounts(Array.isArray(res.data) ? res.data : []);
    } catch (e) {
      console.error('Load counts error:', e);
      setCounts([]);
    }
    setLoading(false);
  };

  const loadCountDetail = async (count) => {
    setSelectedCount(count);
    try {
      const res = await api.get(`/api/inventory/physical-counts/${count.id}`);
      setCountLines(Array.isArray(res.data?.lines) ? res.data.lines : []);
    } catch (e) {
      setCountLines([]);
    }
  };

  const handleCreate = async () => {
    try {
      await api.post('/api/inventory/physical-counts', newCount);
      setShowCreate(false);
      setNewCount({ description: '', location_id: '' });
      loadCounts();
    } catch (e) {
      alert('Error creating count: ' + (e.response?.data?.error || e.message));
    }
  };

  const handleUpdateLine = (index, field, value) => {
    const updated = [...countLines];
    updated[index] = { ...updated[index], [field]: value };
    setCountLines(updated);
  };

  const handleAddLine = () => {
    setCountLines([...countLines, { item_id: '', counted_qty: 0, system_qty: 0, notes: '' }]);
  };

  const handleSaveLines = async () => {
    try {
      await api.put(`/api/inventory/physical-counts/${selectedCount.id}/lines`, { lines: countLines });
      alert('Count lines saved successfully');
      loadCounts();
    } catch (e) {
      alert('Error saving lines: ' + (e.response?.data?.error || e.message));
    }
  };

  const handlePostCount = async () => {
    if (!window.confirm('Post this physical count? This will adjust inventory quantities and post GL variance entries. This cannot be undone.')) return;
    try {
      await api.post(`/api/inventory/physical-counts/${selectedCount.id}/post`);
      alert('Physical count posted successfully! Inventory adjusted and GL entries created.');
      setSelectedCount(null);
      loadCounts();
    } catch (e) {
      alert('Error posting count: ' + (e.response?.data?.error || e.message));
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';

  return (
    <ModulePage {...inventoryMenu}>
      <div className="h-full overflow-auto bg-[#c8c8d4] p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Physical Inventory Count</h1>
        <button onClick={() => setShowCreate(true)} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          + New Count
        </button>
      </div>

      {/* Count List */}
      {!selectedCount && (
        <div className="bg-white rounded shadow overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#1e3a5f] text-white">
                <th className="text-left p-2">Count #</th>
                <th className="text-left p-2">Description</th>
                <th className="text-left p-2">Location</th>
                <th className="text-left p-2">Date</th>
                <th className="text-center p-2">Lines</th>
                <th className="text-center p-2">Status</th>
                <th className="text-left p-2">Posted</th>
              </tr>
            </thead>
            <tbody>
              {counts?.map(c => (
                <tr key={c.id} className="border-b hover:bg-blue-50 cursor-pointer" onClick={() => loadCountDetail(c)}>
                  <td className="p-2 font-medium text-blue-700">{c.count_number}</td>
                  <td className="p-2">{c.description || c.notes || '-'}</td>
                  <td className="p-2">{c.location_name || 'All Locations'}</td>
                  <td className="p-2">{formatDate(c.count_date || c.created_at)}</td>
                  <td className="p-2 text-center">{c.line_count || 0}</td>
                  <td className="p-2 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      c.status === 'posted' ? 'bg-green-100 text-green-700' :
                      c.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {(c.status || 'draft').toUpperCase()}
                    </span>
                  </td>
                  <td className="p-2">{c.posted_at ? formatDate(c.posted_at) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {counts.length === 0 && <p className="text-center py-6 text-gray-400">No physical counts found. Click "+ New Count" to start.</p>}
        </div>
      )}

      {/* Count Detail */}
      {selectedCount && (
        <div className="bg-white rounded shadow p-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-bold">{selectedCount.count_number} - {selectedCount.description || 'Physical Count'}</h2>
              <p className="text-sm text-gray-500">
                Date: {formatDate(selectedCount.count_date || selectedCount.created_at)} | 
                Location: {selectedCount.location_name || 'All'} | 
                Status: <span className="font-medium">{(selectedCount.status || 'draft').toUpperCase()}</span>
              </p>
            </div>
            <div className="flex gap-2">
              {selectedCount.status !== 'posted' && (
                <>
                  <button onClick={handleAddLine} className="px-3 py-1.5 bg-green-600 text-white rounded text-sm hover:bg-green-700">+ Add Line</button>
                  <button onClick={handleSaveLines} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Save Lines</button>
                  <button onClick={handlePostCount} className="px-3 py-1.5 bg-orange-600 text-white rounded text-sm hover:bg-orange-700">Post Count</button>
                </>
              )}
              <button onClick={() => { setSelectedCount(null); setCountLines([]); }} className="px-3 py-1.5 bg-gray-500 text-white rounded text-sm hover:bg-gray-600">Back</button>
            </div>
          </div>

          {/* Count Lines Table */}
          <table className="w-full text-sm border">
            <thead>
              <tr className="bg-gray-100 border-b">
                <th className="text-left p-2 w-48">Item</th>
                <th className="text-left p-2">Description</th>
                <th className="text-right p-2 w-28">System Qty</th>
                <th className="text-right p-2 w-28">Counted Qty</th>
                <th className="text-right p-2 w-28">Variance</th>
                <th className="text-left p-2 w-48">Notes</th>
              </tr>
            </thead>
            <tbody>
              {countLines?.map((line, idx) => {
                const variance = Number(line.counted_qty || 0) - Number(line.system_qty || 0);
                return (
                  <tr key={idx} className={`border-b ${variance !== 0 ? 'bg-yellow-50' : ''}`}>
                    <td className="p-2">
                      {selectedCount.status === 'posted' ? (
                        <span className="font-medium">{line.item_number || items?.find(i => i.id == line.item_id)?.item_number || '-'}</span>
                      ) : (
                        <select value={line.item_id || ''} onChange={e => {
                          const item = items?.find(i => i.id == e.target.value);
                          handleUpdateLine(idx, 'item_id', e.target.value);
                          if (item) handleUpdateLine(idx, 'system_qty', item.qty_on_hand || 0);
                        }} className="w-full border rounded px-2 py-1 text-sm">
                          <option value="">Select Item...</option>
                          {(items || [])?.map(i => <option key={i.id} value={i.id}>{i.item_number} - {i.description}</option>)}
                        </select>
                      )}
                    </td>
                    <td className="p-2 text-gray-600">{line.description || items?.find(i => i.id == line.item_id)?.description || ''}</td>
                    <td className="p-2 text-right">{Number(line.system_qty || 0).toFixed(0)}</td>
                    <td className="p-2 text-right">
                      {selectedCount.status === 'posted' ? (
                        Number(line.counted_qty || 0).toFixed(0)
                      ) : (
                        <input type="number" value={line.counted_qty || ''} onChange={e => handleUpdateLine(idx, 'counted_qty', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm text-right" />
                      )}
                    </td>
                    <td className={`p-2 text-right font-medium ${variance > 0 ? 'text-green-600' : variance < 0 ? 'text-red-600' : ''}`}>
                      {variance > 0 ? '+' : ''}{variance.toFixed(0)}
                    </td>
                    <td className="p-2">
                      {selectedCount.status === 'posted' ? (
                        <span className="text-gray-500">{line.notes || ''}</span>
                      ) : (
                        <input type="text" value={line.notes || ''} onChange={e => handleUpdateLine(idx, 'notes', e.target.value)}
                          className="w-full border rounded px-2 py-1 text-sm" placeholder="Notes..." />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {countLines.length === 0 && (
            <p className="text-center py-6 text-gray-400">No count lines. Click "+ Add Line" to add items to count.</p>
          )}

          {/* Variance Summary */}
          {countLines.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 rounded border">
              <h4 className="font-semibold text-sm mb-2">Variance Summary</h4>
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500">Total Lines:</span> <span className="font-medium">{countLines.length}</span></div>
                <div><span className="text-gray-500">Lines with Variance:</span> <span className="font-medium text-orange-600">{countLines?.filter(l => Number(l.counted_qty || 0) - Number(l.system_qty || 0) !== 0).length}</span></div>
                <div><span className="text-gray-500">Total Over:</span> <span className="font-medium text-green-600">+{countLines?.reduce((sum, l) => { const v = Number(l.counted_qty || 0) - Number(l.system_qty || 0); return sum + (v > 0 ? v : 0); }, 0).toFixed(0)}</span></div>
                <div><span className="text-gray-500">Total Short:</span> <span className="font-medium text-red-600">{countLines?.reduce((sum, l) => { const v = Number(l.counted_qty || 0) - Number(l.system_qty || 0); return sum + (v < 0 ? v : 0); }, 0).toFixed(0)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-[450px]">
            <h3 className="text-lg font-bold mb-4">New Physical Count</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input type="text" value={newCount.description} onChange={e => setNewCount({...newCount, description: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g., Monthly Raw Materials Count" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <select value={newCount.location_id} onChange={e => setNewCount({...newCount, location_id: e.target.value})}
                  className="w-full border rounded px-3 py-2 text-sm">
                  <option value="">All Locations</option>
                  {(locations || [])?.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Cancel</button>
              <button onClick={handleCreate} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">Create Count</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}
