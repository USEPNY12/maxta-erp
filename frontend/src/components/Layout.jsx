import React, { useContext, useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../App';
import { FaHome, FaCog, FaBoxes, FaDollarSign, FaWrench, FaIndustry, FaShoppingCart, FaCalculator, FaChartBar, FaExchangeAlt, FaBarcode, FaLink, FaTruck, FaHandshake, FaCalendarAlt, FaBell, FaFileAlt, FaLayerGroup, FaBars, FaTimes, FaSignOutAlt, FaUser, FaMoon, FaSun, FaTools, FaHardHat, FaShieldAlt, FaClock } from 'react-icons/fa';
import NotificationBell from './NotificationBell';
import Breadcrumb from './Breadcrumb';
import OmniSearch from './OmniSearch';

const navItems = [
  { path: '/', label: 'Home', icon: FaHome, module: null, group: 'main' },
  { path: '/sales', label: 'Sales', icon: FaDollarSign, module: 'sales', group: 'main' },
  { path: '/manufacturing', label: 'Manufacturing', icon: FaIndustry, module: 'manufacturing', group: 'main' },
  { path: '/purchasing', label: 'Purchasing', icon: FaShoppingCart, module: 'purchasing', group: 'main' },
  { path: '/inventory', label: 'Inventory', icon: FaBoxes, module: 'inventory', group: 'main' },
  { path: '/accounting', label: 'Accounting', icon: FaCalculator, module: 'accounting', group: 'main' },
  { path: '/lamination', label: 'Lamination', icon: FaLayerGroup, module: 'manufacturing', group: 'production' },
  { path: '/dispatch', label: 'Dispatch', icon: FaTruck, module: null, group: 'production' },
  { path: '/scanner', label: 'Scanner', icon: FaBarcode, module: null, group: 'production' },
  { path: '/manufacturing/production-dashboard', label: 'Prod Dashboard', icon: FaChartBar, module: 'manufacturing', group: 'production' },
  { path: '/manufacturing/schedule-gantt', label: 'Gantt Schedule', icon: FaCalendarAlt, module: 'manufacturing', group: 'production' },
  { path: '/manufacturing/machine-utilization', label: 'Machine OEE', icon: FaWrench, module: 'manufacturing', group: 'production' },
  { path: '/manufacturing/barcode-station', label: 'Barcode Station', icon: FaBarcode, module: 'manufacturing', group: 'production' },
  { path: '/manufacturing/qc-inspection', label: 'QC Inspection', icon: FaExchangeAlt, module: 'manufacturing', group: 'production' },
  { path: '/gantt-schedule', label: 'Schedule', icon: FaCalendarAlt, module: null, group: 'tools' },
  { path: '/reports', label: 'Reports', icon: FaChartBar, module: 'reports', group: 'tools' },
  { path: '/crm', label: 'CRM', icon: FaHandshake, module: null, group: 'tools' },
  { path: '/smart-glazier', label: 'Smart Glazier', icon: FaLink, module: null, group: 'tools' },
  { path: '/documents', label: 'Documents', icon: FaFileAlt, module: null, group: 'tools' },
  { path: '/document-center', label: 'Doc Center', icon: FaFileAlt, module: null, group: 'tools' },
  { path: '/shipping', label: 'Shipping', icon: FaTruck, module: null, group: 'shipping' },
  { path: '/shipping/routes', label: 'Route Planner', icon: FaCalendarAlt, module: null, group: 'shipping' },
  { path: '/shipping/rack-loading', label: 'Rack Loading', icon: FaBoxes, module: null, group: 'shipping' },
  { path: '/shipping/fleet', label: 'Fleet & Drivers', icon: FaTruck, module: null, group: 'shipping' },
  { path: '/shipping/freight', label: 'Freight Costs', icon: FaDollarSign, module: null, group: 'shipping' },
  // Phase 7 - Finance
  { path: '/accounting/financial-dashboard', label: 'Finance Dashboard', icon: FaChartBar, module: 'accounting', group: 'finance' },
  { path: '/accounting/budget-manager', label: 'Budgets', icon: FaCalculator, module: 'accounting', group: 'finance' },
  { path: '/accounting/cash-flow', label: 'Cash Flow', icon: FaDollarSign, module: 'accounting', group: 'finance' },
  { path: '/accounting/tax-reporting', label: 'Tax Reporting', icon: FaFileAlt, module: 'accounting', group: 'finance' },
  // Phase 8 - Dashboard & Promotions
  { path: '/executive-dashboard', label: 'Exec Dashboard', icon: FaChartBar, module: null, group: 'admin' },
  { path: '/promotions', label: 'Promotions', icon: FaBell, module: 'system_setup', group: 'admin' },
  { path: '/setup', label: 'Setup', icon: FaCog, module: 'system_setup', group: 'admin' },
  // Phase 9 - Mobile & Kiosk
  { path: '/offline-scanner', label: 'Offline Scanner', icon: FaBarcode, module: null, group: 'production' },
  { path: '/notification-settings', label: 'Notifications', icon: FaBell, module: null, group: 'admin' },
  { path: '/kiosk', label: 'Kiosk Mode', icon: FaCog, module: null, group: 'admin' },
  // Phase 11 - Service & Operations
  { path: '/maintenance', label: 'Maintenance', icon: FaTools, module: null, group: 'service' },
  { path: '/field-service', label: 'Field Service', icon: FaHardHat, module: null, group: 'service' },
  { path: '/warranty', label: 'Warranty', icon: FaShieldAlt, module: null, group: 'service' },
  { path: '/time-attendance', label: 'Time Clock', icon: FaClock, module: null, group: 'service' },
];

// Bottom nav items for mobile (most used on shop floor)
const mobileBottomNav = [
  { path: '/', label: 'Home', icon: FaHome },
  { path: '/manufacturing', label: 'Mfg', icon: FaIndustry },
  { path: '/scanner', label: 'Scan', icon: FaBarcode },
  { path: '/sales', label: 'Sales', icon: FaDollarSign },
  { path: '/inventory', label: 'Inv', icon: FaBoxes },
];

function Layout() {
  const { user, logout, permissions } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('erp_theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('erp_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close mobile menu on navigation
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const visibleNavItems = navItems?.filter(item => {
    if (!item.module) return true;
    if (!permissions) return true;
    return permissions[item.module] && permissions[item.module].length > 0;
  });

  const groupedItems = {
    main: visibleNavItems?.filter(i => i.group === 'main'),
    production: visibleNavItems?.filter(i => i.group === 'production'),
    shipping: visibleNavItems?.filter(i => i.group === 'shipping'),
    finance: visibleNavItems?.filter(i => i.group === 'finance'),
    tools: visibleNavItems?.filter(i => i.group === 'tools'),
    admin: visibleNavItems?.filter(i => i.group === 'admin'),
    service: visibleNavItems?.filter(i => i.group === 'service'),
  };

  return (
    <div className="layout-container">
      {/* Skip to main content for keyboard users */}
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* Top Header Bar */}
      <header className="layout-header" role="banner" aria-label="Main navigation header">
        <div className="header-left">
          {isMobile && (
            <button className="hamburger-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
          )}
          <span className="header-brand" onClick={() => navigate('/')}>Max TA Group ERP</span>
        </div>
        <div className="header-center">
          <OmniSearch />
        </div>
        <div className="header-right">
          <button className="theme-toggle" onClick={() => setDarkMode(!darkMode)} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'} aria-label="Toggle dark mode">
            {darkMode ? <FaSun size={14} /> : <FaMoon size={14} />}
            <span className="logout-text">{darkMode ? 'Light' : 'Dark'}</span>
          </button>
          <NotificationBell />
          <div className="header-user">
            <FaUser size={12} />
            <span className="header-user-name">{user?.first_name}</span>
            <span className="header-user-role">{user?.role}</span>
          </div>
          <button onClick={logout} className="header-logout" title="Logout">
            <FaSignOutAlt size={14} />
            <span className="logout-text">Logout</span>
          </button>
        </div>
      </header>

      {/* Desktop Navigation Bar */}
      {!isMobile && (
        <nav className="erp-navbar" role="navigation" aria-label="Module navigation">
          {visibleNavItems?.map(item => (
            <div
              key={item.path}
              className={`erp-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.path); } }}
              title={item.label}
              role="button"
              tabIndex={0}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <item.icon size={14} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      )}

      {/* Mobile Slide-Out Menu */}
      {isMobile && mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <nav className="mobile-menu" onClick={e => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <span className="mobile-menu-title">Navigation</span>
              <button onClick={() => setMobileMenuOpen(false)} className="mobile-menu-close">
                <FaTimes size={18} />
              </button>
            </div>

            <div className="mobile-menu-section">
              <div className="mobile-menu-section-title">Core Modules</div>
              {groupedItems.main?.map(item => (
                <div
                  key={item.path}
                  className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mobile-menu-section">
              <div className="mobile-menu-section-title">Production</div>
              {groupedItems.production?.map(item => (
                <div
                  key={item.path}
                  className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            <div className="mobile-menu-section">
              <div className="mobile-menu-section-title">Tools & Reports</div>
              {groupedItems.tools?.map(item => (
                <div
                  key={item.path}
                  className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                  onClick={() => navigate(item.path)}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </div>
              ))}
            </div>

            {groupedItems.finance.length > 0 && (
              <div className="mobile-menu-section">
                <div className="mobile-menu-section-title">Finance</div>
                {groupedItems.finance?.map(item => (
                  <div
                    key={item.path}
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {groupedItems.service.length > 0 && (
              <div className="mobile-menu-section">
                <div className="mobile-menu-section-title">Service & Operations</div>
                {groupedItems.service?.map(item => (
                  <div
                    key={item.path}
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            {groupedItems.admin.length > 0 && (
              <div className="mobile-menu-section">
                <div className="mobile-menu-section-title">Administration</div>
                {groupedItems.admin?.map(item => (
                  <div
                    key={item.path}
                    className={`mobile-menu-item ${isActive(item.path) ? 'active' : ''}`}
                    onClick={() => navigate(item.path)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="mobile-menu-footer">
              <button onClick={logout} className="mobile-logout-btn">
                <FaSignOutAlt size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="layout-main" id="main-content" role="main" aria-label="Main content">
        <Breadcrumb />
        <div className="layout-main-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      {isMobile && (
        <nav className="mobile-bottom-nav" role="navigation" aria-label="Quick access navigation">
          {mobileBottomNav?.map(item => (
            <div
              key={item.path}
              className={`bottom-nav-item ${isActive(item.path) ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(item.path); } }}
              role="button"
              tabIndex={0}
              aria-label={`Navigate to ${item.label}`}
              aria-current={isActive(item.path) ? 'page' : undefined}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </div>
          ))}
        </nav>
      )}

      {/* Desktop Status Bar */}
      {!isMobile && (
        <footer className="layout-footer">
          <span>Max TA Group LLC - Glass Fabrication ERP v4.0</span>
          <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
        </footer>
      )}
    </div>
  );
}

export default Layout;
