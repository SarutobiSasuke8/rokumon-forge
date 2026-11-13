// Browser smoke test. Serves index.html from a throwaway local server, drives
// it with real clicks, taps and keys in headless Chromium, and checks what a
// player would notice. Dev-only: the game never needs this.
//
//   npm run smoke            (headless)
//   SMOKE_HEADED=1 npm run smoke
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"));
const SAVE_KEY = "rokumon-forge-v1";
const HOUR = 3600 * 1000;

// A stand-in for the platform's /hub-bridge.js that records every call.
const HUB_STUB = `window.__hub = [];
window.Hub = { version: 1, embedded: false,
  ready: function () { __hub.push(["ready"]); },
  score: function (s) { __hub.push(["score", s]); },
  gameOver: function (s, d) { __hub.push(["gameOver", s, d]); },
  event: function (n, d) { __hub.push(["event", n, d]); } };`;

const HOST = `<!doctype html><meta charset="utf-8"><title>host</title>
<iframe id="g" src="/nobridge/index.html" style="width:390px;height:700px"></iframe>
<script>window.__msgs = []; addEventListener("message", function (e) { __msgs.push(e.data); });</script>`;

function serve() {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    const p = url.pathname;
    if (p === "/index.html" || p === "/nobridge/index.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" });
      return res.end(INDEX);
    }
    if (p === "/hub-bridge.js") {
      res.writeHead(200, { "content-type": "text/javascript" });
      return res.end(HUB_STUB);
    }
    if (p === "/host.html") {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      return res.end(HOST);
    }
    res.writeHead(404);
    res.end();
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push({ name, ok: true });
    console.log("  ok   " + name);
  } catch (e) {
    results.push({ name, ok: false, error: e.message });
    console.log("  FAIL " + name + "\n       " + String(e.message).split("\n").join("\n       "));
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg || "assertion failed"); }

// Console errors and failed requests, minus the ones a test expects.
function watch(page, allowed404 = []) {
  const problems = [];
  page.on("pageerror", (e) => problems.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const loc = (m.location() && m.location().url) || "";
    if (/Failed to load resource/.test(m.text()) && allowed404.some((a) => loc.endsWith(a))) return;
    problems.push("console: " + m.text() + (loc ? " @ " + loc : ""));
  });
  page.on("response", (r) => {
    if (r.status() >= 400 && !allowed404.some((a) => r.url().endsWith(a))) problems.push("http " + r.status() + " " + r.url());
  });
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol !== "data:" && u.hostname !== "127.0.0.1") problems.push("off-origin request: " + r.url());
  });
  return problems;
}
// Close the page (its pagehide save runs), then open a new one that finds
// exactly this text in storage on its first load.
async function reopenWithSave(ctx, oldPage, text) {
  await oldPage.close();
  const page = await ctx.newPage();
  const problems = watch(page);
  await page.addInitScript(([k, v]) => {
    if (!sessionStorage.getItem("__seeded")) { localStorage.setItem(k, v); sessionStorage.setItem("__seeded", "1"); }
  }, [SAVE_KEY, text]);
  await page.goto(base + "/index.html");
  await page.waitForSelector("#strike");
  return { page, problems };
}
const snap = (page) => page.evaluate(() => window.RokumonForge.getSnapshot());
const saved = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), SAVE_KEY);

async function strikeTimes(page, n, how) {
  for (let i = 0; i < n; i++) {
    if (how === "tap") await page.tap("#strike");
    else await page.click("#strike");
    await page.waitForTimeout(160);
  }
}

const server = await serve();
const base = "http://127.0.0.1:" + server.address().port;
const browser = await chromium.launch({ headless: !process.env.SMOKE_HEADED });

