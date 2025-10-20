/**
 * Routes Index
 * Central route configuration and mounting
 */

const express = require('express');
const authRoutes = require('./auth/authRoutes');
const userRoutes = require('./auth/userRoutes');
const companyRoutes = require('./auth/companyRoutes');

const modulesRoutes = require('./user-management/modulesRoutes');
const rolesRoutes = require('./user-management/rolesRoutes');
const departmentRoutes = require('./user-management/departmentRoutes');
const organizationRoutes = require('./user-management/organizationRoutes');
const featureModulesRoutes = require('./user-management/featureModulesRoutes');

const { authenticate } = require('../middleware');

const router = express.Router();

/**
 * Mount authentication routes
 * All auth routes will be prefixed with /api/auth
 */
router.use('/auth', authRoutes);

/**
 * Mount user management routes
 * All user routes will be prefixed with /api/users
 */
router.use('/users', authenticate, userRoutes);
router.use('/companies', companyRoutes);

router.use('/user-management/modules', modulesRoutes);
router.use('/user-management/roles', authenticate, rolesRoutes);
router.use('/user-management/department', authenticate, departmentRoutes);
router.use('/user-management/organization', authenticate, organizationRoutes);
router.use(
  '/user-management/features-modules',
  authenticate,
  featureModulesRoutes
);

// Health check endpoint is handled directly in server.js for comprehensive status reporting

/**
 * API root endpoint
 * GET /api
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Express.js Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      companies: '/api/companies',
      userManagement: '/api/user-management',
      health: '/api/health',
    },
  });
});

module.exports = router;
