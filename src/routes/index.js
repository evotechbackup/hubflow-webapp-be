/**
 * Routes Index
 * Central route configuration and mounting
 */

const express = require('express');
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./auth/userRoutes');
const companyRoutes = require('./auth/companyRoutes');

const awsConfig = require('../config/awsConfig');

const modulesRoutes = require('./user-management/modulesRoutes');
const rolesRoutes = require('./user-management/rolesRoutes');
const departmentRoutes = require('./user-management/departmentRoutes');
const organizationRoutes = require('./user-management/organizationRoutes');
const featureModulesRoutes = require('./user-management/featureModulesRoutes');

// Master
const customizationRoutes = require('./master/customizationRoutes');
const lastInsertedIdRoutes = require('./master/lastInsertedIdRoutes');
const currencyRoutes = require('./master/currencyRoutes');
const containerTypeRoutes = require('./master/containerTypeRoute');
const divisionRoutes = require('./master/divisionRoutes');
const regionRoutes = require('./master/regionRoutes');
const zoneRoutes = require('./master/zoneRoutes');
const packRoutes = require('./master/packRoutes');
const activityRoutes = require('./master/activityRoutes');
const categoryRoutes = require('./master/categoryRoutes');
const countryRoutes = require('./master/countryRoutes');
const containerInventoryRoutes = require('./master/containerInventoryRoutes');
const commodityRoutes = require('./master/commodityRoutes');
const clauseRoutes = require('./master/clauseRoutes');
const vesselRoutes = require('./master/vesselRoutes');
const portRoutes = require('./master/portRoutes');
const landPortRoutes = require('./master/landPortRoutes');
const seaPortRoutes = require('./master/seaPortRoutes');
const airPortRoutes = require('./master/airPortRoutes');
const bankBranchRoutes = require('./master/bankBranchRoutes');
const districtRoutes = require('./master/districtRoutes');
const cityRoutes = require('./master/cityRoutes');
const areaRoutes = require('./master/areaRoutes');
const nationalityRoutes = require('./master/nationalityRoutes');
const addressRoutes = require('./master/addressRoutes');

// Sales
const customerRoutes = require('./sales/customerRoutes');
const enquiryRoutes = require('./sales/enquiryRoutes');
const quoteRoutes = require('./sales/quoteRoutes');
const bookingRoutes = require('./sales/bookingRoutes');
const invoiceRoutes = require('./sales/invoiceRoutes');

// Procurement
const vendorRoutes = require('./procurement/vendorRoutes');
const rfqRoutes = require('./procurement/rfqRoutes');
const rfpRoutes = require('./procurement/rfpRoutes');
const purchaseOrderRoutes = require('./procurement/purchaseOrderRoutes');
const purchaseReceiveRoutes = require('./procurement/purchaseReceiveRoutes');
const billsRoutes = require('./procurement/billsRoutes');
const vendorPerformanceRoutes = require('./procurement/vendorPerformanceRoutes');
const paymentMadeRoutes = require('./procurement/paymentMadeRoutes');
const purchaseInspectionFormRoutes = require('./procurement/purchaseInspectionFormRoutes');
const purchaseInspectionReportRoutes = require('./procurement/purchaseInspectionReportRoutes');

// Operations
const serviceCategoryRoutes = require('./operations/serviceCategoryRoutes');
const serviceRoutes = require('./operations/serviceRoute');
const jobsRoutes = require('./operations/jobsRoutes');
const shipmentRoutes = require('./operations/shipmentRoutes');
const shipmentDimensionRoutes = require('./operations/shipmentDimensionRoutes');
const shipmentRoutingRoutes = require('./operations/shipmentRoutingRoutes');

// Accounts
const accountRoutes = require('../routes/accounts/accountRoutes');
const parentAccountRoutes = require('../routes/accounts/parentaccountRoutes');
const transactionRoutes = require('../routes/accounts/transactionRoutes');
const costCenterRoutes = require('../routes/accounts/costCenterRoutes');
const costMasterRoutes = require('../routes/accounts/costMasterRoutes');
const expenseRoutes = require('../routes/accounts/expenseRoutes');
const recurringExpenseRoutes = require('../routes/accounts/recurringExpenseRoutes');
const journalRoutes = require('../routes/accounts/journalRoutes');
const pcrRoutes = require('../routes/accounts/pcrRoutes');
const pccRoutes = require('../routes/accounts/pccRoutes');
const reportsRoutes = require('../routes/accounts/reportsRoutes');
const balancesheetRoutes = require('../routes/accounts/reports/balancesheetRoutes');
const profitnlossRoutes = require('../routes/accounts/reports/profitnlossRoutes');
const cashflowstatementRoutes = require('../routes/accounts/reports/cashflowstatementRoutes');
const trialbalanceRoutes = require('../routes/accounts/reports/trialbalanceRoutes');
const analyticsRoutes = require('../routes/accounts/reports/analyticsRoutes');
const pcrVoucherRoutes = require('../routes/accounts/vouchers/pcrVoucherRoutes');
const pccVoucherRoutes = require('../routes/accounts/vouchers/pccVoucherRoutes');
const expenseVoucherRoutes = require('../routes/accounts/vouchers/expenseVoucherRoutes');
const openingBalanceRoutes = require('../routes/accounts/openingBalanceRoutes');

