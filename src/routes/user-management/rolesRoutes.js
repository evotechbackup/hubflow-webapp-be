const router = require('express').Router();

const {
  createRole,
  getAllRolesOfDepartment,
  editRole,
  getMainModule,
  getPermissionsOfHierarchy1,
  getAllPermissionsOfRoleInDepartment,
  getRolesWithHierarchy,
} = require('../../controllers/user-management/rolesController');

// Get all roles of a department
router.get('/:departmentId', getAllRolesOfDepartment);

// Create a role
router.post('/:departmentId', createRole);

// Edit Role
router.put('/:id', editRole);

// Get main module
router.get('/main-module/:departmentId', getMainModule);

// Get permissions of hierarchy 1
router.get(
  '/getPermissionsOfHierarchy1/:companyid/:roleName',
  getPermissionsOfHierarchy1
);

// Get all permissions of a role in a department
router.get(
  '/all-permissions/:departmentId/:roleName',
  getAllPermissionsOfRoleInDepartment
);

// Get roles with hierarchy
router.get('/roles-with-hierarchy/:departmentId', getRolesWithHierarchy);

router.get('/main-module/:departmentId', getMainModule);

router.get(
  '/getPermissionsOfHierarchy1/:companyid/:roleName',
  getPermissionsOfHierarchy1
);

// Get all permissions of a role in a department
router.get('/:departmentId/:roleName', getAllPermissionsOfRoleInDepartment);

router.get(
  '/getroleswithhierarchy/:departmentId/:roleName',
  getRolesWithHierarchy
);
module.exports = router;
