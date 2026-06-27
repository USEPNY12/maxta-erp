import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';

function ModulePage({ title, quickActions, setupItems, menuItems, reports, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close drawer on navigation
  useEffect(() => {
    setMobileDrawerOpen(false);
  }, [location.pathname]);

  const SidebarContent = () => (
    <>
      <div className="erp-sidebar-title">{title}</div>

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
    </>
  );

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Mobile Action Bar */}
      {isMobile && (
        <div className="mobile-module-bar">
          <button className="mobile-module-menu-btn" onClick={() => setMobileDrawerOpen(true)}>
            <FaBars size={14} />
            <span>{title}</span>
          </button>
          <div className="mobile-module-tabs">
            {(menuItems || []).slice(0, 6).map((item, i) => (
              <button
                key={i}
                className={`mobile-module-tab ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                {item.icon && <span>{item.icon}</span>}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        {!isMobile && (
          <div className="erp-sidebar">
            <SidebarContent />
          </div>
        )}

        {/* Mobile Drawer Overlay */}
        {isMobile && mobileDrawerOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileDrawerOpen(false)}>
            <nav className="mobile-menu" onClick={e => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <span className="mobile-menu-title">{title}</span>
                <button onClick={() => setMobileDrawerOpen(false)} className="mobile-menu-close">
                  <FaTimes size={18} />
                </button>
              </div>
              <div style={{ padding: '8px 0' }}>
                <SidebarContent />
              </div>
            </nav>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

export default ModulePage;
