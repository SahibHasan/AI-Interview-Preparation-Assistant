import test from 'node:test';
import assert from 'node:assert/strict';
import { createNoOpViteClientScript } from './viteClientShim';

test('createNoOpViteClientScript emits zero WebSocket usage and exports required Vite symbols', async () => {
  const script = createNoOpViteClientScript();

  assert.equal(script.includes('WebSocket'), false, 'Shim must never instantiate WebSocket');
  assert.equal(script.includes('ws://'), false, 'Shim must not reference ws://');
  assert.equal(script.includes('wss://'), false, 'Shim must not reference wss://');

  for (const sym of ['ErrorOverlay', 'createHotContext', 'injectQuery', 'removeStyle', 'updateStyle']) {
    assert.ok(script.includes(sym), `Shim must export ${sym}`);
  }

  // Evaluate as an ES module via data URL to verify syntax & exported bindings
  const mod = await import(`data:text/javascript;base64,${Buffer.from(script, 'utf8').toString('base64')}`);
  assert.equal(typeof mod.updateStyle, 'function');
  assert.equal(typeof mod.removeStyle, 'function');
  assert.equal(typeof mod.injectQuery, 'function');
  assert.equal(typeof mod.createHotContext, 'function');
  assert.equal(typeof mod.ErrorOverlay, 'function');

  assert.equal(mod.injectQuery('/src/App.tsx?t=1#hash', 'import'), '/src/App.tsx?import&t=1#hash');
  assert.equal(mod.injectQuery('https://example.com/a.js', 'import'), 'https://example.com/a.js');

  const ctx = mod.createHotContext('/src/App.tsx');
  assert.equal(typeof ctx.accept, 'function');
  assert.equal(typeof ctx.dispose, 'function');
  assert.equal(typeof ctx.on, 'function');
});
