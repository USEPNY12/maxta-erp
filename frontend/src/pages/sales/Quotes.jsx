import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import api from '../../services/api';

function Quotes() {
  const [quotes, setQuotes] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchQuotes(); }, []);
  const fetchQuotes = async () => {
    try { const res = await api.get('/api/sales/quotes', { params: { search } }); setQuotes(res.data); } catch { setQuotes([]); }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="erp-toolbar">
        <button className="erp-toolbar-btn"><span className="text-green-600">+</span> New Quote</button>
        <div className="erp-toolbar-separator" />
        <button className="erp-toolbar-btn" onClick={fetchQuotes}>↻ Refresh</button>
        <button className="erp-toolbar-btn">Print</button>
        <div className="erp-toolbar-separator" />
        <span className="text-xs">Search:</span>
        <input className="erp-form-input w-48 ml-1" value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchQuotes()} />
        <button className="erp-btn text-xs ml-1" onClick={fetchQuotes}>Find</button>
        <div className="ml-auto text-xs">View: <select className="erp-form-select"><option>All Open</option><option>All</option><option>Converted</option><option>Expired</option></select></div>
      </div>
      <div className="flex-1 overflow-auto">
        <table className="erp-grid">
          <thead>
            <tr><th>Quote No.</th><th>Date</th><th>Customer</th><th>Description</th><th>Amount</th><th>Status</th><th>Salesperson</th><th>Expires</th></tr>
          </thead>
          <tbody>
            {quotes.length === 0 ? (
              <tr><td colSpan="8" className="text-center p-4">No quotes found</td></tr>
            ) : quotes.map(q => (
              <tr key={q.id} className="cursor-pointer">
                <td className="text-blue-700 font-bold">{q.quote_no}</td>
                <td>{q.quote_date}</td>
                <td>{q.customer_name}</td>
                <td>{q.description}</td>
                <td className="text-right">${parseFloat(q.total_amount || 0).toFixed(2)}</td>
                <td><span className={`erp-status erp-status-${q.status?.toLowerCase()}`}>{q.status}</span></td>
                <td>{q.salesperson}</td>
                <td>{q.expiry_date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Quotes;
