// Jest setup file for global test configuration
import './mocks/obsidian-api';

// Global test utilities and configuration
global.console = {
  ...console,
  // Suppress console.log in tests unless explicitly needed
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

// Mock window object for browser API tests
Object.defineProperty(global, 'window', {
  value: {
    // Mock the Entity Schema Manager API namespace
    'entity-schema-manager.api.v1': undefined,
  },
  writable: true,
  configurable: true,
});