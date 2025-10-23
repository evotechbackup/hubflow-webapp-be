const {
  getAllLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  getLeadsWithoutCustomers,
  updateFiles,
  getFiles,
  assignedTo,
  deleteFiles,
} = require('../../controllers/crm/leadController');

const router = require('express').Router();

router.get('/all/:orgid', getAllLeads);

router.get('/:id', getLead);

router.post('/create', createLead);

router.put('/update/:id', updateLead);

router.delete('/delete/:id', deleteLead);

router.get('/without-customers/:orgid', getLeadsWithoutCustomers);

router.delete('/deleteFiles/:id', deleteFiles);

router.post('/assignedTo/:id', assignedTo);

router.put('/updateFiles/:id', updateFiles);

router.get('/getFiles/:id', getFiles);

module.exports = router;
