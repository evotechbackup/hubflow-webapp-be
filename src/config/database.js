const mongoose = require('mongoose');

/**
 * Database configuration and connection management
 */
class DatabaseConfig {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.maxRetries = 5;
    this.retryDelay = 5000; // 5 seconds
    this.currentRetries = 0;
  }

  /**
   * Get MongoDB connection URI from environment variables
   * @returns {string} MongoDB connection URI
   */
  getConnectionUri() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI environment variable is required');
    }
    return uri;
  }

  /**
   * Get Mongoose connection options
   * @returns {object} Mongoose connection options
   */
  getConnectionOptions() {
    return {
      // Connection options for better performance and reliability
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Keep trying to send operations for 5 seconds
      socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
      bufferCommands: false, // Disable mongoose buffering
    };
  }

  /**
   * Connect to MongoDB database with retry logic
   * @returns {Promise<void>}
   */
  async connect() {
    try {
      if (this.isConnected) {
        console.log('Database already connected');
        return;
      }

      await this.connectWithRetry();

      // Handle connection events
      this.setupConnectionEventHandlers();
    } catch (error) {
      console.error(
        'MongoDB connection failed after all retries:',
        error.message
      );
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Connect to MongoDB with retry logic
   * @returns {Promise<void>}
   */
  async connectWithRetry() {
    const uri = this.getConnectionUri();
    const options = this.getConnectionOptions();

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `Connecting to MongoDB... (Attempt ${attempt}/${this.maxRetries})`
        );

        this.connection = await mongoose.connect(uri, options);
        this.isConnected = true;
        this.currentRetries = 0;

        console.log(
          `MongoDB connected successfully to: ${this.connection.connection.host}`
        );
        console.log(`Database: ${this.connection.connection.name}`);
        return;
      } catch (error) {
        console.error(
          `MongoDB connection attempt ${attempt} failed:`,
          error.message
        );

        if (attempt === this.maxRetries) {
          throw new Error(
            `Failed to connect to MongoDB after ${this.maxRetries} attempts: ${error.message}`
          );
        }

        console.log(`Retrying in ${this.retryDelay / 1000} seconds...`);
        await this.delay(this.retryDelay);
      }
    }
  }

  /**
   * Delay utility for retry logic
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Disconnect from MongoDB database
   * @returns {Promise<void>}
   */
  async disconnect() {
    try {
      if (!this.isConnected) {
        console.log('Database already disconnected');
        return;
      }

      await mongoose.connection.close();
      this.isConnected = false;
      console.log('MongoDB disconnected successfully');
    } catch (error) {
      console.error('MongoDB disconnection error:', error.message);
      throw error;
    }
  }

  /**
   * Setup connection event handlers for monitoring
   */
  setupConnectionEventHandlers() {
    mongoose.connection.on('connected', () => {
      console.log('✅ Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (error) => {
      console.error('❌ Mongoose connection error:', error.message);
      this.isConnected = false;

      // Attempt to reconnect on error
      this.handleConnectionError(error);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️  Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 Mongoose reconnected to MongoDB');
      this.isConnected = true;
      this.currentRetries = 0;
    });

    mongoose.connection.on('reconnectFailed', () => {
      console.error('💥 Mongoose reconnection failed');
      this.isConnected = false;
    });

    // Handle application termination gracefully
    this.setupGracefulShutdown();
  }

  /**
   * Handle connection errors with retry logic
   * @param {Error} error - Connection error
   */
  handleConnectionError() {
    if (this.currentRetries < this.maxRetries) {
      this.currentRetries++;
      console.log(
        `Attempting to reconnect... (${this.currentRetries}/${this.maxRetries})`
      );

      setTimeout(async () => {
        try {
          await this.connectWithRetry();
        } catch (reconnectError) {
          console.error('Reconnection failed:', reconnectError.message);
        }
      }, this.retryDelay);
    } else {
      console.error(
        'Max reconnection attempts reached. Manual intervention required.'
      );
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    // Handle SIGINT (Ctrl+C)
    process.on('SIGINT', async () => {
      console.log('\n🛑 Received SIGINT. Gracefully shutting down...');
      await this.gracefulShutdown('SIGINT');
    });

    // Handle SIGTERM (termination signal)
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Received SIGTERM. Gracefully shutting down...');
      await this.gracefulShutdown('SIGTERM');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      console.error('💥 Uncaught Exception:', error);
      await this.gracefulShutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      await this.gracefulShutdown('unhandledRejection');
    });
  }

  /**
   * Perform graceful shutdown
   * @param {string} signal - Shutdown signal
   */
  async gracefulShutdown(signal) {
    try {
      console.log(
        `📊 Database connection status before shutdown: ${this.getConnectionStatus()}`
      );

      if (this.isConnected) {
        console.log('🔌 Closing database connection...');
        await this.disconnect();
        console.log('✅ Database connection closed successfully');
      }

      console.log(`🏁 Graceful shutdown completed for signal: ${signal}`);
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during graceful shutdown:', error.message);
      process.exit(1);
    }
  }

  /**
   * Get connection status
   * @returns {boolean} Connection status
   */
  getConnectionStatus() {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  /**
   * Get database name from connection
   * @returns {string|null} Database name
   */
  getDatabaseName() {
    return this.connection?.connection?.name || null;
  }

  /**
   * Get detailed connection information
   * @returns {object} Connection information
   */
  getConnectionInfo() {
    if (!this.connection) {
      return {
        status: 'disconnected',
        host: null,
        database: null,
        readyState: 0,
        readyStateText: 'disconnected',
      };
    }

    const readyStates = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    return {
      status: this.isConnected ? 'connected' : 'disconnected',
      host: this.connection.connection.host,
      database: this.connection.connection.name,
      readyState: mongoose.connection.readyState,
      readyStateText: readyStates[mongoose.connection.readyState] || 'unknown',
    };
  }

  /**
   * Test database connection
   * @returns {Promise<boolean>} Connection test result
   */
  async testConnection() {
    try {
      if (!this.isConnected) {
        return false;
      }

      // Perform a simple ping operation
      await mongoose.connection.db.admin().ping();
      console.log('📡 Database connection test successful');
      return true;
    } catch (error) {
      console.error('📡 Database connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get database statistics
   * @returns {Promise<object|null>} Database statistics
   */
  async getDatabaseStats() {
    try {
      if (!this.isConnected) {
        return null;
      }

      const stats = await mongoose.connection.db.stats();
      return {
        collections: stats.collections,
        dataSize: stats.dataSize,
        storageSize: stats.storageSize,
        indexes: stats.indexes,
        indexSize: stats.indexSize,
        objects: stats.objects,
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error.message);
      return null;
    }
  }
}

// Export singleton instance
const databaseConfig = new DatabaseConfig();
module.exports = databaseConfig;
