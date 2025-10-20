/**
 * JWT Authentication Utilities
 * Provides token generation, verification, and refresh functionality
 */

const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

/**
 * Custom JWT Error Classes
 */
class JWTError extends Error {
  constructor(message, code, statusCode = 401) {
    super(message);
    this.name = 'JWTError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

class TokenExpiredError extends JWTError {
  constructor(message = 'Token has expired') {
    super(message, 'TOKEN_EXPIRED', 401);
    this.name = 'TokenExpiredError';
  }
}

class TokenInvalidError extends JWTError {
  constructor(message = 'Token is invalid') {
    super(message, 'TOKEN_INVALID', 401);
    this.name = 'TokenInvalidError';
  }
}

class TokenMalformedError extends JWTError {
  constructor(message = 'Token is malformed') {
    super(message, 'TOKEN_MALFORMED', 401);
    this.name = 'TokenMalformedError';
  }
}

/**
 * Generate JWT token with user payload
 * @param {Object} user - User object containing id, role
 * @param {Object} options - Additional options for token generation
 * @returns {Promise<string>} Generated JWT token
 */
const generateToken = (user, options = {}) => {
  try {
    // Validate user input
    if (!user || !user._id) {
      throw new Error('User object must contain _id');
    }

    // Create token payload
    const payload = {
      id: user._id.toString(),
      role: user.role || 'user',
      company: user.company,
      organization: user.organization,
      name: user.fullName,
      hierarchy: user.hierarchy,
      tokenVersion: (user.tokenVersion || 0) + 1,
      // Add timestamp for token tracking
      iat: Math.floor(Date.now() / 1000),
    };

    // Merge default options with custom options
    const tokenOptions = {
      ...jwtConfig.getSignOptions(),
      ...options,
    };

    // Generate token
    const token = jwt.sign(payload, jwtConfig.getSecret(), tokenOptions);

    return token;
  } catch (error) {
    throw new JWTError(
      `Token generation failed: ${error.message}`,
      'TOKEN_GENERATION_FAILED',
      500
    );
  }
};

/**
 * Verify and decode JWT token
 * @param {string} token - JWT token to verify
 * @param {Object} options - Additional verification options
 * @returns {Promise<Object>} Decoded token payload
 */
const verifyToken = (token, options = {}) => {
  try {
    // Validate token input
    if (!token || typeof token !== 'string') {
      throw new TokenInvalidError('Token must be a non-empty string');
    }

    // Merge default options with custom options
    const verifyOptions = {
      ...jwtConfig.getVerifyOptions(),
      ...options,
    };

    // Verify and decode token
    const decoded = jwt.verify(token, jwtConfig.getSecret(), verifyOptions);

    // Validate required payload fields
    if (!decoded.id || !decoded.role) {
      throw new TokenInvalidError('Token payload is missing required fields');
    }

    return decoded;
  } catch (error) {
    // Handle specific JWT errors
    if (error instanceof jwt.TokenExpiredError) {
      throw new TokenExpiredError('Token has expired');
    }

    if (error instanceof jwt.JsonWebTokenError) {
      throw new TokenInvalidError(
        `Token verification failed: ${error.message}`
      );
    }

    if (error instanceof jwt.NotBeforeError) {
      throw new TokenInvalidError('Token not active yet');
    }

    // Handle malformed tokens
    if (error.message && error.message.includes('malformed')) {
      throw new TokenMalformedError('Token format is invalid');
    }

    // Re-throw custom JWT errors
    if (error instanceof JWTError) {
      throw error;
    }

    // Handle unexpected errors
    throw new JWTError(
      `Token verification failed: ${error.message}`,
      'TOKEN_VERIFICATION_FAILED',
      500
    );
  }
};

/**
 * Decode JWT token without verification (for debugging/inspection)
 * @param {string} token - JWT token to decode
 * @returns {Object|null} Decoded token payload or null if invalid
 */
const decodeToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }

    return jwt.decode(token);
  } catch {
    return null;
  }
};

/**
 * Check if token is expired without full verification
 * @param {string} token - JWT token to check
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return true;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

/**
 * Refresh JWT token with new expiration
 * @param {string} token - Current JWT token
 * @param {Object} options - Refresh options
 * @returns {Promise<string>} New JWT token
 */
const refreshToken = async (token, options = {}) => {
  try {
    // Verify current token (allow expired tokens for refresh)
    let decoded;
    try {
      decoded = await verifyToken(token, { ignoreExpiration: true });
    } catch (error) {
      // If token is invalid (not just expired), reject refresh
      if (!(error instanceof TokenExpiredError)) {
        throw error;
      }
      // For expired tokens, decode without verification
      decoded = decodeToken(token);
      if (!decoded) {
        throw new TokenInvalidError('Cannot refresh invalid token');
      }
    }

    // Check if token is too old to refresh (optional security measure)
    const maxRefreshAge = options.maxRefreshAge || 7 * 24 * 60 * 60; // 7 days in seconds
    const tokenAge = Math.floor(Date.now() / 1000) - decoded.iat;

    if (tokenAge > maxRefreshAge) {
      throw new TokenExpiredError('Token is too old to refresh');
    }

    // Create user object for token generation
    const userForRefresh = {
      _id: decoded.userId,
      role: decoded.role,
    };

    // Generate new token
    const newToken = generateToken(userForRefresh, options);

    return newToken;
  } catch (error) {
    if (error instanceof JWTError) {
      throw error;
    }

    throw new JWTError(
      `Token refresh failed: ${error.message}`,
      'TOKEN_REFRESH_FAILED',
      401
    );
  }
};

/**
 * Extract token from various sources (for middleware use)
 * @param {Object} req - Express request object
 * @returns {string|null} Extracted token or null
 */
const extractToken = (req) => {
  try {
    // Try to get token from signed cookies first
    const cookieName = jwtConfig.getTokenCookieName();
    if (req.signedCookies && req.signedCookies[cookieName]) {
      return req.signedCookies[cookieName];
    }

    // Fallback to Authorization header (Bearer token)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Fallback to regular cookies
    if (req.cookies && req.cookies[cookieName]) {
      return req.cookies[cookieName];
    }

    return null;
  } catch {
    return null;
  }
};

/**
 * Get token expiration time in seconds from now
 * @param {string} token - JWT token
 * @returns {number|null} Seconds until expiration or null if invalid
 */
const getTokenExpirationTime = (token) => {
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) {
      return null;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    const expirationTime = decoded.exp - currentTime;

    return expirationTime > 0 ? expirationTime : 0;
  } catch {
    return null;
  }
};

/**
 * Validate token payload structure
 * @param {Object} payload - Token payload to validate
 * @returns {boolean} True if payload is valid
 */
const validateTokenPayload = (payload) => {
  if (!payload || typeof payload !== 'object') {
    return false;
  }

  // Check required fields
  const requiredFields = ['userId', 'iat', 'exp'];
  for (const field of requiredFields) {
    if (!payload[field]) {
      return false;
    }
  }

  // Validate field types
  if (
    typeof payload.userId !== 'string' ||
    typeof payload.iat !== 'number' ||
    typeof payload.exp !== 'number'
  ) {
    return false;
  }

  return true;
};

module.exports = {
  // Core functions
  generateToken,
  verifyToken,
  decodeToken,
  refreshToken,

  // Utility functions
  extractToken,
  isTokenExpired,
  getTokenExpirationTime,
  validateTokenPayload,

  // Error classes
  JWTError,
  TokenExpiredError,
  TokenInvalidError,
  TokenMalformedError,
};
