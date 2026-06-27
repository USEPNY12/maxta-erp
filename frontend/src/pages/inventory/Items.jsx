import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';

function Items() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [searchBy, setSearchBy] = useState('item_no');
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async (query = '') => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/items', { params: { search: query } });
      setItems(Array.isArray(res.data) ? res.data : res.data.items || []);
    } catch (err) {
      setItems([]);
    }
    setLoading(false);
  };

  const handleSearch = () => fetchItems(search);

  return (
    <ModulePage
      title="Inventory Home"
      quickActions={[
        { label: 'New Item', onClick: () => navigate('/inventory/items/new') },
        { label: 'New Inventory Adjustment', path: '/inventory/adjustments?new=true' },
      ]}
      setupItems={[
        { label: 'Item Types', path: '/setup?tab=item-types' },
        { label: 'Locations', path: '/setup?tab=locations' },
      ]}
      menuItems={[
        { label: 'Inventory Home', path: '/inventory', icon: '🏠' },
        { label: 'Items', path: '/inventory/items', icon: '📦' },
        { label: 'Item Inquiry', path: '/inventory/inquiry', icon: '🔍' },
        { label: 'Inventory Adjustments', path: '/inventory/adjustments', icon: '📋' },
        { label: 'Physical Count', path: '/inventory/physical-count', icon: '📊' },
        { label: 'Inventory Transfers', path: '/inventory/transfers', icon: '🔄' },
      ]}
      reports={{ type: 'Inventory', options: ['Value by Item', 'Value by Item/Location', 'Stock Status'] }}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="erp-toolbar">
          <button className="erp-toolbar-btn" onClick={() => navigate('/inventory/items/new')}>
            <span className="text-green-600">+</span> New
          </button>
          <div className="erp-toolbar-separator" />
          <button className="erp-toolbar-btn" onClick={() => fetchItems()}>↻ Refresh</button>
          <div className="erp-toolbar-separator" />
          <span className="text-xs ml-2">Show History and Quantity</span>
          <input type="checkbox" className="ml-1" defaultChecked />
        </div>

        {/* Search Bar */}
        <div className="bg-blue-50 border-b border-gray-300 p-2 flex items-center gap-2">
          <span className="text-xs font-bold">Search</span>
          <label className="text-xs">Search by</label>
          <select className="erp-form-select" value={searchBy} onChange={e => setSearchBy(e.target.value)}>
            <option value="item_no">Item No</option>
            <option value="description">Description</option>
            <option value="item_type">Item Type</option>
          </select>
          <label className="text-xs">Search for</label>
          <input
            className="erp-form-input w-48"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
          />
          <label className="text-xs"><input type="checkbox" defaultChecked /> Starts with</label>
          <button className="erp-btn text-xs" onClick={() => { setSearch(''); fetchItems(); }}>Clear</button>
          <button className="erp-btn erp-btn-primary text-xs" onClick={handleSearch}>🔍 Find</button>
        </div>

        {/* Data Grid */}
        <div className="flex-1 overflow-auto">
          <table className="erp-grid">
            <thead>
              <tr>
                <th>Item No.</th>
                <th>Description</th>
                <th>Item Type</th>
                <th>On Hand Qty</th>
                <th>Avg Cost</th>
                <th>Std Cost</th>
                <th>Location</th>
                <th>Lot Control</th>
                <th>Serial</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="9" className="text-center p-4">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="9" className="text-center p-4">No items found. Click "New" to create one.</td></tr>
              ) : items.map(item => (
                <tr key={item.id} className="cursor-pointer" onDoubleClick={() => navigate(`/inventory/items/${item.id}`)}>
                  <td className="text-blue-700 font-bold">{item.item_number}</td>
                  <td>{item.description}</td>
                  <td>{item.item_type}</td>
                  <td className="text-right">{item.qty_on_hand || 0}</td>
                  <td className="text-right">{item.avg_cost ? '$' + parseFloat(item.avg_cost).toFixed(2) : ''}</td>
                  <td className="text-right">{item.standard_cost ? '$' + parseFloat(item.standard_cost).toFixed(2) : ''}</td>
                  <td>{item.receipt_location_name}</td>
                  <td className="text-center">{item.lot_control ? '✓' : ''}</td>
                  <td className="text-center">{item.serial_control ? '✓' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Status Bar */}
        <div className="bg-gray-100 border-t border-gray-300 px-4 py-1 text-xs text-gray-600">
          {items.length} items found
        </div>
      </div>
    </ModulePage>
  );
}

export default Items;
