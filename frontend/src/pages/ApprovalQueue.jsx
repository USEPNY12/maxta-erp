import { useState, useEffect } from 'react';
import api from '../services/api';
import ModulePage from '../components/ModulePage';
import { salesMenu } from '../config/moduleMenus';

/**
 * Approval Queue - Manage pending document approvals
 * Shows quotes, orders, POs that need manager/owner approval
 */
export default function ApprovalQueue() {
  const [queue, setQueue] = useState([]);
  const [allApprovals, setAllApprovals] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showWorkflows, setShowWorkflows] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [queueRes, allRes, wfRes] = await Promise.all([
        api.get('/api/cpq/approvals/queue?status=pending'),
        api.get('/api/cpq/approvals/all'),
        api.get('/api/cpq/approvals/workflows')
      ]);
      setQueue(Array.isArray(queueRes.data) ? queueRes.data : []);
      setAllApprovals(Array.isArray(allRes.data) ? allRes.data : []);
      setWorkflows(Array.isArray(wfRes.data) ? wfRes.data : []);
    } catch (err) {
      console.error('Failed to load approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDecision = async (id, decision) => {
    const comments = decision === 'rejected' ? prompt('Reason for rejection:') : '';
    if (decision === 'rejected' && comments === null) return; // cancelled

    setActionLoading(id);
    try {
      await api.post(`/api/cpq/approvals/${id}/decision`, { decision, comments });
      await loadData();
    } catch (err) {
      alert('Error: ' + (err.response?.data?.error || err.message));
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    const colors = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', escalated: '#8b5cf6' };
    return (
      <span className="status-badge" style={{ background: colors[status] || '#6b7280', color: '#fff', padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
        {status.toUpperCase()}
      </span>
    );
  };

  const getDocTypeIcon = (type) => {
    const icons = { quote: '📋', sales_order: '📦', purchase_order: '🛒', credit_memo: '💳' };
    return icons[type] || '📄';
  };

  return (
    <ModulePage title="Approval Queue" menuItems={salesMenu}>
      <div className="approval-queue-page">
        {/* Header Stats */}
        <div className="aq-stats">
          <div className="aq-stat aq-stat-pending">
            <span className="aq-stat-value">{queue.length}</span>
            <span className="aq-stat-label">Pending</span>
          </div>
          <div className="aq-stat aq-stat-approved">
            <span className="aq-stat-value">{allApprovals?.filter(a => a.status === 'approved').length}</span>
            <span className="aq-stat-label">Approved</span>
          </div>
          <div className="aq-stat aq-stat-rejected">
            <span className="aq-stat-value">{allApprovals?.filter(a => a.status === 'rejected').length}</span>
            <span className="aq-stat-label">Rejected</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="aq-tabs">
          <button className={activeTab === 'pending' ? 'active' : ''} onClick={() => setActiveTab('pending')}>
            Pending Approvals ({queue.length})
          </button>
          <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>
            History
          </button>
          <button className={activeTab === 'workflows' ? 'active' : ''} onClick={() => setActiveTab('workflows')}>
            Workflow Rules
          </button>
        </div>

        {loading ? <div className="aq-loading">Loading...</div> : (
          <>
            {/* Pending Queue */}
            {activeTab === 'pending' && (
              <div className="aq-list">
                {queue.length === 0 ? (
                  <div className="aq-empty">No pending approvals. All clear!</div>
                ) : (
                  (queue || [])?.map(item => (
                    <div key={item.id} className="aq-card">
                      <div className="aq-card-header">
                        <span className="aq-doc-type">{getDocTypeIcon(item.document_type)} {item.document_type.replace('_', ' ').toUpperCase()}</span>
                        <span className="aq-doc-number">{item.document_number || `#${item.document_id}`}</span>
                        {getStatusBadge(item.status)}
                      </div>
                      <div className="aq-card-body">
                        <div className="aq-trigger">
                          <strong>Trigger:</strong> {item.trigger_reason}
                        </div>
                        <div className="aq-meta">
                          <span>Requested by: {item.requested_by_name}</span>
                          <span>Rule: {item.workflow_name}</span>
                          <span>Value: ${parseFloat(item.trigger_value || 0).toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="aq-card-actions">
                        <button className="aq-btn aq-btn-approve" disabled={actionLoading === item.id}
                          onClick={() => handleDecision(item.id, 'approved')}>
                          {actionLoading === item.id ? '...' : 'Approve'}
                        </button>
                        <button className="aq-btn aq-btn-reject" disabled={actionLoading === item.id}
                          onClick={() => handleDecision(item.id, 'rejected')}>
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* History */}
            {activeTab === 'history' && (
              <div className="aq-table-wrap">
                <table className="aq-table">
                  <thead>
                    <tr>
                      <th>Type</th>
                      <th>Document</th>
                      <th>Rule</th>
                      <th>Requested By</th>
                      <th>Approver</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allApprovals?.map(item => (
                      <tr key={item.id}>
                        <td>{getDocTypeIcon(item.document_type)} {item.document_type.replace('_', ' ')}</td>
                        <td>{item.document_number || `#${item.document_id}`}</td>
                        <td>{item.workflow_name}</td>
                        <td>{item.requested_by_name}</td>
                        <td>{item.approver_name || '-'}</td>
                        <td>{getStatusBadge(item.status)}</td>
                        <td>{item.decision_at ? new Date(item.decision_at).toLocaleDateString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Workflow Rules */}
            {activeTab === 'workflows' && (
              <div className="aq-table-wrap">
                <table className="aq-table">
                  <thead>
                    <tr>
                      <th>Rule Name</th>
                      <th>Document Type</th>
                      <th>Condition</th>
                      <th>Threshold</th>
                      <th>Approver</th>
                      <th>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workflows?.map(wf => (
                      <tr key={wf.id}>
                        <td><strong>{wf.name}</strong></td>
                        <td>{wf.document_type.replace('_', ' ')}</td>
                        <td>{wf.condition_field} {wf.condition_operator}</td>
                        <td>${parseFloat(wf.condition_value).toLocaleString()}</td>
                        <td>{wf.approver_role}</td>
                        <td>{wf.is_active ? '✅' : '❌'}</td>
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
