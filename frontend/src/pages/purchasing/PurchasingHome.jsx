import React from 'react';
import ModulePage from '../../components/ModulePage';
import Flowchart from '../../components/Flowchart';

function PurchasingHome() {
  return (
    <ModulePage
      title="Purchasing Home"
      quickActions={[
        { label: 'New Quote', path: '/purchasing/quotes?new=true' },
        { label: 'New Purchase Order', path: '/purchasing/purchase-orders?new=true' },
        { label: 'New Receipt', path: '/purchasing/receipts?new=true' },
        { label: 'New Invoice', path: '/purchasing/invoices?new=true' },
        { label: 'New Vendor', path: '/purchasing/vendors?new=true' },
      ]}
      setupItems={[
        { label: 'Vendor Types', path: '/setup?tab=vendor-types' },
      ]}
      menuItems={[
        { label: 'Purchasing Home', path: '/purchasing', icon: '🏠' },
        { label: 'Quotes', path: '/purchasing/quotes', icon: '📝' },
        { label: 'Purchase Orders', path: '/purchasing/purchase-orders', icon: '📋' },
        { label: 'Inventory Receipts', path: '/purchasing/receipts', icon: '📥' },
        { label: 'A/P Invoices', path: '/purchasing/invoices', icon: '💰' },
        { label: 'Vendors', path: '/purchasing/vendors', icon: '🏢' },
        { label: 'Vendor Items', path: '/purchasing/vendor-items', icon: '📦' },
        { label: 'Buy-for-WO/Job', path: '/purchasing/buy-for-wo', icon: '🔧' },
      ]}
      reports={{
        type: 'Purchasing',
        options: ['Purchase Order Status', 'Open POs', 'Receipts Report', 'Vendor Performance']
      }}
    >
      <Flowchart title="Purchasing Order Process">
        <Flowchart.Row>
          <Flowchart.Box text="Enter Purchase Quote" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print Purchase Quote" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Convert Purchase Quote" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Enter Purchase Order" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Vendor on File?" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Box text="Print Purchase Order" />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Receive Purchase Order" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print Inventory Receipt" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print/E-Mail Invoice" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Box text="Enter AP Invoice" />
      </Flowchart>
    </ModulePage>
  );
}

export default PurchasingHome;