try {
  // ---------------- desktop, mouse and keyboard, with the hub bridge ----------------
  console.log("desktop 1280x800");
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await ctx.newPage();
    const problems = watch(page);
    await page.goto(base + "/index.html");

    await check("first visit opens the guide with focus on its button", async () => {
      await page.waitForSelector(".sheet[role=dialog]");
      const focused = await page.evaluate(() => document.activeElement && document.activeElement.textContent);
      assert(focused === "Light the forge", "focus on " + focused);
    });
    await check("Escape closes the guide and it stays closed after reload", async () => {
      await page.keyboard.press("Escape");
      assert(await page.isHidden(".sheet"), "sheet still open");
      assert((await saved(page)).welcomed === true, "welcomed not saved");
    });
    await check("clicking Strike earns sand and heat stays a number", async () => {
      const before = (await snap(page)).mats.satetsu;
      await strikeTimes(page, 40, "click");
      const s = await snap(page);
      assert(s.mats.satetsu > before + 30, "sand " + before + " -> " + s.mats.satetsu);
      const heat = await page.textContent("#heatnum");
      assert(/^\d+$/.test(heat) && Number(heat) > 50, "heat text " + heat);
    });
    await check("buying Bellows from the Workshop tab spends sand and saves", async () => {
      await page.click("#tab-workshop");
      const before = (await snap(page)).mats.satetsu;
      await page.click('[data-act="buy"][data-id="bellows"]');
      const s = await saved(page);
      assert(s.upgrades.bellows === 1, "level " + s.upgrades.bellows);
      assert(s.mats.satetsu < before - 17, "sand not spent");
    });
    await check("the suggestion button forges a tanto and it is quenched", async () => {
      await strikeTimes(page, 12, "click");
      const label = await page.textContent("#suggest");
      assert(/^Forge Tanto/.test(label), "suggest says " + label);
      await page.click("#suggest");
      assert((await snap(page)).jobs.length === 1, "no job started");
      await page.waitForFunction(() => window.RokumonForge.getSnapshot().forged.tanto >= 1, null, { timeout: 15000 });
      assert((await snap(page)).jobs.length === 0, "job did not clear");
    });
    await check("Space strikes when no control has focus", async () => {
      await page.evaluate(() => document.activeElement && document.activeElement.blur());
      const before = (await snap(page)).stats.strikes;
      for (let i = 0; i < 3; i++) { await page.keyboard.press("Space"); await page.waitForTimeout(170); }
      assert((await snap(page)).stats.strikes === before + 3, "strikes did not rise by 3");
    });
    await check("arrow keys move between tabs and update aria-selected", async () => {
      await page.focus("#tab-workshop");
      await page.keyboard.press("ArrowRight");
      const sel = await page.evaluate(() => [document.activeElement.id, document.querySelector("[aria-selected=true]").id, document.getElementById("panel").getAttribute("aria-labelledby")]);
      assert(sel.join() === "tab-metals,tab-metals,tab-metals", sel.join());
      await page.keyboard.press("End");
      assert((await page.evaluate(() => document.activeElement.id)) === "tab-ledger");
      await page.keyboard.press("Home");
      assert((await page.evaluate(() => document.activeElement.id)) === "tab-arms");
    });
    await check("buying with the keyboard keeps focus on the same button", async () => {
      await page.click("#tab-workshop");
      await page.evaluate(() => { /* top up so the second purchase is possible */ });
      await strikeTimes(page, 25, "click");
      const btn = '[data-act="buy"][data-id="lacquer"]';
      await page.waitForSelector(btn + "[aria-disabled=false]", { timeout: 20000 });
      await page.focus(btn);
      await page.keyboard.press("Enter");
      await page.waitForTimeout(120);
      const f = await page.evaluate(() => [document.activeElement.getAttribute("data-act"), document.activeElement.getAttribute("data-id")]);
      assert(f.join() === "buy,lacquer", "focus went to " + f.join());
      const live = await page.textContent("#announce");
      assert(/Lacquer shed level 1/.test(live), "announced: " + live);
    });
    await check("visible focus ring on keyboard focus", async () => {
      await page.focus("#strike");
      await page.keyboard.press("Shift+Tab");
      await page.keyboard.press("Tab");
      const outline = await page.evaluate(() => getComputedStyle(document.activeElement).outlineStyle);
      assert(outline === "solid", "outline " + outline);
    });
    await check("the hub bridge got ready, score and the declared events", async () => {
      const calls = await page.evaluate(() => window.__hub);
      assert(calls.some((c) => c[0] === "ready"), "no ready");
      assert(calls.some((c) => c[0] === "score" && Number.isFinite(c[1]) && c[1] > 0), "no score");
      const names = calls.filter((c) => c[0] === "event").map((c) => c[1]);
      assert(names.includes("forge-upgraded") && names.includes("weapon-forged"), "events: " + names.join());
      const forged = calls.find((c) => c[0] === "event" && c[1] === "weapon-forged")[2];
      assert(forged.weaponId === "tanto" && forged.tier === 1 && typeof forged.quality === "string" && forged.value > 0, JSON.stringify(forged));
    });
    await check("dialogs trap focus and Escape returns focus", async () => {
      await page.evaluate(() => document.querySelector('[data-act="howto"]').focus());
      await page.keyboard.press("Enter");
      await page.waitForSelector(".sheet");
      for (let i = 0; i < 4; i++) await page.keyboard.press("Tab");
      assert(await page.evaluate(() => document.getElementById("modal").contains(document.activeElement)), "focus escaped the dialog");
      await page.keyboard.press("Escape");
      assert((await page.evaluate(() => document.activeElement.getAttribute("data-act"))) === "howto", "focus not returned");
    });
    await check("reload restores the forge", async () => {
      const before = await saved(page);
      await page.reload();
      await page.waitForSelector("#strike");
      const after = await snap(page);
      assert(JSON.stringify(after.upgrades) === JSON.stringify(before.upgrades), "upgrades differ");
      assert(JSON.stringify(after.forged) === JSON.stringify(before.forged), "codex differs");
      assert(Math.abs(after.mats.satetsu - before.mats.satetsu) < 30, "sand " + before.mats.satetsu + " -> " + after.mats.satetsu);
      assert(after.stats.strikes === before.stats.strikes, "strikes differ");
      assert(await page.isHidden(".sheet"), "guide reopened after it was dismissed");
    });
    await check("no console errors or failed requests on desktop", async () => {
      assert(problems.length === 0, problems.join("\n"));
    });
    await ctx.close();
  }

  // ---------------- phone, touch, offline, bad saves ----------------
  console.log("phone 390x844 touch");
  {
    const device = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 };
    const ctx = await browser.newContext(device);
    let page = await ctx.newPage();
    let problems = watch(page);
    await page.goto(base + "/index.html");

    await check("tapping through the guide, Strike and a purchase works", async () => {
      await page.tap(".sheet [data-act=close]");
      await strikeTimes(page, 30, "tap");
      await page.tap("#tab-workshop");
      await page.tap('[data-act="buy"][data-id="bellows"]');
      assert((await saved(page)).upgrades.bellows === 1, "bellows not bought by tap");
    });
    await check("no horizontal scroll at phone width on any tab or dialog", async () => {
      for (const tab of ["arms", "workshop", "metals", "ledger"]) {
        await page.tap("#tab-" + tab);
        await page.waitForTimeout(150);
        const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth]);
        assert(w[0] <= w[2] && w[1] <= w[2], tab + ": " + w.join("/"));
      }
      await page.tap('[data-act="howto"]');
      const w = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
      assert(w[0] <= w[1], "guide: " + w.join("/"));
      await page.tap(".sheet [data-act=close]");
    });
    await check("every visible control is at least 24px", async () => {
      for (const tab of ["arms", "workshop", "metals", "ledger"]) {
        await page.tap("#tab-" + tab);
        const small = await page.evaluate(() => [...document.querySelectorAll("button, input, [role=tab]")]
          .filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 && (r.width < 24 || r.height < 24); })
          .map((e) => e.outerHTML.slice(0, 60)));
        assert(small.length === 0, tab + ": " + small.join(" | "));
      }
    });
    let beforeAway;
    await check("leaving for 20 hours gives capped offline gain (4h at 35%)", async () => {
      await page.tap("#tab-arms");
      beforeAway = await saved(page);
      const rate = await page.evaluate(() => {
        const s = window.RokumonForge.getSnapshot();
        return (0.9 + s.upgrades.bellows * 0.48) * (1 + s.prestige * 0.15 + Math.min(1, s.mastery * 0.0025));
      });
      await page.close();
      page = await ctx.newPage();
      problems = watch(page);
      await page.clock.install({ time: new Date(Date.now() + 20 * HOUR) });
      await page.goto(base + "/index.html");
      await page.waitForSelector('[data-away="summary"]');
      const text = await page.textContent('[data-away="summary"]');
      assert(/Gone 20h/.test(text) && /held for 4h 0m at 35%/.test(text), text);
      const after = await snap(page);
      const gain = after.mats.satetsu - beforeAway.mats.satetsu;
      const cap = rate * 4 * 3600 * 0.35;
      assert(gain > cap * 0.95 && gain < cap * 1.01 + 50, "gain " + gain.toFixed(1) + " vs cap " + cap.toFixed(1));
      await page.tap(".sheet [data-act=close]");
    });
    await check("winding the clock back gives nothing and does not freeze play", async () => {
      const s1 = await snap(page);
      await page.close();
      page = await ctx.newPage();
      problems = watch(page);
      await page.clock.install({ time: new Date(Date.now() - 2 * HOUR) });
      await page.goto(base + "/index.html");
      await page.waitForTimeout(300);
      assert(await page.isHidden('[data-away="summary"]'), "away note after a clock rewind");
      const a = (await snap(page)).mats.satetsu;
      await page.waitForTimeout(2200);
      const b = (await snap(page)).mats.satetsu;
      assert(b > a, "production froze after the rewind");
      assert(a < s1.mats.satetsu + 30, "rewind paid out");
    });
    await check("a malformed save resets to a fresh forge, keeps a backup and says so", async () => {
      ({ page, problems } = await reopenWithSave(ctx, page, "{this is not json"));
      await page.waitForSelector("#strike");
      const s = await snap(page);
      assert(s.upgrades.bellows === 0 && s.mats.satetsu < 5, "not a fresh forge");
      const backup = await page.evaluate(() => localStorage.getItem("rokumon-forge-v1-unreadable"));
      assert(backup === "{this is not json", "backup " + backup);
      await page.waitForTimeout(100);
      assert(/could not be read/.test(await page.textContent("#announce")), "no notice");
      await page.tap(".sheet [data-act=close]");
      await strikeTimes(page, 3, "tap");
    });
    await check("a tampered save is clamped instead of trusted", async () => {
      ({ page, problems } = await reopenWithSave(ctx, page, JSON.stringify({ v: 2, welcomed: true, mats: { satetsu: 1e300, sumi: "9e9" }, upgrades: { bellows: 9999 }, prestige: -4, jobs: [{ id: "tanto", progress: 0, time: 0 }], lastTick: Date.now() })));
      await page.waitForSelector("#strike");
      const s = await snap(page);
      assert(s.upgrades.bellows === 25, "bellows " + s.upgrades.bellows);
      assert(s.mats.satetsu <= 1e15 && s.mats.sumi < 100, "stock " + s.mats.satetsu + "/" + s.mats.sumi);
      assert(s.prestige === 0, "prestige " + s.prestige);
      const shown = await page.textContent('[data-amt="satetsu"]');
      assert(!/NaN|Infinity/.test(shown) && shown.length < 10, "shown " + shown);
    });
    await check("double-tapping or double-clicking a buy button buys once and never goes negative", async () => {
      ({ page, problems } = await reopenWithSave(ctx, page, JSON.stringify({ v: 2, welcomed: true, tab: "workshop", mats: { satetsu: 30 }, lastTick: Date.now() })));
      const btn = '[data-act="buy"][data-id="bellows"]';
      await page.waitForSelector(btn + "[aria-disabled=false]");
      await page.dblclick(btn);
      await page.tap(btn, { force: true, noWaitAfter: true }).catch(() => {});
      const s = await snap(page);
      assert(s.upgrades.bellows === 1, "bellows " + s.upgrades.bellows);
      assert(s.mats.satetsu >= 12 && s.mats.satetsu < 14, "sand " + s.mats.satetsu);
      assert((await page.getAttribute(btn, "aria-disabled")) === "true", "button not marked unavailable");
      await page.waitForFunction(() => /Short on materials/.test(document.getElementById("announce").textContent), null, { timeout: 3000 });
    });
    await check("no console errors on phone", async () => {
      assert(problems.length === 0, problems.join("\n"));
    });
    await ctx.close();
  }

  // ---------------- reduced motion and mute ----------------
  console.log("reduced motion, sound");
  {
    const ctx = await browser.newContext({ viewport: { width: 800, height: 900 }, reducedMotion: "reduce" });
    await ctx.addInitScript(() => {
      window.__tones = 0;
      const AC = window.AudioContext;
      window.AudioContext = function () {
        const c = new AC();
        const make = c.createOscillator.bind(c);
        c.createOscillator = function () { window.__tones++; return make(); };
        return c;
      };
    });
    const page = await ctx.newPage();
    const problems = watch(page);
    await page.addInitScript((k) => {
      if (!localStorage.getItem(k)) localStorage.setItem(k, JSON.stringify({ v: 2, welcomed: true, mute: true, lastTick: Date.now() }));
    }, SAVE_KEY);
    await page.goto(base + "/index.html");
    await check("prefers-reduced-motion: no sparks and no swing", async () => {
      await strikeTimes(page, 3, "click");
      const n = await page.evaluate(() => [document.querySelectorAll(".spark").length, document.getElementById("hammer").classList.contains("swing")]);
      assert(n[0] === 0 && n[1] === false, JSON.stringify(n));
    });
    await check("muted: strikes make no sound; unmuting brings it back", async () => {
      assert((await page.evaluate(() => window.__tones)) === 0, "tones while muted");
      assert((await page.getAttribute("#mute", "aria-pressed")) === "true");
      await page.click("#mute");
      await strikeTimes(page, 2, "click");
      assert((await page.evaluate(() => window.__tones)) > 0, "no tones after unmute");
      assert((await saved(page)).mute === false);
    });
    await check("no console errors with reduced motion", async () => {
      assert(problems.length === 0, problems.join("\n"));
    });
    await ctx.close();
  }

  // ---------------- embedded, no bridge script ----------------
  console.log("embedded in a hub frame without /hub-bridge.js");
  {
    const ctx = await browser.newContext({ viewport: { width: 420, height: 760 } });
    const page = await ctx.newPage();
    const problems = watch(page, ["/hub-bridge.js"]);
    await page.route("**/hub-bridge.js", (r) => r.fulfill({ status: 404, body: "" }));
    await page.goto(base + "/host.html");
    const frame = page.frameLocator("#g");
    await check("the game still plays with the bridge absent", async () => {
      await frame.locator(".sheet [data-act=close]").click();
      await frame.locator("#strike").click();
      const f = page.frames().find((x) => x.url().endsWith("/nobridge/index.html"));
      const s = await f.evaluate(() => window.RokumonForge.getSnapshot());
      assert(s.stats.strikes === 1, "strikes " + s.stats.strikes);
    });
    await check("the stand-in bridge posts hub:ready and hub:score to the parent", async () => {
      await page.waitForFunction(() => window.__msgs.some((m) => m.type === "hub:ready") && window.__msgs.some((m) => m.type === "hub:score"));
    });
    await check("a courier grant posted by the parent arrives and is reported", async () => {
      await page.evaluate(() => document.getElementById("g").contentWindow.postMessage({ type: "rokumon:grant", material: "moon-silk", amount: 3, source: "rokumon-word" }, location.origin));
      const f = page.frames().find((x) => x.url().endsWith("/nobridge/index.html"));
      await f.waitForFunction(() => window.RokumonForge.getMaterials().silk === 3);
      await page.waitForFunction(() => window.__msgs.some((m) => m.type === "hub:event" && m.name === "material-granted" && m.data.amount === 3));
    });
    await check("only the expected bridge 404 in the console", async () => {
      assert(problems.length === 0, problems.join("\n"));
    });
    await ctx.close();
  }
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}

const failed = results.filter((r) => !r.ok);
console.log(`\nsmoke: ${results.length} checks, ${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
