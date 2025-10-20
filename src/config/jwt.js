/**
 * JWT configuration and utility functions
 */
class JWTConfig {
  constructor() {
    this.secret = null;
    this.expiresIn = null;
    this.cookieSecret = null;
    this.initialize();
  }

  /**
   * Initialize JWT configuration from environment variables
   */
  initialize() {
    this.secret = process.env.JWT_SECRET;
    this.expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.cookieSecret = process.env.COOKIE_SECRET;

    // Don't validate during initialization to allow server startup for health checks
    // Validation will happen when JWT methods are actually called
  }

  /**
   * Validate JWT configuration
   * @throws {Error} If required configuration is missing
   */
  validateConfig() {
    if (!this.secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    if (!this.cookieSecret) {
      throw new Error('COOKIE_SECRET environment variable is required');
    }

    // Validate JWT secret strength in production
    if (process.env.NODE_ENV === 'production') {
      if (this.secret.length < 32) {
        throw new Error(
          'JWT_SECRET must be at least 32 characters long in production'
        );
      }

      if (this.cookieSecret.length < 32) {
        throw new Error(
          'COOKIE_SECRET must be at least 32 characters long in production'
        );
      }
    }
  }

  /**
   * Get JWT secret for token signing
   * @returns {string} JWT secret
   */
  getSecret() {
    this.validateConfig();
    return this.secret;
  }

  /**
   * Get JWT expiration time
   * @returns {string} JWT expiration time
   */
  getExpiresIn() {
    return this.expiresIn;
  }

  /**
   * Get cookie secret for cookie signing
   * @returns {string} Cookie secret
   */
  getCookieSecret() {
    this.validateConfig();
    return this.cookieSecret;
  }

  /**
   * Get JWT signing options
   * @returns {object} JWT signing options
   */
  getSignOptions() {
    return {
      expiresIn: this.expiresIn,
      issuer: 'expressjs-backend',
      audience: 'expressjs-backend-users',
    };
  }

  /**
   * Get JWT verification options
   * @returns {object} JWT verification options
   */
  getVerifyOptions() {
    return {
      issuer: 'expressjs-backend',
      audience: 'expressjs-backend-users',
      clockTolerance: 60, // 60 seconds clock tolerance
    };
  }

  /**
   * Get cookie options for JWT storage
   * @returns {object} Cookie options
   */
  getCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true, // Prevent XSS attacks
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'strict' : 'lax', // CSRF protection
      maxAge: this.getExpirationInMilliseconds(),
      signed: true, // Sign cookies for integrity
    };
  }

  /**
   * Get cookie options for clearing JWT
   * @returns {object} Cookie clear options
   */
  getClearCookieOptions() {
    const isProduction = process.env.NODE_ENV === 'production';

    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      signed: true,
    };
  }

  /**
   * Convert expiration time to milliseconds
   * @returns {number} Expiration time in milliseconds
   */
  getExpirationInMilliseconds() {
    const timeString = this.expiresIn;

    // Parse time string (e.g., '24h', '7d', '30m')
    const timeValue = parseInt(timeString);
    const timeUnit = timeString.replace(timeValue.toString(), '');

    const multipliers = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return timeValue * (multipliers[timeUnit] || multipliers.h);
  }

  /**
   * Get token cookie name
   * @returns {string} Cookie name for JWT token
   */
  getTokenCookieName() {
    return 'auth_token';
  }

  /**
   * Check if JWT configuration is valid
   * @returns {boolean} Configuration validity
   */
  isConfigValid() {
    try {
      this.validateConfig();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get configuration summary for logging
   * @returns {object} Configuration summary (without secrets)
   */
  getConfigSummary() {
    return {
      expiresIn: this.expiresIn,
      hasSecret: !!this.secret,
      hasCookieSecret: !!this.cookieSecret,
      secretLength: this.secret ? this.secret.length : 0,
      cookieSecretLength: this.cookieSecret ? this.cookieSecret.length : 0,
      isProduction: process.env.NODE_ENV === 'production',
    };
  }
}

// Export singleton instance
const jwtConfig = new JWTConfig();
module.exports = jwtConfig;
