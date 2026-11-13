"use strict";
// Loads the rules block straight out of index.html, so the tests check the
// exact code that ships. Nothing is copied or built.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const INDEX = path.join(__dirname, "..", "index.html");

function logicSource() {
  const html = fs.readFileSync(INDEX, "utf8");
  const m = html.match(/<script id="forge-logic">([\s\S]*?)<\/script>/);
  if (!m) throw new Error("index.html has no <script id=\"forge-logic\"> block");
  return m[1];
}

function loadLogic() {
  const target = {};
  // Run in this realm (so deepStrictEqual sees ordinary objects) but hand the
  // block its own globalThis, so nothing leaks into Node's global scope.
  const fn = vm.runInThisContext("(function (globalThis) {" + logicSource() + "\n})", { filename: "index.html#forge-logic" });
  fn(target);
  if (!target.RokumonForgeLogic) throw new Error("forge-logic did not export RokumonForgeLogic");
  return target.RokumonForgeLogic;
}

// Deterministic random source (mulberry32) for repeatable simulations.
function seeded(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Every number a save can hold must be finite and in range.
function assertSane(L, s) {
  const problems = [];
  function check(label, v, lo, hi) {
    if (typeof v !== "number" || !Number.isFinite(v) || v < lo || v > hi) problems.push(label + "=" + v);
  }
  L.MATS.forEach((m) => check("mats." + m.id, s.mats[m.id], 0, L.MAX_AMOUNT));
  L.UPGRADES.forEach((u) => {
    check("upgrades." + u.id, s.upgrades[u.id], 0, u.max);
    if (!Number.isInteger(s.upgrades[u.id])) problems.push("upgrades." + u.id + " not integer");
  });
  check("prestige", s.prestige, 0, 1000);
  check("mastery", s.mastery, 0, 1e9);
  check("lifetimeValue", s.lifetimeValue, 0, L.MAX_AMOUNT);
  check("highestTier", s.highestTier, 0, 9);
  check("heat", s.heat, 0, 100);
  check("foldFrac", s.foldFrac, 0, 1);
  check("lastTick", s.lastTick, 0, 1e14);
  check("score", L.computeScore(s), 0, Number.MAX_SAFE_INTEGER);
  if (s.jobs.length > L.slots(s)) problems.push("too many jobs");
  s.jobs.forEach((j, i) => {
    const w = L.weaponById[j.id];
    if (!w) problems.push("job " + i + " unknown");
    else { check("job.progress", j.progress, 0, w.time + 1e-6); if (j.time !== w.time) problems.push("job.time"); }
  });
  if (s.pacts.length > L.pactSlots(s)) problems.push("too many pacts");
  s.pacts.forEach((p) => { if (!L.pactById[p.id]) problems.push("pact unknown"); check("pact.remaining", p.remaining, -1, 1e6); });
  if (s.rack.length > L.RACK_SIZE) problems.push("rack too long");
  s.rack.forEach((r) => { if (!L.weaponById[r.id] || !(r.quality in L.Q_RANK)) problems.push("rack item"); check("rack.value", r.value, 0, 1e12); });
  Object.keys(s.market.stock).forEach((k) => check("market." + k, s.market.stock[k], 0, 2));
  check("market.nextAt", s.market.nextAt, 0, 1e14);
  if (L.TABS.indexOf(s.tab) < 0) problems.push("tab");
  if (!L.weaponById[s.selected]) problems.push("selected");
  if (s.pinned !== null && !L.weaponById[s.pinned]) problems.push("pinned");
  return problems;
}

module.exports = { loadLogic, logicSource, seeded, assertSane, INDEX };
