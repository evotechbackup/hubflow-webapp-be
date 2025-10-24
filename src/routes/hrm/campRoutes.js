const {
  createEmployeeCamp,
  updateEmployeeCamp,
  getEmployeeCamps,
  getEmployeeCampById,
  getEmployeeCampsCount,
  updateEmployeeCampEmployees,
  deleteEmployeeCamp,
} = require('../../controllers/hrm/campsController');

const router = require('express').Router();

router.get('/all/:orgid', getEmployeeCamps);

router.post('/create', createEmployeeCamp);

router.put('/update/:id', updateEmployeeCamp);

router.get('/:id', getEmployeeCampById);

router.get('/count/:orgid', getEmployeeCampsCount);

router.put('/updateEmployees/:id', updateEmployeeCampEmployees);

router.delete('/delete/:id', deleteEmployeeCamp);

module.exports = router;
