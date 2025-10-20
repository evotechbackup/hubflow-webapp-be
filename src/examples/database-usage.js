/**
 * Example of how to use the database connection in an Express.js application
 * This file demonstrates the proper initialization and usage of the database connection
 */

const { initializeConfig } = require('../config');
const DatabaseUtils = require('../utils/database');

/**
 * Example application startup with database connection
 */
async function startApplication() {
  try {
    console.log('🚀 Starting application...');

    // 1. Initialize configuration (loads environment variables)
    const config = initializeConfig();

    // 2. Initialize database connection
    await DatabaseUtils.initialize();

    // 3. Get database health status
    const healthStatus = await DatabaseUtils.getHealthStatus();
    console.log('📊 Database Health Status:', healthStatus);

    // 4. Get database statistics (optional)
    const stats = await DatabaseUtils.getStatistics();
    console.log('📈 Database Statistics:', stats);

    console.log('✅ Application started successfully');

    // Example of how this would integrate with Express.js:
    // const express = require('express');
    // const app = express();
    //
    // // Your Express.js routes and middleware would go here
    //
    // const server = app.listen(config.server.port, () => {
    //   console.log(`🌐 Server running on port ${config.server.port}`);
    // });

    return { config, healthStatus, stats };
  } catch (error) {
    console.error('❌ Application startup failed:', error.message);
    process.exit(1);
    return null; // This will never be reached, but satisfies the linter
  }
}

/**
 * Example graceful shutdown
 */
async function shutdownApplication() {
  try {
    console.log('🛑 Shutting down application...');

    // Close database connection
    await DatabaseUtils.close();

    console.log('✅ Application shutdown completed');
  } catch (error) {
    console.error('❌ Error during shutdown:', error.message);
    process.exit(1);
  }
}

// Export functions for use in other modules
module.exports = {
  startApplication,
  shutdownApplication,
};

// If this file is run directly, start the application
if (require.main === module) {
  startApplication()
    .then(() => {
      console.log('📱 Application is running. Press Ctrl+C to stop.');
    })
    .catch((error) => {
      console.error('💥 Failed to start application:', error);
      process.exit(1);
    });
}
