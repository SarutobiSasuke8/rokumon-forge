"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic, seeded, assertSane } = require("./load-logic");
const { runGreedy } = require("./greedy");

const L = loadLogic();
const MIN = 60;
const HOURS = 6;

// Six hours of game time, one-second steps, from a fresh save. Idle (no
// strikes) is the slow case; two strikes a second is a lightly active player.
for (const strikes of [0, 2]) {
  for (const seed of [1, 2, 3]) {
    test(`greedy playthrough: ${HOURS}h, ${strikes} strikes/s, seed ${seed}`, () => {
      const r = runGreedy(L, { seconds: HOURS * 3600, strikesPerSecond: strikes, rng: seeded(seed), start: 1_700_000_000_000 });
      assert.equal(r.nonFinite, null, "no NaN, Infinity or negative stock at any second");
      assert.deepEqual(assertSane(L, r.state), []);
      // No dead end: something is bought, started or unlocked at least every 15 minutes.
      assert.ok(r.longestWait <= 15 * MIN, "longest wait " + (r.longestWait / MIN).toFixed(1) + " min");
      // The first ten minutes never stall for more than three.
      assert.ok(r.longestWaitFirstTenMinutes <= 3 * MIN, "early wait " + r.longestWaitFirstTenMinutes + " s");
      assert.ok(r.firstForge.tanto <= 60, "first blade inside a minute");
      assert.ok(r.milestones.tier4 <= 20 * MIN, "katana by 20 minutes");
      assert.ok(r.prestigeAt.length >= 1 && r.prestigeAt[0] <= 60 * MIN, "first rekindle inside an hour");
      // Every blade in the codex is reachable, including the prestige 2 claymore.
      for (const w of L.WEAPONS) assert.ok(w.id in r.firstForge, w.id + " never forged");
      assert.ok(L.computeScore(r.state) > 0);
    });
  }
}

test("long run: 48 hours of play stays finite and inside the clamps", () => {
  const r = runGreedy(L, { seconds: 48 * 3600, dt: 2, strikesPerSecond: 0, rng: seeded(9), start: 1_700_000_000_000 });
  assert.equal(r.nonFinite, null);
  assert.deepEqual(assertSane(L, r.state), []);
  assert.ok(r.state.prestige > 5);
});
