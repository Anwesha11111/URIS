'use strict';

/**
 * Unit tests for capacityEngine.js
 *
 * Each test derives its expected value from the spec formula directly:
 *
 *   CapacityScore = availabilityScore (0–40)
 *                 − taskLoadPenalty   (0 | 20 | 40)
 *                 − examPenalty       (0 | 15 | 30)
 *                 + performanceModifier (−15 | −10 | 0 | +15)
 *                 + credibilityModifier (−10 | −6  | 0 | +10)
 *
 * Clamped to [0, 100], returned as integer.
 */

const {
  calculateCapacityScore,
  getAvailabilityScore,
  getTaskLoadPenalty,
  getExamPenalty,
  getPerformanceModifier,
  getCredibilityModifier,
} = require('../capacityEngine');

// ─────────────────────────────────────────────────────────────────────────────
// Helper: getAvailabilityScore
// ─────────────────────────────────────────────────────────────────────────────
describe('getAvailabilityScore', () => {
  test('passes through a valid score unchanged', () => {
    expect(getAvailabilityScore(35)).toBe(35);
  });

  test('clamps values above 40 to 40', () => {
    expect(getAvailabilityScore(50)).toBe(40);
  });

  test('clamps negative values to 0', () => {
    expect(getAvailabilityScore(-5)).toBe(0);
  });

  test('returns 0 for null (default)', () => {
    expect(getAvailabilityScore(null)).toBe(0);
  });

  test('returns 0 for undefined (default)', () => {
    expect(getAvailabilityScore(undefined)).toBe(0);
  });

  test('returns 0 for NaN (default)', () => {
    expect(getAvailabilityScore(NaN)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: getTaskLoadPenalty
// ─────────────────────────────────────────────────────────────────────────────
describe('getTaskLoadPenalty', () => {
  test('Green band: TLI = 0 → penalty 0', () => {
    expect(getTaskLoadPenalty(0)).toBe(0);
  });

  test('Green band: TLI = 6 (boundary) → penalty 0', () => {
    expect(getTaskLoadPenalty(6)).toBe(0);
  });

  test('Amber band: TLI = 7 (boundary) → penalty 20', () => {
    expect(getTaskLoadPenalty(7)).toBe(20);
  });

  test('Amber band: TLI = 10 → penalty 20', () => {
    expect(getTaskLoadPenalty(10)).toBe(20);
  });

  test('Amber band: TLI = 12 (boundary) → penalty 20', () => {
    expect(getTaskLoadPenalty(12)).toBe(20);
  });

  test('Red band: TLI = 13 (boundary) → penalty 40', () => {
    expect(getTaskLoadPenalty(13)).toBe(40);
  });

  test('Red band: TLI = 30 → penalty 40', () => {
    expect(getTaskLoadPenalty(30)).toBe(40);
  });

  test('null TLI uses default 0 → penalty 0', () => {
    expect(getTaskLoadPenalty(null)).toBe(0);
  });

  test('NaN TLI uses default 0 → penalty 0', () => {
    expect(getTaskLoadPenalty(NaN)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: getExamPenalty
// ─────────────────────────────────────────────────────────────────────────────
describe('getExamPenalty', () => {
  test('exam week → penalty 30', () => {
    expect(getExamPenalty('exam')).toBe(30);
  });

  test('busy / heavy-load week → penalty 15', () => {
    expect(getExamPenalty('busy')).toBe(15);
  });

  test('free week → penalty 0', () => {
    expect(getExamPenalty('free')).toBe(0);
  });

  test('normal week → penalty 0', () => {
    expect(getExamPenalty('normal')).toBe(0);
  });

  test('no weekStatusToggle + examFlag true → penalty 30 (legacy path)', () => {
    expect(getExamPenalty(null, true)).toBe(30);
  });

  test('no weekStatusToggle + examFlag false → penalty 0 (legacy path)', () => {
    expect(getExamPenalty(null, false)).toBe(0);
  });

  test('no weekStatusToggle + examFlag undefined → penalty 0', () => {
    expect(getExamPenalty(undefined, undefined)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: getPerformanceModifier
// ─────────────────────────────────────────────────────────────────────────────
describe('getPerformanceModifier', () => {
  test('RPI > 4.0 → +15', () => {
    expect(getPerformanceModifier(4.5)).toBe(15);
  });

  test('RPI = 4.0 (boundary, not > 4) → 0', () => {
    expect(getPerformanceModifier(4.0)).toBe(0);
  });

  test('RPI = 3.5 → 0', () => {
    expect(getPerformanceModifier(3.5)).toBe(0);
  });

  test('RPI = 3.0 (boundary) → 0', () => {
    expect(getPerformanceModifier(3.0)).toBe(0);
  });

  test('RPI = 2.5 → −10', () => {
    expect(getPerformanceModifier(2.5)).toBe(-10);
  });

  test('RPI = 2.0 (boundary) → −10', () => {
    expect(getPerformanceModifier(2.0)).toBe(-10);
  });

  test('RPI = 1.5 → −15', () => {
    expect(getPerformanceModifier(1.5)).toBe(-15);
  });

  test('RPI = 1.0 (minimum) → −15', () => {
    expect(getPerformanceModifier(1.0)).toBe(-15);
  });

  test('null RPI uses default 3.0 → 0', () => {
    expect(getPerformanceModifier(null)).toBe(0);
  });

  test('NaN RPI uses default 3.0 → 0', () => {
    expect(getPerformanceModifier(NaN)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: getCredibilityModifier
// ─────────────────────────────────────────────────────────────────────────────
describe('getCredibilityModifier', () => {
  test('score > 75 → +10', () => {
    expect(getCredibilityModifier(90)).toBe(10);
  });

  test('score = 76 (just above 75) → +10', () => {
    expect(getCredibilityModifier(76)).toBe(10);
  });

  test('score = 75 (boundary, not > 75) → 0', () => {
    expect(getCredibilityModifier(75)).toBe(0);
  });

  test('score = 60 → 0', () => {
    expect(getCredibilityModifier(60)).toBe(0);
  });

  test('score = 50 (boundary) → 0', () => {
    expect(getCredibilityModifier(50)).toBe(0);
  });

  test('score = 49 (just below 50) → −6', () => {
    expect(getCredibilityModifier(49)).toBe(-6);
  });

  test('score = 40 → −6', () => {
    expect(getCredibilityModifier(40)).toBe(-6);
  });

  test('score = 35 (boundary) → −6', () => {
    expect(getCredibilityModifier(35)).toBe(-6);
  });

  test('score = 34 (just below 35) → −10', () => {
    expect(getCredibilityModifier(34)).toBe(-10);
  });

  test('score = 0 → −10', () => {
    expect(getCredibilityModifier(0)).toBe(-10);
  });

  test('null credibility uses default 50 → 0', () => {
    expect(getCredibilityModifier(null)).toBe(0);
  });

  test('NaN credibility uses default 50 → 0', () => {
    expect(getCredibilityModifier(NaN)).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: calculateCapacityScore — realistic scenarios
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCapacityScore — realistic scenarios', () => {

  // ── High-capacity intern ────────────────────────────────────────────────
  // availability=40, TLI=3 (green→0), normal week (0), RPI=4.5 (+15), cred=80 (+10)
  // raw = 40 − 0 − 0 + 15 + 10 = 65  → clamped = 65
  test('high-capacity intern: low TLI, high RPI, high credibility → score 65', () => {
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 3,
      weekStatusToggle : 'normal',
      performanceIndex : 4.5,
      credibilityScore : 80,
    });
    expect(capacityScore).toBe(65);
    expect(capacityLabel).toBe('Moderate availability');
  });

  // availability=40, TLI=2 (green→0), free week (0), RPI=5 (+15), cred=90 (+10)
  // raw = 40 − 0 − 0 + 15 + 10 = 65
  test('top-performing intern: maximum availability, RPI=5, cred=90 → score 65', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 2,
      weekStatusToggle : 'free',
      performanceIndex : 5,
      credibilityScore : 90,
    });
    expect(capacityScore).toBe(65);
  });

  // ── Overloaded intern ───────────────────────────────────────────────────
  // availability=20, TLI=15 (red→40), normal (0), RPI=3 (0), cred=50 (0)
  // raw = 20 − 40 − 0 + 0 + 0 = −20 → clamped = 0
  test('overloaded intern: high TLI → score clamped to 0', () => {
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: 20,
      tli              : 15,
      weekStatusToggle : 'normal',
      performanceIndex : 3,
      credibilityScore : 50,
    });
    expect(capacityScore).toBe(0);
    expect(capacityLabel).toBe('High workload or low availability');
  });

  // ── Exam week penalty ───────────────────────────────────────────────────
  // availability=30, TLI=5 (green→0), exam (−30), RPI=3.5 (0), cred=60 (0)
  // raw = 30 − 0 − 30 + 0 + 0 = 0 → clamped = 0
  test('exam week: full exam penalty drives score to 0', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 30,
      tli              : 5,
      weekStatusToggle : 'exam',
      performanceIndex : 3.5,
      credibilityScore : 60,
    });
    expect(capacityScore).toBe(0);
  });

  // availability=40, TLI=4 (green→0), exam (−30), RPI=4.5 (+15), cred=80 (+10)
  // raw = 40 − 0 − 30 + 15 + 10 = 35 → clamped = 35
  test('exam week with strong modifiers: score partially recovered to 35', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 4,
      weekStatusToggle : 'exam',
      performanceIndex : 4.5,
      credibilityScore : 80,
    });
    expect(capacityScore).toBe(35);
  });

  // ── Heavy-load week ─────────────────────────────────────────────────────
  // availability=35, TLI=6 (green→0), busy (−15), RPI=3 (0), cred=50 (0)
  // raw = 35 − 0 − 15 + 0 + 0 = 20 → clamped = 20
  test('heavy-load week: partial penalty applied correctly', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 35,
      tli              : 6,
      weekStatusToggle : 'busy',
      performanceIndex : 3,
      credibilityScore : 50,
    });
    expect(capacityScore).toBe(20);
  });

  // ── Low performance + low credibility ───────────────────────────────────
  // availability=25, TLI=8 (amber→20), normal (0), RPI=1.5 (−15), cred=20 (−10)
  // raw = 25 − 20 − 0 + (−15) + (−10) = −20 → clamped = 0
  test('low RPI + low credibility: strong negative modifiers → score 0', () => {
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: 25,
      tli              : 8,
      weekStatusToggle : 'normal',
      performanceIndex : 1.5,
      credibilityScore : 20,
    });
    expect(capacityScore).toBe(0);
    expect(capacityLabel).toBe('High workload or low availability');
  });

  // ── Moderate intern ─────────────────────────────────────────────────────
  // availability=28, TLI=9 (amber→20), normal (0), RPI=3.5 (0), cred=55 (0)
  // raw = 28 − 20 − 0 + 0 + 0 = 8 → clamped = 8
  test('moderate intern: amber TLI, neutral modifiers → score 8', () => {
    const { capacityScore, capacityLabel } = calculateCapacityScore({
      availabilityScore: 28,
      tli              : 9,
      weekStatusToggle : 'normal',
      performanceIndex : 3.5,
      credibilityScore : 55,
    });
    expect(capacityScore).toBe(8);
    expect(capacityLabel).toBe('High workload or low availability');
  });

  // ── Label thresholds ────────────────────────────────────────────────────
  // availability=40, TLI=0, normal, RPI=4.5 (+15), cred=80 (+10)
  // raw = 40 + 15 + 10 = 65 → 'Moderate availability'
  test('score 65 → label "Moderate availability"', () => {
    const { capacityLabel } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 0,
      weekStatusToggle : 'normal',
      performanceIndex : 4.5,
      credibilityScore : 80,
    });
    expect(capacityLabel).toBe('Moderate availability');
  });

  // availability=40, TLI=0, normal, RPI=5 (+15), cred=100 (+10)
  // raw = 40 + 15 + 10 = 65 → still 'Moderate availability'
  // To reach 'High availability' (≥70) we need raw ≥ 70
  // availability=40, TLI=0, normal, RPI=5 (+15), cred=100 (+10) = 65 — not enough
  // Use availabilityScore=45 (clamped to 40) + modifiers = 65 — still not enough
  // The maximum possible raw score is 40 + 0 + 0 + 15 + 10 = 65
  // So 'High availability' label is unreachable with current spec weights.
  // Test that the maximum achievable score is 65.
  test('maximum possible score is 65 (spec ceiling)', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 0,
      weekStatusToggle : 'free',
      performanceIndex : 5,
      credibilityScore : 100,
    });
    expect(capacityScore).toBe(65);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Integration: calculateCapacityScore — edge cases & safety
// ─────────────────────────────────────────────────────────────────────────────
describe('calculateCapacityScore — edge cases and safety', () => {

  test('all inputs null → uses all defaults, returns finite integer', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: null,
      tli              : null,
      weekStatusToggle : null,
      examFlag         : null,
      performanceIndex : null,
      credibilityScore : null,
    });
    // defaults: avail=0, tli=0→penalty 0, no exam→0, rpi=3.0→0, cred=50→0
    // raw = 0 − 0 − 0 + 0 + 0 = 0
    expect(capacityScore).toBe(0);
    expect(typeof capacityScore).toBe('number');
    expect(Number.isFinite(capacityScore)).toBe(true);
  });

  test('all inputs undefined → uses all defaults, returns 0', () => {
    const { capacityScore } = calculateCapacityScore({});
    expect(capacityScore).toBe(0);
  });

  test('called with no argument at all → returns 0 without throwing', () => {
    // sanitizeInputs handles params ?? {} so this must not throw
    expect(() => calculateCapacityScore()).not.toThrow();
    const { capacityScore } = calculateCapacityScore();
    expect(capacityScore).toBe(0);
  });

  test('NaN inputs → uses defaults, returns finite integer', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: NaN,
      tli              : NaN,
      performanceIndex : NaN,
      credibilityScore : NaN,
    });
    expect(Number.isFinite(capacityScore)).toBe(true);
  });

  test('Infinity availabilityScore → treated as invalid, uses default 0', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: Infinity,
      tli              : 0,
      weekStatusToggle : 'normal',
      performanceIndex : 3,
      credibilityScore : 50,
    });
    // Infinity is not finite → safeNumber falls back to default 0
    // raw = 0 − 0 − 0 + 0 + 0 = 0
    expect(capacityScore).toBe(0);
  });

  test('extreme high TLI (1000) → penalty capped at 40', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 40,
      tli              : 1000,
      weekStatusToggle : 'normal',
      performanceIndex : 3,
      credibilityScore : 50,
    });
    // raw = 40 − 40 − 0 + 0 + 0 = 0
    expect(capacityScore).toBe(0);
  });

  test('string numeric inputs → treated as non-finite, defaults applied', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: '30',   // string, not a number
      tli              : '5',
      performanceIndex : '4',
      credibilityScore : '80',
    });
    // All strings fail safeNumber → defaults: avail=0, tli=0, rpi=3.0, cred=50
    // raw = 0 − 0 − 0 + 0 + 0 = 0
    expect(capacityScore).toBe(0);
  });

  test('result is always an integer (Math.round applied)', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 33,
      tli              : 7,
      weekStatusToggle : 'normal',
      performanceIndex : 3.5,
      credibilityScore : 60,
    });
    expect(Number.isInteger(capacityScore)).toBe(true);
  });

  test('score never exceeds 100', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 999,
      tli              : 0,
      weekStatusToggle : 'free',
      performanceIndex : 5,
      credibilityScore : 100,
    });
    expect(capacityScore).toBeLessThanOrEqual(100);
  });

  test('score never goes below 0', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 0,
      tli              : 999,
      weekStatusToggle : 'exam',
      performanceIndex : 1,
      credibilityScore : 0,
    });
    expect(capacityScore).toBeGreaterThanOrEqual(0);
  });

  // ── Legacy examFlag boolean path ────────────────────────────────────────
  // availability=30, TLI=5 (green→0), examFlag=true (→30), RPI=3 (0), cred=50 (0)
  // raw = 30 − 0 − 30 + 0 + 0 = 0
  test('legacy examFlag=true with no weekStatusToggle → penalty 30', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 30,
      tli              : 5,
      examFlag         : true,
      performanceIndex : 3,
      credibilityScore : 50,
    });
    expect(capacityScore).toBe(0);
  });

  // weekStatusToggle takes precedence over examFlag
  // availability=30, TLI=5, weekStatusToggle='normal' (→0), examFlag=true (ignored)
  // raw = 30 − 0 − 0 + 0 + 0 = 30
  test('weekStatusToggle takes precedence over examFlag', () => {
    const { capacityScore } = calculateCapacityScore({
      availabilityScore: 30,
      tli              : 5,
      weekStatusToggle : 'normal',
      examFlag         : true,   // should be ignored
      performanceIndex : 3,
      credibilityScore : 50,
    });
    expect(capacityScore).toBe(30);
  });
});
