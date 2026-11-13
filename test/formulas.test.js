"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic, seeded } = require("./load-logic");

const L = loadLogic();

test("upgrade costs match the documented bases and grow every level", () => {
  assert.deepEqual(L.upgradeCost("bellows", 0), { satetsu: 18 });
  assert.deepEqual(L.upgradeCost("bellows", 1), { satetsu: 27 });
  assert.deepEqual(L.upgradeCost("lacquer", 0), { satetsu: 28, sumi: 12 });
  assert.deepEqual(L.upgradeCost("heart", 0), { satetsu: 36, whetstone: 4 });
  assert.deepEqual(L.upgradeCost("bell", 4), { sumi: Math.floor(26 * Math.pow(1.52, 4)), spirit: 1 });
  for (const u of L.UPGRADES) {
    let prev = 0;
    for (let lv = 0; lv < u.max; lv++) {
      const c = L.upgradeCost(u.id, lv);
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      assert.ok(Number.isFinite(total) && total > 0, u.id + " " + lv);
      assert.ok(total >= prev, u.id + " cost never falls");
      for (const v of Object.values(c)) assert.ok(Number.isInteger(v), "integer costs");
      prev = total;
    }
    assert.equal(L.upgradeCost(u.id, u.max), null, u.id + " has no cost past max");
  }
});

test("production rates on a fresh forge and with upgrades", () => {
  const s = L.defaultState(0);
  const r = L.rates(s);
  assert.equal(r.satetsu, 0.9);
  assert.equal(r.sumi, 0.55);
  assert.equal(r.urushi, 0.03);
  assert.equal(r.whetstone, 0.018);
  assert.equal(r.tamahagane, 0);
  s.upgrades.bellows = 10;
  s.upgrades.folder = 5;
  const r2 = L.rates(s);
  assert.ok(Math.abs(r2.satetsu - (0.9 + 4.8)) < 1e-9);
  assert.ok(Math.abs(r2.tamahagane - 0.06) < 1e-9);
});

test("global multiplier: +15% per prestige, mastery capped at +100%", () => {
  const s = L.defaultState(0);
  assert.equal(L.globalMult(s), 1);
  s.prestige = 2;
  assert.ok(Math.abs(L.globalMult(s) - 1.3) < 1e-9);
  s.mastery = 100;
  assert.ok(Math.abs(L.globalMult(s) - 1.55) < 1e-9);
  s.mastery = 1e9;
  assert.ok(Math.abs(L.globalMult(s) - 2.3) < 1e-9, "mastery bonus caps at 1");
});

test("offline cap and efficiency follow apprentices", () => {
  const s = L.defaultState(0);
  assert.equal(L.offlineCapSeconds(s), 4 * 3600);
  assert.equal(L.offlineEff(s), 0.35);
  s.upgrades.apprentices = 10;
  assert.equal(L.offlineCapSeconds(s), 12 * 3600);
  assert.equal(L.offlineEff(s), 1);
});

test("anvil and runner slots", () => {
  const s = L.defaultState(0);
  assert.equal(L.slots(s), 1);
  s.upgrades.apprentices = 4;
  assert.equal(L.slots(s), 2);
  s.upgrades.apprentices = 8;
  assert.equal(L.slots(s), 3);
  assert.equal(L.pactSlots(s), 1);
  s.upgrades.bell = 5;
  assert.equal(L.pactSlots(s), 2);
});

test("quench speed: heat adds up to 1.71x live, never offline", () => {
  const s = L.defaultState(0);
  s.heat = 100;
  assert.ok(Math.abs(L.forgeSpeed(s, false) - (1 + 100 / 140)) < 1e-9);
  assert.equal(L.forgeSpeed(s, true), 1);
  s.heat = NaN;
  assert.equal(L.forgeSpeed(s, false), 1, "a bad heat value cannot poison the speed");
});

