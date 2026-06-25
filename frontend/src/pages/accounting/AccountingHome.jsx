import React from 'react';
import ModulePage from '../../components/ModulePage';
import Flowchart from '../../components/Flowchart';

function AccountingHome() {
  return (
    <ModulePage
      title="Accounting Home"
      quickActions={[
        { label: 'New Journal Voucher', path: '/accounting/journal-vouchers?new=true' },
        { label: 'New Customer Payment', path: '/accounting/customer-payments?new=true' },
        { label: 'New Check', path: '/accounting/checks?new=true' },
      ]}
      setupItems={[
        { label: 'Currencies', path: '/setup?tab=currencies' },
        { label: 'Banks', path: '/setup?tab=banks' },
      ]}
      menuItems={[
        { label: 'Accounting Home', path: '/accounting', icon: '🏠' },
        { label: 'GL Accounts', path: '/accounting/gl-accounts', icon: '📊' },
        { label: 'Journal Vouchers', path: '/accounting/journal-vouchers', icon: '📝' },
        { label: 'GL Budget', path: '/accounting/budget', icon: '💰' },
        { label: 'Bank Reconciliation', path: '/accounting/bank-recon', icon: '🏦' },
        { label: 'Bank Accounts', path: '/accounting/bank-accounts', icon: '🏦' },
        { label: 'Customer Payments', path: '/accounting/customer-payments', icon: '💵' },
        { label: 'Customer Deposits', path: '/accounting/deposits', icon: '💳' },
        { label: 'Checks', path: '/accounting/checks', icon: '📄' },
        { label: 'Commissions', path: '/accounting/commissions', icon: '📈' },
      ]}
      reports={{
        type: 'General Ledger',
        options: ['General Ledger', 'Trial Balance', 'Financial Statements', 'Check Register', 'Yearly Income Statement', 'Yearly Balance Sheet']
      }}
    >
      <Flowchart title="Monthly Accounting Process">
        <Flowchart.Row>
          <Flowchart.Box text="Create GL Accounts" />
          <Flowchart.Box text="Enter & Post A/R Invoices" />
          <Flowchart.Box text="Enter & Post A/P Invoices" />
        </Flowchart.Row>
        <Flowchart.Row>
          <Flowchart.Arrow direction="down" />
          <Flowchart.Arrow direction="down" />
          <Flowchart.Arrow direction="down" />
        </Flowchart.Row>
        <Flowchart.Row>
          <Flowchart.Box text="Enter Budgets" />
          <Flowchart.Box text="Record & Post Customer Payments" />
          <Flowchart.Box text="Issue Checks & Vendor Payments" />
        </Flowchart.Row>
        <Flowchart.Arrow direction="down" />
        <Flowchart.Box text="Perform Bank Reconciliation" highlight />
        <Flowchart.Arrow direction="down" />
        <Flowchart.Row>
          <Flowchart.Box text="Enter & Post Monthly Journal Vouchers" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Review Aged Receivables" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Review Aged Payables" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Review Inventory Valuation" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Review & Verify Trial Balance" />
          <Flowchart.Arrow direction="right" />
          <Flowchart.Box text="Review & Verify Financial Statements" />
        </Flowchart.Row>
      </Flowchart>
    </ModulePage>
  );
}

export default AccountingHome;
