// Jest test setup file
const axios = require('axios');

// Configure axios defaults for all tests
axios.defaults.timeout = 5000;
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Global test configuration
global.BASE_URL = process.env.BASE_URL || process.env.REPLIT_DOMAINS || 'http://localhost:5000';

// Increase timeout for database operations
jest.setTimeout(10000);

// Suppress console.log during tests unless CI environment
if (!process.env.CI) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: console.warn,
    error: console.error,
  };
}