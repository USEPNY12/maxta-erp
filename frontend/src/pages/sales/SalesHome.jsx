import React from 'react';
import ModulePage from '../../components/ModulePage';
import Flowchart from '../../components/Flowchart';

function SalesHome() {
  return (
    <ModulePage
      title="Sales Home"
      quickActions={[
        { label: 'New Quote', path: '/sales/quotes?new=true' },
        { label: 'New Order', path: '/sales/orders?new=true' },
        { label: 'New Shipment', path: '/sales/shipments?new=true' },
        { label: 'New Invoice', path: '/sales/invoices?new=true' },
        { label: 'New Customer', path: '/sales/customers?new=true' },
      ]}
      setupItems={[
        { label: 'Customer Types', path: '/setup?tab=customer-types' },
        { label: 'Tax Groups', path: '/setup?tab=tax-groups' },
        { label: 'Carriers', path: '/setup?tab=carriers' },
        { label: 'Price Lists', path: '/setup?tab=price-lists' },
        { label: 'Salespeople', path: '/setup?tab=salespeople' },
      ]}
      menuItems={[
        { label: 'Sales Home', path: '/sales', icon: '🏠' },
        { label: 'Internet Orders', path: '/sales/internet-orders', icon: '🌐' },
        { label: 'Quotes', path: '/sales/quotes', icon: '📝' },
        { label: 'Orders', path: '/sales/orders', icon: '📋' },
        { label: 'Shipments', path: '/sales/shipments', icon: '🚚' },
        { label: 'A/R Invoices', path: '/sales/ar-invoices', icon: '💰' },
        { label: 'Customers', path: '/sales/customers', icon: '👥' },
        { label: 'Customer Pricing', path: '/sales/customer-pricing', icon: '💲' },
        { label: 'Warranty', path: '/sales/warranty', icon: '🛡️' },
        { label: 'ERP-Order Import', path: '/sales/import', icon: '📥' },
      ]}
      reports={{
        type: 'Sales',
        options: ['Sales Invoice Register', 'Open Orders', 'Bookings Report', 'Shipment Report', 'Commission Report']
      }}
    >
      <Flowchart title="Sales Process">
        <Flowchart.Box text="Customer Requests Quote" />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Customer On File?" />
          <Flowchart.Arrow direction="right" label="NO" />
          <Flowchart.Box text="Add New Customer" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" label="YES" />
        <Flowchart.Row>
          <Flowchart.Box text="Enter New Quote" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print/E-Mail Quote" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Box text="Customer Places Order" />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Product in Stock?" highlight />
          <Flowchart.Arrow direction="right" label="NO" />
          <Flowchart.Box text="Create Mfg. Order" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Receipt Mfg. Order" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" label="YES" />
        <Flowchart.Box text="Convert to Order" />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Print Picking Slip" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Generate Shipment" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print Bill of Lading" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Generate & Post AR Invoice" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Print/E-Mail Invoice" />
        </Flowchart.Row>
      </Flowchart>
    </ModulePage>
  );
}

export default SalesHome;
