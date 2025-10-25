const {
  getVendors,
  searchVendor,
  getVendorByUser,
  exportVendor,
  getVendorsForSelect,
  getVendorsForSelectByUser,
  createVendor,
  getVendorById,
  userAssign,
  updateVendor,
  deactivateVendor,
  getVendorId,
  getAllVendor,
} = require('../../controllers/procurement/vendorController');
const router = require('express').Router();

router.post('/', createVendor);
router.get('/:orgid', getVendors);
// Search route for Navbar
router.get('/search/:orgid', searchVendor);
router.get('/getvendorbyagent/:agentid', getVendorByUser);
router.get('/get/export/:orgid', exportVendor);
router.get('/get/vendorforselect/:orgid', getVendorsForSelect);
router.get('/get/vendorforselect/agent/:agentid', getVendorsForSelectByUser);
router.get('/getvendorbyid/:id', getVendorById);
router.put('/userassign', userAssign);
router.put('/:id', updateVendor);
router.put('/deactivate/:id', deactivateVendor);
router.get('/get-vendor-id/:orgid', getVendorId);
router.get('/getAllvendor/:orgid', getAllVendor);

module.exports = router;
