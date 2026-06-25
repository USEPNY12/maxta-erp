import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function ModulePage({ title, quickActions, setupItems, menuItems, reports, children }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar */}
      <div className="erp-sidebar">
        {/* Module Title */}
        <div className="erp-sidebar-title">{title}</div>

        {/* Quick Actions */}
        {quickActions && quickActions.length > 0 && (
          <div className="erp-sidebar-section">
            {quickActions.map((action, i) => (
              <div key={i} className="erp-sidebar-item text-blue-700" onClick={() => action.onClick ? action.onClick() : navigate(action.path)}>
                <span className="text-green-600">+</span>
                <span>{action.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Setup Section */}
        {setupItems && setupItems.length > 0 && (
          <div className="erp-sidebar-section">
            <div className="erp-sidebar-section-title">Setup</div>
            {setupItems.map((item, i) => (
              <div key={i} className="erp-sidebar-item" onClick={() => navigate(item.path)}>
                <span className="text-gray-500">&#9632;</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Menu Items */}
        {menuItems && menuItems.length > 0 && (
          <div className="erp-sidebar-section">
            {menuItems.map((item, i) => (
              <div
                key={i}
                className={`erp-sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon || '📄'}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Reports Section */}
        {reports && (
          <div className="erp-sidebar-section mt-4">
            <div className="erp-sidebar-section-title">Reports</div>
            <div className="px-3 space-y-1">
              <div className="text-xs">
                <label className="block text-gray-600">Type:</label>
                <select className="erp-form-select w-full">
                  <option>{reports.type}</option>
                </select>
              </div>
              <div className="text-xs">
                <label className="block text-gray-600">Report:</label>
                <select className="erp-form-select w-full">
                  {reports.options.map((opt, i) => (
                    <option key={i}>{opt}</option>
                  ))}
                </select>
              </div>
              <button className="erp-report-link text-xs">Go</button>
            </div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-white">
        {children}
      </div>
    </div>
  );
}

export default ModulePage;
