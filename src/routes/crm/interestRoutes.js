const {
  createInterest,
  getInterestByLead,
  getInterestByContact,
  deleteInterestByLead,
  deleteInterestByContact,
} = require('../../controllers/crm/interestController');

const router = require('express').Router();

router.get('/:orgid', getInterestByLead);

router.get('/leads/:id', getInterestByLead);

router.get('/contacts/:id', getInterestByContact);

router.post('/create', createInterest);

router.delete('/leads/:documentId/:interestId', deleteInterestByLead);

router.delete('/contacts/:documentId/:interestId', deleteInterestByContact);

module.exports = router;
