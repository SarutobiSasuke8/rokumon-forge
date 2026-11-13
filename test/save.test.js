"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { loadLogic, seeded, assertSane } = require("./load-logic");

const L = loadLogic();
const T0 = 1_700_000_000_000;

function playedState() {
  const s = L.defaultState(T0);
  const c = L.makeCtx({ now: T0 + 1000, rng: seeded(11) });
  s.mats.satetsu = 2000; s.mats.sumi = 1000; s.mats.urushi = 50; s.mats.whetstone = 40;
  L.buyUpgrade(s, "bellows", c);
  L.buyUpgrade(s, "water", c);
  L.startForge(s, "tanto", c);
  L.simulate(s, 10, c);
  L.startForge(s, "wakizashi", c);
  L.startPact(s, "pilgrimage", c);
  L.simulate(s, 3, c);
  L.fold(s, 5, c);
  s.welcomed = true; s.mute = true; s.tab = "ledger"; s.selected = "katana";
  L.markTime(s, T0 + 20_000);
  return s;
}

test("save round-trip keeps everything except live heat", () => {
  const s = playedState();
  s.heat = 0;
  const out = L.parseSave(L.serialize(s), T0 + 20_000);
  assert.equal(out.status, "loaded");
  assert.equal(out.fixes, 0, "a clean save needs no repair");
  assert.deepEqual(JSON.parse(L.serialize(out.state)), JSON.parse(L.serialize(s)));
});

test("heat does not survive a reload", () => {
  const s = playedState();
  s.heat = 80;
  assert.equal(L.parseSave(L.serialize(s), T0).state.heat, 0);
});

test("a version 1 save (the first release) loads and is migrated", () => {
  const s = playedState();
  const v1 = JSON.parse(L.serialize(s));
  v1.v = 1;
  delete v1.heat;
  v1.jobs.forEach((j) => delete j.auto);
  v1.pinned = "tanto";
  const out = L.parseSave(JSON.stringify(v1), T0);
  assert.equal(out.status, "loaded");
  assert.equal(out.migrated, true);
  assert.equal(out.state.v, 2);
  assert.equal(out.state.upgrades.bellows, 1);
  assert.equal(out.state.jobs.length, 1);
  assert.deepEqual(assertSane(L, out.state), []);
});

test("a v1 save hit by the NaN heat bug loses no materials", () => {
  // What the first release wrote after a job got stuck: heat and progress null.
  const raw = JSON.stringify({ v: 1, mats: { satetsu: 12, sumi: 8 }, heat: null, jobs: [{ id: "tanto", progress: null, time: 7, uid: 2 }], welcomed: true, lastTick: T0 });
  const out = L.parseSave(raw, T0);
  assert.equal(out.status, "loaded");
  assert.equal(out.state.jobs.length, 1, "the stuck job is kept, restarted from zero");
  assert.equal(out.state.jobs[0].progress, 0);
  assert.equal(out.state.heat, 0);
});

test("unreadable saves start a fresh forge and say so", () => {
  for (const raw of ["{", "not json", "null", "[]", "42", "\"text\"", "true", "{\"v\":99}", "{\"v\":\"1\"}", "{}"]) {
    const out = L.parseSave(raw, T0);
    assert.equal(out.status, "reset", raw);
    assert.deepEqual(assertSane(L, out.state), [], raw);
    assert.equal(out.state.lastTick, T0);
  }
  assert.equal(L.parseSave(null, T0).status, "fresh");
  assert.equal(L.parseSave("", T0).status, "fresh");
});

