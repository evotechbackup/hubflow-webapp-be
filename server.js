require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const databaseConfig = require('./src/config/database');
const {
  getLoggingMiddleware,
  requestTimingMiddleware,
} = require('./src/middleware/logging');
const {
  generalApiLimiter,
  publicLimiter,
} = require('./src/middleware/rateLimiting');

/**
 * Express.js server with core middleware configuration
 */
class Server {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.isShuttingDown = false;
  }

  /**
   * Initialize and configure the Express application
   */
  async initialize() {
    try {
      // Connect to database first
      await this.connectDatabase();

      // Configure middleware
      this.configureMiddleware();

      // Setup routes (placeholder for now)
      this.setupRoutes();

      // Setup error handling
      this.setupErrorHandling();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      console.log('✅ Server initialized successfully');
    } catch (error) {
      console.error('❌ Server initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Connect to database
   */
  async connectDatabase() {
    try {
      console.log('🔌 Connecting to database...');
      await databaseConfig.connect();
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error.message);
      throw error;
    }
  }

  /**
   * Configure Express middleware stack
   */
  configureMiddleware() {
    console.log('⚙️  Configuring middleware...');

    // Security headers using Helmet.js
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        crossOriginEmbedderPolicy: false, // Disable for development
      })
    );

    // CORS configuration for cross-origin requests
    const corsOptions = {
      origin: this.getAllowedOrigins(),
      credentials: true, // Allow cookies to be sent
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['Set-Cookie'],
    };
    this.app.use(cors(corsOptions));

    // Body parser middleware for JSON and URL-encoded data
    this.app.use(
      express.json({
        limit: '10mb',
        strict: true,
      })
    );
    this.app.use(
      express.urlencoded({
        extended: true,
        limit: '10mb',
      })
    );

    // Cookie parser middleware for JWT cookie handling
    this.app.use(cookieParser(process.env.COOKIE_SECRET));

    // Request timing middleware (must be before logging)
    this.app.use(requestTimingMiddleware);

    // Request logging middleware with environment-specific configuration
    this.app.use(getLoggingMiddleware());

    // Rate limiting middleware for different route groups
    // Public routes (health check) - more permissive
    this.app.use('/api/health', publicLimiter);

    // General API routes - standard rate limiting
    this.app.use('/api/', generalApiLimiter);

    console.log('✅ Middleware configured successfully');
  }

  /**
   * Get allowed origins for CORS configuration
   * @returns {string[]|boolean} Array of allowed origins or true for all
   */
  getAllowedOrigins() {
    const allowedOrigins = process.env.ALLOWED_ORIGINS;

    if (!allowedOrigins) {
      // Default origins for development
      return [
        'http://localhost:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3000',
        'http://127.0.0.1:3001',
      ];
    }

    // Parse comma-separated origins from environment variable
    return allowedOrigins.split(',').map((origin) => origin.trim());
  }

  /**
   * Setup application routes
   */
  setupRoutes() {
    console.log('🛣️  Setting up routes...');

    // Import routes
    const apiRoutes = require('./src/routes');
    const { authLimiter } = require('./src/middleware/rateLimiting');

    // Mount API routes with authentication rate limiting for auth endpoints
    this.app.use('/api/auth', authLimiter);
    this.app.use('/api', apiRoutes);

    // Health check endpoint (already has publicLimiter applied)
    this.app.get('/api/health', (req, res) => {
      const dbStatus = databaseConfig.getConnectionStatus();
      const connectionInfo = databaseConfig.getConnectionInfo();

      res.status(200).json({
        success: true,
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        database: {
          connected: dbStatus,
          status: connectionInfo.readyStateText,
          host: connectionInfo.host,
          database: connectionInfo.database,
        },
        server: {
          port: this.port,
          uptime: process.uptime(),
        },
      });
    });

    // Note: 404 handling is now done in setupErrorHandling() with notFoundHandler

    console.log('✅ Routes configured successfully');
  }

  /**
   * Setup global error handling middleware
   */
  setupErrorHandling() {
    console.log('🛡️  Setting up error handling...');

    const { errorHandler, notFoundHandler } = require('./src/middleware');

    // Handle 404 errors for undefined routes (must be after all other routes)
    this.app.use(notFoundHandler);

    // Global error handling middleware (must be last)
    this.app.use(errorHandler);

    console.log('✅ Error handling configured successfully');
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    console.log('🛡️  Setting up graceful shutdown...');

    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT. Gracefully shutting down server...');
      this.gracefulShutdown('SIGINT');
    });

    // Handle SIGTERM (termination signal)
    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM. Gracefully shutting down server...');
      this.gracefulShutdown('SIGTERM');
    });

    console.log('✅ Graceful shutdown handlers configured');
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Shutdown signal
   */
  async gracefulShutdown(signal) {
    if (this.isShuttingDown) {
      console.log('⚠️  Shutdown already in progress...');
      return;
    }

    this.isShuttingDown = true;
    console.log(`🏁 Starting graceful shutdown for signal: ${signal}`);

    try {
      // Close HTTP server
      if (this.server) {
        console.log('🔌 Closing HTTP server...');
        await new Promise((resolve) => {
          this.server.close(resolve);
        });
        console.log('✅ HTTP server closed successfully');
      }

      // Close database connection
      if (databaseConfig.getConnectionStatus()) {
        console.log('🔌 Closing database connection...');
        await databaseConfig.disconnect();
        console.log('✅ Database connection closed successfully');
      }

      console.log('🏁 Graceful shutdown completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  }

  /**
   * Start the HTTP server
   */
  async start() {
    try {
      await this.initialize();

      this.server = this.app.listen(this.port, () => {
        console.log('🚀 Server started successfully');
        console.log(`📡 Server running on port ${this.port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log(
          `🔗 Health check: http://localhost:${this.port}/api/health`
        );
        console.log('✅ Server is ready to accept connections');
      });

      // Handle server errors
      this.server.on('error', (error) => {
        if (error.code === 'EADDRINUSE') {
          console.error(`❌ Port ${this.port} is already in use`);
        } else {
          console.error('❌ Server error:', error.message);
        }
        process.exit(1);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get Express application instance
   * @returns {Express} Express application
   */
  getApp() {
    return this.app;
  }

  /**
   * Get server instance
   * @returns {Server} HTTP server instance
   */
  getServer() {
    return this.server;
  }
}

// Create and start server if this file is run directly
if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error('💥 Fatal error starting server:', error);
    process.exit(1);
  });
}

// Export server class for testing
module.exports = Server;
