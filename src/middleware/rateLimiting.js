const rateLimit = require('express-rate-limit');

/**
 * Rate limiting middleware configurations for different route groups
 */

/**
 * General API rate limiter - applies to all /api routes
 */
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: {
      message: 'Too many requests from this IP, please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});

/**
 * Strict rate limiter for authentication routes
 * More restrictive to prevent brute force attacks
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 5 authentication attempts per windowMs
  message: {
    success: false,
    error: {
      message:
        'Too many authentication attempts from this IP, please try again later.',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message:
          'Too many authentication attempts from this IP, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});

/**
 * Moderate rate limiter for user management routes
 * Less restrictive than auth but more than general API
 */
const userManagementLimiter = rateLimit({
  windowMs: 0.5 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 30 requests per windowMs
  message: {
    success: false,
    error: {
      message:
        'Too many user management requests from this IP, please try again later.',
      code: 'USER_MGMT_RATE_LIMIT_EXCEEDED',
      retryAfter: '15 minutes',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message:
          'Too many user management requests from this IP, please try again later.',
        code: 'USER_MGMT_RATE_LIMIT_EXCEEDED',
        retryAfter: '15 minutes',
      },
    });
  },
});

/**
 * Very permissive rate limiter for health check and public routes
 */
const publicLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 60 requests per minute
  message: {
    success: false,
    error: {
      message: 'Too many requests to public endpoints, please try again later.',
      code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
      retryAfter: '1 minute',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        message:
          'Too many requests to public endpoints, please try again later.',
        code: 'PUBLIC_RATE_LIMIT_EXCEEDED',
        retryAfter: '1 minute',
      },
    });
  },
});

module.exports = {
  generalApiLimiter,
  authLimiter,
  userManagementLimiter,
  publicLimiter,
};
