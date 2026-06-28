import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';

function VendorItems() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchItems(); }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/purchasing/vendor-items');
      setItems(res.data || []);
    } catch (e) {
      toast.error('Failed to load vendor items');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = items.filter(i =>
    !search || [i.item_number, i.description, i.company_name, i.vendor_item_number]
      .some(f => f && f.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <ModulePage {...purchasingMenu}>
      <div className="erp-page">
      <div className="erp-toolbar">
        <button onClick={fetchItems}>↻ Refresh</button>
        <span style={{ marginLeft: 8 }}>Search:</span>
        <input
          type="text"
          placeholder="Item, vendor, part#..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginLeft: 4, padding: '4px 8px', width: 200 }}
        />
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading vendor items...</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No vendor items found</div>
      ) : (
        <table className="erp-table">
          <thead>
            <tr>
              <th>Item#</th>
              <th>Description</th>
              <th>Vendor</th>
              <th>Vendor Part#</th>
              <th>Lead Time</th>
              <th>Unit Cost</th>
              <th>Primary</th>
            </tr>
          </thead>
          <tbody>
            {(filtered || []).map((item, idx) => (
              <tr key={idx}>
                <td style={{ color: '#1a73e8', fontWeight: 500 }}>{item.item_number}</td>
                <td>{item.description}</td>
                <td>{item.company_name}</td>
                <td>{item.vendor_item_number}</td>
                <td>{item.lead_time_days ? `${item.lead_time_days} days` : '-'}</td>
                <td style={{ textAlign: 'right' }}>${Number(item.unit_cost || 0).toFixed(2)}</td>
                <td style={{ textAlign: 'center' }}>{item.is_primary ? '● Yes' : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </ModulePage>
  );
}

export default VendorItems;
