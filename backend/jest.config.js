'use strict';

/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // Only pick up files inside src/**/__tests__/ — ignore the root test.js stub
  testMatch: ['**/src/**/__tests__/**/*.test.js'],
  // Silence console.warn during test runs (safety-check warnings are expected)
  silent: true,
};
