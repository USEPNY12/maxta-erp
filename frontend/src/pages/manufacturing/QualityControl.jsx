import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { formatDate } from '../../utils/formatDate';
import ModulePage from '../../components/ModulePage';
import { manufacturingMenu } from '../../config/moduleMenus';

function QualityControl() {
  const [activeTab, setActiveTab] = useState('inspections');
  const [inspections, setInspections] = useState([]);
  const [ncrs, setNcrs] = useState([]);
  const [resultFilter, setResultFilter] = useState('');
  const [ncrStatusFilter, setNcrStatusFilter] = useState('open');

  useEffect(() => { fetchInspections(); fetchNCRs(); }, [resultFilter, ncrStatusFilter]);

  const fetchInspections = async () => {
    try { const res = await api.get('/api/manufacturing/qc/inspections', { params: { result: resultFilter || undefined } }); setInspections(Array.isArray(res.data) ? res.data : []); } catch { setInspections([]); }
  };
  const fetchNCRs = async () => {
    try { const res = await api.get('/api/manufacturing/qc/ncr', { params: { status: ncrStatusFilter } }); setNcrs(Array.isArray(res.data) ? res.data : []); } catch { setNcrs([]); }
  };

  return (
    <ModulePage {...manufacturingMenu}>
      <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <span className="font-bold text-sm">Quality Control</span>
        <div className="erp-toolbar-separator" />
        <button className={`erp-toolbar-btn ${activeTab === 'inspections' ? 'bg-blue-100' : ''}`} onClick={() => setActiveTab('inspections')}>Inspections</button>
        <button className={`erp-toolbar-btn ${activeTab === 'ncr' ? 'bg-blue-100' : ''}`} onClick={() => setActiveTab('ncr')}>NCR Reports</button>
        <div className="erp-toolbar-separator" />
        {activeTab === 'inspections' && (
          <select className="erp-form-select text-xs" value={resultFilter} onChange={e => setResultFilter(e.target.value)}>
            <option value="">All Results</option>
            <option value="pass">Pass</option>
            <option value="fail">Fail</option>
            <option value="conditional">Conditional</option>
          </select>
        )}
        {activeTab === 'ncr' && (
          <select className="erp-form-select text-xs" value={ncrStatusFilter} onChange={e => setNcrStatusFilter(e.target.value)}>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
            <option value="all">All</option>
          </select>
        )}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === 'inspections' && (
          <table className="erp-table w-full">
            <thead><tr><th>Date</th><th>WO#</th><th>Item</th><th>Station</th><th>Type</th><th>Result</th><th>Qty Inspected</th><th>Qty Failed</th><th>Defect</th><th>Disposition</th></tr></thead>
            <tbody>
              {inspections?.map(qi => (
                <tr key={qi.id} className={qi.result === 'fail' ? 'bg-red-50' : qi.result === 'pass' ? '' : 'bg-yellow-50'}>
                  <td className="text-xs">{formatDate(qi.inspection_date)}</td>
                  <td className="font-bold text-blue-700 text-xs">{qi.wo_number}</td>
                  <td className="text-xs">{qi.item_number}</td>
                  <td className="text-xs">{qi.work_center_name}</td>
                  <td className="text-xs capitalize">{qi.inspection_type}</td>
                  <td><span className={`text-[10px] px-2 py-0.5 rounded font-bold ${qi.result === 'pass' ? 'bg-green-100 text-green-700' : qi.result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{qi.result}</span></td>
                  <td className="text-xs text-center">{qi.quantity_inspected}</td>
                  <td className="text-xs text-center text-red-600">{qi.quantity_failed || 0}</td>
                  <td className="text-xs">{qi.defect_type || '-'}</td>
                  <td className="text-xs capitalize">{qi.disposition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {activeTab === 'ncr' && (
          <table className="erp-table w-full">
            <thead><tr><th>NCR#</th><th>Date</th><th>WO#</th><th>Item</th><th>Defect</th><th>Severity</th><th>Qty</th><th>Status</th><th>Disposition</th></tr></thead>
            <tbody>
              {ncrs?.map(ncr => (
                <tr key={ncr.id} className={ncr.severity === 'critical' ? 'bg-red-50' : ''}>
                  <td className="font-bold text-xs">{ncr.ncr_number}</td>
                  <td className="text-xs">{formatDate(ncr.ncr_date || ncr.created_at)}</td>
                  <td className="text-blue-700 text-xs">{ncr.wo_number || '-'}</td>
                  <td className="text-xs">{ncr.item_number || '-'}</td>
                  <td className="text-xs">{ncr.defect_type}</td>
                  <td><span className={`text-[10px] px-2 py-0.5 rounded ${ncr.severity === 'critical' ? 'bg-red-100 text-red-700' : ncr.severity === 'major' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>{ncr.severity}</span></td>
                  <td className="text-xs text-center">{ncr.quantity_affected}</td>
                  <td><span className={`text-[10px] px-2 py-0.5 rounded ${ncr.status === 'open' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{ncr.status}</span></td>
                  <td className="text-xs capitalize">{ncr.disposition}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {((activeTab === 'inspections' && inspections.length === 0) || (activeTab === 'ncr' && ncrs.length === 0)) && (
          <div className="text-center text-gray-500 py-8">No records found</div>
        )}
      </div>
    </div>
    </ModulePage>
  );
}
export default QualityControl;
