import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FaChevronRight, FaHome } from 'react-icons/fa';

const routeLabels = {
  '': 'Home',
  'sales': 'Sales',
  'orders': 'Orders',
  'quotes': 'Quotes',
  'shipments': 'Shipments',
  'invoices': 'Invoices',
  'customers': 'Customers',
  'manufacturing': 'Manufacturing',
  'work-orders': 'Work Orders',
  'cutting-optimization': 'Cutting Optimization',
  'production-schedule': 'Production Schedule',
  'purchasing': 'Purchasing',
  'inventory': 'Inventory',
  'items': 'Items',
  'accounting': 'Accounting',
  'lamination': 'Lamination',
  'dispatch': 'Dispatch',
  'scanner': 'Scanner',
  'reports': 'Reports',
  'crm': 'CRM',
  'setup': 'System Setup',
  'gantt-schedule': 'Schedule',
  'smart-glazier': 'Smart Glazier',
  'documents': 'Documents',
};

function Breadcrumb() {
  const location = useLocation();
  const navigate = useNavigate();
  const segments = location.pathname.split('/')?.filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments?.map((seg, idx) => {
    const path = '/' + segments?.slice(0, idx + 1).join('/');
    const label = routeLabels[seg] || seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const isLast = idx === segments.length - 1;
    return { path, label, isLast };
  });

  return (
    <nav className="breadcrumb">
      <span className="breadcrumb-item" onClick={() => navigate('/')}>
        <FaHome size={11} />
      </span>
      {crumbs?.map((crumb, i) => (
        <React.Fragment key={i}>
          <FaChevronRight size={8} className="breadcrumb-separator" />
          <span
            className={`breadcrumb-item ${crumb.isLast ? 'active' : ''}`}
            onClick={() => !crumb.isLast && navigate(crumb.path)}
          >
            {crumb.label}
          </span>
        </React.Fragment>
      ))}
    </nav>
  );
}

export default Breadcrumb;
