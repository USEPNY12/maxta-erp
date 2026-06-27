import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const CustomerPortal = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [customerName, setCustomerName] = useState('');
  const [documents, setDocuments] = useState(null);
  const [activeTab, setActiveTab] = useState('invoices');

  useEffect(() => {
    validateAndLoad();
  }, [token]);

  const validateAndLoad = async () => {
    try {
      // Validate token
      const valRes = await fetch(`${API_BASE}/document-center/portal/validate/${token}`);
      if (!valRes.ok) {
        setError('This link is invalid or has expired. Please contact us for a new link.');
        setLoading(false);
        return;
      }
      const valData = await valRes.json();
      setCustomerName(valData.customer_name);

      // Load documents
      const docsRes = await fetch(`${API_BASE}/document-center/portal/documents/${token}`);
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData);
      }
    } catch (e) {
      setError('Unable to load portal. Please try again later.');
    }
    setLoading(false);
  };

  const downloadPdf = (type, id) => {
    window.open(`${API_BASE}/document-center/portal/pdf/${token}/${type}/${id}`, '_blank');
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString() : '-';
  const formatCurrency = (val) => val != null ? `$${parseFloat(val).toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '-';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your documents...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">&#9888;</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'invoices', label: 'Invoices', count: documents?.invoices?.length || 0 },
    { id: 'quotes', label: 'Quotes', count: documents?.quotes?.length || 0 },
    { id: 'orders', label: 'Orders', count: documents?.orders?.length || 0 },
    { id: 'statements', label: 'Statements', count: documents?.statements?.length || 0 }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-700 text-white py-6 px-4">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">Max TA Group</h1>
          <p className="text-blue-200 text-sm mt-1">Customer Document Portal</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800">Welcome, {customerName}</h2>
          <p className="text-sm text-gray-500 mt-1">View and download your invoices, quotes, orders, and statements below.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {activeTab === 'invoices' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Invoice #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Paid</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents?.invoices?.map(inv => (
                  <tr key={inv.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{inv.invoice_number}</td>
                    <td className="px-4 py-3">{formatDate(inv.invoice_date)}</td>
                    <td className="px-4 py-3">{formatDate(inv.due_date)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(inv.total_amount)}</td>
                    <td className="px-4 py-3 text-right text-green-600">{formatCurrency(inv.amount_paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${inv.status === 'paid' ? 'bg-green-100 text-green-700' : inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPdf('ar_invoice', inv.id)} className="text-blue-600 hover:underline">View PDF</button>
                    </td>
                  </tr>
                ))}
                {(!documents?.invoices || documents.invoices.length === 0) && (
                  <tr><td colSpan="7" className="px-4 py-8 text-center text-gray-400">No invoices found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'quotes' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Quote #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents?.quotes?.map(q => (
                  <tr key={q.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{q.quote_number}</td>
                    <td className="px-4 py-3">{formatDate(q.quote_date)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(q.total)}</td>
                    <td className="px-4 py-3 capitalize">{q.status}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPdf('quote', q.id)} className="text-blue-600 hover:underline">View PDF</button>
                    </td>
                  </tr>
                ))}
                {(!documents?.quotes || documents.quotes.length === 0) && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No quotes found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'orders' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Order #</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents?.orders?.map(o => (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{o.order_number}</td>
                    <td className="px-4 py-3">{formatDate(o.order_date)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(o.total)}</td>
                    <td className="px-4 py-3 capitalize">{o.status}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => downloadPdf('sales_order', o.id)} className="text-blue-600 hover:underline">View PDF</button>
                    </td>
                  </tr>
                ))}
                {(!documents?.orders || documents.orders.length === 0) && (
                  <tr><td colSpan="5" className="px-4 py-8 text-center text-gray-400">No orders found.</td></tr>
                )}
              </tbody>
            </table>
          )}

          {activeTab === 'statements' && (
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left">Statement Date</th>
                  <th className="px-4 py-3 text-left">Period</th>
                  <th className="px-4 py-3 text-right">Balance</th>
                  <th className="px-4 py-3 text-left">PDF</th>
                </tr>
              </thead>
              <tbody>
                {documents?.statements?.map(s => (
                  <tr key={s.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{formatDate(s.statement_date)}</td>
                    <td className="px-4 py-3">{formatDate(s.period_start)} - {formatDate(s.period_end)}</td>
                    <td className="px-4 py-3 text-right font-bold">{formatCurrency(s.closing_balance)}</td>
                    <td className="px-4 py-3">
                      {s.file_path && <button onClick={() => downloadPdf('statement', s.id)} className="text-blue-600 hover:underline">View PDF</button>}
                    </td>
                  </tr>
                ))}
                {(!documents?.statements || documents.statements.length === 0) && (
                  <tr><td colSpan="4" className="px-4 py-8 text-center text-gray-400">No statements found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-400 mt-8">
          <p>Max TA Group LLC | 115 East High St EXT, Sharpsville, PA 16150 | (724) 979-1834</p>
          <p className="mt-1">This portal link will expire. Contact us for a new link if needed.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortal;
