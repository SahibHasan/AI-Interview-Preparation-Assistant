import test from 'node:test';
import assert from 'node:assert';
import { getSupabaseConfig, isSupabaseConfigured } from './supabase';

test('getSupabaseConfig returns default structure', () => {
  const config = getSupabaseConfig();
  assert.ok(typeof config === 'object');
  assert.ok('url' in config);
  assert.ok('key' in config);
  assert.ok('isConfigured' in config);
  assert.strictEqual(typeof config.isConfigured, 'boolean');
});

test('isSupabaseConfigured handles empty or unconfigured state without throwing', () => {
  const configured = isSupabaseConfigured();
  assert.strictEqual(typeof configured, 'boolean');
});

test('supabase proxy exists and exposes auth and from methods safely', async () => {
  const { supabase } = await import('./supabase');
  assert.ok(supabase);
  assert.strictEqual(typeof supabase.from, 'function');
  assert.ok(supabase.auth);
  assert.strictEqual(typeof supabase.auth.getSession, 'function');
  assert.strictEqual(typeof supabase.auth.signInWithPassword, 'function');
  assert.strictEqual(typeof supabase.auth.signUp, 'function');
});

