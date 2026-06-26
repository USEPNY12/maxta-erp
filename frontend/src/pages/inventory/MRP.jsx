import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function MRP() {
  const [mrpData, setMrpData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, below_reorder, negative
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadMRP();
  }, []);

  const loadMRP = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/mrp');
      setMrpData(res.data);
    } catch (e) {
      console.error('MRP load error:', e);
    }
    setLoading(false);
  };

  const fmt = (v) => v ? Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00';

  const filteredItems = mrpData?.items?.filter(item => {
    if (filter === 'below_reorder') return item.available < item.reorder_point;
    if (filter === 'negative') return item.available < 0;
    return true;
  }) || [];

  if (loading) return <div className="h-full flex items-center justify-center"><span className="text-gray-500">Loading MRP data...</span></div>;

  return (
    <div className="h-full overflow-auto bg-[#c8c8d4] p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-gray-800">Material Requirements Planning (MRP)</h1>
        <button onClick={loadMRP} className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
          Refresh MRP
        </button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded shadow p-4 border-l-4 border-blue-500">
          <p className="text-xs text-gray-500 uppercase">Total Items</p>
          <p className="text-2xl font-bold">{mrpData?.summary?.total_items || 0}</p>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-red-500">
          <p className="text-xs text-gray-500 uppercase">Below Reorder Point</p>
          <p className="text-2xl font-bold text-red-600">{mrpData?.summary?.items_below_reorder || 0}</p>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-orange-500">
          <p className="text-xs text-gray-500 uppercase">Total Demand Value</p>
          <p className="text-2xl font-bold">{fmt(mrpData?.summary?.total_demand_value)}</p>
        </div>
        <div className="bg-white rounded shadow p-4 border-l-4 border-green-500">
          <p className="text-xs text-gray-500 uppercase">Total Supply Value</p>
          <p className="text-2xl font-bold">{fmt(mrpData?.summary?.total_supply_value)}</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {[
          { key: 'all', label: 'All Items' },
          { key: 'below_reorder', label: 'Below Reorder' },
          { key: 'negative', label: 'Negative Available' }
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`px-4 py-2 text-sm rounded ${filter === f.key ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'}`}>
            {f.label} {f.key === 'below_reorder' && mrpData?.summary?.items_below_reorder > 0 && 
              <span className="ml-1 bg-red-500 text-white rounded-full px-1.5 text-xs">{mrpData.summary.items_below_reorder}</span>}
          </button>
        ))}
      </div>

      {/* MRP Grid */}
      <div className="bg-white rounded shadow overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="text-left p-2">Item #</th>
              <th className="text-left p-2">Description</th>
              <th className="text-right p-2">On Hand</th>
              <th className="text-right p-2">SO Demand</th>
              <th className="text-right p-2">WO Demand</th>
              <th className="text-right p-2 font-bold">Total Demand</th>
              <th className="text-right p-2">PO Supply</th>
              <th className="text-right p-2">WO Supply</th>
              <th className="text-right p-2 font-bold">Total Supply</th>
              <th className="text-right p-2 font-bold">Available</th>
              <th className="text-right p-2">Reorder Pt</th>
              <th className="text-right p-2">Suggested Qty</th>
              <th className="text-center p-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => (
              <tr key={item.item_id} 
                className={`border-b hover:bg-blue-50 cursor-pointer ${item.available < 0 ? 'bg-red-50' : item.available < item.reorder_point ? 'bg-yellow-50' : ''}`}
                onClick={() => setSelectedItem(selectedItem?.item_id === item.item_id ? null : item)}>
                <td className="p-2 font-medium text-blue-700">{item.item_number}</td>
                <td className="p-2">{item.description}</td>
                <td className="p-2 text-right font-medium">{Number(item.on_hand).toFixed(0)}</td>
                <td className="p-2 text-right text-red-600">{Number(item.so_demand || 0).toFixed(0)}</td>
                <td className="p-2 text-right text-red-600">{Number(item.wo_demand || 0).toFixed(0)}</td>
                <td className="p-2 text-right font-bold text-red-700">{Number(item.total_demand).toFixed(0)}</td>
                <td className="p-2 text-right text-green-600">{Number(item.po_supply || 0).toFixed(0)}</td>
                <td className="p-2 text-right text-green-600">{Number(item.wo_supply || 0).toFixed(0)}</td>
                <td className="p-2 text-right font-bold text-green-700">{Number(item.total_supply).toFixed(0)}</td>
                <td className={`p-2 text-right font-bold ${item.available < 0 ? 'text-red-700' : item.available < item.reorder_point ? 'text-orange-600' : 'text-green-700'}`}>
                  {Number(item.available).toFixed(0)}
                </td>
                <td className="p-2 text-right text-gray-500">{Number(item.reorder_point || 0).toFixed(0)}</td>
                <td className="p-2 text-right font-medium text-blue-600">
                  {item.suggested_order_qty > 0 ? Number(item.suggested_order_qty).toFixed(0) : '-'}
                </td>
                <td className="p-2 text-center">
                  {item.available < 0 ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">SHORTAGE</span>
                  ) : item.available < item.reorder_point ? (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">REORDER</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredItems.length === 0 && <p className="text-center py-6 text-gray-400">No items match the selected filter</p>}
      </div>

      {/* Detail Panel */}
      {selectedItem && (
        <div className="mt-4 bg-white rounded shadow p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-lg">{selectedItem.item_number} - {selectedItem.description}</h3>
            <button onClick={() => setSelectedItem(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div>
              <h4 className="font-semibold text-sm text-gray-600 mb-2 border-b pb-1">Inventory</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>On Hand:</span><span className="font-medium">{Number(selectedItem.on_hand).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Reorder Point:</span><span>{Number(selectedItem.reorder_point || 0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Reorder Qty:</span><span>{Number(selectedItem.reorder_qty || 0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Lead Time:</span><span>{selectedItem.lead_time_days || 0} days</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600 mb-2 border-b pb-1">Demand Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Sales Orders:</span><span className="text-red-600">{Number(selectedItem.so_demand || 0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Work Order Materials:</span><span className="text-red-600">{Number(selectedItem.wo_demand || 0).toFixed(0)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total Demand:</span><span className="text-red-700">{Number(selectedItem.total_demand).toFixed(0)}</span></div>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-sm text-gray-600 mb-2 border-b pb-1">Supply Breakdown</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between"><span>Purchase Orders:</span><span className="text-green-600">{Number(selectedItem.po_supply || 0).toFixed(0)}</span></div>
                <div className="flex justify-between"><span>Work Order Receipts:</span><span className="text-green-600">{Number(selectedItem.wo_supply || 0).toFixed(0)}</span></div>
                <div className="flex justify-between font-bold border-t pt-1"><span>Total Supply:</span><span className="text-green-700">{Number(selectedItem.total_supply).toFixed(0)}</span></div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 rounded bg-gray-50 border">
            <div className="flex items-center gap-6 text-sm">
              <span className="font-semibold">Net Available: <span className={`text-lg ${selectedItem.available < 0 ? 'text-red-700' : 'text-green-700'}`}>{Number(selectedItem.available).toFixed(0)}</span></span>
              {selectedItem.suggested_order_qty > 0 && (
                <span className="text-blue-700 font-medium">
                  Suggested Order: {Number(selectedItem.suggested_order_qty).toFixed(0)} units
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
