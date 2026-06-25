import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function JournalVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [glAccounts, setGlAccounts] = useState([]);
  const [form, setForm] = useState({
    voucher_date: new Date().toISOString().split('T')[0], period: '', memo: '', reference: '', lines: [{ gl_account_id: '', debit: 0, credit: 0, memo: '' }]
  });

  useEffect(() => { fetchVouchers(); }, []);

  const fetchVouchers = async () => {
    try { const res = await api.get('/api/accounting/journal-vouchers'); setVouchers(res.data); } catch { setVouchers([]); }
  };

  const fetchGLAccounts = async () => {
    try { const res = await api.get('/api/accounting/gl-accounts'); setGlAccounts(res.data); } catch { setGlAccounts([]); }
  };

  const handleNew = () => {
    fetchGLAccounts();
    setForm({ voucher_date: new Date().toISOString().split('T')[0], period: '', memo: '', reference: '', lines: [{ gl_account_id: '', debit: 0, credit: 0, memo: '' }, { gl_account_id: '', debit: 0, credit: 0, memo: '' }] });
    setShowModal(true);
  };

  const addLine = () => setForm({...form, lines: [...form.lines, { gl_account_id: '', debit: 0, credit: 0, memo: '' }]});
  const removeLine = (idx) => setForm({...form, lines: form.lines.filter((_, i) => i !== idx)});
  const updateLine = (idx, field, value) => {
    const lines = [...form.lines];
    lines[idx] = {...lines[idx], [field]: value};
    setForm({...form, lines});
  };

  const totalDebit = form.lines.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredit = form.lines.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const handleSave = async () => {
    if (!isBalanced) { toast.error('Debits must equal Credits'); return; }
    try {
      await api.post('/api/accounting/journal-vouchers', form);
      toast.success('Journal voucher created');
      setShowModal(false);
      fetchVouchers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handlePost = async (id) => {
    try {
      await api.post(`/api/accounting/journal-vouchers/${id}/post`);
      toast.success('Voucher posted to GL');
      fetchVouchers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to post'); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={handleNew}><span className="text-green-600">+</span> New Journal Voucher</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchVouchers}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print</button>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Voucher #</th><th>Date</th><th>Period</th><th>Memo</th><th>Debit</th><th>Credit</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {vouchers.map(v => (
              <tr key={v.id}>
                <td className="text-blue-700 font-bold">{v.voucher_number}</td>
                <td>{v.voucher_date}</td>
                <td>{v.period}</td>
                <td>{v.memo}</td>
                <td className="text-right">${parseFloat(v.total_debit || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(v.total_credit || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${v.status}`}>{v.status}</span></td>
                <td>
                  {v.status === 'draft' && <button className="text-xs text-blue-700 underline" onClick={() => handlePost(v.id)}>Post</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="erp-modal-overlay">
          <div className="erp-modal" style={{ minWidth: '800px' }}>
            <div className="erp-modal-title"><span>Journal Voucher</span><button className="text-white" onClick={() => setShowModal(false)}>✕</button></div>
            <div className="erp-modal-body space-y-3">
              <div className="grid grid-cols-4 gap-3">
                <div className="erp-form-group"><label className="erp-form-label">Date:</label><input type="date" className="erp-form-input" value={form.voucher_date} onChange={e => setForm({...form, voucher_date: e.target.value})} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Period:</label><input className="erp-form-input" value={form.period} onChange={e => setForm({...form, period: e.target.value})} placeholder="e.g. 2026-06" /></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference:</label><input className="erp-form-input" value={form.reference} onChange={e => setForm({...form, reference: e.target.value})} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Memo:</label><input className="erp-form-input" value={form.memo} onChange={e => setForm({...form, memo: e.target.value})} /></div>
              </div>

              <div className="border-t border-gray-300 pt-2">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="text-xs font-bold">Journal Lines:</h4>
                  <button className="text-xs text-blue-700 underline" onClick={addLine}>+ Add Line</button>
                </div>
                <table className="erp-grid text-xs">
                  <thead><tr><th>Account</th><th>Debit</th><th>Credit</th><th>Memo</th><th></th></tr></thead>
                  <tbody>
                    {form.lines.map((line, idx) => (
                      <tr key={idx}>
                        <td>
                          <select className="erp-form-select text-xs" value={line.gl_account_id} onChange={e => updateLine(idx, 'gl_account_id', e.target.value)}>
                            <option value="">Select Account...</option>
                            {glAccounts.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.account_name}</option>)}
                          </select>
                        </td>
                        <td><input type="number" step="0.01" className="erp-form-input w-24 text-xs" value={line.debit} onChange={e => updateLine(idx, 'debit', parseFloat(e.target.value) || 0)} /></td>
                        <td><input type="number" step="0.01" className="erp-form-input w-24 text-xs" value={line.credit} onChange={e => updateLine(idx, 'credit', parseFloat(e.target.value) || 0)} /></td>
                        <td><input className="erp-form-input text-xs" value={line.memo} onChange={e => updateLine(idx, 'memo', e.target.value)} /></td>
                        <td><button className="text-red-600 text-xs" onClick={() => removeLine(idx)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="font-bold bg-gray-100">
                      <td className="text-right">Totals:</td>
                      <td className="text-right">${totalDebit.toFixed(2)}</td>
                      <td className="text-right">${totalCredit.toFixed(2)}</td>
                      <td colSpan="2">
                        {isBalanced ? <span className="text-green-700">Balanced ✓</span> : <span className="text-red-700">Out of Balance: ${Math.abs(totalDebit - totalCredit).toFixed(2)}</span>}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!isBalanced}>Save</button>
              <button className="erp-btn" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default JournalVouchers;
