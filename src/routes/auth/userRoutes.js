/**
 * User Management Routes
 * Defines routes for user management endpoints
 */

const express = require('express');
const {
  createUser,
  getUserById,
  searchUsers,
  deactivateUser,
  activateUser,
  updateUser,
  updateUserHierarchy,
  getActiveUsersByDepartment,
  addUser,
  getAgentsByOrgId,
  getUserByEmail,
  getUserByUserId,
  getAgentsByOrgIdAndDepartment,
  getSuperAdminByCompany,
  getActives,
  deleteUser,
  updateEmailCredentials,
} = require('../../controllers/auth/userController');

const router = express.Router();

router.get('/details/:id', getUserById);

router.get('/agent/:agentId', getUserById);

router.get('/active/:orgid/:departmentid', getActiveUsersByDepartment);

router.get('/actives', getActives);

router.post('/', createUser);

router.get('/search/:orgid', searchUsers);

router.get('/searchuser/:companyid', searchUsers);

router.put('/deactivate/:id', deactivateUser);

router.put('/activate/:id', activateUser);

router.delete('/agents/:agentId', deleteUser);

router.put('/edit/:id', updateUser);

router.put('/edit/hierarchy/:id', updateUserHierarchy);

router.put('/email-credentials/:id', updateEmailCredentials);

router.get(
  '/active/department/:orgid/:departmentid',
  getActiveUsersByDepartment
);

router.post('/add-user/:companyid/:orgid/:departmentid', addUser);

router.get('/agentsbyorgid/:orgid', getAgentsByOrgId);

router.get('/user-email-exists/:email', getUserByEmail);

router.get('/user-userid-exists/:userid', getUserByUserId);

router.get('/master/:orgid/:departmentid', getAgentsByOrgIdAndDepartment);

router.get('/master/get/superadmin/:companyid', getSuperAdminByCompany);

module.exports = router;
