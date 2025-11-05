const {
  convertCustomer,
  updateCustomer,
  deactivateCustomer,
  getCustomers,
  getcustomerbyid,
} = require('../../controllers/crm/customerController');

const router = require('express').Router();

router.get('/:orgid', getCustomers);
router.get('/getcustomerbyid/:id', getcustomerbyid);
router.put('/:id', updateCustomer);
router.put('/deactivate/:id', deactivateCustomer);
router.post('/convertcustomer', convertCustomer);

module.exports = router;
