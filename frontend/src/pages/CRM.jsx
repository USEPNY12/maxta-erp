import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { FaUsers, FaFunnelDollar, FaCalendarAlt, FaPlus, FaPhone, FaEnvelope, FaHandshake, FaChartLine } from 'react-icons/fa';

export default function CRM() {
  const [tab, setTab] = useState('pipeline');
  const [leads, setLeads] = useState([]);
  const [activities, setActivities] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [dashboard, setDashboard] = useState({ stats: {}, recent_activities: [] });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(null); // 'lead' or 'activity'
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadActivities, setLeadActivities] = useState([]);
  const [leadForm, setLeadForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', source: 'other', status: 'new', estimated_value: '', notes: '' });
  const [activityForm, setActivityForm] = useState({ activity_type: 'call', subject: '', description: '', customer_id: '', lead_id: '', scheduled_at: '', duration_minutes: '' });

  useEffect(() => { loadData(); }, [tab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (tab === 'pipeline') {
        const res = await api.get('/api/crm/pipeline');
        setPipeline(res.data.pipeline || []);
      } else if (tab === 'leads') {
        const res = await api.get('/api/crm/leads');
        setLeads(res.data.leads || []);
      } else if (tab === 'activities') {
        const res = await api.get('/api/crm/activities');
        setActivities(res.data.activities || []);
      } else if (tab === 'dashboard') {
        const res = await api.get('/api/crm/dashboard');
        setDashboard(res.data);
      }
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  const createLead = async () => {
    try {
      await api.post('/api/crm/leads', leadForm);
      toast.success('Lead created');
      setShowForm(null);
      setLeadForm({ company_name: '', contact_name: '', email: '', phone: '', source: 'other', status: 'new', estimated_value: '', notes: '' });
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const createActivity = async () => {
    try {
      await api.post('/api/crm/activities', { ...activityForm, lead_id: selectedLead?.id || activityForm.lead_id });
      toast.success('Activity logged');
      setShowForm(null);
      if (selectedLead) viewLead(selectedLead);
      loadData();
    } catch (err) { toast.error('Failed'); }
  };

  const viewLead = async (lead) => {
    try {
      const res = await api.get(`/api/crm/leads/${lead.id}`);
      setSelectedLead(res.data.lead);
      setLeadActivities(res.data.activities || []);
    } catch (err) { toast.error('Failed'); }
  };

  const updateLeadStatus = async (id, status) => {
    try {
      const lead = leads.find(l => l.id === id) || selectedLead;
      await api.put(`/api/crm/leads/${id}`, { ...lead, status });
      toast.success('Status updated');
      loadData();
      if (selectedLead) viewLead({ id });
    } catch (err) { toast.error('Failed'); }
  };

  const convertLead = async (id) => {
    try {
      const res = await api.post(`/api/crm/leads/${id}/convert`);
      toast.success(`Converted! Customer: ${res.data.customer_number}`);
      loadData();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const statusColors = { new: 'bg-blue-100 text-blue-800', contacted: 'bg-cyan-100 text-cyan-800', qualified: 'bg-indigo-100 text-indigo-800', proposal: 'bg-purple-100 text-purple-800', negotiation: 'bg-yellow-100 text-yellow-800', won: 'bg-green-100 text-green-800', lost: 'bg-red-100 text-red-800' };
  const actTypeIcons = { call: FaPhone, email: FaEnvelope, meeting: FaHandshake, site_visit: FaUsers, quote_sent: FaFunnelDollar, follow_up: FaCalendarAlt, note: FaChartLine, task: FaCalendarAlt };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FaHandshake className="text-emerald-600" />
          <h1 className="text-lg font-bold text-gray-800">CRM & Sales Pipeline</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm('lead')} className="px-3 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700 flex items-center gap-1"><FaPlus /> New Lead</button>
          <button onClick={() => setShowForm('activity')} className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center gap-1"><FaPlus /> Log Activity</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-gray-50 border-b px-4 flex gap-1">
        {[{id:'pipeline', label:'Pipeline', icon: FaFunnelDollar}, {id:'leads', label:'All Leads', icon: FaUsers}, {id:'activities', label:'Activities', icon: FaCalendarAlt}, {id:'dashboard', label:'Dashboard', icon: FaChartLine}].map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSelectedLead(null); }} className={`px-3 py-2 text-xs font-medium border-b-2 flex items-center gap-1 ${tab === t.id ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <t.icon size={12} /> {t.label}
          </button>
        ))}
      </div>

      {/* Forms Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={() => setShowForm(null)}>
          <div className="bg-white rounded-lg shadow-xl p-4 w-96 max-h-[80vh] overflow-auto" onClick={e => e.stopPropagation()}>
            {showForm === 'lead' ? (
              <>
                <h3 className="font-bold text-sm mb-3">New Lead</h3>
                <div className="space-y-2 text-xs">
                  <div><label className="block font-medium">Company</label><input className="w-full border rounded px-2 py-1" value={leadForm.company_name} onChange={e => setLeadForm({...leadForm, company_name: e.target.value})} /></div>
                  <div><label className="block font-medium">Contact Name</label><input className="w-full border rounded px-2 py-1" value={leadForm.contact_name} onChange={e => setLeadForm({...leadForm, contact_name: e.target.value})} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block font-medium">Email</label><input className="w-full border rounded px-2 py-1" value={leadForm.email} onChange={e => setLeadForm({...leadForm, email: e.target.value})} /></div>
                    <div><label className="block font-medium">Phone</label><input className="w-full border rounded px-2 py-1" value={leadForm.phone} onChange={e => setLeadForm({...leadForm, phone: e.target.value})} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="block font-medium">Source</label>
                      <select className="w-full border rounded px-2 py-1" value={leadForm.source} onChange={e => setLeadForm({...leadForm, source: e.target.value})}>
                        <option value="website">Website</option><option value="referral">Referral</option><option value="trade_show">Trade Show</option><option value="cold_call">Cold Call</option><option value="smart_glazier">Smart Glazier</option><option value="walk_in">Walk-In</option><option value="other">Other</option>
                      </select>
                    </div>
                    <div><label className="block font-medium">Est. Value ($)</label><input type="number" className="w-full border rounded px-2 py-1" value={leadForm.estimated_value} onChange={e => setLeadForm({...leadForm, estimated_value: e.target.value})} /></div>
                  </div>
                  <div><label className="block font-medium">Notes</label><textarea className="w-full border rounded px-2 py-1" rows="2" value={leadForm.notes} onChange={e => setLeadForm({...leadForm, notes: e.target.value})} /></div>
                  <button onClick={createLead} className="w-full mt-2 px-3 py-1.5 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700">Create Lead</button>
                </div>
              </>
            ) : (
              <>
                <h3 className="font-bold text-sm mb-3">Log Activity</h3>
                <div className="space-y-2 text-xs">
                  <div><label className="block font-medium">Type</label>
                    <select className="w-full border rounded px-2 py-1" value={activityForm.activity_type} onChange={e => setActivityForm({...activityForm, activity_type: e.target.value})}>
                      <option value="call">Phone Call</option><option value="email">Email</option><option value="meeting">Meeting</option><option value="site_visit">Site Visit</option><option value="quote_sent">Quote Sent</option><option value="follow_up">Follow Up</option><option value="note">Note</option><option value="task">Task</option>
                    </select>
                  </div>
                  <div><label className="block font-medium">Subject</label><input className="w-full border rounded px-2 py-1" value={activityForm.subject} onChange={e => setActivityForm({...activityForm, subject: e.target.value})} /></div>
                  <div><label className="block font-medium">Description</label><textarea className="w-full border rounded px-2 py-1" rows="2" value={activityForm.description} onChange={e => setActivityForm({...activityForm, description: e.target.value})} /></div>
                  <div><label className="block font-medium">Scheduled At</label><input type="datetime-local" className="w-full border rounded px-2 py-1" value={activityForm.scheduled_at} onChange={e => setActivityForm({...activityForm, scheduled_at: e.target.value})} /></div>
                  <div><label className="block font-medium">Duration (min)</label><input type="number" className="w-full border rounded px-2 py-1" value={activityForm.duration_minutes} onChange={e => setActivityForm({...activityForm, duration_minutes: e.target.value})} /></div>
                  <button onClick={createActivity} className="w-full mt-2 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">Log Activity</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Pipeline View */}
        {tab === 'pipeline' && (
          <div className="flex gap-3 h-full overflow-x-auto pb-4">
            {pipeline.map(stage => (
              <div key={stage.stage} className="min-w-[220px] w-56 flex flex-col bg-gray-50 rounded-lg border">
                <div className="p-2 border-b bg-white rounded-t-lg">
                  <div className="font-medium text-xs">{stage.stage}</div>
                  <div className="text-xs text-gray-500">{stage.count} leads • ${(stage.total_value || 0).toLocaleString()}</div>
                </div>
                <div className="flex-1 overflow-auto p-2 space-y-2">
                  {stage.leads.map(lead => (
                    <div key={lead.id} className="bg-white rounded border p-2 text-xs cursor-pointer hover:shadow" onClick={() => viewLead(lead)}>
                      <div className="font-medium">{lead.company_name}</div>
                      <div className="text-gray-500">{lead.contact_name}</div>
                      {lead.estimated_value > 0 && <div className="text-emerald-600 font-medium mt-1">${parseFloat(lead.estimated_value).toLocaleString()}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Leads List */}
        {tab === 'leads' && (
          <div className="flex gap-4 h-full">
            <div className="flex-1 overflow-auto">
              <table className="w-full text-xs border-collapse bg-white">
                <thead className="bg-gray-100 sticky top-0">
                  <tr>
                    <th className="text-left p-2 border">Company</th>
                    <th className="text-left p-2 border">Contact</th>
                    <th className="text-left p-2 border">Source</th>
                    <th className="text-center p-2 border">Status</th>
                    <th className="text-right p-2 border">Value</th>
                    <th className="text-left p-2 border">Assigned</th>
                    <th className="text-center p-2 border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.length === 0 && <tr><td colSpan="7" className="p-8 text-center text-gray-400">No leads yet. Create your first lead to start tracking opportunities.</td></tr>}
                  {leads.map(l => (
                    <tr key={l.id} className={`hover:bg-emerald-50 cursor-pointer ${selectedLead?.id === l.id ? 'bg-emerald-50' : ''}`} onClick={() => viewLead(l)}>
                      <td className="p-2 border font-medium">{l.company_name}</td>
                      <td className="p-2 border">{l.contact_name}</td>
                      <td className="p-2 border capitalize">{l.source?.replace('_', ' ')}</td>
                      <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded text-xs ${statusColors[l.status] || 'bg-gray-100'}`}>{l.status}</span></td>
                      <td className="p-2 border text-right">{l.estimated_value ? `$${parseFloat(l.estimated_value).toLocaleString()}` : '-'}</td>
                      <td className="p-2 border">{l.assigned_name || '-'}</td>
                      <td className="p-2 border text-center">
                        {l.status !== 'won' && l.status !== 'lost' && (
                          <button onClick={(e) => { e.stopPropagation(); convertLead(l.id); }} className="px-2 py-0.5 bg-emerald-600 text-white rounded text-xs" title="Convert to Customer">Convert</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Lead Detail */}
            {selectedLead && (
              <div className="w-80 bg-white border rounded p-3 overflow-auto">
                <h3 className="font-bold text-sm">{selectedLead.company_name}</h3>
                <div className="text-xs space-y-1 mt-2">
                  <p><span className="font-medium">Contact:</span> {selectedLead.contact_name}</p>
                  <p><span className="font-medium">Email:</span> {selectedLead.email}</p>
                  <p><span className="font-medium">Phone:</span> {selectedLead.phone}</p>
                  <p><span className="font-medium">Source:</span> {selectedLead.source}</p>
                  <p><span className="font-medium">Value:</span> ${parseFloat(selectedLead.estimated_value || 0).toLocaleString()}</p>
                  <p><span className="font-medium">Status:</span> <span className={`px-2 py-0.5 rounded ${statusColors[selectedLead.status]}`}>{selectedLead.status}</span></p>
                  {selectedLead.notes && <p><span className="font-medium">Notes:</span> {selectedLead.notes}</p>}
                </div>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {['contacted','qualified','proposal','negotiation','won','lost'].filter(s => s !== selectedLead.status).map(s => (
                    <button key={s} onClick={() => updateLeadStatus(selectedLead.id, s)} className={`px-2 py-0.5 rounded text-xs ${statusColors[s]}`}>{s}</button>
                  ))}
                </div>
                <h4 className="font-medium text-xs mt-3 mb-1">Activities ({leadActivities.length}):</h4>
                <button onClick={() => setShowForm('activity')} className="text-xs text-blue-600 mb-2">+ Add Activity</button>
                {leadActivities.map(a => (
                  <div key={a.id} className="border rounded p-2 mb-1 text-xs">
                    <div className="flex items-center gap-1">
                      <span className="font-medium capitalize">{a.activity_type.replace('_', ' ')}</span>
                      <span className={`ml-auto px-1.5 py-0.5 rounded ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span>
                    </div>
                    <p className="mt-0.5">{a.subject}</p>
                    <p className="text-gray-400">{new Date(a.created_at).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activities */}
        {tab === 'activities' && (
          <table className="w-full text-xs border-collapse bg-white">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="text-left p-2 border">Date</th>
                <th className="text-left p-2 border">Type</th>
                <th className="text-left p-2 border">Subject</th>
                <th className="text-left p-2 border">Customer/Lead</th>
                <th className="text-left p-2 border">Assigned</th>
                <th className="text-center p-2 border">Status</th>
              </tr>
            </thead>
            <tbody>
              {activities.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{a.scheduled_at ? new Date(a.scheduled_at).toLocaleString() : new Date(a.created_at).toLocaleDateString()}</td>
                  <td className="p-2 border capitalize">{a.activity_type.replace('_', ' ')}</td>
                  <td className="p-2 border">{a.subject}</td>
                  <td className="p-2 border">{a.customer_name || a.lead_name || '-'}</td>
                  <td className="p-2 border">{a.assigned_name || '-'}</td>
                  <td className="p-2 border text-center"><span className={`px-2 py-0.5 rounded ${a.status === 'completed' ? 'bg-green-100 text-green-700' : a.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Dashboard */}
        {tab === 'dashboard' && (
          <div>
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-emerald-600">{dashboard.stats.total_leads || 0}</div><div className="text-xs text-gray-500">Active Leads</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-blue-600">${(dashboard.stats.total_value || 0).toLocaleString()}</div><div className="text-xs text-gray-500">Pipeline Value</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-green-600">{dashboard.stats.won_this_month || 0}</div><div className="text-xs text-gray-500">Won This Month</div></div>
              <div className="bg-white border rounded p-4 text-center"><div className="text-2xl font-bold text-orange-600">{dashboard.stats.activities_due || 0}</div><div className="text-xs text-gray-500">Activities Due (7 days)</div></div>
            </div>
            <h3 className="font-medium text-sm mb-2">Recent Activities</h3>
            <div className="bg-white border rounded">
              {(dashboard.recent_activities || []).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 border-b text-xs">
                  <span className="capitalize font-medium">{a.activity_type?.replace('_', ' ')}</span>
                  <span className="text-gray-600">{a.subject}</span>
                  <span className="ml-auto text-gray-400">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
