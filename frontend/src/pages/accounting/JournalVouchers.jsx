import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { accountingMenu } from '../../config/moduleMenus';

function JournalVouchers() {
  const [vouchers, setVouchers] = useState([]);
  const [showNew, setShowNew] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [glAccounts, setGLAccounts] = useState([]);
  const [form, setForm] = useState({ voucher_date: new Date().toISOString().split('T')[0], reference: '', memo: '', lines: [{ gl_account_id: '', description: '', debit: '', credit: '' }] });

  useEffect(() => { fetchVouchers(); fetchGLAccounts(); }, []);

  const fetchVouchers = async () => {
    try { const res = await api.get('/api/accounting/journal-vouchers', { params: { status: statusFilter } }); setVouchers(Array.isArray(res.data) ? res.data : res.data.vouchers || []); } catch { setVouchers([]); }
  };

  const fetchGLAccounts = async () => {
    try { const res = await api.get('/api/accounting/gl-accounts'); setGLAccounts(Array.isArray(res.data) ? res.data : []); } catch { setGLAccounts([]); }
  };

  const openDetail = async (jv) => {
    try { const res = await api.get(`/api/accounting/journal-vouchers/${jv.id}`); setSelected(res.data); setShowDetail(true); } catch { setSelected(jv); setShowDetail(true); }
  };

  const addLine = () => { setForm({ ...form, lines: [...form.lines, { gl_account_id: '', description: '', debit: '', credit: '' }] }); };
  const removeLine = (i) => { setForm({ ...form, lines: form.lines?.filter((_, idx) => idx !== i) }); };
  const updateLine = (i, field, val) => { const lines = [...form.lines]; lines[i][field] = val; setForm({ ...form, lines }); };

  const totalDebits = form.lines?.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0);
  const totalCredits = form.lines?.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01 && totalDebits > 0;

  const handleSave = async () => {
    if (!isBalanced) { toast.error('Debits must equal Credits'); return; }
    try {
      await api.post('/api/accounting/journal-vouchers', {
        voucher_date: form.voucher_date, reference: form.reference, memo: form.memo,
        lines: form.lines?.filter(l => l.gl_account_id)?.map(l => ({ gl_account_id: parseInt(l.gl_account_id), description: l.description || l.memo, debit: parseFloat(l.debit) || 0, credit: parseFloat(l.credit) || 0 }))
      });
      toast.success('Journal Voucher created'); setShowNew(false); fetchVouchers();
      setForm({ voucher_date: new Date().toISOString().split('T')[0], reference: '', memo: '', lines: [{ gl_account_id: '', description: '', debit: '', credit: '' }] });
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create JV'); }
  };

  const handlePost = async (jv) => {
    try { await api.put(`/api/accounting/journal-vouchers/${jv.id}/post`); toast.success('Journal Voucher posted'); fetchVouchers(); } catch (err) { toast.error(err.response?.data?.error || 'Failed to post JV'); }
  };

  return (
    <ModulePage {...accountingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn" onClick={() => setShowNew(true)}><span className="text-green-600">+</span> New JV</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchVouchers}>↻ Refresh</button>
        <button className="erp-toolbar-btn" onClick={() => window.print()}>Print</button>
        <div className="ml-auto text-xs">Status:
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setTimeout(fetchVouchers, 0); }}>
            <option value="">All</option><option value="draft">Draft</option><option value="posted">Posted</option><option value="void">Void</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead><tr><th>JV Number</th><th>Date</th><th>Reference</th><th>Memo</th><th>Total</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {vouchers.length === 0 ? <tr><td colSpan="7" className="text-center p-4 text-gray-500">No journal vouchers</td></tr> : vouchers?.map(jv => (
              <tr key={jv.id} className="cursor-pointer" onClick={() => openDetail(jv)}>
                <td className="text-blue-700 font-bold">{jv.voucher_number}</td>
                <td>{jv.voucher_date?.split('T')[0]}</td>
                <td>{jv.reference || '-'}</td>
                <td>{jv.memo || '-'}</td>
                <td className="text-right">${parseFloat(jv.total_debit || jv.total || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${(jv.status || '').toLowerCase()}`}>{jv.status}</span></td>
                <td>{jv.status === 'draft' && <button className="erp-btn text-xs" onClick={e => { e.stopPropagation(); handlePost(jv); }}>Post</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showDetail && selected && (
        <div className="erp-modal-overlay" onClick={() => setShowDetail(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>Journal Voucher - {selected.voucher_number}</span><button onClick={() => setShowDetail(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-4 gap-3 mb-3 text-xs">
                <div><label className="font-bold">JV#:</label> {selected.voucher_number}</div>
                <div><label className="font-bold">Date:</label> {selected.voucher_date?.split('T')[0]}</div>
                <div><label className="font-bold">Reference:</label> {selected.reference || '-'}</div>
                <div><label className="font-bold">Status:</label> <span className={`erp-status erp-status-${(selected.status || '').toLowerCase()}`}>{selected.status}</span></div>
              </div>
              {selected.memo && <div className="mb-3 text-xs"><label className="font-bold">Memo:</label> {selected.memo}</div>}
              {selected.status === 'posted' && <div className="mb-2 text-xs text-orange-600 font-bold">This document is posted and locked - no changes allowed</div>}
              <table className="erp-grid">
                <thead><tr><th>Account#</th><th>Account Name</th><th>Description</th><th>Debit</th><th>Credit</th></tr></thead>
                <tbody>
                  {(selected.lines || [])?.map((l, i) => (
                    <tr key={i}><td className="font-mono">{l.account_number}</td><td>{l.account_name}</td><td>{l.description || l.memo || '-'}</td><td className="text-right">{parseFloat(l.debit || 0) > 0 ? `$${parseFloat(l.debit).toFixed(2)}` : ''}</td><td className="text-right">{parseFloat(l.credit || 0) > 0 ? `$${parseFloat(l.credit).toFixed(2)}` : ''}</td></tr>
                  ))}
                  <tr className="font-bold bg-gray-100"><td colSpan="3" className="text-right">Totals:</td><td className="text-right">${(selected.lines || [])?.reduce((s, l) => s + (parseFloat(l.debit) || 0), 0).toFixed(2)}</td><td className="text-right">${(selected.lines || [])?.reduce((s, l) => s + (parseFloat(l.credit) || 0), 0).toFixed(2)}</td></tr>
                </tbody>
              </table>
            </div>
            <div className="erp-modal-footer">
              {selected.status === 'draft' && <button className="erp-btn erp-btn-primary" onClick={() => { handlePost(selected); setShowDetail(false); }}>Post</button>}
              <button className="erp-btn" onClick={() => window.print()}>Print</button>
              <button className="erp-btn" onClick={() => setShowDetail(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {showNew && (
        <div className="erp-modal-overlay" onClick={() => setShowNew(false)}>
          <div className="erp-modal" style={{ minWidth: '800px' }} onClick={e => e.stopPropagation()}>
            <div className="erp-modal-title"><span>New Journal Voucher</span><button onClick={() => setShowNew(false)} className="text-white hover:text-gray-300">✕</button></div>
            <div className="erp-modal-body">
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div className="erp-form-group"><label className="erp-form-label">Date:</label><input className="erp-form-input" type="date" value={form.voucher_date} onChange={e => setForm({ ...form, voucher_date: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Reference:</label><input className="erp-form-input" value={form.reference} onChange={e => setForm({ ...form, reference: e.target.value })} /></div>
                <div className="erp-form-group"><label className="erp-form-label">Memo:</label><input className="erp-form-input" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} /></div>
              </div>
              <table className="erp-grid">
                <thead><tr><th>Account</th><th>Description</th><th>Debit</th><th>Credit</th><th></th></tr></thead>
                <tbody>
                  {form.lines?.map((line, i) => (
                    <tr key={i}>
                      <td><select className="erp-form-select w-full" value={line.gl_account_id} onChange={e => updateLine(i, 'gl_account_id', e.target.value)}>
                        <option value="">Select Account...</option>{glAccounts?.map(a => <option key={a.id} value={a.id}>{a.account_number} - {a.account_name}</option>)}
                      </select></td>
                      <td><input className="erp-form-input w-full" value={line.description} onChange={e => updateLine(i, 'description', e.target.value)} /></td>
                      <td><input className="erp-form-input w-24 text-right" type="number" step="0.01" value={line.debit} onChange={e => updateLine(i, 'debit', e.target.value)} /></td>
                      <td><input className="erp-form-input w-24 text-right" type="number" step="0.01" value={line.credit} onChange={e => updateLine(i, 'credit', e.target.value)} /></td>
                      <td><button className="text-red-600 text-xs" onClick={() => removeLine(i)}>X</button></td>
                    </tr>
                  ))}
                  <tr className="font-bold bg-gray-100"><td colSpan="2" className="text-right">Totals:</td><td className="text-right">${totalDebits.toFixed(2)}</td><td className="text-right">${totalCredits.toFixed(2)}</td><td></td></tr>
                </tbody>
              </table>
              <button className="erp-btn text-xs mt-2" onClick={addLine}>+ Add Line</button>
              {!isBalanced && totalDebits > 0 && <div className="text-red-600 text-xs mt-1">Debits ({totalDebits.toFixed(2)}) must equal Credits ({totalCredits.toFixed(2)})</div>}
              {isBalanced && <div className="text-green-600 text-xs mt-1">Balanced</div>}
            </div>
            <div className="erp-modal-footer">
              <button className="erp-btn erp-btn-primary" onClick={handleSave} disabled={!isBalanced}>Save JV</button>
              <button className="erp-btn" onClick={() => setShowNew(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
    </ModulePage>
  );
}

export default JournalVouchers;
