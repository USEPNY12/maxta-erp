import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Open');

  useEffect(() => { fetchInvoices(); }, [statusFilter]);
  const fetchInvoices = async () => {
    try { const res = await api.get('/api/accounting/invoices', { params: { search, status: statusFilter } }); setInvoices(res.data); } catch { setInvoices([]); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Invoice</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchInvoices}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print</button>
        <button className="erp-toolbar-btn">Email</button>
        <button className="erp-toolbar-btn">Post</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchInvoices()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchInvoices}>Find</button>
        <div className="ml-auto text-xs">View: 
          <select className="erp-form-select ml-1" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option>All Open</option><option>All</option><option>Paid</option><option>Overdue</option>
          </select>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Invoice No.</th><th>Date</th><th>Customer</th><th>SO#</th><th>Amount</th><th>Paid</th><th>Balance</th><th>Due Date</th><th>Status</th></tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr><td colSpan="9" className="text-center p-4">No invoices found</td></tr>
            ) : invoices.map(inv => (
              <tr key={inv.id} className="cursor-pointer">
                <td className="text-blue-700 font-bold">{inv.invoice_number}</td>
                <td>{inv.invoice_date}</td>
                <td>{inv.customer_name}</td>
                <td>{inv.so_number}</td>
                <td className="text-right">${parseFloat(inv.total_amount || 0).toFixed(2)}</td>
                <td className="text-right">${parseFloat(inv.amount_paid || 0).toFixed(2)}</td>
                <td className="text-right font-bold">${parseFloat(inv.balance || 0).toFixed(2)}</td>
                <td>{inv.due_date}</td>
                <td><span className={`erp-status erp-status-${inv.status?.toLowerCase()}`}>{inv.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Invoices;
