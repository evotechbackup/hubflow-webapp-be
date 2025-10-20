const router = require('express').Router();

const {
  createDepartment,
  getAllDepartments,
  getAllDepartmentsByFilter,
  getAllDepartmentsOfCompany,
  getDepartmentById,
  getDepartmentName,
  getNumberOfUsersInDepartment,
  getNumberOfUsersForEveryDepartment,
  editDepartment,
  deleteDepartment,
  deleteDepartmentById,
} = require('../../controllers/user-management/departmentController');

// Create a department
router.post('/', createDepartment);

// Get all departments
router.get('/', getAllDepartments);

// Get all departments by filter
router.get('/departmentByFilter', getAllDepartmentsByFilter);

// Get all departments of a company
router.get('/company/:id', getAllDepartmentsOfCompany);

// Get a department by id
router.get('/:id', getDepartmentById);

// Get department name
router.get('/deptname/:id', getDepartmentName);

// Get number of users in a department
router.get('/users/:id', getNumberOfUsersInDepartment);

// Get number of users for every department
router.get('/allusers/:id', getNumberOfUsersForEveryDepartment);

// Edit a department
router.put('/:id', editDepartment);

// delete a department
router.delete('/:companyId/:id', deleteDepartment);

router.delete('/:id', deleteDepartmentById);

module.exports = router;
