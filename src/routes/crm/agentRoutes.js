const {
  createAgent,
  getAgents,
} = require('../../controllers/crm/agentController');

const router = require('express').Router();

router.get('/:orgid', getAgents);

router.post('/create', createAgent);

module.exports = router;
