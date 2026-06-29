'use strict';

/**
 * Unit tests — internshipArchiveService helpers
 */

const {
  computeDuration,
  canViewInternalNotes,
} = require('../services/internshipArchiveService');

describe('internshipArchiveService', () => {
  describe('computeDuration', () => {
    test('computes months and days', () => {
      const result = computeDuration('2025-01-01', '2025-04-15');
      expect(result).toMatch(/3 month/);
    });

    test('returns null for missing dates', () => {
      expect(computeDuration(null, '2025-01-01')).toBeNull();
    });
  });

  describe('canViewInternalNotes', () => {
    test('CORE_ADMIN can view internal notes', () => {
      expect(canViewInternalNotes('CORE_ADMIN')).toBe(true);
    });

    test('TECHNICAL_LEAD cannot view internal notes', () => {
      expect(canViewInternalNotes('TECHNICAL_LEAD')).toBe(false);
    });
  });
});
