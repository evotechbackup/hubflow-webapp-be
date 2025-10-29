const {
  createEmployeeGroup,
  updateEmployeeGroup,
  getEmployeeGroups,
  getemployeegroupbyid,
  allemployeeswithgroup,
  allemployeeswithgroupanddivision,
  totalgroupsndivisions,
  adddivision,
  removedivision,
  updatedivisionnamecode,
  updatedivision,
  getdivisionbyid,
  getemployeesgroupbyid,
  allemployeesgroupbyId,
} = require('../../controllers/hrm/employeeGroupController');

const router = require('express').Router();

router.get('/all/:orgid', getEmployeeGroups);
router.get('/:id', getemployeegroupbyid);
router.get('/allemployeeswithgroup/:groupid', allemployeeswithgroup);
router.get(
  '/allemployeeswithgroupanddivision/:orgid',
  allemployeeswithgroupanddivision
);
router.get('/totalgroupsndivisions/:orgid', totalgroupsndivisions);
router.post('/create', createEmployeeGroup);
router.put('/adddivision/:id', adddivision);
router.put('/removedivision/:id', removedivision);
router.put('/updatedivisionnamecode/:id', updatedivisionnamecode);
router.put('/updatedivision/:id', updatedivision);
router.get('/getdivisionbyid/:id/:divisionid', getdivisionbyid);
router.get('/getemployeesgroupbyid/:id', getemployeesgroupbyid);
router.get('/allemployees/:groupid', allemployeesgroupbyId);
router.put('/update/:id', updateEmployeeGroup);

module.exports = router;