test("quality thresholds and value", () => {
  assert.equal(L.qualityFromRoll(0), "crude");
  assert.equal(L.qualityFromRoll(38), "serviceable");
  assert.equal(L.qualityFromRoll(68), "fine");
  assert.equal(L.qualityFromRoll(90), "masterwork");
  assert.equal(L.qualityFromRoll(112), "legendary");
  const s = L.defaultState(0);
  assert.equal(L.rollQuality(s, 0, () => 0), "crude");
  assert.equal(L.rollQuality(s, 0, () => 0.99), "masterwork");
  assert.equal(L.rollQuality(s, 0, () => NaN), "crude", "a broken random source is treated as 0");
  s.prestige = 2;
  assert.equal(L.quenchValue(s, L.weaponById.katana, "fine"), Math.round(280 * 1.55 * 1.1));
});

test("mastery from retiring and the score formula", () => {
  assert.equal(L.masteryGain({ id: "tanto", quality: "crude" }), 0);
  assert.equal(L.masteryGain({ id: "tanto", quality: "serviceable" }), 1);
  assert.equal(L.masteryGain({ id: "katana", quality: "masterwork" }), 4 + 2);
  assert.equal(L.masteryGain({ id: "claymore", quality: "legendary" }), 8 + 4);
  assert.equal(L.masteryGain({ id: "nope", quality: "legendary" }), 0);
  const s = L.defaultState(0);
  s.lifetimeValue = 1000.7; s.prestige = 1; s.highestTier = 4; s.mastery = 10;
  assert.equal(L.computeScore(s), Math.floor(1000.7 + 1000 + 100 + 150));
});

test("frame rate does not change the outcome", () => {
  function run(frameSeconds) {
    const s = L.defaultState(0);
    s.upgrades.bellows = 3; s.upgrades.folder = 4; s.upgrades.lacquer = 2; s.upgrades.wheel = 2;
    s.mats.satetsu = 500; s.mats.sumi = 300;
    s.jobs.push({ id: "tanto", progress: 0, time: 7, uid: 2, auto: false });
    s.heat = 0;
    const total = 120;
    let done = 0;
    const ctx = L.makeCtx({ now: 0, rng: () => 0.5 });
    while (done < total - 1e-9) {
      const dt = Math.min(frameSeconds, total - done);
      L.simulate(s, dt, ctx);
      done += dt;
    }
    return s;
  }
  const a = run(1 / 30), b = run(1 / 144), c = run(1 / 7), d = run(120);
  for (const other of [b, c, d]) {
    for (const k of ["satetsu", "sumi", "urushi", "whetstone", "tamahagane"]) {
      assert.ok(Math.abs(a.mats[k] - other.mats[k]) < 1e-6 * Math.max(1, a.mats[k]), k + " " + a.mats[k] + " vs " + other.mats[k]);
    }
    assert.equal(a.stats.forgedTotal, other.stats.forgedTotal);
  }
});

test("heat cools in real time and never goes negative or NaN", () => {
  const s = L.defaultState(0);
  const ctx = L.makeCtx({ now: 0, rng: seeded(1) });
  for (let i = 0; i < 20; i++) L.strike(s, ctx);
  assert.equal(s.heat, 100);
  L.simulate(s, 3, ctx);
  assert.ok(Math.abs(s.heat - (100 - 5.5 * 3)) < 1e-9);
  L.simulate(s, 1000, ctx);
  assert.equal(s.heat, 0);
  delete s.heat; // an old save without the field
  L.simulate(s, 1, ctx);
  assert.equal(s.heat, 0);
});

test("a fresh forge can quench its first blade in one session", () => {
  // Regression: heat started undefined, became NaN on the first frame, and no
  // job could ever finish until the page was reloaded (which then dropped it).
  const s = L.defaultState(0);
  const ctx = L.makeCtx({ now: 0, rng: seeded(2) });
  L.simulate(s, 1 / 60, ctx);
  assert.ok(Number.isFinite(s.heat));
  s.mats.satetsu = 30; s.mats.sumi = 20;
  assert.ok(L.startForge(s, "tanto", ctx, false).ok);
  for (let i = 0; i < 60 * 10; i++) L.simulate(s, 1 / 60, ctx);
  assert.equal(s.forged.tanto, 1);
  assert.equal(s.jobs.length, 0);
});
