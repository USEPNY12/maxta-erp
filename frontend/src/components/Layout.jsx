import React, { useContext } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { FaHome, FaCog, FaBoxes, FaDollarSign, FaWrench, FaIndustry, FaShoppingCart, FaCalculator, FaChartBar, FaExchangeAlt, FaBarcode } from 'react-icons/fa';

const navItems = [
  { path: '/', label: 'Home', icon: FaHome, module: null },
  { path: '/setup', label: 'System Setup', icon: FaCog, module: 'system_setup' },
  { path: '/inventory', label: 'Inventory', icon: FaBoxes, module: 'inventory' },
  { path: '/sales', label: 'Sales', icon: FaDollarSign, module: 'sales' },
  { path: '/manufacturing', label: 'Manufacturing', icon: FaIndustry, module: 'manufacturing' },
  { path: '/purchasing', label: 'Purchasing', icon: FaShoppingCart, module: 'purchasing' },
  { path: '/accounting', label: 'Accounting', icon: FaCalculator, module: 'accounting' },
  { path: '/reports', label: 'Reports', icon: FaChartBar, module: 'reports' },
  { path: '/scanner', label: 'Scanner', icon: FaBarcode, module: null },
];

function Layout() {
  const { user, logout, permissions } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  // Filter nav items based on permissions
  const visibleNavItems = navItems.filter(item => {
    if (!item.module) return true; // Home is always visible
    if (!permissions) return true; // Show all while loading
    return permissions[item.module] && permissions[item.module].length > 0;
  });

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top Menu Bar */}
      <div className="bg-gray-100 border-b border-gray-300 px-2 py-0.5 flex items-center text-xs gap-4">
        <span className="font-bold text-gray-700">Max TA Group ERP</span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-600">User: {user?.first_name} {user?.last_name}</span>
        <span className="text-gray-500">|</span>
        <span className="text-gray-600">Role: <span style={{ textTransform: 'capitalize', fontWeight: 600 }}>{user?.role}</span></span>
        <div className="ml-auto">
          <button onClick={logout} className="text-red-600 hover:text-red-800 text-xs">Logout</button>
        </div>
      </div>

      {/* Navigation Bar - E2 Style */}
      <nav className="erp-navbar">
        {visibleNavItems.map(item => (
          <div
            key={item.path}
            className={`erp-nav-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <item.icon size={14} />
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <Outlet />
      </div>

      {/* Status Bar */}
      <div className="bg-gray-200 border-t border-gray-400 px-4 py-0.5 text-xs text-gray-600 flex justify-between">
        <span>Max TA Group LLC - Glass Fabrication ERP v2.0</span>
        <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

export default Layout;