//crm
const leadRoutes = require('./crm/leadRoutes');
const contactRoutes = require('./crm/contactRoutes');
const accountsRoutes = require('./crm/accountsRoutes');
const agentRoutes = require('./crm/agentRoutes');
const crmCustomerRoutes = require('./crm/customerRoutes');
const crmProjectRoutes = require('./crm/crmProjectRoutes');
const interestRoutes = require('./crm/interestRoutes');
const itemsRoutes = require('./crm/itemsRoutes');
const productsRoutes = require('./crm/crmproductsRoutes');
const propertiesRoutes = require('./crm/propertiesRoutes');
const crmQuoteRoutes = require('./crm/crmQuoteRoutes');
const crmServiceRoutes = require('./crm/crmServiceRoutes');
const crmTaskRoutes = require('./crm/crmTaskRoutes');
const dealRoutes = require('./crm/dealRoutes');
const developerRoutes = require('./crm/developerRoutes');

//hrm
const employeeRoutes = require('./hrm/employeeRoutes');
const payrollRoutes = require('./hrm/payrollRoute');
const employeeDepartmentRoutes = require('./hrm/employeeDepartmentRoutes');
const employeeGroupRoutes = require('./hrm/employeeGroupRoutes');
const campRoutes = require('./hrm/campRoutes');
const webAttendanceRoutes = require('./hrm/webAttendanceRoutes');
const leaveRoutes = require('./hrm/leaveRoutes');
const leaveTypeRoutes = require('./hrm/leaveTypeRoutes');
const employeeReportRoutes = require('./hrm/employeeReportRoutes');
const employeeReportSubmissionRoutes = require('./hrm/employeeReportSubmissionRoutes');
const groupPayrollRoutes = require('./hrm/groupPayrollRoutes');
const payrollVoucherRoutes = require('./hrm/payrollVoucherRoutes');

//recruit
const recruitmentFormRoutes = require('./recruit/recruitmentFormRoutes');
const recruitmentResponseRoutes = require('./recruit/recruitmentResponseRoutes');
const recruitOfferRoutes = require('./recruit/recruitOffer');
const recruitDashboardRoutes = require('./recruit/recuritDashboarRoutes');

//docs
const docsFolderRoutes = require('./docsFile/docsFolderRoutes');
const docsFileRoutes = require('./docsFile/docsFileRoutes');
const docsTemplateRoutes = require('./docsFile/docsTemplateRoutes');

//sheets
const sheetFolderRoutes = require('./sheets/sheetFolderRoutes');
const sheetFilesRoutes = require('./sheets/sheetFilesRoutes');

//tools
const taskRoutes = require('./task/taskRoutes');
const taskGroupRoutes = require('./task/taskGroupRoutes');
const storageRoutes = require('./task/storageRoute');

// Approvals
const approvalManagementRoutes = require('./approvals/approvalManagementRoutes');

// Fleets
const fleetRoutes = require('./fleets/fleetRoutes');
const fleetCategoryRoutes = require('./fleets/fleetCategoryRoutes');

//inventory
const inventorycategoryRoutes = require('./inventory/categoryRoutes');
const inventoryRoutes = require('./inventory/productRoutes');
const inventoryAdjustmentRoutes = require('./inventory/inventoryAdjustmentRoutes');

const { authenticate } = require('../middleware');
const router = express.Router();

/**
 * Mount authentication routes
 * All auth routes will be prefixed with /api/auth
 */
router.use('/auth', authRoutes);

/**
 * Mount user management routes
 * All user routes will be prefixed with /api/users
 */
router.use('/users', authenticate, userRoutes);
router.use('/companies', companyRoutes);

router.use('/files', awsConfig);

