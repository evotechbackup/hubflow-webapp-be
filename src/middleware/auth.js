/**
 * Authentication Middleware
 * Provides JWT token extraction, validation, and role-based authorization
 */

const { verifyToken, extractToken, JWTError } = require('../utils/jwt');
const User = require('../models/auth/User');
const { AuthenticationError, AuthorizationError } = require('../utils/errors');
const { asyncHandler } = require('./errorHandler');

/**
 * Authentication middleware to extract and validate JWT from cookies
 * Injects user context into request object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from cookies or headers
  const token = extractToken(req);

  if (!token) {
    throw new AuthenticationError(
      'Authentication required. No token provided.'
    );
  }

  // Verify the token
  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (error) {
    if (error instanceof JWTError) {
      throw new AuthenticationError(error.message);
    }
    throw new AuthenticationError('Token validation failed');
  }

  // Fetch user from database to ensure user still exists and is active
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new AuthenticationError('User not found. Token may be invalid.');
  }

  if (user.deactivated) {
    throw new AuthenticationError('User account is deactivated.');
  }

  // Inject user context into request
  req.user = user;
  req.token = token;
  req.tokenPayload = decoded;
  req.id = user._id.toString();
  req.role = user.role || 'user';
  req.company = decoded.company;
  req.organization = decoded.organization;
  req.name = decoded.name;
  req.hierarchy = decoded.hierarchy;
  req.tokenVersion = decoded.tokenVersion;

  next();
});

/**
 * Optional authentication middleware - doesn't fail if no token provided
 * Useful for endpoints that work for both authenticated and unauthenticated users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Extract token from cookies or headers
    const token = extractToken(req);

    if (!token) {
      // No token provided, continue without authentication
      req.user = null;
      req.token = null;
      req.tokenPayload = null;
      return next();
    }

    // If token exists, validate it
    try {
      const decoded = verifyToken(token);

      // Fetch user from database
      const user = await User.findById(decoded.id);

      if (user && !user.deactivated) {
        req.user = user;
        req.token = token;
        req.tokenPayload = decoded;
      } else {
        req.user = null;
        req.token = null;
        req.tokenPayload = null;
      }
    } catch {
      // Token is invalid, continue without authentication
      req.user = null;
      req.token = null;
      req.tokenPayload = null;
    }

    return next();
  } catch {
    // Handle unexpected errors - continue without authentication
    req.user = null;
    req.token = null;
    req.tokenPayload = null;
    return next();
  }
};

/**
 * Role-based authorization middleware
 * Requires authentication middleware to be run first
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 * @returns {Function} Express middleware function
 */
const authorize = (...allowedRoles) => {
  return asyncHandler((req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      throw new AuthenticationError(
        'Authentication required for this resource.'
      );
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      throw new AuthorizationError(
        `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${req.user.role}`
      );
    }

    next();
  });
};

/**
 * Admin-only authorization middleware
 * Shorthand for authorize('admin')
 */
const requireAdmin = authorize('admin');

/**
 * User or Admin authorization middleware
 * Allows both regular users and admins
 */
const requireUser = authorize('user', 'admin');

/**
 * Self or Admin authorization middleware
 * Allows users to access their own resources or admins to access any resource
 * Requires a userId parameter in the route
 * @param {string} paramName - Name of the parameter containing the user ID (default: 'id')
 * @returns {Function} Express middleware function
 */
const requireSelfOrAdmin = (paramName = 'id') => {
  return asyncHandler((req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      throw new AuthenticationError(
        'Authentication required for this resource.'
      );
    }

    const targetUserId = req.params[paramName];
    const currentUserId = req.user._id.toString();

    // Allow if user is admin or accessing their own resource
    if (req.user.role === 'admin' || currentUserId === targetUserId) {
      return next();
    }

    throw new AuthorizationError(
      'Access denied. You can only access your own resources.'
    );
  });
};

/**
 * Middleware to check if user is active
 * Should be used after authentication middleware
 */
const requireActiveUser = asyncHandler((req, res, next) => {
  if (!req.user) {
    throw new AuthenticationError('Authentication required.');
  }

  if (req.user.deactivated) {
    throw new AuthenticationError(
      'Account is deactivated. Please contact support.'
    );
  }

  next();
});

module.exports = {
  // Core middleware
  authenticate,
  optionalAuthenticate,
  authorize,

  // Convenience middleware
  requireAdmin,
  requireUser,
  requireSelfOrAdmin,
  requireActiveUser,
};
