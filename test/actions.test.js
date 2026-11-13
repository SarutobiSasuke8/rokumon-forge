"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic, seeded, assertSane } = require("./load-logic");

const L = loadLogic();
const ctx = () => L.makeCtx({ now: 1_700_000_000_000, rng: seeded(7) });

test("buying an upgrade spends exactly its cost, once", () => {
  const s = L.defaultState(0);
  s.mats.satetsu = 30;
  const c = ctx();
  const r = L.buyUpgrade(s, "bellows", c);
  assert.equal(r.ok, true);
  assert.equal(s.upgrades.bellows, 1);
  assert.equal(s.mats.satetsu, 12);
  assert.deepEqual(c.events.map((e) => e.type), ["upgraded"]);
  const again = L.buyUpgrade(s, "bellows", c);
  assert.equal(again.ok, false);
  assert.equal(again.reason, "Short on materials");
  assert.equal(s.upgrades.bellows, 1);
  assert.equal(s.mats.satetsu, 12);
});

test("hammering buy many times never goes negative and stops at max", () => {
  const s = L.defaultState(0);
  s.mats.satetsu = 1e12; s.mats.sumi = 1e12; s.mats.whetstone = 1e6; s.mats.spirit = 100;
  const c = ctx();
  for (const u of L.UPGRADES) for (let i = 0; i < u.max + 50; i++) L.buyUpgrade(s, u.id, c);
  for (const u of L.UPGRADES) assert.equal(s.upgrades[u.id], u.max);
  assert.deepEqual(assertSane(L, s), []);
  const poor = L.defaultState(0);
  poor.mats.satetsu = 18;
  for (let i = 0; i < 100; i++) L.buyUpgrade(poor, "bellows", c);
  assert.equal(poor.upgrades.bellows, 1);
  assert.equal(poor.mats.satetsu, 0);
});

test("unknown ids are refused without throwing", () => {
  const s = L.defaultState(0);
  const c = ctx();
  assert.equal(L.buyUpgrade(s, "__proto__", c).ok, false);
  assert.equal(L.startForge(s, "constructor", c).ok, false);
  assert.equal(L.startPact(s, "toString", c).ok, false);
  assert.equal(L.buyMarket(s, "nope", c).ok, false);
  assert.equal(L.togglePin(s, "nope").ok, false);
  assert.deepEqual(assertSane(L, s), []);
});

test("forging respects requirements, cost and anvil slots", () => {
  const s = L.defaultState(0);
  const c = ctx();
  assert.equal(L.startForge(s, "wakizashi", c).reason, "Forge a Tanto");
  assert.equal(L.startForge(s, "jian", c).reason, "Prestige I");
  assert.equal(L.startForge(s, "tanto", c).reason, "Short on materials");
  s.mats.satetsu = 100; s.mats.sumi = 100;
  assert.equal(L.startForge(s, "tanto", c).ok, true);
  assert.equal(s.mats.satetsu, 78);
  assert.equal(s.mats.sumi, 88);
  assert.equal(L.startForge(s, "tanto", c).reason, "The anvil is occupied");
  assert.equal(s.mats.satetsu, 78, "a refused forge spends nothing");
  s.upgrades.apprentices = 4;
  assert.equal(L.startForge(s, "shuriken", c).ok, true);
  assert.equal(s.jobs.length, 2);
});

test("a finished quench records codex, rack, value and best quality", () => {
  const s = L.defaultState(0);
  s.mats.satetsu = 100; s.mats.sumi = 100;
  const c = L.makeCtx({ now: 5, rng: () => 0.99 });
  L.startForge(s, "tanto", c);
  L.simulate(s, 7, c);
  assert.equal(s.forged.tanto, 1);
  assert.equal(s.rack.length, 1);
  assert.equal(s.rack[0].quality, "masterwork");
  assert.equal(s.best.tanto, "masterwork");
  assert.equal(s.lifetimeValue, Math.round(20 * 2.4));
  assert.equal(s.highestTier, 1);
  const forged = c.events.filter((e) => e.type === "forged");
  assert.equal(forged.length, 1);
  assert.equal(forged[0].first, true);
});