router.use('/user-management/modules', modulesRoutes);
router.use('/user-management/roles', authenticate, rolesRoutes);
router.use('/user-management/department', authenticate, departmentRoutes);
router.use('/user-management/organization', authenticate, organizationRoutes);
router.use(
  '/user-management/features-modules',
  authenticate,
  featureModulesRoutes
);
router.use(
  '/api/user-management/approval',
  authenticate,
  approvalManagementRoutes
);

// Master
router.use('/customization', authenticate, customizationRoutes);
router.use('/lastInsertedId', authenticate, lastInsertedIdRoutes);
router.use('/master/currency', authenticate, currencyRoutes);
router.use('/master/container-type', authenticate, containerTypeRoutes);
router.use('/master/division', authenticate, divisionRoutes);
router.use('/master/region', authenticate, regionRoutes);
router.use('/master/zone', authenticate, zoneRoutes);
router.use('/master/pack', authenticate, packRoutes);
router.use('/master/activity', authenticate, activityRoutes);
router.use('/master/category', authenticate, categoryRoutes);
router.use('/master/country', authenticate, countryRoutes);
router.use(
  '/master/container-inventory',
  authenticate,
  containerInventoryRoutes
);
router.use('/master/commodity', authenticate, commodityRoutes);
router.use('/master/clause', authenticate, clauseRoutes);
router.use('/master/vessel', authenticate, vesselRoutes);
router.use('/master/port', authenticate, portRoutes);
router.use('/master/airport', authenticate, airPortRoutes);
router.use('/master/landport', authenticate, landPortRoutes);
router.use('/master/seaPort', authenticate, seaPortRoutes);
router.use('/master/bank-branch', authenticate, bankBranchRoutes);
router.use('/master/district', authenticate, districtRoutes);
router.use('/master/cities', authenticate, cityRoutes);
router.use('/master/area', authenticate, areaRoutes);
router.use('/master/nationality', authenticate, nationalityRoutes);
router.use('/master/address', authenticate, addressRoutes);

// Sales
router.use('/sales/customer', authenticate, customerRoutes);
router.use('/sales/enquiry', authenticate, enquiryRoutes);
router.use('/sales/quote', authenticate, quoteRoutes);
router.use('/sales/booking', authenticate, bookingRoutes);
router.use('/sales/invoice', authenticate, invoiceRoutes);

// Procurement
router.use('/procurement/vendor', authenticate, vendorRoutes);
router.use('/procurement/rfq', authenticate, rfqRoutes);
router.use('/procurement/rfp', authenticate, rfpRoutes);
router.use('/procurement/purchase-order', authenticate, purchaseOrderRoutes);
router.use(
  '/procurement/purchase-receive',
  authenticate,
  purchaseReceiveRoutes
);
router.use('/procurement/bills', authenticate, billsRoutes);
router.use(
  '/procurement/vendorperformance',
  authenticate,
  vendorPerformanceRoutes
);
router.use('/procurement/payment-made', authenticate, paymentMadeRoutes);
router.use(
  '/procurement/purchaseInspectionForm',
  authenticate,
  purchaseInspectionFormRoutes
);
router.use(
  '/procurement/purchaseInspectionReport',
  authenticate,
  purchaseInspectionReportRoutes
);

// Operations
router.use('/operations/service-category', authenticate, serviceCategoryRoutes);
router.use('/operations/service', authenticate, serviceRoutes);
router.use('/operations/jobs', authenticate, jobsRoutes);
router.use('/operations/shipment', authenticate, shipmentRoutes);
router.use('/operations/dimensions', authenticate, shipmentDimensionRoutes);
router.use('/operations/routing', authenticate, shipmentRoutingRoutes);

// Accounts
router.use('/accounts', authenticate, accountRoutes);
router.use('/parentaccount', authenticate, parentAccountRoutes);
router.use('/transactions', authenticate, transactionRoutes);
router.use('/accounts/costcenter', authenticate, costCenterRoutes);
router.use('/accounts/costmaster', authenticate, costMasterRoutes);
router.use('/accounts/expenses', authenticate, expenseRoutes);
router.use('/accounts/recurringexpense', authenticate, recurringExpenseRoutes);
router.use('/accounts/journals', authenticate, journalRoutes);
router.use('/accounts/pcr', authenticate, pcrRoutes);
router.use('/accounts/pcc', authenticate, pccRoutes);
router.use('/accounts/reports', authenticate, reportsRoutes);
router.use('/accounts/reports/balance-sheet', authenticate, balancesheetRoutes);
router.use('/accounts/reports/profitnloss', authenticate, profitnlossRoutes);
router.use(
  '/accounts/reports/cashflowstatement',
  authenticate,
  cashflowstatementRoutes
);
router.use('/accounts/reports/trial-balance', authenticate, trialbalanceRoutes);
router.use('/accounts/reports/analytics', authenticate, analyticsRoutes);
router.use('/accounts/pcrvoucher', authenticate, pcrVoucherRoutes);
router.use('/accounts/pccvoucher', authenticate, pccVoucherRoutes);
router.use('/accounts/expensevoucher', authenticate, expenseVoucherRoutes);
router.use('/accounts/openingbalance', authenticate, openingBalanceRoutes);

