const {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  deleteEmployee,
  getEmployee,
  deleteFiles,
  updateFiles,
  getFiles,
  getEmployeeForExport,
  getEmployeeByfilter,
  employeeBySearch,
  getEmployeeId,
  changeBulkEmployeeStatus,
  totalEmployee,
  employeeByemail,
} = require('../../controllers/hrm/employeeController');

const router = require('express').Router();

router.get('/all/:orgid', getAllEmployees);
router.get('/:id', getEmployee);
router.post('/create', createEmployee);
router.put('/update/:id', updateEmployee);
router.delete('/delete/:id', deleteEmployee);
router.get('/files/:id', getFiles);
router.post('/files/:id/:documentId', updateFiles);
router.delete('/files/:id/:documentId', deleteFiles);
router.get('/export/:orgid', getEmployeeForExport);
router.get('/filter/:orgid', getEmployeeByfilter);
router.get('/search', employeeBySearch);
router.get('/employee-id/:id', getEmployeeId);
router.put('/change-bulk-employee-status', changeBulkEmployeeStatus);
router.get('/total-employee/:orgid', totalEmployee);
router.get('/employeeByEmail/:email', employeeByemail);
module.exports = router;
