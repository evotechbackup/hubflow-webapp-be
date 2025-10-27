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

// Sales
const customerRoutes = require('./sales/customerRoutes');
const enquiryRoutes = require('./sales/enquiryRoutes');
const quoteRoutes = require('./sales/quoteRoutes');
const bookingRoutes = require('./sales/bookingRoutes');

// Procurement
const vendorRoutes = require('./procurement/vendorRoutes');
const rfqRoutes = require('./procurement/rfqRoutes');
const rfpRoutes = require('./procurement/rfpRoutes');
const purchaseOrderRoutes = require('./procurement/purchaseOrderRoutes');
const purchaseReceiveRoutes = require('./procurement/purchaseReceiveRoutes');
const billsRoutes = require('./procurement/billsRoutes');
const vendorPerformanceRoutes = require('./procurement/vendorPerformanceRoutes');

// Operations
const serviceCategoryRoutes = require('./operations/serviceCategoryRoutes');
const serviceRoutes = require('./operations/serviceRoute');
const jobsRoutes = require('./operations/jobsRoutes');

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

//crm
const leadRoutes = require('./crm/leadRoutes');
const contactRoutes = require('./crm/contactRoutes');

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

// Approvals
const approvalManagementRoutes = require('./approvals/approvalManagementRoutes');

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

router.use('/api/files', awsConfig);

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

// Sales
router.use('/sales/customer', authenticate, customerRoutes);
router.use('/sales/enquiry', authenticate, enquiryRoutes);
router.use('/sales/quote', authenticate, quoteRoutes);
router.use('/sales/booking', authenticate, bookingRoutes);

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

// Operations
router.use('/operations/service-category', authenticate, serviceCategoryRoutes);
router.use('/operations/service', authenticate, serviceRoutes);
router.use('/operations/jobs', authenticate, jobsRoutes);

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

//crm
router.use('/crm/leads', authenticate, leadRoutes);
router.use('/crm/contacts', authenticate, contactRoutes);

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
