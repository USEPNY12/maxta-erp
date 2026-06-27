import TemplateManager from '../components/TemplateManager';
import GLDefaults from '../components/GLDefaults';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../services/api';
import FabricationCharges from './setup/FabricationCharges';

// ============ CONSTANTS ============
const MODULES = ['system_setup', 'inventory', 'sales', 'manufacturing', 'purchasing', 'accounting', 'reports'];
const PERMISSIONS = ['view', 'create', 'edit', 'delete', 'approve', 'post'];
const MODULE_LABELS = { system_setup: 'System Setup', inventory: 'Inventory', sales: 'Sales', manufacturing: 'Manufacturing', purchasing: 'Purchasing', accounting: 'Accounting', reports: 'Reports' };

const NAV_SECTIONS = [
  { group: 'Security', icon: '🔒', items: [
    { key: 'users', label: 'Users' },
    { key: 'roles', label: 'Roles' },
    { key: 'permissions', label: 'Permissions Matrix' }
  ]},
  { group: 'General', icon: '⚙️', items: [
    { key: 'company', label: 'Company Info' },
    { key: 'payment-terms', label: 'Payment Terms' },
    { key: 'tax-codes', label: 'Tax Codes' },
    { key: 'currencies', label: 'Currencies' },
    { key: 'carriers', label: 'Carriers' },
    { key: 'departments', label: 'Departments' }
  ]},
  { group: 'Sales', icon: '💰', items: [
    { key: 'customer-types', label: 'Customer Types' },
    { key: 'tax-groups', label: 'Tax Groups' },
    { key: 'price-lists', label: 'Price Lists' },
    { key: 'salespeople', label: 'Salespeople' }
  ]},
  { group: 'Inventory', icon: '📦', items: [
    { key: 'item-types', label: 'Item Types' },
    { key: 'locations', label: 'Locations' },
    { key: 'location-groups', label: 'Location Groups' },
    { key: 'adjustment-codes', label: 'Adjustment Codes' },
    { key: 'scrap-codes', label: 'Scrap Codes' }
  ]},
  { group: 'Manufacturing', icon: '🏭', items: [
    { key: 'work-centers', label: 'Work Centers' },
    { key: 'fabrication-charges', label: 'Fabrication Charges' }
  ]},
  { group: 'Purchasing', icon: '🛒', items: [
    { key: 'vendor-types', label: 'Vendor Types' }
  ]},
    { group: 'Documents & Email', icon: '📄', items: [
    { key: 'templates', label: 'Document Templates' },
    { key: 'email-config', label: 'Email Configuration' }
  ]},
  { group: 'Accounting', icon: '📊', items: [
    { key: 'banks', label: 'Banks' },
    { key: 'bank-accounts', label: 'Bank Accounts' },
    { key: 'accounting-periods', label: 'Accounting Periods' },
    { key: 'gl-defaults', label: 'GL Defaults' }
  ]}
];

