const router = require('express').Router();

const {
  createOrganization,
  getAllOrganizations,
  getFeatureFlags,
  getAllOrganizationOfCompany,
  getOrganizationById,
  getOrgById,
  getDepartmentAndRoles,
  getOrgName,
  getNumberOfUsersInDepartment,
  editOrganization,
  editOrganizationOther,
  editOrganizationBilling,
  editOrganizationAttendance,
  editOrganizationInventoryFeature,
  editOrganizationFleetsFeature,
  editOrganizationRentalTypes,
  editOrganizationSalesFeature,
  editOrganizationCrmFeature,
  editOrganizationInvoiceFeature,
  editOrganizationCostCenter,
  editOrganizationQuotationFeature,
  editOrganizationSalesTemplate,
  editOrganizationAccountTemplate,
  editOrganizationProcurementTemplate,
  editOrganizationHrmTemplate,
  editOrganizationHomeModule,
  editOrganizationHomeModuleReorder,
  editOrganizationEmailConfiguration,
  deleteOrganization,
} = require('../../controllers/user-management/organizationController');

// Create an organization
router.post('/', createOrganization);

// Get all organizations
router.get('/', getAllOrganizations);

// Get feature flags
router.get('/feature-flags/:orgid', getFeatureFlags);

// Get all organization of a company
router.get('/company/:id', getAllOrganizationOfCompany);

// Get a organization by id
router.get('/:id', getOrganizationById);

router.get('/getorgbyid/:id', getOrgById);

router.get('/getdepartmentnroles/:id', getDepartmentAndRoles);

// Get department name
router.get('/orgname/:id', getOrgName);

// Get number of users in a department
router.get('/users/:id', getNumberOfUsersInDepartment);

// Edit a department
router.put('/:id', editOrganization);

router.put('/other/:id', editOrganizationOther);

router.put('/billing/:id', editOrganizationBilling);

router.put('/set-attendance/:id', editOrganizationAttendance);

router.put('/inventory-feature/:id', editOrganizationInventoryFeature);

router.put('/fleets-feature/:id', editOrganizationFleetsFeature);

router.put('/rental-types/:id', editOrganizationRentalTypes);

router.put('/sales-feature/:id', editOrganizationSalesFeature);

router.put('/crm-feature/:id', editOrganizationCrmFeature);

router.put('/invoice-feature/:id', editOrganizationInvoiceFeature);

router.put('/cost-center/:id', editOrganizationCostCenter);

router.put('/quotation-feature/:id', editOrganizationQuotationFeature);

router.put('/sales-template/:id', editOrganizationSalesTemplate);

router.put('/account-template/:id', editOrganizationAccountTemplate);

router.put('/procurement-template/:id', editOrganizationProcurementTemplate);

router.put('/hrm-template/:id', editOrganizationHrmTemplate);

router.put('/home-module/:id', editOrganizationHomeModule);

router.put('/home-module-reorder/:id', editOrganizationHomeModuleReorder);

router.put('/email-configuration/:id', editOrganizationEmailConfiguration);

router.put('/delete/:id', deleteOrganization);

module.exports = router;
