import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';

function ManufacturingHome() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, []);

  const fetchDashboard = async () => {
    try {
      const res = await api.get('/api/manufacturing/dashboard');
      setDashboard(res.data);
    } catch { setDashboard(null); }
    setLoading(false);
  };

  const stationColors = {
    '#2563eb': 'from-blue-500 to-blue-700',
    '#06b6d4': 'from-cyan-500 to-cyan-700',
    '#7c3aed': 'from-purple-500 to-purple-700',
    '#8b5cf6': 'from-violet-500 to-violet-700',
    '#6b7280': 'from-gray-500 to-gray-700',
    '#dc2626': 'from-red-500 to-red-700',
    '#16a34a': 'from-green-500 to-green-700',
    '#f59e0b': 'from-amber-500 to-amber-700',
    '#4b5563': 'from-gray-600 to-gray-800',
    '#ea580c': 'from-orange-500 to-orange-700',
    '#0d9488': 'from-teal-500 to-teal-700',
    'blue': 'from-blue-500 to-blue-700',
  };

  return (
    <ModulePage
      title="Manufacturing"
      quickActions={[
        { label: 'New Work Order', path: '/manufacturing/work-orders?new=true' },
        { label: 'Shop Floor', path: '/manufacturing/shop-floor' },
      ]}
      setupItems={[
        { label: 'Work Centers', path: '/manufacturing/work-centers' },
        { label: 'Routing Templates', path: '/manufacturing/routing-templates' },
      ]}
      menuItems={[
        { label: 'Manufacturing Home', path: '/manufacturing', icon: '🏠' },
        { label: 'Work Orders', path: '/manufacturing/work-orders', icon: '📋' },
        { label: 'Shop Floor', path: '/manufacturing/shop-floor', icon: '🏭' },
        { label: 'Quality Control', path: '/manufacturing/quality', icon: '✅' },
        { label: 'Production Schedule', path: '/manufacturing/production-schedule', icon: '📅' },
        { label: 'Bill of Materials', path: '/manufacturing/bom', icon: '📦' },
        { label: 'Labor', path: '/manufacturing/labor', icon: '👷' },
        { label: 'Recuts / Scrap', path: '/manufacturing/recuts', icon: '⚠️' },
        { label: 'Work Centers', path: '/manufacturing/work-centers', icon: '⚙️' },
        { label: 'Routing Templates', path: '/manufacturing/routing-templates', icon: '🔄' },
      ]}
      reports={{
        type: 'Manufacturing',
        options: ['Work Order Status', 'WO Cost Summary', 'Open Work Orders', 'Recut Report', 'Labor Report', 'Production Efficiency', 'Station Throughput']
      }}
    >
      <div className="p-4 space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-5 gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
            <div className="text-2xl font-bold text-blue-700">{dashboard?.open_wos || 0}</div>
            <div className="text-xs text-gray-600">Open Work Orders</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-center">
            <div className="text-2xl font-bold text-yellow-700">{dashboard?.in_progress || 0}</div>
            <div className="text-xs text-gray-600">In Progress</div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded p-3 text-center">
            <div className="text-2xl font-bold text-red-700">{dashboard?.overdue || 0}</div>
            <div className="text-xs text-gray-600">Overdue</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded p-3 text-center">
            <div className="text-2xl font-bold text-green-700">{dashboard?.completed_today || 0}</div>
            <div className="text-xs text-gray-600">Completed Today</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded p-3 text-center">
            <div className="text-2xl font-bold text-orange-700">{dashboard?.monthly_recuts || 0}</div>
            <div className="text-xs text-gray-600">Recuts (Month)</div>
          </div>
        </div>

        {/* Station Overview - Production Flow */}
        <div className="border border-gray-300 rounded">
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 font-bold text-sm flex justify-between items-center">
            <span>Production Floor - Station Queue Overview</span>
            <button className="text-blue-600 text-xs hover:underline" onClick={() => navigate('/manufacturing/shop-floor')}>Open Shop Floor →</button>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-3">
              {(dashboard?.by_station || []).map(station => (
                <div
                  key={station.id}
                  className="cursor-pointer hover:shadow-md transition-shadow rounded-lg overflow-hidden border border-gray-200 w-[130px]"
                  onClick={() => navigate(`/manufacturing/shop-floor?station=${station.id}`)}
                >
                  <div className={`bg-gradient-to-br ${stationColors[station.color] || 'from-gray-500 to-gray-700'} text-white px-3 py-2 text-center`}>
                    <div className="text-lg">{station.icon}</div>
                    <div className="text-[10px] font-bold truncate">{station.name}</div>
                  </div>
                  <div className="bg-white px-3 py-2 text-center">
                    <div className="text-xl font-bold">{station.queue_count}</div>
                    <div className="text-[9px] text-gray-500">in queue</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Glass Fabrication Process Flow */}
        <div className="border border-gray-300 rounded">
          <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 font-bold text-sm">Glass Fabrication Process Flow</div>
          <div className="p-4">
            <div className="flex items-center justify-center flex-wrap gap-1 text-xs">
              {['✂️ Cut', '💎 Edge', '🔧 CNC', '🚿 Wash', '🔥 Temper', '♨️ HST', '🧪 Laminate', '🪟 IGU', '✅ QC', '📦 Pack'].map((step, i, arr) => (
                <React.Fragment key={i}>
                  <div className="bg-gray-100 border border-gray-300 rounded px-2 py-1 text-center whitespace-nowrap">
                    {step}
                  </div>
                  {i < arr.length - 1 && <span className="text-gray-400">→</span>}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <div className="font-bold text-blue-700">Tempered Panel</div>
                <div className="text-gray-600">Cut → Edge → Wash → Temper → QC → Pack</div>
              </div>
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <div className="font-bold text-green-700">Laminated Glass</div>
                <div className="text-gray-600">Cut → Edge → Wash → Laminate → QC → Pack</div>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded p-2">
                <div className="font-bold text-teal-700">IGU (Insulated)</div>
                <div className="text-gray-600">Cut → Edge → Wash → Temper → QC → IGU → QC → Pack</div>
              </div>
            </div>
          </div>
        </div>

        {/* By Product Type */}
        {dashboard?.by_product_type && dashboard.by_product_type.length > 0 && (
          <div className="border border-gray-300 rounded">
            <div className="bg-gray-100 border-b border-gray-300 px-4 py-2 font-bold text-sm">Active Orders by Product Type</div>
            <div className="p-4 flex gap-3 flex-wrap">
              {dashboard.by_product_type.map((pt, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded px-3 py-2 text-center">
                  <div className="text-lg font-bold">{pt.count}</div>
                  <div className="text-xs text-gray-600 capitalize">{(pt.product_type || 'custom').replace(/_/g, ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModulePage>
  );
}
export default ManufacturingHome;
