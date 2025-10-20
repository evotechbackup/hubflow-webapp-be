/**
 * Middleware Index
 * Exports all middleware functions for easy importing
 */

const {
  authenticate,
  optionalAuthenticate,
  authorize,
  requireAdmin,
  requireUser,
  requireSelfOrAdmin,
  requireActiveUser,
} = require('./auth');

const {
  errorHandler,
  notFoundHandler,
  asyncHandler,
} = require('./errorHandler');

module.exports = {
  // Authentication middleware
  authenticate,
  optionalAuthenticate,
  authorize,

  // Convenience middleware
  requireAdmin,
  requireUser,
  requireSelfOrAdmin,
  requireActiveUser,

  // Error handling middleware
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
