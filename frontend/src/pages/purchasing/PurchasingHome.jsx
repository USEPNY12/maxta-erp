import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ModulePage from '../../components/ModulePage';
import api from '../../services/api';
function PurchasingHome() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  useEffect(() => { fetchDashboard(); }, []);
  const fetchDashboard = async () => {
    try { const res = await api.get('/api/purchasing/dashboard'); setDashboard(res.data); } catch {}
  };
  return (
    <ModulePage
      title="Purchasing"
      quickActions={[
        { label: 'New Purchase Order', path: '/purchasing/purchase-orders?new=true' },
        { label: 'Receive Materials', path: '/purchasing/receipts?new=true' },
        { label: 'New Vendor', path: '/purchasing/vendors?new=true' },
      ]}
      menuItems={[
        { label: 'Purchasing Home', path: '/purchasing', icon: '🏠' },
        { label: 'Purchase Orders', path: '/purchasing/purchase-orders', icon: '📋' },
        { label: 'Receiving', path: '/purchasing/receipts', icon: '📥' },
        { label: 'A/P Invoices', path: '/purchasing/ap-invoices', icon: '💰' },
        { label: 'Vendors', path: '/purchasing/vendors', icon: '🏢' },
        { label: 'Vendor Items', path: '/purchasing/vendor-items', icon: '📦' },
        { label: 'Buy for WO/Job', path: '/purchasing/buy-for-wo', icon: '🔧' },
        { label: 'Locations', path: '/purchasing/locations', icon: '📍' },
      ]}
    >
      <div className="p-4 space-y-4">
        {/* KPI Cards */}
        {dashboard && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded p-3 cursor-pointer" onClick={() => navigate('/purchasing/purchase-orders')}>
              <div className="text-2xl font-bold text-blue-700">{dashboard.open_pos}</div>
              <div className="text-xs text-blue-600">Open Purchase Orders</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded p-3 cursor-pointer" onClick={() => navigate('/purchasing/receipts')}>
              <div className="text-2xl font-bold text-green-700">{dashboard.recent_receipts}</div>
              <div className="text-xs text-green-600">Receipts This Week</div>
            </div>
            <div className={`border rounded p-3 cursor-pointer ${dashboard.overdue_ap?.count > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`} onClick={() => navigate('/purchasing/ap-invoices')}>
              <div className={`text-2xl font-bold ${dashboard.overdue_ap?.count > 0 ? 'text-red-700' : 'text-gray-700'}`}>${parseFloat(dashboard.open_ap || 0).toFixed(0)}</div>
              <div className={`text-xs ${dashboard.overdue_ap?.count > 0 ? 'text-red-600' : 'text-gray-600'}`}>Open A/P Balance {dashboard.overdue_ap?.count > 0 && `(${dashboard.overdue_ap.count} overdue)`}</div>
            </div>
          </div>
        )}
        {/* Purchase-to-Pay Flow */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="text-sm font-bold mb-3 text-gray-700">Purchase-to-Pay Flow</h3>
          <div className="flex items-center justify-between">
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-blue-100 border-2 border-blue-400 rounded flex items-center justify-center text-xs font-bold text-blue-700 cursor-pointer hover:bg-blue-200" onClick={() => navigate('/purchasing/purchase-orders?new=true')}>Create PO</div>
              <div className="text-[10px] text-gray-500 mt-1">Draft</div>
            </div>
            <div className="text-gray-400 text-lg">→</div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-yellow-100 border-2 border-yellow-400 rounded flex items-center justify-center text-xs font-bold text-yellow-700">Approve</div>
              <div className="text-[10px] text-gray-500 mt-1">Open</div>
            </div>
            <div className="text-gray-400 text-lg">→</div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-purple-100 border-2 border-purple-400 rounded flex items-center justify-center text-xs font-bold text-purple-700">Send to Vendor</div>
              <div className="text-[10px] text-gray-500 mt-1">Sent</div>
            </div>
            <div className="text-gray-400 text-lg">→</div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-green-100 border-2 border-green-400 rounded flex items-center justify-center text-xs font-bold text-green-700 cursor-pointer hover:bg-green-200" onClick={() => navigate('/purchasing/receipts')}>Receive</div>
              <div className="text-[10px] text-gray-500 mt-1">Inventory + Lot + Barcode</div>
            </div>
            <div className="text-gray-400 text-lg">→</div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-orange-100 border-2 border-orange-400 rounded flex items-center justify-center text-xs font-bold text-orange-700 cursor-pointer hover:bg-orange-200" onClick={() => navigate('/purchasing/ap-invoices')}>AP Invoice</div>
              <div className="text-[10px] text-gray-500 mt-1">3-Way Match</div>
            </div>
            <div className="text-gray-400 text-lg">→</div>
            <div className="flex flex-col items-center">
              <div className="w-24 h-16 bg-emerald-100 border-2 border-emerald-400 rounded flex items-center justify-center text-xs font-bold text-emerald-700">Pay</div>
              <div className="text-[10px] text-gray-500 mt-1">Close PO</div>
            </div>
          </div>
        </div>
        {/* Pending Receipts */}
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="text-sm font-bold mb-2 text-gray-700">Awaiting Receipt ({dashboard?.pending_receipts || 0} POs)</h3>
          <p className="text-xs text-gray-500">Open purchase orders waiting for material delivery. Click "Receiving" to process incoming shipments.</p>
        </div>
      </div>
    </ModulePage>
  );
}
export default PurchasingHome;
