import { sanitize } from '../utils.js';

test('sanitize removes angle brackets', () => {
  expect(sanitize('<script>')).toBe('script');
});

test('sanitize returns empty string for undefined', () => {
  expect(sanitize()).toBe('');
});
