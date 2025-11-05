const {
  createCrmProject,
  getallProjects,
  addProject,
} = require('../../controllers/crm/crmProjectController');

const router = require('express').Router();

router.get('/:orgid', getallProjects);

router.post('/create', createCrmProject);

router.put('/add-project/:orgid', addProject);

module.exports = router;
