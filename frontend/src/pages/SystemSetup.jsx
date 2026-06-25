import React from 'react';
import { Link } from 'react-router-dom';

const SETUP_SECTIONS = {
  General: ['Your Company', 'User Security'],
  Alerts: ['System Alerts'],
  Manufacturing: ['Work Calendar', 'Shifts', 'Work Order Types', 'Work Centers', 'Employees', 'Priority', 'Scrap Codes'],
  Service: ['Asset Types', 'Technicians', 'Makes', 'Models', 'Service Job Types', 'Service Billing Type'],
  Sales: ['Sales Order Types', 'Customer Types', 'Salespersons', 'Tax Codes', 'Carriers', 'Freight', 'Price Lists', 'Prices/Price Breaks', 'Discount Codes', 'Contract Pricing', 'Volume Discount', 'Customer Terms', 'Sales Category'],
  Inventory: ['Item Types', 'Location Groups', 'Locations', 'Lots', 'Manufacturers', 'Adjustment Codes'],
  Purchasing: ['Purchase Order Types', 'Departments', 'Vendor Types', 'Accounting Codes'],
  Accounting: ['Banks', 'Currencies', 'Accounting Periods', 'Customer Payment Type', 'Vendor Payment Type', 'Sub Account Type'],
  Warranty: ['Credit Types', 'Warranty Claim Status'],
};

function SystemSetup() {
  return (
    <div className="h-full overflow-auto p-6 bg-[#c8c8d4]">
      <div className="grid grid-cols-4 gap-8">
        {Object.entries(SETUP_SECTIONS).map(([section, items]) => (
          <div key={section}>
            <h3 className="text-sm font-bold border-b border-gray-600 pb-1 mb-2">{section}</h3>
            <div className="space-y-1">
              {items.map(item => (
                <Link
                  key={item}
                  to={`/setup/${item.toLowerCase().replace(/[\s/]+/g, '-')}`}
                  className="block text-sm text-blue-800 hover:text-blue-600 hover:underline"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SystemSetup;
