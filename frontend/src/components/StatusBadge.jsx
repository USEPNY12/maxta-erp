/**
 * MaxTA ERP - Status Badge Component
 * Professional document state machine visualization
 * Shows current status with color coding and optional state flow indicator
 * 
 * Props:
 * - status: Current status string
 * - type: Document type ('quote', 'sales_order', 'work_order', 'purchase_order', 'invoice', 'shipment')
 * - size: 'sm' | 'md' | 'lg' (default: 'sm')
 * - showFlow: boolean - show the full state flow with current highlighted (default: false)
 * - animate: boolean - pulse animation on active states (default: true)
 */
import React from 'react';
import { FaCheck, FaTimes, FaClock, FaPause, FaPlay, FaShippingFast, FaMoneyBillWave, FaExclamationTriangle, FaBan, FaFileAlt, FaIndustry, FaCheckCircle } from 'react-icons/fa';

// State machine definitions for each document type
const STATE_MACHINES = {
  quote: {
    states: ['draft', 'sent', 'accepted', 'rejected', 'expired', 'converted'],
    colors: {
      draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      sent: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      accepted: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      rejected: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      expired: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      converted: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
    },
    icons: {
      draft: FaFileAlt, sent: FaClock, accepted: FaCheck, rejected: FaTimes, expired: FaExclamationTriangle, converted: FaCheckCircle,
    },
  },
  sales_order: {
    states: ['draft', 'confirmed', 'in_production', 'ready_to_ship', 'shipped', 'invoiced', 'closed', 'cancelled'],
    colors: {
      draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      confirmed: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      in_production: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      ready_to_ship: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
      shipped: { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
      invoiced: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
      closed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    },
    icons: {
      draft: FaFileAlt, confirmed: FaCheck, in_production: FaIndustry, ready_to_ship: FaPlay,
      shipped: FaShippingFast, invoiced: FaMoneyBillWave, closed: FaCheckCircle, cancelled: FaBan,
    },
  },
  work_order: {
    states: ['planned', 'released', 'in_progress', 'on_hold', 'completed', 'closed', 'cancelled'],
    colors: {
      planned: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      released: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      in_progress: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      on_hold: { bg: '#fce7f3', text: '#9d174d', border: '#f9a8d4' },
      completed: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      closed: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
      cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    },
    icons: {
      planned: FaFileAlt, released: FaPlay, in_progress: FaIndustry, on_hold: FaPause,
      completed: FaCheck, closed: FaCheckCircle, cancelled: FaBan,
    },
  },
  purchase_order: {
    states: ['draft', 'approved', 'sent', 'partially_received', 'received', 'closed', 'cancelled'],
    colors: {
      draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      approved: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      sent: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      partially_received: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      received: { bg: '#d1fae5', text: '#065f46', border: '#6ee7b7' },
      closed: { bg: '#e0e7ff', text: '#3730a3', border: '#a5b4fc' },
      cancelled: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
    },
    icons: {
      draft: FaFileAlt, approved: FaCheck, sent: FaClock, partially_received: FaPlay,
      received: FaCheckCircle, closed: FaCheckCircle, cancelled: FaBan,
    },
  },
  invoice: {
    states: ['draft', 'posted', 'partially_paid', 'paid', 'overdue', 'void'],
    colors: {
      draft: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      posted: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      partially_paid: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      paid: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
      overdue: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' },
      void: { bg: '#f1f5f9', text: '#6b7280', border: '#d1d5db' },
    },
    icons: {
      draft: FaFileAlt, posted: FaCheck, partially_paid: FaClock, paid: FaMoneyBillWave, overdue: FaExclamationTriangle, void: FaBan,
    },
  },
  shipment: {
    states: ['pending', 'picked', 'packed', 'shipped', 'delivered'],
    colors: {
      pending: { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' },
      picked: { bg: '#fef3c7', text: '#92400e', border: '#fcd34d' },
      packed: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
      shipped: { bg: '#cffafe', text: '#155e75', border: '#67e8f9' },
      delivered: { bg: '#dcfce7', text: '#166534', border: '#86efac' },
    },
    icons: {
      pending: FaClock, picked: FaPlay, packed: FaCheck, shipped: FaShippingFast, delivered: FaCheckCircle,
    },
  },
};

// Normalize status string for lookup
function normalizeStatus(status) {
  if (!status) return 'draft';
  return status.toLowerCase().replace(/[\s-]+/g, '_').replace(/[^a-z_]/g, '');
}

// Format status for display
function formatStatus(status) {
  if (!status) return 'Draft';
  return status.replace(/[_-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function StatusBadge({ status, type = 'quote', size = 'sm', showFlow = false, animate = true }) {
  const machine = STATE_MACHINES[type] || STATE_MACHINES.quote;
  const normalizedStatus = normalizeStatus(status);
  const colors = machine.colors[normalizedStatus] || { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  const Icon = machine.icons?.[normalizedStatus] || FaFileAlt;

  const isActive = ['in_progress', 'in_production', 'sent', 'released'].includes(normalizedStatus);

  const sizeStyles = {
    sm: { fontSize: '11px', padding: '2px 8px', gap: '4px' },
    md: { fontSize: '12px', padding: '4px 10px', gap: '5px' },
    lg: { fontSize: '13px', padding: '5px 12px', gap: '6px' },
  };

  return (
    <div className="status-badge-wrapper">
      <span
        className={`status-badge ${animate && isActive ? 'status-badge-pulse' : ''}`}
        style={{
          backgroundColor: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
          borderRadius: '4px',
          display: 'inline-flex',
          alignItems: 'center',
          fontWeight: 600,
          whiteSpace: 'nowrap',
          ...sizeStyles[size],
        }}
      >
        <Icon size={size === 'sm' ? 9 : size === 'md' ? 10 : 12} />
        {formatStatus(normalizedStatus)}
      </span>

      {showFlow && (
        <div className="status-flow">
          {machine.states?.map((state, idx) => {
            const stateColors = machine.colors[state] || {};
            const isCurrent = state === normalizedStatus;
            const isPast = machine.states?.indexOf(normalizedStatus) > idx;
            return (
              <React.Fragment key={state}>
                <div
                  className={`status-flow-node ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`}
                  style={{
                    backgroundColor: isCurrent ? stateColors.bg : isPast ? stateColors.bg : '#f8fafc',
                    borderColor: isCurrent ? stateColors.border : isPast ? stateColors.border : '#e2e8f0',
                    color: isCurrent ? stateColors.text : isPast ? stateColors.text : '#94a3b8',
                  }}
                  title={formatStatus(state)}
                >
                  <span className="status-flow-dot" style={{
                    backgroundColor: isCurrent ? stateColors.text : isPast ? stateColors.text : '#cbd5e1',
                  }}></span>
                </div>
                {idx < machine.states.length - 1 && (
                  <div className={`status-flow-line ${isPast ? 'past' : ''}`}></div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Export state machines for use in other components
export { STATE_MACHINES, normalizeStatus, formatStatus };
