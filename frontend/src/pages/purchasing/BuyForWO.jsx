import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';

function BuyForWO() {
  const [workOrders, setWorkOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchWOs(); }, []);

  const fetchWOs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/manufacturing/work-orders');
      // Filter to only show WOs that are planned or in progress (need materials)
      const active = (res.data || []).filter(wo => ['planned', 'in_progress', 'in progress', 'released'].includes(wo.status));
      setWorkOrders(active);
    } catch (e) {
      toast.error('Failed to load work orders');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePO = async (wo) => {
    toast.info(`Creating PO for materials needed by ${wo.order_number}...`);
    // Navigate to PO creation with pre-filled WO reference
    window.location.href = `/purchasing/purchase-orders?new=true&wo=${wo.id}`;
  };

  return (
    <ModulePage {...purchasingMenu}>
      <div className="erp-page">
      <div className="erp-toolbar">
        <h3 style={{ margin: 0 }}>Buy for Work Order / Job</h3>
        <button onClick={fetchWOs} style={{ marginLeft: 12 }}>↻ Refresh</button>
      </div>

      <p style={{ padding: '8px 12px', color: '#555', margin: 0 }}>
        Select a Work Order to create a Purchase Order for its required materials.
      </p>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#666' }}>Loading work orders...</div>
      ) : workOrders.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: '#888' }}>No active work orders requiring materials</div>
      ) : (
        <table className="erp-table">
          <thead>
            <tr>
              <th>WO#</th>
              <th>Item</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Status</th>
              <th>Due Date</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {workOrders.map(wo => (
              <tr key={wo.id}>
                <td style={{ color: '#1a73e8', fontWeight: 500 }}>{wo.order_number}</td>
                <td>{wo.item_number || '-'}</td>
                <td>{wo.item_description || wo.description || ''}</td>
                <td>{wo.quantity}</td>
                <td>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    background: wo.status === 'in progress' ? '#e8f5e9' : '#e3f2fd',
                    color: wo.status === 'in progress' ? '#2e7d32' : '#1565c0'
                  }}>
                    {wo.status}
                  </span>
                </td>
                <td>{wo.finish_date ? new Date(wo.finish_date).toLocaleDateString() : '-'}</td>
                <td>
                  <button
                    onClick={() => handleCreatePO(wo)}
                    style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
                  >
                    📋 Create PO
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
    </ModulePage>
  );
}

export default BuyForWO;
