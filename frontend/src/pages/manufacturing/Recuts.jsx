import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function Recuts() {
  const [recuts, setRecuts] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => { fetchRecuts(); fetchStats(); }, []);

  const fetchRecuts = async () => {
    try { const res = await api.get('/api/manufacturing/recuts'); setRecuts(Array.isArray(res.data) ? res.data : []); } catch { setRecuts([]); }
  };
  const fetchStats = async () => {
    try { const res = await api.get('/api/manufacturing/recuts/stats'); setStats(res.data); } catch { setStats(null); }
  };

  const reasonLabels = { breakage: 'Breakage', scratch: 'Scratch/Damage', wrong_size: 'Wrong Size', chip: 'Chip/Edge Defect', inclusion: 'Inclusion/NiS', warp: 'Warp/Roller Wave', delamination: 'Delamination', seal_failure: 'Seal Failure', other: 'Other' };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Recuts / Scrap Tracking</span>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={() => { fetchRecuts(); fetchStats(); }}>Refresh</button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-3 border-b bg-gray-50 flex gap-3">
          <div className="bg-red-50 border border-red-200 rounded px-3 py-2 text-center">
            <div className="text-xl font-bold text-red-700">{stats.total_recuts || 0}</div>
            <div className="text-[10px] text-gray-600">Total Recuts</div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 text-center">
            <div className="text-xl font-bold text-orange-700">{stats.this_month || 0}</div>
            <div className="text-[10px] text-gray-600">This Month</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded px-3 py-2 text-center">
            <div className="text-xl font-bold text-yellow-700">{stats.total_qty || 0}</div>
            <div className="text-[10px] text-gray-600">Total Qty</div>
          </div>
          {stats.by_reason && stats.by_reason.length > 0 && (
            <div className="flex-1 bg-white border rounded px-3 py-2">
              <div className="text-[10px] text-gray-600 mb-1">Top Reasons:</div>
              <div className="flex gap-2 flex-wrap">
                {stats.by_reason.slice(0, 5).map((r, i) => (
                  <span key={i} className="text-[10px] bg-gray-100 px-2 py-0.5 rounded">{reasonLabels[r.reason_code] || r.reason_code}: {r.count}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <table className="erp-table w-full">
          <thead><tr><th>Date</th><th>WO#</th><th>Item</th><th>Station</th><th>Qty</th><th>Reason</th><th>Status</th><th>Notes</th></tr></thead>
          <tbody>
            {recuts.map(r => (
              <tr key={r.id}>
                <td className="text-xs">{formatDate(r.reported_at)}</td>
                <td className="font-bold text-blue-700 text-xs">{r.wo_number}</td>
                <td className="text-xs">{r.item_number}</td>
                <td className="text-xs">{r.work_center_name}</td>
                <td className="text-xs font-bold text-red-600">{r.quantity}</td>
                <td className="text-xs"><span className="bg-red-50 text-red-700 px-1.5 py-0.5 rounded text-[10px]">{reasonLabels[r.reason_code] || r.reason_code}</span></td>
                <td className="text-xs capitalize">{r.status}</td>
                <td className="text-xs text-gray-600">{r.notes || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {recuts.length === 0 && <div className="text-center text-gray-500 py-8">No recuts recorded</div>}
      </div>
    </div>
    </ModulePage>
  );
}
export default Recuts;
