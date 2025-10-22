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

// Master
const customizationRoutes = require('./master/customizationRoutes');
const currencyRoutes = require('./master/currencyRoutes');
const containerTypeRoutes = require('./master/containerTypeRoute');
const divisionRoutes = require('./master/divisionRoutes');
const regionRoutes = require('./master/regionRoutes');
const zoneRoutes = require('./master/zoneRoutes');
const packRoutes = require('./master/packRoutes');
const activityRoutes = require('./master/activityRoutes');
const categoryRoutes = require('./master/categoryRoutes');
const countryRoutes = require('./master/countryRoutes');
const containerInventoryRoutes = require('./master/containerInventoryRoutes');
const commodityRoutes = require('./master/commodityRoutes');
const clauseRoutes = require('./master/clauseRoutes');

// Sales
const customerRoutes = require('./sales/customerRoutes');
const enquiryRoutes = require('./sales/enquiryRoutes');

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

// Master
router.use('/customization', authenticate, customizationRoutes);
router.use('/master/currency', authenticate, currencyRoutes);
router.use('/master/container-type', authenticate, containerTypeRoutes);
router.use('/master/division', authenticate, divisionRoutes);
router.use('/master/region', authenticate, regionRoutes);
router.use('/master/zone', authenticate, zoneRoutes);
router.use('/master/pack', authenticate, packRoutes);
router.use('/master/activity', authenticate, activityRoutes);
router.use('/master/category', authenticate, categoryRoutes);
router.use('/master/country', authenticate, countryRoutes);
router.use(
  '/master/container-inventory',
  authenticate,
  containerInventoryRoutes
);
router.use('/master/commodity', authenticate, commodityRoutes);
router.use('/master/clause', authenticate, clauseRoutes);

// Sales
router.use('/sales/customer', authenticate, customerRoutes);
router.use('/sales/enquiry', authenticate, enquiryRoutes);

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
      customization: 'api/customization',
      master: 'api/master',
      health: '/api/health',
    },
  });
});

module.exports = router;