// ============ MAIN COMPONENT ============
export default function SystemSetup() {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const [activeSection, setActiveSection] = useState(tabParam || 'users');
  const [expandedGroups, setExpandedGroups] = useState(() => {
    if (tabParam) {
      const group = NAV_SECTIONS.find(s => s.items.some(i => i.key === tabParam));
      if (group) return ['Security', 'General', group.group];
    }
    return ['Security', 'General'];
  });
    const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    if (tabParam) {
      setActiveSection(tabParam);
      const group = NAV_SECTIONS.find(s => s.items.some(i => i.key === tabParam));
      if (group && !expandedGroups.includes(group.group)) {
        setExpandedGroups(prev => [...prev, group.group]);
      }
    }
  }, [tabParam]);

  const toggleGroup = (group) => {
    setExpandedGroups(prev => prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]);
  };

  const handleNavClick = (key) => {
    setActiveSection(key);
    setMobileNavOpen(false);
  };

  // Get current section label for mobile dropdown
  const currentLabel = NAV_SECTIONS.flatMap(s => s.items).find(i => i.key === activeSection)?.label || 'Users';
  const currentGroup = NAV_SECTIONS.find(s => s.items.some(i => i.key === activeSection));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* Mobile Section Selector - shows as dropdown on mobile */}
      <div className="setup-mobile-header">
        <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="setup-mobile-selector">
          <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>{currentGroup?.icon}</span>
            <span style={{ fontWeight: 600 }}>{currentLabel}</span>
          </span>
          <span style={{ fontSize: 12 }}>{mobileNavOpen ? '▲' : '▼'}</span>
        </button>
        {mobileNavOpen && (
          <div className="setup-mobile-dropdown">
            {NAV_SECTIONS.map(section => (
              <div key={section.group}>
                <div style={{ padding: '8px 12px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', background: '#f1f5f9' }}>
                  {section.icon} {section.group}
                </div>
                {section.items.map(item => (
                  <div key={item.key} onClick={() => handleNavClick(item.key)} style={{ padding: '10px 16px', fontSize: 14, cursor: 'pointer', color: activeSection === item.key ? '#2563eb' : '#334155', background: activeSection === item.key ? '#eff6ff' : '#fff', fontWeight: activeSection === item.key ? 600 : 400, borderLeft: activeSection === item.key ? '3px solid #2563eb' : '3px solid transparent' }}>
                    {item.label}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Desktop: Flex row with sidebar */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
      {/* Mobile nav toggle - FAB button */}
      <button onClick={() => setMobileNavOpen(!mobileNavOpen)} className="mobile-nav-toggle" style={{ display: 'none', position: 'fixed', bottom: 20, right: 20, zIndex: 1000, width: 48, height: 48, borderRadius: '50%', background: '#1976d2', color: '#fff', border: 'none', fontSize: 20, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>☰</button>
      
      {/* Left Navigation */}
      <div className="setup-left-nav" style={{ width: 240, minWidth: 240, background: '#1e293b', color: '#e2e8f0', overflowY: 'auto', borderRight: '1px solid #334155' }}>
        <div style={{ padding: '16px 12px 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: 1 }}>System Setup</div>
        {NAV_SECTIONS.map(section => (
          <div key={section.group}>
            <div onClick={() => toggleGroup(section.group)} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#cbd5e1', background: expandedGroups.includes(section.group) ? '#334155' : 'transparent', borderBottom: '1px solid #334155' }}>
              <span style={{ marginRight: 8 }}>{section.icon}</span>
              <span style={{ flex: 1 }}>{section.group}</span>
              <span style={{ fontSize: 10 }}>{expandedGroups.includes(section.group) ? '▼' : '▶'}</span>
            </div>
            {expandedGroups.includes(section.group) && section.items.map(item => (
              <div key={item.key} onClick={() => handleNavClick(item.key)} style={{ padding: '8px 12px 8px 36px', cursor: 'pointer', fontSize: 13, color: activeSection === item.key ? '#fff' : '#94a3b8', background: activeSection === item.key ? '#2563eb' : 'transparent', borderLeft: activeSection === item.key ? '3px solid #60a5fa' : '3px solid transparent', transition: 'all 0.15s' }}>
                {item.label}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#f8fafc', padding: '20px 24px' }}>
        {activeSection === 'users' && <UsersSection />}
        {activeSection === 'roles' && <RolesSection />}
        {activeSection === 'permissions' && <PermissionsMatrix />}
        {activeSection === 'company' && <CompanyInfo />}
        {(activeSection === 'templates' || activeSection === 'email-config') && <TemplateManager />}
        {activeSection === 'gl-defaults' && <GLDefaults />}
        {activeSection === 'fabrication-charges' && <FabricationCharges />}
        {!['users', 'roles', 'permissions', 'company', 'templates', 'email-config', 'gl-defaults', 'fabrication-charges'].includes(activeSection) && <GenericSetupTable tableKey={activeSection} />}
      </div>

      </div>{/* end flex row */}
      <style>{`
        .setup-mobile-header { display: none; }
        @media (max-width: 768px) {
          .setup-mobile-header {
            display: block;
            position: sticky;
            top: 0;
            z-index: 100;
            background: #fff;
            border-bottom: 1px solid #e2e8f0;
          }
          .setup-mobile-selector {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 12px 16px;
            background: #fff;
            border: none;
            font-size: 15px;
            color: #1e293b;
            cursor: pointer;
          }
          .setup-mobile-dropdown {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: #fff;
            border-bottom: 2px solid #2563eb;
            box-shadow: 0 8px 24px rgba(0,0,0,0.15);
            max-height: 60vh;
            overflow-y: auto;
            z-index: 200;
          }
          .setup-left-nav { display: none !important; }
          .mobile-nav-toggle { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ============ USERS SECTION ============
function UsersSection() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const [pwUser, setPwUser] = useState(null);
  const [form, setForm] = useState({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'readonly', department: '', is_active: true });
  const [newPw, setNewPw] = useState('');
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([api.get('/api/setup/users'), api.get('/api/setup/roles/list')]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => { setEditUser(null); setForm({ username: '', email: '', password: '', first_name: '', last_name: '', role: 'readonly', department: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = (u) => { setEditUser(u); setForm({ ...u, password: '', is_active: !!u.is_active }); setError(''); setShowModal(true); };
  const openPwReset = (u) => { setPwUser(u); setNewPw(''); setError(''); setShowPwModal(true); };

  const handleSave = async () => {
    try {
      setError('');
      if (editUser) {
        await api.put(`/api/setup/users/${editUser.id}`, { email: form.email, first_name: form.first_name, last_name: form.last_name, role: form.role, department: form.department, is_active: form.is_active });
      } else {
        if (!form.username || !form.email || !form.password) { setError('Username, email, and password are required'); return; }
        await api.post('/api/setup/users', form);
      }
      setShowModal(false);
      loadData();
    } catch (e) { setError(e.response?.data?.error || 'Error saving user'); }
  };

  const handlePwReset = async () => {
    try {
      setError('');
      if (!newPw || newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
      await api.put(`/api/setup/users/${pwUser.id}/password`, { password: newPw });
      setShowPwModal(false);
    } catch (e) { setError(e.response?.data?.error || 'Error resetting password'); }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate user "${u.username}"? They will no longer be able to log in.`)) return;
    try {
      await api.delete(`/api/setup/users/${u.id}`);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const handleActivate = async (u) => {
    try {
      await api.put(`/api/setup/users/${u.id}`, { ...u, is_active: true });
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading users...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>User Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{users.length} total users, {users.filter(u => u.is_active).length} active</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add User</button>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <thead>
            <tr style={{ background: '#f1f5f9' }}>
              <th style={thStyle}>Username</th>
              <th style={thStyle}>Full Name</th>
              <th style={thStyle}>Email</th>
              <th style={thStyle}>Role</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Last Login</th>
              <th style={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid #e2e8f0', opacity: u.is_active ? 1 : 0.6 }}>
                <td style={tdStyle}><strong>{u.username}</strong></td>
                <td style={tdStyle}>{u.first_name} {u.last_name}</td>
                <td style={tdStyle}>{u.email}</td>
                <td style={tdStyle}><span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: getRoleBg(u.role), color: getRoleColor(u.role) }}>{u.role}</span></td>
                <td style={tdStyle}>{u.department || '—'}</td>
                <td style={tdStyle}><span style={{ color: u.is_active ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize: 12 }}>{u.is_active ? '● Active' : '● Inactive'}</span></td>
                <td style={tdStyle}>{u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}</td>
                <td style={tdStyle}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    <button onClick={() => openEdit(u)} style={btnSmStyle('#2563eb')}>Edit</button>
                    <button onClick={() => openPwReset(u)} style={btnSmStyle('#7c3aed')}>Reset PW</button>
                    {u.is_active && u.username !== 'admin' && <button onClick={() => handleDeactivate(u)} style={btnSmStyle('#dc2626')}>Deactivate</button>}
                    {!u.is_active && <button onClick={() => handleActivate(u)} style={btnSmStyle('#16a34a')}>Activate</button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <Modal title={editUser ? 'Edit User' : 'Add New User'} onClose={() => setShowModal(false)}>
          {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13, padding: '8px 12px', background: '#fef2f2', borderRadius: 4 }}>{error}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {!editUser && <FormField label="Username" value={form.username} onChange={v => setForm({...form, username: v})} />}
            <FormField label="Email" value={form.email} onChange={v => setForm({...form, email: v})} />
            {!editUser && <FormField label="Password" value={form.password} onChange={v => setForm({...form, password: v})} type="password" />}
            <FormField label="First Name" value={form.first_name} onChange={v => setForm({...form, first_name: v})} />
            <FormField label="Last Name" value={form.last_name} onChange={v => setForm({...form, last_name: v})} />
            <div>
              <label style={labelStyle}>Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} style={inputStyle}>
                {roles.map(r => <option key={r.id} value={r.name}>{r.name}</option>)}
              </select>
            </div>
            <FormField label="Department" value={form.department || ''} onChange={v => setForm({...form, department: v})} />
            {editUser && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 20 }}>
                <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} id="user-active" />
                <label htmlFor="user-active" style={{ fontSize: 13 }}>Active</label>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
            <button onClick={handleSave} style={{ ...btnSmStyle('#2563eb'), padding: '8px 20px' }}>Save User</button>
          </div>
        </Modal>
      )}

      {/* Password Reset Modal */}
      {showPwModal && (
        <Modal title={`Reset Password: ${pwUser?.username}`} onClose={() => setShowPwModal(false)}>
          {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13, padding: '8px 12px', background: '#fef2f2', borderRadius: 4 }}>{error}</div>}
          <FormField label="New Password (min 6 characters)" value={newPw} onChange={setNewPw} type="password" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowPwModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
            <button onClick={handlePwReset} style={{ ...btnSmStyle('#7c3aed'), padding: '8px 20px' }}>Reset Password</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ ROLES SECTION ============
function RolesSection() {
  const [roles, setRoles] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', is_active: true });
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [rolesRes, usersRes] = await Promise.all([api.get('/api/setup/roles/list'), api.get('/api/setup/users')]);
      setRoles(rolesRes.data);
      setUsers(usersRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const getUserCount = (roleName) => users.filter(u => u.role === roleName).length;

  const openAdd = () => { setEditRole(null); setForm({ name: '', description: '', is_active: true }); setError(''); setShowModal(true); };
  const openEdit = (r) => { setEditRole(r); setForm({ name: r.name, description: r.description, is_active: !!r.is_active }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    try {
      setError('');
      if (editRole) {
        await api.put(`/api/setup/roles/${editRole.id}`, { description: form.description, is_active: form.is_active });
      } else {
        if (!form.name) { setError('Role name is required'); return; }
        await api.post('/api/setup/roles', { name: form.name, description: form.description });
      }
      setShowModal(false);
      loadData();
    } catch (e) { setError(e.response?.data?.error || 'Error saving role'); }
  };

  const handleDelete = async (r) => {
    if (!confirm(`Delete role "${r.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/api/setup/roles/${r.id}`);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error deleting role'); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading roles...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>Role Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{roles.length} roles configured ({roles.filter(r => r.is_system).length} system, {roles.filter(r => !r.is_system).length} custom)</p>
        </div>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add Custom Role</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {roles.map(r => (
          <div key={r.id} style={{ background: '#fff', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', opacity: r.is_active ? 1 : 0.6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, color: '#1e293b', textTransform: 'capitalize' }}>{r.name}</h3>
                <div style={{ marginTop: 4 }}>
                  {r.is_system ? <span style={{ fontSize: 10, padding: '2px 6px', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, fontWeight: 600 }}>SYSTEM</span> : <span style={{ fontSize: 10, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 600 }}>CUSTOM</span>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button onClick={() => openEdit(r)} style={btnSmStyle('#2563eb')}>Edit</button>
                {!r.is_system && <button onClick={() => handleDelete(r)} style={btnSmStyle('#dc2626')}>Delete</button>}
              </div>
            </div>
            <p style={{ margin: '8px 0', fontSize: 13, color: '#64748b', minHeight: 36 }}>{r.description || 'No description'}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 8 }}>
              <span><strong>{getUserCount(r.name)}</strong> user{getUserCount(r.name) !== 1 ? 's' : ''} assigned</span>
              <span style={{ color: r.is_active ? '#16a34a' : '#dc2626' }}>{r.is_active ? '● Active' : '● Inactive'}</span>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <Modal title={editRole ? `Edit Role: ${editRole.name}` : 'Add Custom Role'} onClose={() => setShowModal(false)}>
          {error && <div style={{ color: '#dc2626', marginBottom: 12, fontSize: 13, padding: '8px 12px', background: '#fef2f2', borderRadius: 4 }}>{error}</div>}
          {!editRole && <FormField label="Role Name (lowercase, no spaces)" value={form.name} onChange={v => setForm({...form, name: v})} placeholder="e.g. supervisor" />}
          <div style={{ marginTop: editRole ? 0 : 12 }}>
            <FormField label="Description" value={form.description} onChange={v => setForm({...form, description: v})} placeholder="Brief description of this role's purpose" />
          </div>
          {editRole && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <input type="checkbox" checked={form.is_active} onChange={e => setForm({...form, is_active: e.target.checked})} id="role-active" />
              <label htmlFor="role-active" style={{ fontSize: 13 }}>Active</label>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
            <button onClick={handleSave} style={{ ...btnSmStyle('#2563eb'), padding: '8px 20px' }}>Save Role</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ PERMISSIONS MATRIX ============
function PermissionsMatrix() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(null);
  const [changes, setChanges] = useState({});
  const [successMsg, setSuccessMsg] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/api/setup/permissions/matrix');
      setData(res.data);
      setChanges({});
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isChecked = (roleId, module, perm) => {
    const key = `${roleId}`;
    if (changes[key]) {
      return (changes[key][module] || []).includes(perm);
    }
    return data?.matrix?.[roleId]?.permissions?.[module]?.includes(perm) || false;
  };

  const togglePerm = (roleId, module, perm) => {
    const key = `${roleId}`;
    // Initialize from current data if not yet modified
    const current = changes[key] || Object.fromEntries(MODULES.map(m => [m, [...(data?.matrix?.[roleId]?.permissions?.[m] || [])]]));
    const modPerms = current[module] || [];
    if (modPerms.includes(perm)) {
      current[module] = modPerms.filter(p => p !== perm);
    } else {
      current[module] = [...modPerms, perm];
    }
    setChanges({ ...changes, [key]: { ...current } });
  };

  const saveRole = async (roleId) => {
    try {
      setSaving(roleId);
      const perms = changes[`${roleId}`];
      if (!perms) return;
      // Filter out empty arrays
      const cleanPerms = {};
      Object.entries(perms).forEach(([mod, p]) => { if (p.length > 0) cleanPerms[mod] = p; });
      await api.put(`/api/setup/permissions/${roleId}`, { permissions: cleanPerms });
      const newChanges = { ...changes };
      delete newChanges[`${roleId}`];
      setChanges(newChanges);
      setSuccessMsg(`Permissions saved for role`);
      setTimeout(() => setSuccessMsg(''), 3000);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error saving permissions'); }
    finally { setSaving(null); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading permissions matrix...</div>;
  if (!data) return <div style={{ padding: 40, color: '#dc2626' }}>Error loading permissions</div>;

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>Permissions Matrix</h2>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Configure module access for each role. Check/uncheck permissions and click Save to apply changes.</p>
        {successMsg && <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: 4, fontSize: 13, fontWeight: 500 }}>{successMsg}</div>}
      </div>

      <div style={{ overflowX: 'auto' }}>
        {data.roles.map(role => (
          <div key={role.id} style={{ background: '#fff', borderRadius: 8, padding: 16, marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: changes[`${role.id}`] ? '2px solid #f59e0b' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0, fontSize: 15, textTransform: 'capitalize', color: '#1e293b' }}>
                <span style={{ padding: '2px 8px', borderRadius: 4, background: getRoleBg(role.name), color: getRoleColor(role.name), marginRight: 8 }}>{role.name}</span>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 400 }}>{role.description}</span>
              </h3>
              {changes[`${role.id}`] && (
                <button onClick={() => saveRole(role.id)} disabled={saving === role.id} style={{ padding: '6px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                  {saving === role.id ? 'Saving...' : '💾 Save Changes'}
                </button>
              )}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: '6px 10px', textAlign: 'left', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#475569', width: 140 }}>Module</th>
                    {PERMISSIONS.map(p => <th key={p} style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '2px solid #e2e8f0', fontWeight: 600, color: '#475569', textTransform: 'capitalize', width: 70 }}>{p}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod, i) => (
                    <tr key={mod} style={{ background: i % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 500, color: '#334155' }}>{MODULE_LABELS[mod]}</td>
                      {PERMISSIONS.map(perm => (
                        <td key={perm} style={{ padding: '6px 8px', textAlign: 'center' }}>
                          <input type="checkbox" checked={isChecked(role.id, mod, perm)} onChange={() => togglePerm(role.id, mod, perm)} style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#2563eb' }} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============ COMPANY INFO ============
function CompanyInfo() {
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/api/setup/company').then(r => { setForm(r.data || {}); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.put('/api/setup/company', form);
      setMsg('Company info saved successfully');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { alert(e.response?.data?.error || 'Error saving'); }
    finally { setSaving(false); }
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading...</div>;

  const fields = [
    { key: 'company_name', label: 'Company Name', span: 2 }, { key: 'address1', label: 'Address Line 1', span: 2 }, { key: 'address2', label: 'Address Line 2', span: 2 },
    { key: 'city', label: 'City' }, { key: 'state', label: 'State' }, { key: 'zip', label: 'ZIP Code' }, { key: 'country', label: 'Country' },
    { key: 'phone', label: 'Phone' }, { key: 'fax', label: 'Fax' }, { key: 'email', label: 'Email' }, { key: 'website', label: 'Website' }, { key: 'tax_id', label: 'Tax ID' }
  ];

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#1e293b' }}>Company Information</h2>
      {msg && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#f0fdf4', color: '#16a34a', borderRadius: 4, fontSize: 13 }}>{msg}</div>}
      <div style={{ background: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', maxWidth: 700 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {fields.map(f => (
            <div key={f.key} style={f.span === 2 ? { gridColumn: 'span 2' } : {}}>
              <FormField label={f.label} value={form[f.key] || ''} onChange={v => setForm({...form, [f.key]: v})} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 20, textAlign: 'right' }}>
          <button onClick={handleSave} disabled={saving} style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>{saving ? 'Saving...' : 'Save Company Info'}</button>
        </div>
      </div>
    </div>
  );
}

// ============ GENERIC SETUP TABLE ============
function GenericSetupTable({ tableKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [form, setForm] = useState({});
  const [columns, setColumns] = useState([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/setup/${tableKey}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setRows(data);
      if (data.length > 0) {
        setColumns(Object.keys(data[0]).filter(k => !['created_at', 'updated_at', 'password_hash'].includes(k)));
      } else {
        setColumns([]);
      }
    } catch (e) { console.error(e); setRows([]); }
    finally { setLoading(false); }
  }, [tableKey]);

  useEffect(() => { loadData(); }, [loadData]);

  const openAdd = () => {
    setEditRow(null);
    const newForm = {};
    columns.filter(c => c !== 'id').forEach(c => { newForm[c] = ''; });
    setForm(newForm);
    setShowModal(true);
  };

  const openEdit = (row) => {
    setEditRow(row);
    const editForm = {};
    columns.filter(c => c !== 'id').forEach(c => { editForm[c] = row[c] ?? ''; });
    setForm(editForm);
    setShowModal(true);
  };

  const handleSave = async () => {
    try {
      const cleanForm = { ...form };
      delete cleanForm.id; delete cleanForm.created_at; delete cleanForm.updated_at;
      if (editRow) {
        await api.put(`/api/setup/${tableKey}/${editRow.id}`, cleanForm);
      } else {
        await api.post(`/api/setup/${tableKey}`, cleanForm);
      }
      setShowModal(false);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error saving record'); }
  };

  const handleDelete = async (row) => {
    if (!confirm('Deactivate this record?')) return;
    try {
      await api.delete(`/api/setup/${tableKey}/${row.id}`);
      loadData();
    } catch (e) { alert(e.response?.data?.error || 'Error'); }
  };

  const label = NAV_SECTIONS.flatMap(s => s.items).find(i => i.key === tableKey)?.label || tableKey;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading {label}...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#1e293b' }}>{label}</h2>
        <button onClick={openAdd} style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>+ Add {label}</button>
      </div>

      {rows.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', background: '#fff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ fontSize: 15, margin: 0 }}>No records found</p>
          <p style={{ fontSize: 13, margin: '8px 0 0', color: '#cbd5e1' }}>Click "+ Add {label}" to create the first record.</p>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ background: '#f1f5f9' }}>
                {columns.map(c => <th key={c} style={thStyle}>{c.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</th>)}
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id || i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  {columns.map(c => <td key={c} style={tdStyle}>{formatCell(row[c], c)}</td>)}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button onClick={() => openEdit(row)} style={btnSmStyle('#2563eb')}>Edit</button>
                      <button onClick={() => handleDelete(row)} style={btnSmStyle('#dc2626')}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal title={editRow ? `Edit ${label}` : `Add ${label}`} onClose={() => setShowModal(false)}>
          <div style={{ display: 'grid', gridTemplateColumns: columns.length > 4 ? '1fr 1fr' : '1fr', gap: 12 }}>
            {Object.keys(form).filter(k => k !== 'id').map(k => (
              <FormField key={k} label={k.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} value={form[k] ?? ''} onChange={v => setForm({...form, [k]: v})} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowModal(false)} style={btnSmStyle('#64748b')}>Cancel</button>
            <button onClick={handleSave} style={{ ...btnSmStyle('#2563eb'), padding: '8px 20px' }}>Save</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ============ SHARED COMPONENTS ============
function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 560, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e2e8f0', paddingBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 18, color: '#1e293b' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder = '' }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

// ============ STYLE HELPERS ============
const thStyle = { padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.5 };
const tdStyle = { padding: '10px 12px', fontSize: 13, color: '#334155' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 };
const inputStyle = { width: '100%', padding: '8px 10px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 13, boxSizing: 'border-box', outline: 'none' };

function btnSmStyle(color) {
  return { padding: '5px 12px', background: color, color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap' };
}

function getRoleBg(role) {
  const map = { admin: '#fef2f2', manager: '#eff6ff', sales: '#f0fdf4', production: '#fefce8', purchasing: '#fdf4ff', accounting: '#f0f9ff', shipping: '#fef9c3', readonly: '#f1f5f9' };
  return map[role] || '#f1f5f9';
}

function getRoleColor(role) {
  const map = { admin: '#dc2626', manager: '#2563eb', sales: '#16a34a', production: '#ca8a04', purchasing: '#9333ea', accounting: '#0284c7', shipping: '#a16207', readonly: '#64748b' };
  return map[role] || '#64748b';
}

function formatCell(val, colName) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? <span style={{ color: '#16a34a' }}>● Yes</span> : <span style={{ color: '#dc2626' }}>● No</span>;
  // Only treat 0/1 as boolean for columns that are clearly flags
  if ((val === 1 || val === 0) && colName && (colName.startsWith('is_') || colName.startsWith('has_') || colName === 'active' || colName === 'taxable')) {
    return val === 1 ? <span style={{ color: '#16a34a' }}>● Yes</span> : <span style={{ color: '#dc2626' }}>● No</span>;
  }
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/)) {
    return new Date(val).toLocaleDateString();
  }
  if (typeof val === 'number') return val.toLocaleString();
  return String(val);
}
