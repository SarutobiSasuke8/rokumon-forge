"use strict";
// A simple greedy player, driven only through the game's own rule functions.
// It is not clever: it forges the next new blade it can, folds steel when that
// blade needs it, keeps runners out, trades at the night market for missing
// catalogue metals, buys the cheapest workshop level it can spare, retires the
// rack for mastery and rekindles as soon as it is allowed.

function costSize(cost) {
  return Object.keys(cost).reduce((t, k) => t + cost[k], 0);
}

function runGreedy(L, opts) {
  const o = Object.assign({ seconds: 6 * 3600, dt: 1, strikesPerSecond: 0, seed: 1, rng: Math.random, start: 0 }, opts || {});
  const s = L.defaultState(o.start);
  const out = {
    milestones: {},       // event name -> first game second
    firstForge: {},       // weapon id -> first game second
    prestigeAt: [],
    upgradesBought: {},
    longestWait: 0,        // longest stretch with no purchase, forge start or unlock
    longestWaitEndsAt: 0,
    longestWaitFirstTenMinutes: 0,
    nonFinite: null,
    state: s
  };
  let lastProgress = 0;
  let now = o.start;
  function progress(t) {
    const wait = t - lastProgress;
    if (wait > out.longestWait) { out.longestWait = wait; out.longestWaitEndsAt = t; }
    if (t <= 600 && wait > out.longestWaitFirstTenMinutes) out.longestWaitFirstTenMinutes = wait;
    lastProgress = t;
  }
  function mark(name, t) { if (!(name in out.milestones)) out.milestones[name] = t; }

  for (let t = 0; t < o.seconds; t += o.dt) {
    now = o.start + t * 1000;
    const ctx = L.makeCtx({ now, rng: o.rng });

    // Active play: strikes heat the quench and, on an empty anvil, sift sand.
    for (let k = 0; k < o.strikesPerSecond * o.dt; k++) L.strike(s, ctx);
    L.simulate(s, o.dt, ctx);
    L.refreshMarket(s, now, ctx);

    const target = L.nextWeapon(s);
    // Fold only what the target still needs.
    if (target.cost.tamahagane) {
      const lack = Math.ceil(target.cost.tamahagane - L.have(s, "tamahagane"));
      if (lack > 0) L.fold(s, Math.min(lack, L.foldsAvailable(s)), ctx);
    }
    if (L.needMet(s, target).ok && L.startForge(s, target.id, ctx, false).ok) progress(t);

    // Once the water wheel turns, tend the most valuable open blade we can make.
    if (s.upgrades.water >= 1) {
      const open = L.WEAPONS.filter((w) => L.needMet(s, w).ok && (s.forged[w.id] || 0) > 0);
      open.sort((a, b) => b.value - a.value);
      const pick = open.find((w) => !w.cost.spirit && !w.cost.silk && !w.cost.scale) || open[open.length - 1];
      if (pick && s.pinned !== pick.id) s.pinned = pick.id;
      if (!s.auto) L.setAuto(s, true, ctx);
    }

    L.PACTS.forEach((p) => { if (L.pactOpen(s, p)) L.startPact(s, p.id, ctx); });

    ["spirit", "silk", "scale"].forEach((m) => {
      if ((target.cost[m] || 0) > L.have(s, m)) L.buyMarket(s, m, ctx);
    });

    // Cheapest affordable workshop level that leaves enough for the target.
    let best = null;
    L.UPGRADES.forEach((u) => {
      const c = L.upgradeCost(u.id, s.upgrades[u.id]);
      if (!c || !L.canAfford(s, c)) return;
      const spare = Object.keys(c).every((k) => !target.cost[k] || L.have(s, k) - c[k] >= 0.5 * L.have(s, k) || L.have(s, k) - c[k] >= target.cost[k]);
      if (!spare) return;
      if (!best || costSize(c) < best.size) best = { id: u.id, size: costSize(c) };
    });
    if (best && L.buyUpgrade(s, best.id, ctx).ok) {
      out.upgradesBought[best.id] = (out.upgradesBought[best.id] || 0) + 1;
      progress(t);
    }

    if (s.rack.length >= 12) L.retireAll(s, ctx, false);
    if (L.canPrestige(s)) {
      L.retireAll(s, ctx, true);
      if (L.prestige(s, ctx).ok) { out.prestigeAt.push(t); mark("prestige" + s.prestige, t); progress(t); }
    }

    ctx.events.forEach((ev) => {
      if (ev.type === "forged" && ev.first) { if (!(ev.id in out.firstForge)) out.firstForge[ev.id] = t; mark("tier" + ev.tier, t); progress(t); }
      if (ev.type === "traded") progress(t);
    });

    if (!out.nonFinite) {
      const bad = [];
      L.MATS.forEach((m) => { if (!Number.isFinite(s.mats[m.id]) || s.mats[m.id] < 0) bad.push(m.id); });
      if (!Number.isFinite(s.lifetimeValue) || !Number.isFinite(L.computeScore(s)) || !Number.isFinite(s.heat)) bad.push("totals");
      s.jobs.forEach((j) => { if (!Number.isFinite(j.progress)) bad.push("job"); });
      if (bad.length) out.nonFinite = { t, bad };
    }
  }
  progress(o.seconds);
  out.endSecond = o.seconds;
  return out;
}

module.exports = { runGreedy };