test("strikes speed the job on the anvil, or sift sand when it is empty", () => {
  const s = L.defaultState(0);
  const c = ctx();
  L.strike(s, c);
  assert.equal(s.mats.satetsu, 1.05);
  assert.equal(s.heat, 13);
  s.mats.satetsu = 200; s.mats.sumi = 50;
  L.strike(s, c);
  assert.ok(Math.abs(s.mats.satetsu - (200 + 1.05 * 0.35)) < 1e-9, "sifting is damped above 180");
  s.mats.satetsu = 500;
  L.strike(s, c);
  assert.equal(s.mats.satetsu, 500, "no sifting at 400 or more");
  L.startForge(s, "tanto", c);
  const before = s.jobs[0].progress;
  L.strike(s, c);
  assert.ok(s.jobs[0].progress > before);
});

test("folding converts 36 sand and 22 coal per bar", () => {
  const s = L.defaultState(0);
  const c = ctx();
  assert.equal(L.fold(s, 1, c).ok, false);
  s.mats.satetsu = 100; s.mats.sumi = 100;
  assert.equal(L.fold(s, 99, c).n, 2);
  assert.equal(s.mats.tamahagane, 2);
  assert.equal(s.mats.satetsu, 28);
  assert.equal(s.mats.sumi, 56);
});

test("folding hammers never fold without the sand and coal", () => {
  const s = L.defaultState(0);
  s.upgrades.folder = 20;
  const c = ctx();
  L.simulate(s, 60, c);
  assert.ok(s.mats.satetsu >= 0 && s.mats.sumi >= 0);
  assert.ok(s.foldFrac <= 1);
  assert.deepEqual(assertSane(L, s), []);
});

test("pacts: one runner, no duplicates, gated scale hunt, returns metal", () => {
  const s = L.defaultState(0);
  const c = ctx();
  assert.equal(L.startPact(s, "scale", c).ok, false);
  assert.equal(L.startPact(s, "pilgrimage", c).ok, true);
  assert.equal(L.startPact(s, "pilgrimage", c).reason, "Already on the road");
  assert.equal(L.startPact(s, "silk", c).reason, "Every runner is already out");
  L.simulate(s, 121, c);
  assert.equal(s.mats.spirit, 1);
  assert.equal(s.pacts.length, 0);
  assert.ok(c.events.some((e) => e.type === "pact" && e.material === "spirit"));
});

test("night market: stock, cost and restock on its interval", () => {
  const now = 1_000_000;
  const s = L.defaultState(now);
  const c = L.makeCtx({ now });
  s.mats.satetsu = 1000;
  assert.equal(L.buyMarket(s, "spirit", c).ok, true);
  assert.equal(L.buyMarket(s, "spirit", c).ok, true);
  assert.equal(L.buyMarket(s, "spirit", c).reason, "Sold for this watch");
  assert.equal(s.mats.spirit, 2);
  assert.equal(s.mats.satetsu, 240);
  assert.equal(L.refreshMarket(s, now + 1000, c), false);
  assert.equal(L.refreshMarket(s, now + L.MARKET_INTERVAL * 3 + 5, c), true);
  assert.equal(s.market.stock.spirit, 2);
  assert.ok(s.market.nextAt > now + L.MARKET_INTERVAL * 3 + 5);
  assert.ok(s.market.nextAt <= now + L.MARKET_INTERVAL * 4 + 5);
});

test("retiring grants mastery; crude blades are only set aside", () => {
  const s = L.defaultState(0);
  const c = ctx();
  s.rack = [
    { uid: 2, id: "katana", quality: "fine", value: 1, at: 0 },
    { uid: 3, id: "tanto", quality: "crude", value: 1, at: 0 },
    { uid: 4, id: "naginata", quality: "legendary", value: 1, at: 0 }
  ];
  assert.equal(L.retire(s, 3, c).gain, 0);
  assert.equal(L.retire(s, 2, c).gain, 4);
  assert.equal(L.retire(s, 2, c).ok, false, "a blade cannot be retired twice");
  assert.equal(s.run.legendRetires, 0);
  assert.equal(L.retireAll(s, c).gain, 8 + 2);
  assert.equal(s.mastery, 14);
  assert.equal(s.run.legendRetires, 1);
  assert.equal(L.canPrestige(s), true);
});

