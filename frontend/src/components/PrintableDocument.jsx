import React, { useRef } from 'react';

/**
 * PrintableDocument - Wrapper component for printable documents (invoices, quotes, WOs)
 * Provides a print button and formats content for clean printing
 */
export function PrintableDocument({ title, children, companyInfo }) {
  const printRef = useRef();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="printable-document">
      <div className="no-print" style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button onClick={handlePrint} className="btn btn-primary print-keep" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6,9 6,2 18,2 18,9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print
        </button>
      </div>

      <div ref={printRef} className="invoice-print">
        {/* Company Header */}
        <div className="company-header">
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
            {companyInfo?.name || 'Max TA Group LLC'}
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
            {companyInfo?.address || 'Glass Fabrication & Distribution'}
          </p>
          {companyInfo?.phone && <p style={{ margin: '2px 0 0', fontSize: '12px' }}>{companyInfo.phone}</p>}
          {companyInfo?.email && <p style={{ margin: '2px 0 0', fontSize: '12px' }}>{companyInfo.email}</p>}
        </div>

        {/* Document Title */}
        <div className="document-title">{title}</div>

        {/* Document Content */}
        {children}
      </div>
    </div>
  );
}

/**
 * DocumentInfoGrid - Two-column info layout for bill-to/ship-to, dates, etc.
 */
export function DocumentInfoGrid({ left, right }) {
  return (
    <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '16px 0' }}>
      <div>{left}</div>
      <div>{right}</div>
    </div>
  );
}

/**
 * DocumentTotals - Right-aligned totals section
 */
export function DocumentTotals({ items }) {
  return (
    <div className="totals" style={{ textAlign: 'right', marginTop: 16 }}>
      {(items || []).map((item, idx) => (
        <div
          key={idx}
          className={item.isTotal ? 'grand-total' : ''}
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 24,
            padding: '4px 0',
            fontSize: item.isTotal ? '16px' : '14px',
            fontWeight: item.isTotal ? 700 : 400,
            borderTop: item.isTotal ? '2px solid var(--text-primary)' : 'none',
            marginTop: item.isTotal ? 8 : 0,
            paddingTop: item.isTotal ? 8 : 4,
          }}
        >
          <span>{item.label}:</span>
          <span style={{ minWidth: 100 }}>{item.value}</span>
        </div>
      ))}
    </div>
  );
}

export default PrintableDocument;
