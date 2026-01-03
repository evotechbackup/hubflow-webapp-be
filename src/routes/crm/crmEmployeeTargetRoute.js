const {
  createCRMEmployeeTarget,
  getAllCRMEmployeeTarget,
  getEmployeeTargetDetail,
  updateEmployeeTarget,
  deleteEmployeeTarget,
  employeeEmployeeTarget,
} = require('../../controllers/crm/crmEmployeeTargetController');
const { authenticate } = require('../../middleware');

const router = require('express').Router();

router.get('/:orgid', getAllCRMEmployeeTarget);

router.get('/detail/:id', authenticate, getEmployeeTargetDetail);

router.get('/employee/:employeeId', authenticate, employeeEmployeeTarget);

router.post('/create', authenticate, createCRMEmployeeTarget);

router.put('/update/:id', authenticate, updateEmployeeTarget);

router.delete('/delete/:id', authenticate, deleteEmployeeTarget);

module.exports = router;
