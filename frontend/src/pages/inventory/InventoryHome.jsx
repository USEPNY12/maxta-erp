import React from 'react';
import { useNavigate } from 'react-router-dom';
import ModulePage from '../../components/ModulePage';
import Flowchart from '../../components/Flowchart';

function InventoryHome() {
  const navigate = useNavigate();

  return (
    <ModulePage
      title="Inventory Home"
      quickActions={[
        { label: 'New Item', path: '/inventory/items?new=true' },
        { label: 'New Inventory Adjustment', path: '/inventory/adjustments?new=true' },
      ]}
      setupItems={[
        { label: 'Item Types', path: '/setup?tab=item-types' },
        { label: 'Locations', path: '/setup?tab=locations' },
        { label: 'Resources', path: '/setup?tab=resources' },
      ]}
      menuItems={[
        { label: 'Inventory Home', path: '/inventory', icon: '🏠' },
        { label: 'Items', path: '/inventory/items', icon: '📦' },
        { label: 'Item Inquiry', path: '/inventory/inquiry', icon: '🔍' },
        { label: 'Inventory Adjustments', path: '/inventory/adjustments', icon: '📋' },
        { label: 'Physical Count', path: '/inventory/physical-count', icon: '📊' },
        { label: 'Inventory Transfers', path: '/inventory/transfers', icon: '🔄' },
        { label: 'Transfer Orders', path: '/inventory/transfer-orders', icon: '📄' },
        { label: 'Transfer Receipts', path: '/inventory/transfer-receipts', icon: '📥' },
      ]}
      reports={{
        type: 'Inventory',
        options: ['Value by Item', 'Value by Item/Location', 'Value by Type', 'Value by Type/Item', 'Stock Status', 'Reorder Report']
      }}
    >
      <Flowchart title="Inventory Process">
        <Flowchart.Row>
          <Flowchart.Box text="Create New Item" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Item Type on File?" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Enter General Info" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Enter Vendor Info" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Enter Bill of Materials" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Enter GL Accounts" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Enter Physical Count" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Adjust Inventory as Needed" />
        </Flowchart.Row>
      </Flowchart>
    </ModulePage>
  );
}

export default InventoryHome;
