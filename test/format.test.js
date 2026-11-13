"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic } = require("./load-logic");

const L = loadLogic();

test("fmt: small, thousands and suffixes", () => {
  const cases = [
    [0, "0"], [0.04, "0"], [1.25, "1.2"], [12, "12"], [99.96, "99.9"], [100, "100"],
    [9999.9, "9,999"], [10000, "10.0k"], [12345, "12.3k"], [999999, "999k"],
    [1e6, "1.00m"], [1.5e6, "1.50m"], [2.345e9, "2.34b"], [3e12, "3.00t"], [999.99e12, "999t"],
    [1e15, "1.00e15"], [1e300, "1.00e300"]
  ];
  for (const [n, want] of cases) assert.equal(L.fmt(n), want, String(n));
});

test("fmt never prints NaN, Infinity or a minus sign", () => {
  for (const n of [NaN, Infinity, -Infinity, -5, undefined, null, "abc", {}]) {
    const out = L.fmt(n);
    assert.equal(out, "0", String(n));
  }
});

test("fmtInt, fmtRate and fmtDur", () => {
  assert.equal(L.fmtInt(1234567), "1,234,567");
  assert.equal(L.fmtInt(5e12), "5.00t");
  assert.equal(L.fmtInt(NaN), "0");
  assert.equal(L.fmtRate(0), "+0/s");
  assert.equal(L.fmtRate(0.9), "+0.90/s");
  assert.equal(L.fmtRate(45.24), "+45.2/s");
  assert.equal(L.fmtRate(2e6), "+2.00m/s");
  assert.equal(L.fmtRate(NaN), "+0/s");
  assert.equal(L.fmtDur(0), "0s");
  assert.equal(L.fmtDur(75), "1m 15s");
  assert.equal(L.fmtDur(4 * 3600 + 61), "4h 1m");
  assert.equal(L.fmtDur(-3), "0s");
  assert.equal(L.fmtDur(NaN), "0s");
});

test("roman numerals stay readable at high prestige", () => {
  assert.equal(L.roman(0), "—");
  assert.equal(L.roman(4), "IV");
  assert.equal(L.roman(14), "XIV");
  assert.equal(L.roman(49), "XLIX");
  assert.equal(L.roman(1000), "M");
  assert.equal(L.roman(NaN), "—");
});

test("floating drift: a million tiny steps land on the exact total", () => {
  const s = L.defaultState(0);
  const c = L.makeCtx({ now: 0 });
  for (let i = 0; i < 100000; i++) L.simulate(s, 0.01, c);
  assert.ok(Math.abs(s.mats.satetsu - 900) < 1e-6, String(s.mats.satetsu));
});
