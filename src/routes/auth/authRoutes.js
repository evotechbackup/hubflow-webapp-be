/**
 * Authentication Routes
 * Defines routes for user authentication endpoints
 */

const express = require('express');
const { authenticate } = require('../../middleware/auth');
const {
  register,
  login,
  logout,
  getCurrentUser,
} = require('../../controllers/auth/authController');

const router = express.Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 * @body    { username, email, password, role? }
 */
router.post('/register', register);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and set JWT cookie
 * @access  Public
 * @body    { identifier, password } - identifier can be email or username
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and clear JWT cookie
 * @access  Public (no authentication required to logout)
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user information
 * @access  Private (requires authentication)
 */
router.post('/verify_token', authenticate, getCurrentUser);

module.exports = router;
