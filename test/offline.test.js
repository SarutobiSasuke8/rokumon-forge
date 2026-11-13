"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic, seeded, assertSane } = require("./load-logic");

const L = loadLogic();
const H = 3600;
const T0 = 1_700_000_000_000;

test("offline plan: capped, and slower than live play", () => {
  const s = L.defaultState(T0);
  const p = L.offlinePlan(s, 20 * H);
  assert.equal(p.counted, 4 * H);
  assert.equal(p.eff, 0.35);
  assert.equal(p.simSeconds, 4 * H * 0.35);
  assert.equal(p.capped, true);
  assert.equal(L.offlinePlan(s, 30 * 60).capped, false);
  assert.equal(L.offlinePlan(s, -50).counted, 0);
  assert.equal(L.offlinePlan(s, NaN).counted, 0);
});

test("offline gain equals the capped, scaled production and no more", () => {
  const s = L.defaultState(T0);
  const before = s.mats.satetsu;
  const report = L.runOffline(s, 20 * H, L.makeCtx({ now: T0, rng: seeded(1) }));
  const expected = 0.9 * 4 * H * 0.35;
  assert.ok(Math.abs(s.mats.satetsu - before - expected) < 1e-6, s.mats.satetsu + " vs " + expected);
  assert.equal(report.capped, true);
  assert.equal(report.counted, 4 * H);
  assert.ok(report.gained.satetsu > 0);

  const far = L.defaultState(T0);
  L.runOffline(far, 1e9, L.makeCtx({ now: T0 }));
  assert.ok(Math.abs(far.mats.satetsu - expected) < 1e-6, "a year away pays the same as the cap");
});

test("apprentices raise the cap to 12 hours at full efficiency", () => {
  const s = L.defaultState(T0);
  s.upgrades.apprentices = 10;
  L.runOffline(s, 48 * H, L.makeCtx({ now: T0 }));
  assert.ok(Math.abs(s.mats.satetsu - 0.9 * 12 * H) < 1e-3);
});

test("offline work finishes running jobs and pacts, keeps tending, starts no new pacts", () => {
  const s = L.defaultState(T0);
  s.upgrades.water = 1; s.auto = true; s.pinned = "tanto";
  s.mats.satetsu = 200; s.mats.sumi = 200;
  s.jobs.push({ id: "tanto", progress: 0, time: 7, uid: 2, auto: true });
  s.pacts.push({ id: "pilgrimage", remaining: 60, total: 120 });
  const r = L.runOffline(s, 2 * H, L.makeCtx({ now: T0, rng: seeded(3) }));
  assert.ok(r.blades > 1, "the pinned blade kept being forged");
  assert.equal(s.mats.spirit, 1);
  assert.equal(s.pacts.length, 0, "no runner leaves on its own");
  assert.deepEqual(assertSane(L, s), []);
});

test("wall clock: forward gaps count, backward ones do not pay twice", () => {
  const s = L.defaultState(T0);
  assert.equal(L.wallGap(s, T0 + 90_000), 90);
  L.markTime(s, T0 + 10 * H * 1000);           // player sets the clock 10 hours ahead
  assert.equal(L.wallGap(s, T0 + 60_000), 0);   // then winds it back
  L.markTime(s, T0 + 60_000);
  assert.equal(s.lastTick, T0 + 10 * H * 1000, "the high-water mark stays");
  assert.equal(L.wallGap(s, T0 + 10 * H * 1000 + 5000), 5, "only time past the mark counts");
});

test("wall clock: a save stamped far in the future is forgiven, not frozen", () => {
  const s = L.defaultState(T0);
  s.lastTick = T0 + 400 * 24 * H * 1000;
  assert.equal(L.wallGap(s, T0), 0);
  assert.equal(s.lastTick, T0);
  assert.equal(L.wallGap(s, T0 + 50_000), 50);
});

test("wall clock: garbage times never produce a gap", () => {
  const s = L.defaultState(T0);
  assert.equal(L.wallGap(s, NaN), 0);
  s.lastTick = undefined;
  assert.equal(L.wallGap(s, T0), 0);
  assert.equal(s.lastTick, T0);
});

test("offline catch-up of a long absence stays finite and bounded", () => {
  const s = L.defaultState(T0);
  s.prestige = 1000; s.mastery = 1e9;
  for (const u of L.UPGRADES) s.upgrades[u.id] = u.max;
  s.mats.satetsu = L.MAX_AMOUNT;
  L.runOffline(s, 1e12, L.makeCtx({ now: T0 }));
  assert.deepEqual(assertSane(L, s), []);
  assert.equal(s.mats.satetsu <= L.MAX_AMOUNT, true);
});