test("rekindle: refused until earned, then resets the run and keeps what it should", () => {
  const s = L.defaultState(0);
  const c = L.makeCtx({ now: 50_000 });
  assert.equal(L.prestige(s, c).ok, false);
  s.run.bestTier = 6;
  s.mats.satetsu = 999; s.mats.tamahagane = 40; s.mats.spirit = 3; s.mats.silk = 2; s.mats.scale = 1;
  s.upgrades.bellows = 9; s.forged.tachi = 1; s.highestTier = 6; s.mastery = 10; s.lifetimeValue = 5000;
  s.rack = [{ uid: 9, id: "tachi", quality: "fine", value: 1, at: 0 }];
  s.jobs = [{ id: "tanto", progress: 1, time: 7, uid: 10, auto: false }];
  s.pacts = [{ id: "silk", remaining: 30, total: 180 }];
  s.auto = true;
  const r = L.prestige(s, c);
  assert.equal(r.ok, true);
  assert.equal(s.prestige, 1);
  assert.equal(s.mats.satetsu, 0);
  assert.equal(s.mats.tamahagane, 0);
  assert.deepEqual([s.mats.spirit, s.mats.silk, s.mats.scale], [3, 2, 1]);
  assert.equal(s.upgrades.bellows, 0);
  assert.equal(s.forged.tachi, 1, "codex stays");
  assert.equal(s.mastery, 10 + 2 + 3, "rack banked first");
  assert.equal(s.lifetimeValue, 5000);
  assert.deepEqual([s.jobs.length, s.pacts.length, s.rack.length, s.auto], [0, 0, 0, false]);
  assert.deepEqual(s.run, { bestTier: 0, legendRetires: 0 });
  assert.equal(L.canPrestige(s), false, "each firing earns its own rekindle");
  assert.equal(L.needMet(s, L.weaponById.jian).ok, true, "outland armoury opens");
  assert.equal(L.needMet(s, L.weaponById.claymore).ok, false);
  const ev = c.events.find((e) => e.type === "prestige");
  assert.equal(ev.level, 1);
  assert.equal(ev.durationMs, 50_000);
});

test("tending a pinned blade needs the water wheel and refills the anvil", () => {
  const s = L.defaultState(0);
  const c = ctx();
  assert.equal(L.setAuto(s, true, c).ok, false);
  assert.equal(s.auto, false);
  s.upgrades.water = 1;
  s.mats.satetsu = 100; s.mats.sumi = 100;
  L.togglePin(s, "tanto");
  assert.equal(s.pinned, null, "toggling the default pin clears it");
  L.togglePin(s, "tanto");
  assert.equal(L.setAuto(s, true, c).ok, true);
  assert.equal(s.jobs.length, 1);
  assert.equal(s.jobs[0].auto, true);
  L.simulate(s, 8, c);
  assert.equal(s.forged.tanto, 1);
  assert.equal(s.jobs.length, 1, "it started the next one");
});

test("courier grants: aliases, caps, rate limit and only catalogue metals", () => {
  const s = L.defaultState(0);
  const times = [];
  const c = L.makeCtx({ now: 100_000 });
  assert.equal(L.grantMaterial(s, "Spirit-Iron", 3, "rokumon-sudoku", c, times).ok, true);
  assert.equal(s.mats.spirit, 3);
  assert.equal(L.grantMaterial(s, "tsukuyomi", 1000, "x", c, times).amount, 25);
  assert.equal(L.grantMaterial(s, "satetsu", 5, "x", c, times).error, "unknown material");
  assert.equal(L.grantMaterial(s, "__proto__", 5, "x", c, times).error, "unknown material");
  assert.equal(L.grantMaterial(s, "scale", -1, "x", c, times).error, "bad amount");
  assert.equal(L.grantMaterial(s, "scale", "NaN", "x", c, times).error, "bad amount");
  assert.equal(L.grantMaterial(s, "scale", Infinity, "x", c, times).error, "bad amount");
  const r = L.grantMaterial(s, "scale", 1, "<img onerror=alert(1)>", c, times);
  assert.equal(r.source, "img onerroralert1");
  for (let i = 0; i < 20; i++) L.grantMaterial(s, "scale", 1, "x", c, times);
  assert.equal(times.length, L.GRANT_PER_MINUTE);
  assert.equal(L.grantMaterial(s, "scale", 1, "x", c, times).error, "rate limited");
  const later = L.makeCtx({ now: 100_000 + 61_000 });
  assert.equal(L.grantMaterial(s, "scale", 1, "x", later, times).ok, true);
  assert.equal(s.mats.satetsu, 0);
});

test("the suggestion moves on from the default pin once it is forged", () => {
  const s = L.defaultState(0);
  assert.equal(L.nextWeapon(s).id, "tanto");
  s.forged.tanto = 1;
  s.mats.satetsu = 50; s.mats.sumi = 50;
  assert.equal(L.nextWeapon(s).id, "shuriken");
  s.forged.shuriken = 1;
  assert.equal(L.nextWeapon(s).id, "wakizashi");
});
