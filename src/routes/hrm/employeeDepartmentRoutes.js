const {
  createDepartment,
  addrole,
  updateDepartment,
  deleteDepartment,
  getEmployeeDepartments,
  getEmployeeDepartmentsWithRole,
  getEmployeeByDepartmentId,
  getEmployeeByDepartmentandRoleId,
  getByDepartmentId,
  getEmployeedeptbyid,
  totaldeptnroles,
} = require('../../controllers/hrm/employeeDepartmentController');

const router = require('express').Router();

router.post('/create', createDepartment);
router.put('/update/:id', updateDepartment);
router.put('/addrole/:id', addrole);
router.get('/all/:orgid', getEmployeeDepartments);
router.get('/allwithrole/:orgid', getEmployeeDepartmentsWithRole);
router.get('/employees/:id', getEmployeeByDepartmentId);
router.get(
  '/employeebyidandrole/:departmentId/:role',
  getEmployeeByDepartmentandRoleId
);
router.get('/employeedeptbyid/:id', getEmployeedeptbyid);
router.get('/totaldeptnroles/:orgid', totaldeptnroles);
router.get('/:id', getByDepartmentId);
router.put('/deactivate/:id', deleteDepartment);
module.exports = router;
