const databaseConfig = require('../config/database');

/**
 * Database utility functions
 */
class DatabaseUtils {
  /**
   * Initialize database connection
   * @returns {Promise<void>}
   */
  static async initialize() {
    try {
      console.log('🚀 Initializing database connection...');
      await databaseConfig.connect();

      // Test the connection
      const isHealthy = await databaseConfig.testConnection();
      if (!isHealthy) {
        throw new Error('Database connection test failed');
      }

      // Log connection info
      const connectionInfo = databaseConfig.getConnectionInfo();
      console.log('📊 Database connection established:');
      console.log(`   Host: ${connectionInfo.host}`);
      console.log(`   Database: ${connectionInfo.database}`);
      console.log(`   Status: ${connectionInfo.status}`);
    } catch (error) {
      console.error('❌ Database initialization failed:', error.message);
      throw error;
    }
  }

  /**
   * Get database health status
   * @returns {Promise<object>} Health status object
   */
  static async getHealthStatus() {
    try {
      const connectionInfo = databaseConfig.getConnectionInfo();
      const isConnected = databaseConfig.getConnectionStatus();
      const testResult = await databaseConfig.testConnection();

      return {
        status: isConnected && testResult ? 'healthy' : 'unhealthy',
        connected: isConnected,
        connectionTest: testResult,
        connectionInfo,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        connectionTest: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get database statistics for monitoring
   * @returns {Promise<object>} Database statistics
   */
  static async getStatistics() {
    try {
      const stats = await databaseConfig.getDatabaseStats();
      const healthStatus = await this.getHealthStatus();

      return {
        health: healthStatus,
        statistics: stats,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Failed to get database statistics:', error.message);
      return {
        health: { status: 'unhealthy', error: error.message },
        statistics: null,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Gracefully close database connection
   * @returns {Promise<void>}
   */
  static async close() {
    try {
      console.log('🔌 Closing database connection...');
      await databaseConfig.disconnect();
      console.log('✅ Database connection closed successfully');
    } catch (error) {
      console.error('❌ Error closing database connection:', error.message);
      throw error;
    }
  }
}

module.exports = DatabaseUtils;
