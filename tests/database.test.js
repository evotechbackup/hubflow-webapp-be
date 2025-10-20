const databaseConfig = require('../src/config/database');
const DatabaseUtils = require('../src/utils/database');

// Mock environment variables for testing
process.env.MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/test_db';
process.env.NODE_ENV = 'test';

describe('Database Configuration', () => {
  beforeAll(async () => {
    // Ensure we start with a clean state
    if (databaseConfig.getConnectionStatus()) {
      await databaseConfig.disconnect();
    }
  });

  afterAll(async () => {
    // Clean up after tests
    if (databaseConfig.getConnectionStatus()) {
      await databaseConfig.disconnect();
    }
  });

  describe('DatabaseConfig Class', () => {
    test('should initialize with correct default values', () => {
      expect(databaseConfig.connection).toBe(null);
      expect(databaseConfig.isConnected).toBe(false);
      expect(databaseConfig.maxRetries).toBe(5);
      expect(databaseConfig.retryDelay).toBe(5000);
    });

    test('should get connection URI from environment', () => {
      const uri = databaseConfig.getConnectionUri();
      expect(uri).toBe(process.env.MONGODB_URI);
    });

    test('should throw error if MONGODB_URI is not set', () => {
      const originalUri = process.env.MONGODB_URI;
      delete process.env.MONGODB_URI;

      expect(() => {
        databaseConfig.getConnectionUri();
      }).toThrow('MONGODB_URI environment variable is required');

      process.env.MONGODB_URI = originalUri;
    });

    test('should get connection options', () => {
      const options = databaseConfig.getConnectionOptions();
      expect(options).toHaveProperty('maxPoolSize', 10);
      expect(options).toHaveProperty('serverSelectionTimeoutMS', 5000);
      expect(options).toHaveProperty('socketTimeoutMS', 45000);
      expect(options).toHaveProperty('bufferMaxEntries', 0);
      expect(options).toHaveProperty('bufferCommands', false);
    });

    test('should return correct connection status when disconnected', () => {
      expect(databaseConfig.getConnectionStatus()).toBe(false);
    });

    test('should get connection info when disconnected', () => {
      const info = databaseConfig.getConnectionInfo();
      expect(info.status).toBe('disconnected');
      expect(info.host).toBe(null);
      expect(info.database).toBe(null);
      expect(info.readyState).toBe(0);
      expect(info.readyStateText).toBe('disconnected');
    });
  });

  describe('DatabaseUtils Class', () => {
    test('should get health status when disconnected', async () => {
      const health = await DatabaseUtils.getHealthStatus();
      expect(health.status).toBe('unhealthy');
      expect(health.connected).toBe(false);
      expect(health.connectionTest).toBe(false);
      expect(health).toHaveProperty('timestamp');
    });

    test('should get statistics when disconnected', async () => {
      const stats = await DatabaseUtils.getStatistics();
      expect(stats.health.status).toBe('unhealthy');
      expect(stats.statistics).toBe(null);
      expect(stats).toHaveProperty('timestamp');
    });
  });

  // Note: Actual connection tests would require a running MongoDB instance
  // These tests focus on the configuration and utility functions
  describe('Connection Management', () => {
    test('should handle delay utility', async () => {
      const start = Date.now();
      await databaseConfig.delay(100);
      const end = Date.now();
      expect(end - start).toBeGreaterThanOrEqual(100);
    });
  });
});
