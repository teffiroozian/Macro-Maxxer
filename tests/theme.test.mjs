import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { themeBootstrapScript, THEME_STORAGE_KEY } from '../lib/theme.ts';

function boot({ saved, deviceDark = false, blocked = false } = {}) {
  const handlers = {};
  const media = { matches: deviceDark, addEventListener: (_, fn) => { handlers.device = fn; } };
  const state = { dark: false, saved };
  const context = {
    document: { documentElement: { classList: { toggle: (_, value) => { state.dark = value; } } } },
    window: { matchMedia: () => media, addEventListener: (name, fn) => { handlers[name] = fn; } },
    localStorage: {
      getItem: () => { if (blocked) throw Error('blocked'); return state.saved; },
      setItem: (key, value) => { assert.equal(key, THEME_STORAGE_KEY); if (blocked) throw Error('blocked'); state.saved = value; },
    },
  };
  vm.runInNewContext(themeBootstrapScript, context);
  return { state, media, handlers };
}

test('saved appearance wins over device appearance before first paint', () => {
  assert.equal(boot({ saved: 'light', deviceDark: true }).state.dark, false);
  assert.equal(boot({ saved: 'dark', deviceDark: false }).state.dark, true);
});
test('first visits and invalid preferences stay light regardless of device appearance', () => {
  for (const saved of [undefined, 'invalid']) {
    const { state, media, handlers } = boot({ saved, deviceDark: true });
    assert.equal(state.dark, false);
    assert.equal(handlers.device, undefined);
    media.matches = false;
    assert.equal(state.dark, false);
    handlers['macro-maxxer-theme']({ detail: 'dark' });
    assert.equal(state.saved, 'dark');
    assert.equal(state.dark, true);
  }
});
test('storage changes and clearing preference synchronize other tabs', () => {
  const { state, handlers } = boot({ saved: 'light', deviceDark: true });
  state.saved = 'dark'; handlers.storage({ key: THEME_STORAGE_KEY }); assert.equal(state.dark, true);
  state.saved = 'light'; handlers.storage({ key: THEME_STORAGE_KEY }); assert.equal(state.dark, false);
  state.saved = undefined; handlers.storage({ key: null }); assert.equal(state.dark, false);
});
test('blocked storage defaults to light and supports session selection', () => {
  const { state, handlers } = boot({ blocked: true, deviceDark: true });
  assert.equal(state.dark, false);
  handlers['macro-maxxer-theme']({ detail: 'dark' }); assert.equal(state.dark, true);
});

test('manual selection survives a full page load and invalid events are ignored', () => {
  const first = boot({ deviceDark: false });
  first.handlers['macro-maxxer-theme']({ detail: 'dark' });
  const nextPage = boot({ saved: first.state.saved });
  assert.equal(nextPage.state.dark, true);
  nextPage.handlers['macro-maxxer-theme']({ detail: 'invalid' });
  assert.equal(nextPage.state.dark, true);
  nextPage.handlers['macro-maxxer-theme']({ detail: 'light' });
  assert.equal(boot({ saved: nextPage.state.saved, deviceDark: true }).state.dark, false);
});

test('manual controls notify every mounted toggle and unsubscribe cleanly', async () => {
  const { setTheme, getTheme, subscribeToTheme } = await import('../lib/theme.ts');
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const target = new EventTarget();
  let dark = false;
  const document = { documentElement: { classList: {
    toggle: (_, value) => { dark = value; },
    contains: () => dark,
  } } };
  const storage = new Map();
  vm.runInNewContext(themeBootstrapScript, {
    document, window: target,
    localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  });
  globalThis.window = target;
  globalThis.document = document;
  try {
    const first = [], second = [];
    const offFirst = subscribeToTheme(() => first.push(getTheme()));
    const offSecond = subscribeToTheme(() => second.push(getTheme()));
    setTheme('dark');
    assert.deepEqual(first, ['dark']);
    assert.deepEqual(second, ['dark']);
    assert.equal(storage.get(THEME_STORAGE_KEY), 'dark');
    offFirst();
    setTheme('light');
    assert.deepEqual(first, ['dark']);
    assert.deepEqual(second, ['dark', 'light']);
    offSecond();
  } finally {
    if (previousWindow === undefined) delete globalThis.window; else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document; else globalThis.document = previousDocument;
  }
});
