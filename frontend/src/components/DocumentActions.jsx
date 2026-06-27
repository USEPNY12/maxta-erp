import { useState } from 'react';
import api from '../services/api';

/**
 * DocumentActions - Reusable Print/Email/Preview buttons for any document
 * 
 * Props:
 *   documentType: 'purchase_order' | 'quote' | 'sales_order' | 'ar_invoice' | 'packing_slip' | 'work_order' | 'receiving_report'
 *   documentId: number
 *   recipientEmail: string (optional - pre-fill email dialog)
 *   recipientName: string (optional)
 *   onEmailSent: function (optional callback)
 *   compact: boolean (optional - smaller buttons)
 */

const DOC_TYPE_MAP = {
  purchase_order: { pdfUrl: '/api/documents/purchase-order', emailUrl: '/api/email/purchase-order', label: 'Purchase Order' },
  quote: { pdfUrl: '/api/documents/quote', emailUrl: '/api/email/quote', label: 'Quote' },
  sales_order: { pdfUrl: '/api/documents/order', emailUrl: '/api/email/order-confirmation', label: 'Order Confirmation' },
  ar_invoice: { pdfUrl: '/api/documents/invoice', emailUrl: '/api/email/invoice', label: 'Invoice' },
  packing_slip: { pdfUrl: '/api/documents/packing-list', emailUrl: '/api/email/packing-list', label: 'Packing Slip' },
  work_order: { pdfUrl: '/api/documents/work-order', emailUrl: null, label: 'Work Order' },
  receiving_report: { pdfUrl: '/api/documents/receiving-report', emailUrl: null, label: 'Receiving Report' }
};

export default function DocumentActions({ documentType, documentId, recipientEmail, recipientName, onEmailSent, compact }) {
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', cc: '', subject: '', body: '', loading: false });
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const config = DOC_TYPE_MAP[documentType];
  if (!config) return null;

  // Print - opens PDF in new tab
  const handlePrint = () => {
    const token = localStorage.getItem('erp_token');
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const url = `${baseUrl}${config.pdfUrl}/${documentId}/pdf`;
    // Open PDF in new window
    const w = window.open('', '_blank');
    w.document.write('<html><body style="margin:0;display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif"><p>Generating PDF...</p></body></html>');
    
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => {
        if (!res.ok) throw new Error('PDF generation failed');
        return res.blob();
      })
      .then(blob => {
        const pdfUrl = URL.createObjectURL(blob);
        w.location.href = pdfUrl;
      })
      .catch(err => {
        w.document.body.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
      });
  };

  // Preview - shows HTML in modal iframe
  const handlePreview = () => {
    setShowPreview(true);
  };

  // Email - open dialog with pre-filled data
  const handleOpenEmail = async () => {
    setEmailData({ to: recipientEmail || '', cc: '', subject: '', body: '', loading: true });
    setShowEmailDialog(true);
    
    try {
      const res = await api.get(`/api/documents/email-template/${documentType}/${documentId}`);
      setEmailData({
        to: recipientEmail || res.data.data?.vendor_email || res.data.data?.customer_email || '',
        cc: '',
        subject: res.data.subject || '',
        body: res.data.body || '',
        loading: false
      });
    } catch (err) {
      setEmailData(prev => ({
        ...prev,
        subject: `${config.label} - Document #${documentId}`,
        body: `<p>Please find the attached ${config.label}.</p>`,
        loading: false
      }));
    }
  };

  // Send email
  const handleSendEmail = async () => {
    if (!emailData.to) return alert('Please enter a recipient email address');
    setSending(true);
    try {
      await api.post(`${config.emailUrl}/${documentId}`, {
        to: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        customBody: emailData.body
      });
      setShowEmailDialog(false);
      setSending(false);
      if (onEmailSent) onEmailSent();
      // Show success toast if available
      if (window.toast) window.toast.success(`${config.label} emailed successfully`);
    } catch (err) {
      setSending(false);
      alert(err.response?.data?.error || 'Failed to send email. Check SMTP settings in System Setup.');
    }
  };

  const btnClass = compact ? 'erp-btn text-xs' : 'erp-btn';
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const token = localStorage.getItem('erp_token');

  return (
    <>
      {/* Action Buttons */}
      <button className={btnClass} onClick={handlePrint} title="Generate PDF and open in new tab">
        🖨️ Print
      </button>
      <button className={btnClass} onClick={handlePreview} title="Preview document">
        👁️ Preview
      </button>
      {config.emailUrl && (
        <button className={btnClass} style={{ background: '#7c3aed', color: 'white' }} onClick={handleOpenEmail} title="Email document">
          ✉️ Email
        </button>
      )}

      {/* Preview Modal */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowPreview(false)}>
          <div style={{ width: '90%', maxWidth: 900, height: '85vh', background: 'white', borderRadius: 8, overflow: 'hidden', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', background: '#1e293b', color: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>Document Preview - {config.label}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handlePrint} style={{ background: '#2563eb', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>🖨️ Print PDF</button>
                {config.emailUrl && <button onClick={handleOpenEmail} style={{ background: '#7c3aed', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✉️ Email</button>}
                <button onClick={() => setShowPreview(false)} style={{ background: '#dc2626', color: 'white', border: 'none', padding: '5px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>✕ Close</button>
              </div>
            </div>
            <iframe
              src={`${baseUrl}/api/documents/preview/${documentType}/${documentId}?token=${token}`}
              style={{ flex: 1, border: 'none', width: '100%' }}
              title="Document Preview"
            />
          </div>
        </div>
      )}

      {/* Email Dialog */}
      {showEmailDialog && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowEmailDialog(false)}>
          <div style={{ width: '90%', maxWidth: 600, background: 'white', borderRadius: 8, overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '12px 16px', background: '#7c3aed', color: 'white', fontWeight: 600 }}>
              ✉️ Email {config.label}
            </div>
            <div style={{ padding: 20 }}>
              {emailData.loading ? (
                <p style={{ textAlign: 'center', padding: 20, color: '#718096' }}>Loading email template...</p>
              ) : (
                <>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>To: *</label>
                    <input
                      type="email"
                      className="erp-form-input"
                      value={emailData.to}
                      onChange={e => setEmailData(prev => ({ ...prev, to: e.target.value }))}
                      placeholder="recipient@example.com"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>CC:</label>
                    <input
                      type="email"
                      className="erp-form-input"
                      value={emailData.cc}
                      onChange={e => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                      placeholder="cc@example.com (optional)"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Subject:</label>
                    <input
                      type="text"
                      className="erp-form-input"
                      value={emailData.subject}
                      onChange={e => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4a5568', marginBottom: 4 }}>Message:</label>
                    <textarea
                      className="erp-form-input"
                      value={emailData.body.replace(/<[^>]*>/g, '')}
                      onChange={e => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                      rows={5}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div style={{ padding: '10px 12px', background: '#f7fafc', borderRadius: 4, marginBottom: 12, fontSize: 11, color: '#718096' }}>
                    📎 The {config.label} PDF will be automatically attached to this email.
                  </div>
                </>
              )}
            </div>
            <div style={{ padding: '12px 16px', background: '#f7fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button className="erp-btn" onClick={() => setShowEmailDialog(false)}>Cancel</button>
              <button
                className="erp-btn"
                style={{ background: '#7c3aed', color: 'white' }}
                onClick={handleSendEmail}
                disabled={sending || emailData.loading}
              >
                {sending ? 'Sending...' : '✉️ Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
