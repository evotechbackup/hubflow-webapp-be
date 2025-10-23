const dotenv = require('dotenv');
const path = require('path');

/**
 * Load environment variables from .env file
 * This should be called as early as possible in the application
 */
function loadEnvironmentConfig() {
  // Determine the environment
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Load .env file from project root
  const envPath = path.resolve(process.cwd(), '.env');
  const result = dotenv.config({ path: envPath });

  // Log environment loading status
  if (result.error) {
    console.warn('Warning: .env file not found or could not be loaded');
    console.warn(
      'Make sure to copy .env.example to .env and configure your environment variables'
    );
  } else {
    console.log(
      `Environment variables loaded successfully for ${nodeEnv} environment`
    );
  }

  // Validate critical environment variables
  validateCriticalEnvVars();
}

/**
 * Validate that critical environment variables are present
 * @throws {Error} If critical environment variables are missing
 */
function validateCriticalEnvVars() {
  const criticalVars = ['MONGODB_URI', 'JWT_SECRET', 'COOKIE_SECRET'];

  const missingVars = criticalVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing critical environment variables: ${missingVars.join(', ')}\n` +
        'Please copy .env.example to .env and configure the required variables'
    );
  }
}

/**
 * Get application configuration
 * @returns {object} Application configuration object
 */
function getAppConfig() {
  return {
    // Server configuration
    server: {
      port: parseInt(process.env.PORT) || 3000,
      nodeEnv: process.env.NODE_ENV || 'development',
      isProduction: process.env.NODE_ENV === 'production',
      isDevelopment: process.env.NODE_ENV === 'development',
    },

    // Database configuration
    database: {
      uri: process.env.MONGODB_URI,
    },

    // JWT configuration
    jwt: {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    },

    // Cookie configuration
    cookie: {
      secret: process.env.COOKIE_SECRET,
    },

    // CORS configuration
    cors: {
      allowedOrigins: '*',
      // allowedOrigins: process.env.ALLOWED_ORIGINS
      //   ? process.env.ALLOWED_ORIGINS.split(',').map((origin) => origin.trim())
      //   : ['http://localhost:3000'],
    },
  };
}

/**
 * Initialize configuration
 * This function should be called at application startup
 */
function initializeConfig() {
  try {
    loadEnvironmentConfig();
    const config = getAppConfig();

    console.log('Configuration initialized successfully');
    console.log(`Server will run on port: ${config.server.port}`);
    console.log(`Environment: ${config.server.nodeEnv}`);

    return config;
  } catch (error) {
    console.error('Configuration initialization failed:', error.message);
    process.exit(1);
    return null; // This will never be reached, but satisfies the linter
  }
}

module.exports = {
  loadEnvironmentConfig,
  validateCriticalEnvVars,
  getAppConfig,
  initializeConfig,
};
