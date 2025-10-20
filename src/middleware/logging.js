const morgan = require('morgan');

/**
 * Request logging middleware configurations for different environments
 */

/**
 * Custom token for response time in milliseconds
 */
morgan.token('response-time-ms', (req, res) => {
  const responseTime = res.getHeader('X-Response-Time');
  return responseTime ? `${responseTime}ms` : '-';
});

/**
 * Custom token for request ID (if available)
 */
morgan.token('request-id', (req) => {
  return req.id || req.headers['x-request-id'] || '-';
});

/**
 * Custom token for user ID from JWT (if authenticated)
 */
morgan.token('user-id', (req) => {
  return req.user?.userId || 'anonymous';
});

/**
 * Development logging format
 * Colorful and detailed for local development
 */
const developmentFormat = morgan('dev');

/**
 * Production logging format
 * Structured format suitable for log aggregation systems
 */
const productionFormat = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  {
    // Skip logging for health check endpoints in production to reduce noise
    skip: (req) => {
      return req.url === '/api/health' && process.env.NODE_ENV === 'production';
    },
  }
);

/**
 * Detailed logging format for debugging
 * Includes request ID, user ID, and additional headers
 */
const detailedFormat = morgan(
  ':request-id :remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  {
    // Only use detailed logging when explicitly enabled
    skip: () => process.env.DETAILED_LOGGING !== 'true',
  }
);

/**
 * Error logging format
 * Only logs requests that result in 4xx or 5xx status codes
 */
const errorOnlyFormat = morgan(
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms',
  {
    skip: (req, res) => res.statusCode < 400,
  }
);

/**
 * Get appropriate logging middleware based on environment
 * @returns {Function} Morgan middleware function
 */
function getLoggingMiddleware() {
  const environment = process.env.NODE_ENV || 'development';

  switch (environment) {
    case 'production':
      return productionFormat;
    case 'test':
      // Minimal logging during tests
      return morgan('tiny', {
        skip: () => process.env.ENABLE_TEST_LOGGING !== 'true',
      });
    case 'development':
    default:
      return developmentFormat;
  }
}

/**
 * Get error-only logging middleware
 * Useful for production environments where you only want to log errors
 * @returns {Function} Morgan middleware function
 */
function getErrorLoggingMiddleware() {
  return errorOnlyFormat;
}

/**
 * Get detailed logging middleware
 * Useful for debugging specific issues
 * @returns {Function} Morgan middleware function
 */
function getDetailedLoggingMiddleware() {
  return detailedFormat;
}

/**
 * Custom logging middleware that adds request timing
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
function requestTimingMiddleware(req, res, next) {
  const startTime = Date.now();

  // Override res.end to calculate response time
  const originalEnd = res.end;
  res.end = function (...args) {
    const responseTime = Date.now() - startTime;
    res.setHeader('X-Response-Time', responseTime);
    originalEnd.apply(this, args);
  };

  next();
}

module.exports = {
  getLoggingMiddleware,
  getErrorLoggingMiddleware,
  getDetailedLoggingMiddleware,
  requestTimingMiddleware,
  developmentFormat,
  productionFormat,
  detailedFormat,
  errorOnlyFormat,
};
