import React, { useState, useEffect } from 'react';
import api from '../services/api';

const GL_SETTING_LABELS = {
  gl_default_bank: { label: 'Default Bank / Cash Account', group: 'General' },
  gl_default_ar: { label: 'Accounts Receivable', group: 'General' },
  gl_default_ap: { label: 'Accounts Payable', group: 'General' },
  gl_default_retained_earnings: { label: 'Retained Earnings', group: 'General' },
  gl_default_sales_tax: { label: 'Sales Tax Payable', group: 'General' },
  gl_default_inventory_raw: { label: 'Raw Materials Inventory', group: 'Inventory' },
  gl_default_inventory_wip: { label: 'Work in Progress (WIP)', group: 'Inventory' },
  gl_default_inventory_fg: { label: 'Finished Goods Inventory', group: 'Inventory' },
  gl_default_sales_revenue: { label: 'Sales Revenue', group: 'Sales' },
  gl_default_freight_revenue: { label: 'Freight Revenue', group: 'Sales' },
  gl_default_cogs: { label: 'Cost of Goods Sold', group: 'Sales' },
  gl_default_direct_labor: { label: 'Direct Labor', group: 'Manufacturing' },
  gl_default_mfg_overhead: { label: 'Manufacturing Overhead', group: 'Manufacturing' },
  gl_default_material_variance: { label: 'Material Variance', group: 'Manufacturing' },
  gl_default_labor_variance: { label: 'Labor Variance', group: 'Manufacturing' },
  gl_default_ppv: { label: 'Purchase Price Variance', group: 'Purchasing' },
};

const GROUPS = ['General', 'Inventory', 'Sales', 'Manufacturing', 'Purchasing'];

export default function GLDefaults() {
  const [settings, setSettings] = useState({});
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    loadDefaults();
  }, []);

  const loadDefaults = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/setup/gl-defaults');
      const settingsMap = {};
      (res.data.settings || []).forEach(s => {
        settingsMap[s.setting_key] = s.setting_value;
      });
      setSettings(settingsMap);
      setAccounts(res.data.accounts || []);
    } catch (e) {
      console.error('Load GL defaults error:', e);
    }
    setLoading(false);
  };

  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/api/setup/gl-defaults', { settings });
      setDirty(false);
      alert('GL Defaults saved successfully!');
    } catch (e) {
      alert('Error saving: ' + (e.response?.data?.error || e.message));
    }
    setSaving(false);
  };

  if (loading) return <div className="p-6 text-gray-500">Loading GL Defaults...</div>;

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">GL Account Defaults</h2>
          <p className="text-sm text-gray-500">Configure the default GL accounts used for automatic journal entries across all modules.</p>
        </div>
        <button onClick={handleSave} disabled={!dirty || saving}
          className={`px-4 py-2 rounded text-sm font-medium ${dirty ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      {/* Info Banner */}
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
        These accounts are used when the system automatically posts journal entries (e.g., PO Receipt, Shipment COGS, WO Material Issue, Payments). 
        Each transaction type uses the accounts configured here unless overridden at the item level.
      </div>

      {/* Settings by Group */}
      <div className="space-y-6">
        {GROUPS.map(group => {
          const groupSettings = Object.entries(GL_SETTING_LABELS).filter(([_, v]) => v.group === group);
          return (
            <div key={group} className="bg-white rounded shadow p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-3 pb-2 border-b">{group}</h3>
              <div className="grid grid-cols-2 gap-4">
                {groupSettings.map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-3">
                    <label className="text-sm text-gray-600 w-48 flex-shrink-0">{meta.label}:</label>
                    <select value={settings[key] || ''} onChange={e => handleChange(key, e.target.value)}
                      className="flex-1 border rounded px-2 py-1.5 text-sm bg-white">
                      <option value="">-- Not Set --</option>
                      {(accounts || []).map(a => (
                        <option key={a.account_number} value={a.account_number}>
                          {a.account_number} - {a.account_name}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-gray-400 w-12">{settings[key] || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* How It Works Section */}
      <div className="mt-6 bg-gray-50 rounded border p-4">
        <h4 className="font-semibold text-sm text-gray-700 mb-2">How Auto-Posting Works</h4>
        <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
          <div>
            <p className="font-medium text-gray-700 mb-1">PO Receipt:</p>
            <p>DR: Raw Materials Inventory | CR: AP Accrual</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Shipment (COGS):</p>
            <p>DR: COGS | CR: Finished Goods Inventory</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">WO Material Issue:</p>
            <p>DR: WIP | CR: Raw Materials Inventory</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">WO Receipt (Completion):</p>
            <p>DR: Finished Goods | CR: WIP</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Customer Payment:</p>
            <p>DR: Bank/Cash | CR: Accounts Receivable</p>
          </div>
          <div>
            <p className="font-medium text-gray-700 mb-1">Vendor Payment:</p>
            <p>DR: Accounts Payable | CR: Bank/Cash</p>
          </div>
        </div>
      </div>
    </div>
  );
}
