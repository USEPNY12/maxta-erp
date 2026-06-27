import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';
import ModulePage from '../../components/ModulePage';
import { purchasingMenu } from '../../config/moduleMenus';

function PurchasingAPInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const fetchInvoices = async () => {
    try {
      const res = await api.get('/api/accounting/ap-invoices', { params: { search, status: statusFilter } });
      setInvoices(Array.isArray(res.data) ? res.data : []);
    } catch { setInvoices([]); }
  };

  const fmt = (v) => v ? Number(v).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00';

  return (
    <ModulePage {...purchasingMenu}>
      <div className="h-full flex flex-col">
        <div className="erp-toolbar">
          <input className="erp-form-input" placeholder="Search invoices..." value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} style={{width:'200px'}} />
          <select className="erp-form-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="paid">Paid</option>
            <option value="partial">Partial</option>
          </select>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="erp-grid w-full">
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Vendor</th>
                <th>Date</th>
                <th>Due Date</th>
                <th className="text-right">Amount</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map(inv => (
                <tr key={inv.id}>
                  <td className="font-medium">{inv.invoice_number}</td>
                  <td>{inv.vendor_name}</td>
                  <td>{inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString() : ''}</td>
                  <td>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : ''}</td>
                  <td className="text-right">{fmt(inv.total_amount)}</td>
                  <td className="text-right font-medium">{fmt(inv.balance_due)}</td>
                  <td><span className={`erp-status erp-status-${inv.status}`}>{inv.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoices.length === 0 && <div className="empty-state"><div className="empty-state-text">No A/P invoices found</div></div>}
        </div>
      </div>
    </ModulePage>
  );
}

export default PurchasingAPInvoices;
