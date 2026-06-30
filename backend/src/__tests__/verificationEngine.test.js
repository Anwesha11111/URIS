'use strict';

const {
  buildVerificationPath,
  buildPublicVerificationUrl,
} = require('../services/verificationEngine');

describe('verificationEngine helpers', () => {
  test('buildVerificationPath uses VER id segment', () => {
    expect(buildVerificationPath('VER-2026-0001')).toBe('/verify/VER-2026-0001');
    expect(buildVerificationPath('VER-2026-0042')).toBe('/verify/VER-2026-0042');
  });

  test('buildPublicVerificationUrl combines base and path', () => {
    const url = buildPublicVerificationUrl('VER-2026-0001');
    expect(url).toMatch(/\/verify\/VER-2026-0001$/);
  });
});
