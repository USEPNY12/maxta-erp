import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function BillOfMaterials() {
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bomLines, setBomLines] = useState([]);
  const [search, setSearch] = useState('');
  const [showAddLine, setShowAddLine] = useState(false);
  const [newLine, setNewLine] = useState({ component_item_id: '', quantity_per: 1, waste_percent: 0, operation_seq: 10, notes: '' });

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/inventory/items', { params: { search, manufactured: true } });
      setItems(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch { setItems([]); }
  };

  const fetchBOM = async (itemId) => {
    try {
      const res = await api.get(`/api/manufacturing/bom/${itemId}`);
      setBomLines(Array.isArray(res.data) ? res.data : []);
    } catch { setBomLines([]); }
  };

  const selectItem = (item) => {
    setSelectedItem(item);
    fetchBOM(item.id);
  };

  const addBOMLine = async () => {
    if (!selectedItem) return;
    try {
      await api.post(`/api/manufacturing/bom/${selectedItem.id}/lines`, newLine);
      toast.success('BOM line added');
      setShowAddLine(false);
      setNewLine({ component_item_id: '', quantity_per: 1, waste_percent: 0, operation_seq: 10, notes: '' });
      fetchBOM(selectedItem.id);
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to add BOM line'); }
  };

  const deleteBOMLine = async (lineId) => {
    if (!confirm('Delete this BOM line?')) return;
    try {
      await api.delete(`/api/manufacturing/bom/lines/${lineId}`);
      toast.success('BOM line deleted');
      fetchBOM(selectedItem.id);
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={fetchItems}>↻ Refresh</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search Item:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchItems()} placeholder="Item No or Description" />
        <button className="erp-btn text-xs ml-1" onClick={fetchItems}>Find</button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left - Item List */}
        <div className="w-80 border-r border-gray-300 flex flex-col">
          <div className="bg-gray-200 border-b border-gray-300 px-2 py-1 text-xs font-bold">Manufactured Items</div>
          <div className="flex-1 overflow-auto">
            <table className="erp-grid text-xs">
              <thead><tr><th>Item No.</th><th>Description</th><th>Type</th></tr></thead>
              <tbody>
                {(items || [])?.map(item => (
                  <tr
                    key={item.id}
                    className={`cursor-pointer ${selectedItem?.id === item.id ? 'bg-blue-200' : ''}`}
                    onClick={() => selectItem(item)}
                  >
                    <td className="text-blue-700">{item.item_no}</td>
                    <td>{item.description}</td>
                    <td>{item.item_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right - BOM Detail */}
        <div className="flex-1 flex flex-col">
          {selectedItem ? (
            <>
              <div className="bg-gray-100 border-b border-gray-300 p-3">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="font-bold text-sm">{selectedItem.item_no}</span>
                    <span className="ml-3 text-sm text-gray-600">{selectedItem.description}</span>
                  </div>
                  <button className="erp-btn erp-btn-primary text-xs" onClick={() => setShowAddLine(true)}>+ Add Component</button>
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                <table className="erp-grid">
                  <thead>
                    <tr>
                      <th>Seq</th>
                      <th>Component Item</th>
                      <th>Description</th>
                      <th>Qty Per</th>
                      <th>Waste %</th>
                      <th>Total Qty</th>
                      <th>UOM</th>
                      <th>Operation</th>
                      <th>Notes</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bomLines.length === 0 ? (
                      <tr><td colSpan="10" className="text-center p-4 text-gray-500">No BOM lines. Click "+ Add Component" to add materials.</td></tr>
                    ) : bomLines?.map((line, idx) => (
                      <tr key={line.id}>
                        <td>{(idx + 1) * 10}</td>
                        <td className="text-blue-700 font-bold">{line.component_item_no}</td>
                        <td>{line.component_description}</td>
                        <td className="text-right">{line.quantity_per}</td>
                        <td className="text-right">{line.waste_percent}%</td>
                        <td className="text-right font-bold">{(line.quantity_per * (1 + line.waste_percent / 100)).toFixed(4)}</td>
                        <td>{line.uom}</td>
                        <td>{line.operation_seq}</td>
                        <td className="text-xs">{line.notes}</td>
                        <td>
                          <button className="text-red-600 text-xs hover:underline" onClick={() => deleteBOMLine(line.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <p>Select a manufactured item from the left to view/edit its Bill of Materials</p>
            </div>
          )}
        </div>
      </div>

      {/* Add BOM Line Modal */}
      {showAddLine && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '500px' }}>
            <div className="erp-modal-title"><span>Add BOM Component</span><button className="text-white" onClick={() => setShowAddLine(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="erp-form-group">
                <label className="erp-form-label">Component Item:</label>
                <input className="erp-form-input" value={newLine.component_item_id} onChange={e => setNewLine({...newLine, component_item_id: e.target.value})} placeholder="Enter Item No or search..." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="erp-form-group">
                  <label className="erp-form-label">Qty Per:</label>
                  <input type="number" step="0.0001" className="erp-form-input" value={newLine.quantity_per} onChange={e => setNewLine({...newLine, quantity_per: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="erp-form-group">
                  <label className="erp-form-label">Waste %:</label>
                  <input type="number" step="0.01" className="erp-form-input" value={newLine.waste_percent} onChange={e => setNewLine({...newLine, waste_percent: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="erp-form-group">
                  <label className="erp-form-label">Operation Seq:</label>
                  <input type="number" className="erp-form-input" value={newLine.operation_seq} onChange={e => setNewLine({...newLine, operation_seq: parseInt(e.target.value) || 10})} />
                </div>
              </div>
              <div className="erp-form-group">
                <label className="erp-form-label">Notes:</label>
                <input className="erp-form-input" value={newLine.notes} onChange={e => setNewLine({...newLine, notes: e.target.value})} />
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={addBOMLine}>Add</button>
              <button className="erp-btn" onClick={() => setShowAddLine(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default BillOfMaterials;
