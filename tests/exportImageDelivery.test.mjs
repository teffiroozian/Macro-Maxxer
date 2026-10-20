import assert from "node:assert/strict";
import { test } from "node:test";
import { canSharePng, isMobileExportBrowser, pngDataUrlToFile, sharePng } from "../lib/export/sharePng.ts";

const png = "data:image/png;base64,iVBORw0KGgo=";

function withNavigator(value, run) {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value });
  return Promise.resolve().then(run).finally(() => {
    if (original) Object.defineProperty(globalThis, "navigator", original);
    else delete globalThis.navigator;
  });
}

test("PNG conversion preserves bytes, MIME type, and filename", async () => {
  const file = pngDataUrlToFile(png, "order.png");
  assert.ok(file instanceof File);
  assert.equal(file.type, "image/png");
  assert.equal(file.name, "order.png");
  assert.deepEqual(new Uint8Array(await file.arrayBuffer()), new Uint8Array(Buffer.from("iVBORw0KGgo=", "base64")));
});

test("mobile detection includes iPhone, Android, and desktop-mode iPad, preserving desktop downloads", async () => {
  for (const [value, expected] of [
    [{ userAgent: "iPhone", platform: "iPhone", maxTouchPoints: 5 }, true],
    [{ userAgent: "Android", platform: "Linux", maxTouchPoints: 5 }, true],
    [{ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 5 }, true],
    [{ userAgent: "Macintosh", platform: "MacIntel", maxTouchPoints: 0 }, false],
    [{ userAgent: "Windows", platform: "Win32", maxTouchPoints: 0 }, false],
  ]) await withNavigator(value, () => assert.equal(isMobileExportBrowser(), expected));
});

test("shares the actual PNG File synchronously before the click's activation expires", async () => {
  const file = pngDataUrlToFile(png, "order.png");
  let active = true;
  const calls = [];
  await withNavigator({
    canShare(data) { calls.push("canShare"); assert.deepEqual(data, { files: [file] }); return true; },
    share(data) {
      assert.equal(active, true, "share must be invoked before any async boundary");
      calls.push("share");
      assert.deepEqual(data, { files: [file] });
      return Promise.resolve();
    },
  }, async () => {
    const result = sharePng(file);
    active = false;
    assert.equal(await result, "shared");
    assert.deepEqual(calls, ["canShare", "share"]);
  });
});

test("unsupported and throwing capability checks use the fallback without calling share", async () => {
  const file = pngDataUrlToFile(png, "order.png");
  for (const value of [
    {},
    { share() { assert.fail("must check canShare"); } },
    { canShare: () => false, share() { assert.fail("unsupported file"); } },
    { canShare() { throw new Error("blocked"); }, share() { assert.fail("blocked file"); } },
  ]) await withNavigator(value, async () => {
    assert.equal(canSharePng(file), false);
    assert.equal(await sharePng(file), "unsupported");
  });
});

test("cancellation is silent while genuine share failures reach the UI", async () => {
  const file = pngDataUrlToFile(png, "order.png");
  for (const name of ["AbortError", "NotAllowedError", "DataError"]) {
    const error = new DOMException("share failed", name);
    await withNavigator({ canShare: () => true, share: () => Promise.reject(error) }, async () => {
      if (name === "AbortError") assert.equal(await sharePng(file), "cancelled");
      else await assert.rejects(sharePng(file), (actual) => actual === error);
    });
  }
});
