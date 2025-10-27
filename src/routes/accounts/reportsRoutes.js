const {
  getProfitAndLoss,
  getProfitAndLossPDF,
  getBalanceSheet,
  getSalesByCustomer,
  getSalesBySalesPerson,
  getSalesByItem,
  getCustomerBalances,
  getCustomerBalanceSummary,
  getReceivableSummary,
  getReceivableDetails,
  getInvoiceDetails,
  getDCDetails,
  getQuotesDetails,
  getPaymentsReceived,
  getVendorBalanceSummary,
  getProcurementPayableSummary,
  getPayrollPayableSummary,
  getPayableDetails,
  getTimeToPay,
  getExpenseDetails,
  getExpenseByCategory,
  getExpenseByCustomer,
  getExpenseByVendor,
  getMovementOfEquity,
  getCashFlowStatement,
  getCashFlowStatementPDF,
  getTrialBalance,
  getGeneralLedger,
  getDetailedGeneralLedger,
  getAccountTransactions,
  getAccountTypeSummary,
  getJournals,
} = require('../../controllers/accounts/reportsController');

const router = require('express').Router();

// Profit and Loss Reports
router.get('/profitandloss/:orgid', getProfitAndLoss);
router.get('/profitandlosspdf/:orgid', getProfitAndLossPDF);

// Balance Sheet
router.get('/balancesheet/:orgid', getBalanceSheet);

// Sales Reports
router.get('/salesbycustomer/:orgid', getSalesByCustomer);
router.get('/salesbysalesperson/:orgid', getSalesBySalesPerson);
router.get('/salesbyitem/:orgid', getSalesByItem);

// Customer Reports
router.get('/customerbalances/:orgid', getCustomerBalances);
router.get('/customerbalancesummary/:orgid', getCustomerBalanceSummary);

// Receivables Reports
router.get('/recevablesummary/:orgid', getReceivableSummary);
router.get('/receivabledetails/:orgid', getReceivableDetails);

// Invoice and Document Reports
router.get('/invoicedetails/:orgid', getInvoiceDetails);
router.get('/dcdetails/:orgid', getDCDetails);
router.get('/quotesdetails/:orgid', getQuotesDetails);

// Payment Reports
router.get('/paymentsreceived/:orgid', getPaymentsReceived);
router.get('/timetopay/:orgid', getTimeToPay);

// Vendor and Payable Reports
router.get('/vendorbalancesummary/:orgid', getVendorBalanceSummary);
router.get('/procurementpayablesummary/:orgid', getProcurementPayableSummary);
router.get('/payrollpayablesummary/:orgid', getPayrollPayableSummary);
router.get('/payabledetails/:orgid', getPayableDetails);

// Expense Reports
router.get('/expensedetails/:orgid', getExpenseDetails);
router.get('/expbycategory/:orgid', getExpenseByCategory);
router.get('/expbycustomer/:orgid', getExpenseByCustomer);
router.get('/expbyvendor/:orgid', getExpenseByVendor);

// Equity and Cash Flow Reports
router.get('/movementofequity/:orgid', getMovementOfEquity);
router.get('/cfstatement/:orgid', getCashFlowStatement);
router.get('/cfstatementpdf/:orgid', getCashFlowStatementPDF);

// General Ledger Reports
router.get('/trialbalance/:orgid', getTrialBalance);
router.get('/generalledger/:orgid', getGeneralLedger);
router.get('/detailedgeneralledger/:orgid', getDetailedGeneralLedger);

// Account Reports
router.get('/accounttxns/:orgid', getAccountTransactions);
router.get('/accounttypesummary/:orgid', getAccountTypeSummary);

// Journal Reports
router.get('/journals/:orgid', getJournals);

module.exports = router;
