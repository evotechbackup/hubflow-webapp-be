const {
  createProperties,
  addAgentToProperty,
  updateProperty,
  getAllProperties,
  getPropertiesByAgent,
  getPropertyById,
  getPropertiesByDeveloper,
  getAgentByPropertyId,
  deleteProperty,
} = require('../../controllers/crm/propertiesController');

const router = require('express').Router();

router.get('/:orgid', getAllProperties);

router.get('/agent/:agentId', getAgentByPropertyId);
router.get('/propertybyid/:propertyId', getPropertyById);
router.get('/getbydeveloperid/:developerId', getPropertiesByDeveloper);
router.get('/getagentbypropertyid/:propertyId', getPropertiesByAgent);

router.post('/create', createProperties);

router.put('/agentadd', addAgentToProperty);

router.put('/:propertyId', updateProperty);

router.delete('/:propertyId', deleteProperty);

module.exports = router;
