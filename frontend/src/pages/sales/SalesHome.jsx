import React from 'react';
import ModulePage from '../../components/ModulePage';
import { salesMenu } from '../../config/moduleMenus';

function SalesHome() {
  return (
    <ModulePage {...salesMenu}>
      <div className="p-4">
        <h2 className="text-sm font-bold text-gray-700 mb-3">Glass Fabrication — Quote to Cash Flow</h2>
        <div className="flex items-center gap-2 flex-wrap mb-6">
          <div className="bg-blue-100 border border-blue-300 rounded px-3 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-blue-600 font-bold">QUOTE</div>
            <div className="text-[9px] text-gray-600">Glass specs, pricing</div>
          </div>
          <div className="text-gray-400 text-lg">→</div>
          <div className="bg-green-100 border border-green-300 rounded px-3 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-green-600 font-bold">SALES ORDER</div>
            <div className="text-[9px] text-gray-600">Customer accepts</div>
          </div>
          <div className="text-gray-400 text-lg">→</div>
          <div className="bg-orange-100 border border-orange-300 rounded px-3 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-orange-600 font-bold">PRODUCTION</div>
            <div className="text-[9px] text-gray-600">Work Orders created</div>
          </div>
          <div className="text-gray-400 text-lg">→</div>
          <div className="bg-purple-100 border border-purple-300 rounded px-3 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-purple-600 font-bold">SHIPMENT</div>
            <div className="text-[9px] text-gray-600">Pick, pack, deliver</div>
          </div>
          <div className="text-gray-400 text-lg">→</div>
          <div className="bg-red-100 border border-red-300 rounded px-3 py-2 text-center min-w-[100px]">
            <div className="text-[10px] text-red-600 font-bold">INVOICE</div>
            <div className="text-[9px] text-gray-600">Bill & collect</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="border rounded p-3">
            <h3 className="text-xs font-bold mb-2">How It Works</h3>
            <ol className="text-[10px] text-gray-700 space-y-1 list-decimal pl-4">
              <li><strong>Create Quote</strong> — Enter glass specs (type, thickness, size, edge), quantities, pricing</li>
              <li><strong>Send to Customer</strong> — Email PDF quote with drawings for approval</li>
              <li><strong>Customer Accepts</strong> — Mark quote as accepted</li>
              <li><strong>Convert to Order</strong> — Creates Sales Order with all specs copied</li>
              <li><strong>Release to Production</strong> — Creates Work Orders for each line item</li>
              <li><strong>Manufacturing</strong> — Glass moves through cutting, edging, tempering, etc.</li>
              <li><strong>Create Shipment</strong> — Select completed items to ship, assign rack</li>
              <li><strong>Create Invoice</strong> — Auto-generated from shipment with correct quantities</li>
              <li><strong>Record Payment</strong> — Apply customer payment to close the invoice</li>
            </ol>
          </div>
          <div className="border rounded p-3">
            <h3 className="text-xs font-bold mb-2">Key Features</h3>
            <ul className="text-[10px] text-gray-700 space-y-1 list-disc pl-4">
              <li>Full glass specifications on every line item (glass type, thickness, dimensions, edge work)</li>
              <li>Product type routing — each line gets the correct manufacturing sequence</li>
              <li>Partial shipments supported — ship what's ready, invoice what's shipped</li>
              <li>Traceability — every invoice links back to shipment → order → quote</li>
              <li>Deposit tracking on Sales Orders</li>
              <li>Credit memos and payment recording on invoices</li>
              <li>Email quotes and invoices as PDF directly to customers</li>
            </ul>
          </div>
        </div>
      </div>
    </ModulePage>
  );
}
export default SalesHome;