test("tampered values are clamped, never trusted", () => {
  const bad = {
    v: 2,
    mats: { satetsu: "1e999", sumi: -50, urushi: 1e300, whetstone: null, tamahagane: NaN, spirit: "5", silk: {}, scale: 3.5, gold: 1e9 },
    upgrades: { bellows: 9999, lacquer: -3, wheel: "7", folder: 2.7, apprentices: Infinity, water: 1, heart: null, bell: 12, hack: 5 },
    forged: { tanto: 3, katana: -1, nope: 50, wakizashi: "2" },
    best: { tanto: "mythic", katana: "legendary" },
    retired: [],
    rack: [null, 5, { uid: 3, id: "tanto", quality: "fine", value: 1e300 }, { uid: 4, id: "x", quality: "fine" }, { uid: 5, id: "tanto", quality: "godly" }],
    jobs: [{ id: "tanto", progress: 1e9, time: 0.001, uid: 6 }, { id: "tanto", progress: 1, time: 7, uid: 7 }, { id: "tanto", progress: 1, time: 7, uid: 8 }],
    pacts: [{ id: "pilgrimage", remaining: -5, total: 1e9 }, { id: "pilgrimage", remaining: 5, total: 10 }, { id: "nope", remaining: 1 }],
    market: { nextAt: 1e300, stock: { spirit: 1e6, silk: -1, scale: "x" } },
    prestige: 1e308, mastery: -5, lifetimeValue: "lots", highestTier: 99,
    pinned: "excalibur", selected: { a: 1 }, auto: "yes", tab: "<script>", welcomed: 1, mute: "true",
    heat: 1e9, runStart: -1, lastTick: "now", journal: [null, { t: "x", text: 5 }, { t: 1, text: "ok" }],
    stats: { forgedTotal: -1, strikes: 1e20 }, run: { bestTier: 50, legendRetires: "many" },
    uid: -7, foldFrac: 99
  };
  const out = L.parseSave(JSON.stringify(bad), T0);
  assert.equal(out.status, "loaded");
  assert.ok(out.fixes > 10);
  const s = out.state;
  assert.deepEqual(assertSane(L, s), []);
  assert.equal(s.mats.satetsu, 0);
  assert.equal(s.mats.sumi, 0);
  assert.equal(s.mats.urushi, L.MAX_AMOUNT);
  assert.equal(s.mats.spirit, 0, "numeric strings are not numbers");
  assert.equal(s.mats.scale, 3.5);
  assert.equal("gold" in s.mats, false);
  assert.equal(s.upgrades.bellows, 25);
  assert.equal(s.upgrades.lacquer, 0);
  assert.equal(s.upgrades.wheel, 0);
  assert.equal(s.upgrades.folder, 2);
  assert.equal(s.upgrades.apprentices, 0);
  assert.equal("hack" in s.upgrades, false);
  assert.deepEqual(s.forged, { tanto: 3 });
  assert.deepEqual(s.best, {}, "unknown quality dropped; best needs a forged blade");
  assert.equal(s.rack.length, 1);
  assert.ok(s.rack[0].value < 1e6);
  assert.equal(s.jobs.length, 1, "one anvil without apprentices");
  assert.equal(s.jobs[0].time, 7, "job time comes from the table, not the save");
  assert.equal(s.jobs[0].progress, 7);
  assert.equal(s.pacts.length, 1);
  assert.ok(s.pacts[0].total <= 120);
  assert.equal(s.market.nextAt, T0 + L.MARKET_INTERVAL);
  assert.deepEqual(s.market.stock, { spirit: 2, silk: 0, scale: 1 });
  assert.equal(s.prestige, 1000);
  assert.equal(s.mastery, 0);
  assert.equal(s.lifetimeValue, 0);
  assert.equal(s.highestTier, 1, "derived from the codex");
  assert.equal(s.pinned, "tanto");
  assert.equal(s.selected, "tanto");
  assert.equal(s.auto, false);
  assert.equal(s.tab, "arms");
  assert.equal(s.welcomed, false);
  assert.equal(s.mute, false);
  assert.equal(s.heat, 0);
  assert.equal(s.foldFrac, 1);
  assert.deepEqual(s.journal, [{ t: 1, text: "ok" }]);
  assert.equal(s.run.bestTier, 9);
  assert.ok(s.uid >= 6);
  assert.ok(Number.isFinite(L.computeScore(s)));
});

test("prototype keys in a save do nothing", () => {
  const raw = '{"v":2,"mats":{"__proto__":{"satetsu":999},"constructor":5},"upgrades":{"__proto__":{"bellows":25}},"forged":{"__proto__":{"tanto":1}}}';
  const s = L.parseSave(raw, T0).state;
  assert.equal(s.mats.satetsu, 0);
  assert.equal(s.upgrades.bellows, 0);
  assert.equal(s.forged.tanto, undefined);
  assert.equal({}.satetsu, undefined, "Object.prototype untouched");
  assert.deepEqual(assertSane(L, s), []);
});

test("fuzz: 600 randomly corrupted saves all load into a sane, playable state", () => {
  const rnd = seeded(2026);
  const base = JSON.parse(L.serialize(playedState()));
  const junk = [null, -1, 0, 1e308, -1e308, "x", "", true, [], {}, [1, 2], { a: 1 }, 2.5, "1e999", 9007199254740993];
  function mutate(o, depth) {
    if (Array.isArray(o)) return o.map((v) => (rnd() < 0.3 ? junk[Math.floor(rnd() * junk.length)] : mutate(v, depth + 1)));
    if (o && typeof o === "object") {
      const out = {};
      for (const k of Object.keys(o)) {
        const r = rnd();
        if (r < 0.08) continue;
        out[k] = r < 0.3 ? junk[Math.floor(rnd() * junk.length)] : mutate(o[k], depth + 1);
      }
      return out;
    }
    return rnd() < 0.2 ? junk[Math.floor(rnd() * junk.length)] : o;
  }
  for (let i = 0; i < 600; i++) {
    const m = mutate(base, 0);
    if (m && typeof m === "object") m.v = rnd() < 0.5 ? 1 : 2;
    const out = L.parseSave(JSON.stringify(m), T0);
    const s = out.state;
    assert.deepEqual(assertSane(L, s), [], "case " + i);
    // and it keeps working for a while, including offline catch-up
    const c = L.makeCtx({ now: T0, rng: rnd });
    L.simulate(s, 30, c);
    L.runOffline(s, 3600, c);
    L.strike(s, c);
    L.startForge(s, L.nextWeapon(s).id, c);
    assert.deepEqual(assertSane(L, s), [], "case " + i + " after play");
  }
});
