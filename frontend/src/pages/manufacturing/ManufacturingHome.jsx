import React from 'react';
import ModulePage from '../../components/ModulePage';
import Flowchart from '../../components/Flowchart';

function ManufacturingHome() {
  return (
    <ModulePage
      title="Manufacturing Home"
      quickActions={[
        { label: 'New Work Order', path: '/manufacturing/work-orders?new=true' },
        { label: 'New Manufacturing Receipt', path: '/manufacturing/receipts?new=true' },
      ]}
      setupItems={[
        { label: 'Work Centers', path: '/setup?tab=work-centers' },
      ]}
      menuItems={[
        { label: 'Manufacturing Home', path: '/manufacturing', icon: '🏠' },
        { label: 'Work Orders', path: '/manufacturing/work-orders', icon: '📋' },
        { label: 'Labor', path: '/manufacturing/labor', icon: '👷' },
        { label: 'WO Transactions', path: '/manufacturing/wo-transactions', icon: '🔄' },
        { label: 'Bill of Materials (BOM)', path: '/manufacturing/bom', icon: '📦' },
        { label: 'Forecasting', path: '/manufacturing/forecasting', icon: '📈' },
        { label: 'MRP', path: '/manufacturing/mrp', icon: '🧮' },
        { label: 'Production Schedule', path: '/manufacturing/schedule', icon: '📅' },
        { label: 'Finished Goods', path: '/manufacturing/finished-goods', icon: '✅' },
        { label: 'Shop Floor', path: '/manufacturing/shop-floor', icon: '🏭' },
      ]}
      reports={{
        type: 'Manufacturing',
        options: ['Work Order Status', 'WO Cost Summary', 'Open Work Orders', 'Recut Report', 'Labor Report', 'Production Efficiency']
      }}
    >
      <Flowchart title="Manufacturing Process">
        <Flowchart.Row>
          <Flowchart.Box text="Customer Sales Order" />
          <div className="w-16" />
          <Flowchart.Box text="Qty. Available/MRP Reporting" />
        </Flowchart.Row>
        <Flowchart.Row>
          <Flowchart.Arrow direction="down" />
          <div className="w-16" />
          <Flowchart.Arrow direction="down" />
        </Flowchart.Row>
        <Flowchart.Box text="New Work Order is Created" highlight />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Create Inventory Components As Needed" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Specify/Verify Materials for Parent Item" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print Work Order" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Record Materials" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Record Labor Resource" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Enter & Post Receipts from Work Order" />
        </Flowchart.Row>
      </Flowchart>
    </ModulePage>
  );
}

export default ManufacturingHome;
