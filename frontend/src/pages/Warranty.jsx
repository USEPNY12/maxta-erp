import { useState, useEffect } from 'react';
import api from '../services/api';
import { FaShieldAlt, FaExclamationCircle, FaUndo, FaChartLine, FaSearch, FaPlus } from 'react-icons/fa';

export default function Warranty() {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      if (tab === 'dashboard') {
        const res = await api.get('/api/warranty/dashboard');
        setData(res.data);
      } else if (tab === 'claims') {
        const res = await api.get('/api/warranty/claims');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'rma') {
        const res = await api.get('/api/warranty/rma');
        setData(Array.isArray(res.data) ? res.data : []);
      } else if (tab === 'chargebacks') {
        const res = await api.get('/api/warranty/chargebacks');
        setData(Array.isArray(res.data) ? res.data : []);
      }
    } catch (err) {
      console.error('Warranty load error:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const setupSchema = async () => {
    try {
      await api.post('/api/warranty/setup-schema');
      alert('Warranty tables created and seeded successfully!');
      loadData();
    } catch (err) {
      alert('Schema setup error: ' + (err.response?.data?.error || err.message));
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: FaShieldAlt },
    { id: 'claims', label: 'Claims', icon: FaExclamationCircle },
    { id: 'rma', label: 'RMA Recuts', icon: FaUndo },
    { id: 'chargebacks', label: 'Chargebacks', icon: FaChartLine },
  ];

  const getStatusColor = (status) => {
    const colors = { open: '#3b82f6', investigating: '#f59e0b', approved: '#22c55e', denied: '#ef4444', closed: '#6b7280', pending: '#8b5cf6', in_production: '#f59e0b', shipped: '#22c55e', submitted: '#3b82f6', accepted: '#22c55e', disputed: '#ef4444' };
    return colors[status] || '#6b7280';
  };

  const renderDashboard = () => {
    if (!data) return null;
    const stats = data.stats || {};
    return (
      <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#2563eb' }}>{stats.open_claims || 0}</div>
            <div style={{ color: '#1e40af', fontSize: '0.85rem' }}>Open Claims</div>
          </div>
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#dc2626' }}>${(stats.total_claim_cost || 0).toLocaleString()}</div>
            <div style={{ color: '#991b1b', fontSize: '0.85rem' }}>Total Claim Cost (MTD)</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.rma_in_progress || 0}</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>RMA In Progress</div>
          </div>
          <div style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#7c3aed' }}>${(stats.chargebacks_pending || 0).toLocaleString()}</div>
            <div style={{ color: '#5b21b6', fontSize: '0.85rem' }}>Chargebacks Pending</div>
          </div>
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#d97706' }}>{stats.avg_resolution_days || 0}</div>
            <div style={{ color: '#92400e', fontSize: '0.85rem' }}>Avg Resolution (Days)</div>
          </div>
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#16a34a' }}>{stats.warranty_rate || 0}%</div>
            <div style={{ color: '#166534', fontSize: '0.85rem' }}>Warranty Rate</div>
          </div>
        </div>

        {data.recentClaims && data.recentClaims.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaExclamationCircle /> Recent Claims</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Claim #</th><th style={{ padding: '8px', textAlign: 'left' }}>Customer</th><th style={{ padding: '8px', textAlign: 'left' }}>Product</th><th style={{ padding: '8px' }}>Defect</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Filed</th></tr></thead>
              <tbody>
                {data.recentClaims.map(c => (
                  <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace' }}>{c.claim_number}</td>
                    <td style={{ padding: '8px' }}>{c.customer_name}</td>
                    <td style={{ padding: '8px' }}>{c.product_description}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{c.defect_type}</td>
                    <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(c.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{c.status?.replace(/_/g, ' ')}</span></td>
                    <td style={{ padding: '8px', textAlign: 'center' }}>{c.filed_date?.split('T')[0]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.defectBreakdown && data.defectBreakdown.length > 0 && (
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaChartLine /> Defect Breakdown (Last 90 Days)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.5rem' }}>
              {data.defectBreakdown.map((d, i) => (
                <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{d.count}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{d.defect_type}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderClaims = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>Claim #</th><th style={{ padding: '8px', textAlign: 'left' }}>Customer</th><th style={{ padding: '8px', textAlign: 'left' }}>SO #</th><th style={{ padding: '8px', textAlign: 'left' }}>Product</th><th style={{ padding: '8px' }}>Defect</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Cost</th><th style={{ padding: '8px' }}>Filed</th></tr></thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{c.claim_number}</td>
              <td style={{ padding: '8px' }}>{c.customer_name}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{c.sales_order_number || '-'}</td>
              <td style={{ padding: '8px' }}>{c.product_description}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{c.defect_type}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(c.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{c.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px', textAlign: 'center' }}>${c.claim_cost?.toFixed(2) || '0.00'}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{c.filed_date?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderRMA = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>RMA #</th><th style={{ padding: '8px', textAlign: 'left' }}>Claim</th><th style={{ padding: '8px', textAlign: 'left' }}>Product</th><th style={{ padding: '8px' }}>Qty</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px' }}>Priority</th><th style={{ padding: '8px' }}>Created</th><th style={{ padding: '8px' }}>Ship By</th></tr></thead>
        <tbody>
          {data.map(r => (
            <tr key={r.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.rma_number}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{r.claim_number}</td>
              <td style={{ padding: '8px' }}>{r.product_description}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{r.quantity}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(r.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{r.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{r.priority}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{r.created_date?.split('T')[0]}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{r.ship_by_date?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderChargebacks = () => {
    if (!Array.isArray(data)) return null;
    return (
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead><tr style={{ background: '#f8fafc' }}><th style={{ padding: '8px', textAlign: 'left' }}>CB #</th><th style={{ padding: '8px', textAlign: 'left' }}>Supplier</th><th style={{ padding: '8px', textAlign: 'left' }}>Claim</th><th style={{ padding: '8px' }}>Amount</th><th style={{ padding: '8px' }}>Status</th><th style={{ padding: '8px', textAlign: 'left' }}>Reason</th><th style={{ padding: '8px' }}>Submitted</th></tr></thead>
        <tbody>
          {data.map(cb => (
            <tr key={cb.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{cb.chargeback_number}</td>
              <td style={{ padding: '8px' }}>{cb.supplier_name}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{cb.claim_number}</td>
              <td style={{ padding: '8px', textAlign: 'center', fontWeight: 'bold' }}>${cb.amount?.toFixed(2)}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}><span style={{ background: getStatusColor(cb.status), color: '#fff', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>{cb.status?.replace(/_/g, ' ')}</span></td>
              <td style={{ padding: '8px' }}>{cb.reason}</td>
              <td style={{ padding: '8px', textAlign: 'center' }}>{cb.submitted_date?.split('T')[0]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div style={{ padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FaShieldAlt /> Warranty & Claims</h1>
        <button onClick={setupSchema} style={{ background: '#6366f1', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>
          <FaPlus style={{ marginRight: '4px' }} /> Initialize Tables
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '8px 16px', border: tab === t.id ? '2px solid #3b82f6' : '1px solid #d1d5db', borderRadius: '6px', background: tab === t.id ? '#eff6ff' : '#fff', color: tab === t.id ? '#1d4ed8' : '#374151', cursor: 'pointer', fontWeight: tab === t.id ? '600' : '400', fontSize: '0.85rem' }}>
            <t.icon /> {t.label}
          </button>
        ))}
      </div>

      {loading && <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>{error}</div>}
      
      {!loading && !error && (
        <>
          {tab === 'dashboard' && renderDashboard()}
          {tab === 'claims' && renderClaims()}
          {tab === 'rma' && renderRMA()}
          {tab === 'chargebacks' && renderChargebacks()}
        </>
      )}
    </div>
  );
}
