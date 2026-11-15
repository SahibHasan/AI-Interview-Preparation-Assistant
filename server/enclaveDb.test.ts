import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { hashPassword, verifyPassword } from './authCrypto';
import { EnclaveDatabase } from './enclaveDb';

test('hashPassword & verifyPassword use unique salts and reject wrong passwords', () => {
  const hash1 = hashPassword('MySecretPass123!');
  const hash2 = hashPassword('MySecretPass123!');

  assert.notEqual(hash1, hash2);
  assert.ok(hash1.startsWith('scrypt$'));
  assert.equal(verifyPassword('MySecretPass123!', hash1), true);
  assert.equal(verifyPassword('WrongPassword', hash1), false);
  assert.equal(verifyPassword('', hash1), false);
});

test('EnclaveDatabase persists registered user email, password hash, and uploaded avatar across reloads', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preppilot-db-'));
  const dbPath = path.join(tmpDir, 'enclave.json');

  try {
    const db1 = new EnclaveDatabase(dbPath);
    const reg = db1.registerEmailUser({
      email: 'SahibHasan900@gmail.com',
      password: 'Password99!',
      name: 'Sahib Hasan',
      targetRole: 'Staff Systems Engineer',
      targetCompany: 'Google',
    });

    assert.equal(reg.ok, true);
    if (!reg.ok) return;

    const customAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    db1.updateAvatar(reg.user.id, customAvatar, 'sahibhasan900@gmail.com');

    // Simulate server restart by loading from same disk path
    const db2 = new EnclaveDatabase(dbPath);

    // Wrong password rejected
    const badLogin = db2.authenticateEmailUser({
      email: 'sahibhasan900@gmail.com',
      password: 'WrongPassword!',
    });
    assert.equal(badLogin.ok, false);

    // Correct password succeeds and preserves uploaded avatar
    const goodLogin = db2.authenticateEmailUser({
      email: 'sahibhasan900@gmail.com',
      password: 'Password99!',
    });
    assert.equal(goodLogin.ok, true);
    if (goodLogin.ok) {
      assert.equal(goodLogin.user.avatarUrl, customAvatar);
      assert.equal(goodLogin.user.email, 'sahibhasan900@gmail.com');
    }

    // Signing in via Google OAuth with the same email links to the account and retains uploaded avatar
    const oauthLogin = db2.authenticateOAuthUser({
      provider: 'google',
      email: 'sahibhasan900@gmail.com',
    });
    assert.equal(oauthLogin.id, reg.user.id);
    assert.equal(oauthLogin.avatarUrl, customAvatar);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('EnclaveDatabase persists evaluation reports + conversation transcripts per user across reloads', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preppilot-eval-db-'));
  const dbPath = path.join(tmpDir, 'enclave.json');

  try {
    const db1 = new EnclaveDatabase(dbPath);
    const user1 = db1.registerEmailUser({
      email: 'candidate.one@example.com',
      password: 'Password99!',
      name: 'Candidate One',
    });
    const user2 = db1.registerEmailUser({
      email: 'candidate.two@example.com',
      password: 'Password99!',
      name: 'Candidate Two',
    });
    assert.equal(user1.ok, true);
    assert.equal(user2.ok, true);
    if (!user1.ok || !user2.ok) return;

    db1.saveEvaluation(user1.user.id, {
      id: 'rep_1',
      sessionId: 'sess_1',
      overallScore: 88,
      targetRole: 'Staff Engineer',
      targetCompany: 'Stripe',
      conversationTranscript: [{ speaker: 'candidate', text: 'Idempotency tokens protect retries.' }],
    });
    db1.saveEvaluation(user1.user.id, {
      id: 'rep_2',
      sessionId: 'sess_2',
      overallScore: 93,
      targetRole: 'Principal Engineer',
      targetCompany: 'Datadog',
      conversationTranscript: [{ speaker: 'candidate', text: 'Canary rollbacks isolate telemetry.' }],
    });

    // Reload from disk to verify persistence after server restart / re-login
    const db2 = new EnclaveDatabase(dbPath);
    const user1Reports = db2.getEvaluations(user1.user.id);
    const user2Reports = db2.getEvaluations(user2.user.id);

    assert.equal(user1Reports.length, 2);
    assert.equal(user1Reports[0].id, 'rep_2');
    assert.equal(user1Reports[0].conversationTranscript[0].text, 'Canary rollbacks isolate telemetry.');
    assert.equal(db2.getEvaluationByIdOrSession(user1.user.id, 'sess_1')?.id, 'rep_1');
    assert.equal(db2.getProfile(user1.user.id)?.readinessScore, 93);
    assert.equal(user2Reports.length, 0);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});
