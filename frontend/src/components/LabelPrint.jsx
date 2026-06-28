import { useState, useRef } from 'react';
import api from '../services/api';

// Label sizes in CSS
const LABEL_SIZES = {
  small: { width: '2in', height: '1in', fontSize: '8px' },
  medium: { width: '4in', height: '2in', fontSize: '10px' },
  large: { width: '4in', height: '6in', fontSize: '12px' },
  shipping: { width: '4in', height: '6in', fontSize: '11px' }
};

export function LabelPrintButton({ type, id, size = 'medium', label = 'Print Label' }) {
  const [showPreview, setShowPreview] = useState(false);
  const [labelData, setLabelData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePrint = async () => {
    setLoading(true);
    try {
      const endpoint = type === 'lot' ? `/api/labels/lot/${id}` : `/api/labels/${type}/${id}`;
      const res = await api.get(endpoint);
      setLabelData(res.data);
      setShowPreview(true);
    } catch (err) {
      alert('Error loading label data: ' + (err.response?.data?.error || err.message));
    }
    setLoading(false);
  };

  const printLabel = () => {
    const printWindow = window.open('', '_blank', 'width=500,height=400');
    const content = document.getElementById('label-preview-content');
    printWindow.document.write(`
      <html><head><title>Print Label</title>
      <style>
        body { margin: 0; padding: 0; }
        @media print { body { margin: 0; } @page { margin: 0; } }
        .label { font-family: Arial, sans-serif; padding: 8px; box-sizing: border-box; }
        .label-header { font-weight: bold; font-size: 14px; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 6px; }
        .label-row { display: flex; justify-content: space-between; margin: 2px 0; }
        .label-field { font-size: 10px; }
        .label-value { font-size: 10px; font-weight: bold; }
        .label-barcode { text-align: center; margin: 6px 0; }
        .label-barcode img { max-width: 100%; height: auto; }
        .label-qr { text-align: center; }
        .label-qr img { width: 80px; height: 80px; }
        .fab-section { margin-top: 4px; border-top: 1px solid #ccc; padding-top: 4px; }
        .fab-item { font-size: 9px; }
      </style>
      </head><body>${content.innerHTML}</body></html>
    `);
    printWindow.document.close();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 300);
  };

  return (
    <>
      <button className="erp-btn erp-btn-sm" onClick={handlePrint} disabled={loading}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {loading ? '...' : '🏷️'} {label}
      </button>

      {showPreview && labelData && (
        <div className="erp-modal-overlay" onClick={() => setShowPreview(false)}>
          <div className="erp-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="erp-modal-header">
              <h3>Label Preview</h3>
              <button onClick={() => setShowPreview(false)}>&times;</button>
            </div>
            <div className="erp-modal-body" style={{ padding: '16px' }}>
              <div id="label-preview-content">
                <LabelContent data={labelData} size={size} />
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn" onClick={() => setShowPreview(false)}>Close</button>
              <button className="erp-btn erp-btn-primary" onClick={printLabel}>🖨️ Print</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LabelContent({ data, size }) {
  const sizeStyle = LABEL_SIZES[size] || LABEL_SIZES.medium;

  if (data.label_type === 'item') return <ItemLabel data={data} style={sizeStyle} />;
  if (data.label_type === 'location') return <LocationLabel data={data} style={sizeStyle} />;
  if (data.label_type === 'production') return <ProductionLabel data={data} style={sizeStyle} />;
  if (data.label_type === 'lot') return <LotLabel data={data} style={sizeStyle} />;
  if (data.label_type === 'shipping') return <ShippingLabel data={data} style={sizeStyle} />;
  if (data.label_type === 'receiving') return <ReceivingLabel data={data} style={sizeStyle} />;
  return <div>Unknown label type</div>;
}

function ItemLabel({ data, style }) {
  return (
    <div className="label" style={{ width: style.width, border: '1px solid #000', padding: '8px' }}>
      <div className="label-header">MAX TA GROUP</div>
      <div className="label-row">
        <span className="label-field">Item#:</span>
        <span className="label-value">{data.data.item_number}</span>
      </div>
      <div className="label-row">
        <span className="label-field">Desc:</span>
        <span className="label-value" style={{ fontSize: '9px' }}>{data.data.description}</span>
      </div>
      {data.data.glass_type && <div className="label-row">
        <span className="label-field">Glass:</span>
        <span className="label-value">{data.data.glass_type} {data.data.thickness}</span>
      </div>}
      <div className="label-row">
        <span className="label-field">UOM:</span>
        <span className="label-value">{data.data.uom}</span>
      </div>
      <div className="label-barcode">
        {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" />}
      </div>
      {data.qr_data_url && <div className="label-qr"><img src={data.qr_data_url} alt="QR" /></div>}
    </div>
  );
}

function LocationLabel({ data, style }) {
  return (
    <div className="label" style={{ width: style.width, border: '2px solid #000', padding: '12px', textAlign: 'center' }}>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>{data.data.location_code}</div>
      <div style={{ fontSize: '14px', marginBottom: '4px' }}>{data.data.name}</div>
      <div style={{ fontSize: '11px', color: '#666' }}>{data.data.type} {data.data.warehouse ? `| ${data.data.warehouse}` : ''}</div>
      <div className="label-barcode" style={{ marginTop: '12px' }}>
        {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" style={{ maxWidth: '100%' }} />}
      </div>
    </div>
  );
}

function ProductionLabel({ data, style }) {
  const d = data.data;
  return (
    <div className="label" style={{ width: '4in', border: '2px solid #000', padding: '10px', fontSize: '11px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #000', paddingBottom: '4px', marginBottom: '6px' }}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>MAX TA GROUP</span>
        <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{d.wo_number}</span>
      </div>
      <div className="label-row"><span className="label-field">Customer:</span><span className="label-value">{d.customer || '-'}</span></div>
      {d.project && <div className="label-row"><span className="label-field">Project:</span><span className="label-value">{d.project}</span></div>}
      <div className="label-row"><span className="label-field">SO#:</span><span className="label-value">{d.so_number || '-'}</span></div>
      <div style={{ borderTop: '1px solid #ccc', marginTop: '6px', paddingTop: '6px' }}>
        <div className="label-row"><span className="label-field">Item:</span><span className="label-value">{d.item_number} - {d.item_desc}</span></div>
        <div className="label-row"><span className="label-field">Glass:</span><span className="label-value">{d.glass_type || '-'} {d.thickness || ''}</span></div>
        <div className="label-row"><span className="label-field">Size:</span><span className="label-value">{d.width || '?'}" × {d.height || '?'}"</span></div>
        <div className="label-row"><span className="label-field">Qty:</span><span className="label-value">{d.quantity}</span></div>
        {d.edge_type && <div className="label-row"><span className="label-field">Edge:</span><span className="label-value">{d.edge_type}</span></div>}
      </div>
      {d.fabrication && Object.keys(d.fabrication).length > 0 && (
        <div className="fab-section">
          <div style={{ fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>FABRICATION:</div>
          {Object.entries(d.fabrication)?.map(([cat, items]) => (
            <div key={cat} className="fab-item">
              <strong>{cat}:</strong> {(items || [])?.map(i => `${i.name} (${i.qty})`).join(', ')}
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px', borderTop: '1px solid #000', paddingTop: '6px' }}>
        <div className="label-barcode" style={{ flex: 1 }}>
          {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" style={{ maxWidth: '200px' }} />}
        </div>
        {data.qr_data_url && <div className="label-qr"><img src={data.qr_data_url} alt="QR" style={{ width: '70px', height: '70px' }} /></div>}
      </div>
      {d.due_date && <div style={{ textAlign: 'right', fontSize: '9px', marginTop: '2px' }}>Due: {new Date(d.due_date).toLocaleDateString()}</div>}
    </div>
  );
}

function LotLabel({ data, style }) {
  return (
    <div className="label" style={{ width: style.width, border: '1px solid #000', padding: '8px' }}>
      <div className="label-header">LOT LABEL</div>
      <div className="label-row"><span className="label-field">Lot#:</span><span className="label-value">{data.data.lot_number}</span></div>
      <div className="label-row"><span className="label-field">Item:</span><span className="label-value">{data.data.item_number}</span></div>
      <div className="label-row"><span className="label-field">Desc:</span><span className="label-value" style={{ fontSize: '9px' }}>{data.data.item_desc}</span></div>
      <div className="label-row"><span className="label-field">Qty:</span><span className="label-value">{data.data.quantity}</span></div>
      {data.data.vendor && <div className="label-row"><span className="label-field">Vendor:</span><span className="label-value">{data.data.vendor}</span></div>}
      {data.data.received_date && <div className="label-row"><span className="label-field">Received:</span><span className="label-value">{new Date(data.data.received_date).toLocaleDateString()}</span></div>}
      <div className="label-barcode">
        {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" />}
      </div>
    </div>
  );
}

function ShippingLabel({ data, style }) {
  const d = data.data;
  return (
    <div className="label" style={{ width: '4in', minHeight: '4in', border: '2px solid #000', padding: '12px' }}>
      <div style={{ borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px' }}>FROM: MAX TA GROUP LLC</div>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>SHIP TO:</div>
      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{d.ship_to?.company || d.customer}</div>
      <div style={{ fontSize: '12px' }}>{d.ship_to?.address1}</div>
      {d.ship_to?.address2 && <div style={{ fontSize: '12px' }}>{d.ship_to.address2}</div>}
      <div style={{ fontSize: '12px' }}>{d.ship_to?.city}, {d.ship_to?.state} {d.ship_to?.zip}</div>
      <div style={{ borderTop: '1px solid #000', marginTop: '10px', paddingTop: '8px' }}>
        <div className="label-row"><span className="label-field">SO#:</span><span className="label-value">{d.so_number}</span></div>
        <div className="label-row"><span className="label-field">Ship#:</span><span className="label-value">{d.shipment_number}</span></div>
        {d.carrier && <div className="label-row"><span className="label-field">Carrier:</span><span className="label-value">{d.carrier}</span></div>}
        {d.tracking_number && <div className="label-row"><span className="label-field">Tracking:</span><span className="label-value">{d.tracking_number}</span></div>}
        {d.piece_count && <div className="label-row"><span className="label-field">Pieces:</span><span className="label-value">{d.piece_count}</span></div>}
      </div>
      <div className="label-barcode" style={{ marginTop: '12px' }}>
        {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" style={{ maxWidth: '100%' }} />}
      </div>
    </div>
  );
}

function ReceivingLabel({ data, style }) {
  return (
    <div className="label" style={{ width: style.width, border: '1px solid #000', padding: '8px' }}>
      <div className="label-header">RECEIVING</div>
      <div className="label-row"><span className="label-field">Receipt#:</span><span className="label-value">{data.data.receipt_number}</span></div>
      <div className="label-row"><span className="label-field">PO#:</span><span className="label-value">{data.data.po_number}</span></div>
      <div className="label-row"><span className="label-field">Vendor:</span><span className="label-value">{data.data.vendor}</span></div>
      <div className="label-row"><span className="label-field">Date:</span><span className="label-value">{data.data.received_date ? new Date(data.data.received_date).toLocaleDateString() : '-'}</span></div>
      {data.data.lines && data.data.lines?.map((l, i) => (
        <div key={i} style={{ borderTop: '1px dashed #ccc', marginTop: '4px', paddingTop: '4px', fontSize: '9px' }}>
          <div><strong>{l.item_number}</strong> - {l.description}</div>
          <div>Qty: {l.quantity} {l.lot_number ? `| Lot: ${l.lot_number}` : ''} {l.location ? `| Loc: ${l.location}` : ''}</div>
        </div>
      ))}
      <div className="label-barcode" style={{ marginTop: '8px' }}>
        {data.barcode && <img src={`data:image/png;base64,${data.barcode}`} alt="barcode" />}
      </div>
    </div>
  );
}

export default LabelPrintButton;
