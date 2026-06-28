import { useState, useEffect } from 'react';

const API = '/api/mobile';

export default function NotificationSettings() {
  const [preferences, setPreferences] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [mobileStatus, setMobileStatus] = useState(null);

  const token = localStorage.getItem('erp_token');
  const headers = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

  useEffect(() => {
    setPushSupported('serviceWorker' in navigator && 'PushManager' in window);
    if ('Notification' in window) setPushPermission(Notification.permission);
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [prefsRes, subsRes, statusRes] = await Promise.all([
        fetch(`${API}/preferences`, { headers }),
        fetch(`${API}/push/subscriptions`, { headers }),
        fetch(`${API}/status`, { headers })
      ]);
      setPreferences(await prefsRes.json());
      setSubscriptions(await subsRes.json());
      setMobileStatus(await statusRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const savePreferences = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/preferences`, {
        method: 'PUT', headers,
        body: JSON.stringify({ preferences })
      });
      if (res.ok) {
        setMessage('Preferences saved successfully');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) { setMessage('Error saving preferences'); }
    setSaving(false);
  };

  const requestPushPermission = async () => {
    if (!pushSupported) return;
    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);
      if (permission === 'granted') {
        await subscribeToPush();
      }
    } catch (e) { setMessage('Error requesting permission: ' + e.message); }
  };

  const subscribeToPush = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      // Get VAPID public key
      const vapidRes = await fetch(`${API}/vapid-key`);
      const { publicKey } = await vapidRes.json();

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey)
      });

      const subJson = subscription.toJSON();
      await fetch(`${API}/push/subscribe`, {
        method: 'POST', headers,
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
          deviceName: getDeviceName(),
          deviceType: getDeviceType()
        })
      });
      setMessage('Push notifications enabled!');
      loadData();
    } catch (e) { setMessage('Error subscribing: ' + e.message); }
  };

  const unsubscribe = async (endpoint) => {
    try {
      await fetch(`${API}/push/unsubscribe`, {
        method: 'DELETE', headers,
        body: JSON.stringify({ endpoint })
      });
      loadData();
      setMessage('Device unsubscribed');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) { setMessage('Error unsubscribing'); }
  };

  const togglePref = (index, field) => {
    const updated = [...preferences];
    updated[index] = { ...updated[index], [field]: !updated[index][field] };
    setPreferences(updated);
  };

  const categoryLabels = {
    orders: { label: 'Sales Orders', desc: 'New orders, order status changes, approvals' },
    production: { label: 'Production', desc: 'Work order updates, completion, delays' },
    inventory: { label: 'Inventory', desc: 'Low stock alerts, receiving, transfers' },
    accounting: { label: 'Accounting', desc: 'Invoice due, payments received, budget alerts' },
    shipping: { label: 'Shipping', desc: 'Shipment ready, delivery confirmations' },
    system: { label: 'System', desc: 'Maintenance, updates, security alerts' },
    approvals: { label: 'Approvals', desc: 'Quote approvals, PO approvals, discount requests' }
  };

  if (loading) return <div className="p-6 text-center text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notification Settings</h1>
          <p className="text-gray-400 mt-1">Manage how and when you receive notifications</p>
        </div>
        {mobileStatus && (
          <div className="text-right text-sm text-gray-400">
            <div>Push Devices: {mobileStatus.pushSubscriptions}</div>
            <div>Pending Sync: {mobileStatus.pendingSync}</div>
          </div>
        )}
      </div>

      {message && (
        <div className={`p-3 rounded-lg text-center ${message.includes('Error') ? 'bg-red-900/50 text-red-200' : 'bg-green-900/50 text-green-200'}`}>
          {message}
        </div>
      )}

      {/* Push Notification Status */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Push Notifications</h2>
        {!pushSupported ? (
          <div className="text-yellow-400 bg-yellow-900/30 p-4 rounded-lg">
            Push notifications are not supported in this browser. Use Chrome, Edge, or Firefox for push support.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">Browser Permission</div>
                <div className="text-gray-400 text-sm">
                  {pushPermission === 'granted' ? 'Allowed - You will receive push notifications' :
                   pushPermission === 'denied' ? 'Blocked - Enable in browser settings' :
                   'Not yet requested'}
                </div>
              </div>
              {pushPermission !== 'granted' && pushPermission !== 'denied' && (
                <button onClick={requestPushPermission} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
                  Enable Push
                </button>
              )}
              {pushPermission === 'granted' && (
                <span className="px-3 py-1 bg-green-600/30 text-green-400 rounded-full text-sm">Active</span>
              )}
            </div>

            {/* Registered Devices */}
            {subscriptions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-400 mb-2">Registered Devices</h3>
                <div className="space-y-2">
                  {subscriptions.map(sub => (
                    <div key={sub.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-3">
                      <div>
                        <div className="text-white text-sm">{sub.device_name}</div>
                        <div className="text-gray-400 text-xs">{sub.device_type} • Last used: {new Date(sub.last_used_at).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => unsubscribe()} className="text-red-400 hover:text-red-300 text-sm">Remove</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences by Category */}
      <div className="bg-gray-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Notification Categories</h2>
          <button onClick={savePreferences} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg text-sm">
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-gray-400 text-sm border-b border-gray-700">
                <th className="text-left py-3 px-2">Category</th>
                <th className="text-center py-3 px-2">Push</th>
                <th className="text-center py-3 px-2">In-App</th>
                <th className="text-center py-3 px-2">Email</th>
              </tr>
            </thead>
            <tbody>
              {preferences.map((pref, idx) => {
                const info = categoryLabels[pref.category] || { label: pref.category, desc: '' };
                return (
                  <tr key={pref.category} className="border-b border-gray-700/50">
                    <td className="py-3 px-2">
                      <div className="text-white font-medium">{info.label}</div>
                      <div className="text-gray-500 text-xs">{info.desc}</div>
                    </td>
                    <td className="text-center py-3 px-2">
                      <button onClick={() => togglePref(idx, 'push_enabled')}
                        className={`w-10 h-6 rounded-full transition-colors ${pref.push_enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${pref.push_enabled ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                    <td className="text-center py-3 px-2">
                      <button onClick={() => togglePref(idx, 'in_app_enabled')}
                        className={`w-10 h-6 rounded-full transition-colors ${pref.in_app_enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${pref.in_app_enabled ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                    <td className="text-center py-3 px-2">
                      <button onClick={() => togglePref(idx, 'email_enabled')}
                        className={`w-10 h-6 rounded-full transition-colors ${pref.email_enabled ? 'bg-blue-600' : 'bg-gray-600'}`}>
                        <div className={`w-4 h-4 bg-white rounded-full transition-transform mx-1 ${pref.email_enabled ? 'translate-x-4' : ''}`} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PWA Install */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Install App</h2>
        <p className="text-gray-400 mb-4">Install MaxTA ERP as a standalone app on your device for faster access and offline support.</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-1">iOS (iPhone/iPad)</h3>
            <p className="text-gray-400 text-sm">Tap Share → "Add to Home Screen"</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-1">Android</h3>
            <p className="text-gray-400 text-sm">Tap menu → "Install app" or "Add to Home Screen"</p>
          </div>
          <div className="bg-gray-700 rounded-lg p-4">
            <h3 className="text-white font-medium mb-1">Desktop (Chrome/Edge)</h3>
            <p className="text-gray-400 text-sm">Click install icon in address bar</p>
          </div>
        </div>
      </div>

      {/* Service Worker Info */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-bold text-white mb-4">Offline & Sync Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{mobileStatus?.pendingSync || 0}</div>
            <div className="text-gray-400 text-sm">Pending Sync</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{mobileStatus?.conflicts || 0}</div>
            <div className="text-gray-400 text-sm">Conflicts</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-white">{mobileStatus?.activeKiosks || 0}</div>
            <div className="text-gray-400 text-sm">Active Kiosks</div>
          </div>
          <div className="bg-gray-700 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-400">v9</div>
            <div className="text-gray-400 text-sm">SW Version</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Utility functions
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

function getDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone';
  if (/iPad/.test(ua)) return 'iPad';
  if (/Android/.test(ua)) return 'Android Device';
  if (/Windows/.test(ua)) return 'Windows PC';
  if (/Mac/.test(ua)) return 'Mac';
  return 'Unknown Device';
}

function getDeviceType() {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}
