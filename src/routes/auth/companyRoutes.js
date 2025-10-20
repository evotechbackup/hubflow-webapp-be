/**
 * Company Management Routes
 * Defines routes for company management endpoints
 */

const express = require('express');
const { authenticate, authorize } = require('../../middleware/auth');
const {
  signupCompany,
  updateCompany,
  getCompany,
  getAllCompanies,
  addUnit,
  updateUnit,
  getUnits,
  removeUnit,
} = require('../../controllers/auth/companyController');

const router = express.Router();

/**
 * @route   POST /api/companies/signup-company
 * @desc    Register a new company with superadmin
 * @access  Public
 */
router.post('/signup-company', signupCompany);

/**
 * @route   PUT /api/companies/:id
 * @desc    Update company details
 * @access  Private (superadmin only)
 */
router.put('/:id', authenticate, updateCompany);

/**
 * @route   GET /api/companies/:id
 * @desc    Get company by ID
 * @access  Private (authenticated users)
 */
router.get('/:id', authenticate, getCompany);

/**
 * @route   GET /api/companies/master/all
 * @desc    Get all companies
 * @access  Private (admin/superadmin only)
 */
router.get(
  '/master/all',
  authenticate,
  authorize(['admin', 'superadmin']),
  getAllCompanies
);

/**
 * @route   PUT /api/companies/unit/add/:companyid
 * @desc    Add unit to company
 * @access  Private (superadmin only)
 */
router.put('/unit/add/:companyid', authenticate, addUnit);

/**
 * @route   PUT /api/companies/unit/update/:companyid
 * @desc    Update unit in company
 * @access  Private (superadmin only)
 */
router.put('/unit/update/:companyid', authenticate, updateUnit);

/**
 * @route   GET /api/companies/units/:companyid
 * @desc    Get company units
 * @access  Private (authenticated users)
 */
router.get('/units/:companyid', authenticate, getUnits);

/**
 * @route   PUT /api/companies/unit/remove/:companyid
 * @desc    Remove unit from company
 * @access  Private (superadmin only)
 */
router.put('/unit/remove/:companyid', authenticate, removeUnit);

module.exports = router;
