const {
  createEmployeeGroup,
  updateEmployeeGroup,
  getEmployeeGroups,
} = require('../../controllers/hrm/employeeGroupController');

const router = require('express').Router();

router.get('/all/:orgid', getEmployeeGroups);

router.post('/create', createEmployeeGroup);

router.put('/update/:id', updateEmployeeGroup);

module.exports = router;
