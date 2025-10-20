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

router.put('/set-attendance/:organizationid', editOrganizationAttendance);

router.put(
  '/inventory-feature/:organizationid',
  editOrganizationInventoryFeature
);

router.put('/fleets-feature/:organizationid', editOrganizationFleetsFeature);

router.put('/rental-types/:organizationid', editOrganizationRentalTypes);

router.put('/sales-feature/:organizationid', editOrganizationSalesFeature);

router.put('/crm-feature/:organizationid', editOrganizationCrmFeature);

router.put('/invoice-feature/:organizationid', editOrganizationInvoiceFeature);

router.put('/cost-center/:organizationid', editOrganizationCostCenter);

router.put(
  '/quotation-feature/:organizationid',
  editOrganizationQuotationFeature
);

router.put('/sales-template/:organizationid', editOrganizationSalesTemplate);

router.put(
  '/account-template/:organizationid',
  editOrganizationAccountTemplate
);

router.put(
  '/procurement-template/:organizationid',
  editOrganizationProcurementTemplate
);

router.put('/hrm-template/:organizationid', editOrganizationHrmTemplate);

router.put('/home-module/:organizationid', editOrganizationHomeModule);

router.put(
  '/home-module-reorder/:organizationid',
  editOrganizationHomeModuleReorder
);

router.put(
  '/email-configuration/:organizationid',
  editOrganizationEmailConfiguration
);

router.put('/delete/:id', deleteOrganization);

module.exports = router;
