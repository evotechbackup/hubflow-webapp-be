const {
  createFleet,
  getfleetbyid,
  getFleetsBytype,
  updateFleet,
  deleteFleet,
  deleteDocuments,
  updateDocuments,
  getDocumentById,
} = require('../../controllers/fleets/fleetController');

const router = require('express').Router();

router.get('/getfleetbyid/:id', getfleetbyid);
router.get('/documents/getbyid/:id', getDocumentById);
router.get('/:orgid/:type', getFleetsBytype);

router.post('/create', createFleet);

router.put('/:id', updateFleet);
router.put('/documents/:id/:documentId', updateDocuments);

router.delete('/:id', deleteFleet);
router.delete('/documents/:id/:documentId', deleteDocuments);

module.exports = router;