//hrm
router.use('/hrm/employees', authenticate, employeeRoutes);
router.use('/hrm/payroll', authenticate, payrollRoutes);
router.use('/hrm/employeeDepartment', authenticate, employeeDepartmentRoutes);
router.use('/hrm/employeeGroup', authenticate, employeeGroupRoutes);
router.use('/hrm/camps', authenticate, campRoutes);
router.use('/hrm/webAttendance', authenticate, webAttendanceRoutes);
router.use('/hrm/leaveManagement', authenticate, leaveRoutes);
router.use('/hrm/leaveType', authenticate, leaveTypeRoutes);
router.use('/hrm/employeeReport', authenticate, employeeReportRoutes);
router.use(
  '/hrm/employeeReportSubmission',
  authenticate,
  employeeReportSubmissionRoutes
);
router.use('/hrm/grouppayroll', authenticate, groupPayrollRoutes);
router.use('/hrm/payrollVoucher', authenticate, payrollVoucherRoutes);

//crm
router.use('/crm/leads', leadRoutes);
router.use('/crm/contacts', authenticate, contactRoutes);
router.use('/crm/accounts', authenticate, accountsRoutes);
router.use('/crm/agents', authenticate, agentRoutes);
router.use('/crm/customers', authenticate, crmCustomerRoutes);
router.use('/crm/projects', authenticate, crmProjectRoutes);
router.use('/crm/interests', authenticate, interestRoutes);
router.use('/crm/items', authenticate, itemsRoutes);
router.use('/crm/products', authenticate, productsRoutes);
router.use('/crm/properties', authenticate, propertiesRoutes);
router.use('/crm/quotes', authenticate, crmQuoteRoutes);
router.use('/crm/services', authenticate, crmServiceRoutes);
router.use('/crm/tasks', authenticate, crmTaskRoutes);
router.use('/crm/deals', authenticate, dealRoutes);
router.use('/crm/developers', authenticate, developerRoutes);

//recruit
router.use('/recruit/recruitmentform', recruitmentFormRoutes);
router.use('/recruit/recruitmentresponse', recruitmentResponseRoutes);
router.use('/recruit/recruitmentOffer', authenticate, recruitOfferRoutes);
router.use('/recruit/dashboard', authenticate, recruitDashboardRoutes);

//docs
router.use('/docsFolder', authenticate, docsFolderRoutes);
router.use('/docs', authenticate, docsFileRoutes);
router.use('/docsTemplate', authenticate, docsTemplateRoutes);

//sheets
router.use('/sheetFolder', authenticate, sheetFolderRoutes);
router.use('/sheetFiles', authenticate, sheetFilesRoutes);
router.use('/task', authenticate, taskRoutes);
router.use('/taskgroup', authenticate, taskGroupRoutes);
router.use('/storage', storageRoutes);

// Fleets
router.use('/fleets', fleetRoutes);
router.use('/fleets/category', authenticate, fleetCategoryRoutes);

//inventory
router.use('/inventory/category', authenticate, inventorycategoryRoutes);
router.use('/products', authenticate, inventoryRoutes);
router.use('/inventory-adjustment', authenticate, inventoryAdjustmentRoutes);

//
// Health check endpoint is handled directly in server.js for comprehensive status reporting

/**
 * API root endpoint
 * GET /api
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Express.js Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      files: '/api/files',
      users: '/api/users',
      companies: '/api/companies',
      userManagement: '/api/user-management',
      customization: 'api/customization',
      master: 'api/master',
      sales: 'api/sales',
      procurement: 'api/procurement',
      operations: 'api/operations',
      accounts: 'api/accounts',
      parentaccount: 'api/parentaccount',
      transactions: 'api/transactions',
      health: '/api/health',
    },
  });
});

module.exports = router;
