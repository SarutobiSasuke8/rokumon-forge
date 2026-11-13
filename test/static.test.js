"use strict";
// The shipped game must stay one self-contained file: no other origins, no
// tracking, no money.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { INDEX, logicSource } = require("./load-logic");

const html = fs.readFileSync(INDEX, "utf8");

test("no requests to other origins", () => {
  const urls = html.match(/\b(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}[^\s"'<>)]*/gi) || [];
  const allowed = urls.filter((u) => !/^(?:https?:)?\/\/www\.w3\.org\//i.test(u));
  assert.deepEqual(allowed, [], "only SVG namespace URLs may appear");
  for (const api of ["fetch(", "XMLHttpRequest", "WebSocket", "sendBeacon", "EventSource", "importScripts", "<iframe", "<link rel=\"stylesheet\"", "@import"]) {
    assert.equal(html.includes(api), false, api);
  }
});

test("the only external script is the same-origin hub bridge", () => {
  const srcs = [...html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ["/hub-bridge.js"]);
});

test("no analytics, ads or real-money prompts", () => {
  const lower = html.toLowerCase();
  for (const word of ["gtag", "google-analytics", "googletagmanager", "adsbygoogle", "doubleclick", "analytics", "in-app purchase", "buy now", "checkout", "paypal", "stripe", "credit card", "premium currency", "watch an ad"]) {
    assert.equal(lower.includes(word), false, word);
  }
  assert.equal(/[$€£]\s?\d/.test(html), false, "no prices");
});

test("the rules block touches no browser API", () => {
  const src = logicSource();
  for (const api of ["document.", "window.", "localStorage", "setTimeout", "setInterval", "requestAnimationFrame", "Date.now", "performance."]) {
    assert.equal(src.includes(api), false, api);
  }
});

test("the manifest still points at the single entry file", () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "game-hub-manifest.json"), "utf8"));
  assert.equal(m.slug, "rokumon-forge");
  assert.equal(m.title, "Rokumon Forge");
  assert.equal(m.runtime.entry, "/games/rokumon-forge/index.html");
  assert.ok(Buffer.byteLength(html) < m.delivery.budget.maxBundleBytes);
  const events = m.bridge.events.map((e) => e.name).sort();
  const ui = fs.readFileSync(INDEX, "utf8");
  const sent = [...ui.matchAll(/hubEvent\("([a-z-]+)"/g)].map((x) => x[1]);
  assert.deepEqual([...new Set(sent)].sort(), events, "every event sent is declared, and every declared event is sent");
});
