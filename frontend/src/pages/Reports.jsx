import React, { useState } from 'react';

const REPORT_CATEGORIES = {
  'Accounts Payable': [
    { name: 'Open Payables', desc: 'Shows current outstanding (not fully paid) invoices for each vendor.' },
    { name: 'Aged Payables', desc: 'Shows outstanding invoices by age (Current, 30, 60, 90 days) for each vendor.' },
    { name: 'AP History', desc: 'Shows invoices and Checks for each vendor for the selected period.' },
  ],
  'Accounts Receivable': [
    { name: 'Open Receivables', desc: 'Shows outstanding invoices by age (Current, 30, 60, 90 days) for each customer.' },
    { name: 'AR History', desc: 'Shows invoices and payments for each customer for the selected period.' },
    { name: 'AR Statements', desc: 'Documents you can print and send to customers showing outstanding invoices.' },
    { name: 'Sales Tax', desc: 'Tax collected and owed by Tax Code for a date range.' },
  ],
  'Sales': [
    { name: 'Sales Invoice Register', desc: 'All invoices posted for a selected date range.' },
    { name: 'Bookings Report', desc: 'New orders booked for a selected date range by customer.' },
    { name: 'Shipment Report', desc: 'All shipments for a date range with carrier and tracking info.' },
    { name: 'Commission Report', desc: 'Commissions earned for a date range grouped by Salesperson.' },
    { name: 'Open Orders', desc: 'All open sales orders with ship dates and amounts.' },
  ],
  'General Ledger': [
    { name: 'General Ledger', desc: 'Opening balance, transactions, and closing balance for each account.' },
    { name: 'Trial Balance', desc: 'Net change and balance (actual and budget) for each account.' },
    { name: 'Financial Statements', desc: 'Balance Sheet and Income Statement with comparative formats.' },
    { name: 'Check Register', desc: 'Customer payments and AP checks against a selected bank account.' },
    { name: 'GL Journal Report', desc: 'GL transactions by Account Code filtered by Journal Type and date range.' },
    { name: 'Yearly Income Statement', desc: 'Income Statement for 12 months.' },
    { name: 'Yearly Balance Sheet', desc: 'Balance Sheet for 12 months.' },
  ],
  'Inventory': [
    { name: 'Value by Item', desc: 'Inventory quantity on hand, unit cost, and value summarized by item.' },
    { name: 'Value by Item/Location', desc: 'Inventory value for each item in each warehouse location.' },
    { name: 'Value by Type', desc: 'Inventory value summarized by item type.' },
    { name: 'Stock Status', desc: 'On hand, allocated, available, and on order for each item.' },
    { name: 'Reorder Report', desc: 'Items below minimum quantity that need to be reordered.' },
  ],
  'Manufacturing': [
    { name: 'Work Order Status', desc: 'Status of all work orders (open, scheduled, released, closed).' },
    { name: 'WO Cost Summary', desc: 'Estimated vs actual cost breakdown for completed work orders.' },
    { name: 'Recut Report', desc: 'All recuts by department, reason code, and cost impact.' },
    { name: 'Labor Report', desc: 'Labor hours and cost by employee, work center, and work order.' },
    { name: 'Production Efficiency', desc: 'Actual vs estimated hours by work center.' },
    { name: 'Shop Floor Status', desc: 'Current status of all items on the shop floor by station.' },
  ],
  'Purchasing': [
    { name: 'Purchase Order Status', desc: 'Status of all purchase orders (open, partial, received, closed).' },
    { name: 'Open POs', desc: 'All open purchase orders with expected delivery dates.' },
    { name: 'Receipts Report', desc: 'All inventory receipts for a date range.' },
    { name: 'Vendor Performance', desc: 'On-time delivery rate and quality metrics by vendor.' },
  ],
};

function Reports() {
  const [activeCategory, setActiveCategory] = useState('Accounts Payable');

  return (
    <div className="h-full flex">
      {/* Left Tree */}
      <div className="w-48 bg-gray-100 border-r border-gray-300 overflow-auto">
        <div className="p-2 border-b border-gray-300">
          <span className="text-xs font-bold">Compact View</span>
        </div>
        <div className="p-1">
          <div className="text-xs font-bold p-1 bg-blue-100 border border-blue-300 mb-1">All Reports</div>
          {Object.keys(REPORT_CATEGORIES).map(cat => (
            <div
              key={cat}
              className={`text-xs p-1 cursor-pointer hover:bg-blue-50 ${activeCategory === cat ? 'bg-blue-200 font-bold' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </div>
          ))}
        </div>
      </div>

      {/* Right Content */}
      <div className="flex-1 overflow-auto p-4">
        {Object.entries(REPORT_CATEGORIES).map(([category, reports]) => (
          <div key={category} className={activeCategory === category || activeCategory === 'All Reports' ? '' : 'hidden'}>
            <h3 className="text-base font-bold border-b border-gray-400 pb-1 mb-3">{category}</h3>
            <table className="w-full mb-6">
              <tbody>
                {reports.map(report => (
                  <tr key={report.name} className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer">
                    <td className="py-1 px-2 text-blue-700 text-sm font-medium w-48 whitespace-nowrap">{report.name}</td>
                    <td className="py-1 px-2 text-xs text-gray-600">{report.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Reports;
