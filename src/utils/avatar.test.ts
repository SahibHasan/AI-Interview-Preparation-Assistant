import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateAvatarFile,
  isValidAvatarUrl,
  formatAuthProviderLabel,
  MAX_AVATAR_RAW_BYTES,
} from './avatar';

test('validateAvatarFile accepts valid PNG/JPEG/WebP/GIF images within size limits', () => {
  assert.deepEqual(validateAvatarFile({ type: 'image/png', size: 1024 }), { valid: true });
  assert.deepEqual(validateAvatarFile({ type: 'image/jpeg', size: 500_000 }), { valid: true });
  assert.deepEqual(validateAvatarFile({ type: 'image/webp', size: 250_000 }), { valid: true });
});

test('validateAvatarFile rejects invalid MIME types, empty files, and oversized uploads', () => {
  const badType = validateAvatarFile({ type: 'application/pdf', size: 1024 });
  assert.equal(badType.valid, false);
  assert.ok(badType.error);

  const emptyFile = validateAvatarFile({ type: 'image/png', size: 0 });
  assert.equal(emptyFile.valid, false);

  const hugeFile = validateAvatarFile({ type: 'image/jpeg', size: MAX_AVATAR_RAW_BYTES + 1 });
  assert.equal(hugeFile.valid, false);
});

test('isValidAvatarUrl accepts HTTPS URLs and image Data URLs cleanly', () => {
  assert.equal(isValidAvatarUrl('https://example.com/avatar.png'), true);
  assert.equal(isValidAvatarUrl('data:image/png;base64,iVBORw0KGgo='), true);
  assert.equal(isValidAvatarUrl('javascript:alert(1)'), false);
  assert.equal(isValidAvatarUrl(''), false);
});

test('formatAuthProviderLabel formats email, google, and github cleanly', () => {
  assert.equal(formatAuthProviderLabel('google'), 'Google (Gmail)');
  assert.equal(formatAuthProviderLabel('github'), 'GitHub OAuth');
  assert.equal(formatAuthProviderLabel('email'), 'Email & Password');
});
