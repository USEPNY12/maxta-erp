import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';
function Locations() {
  const [locations, setLocations] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [activeView, setActiveView] = useState('tree');
  useEffect(() => { fetchLocations(); fetchTransactions(); }, []);
  const fetchLocations = async () => {
    try { const res = await api.get('/api/purchasing/locations'); setLocations(Array.isArray(res.data) ? res.data : []); } catch { setLocations([]); }
  };
  const fetchTransactions = async () => {
    try { const res = await api.get('/api/purchasing/inventory-transactions'); setTransactions(Array.isArray(res.data) ? res.data : []); } catch { setTransactions([]); }
  };
  const fmt = (d) => d ? d.split('T')[0] : '-';
  // Build tree from flat list
  const buildTree = (locs) => {
    const map = {};
    const roots = [];
    locs.forEach(l => { map[l.id] = { ...l, children: [] }; });
    locs.forEach(l => { if (l.parent_id && map[l.parent_id]) { map[l.parent_id].children.push(map[l.id]); } else { roots.push(map[l.id]); } });
    return roots;
  };
  const tree = buildTree(locations);
  const renderTree = (nodes, depth = 0) => nodes.map(n => (
    <React.Fragment key={n.id}>
      <tr className="hover:bg-blue-50">
        <td style={{ paddingLeft: `${depth * 24 + 8}px` }}>
          <span className="mr-1">{n.location_type === 'warehouse' ? '🏭' : n.location_type === 'rack' ? '📦' : n.location_type === 'bin' ? '📋' : n.location_type === 'shelf' ? '📚' : '📍'}</span>
          <span className="font-bold">{n.name}</span>
        </td>
        <td className="font-mono text-blue-700">{n.code}</td>
        <td><span className={`text-xs px-2 py-0.5 rounded ${n.location_type === 'warehouse' ? 'bg-purple-100 text-purple-700' : n.location_type === 'rack' ? 'bg-blue-100 text-blue-700' : n.location_type === 'bin' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{n.location_type}</span></td>
        <td>{n.zone || '-'}</td>
        <td>{n.capacity ? `${n.capacity} units` : '-'}</td>
        <td><span className={`erp-status ${n.is_active ? 'erp-status-active' : 'erp-status-inactive'}`}>{n.is_active ? 'Active' : 'Inactive'}</span></td>
      </tr>
      {n.children.length > 0 && renderTree(n.children, depth + 1)}
    </React.Fragment>
  ));
  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col overflow-hidden">
      <div className="erp-toolbar">
        <span className="text-sm font-bold">Warehouse Locations & Inventory</span>
        <div className="flex gap-1 ml-4">
          <button className={`erp-btn text-xs ${activeView === 'tree' ? 'erp-btn-primary' : ''}`} onClick={() => setActiveView('tree')}>📍 Location Tree</button>
          <button className={`erp-btn text-xs ${activeView === 'transactions' ? 'erp-btn-primary' : ''}`} onClick={() => setActiveView('transactions')}>📊 Transactions</button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-2">
        {activeView === 'tree' && (
          <div>
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
              <strong>Location Hierarchy:</strong> Warehouse → Rack → Shelf → Bin. Each received item is assigned to a specific bin location for precise tracking.
            </div>
            <table className="erp-grid">
              <thead><tr><th>Location</th><th>Code</th><th>Type</th><th>Zone</th><th>Capacity</th><th>Status</th></tr></thead>
              <tbody>{tree.length === 0 ? <tr><td colSpan="6" className="text-center p-4 text-gray-500">No locations configured</td></tr> : renderTree(tree)}</tbody>
            </table>
          </div>
        )}
        {activeView === 'transactions' && (
          <div>
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              <strong>Inventory Transaction Ledger:</strong> Every stock movement (receipt, issue, transfer, adjustment) is recorded here for full traceability.
            </div>
            <table className="erp-grid">
              <thead><tr><th>Date</th><th>Type</th><th>Item</th><th>Lot #</th><th>Qty</th><th>Location</th><th>Reference</th></tr></thead>
              <tbody>
                {transactions.length === 0 ? <tr><td colSpan="7" className="text-center p-4 text-gray-500">No transactions recorded</td></tr> :
                transactions.map((t, i) => (
                  <tr key={i}>
                    <td>{fmt(t.transaction_date)}</td>
                    <td><span className={`text-xs px-2 py-0.5 rounded ${t.transaction_type === 'receipt' ? 'bg-green-100 text-green-700' : t.transaction_type === 'issue' ? 'bg-red-100 text-red-700' : t.transaction_type === 'transfer' ? 'bg-blue-100 text-blue-700' : 'bg-yellow-100 text-yellow-700'}`}>{t.transaction_type}</span></td>
                    <td>{t.item_name || t.item_number || '-'}</td>
                    <td className="font-mono text-green-700">{t.lot_number || '-'}</td>
                    <td className={`text-right font-bold ${t.quantity > 0 ? 'text-green-700' : 'text-red-700'}`}>{t.quantity > 0 ? '+' : ''}{t.quantity}</td>
                    <td>{t.location_name || '-'}</td>
                    <td className="text-xs text-gray-500">{t.reference_number || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
    </ModulePage>
  );
}
export default Locations;
