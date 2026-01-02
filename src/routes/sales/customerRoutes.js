const express = require('express');

const router = express.Router();

const {
  createCustomer,
  getCustomers,
  getCustomersWithoutPagination,
  getCustomerById,
  updateCustomer,
  deactivateCustomer,
  translateAddress,
  getCustomerName,
  userAssign,
  searchCustomers,
  getCustomersByAgent,
  getCustomersForExport,
  getCustomersForSelect,
  getCustomersForSelectByAgent,
  getCustomersWithPagination,
  getCustomersByAgentWithPagination,
} = require('../../controllers/sales/customerController');
const { authenticate } = require('../../middleware');

router.get('/:orgid', getCustomers);

// Search route for Navbar
router.get('/search/:orgid', searchCustomers);

router.get('/agent/:agentid', getCustomersByAgent);

router.get('/get/export/:orgid', getCustomersForExport);

router.get('/get/customerforselect/:orgid', getCustomersForSelect);

router.get(
  '/get/customerforselect/agent/:agentid',
  getCustomersForSelectByAgent
);

router.get('/getcustomer/:orgid', getCustomersWithPagination);

router.get('/getcustomer/agent/:agentid', getCustomersByAgentWithPagination);

router.get(
  '/getcustomerWithoutPagination/:orgid',
  getCustomersWithoutPagination
);

router.get('/getcustomerbyagent/:agentid', getCustomersByAgentWithPagination);

router.post('/', createCustomer);

// router.post('/create/leads', async (req, res) => {});

// router.post('/create/crmcontact', async (req, res) => {});

router.get('/getcustomerbyid/:id', authenticate, getCustomerById);

router.put('/userassign', userAssign);

router.put('/:id', updateCustomer);

router.put('/deactivate/:id', deactivateCustomer);

// router for fetching all mails of a customer
// router.get('/mails/:customerId', async (req, res) => {}

router.post('/translateaddress', translateAddress);

router.get('/getcustomerName/:orgid', getCustomerName);

module.exports = router;
