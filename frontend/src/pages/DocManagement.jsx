import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaFileAlt, FaEnvelope, FaUpload, FaDownload, FaTrash, FaPaperPlane, FaRedo, FaEdit } from 'react-icons/fa';

export default function DocManagement() {
  const [tab, setTab] = useState('templates');
  const [templates, setTemplates] = useState([]);
  const [emailQueue, setEmailQueue] = useState([]);
  const [stats, setStats] = useState({ stats: {}, by_type: [] });
  const [loading, setLoading] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [emailForm, setEmailForm] = useState({ to_email: '', to_name: '', cc_email: '', subject: '', body_html: '', template_id: '' });
  const [templateForm, setTemplateForm] = useState({ template_name: '', template_type: 'custom', subject: '', body_html: '' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'templates') {
        const res = await api.get('/api/docmanagement/email-templates');
        setTemplates(res.data.templates || []);
      } else if (tab === 'queue') {
        const res = await api.get('/api/docmanagement/email-queue');
        setEmailQueue(res.data.emails || []);
      } else if (tab === 'stats') {
        const res = await api.get('/api/docmanagement/stats');
        setStats(res.data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const sendEmail = async () => {
    try {
      const res = await api.post('/api/docmanagement/send-email', emailForm);
      toast.success(res.data.message);
      setShowEmailForm(false);
      setEmailForm({ to_email: '', to_name: '', cc_email: '', subject: '', body_html: '', template_id: '' });
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const retryEmail = async (id) => {
    try {
      await api.post(`/api/docmanagement/email-queue/${id}/retry`);
      toast.info('Email requeued');
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const saveTemplate = async () => {
    try {
      if (editTemplate) {
        await api.put(`/api/docmanagement/email-templates/${editTemplate.id}`, templateForm);
        toast.success('Template updated');
      } else {
        await api.post('/api/docmanagement/email-templates', templateForm);
        toast.success('Template created');
      }
      setShowTemplateForm(false);
      setEditTemplate(null);
      setTemplateForm({ template_name: '', template_type: 'custom', subject: '', body_html: '' });
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const startEditTemplate = (t) => {
    setEditTemplate(t);
    setTemplateForm({ template_name: t.template_name, template_type: t.template_type, subject: t.subject, body_html: t.body_html });
    setShowTemplateForm(true);
  };

  const selectTemplate = (templateId) => {
    const t = templates?.find(x => x.id === parseInt(templateId));
    if (t) {
      setEmailForm({ ...emailForm, template_id: templateId, subject: t.subject, body_html: t.body_html });
    }
  };

  const statusBadge = (status) => {
    const colors = { queued: 'bg-yellow-100 text-yellow-800', sending: 'bg-blue-100 text-blue-800', sent: 'bg-green-100 text-green-800', failed: 'bg-red-100 text-red-800', cancelled: 'bg-gray-100 text-gray-600' };
    return <span className={`px-2 py-0.5 rounded text-xs ${colors[status] || 'bg-gray-100'}`}>{status}</span>;
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaFileAlt className="text-teal-600" />
          <h1 className="text-lg font-bold text-gray-800">Documents & Email</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEmailForm(true)} className="px-3 py-1 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 flex items-center gap-1"><FaPaperPlane /> Send Email</button>
          <button onClick={() => { setEditTemplate(null); setTemplateForm({ template_name: '', template_type: 'custom', subject: '', body_html: '' }); setShowTemplateForm(true); }} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300 flex items-center gap-1"><FaEdit /> New Template</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border-b px-4 flex gap-1">
        {[{id:'templates', label:'Email Templates', icon: FaFileAlt}, {id:'queue', label:'Email Queue', icon: FaEnvelope}, {id:'stats', label:'Statistics', icon: FaFileAlt}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1 ${tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Send Email Modal */}
      {showEmailForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowEmailForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-[500px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">Compose Email</h3>
            <div className="space-y-2 text-xs">
              <div><label className="block font-medium">Template (optional)</label>
                <select className="w-full border rounded px-2 py-1" value={emailForm.template_id} onChange={e => selectTemplate(e.target.value)}>
                  <option value="">-- No Template --</option>
                  {templates?.map(t => <option key={t.id} value={t.id}>{t.template_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-medium">To Email *</label><input className="w-full border rounded px-2 py-1" value={emailForm.to_email} onChange={e => setEmailForm({...emailForm, to_email: e.target.value})} /></div>
                <div><label className="block font-medium">To Name</label><input className="w-full border rounded px-2 py-1" value={emailForm.to_name} onChange={e => setEmailForm({...emailForm, to_name: e.target.value})} /></div>
              </div>
              <div><label className="block font-medium">CC</label><input className="w-full border rounded px-2 py-1" value={emailForm.cc_email} onChange={e => setEmailForm({...emailForm, cc_email: e.target.value})} /></div>
              <div><label className="block font-medium">Subject *</label><input className="w-full border rounded px-2 py-1" value={emailForm.subject} onChange={e => setEmailForm({...emailForm, subject: e.target.value})} /></div>
              <div><label className="block font-medium">Body (HTML)</label><textarea className="w-full border rounded px-2 py-1 font-mono" rows="6" value={emailForm.body_html} onChange={e => setEmailForm({...emailForm, body_html: e.target.value})} /></div>
              <button onClick={sendEmail} className="w-full mt-2 px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700 flex items-center justify-center gap-1"><FaPaperPlane /> Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Template Form Modal */}
      {showTemplateForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowTemplateForm(false)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-[500px] max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-sm mb-3">{editTemplate ? 'Edit Template' : 'New Email Template'}</h3>
            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-medium">Template Name</label><input className="w-full border rounded px-2 py-1" value={templateForm.template_name} onChange={e => setTemplateForm({...templateForm, template_name: e.target.value})} /></div>
                <div><label className="block font-medium">Type</label>
                  <select className="w-full border rounded px-2 py-1" value={templateForm.template_type} onChange={e => setTemplateForm({...templateForm, template_type: e.target.value})}>
                    <option value="invoice">Invoice</option><option value="quote">Quote</option><option value="order_confirmation">Order Confirmation</option><option value="shipment_notification">Shipment</option><option value="payment_receipt">Payment Receipt</option><option value="overdue_reminder">Overdue Reminder</option><option value="welcome">Welcome</option><option value="custom">Custom</option>
                  </select>
                </div>
              </div>
              <div><label className="block font-medium">Subject</label><input className="w-full border rounded px-2 py-1" value={templateForm.subject} onChange={e => setTemplateForm({...templateForm, subject: e.target.value})} placeholder="Use {{variable}} for placeholders" /></div>
              <div><label className="block font-medium">Body (HTML)</label><textarea className="w-full border rounded px-2 py-1 font-mono" rows="8" value={templateForm.body_html} onChange={e => setTemplateForm({...templateForm, body_html: e.target.value})} /></div>
              <p className="text-gray-400">Available variables: {'{{customer_name}}, {{invoice_number}}, {{total}}, {{due_date}}, {{order_number}}'}</p>
              <button onClick={saveTemplate} className="w-full mt-2 px-3 py-1.5 bg-teal-600 text-white rounded text-xs hover:bg-teal-700">{editTemplate ? 'Update Template' : 'Create Template'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {tab === 'templates' && (
          <table className="w-full text-xs border-collapse bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Template Name</th>
                <th className="text-left p-2 border">Type</th>
                <th className="text-left p-2 border">Subject</th>
                <th className="text-center p-2 border">Active</th>
                <th className="text-center p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates?.map(t => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="p-2 border font-medium">{t.template_name}</td>
                  <td className="p-2 border capitalize">{t.template_type?.replace('_', ' ')}</td>
                  <td className="p-2 border">{t.subject}</td>
                  <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded text-xs ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.is_active ? 'Yes' : 'No'}</span></td>
                  <td className="p-2 border text-center">
                    <button onClick={() => startEditTemplate(t)} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200"><FaEdit /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'queue' && (
          <table className="w-full text-xs border-collapse bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">To</th>
                <th className="text-left p-2 border">Subject</th>
                <th className="text-center p-2 border">Status</th>
                <th className="text-left p-2 border">Sent</th>
                <th className="text-left p-2 border">Error</th>
                <th className="text-center p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {emailQueue.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No emails in queue</td></tr>}
              {emailQueue?.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{new Date(e.created_at).toLocaleString()}</td>
                  <td className="p-2 border">{e.to_email}</td>
                  <td className="p-2 border">{e.subject}</td>
                  <td className="p-2 border text-center">{statusBadge(e.status)}</td>
                  <td className="p-2 border">{e.sent_at ? new Date(e.sent_at).toLocaleString() : '-'}</td>
                  <td className="p-2 border text-red-500 max-w-[150px] truncate">{e.error_message || '-'}</td>
                  <td className="p-2 border text-center">
                    {e.status === 'failed' && <button onClick={() => retryEmail(e.id)} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs"><FaRedo /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'stats' && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-teal-600">{stats.stats?.total_docs || 0}</div><div className="text-xs text-gray-500">Total Documents</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-blue-600">{stats.stats?.total_size_mb || 0} MB</div><div className="text-xs text-gray-500">Storage Used</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-green-600">{stats.stats?.emails_sent || 0}</div><div className="text-xs text-gray-500">Emails Sent</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-red-600">{stats.stats?.emails_failed || 0}</div><div className="text-xs text-gray-500">Emails Failed</div></div>
            </div>
            <h3 className="font-medium text-sm mb-2">Documents by Type</h3>
            <table className="w-full text-xs border-collapse bg-white">
              <thead className="bg-gray-100">
                <tr><th className="text-left p-2 border">Reference Type</th><th className="text-right p-2 border">Count</th></tr>
              </thead>
              <tbody>
                {(stats.by_type || [])?.map(t => (
                  <tr key={t.reference_type}><td className="p-2 border capitalize">{t.reference_type?.replace('_', ' ')}</td><td className="p-2 border text-right">{t.count}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
