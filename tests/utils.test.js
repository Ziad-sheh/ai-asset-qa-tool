import { isArabic } from '../src/utils.js';

describe('isArabic', () => {
  test('returns true for Arabic text', () => {
    expect(isArabic('مرحبا')).toBe(true);
  });

  test('returns false for Latin text', () => {
    expect(isArabic('Hello')).toBe(false);
  });

  test('returns false for empty string', () => {
    expect(isArabic('')).toBe(false);
  });
});
