import { useState, useEffect } from 'react';
import api from '../services/api';
import ModulePage from '../components/ModulePage';
import { salesMenu } from '../config/moduleMenus';

/**
 * Commission Tracking - Sales rep commission management
 * Shows earned, pending, and paid commissions with summary dashboard
 */
export default function Commissions() {
  const [summary, setSummary] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [rules, setRules] = useState([]);
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [summaryRes, ledgerRes, rulesRes] = await Promise.all([
        api.get('/api/cpq/commissions/summary'),
        api.get('/api/cpq/commissions/ledger'),
        api.get('/api/cpq/commissions/rules')
      ]);
      setSummary(summaryRes.data);
      setLedger(ledgerRes.data);
      setRules(rulesRes.data);
    } catch (err) {
      console.error('Failed to load commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayCommissions = async (ids) => {
    if (!confirm(`Mark ${ids.length} commission(s) as paid?`)) return;
    try {
      await api.post('/api/cpq/commissions/pay', { commission_ids: ids });
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    }
  };

  const totalPending = summary.reduce((sum, s) => sum + parseFloat(s.pending_amount || 0), 0);
  const totalApproved = summary.reduce((sum, s) => sum + parseFloat(s.approved_amount || 0), 0);
  const totalPaid = summary.reduce((sum, s) => sum + parseFloat(s.paid_amount || 0), 0);
  const totalRevenue = summary.reduce((sum, s) => sum + parseFloat(s.total_revenue || 0), 0);

  return (
    <ModulePage title="Commissions" menuItems={salesMenu}>
      <div className="commissions-page">
        {/* KPI Cards */}
        <div className="comm-stats">
          <div className="comm-stat">
            <span className="comm-stat-value">${totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="comm-stat-label">Total Revenue</span>
          </div>
          <div className="comm-stat comm-stat-pending">
            <span className="comm-stat-value">${totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="comm-stat-label">Pending</span>
          </div>
          <div className="comm-stat comm-stat-approved">
            <span className="comm-stat-value">${totalApproved.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="comm-stat-label">Approved</span>
          </div>
          <div className="comm-stat comm-stat-paid">
            <span className="comm-stat-value">${totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            <span className="comm-stat-label">Paid</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="comm-tabs">
          <button className={activeTab === 'summary' ? 'active' : ''} onClick={() => setActiveTab('summary')}>
            Summary by Rep
          </button>
          <button className={activeTab === 'ledger' ? 'active' : ''} onClick={() => setActiveTab('ledger')}>
            Commission Ledger
          </button>
          <button className={activeTab === 'rules' ? 'active' : ''} onClick={() => setActiveTab('rules')}>
            Commission Rules
          </button>
        </div>

        {loading ? <div className="comm-loading">Loading...</div> : (
          <>
            {/* Summary by Rep */}
            {activeTab === 'summary' && (
              <div className="comm-table-wrap">
                <table className="comm-table">
                  <thead>
                    <tr>
                      <th>Sales Rep</th>
                      <th>Total Revenue</th>
                      <th>Commissions Earned</th>
                      <th>Pending</th>
                      <th>Approved</th>
                      <th>Paid</th>
                      <th>Effective Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map(s => {
                      const effectiveRate = parseFloat(s.total_revenue) > 0
                        ? (parseFloat(s.total_amount || 0) / parseFloat(s.total_revenue) * 100).toFixed(1)
                        : '0.0';
                      return (
                        <tr key={s.salesperson_id}>
                          <td><strong>{s.salesperson_name}</strong></td>
                          <td>${parseFloat(s.total_revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td>${parseFloat(s.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="comm-pending">${parseFloat(s.pending_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="comm-approved">${parseFloat(s.approved_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="comm-paid">${parseFloat(s.paid_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td>{effectiveRate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {summary.length === 0 && <div className="comm-empty">No commission data yet. Commissions are calculated when invoices are created.</div>}
              </div>
            )}

            {/* Commission Ledger */}
            {activeTab === 'ledger' && (
              <div className="comm-table-wrap">
                <div className="comm-filter">
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="paid">Paid</option>
                  </select>
                  {ledger.filter(l => l.status === 'approved').length > 0 && (
                    <button className="comm-pay-btn" onClick={() => handlePayCommissions(
                      ledger.filter(l => l.status === 'approved').map(l => l.id)
                    )}>
                      Pay All Approved
                    </button>
                  )}
                </div>
                <table className="comm-table">
                  <thead>
                    <tr>
                      <th>Sales Rep</th>
                      <th>Invoice</th>
                      <th>Invoice Amount</th>
                      <th>Rate</th>
                      <th>Commission</th>
                      <th>Status</th>
                      <th>Paid Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger
                      .filter(l => !filterStatus || l.status === filterStatus)
                      .map(l => (
                        <tr key={l.id}>
                          <td>{l.salesperson_name}</td>
                          <td>{l.invoice_number || `INV-${l.invoice_id}`}</td>
                          <td>${parseFloat(l.invoice_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td>{parseFloat(l.commission_rate).toFixed(1)}%</td>
                          <td><strong>${parseFloat(l.commission_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                          <td>
                            <span className={`comm-status comm-status-${l.status}`}>
                              {l.status.toUpperCase()}
                            </span>
                          </td>
                          <td>{l.paid_date || '-'}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Commission Rules */}
            {activeTab === 'rules' && (
              <div className="comm-table-wrap">
                <table className="comm-table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Sales Rep</th>
                      <th>Customer Type</th>
                      <th>Min Revenue</th>
                      <th>Max Revenue</th>
                      <th>Commission Rate</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rules.map(r => (
                      <tr key={r.id}>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.salesperson_name || 'All'}</td>
                        <td>{r.customer_type || 'All'}</td>
                        <td>${parseFloat(r.min_revenue).toLocaleString()}</td>
                        <td>${parseFloat(r.max_revenue).toLocaleString()}</td>
                        <td className="comm-rate">{parseFloat(r.commission_rate).toFixed(1)}%</td>
                        <td>{r.is_active ? '✅' : '❌'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </ModulePage>
  );
}
