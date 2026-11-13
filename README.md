# Rokumon Forge

An idle forge for the Rokumon Games platform. The player keeps a traditional workshop breathing: materials gather from the coals, steel is folded, and weapons of rising tier are quenched. Two loops run side by side. The workshop gets faster and more honest. The armoury gets longer and rarer. Mastery and a rekindling (prestige) make the next firing stronger.

Open `index.html` in a browser. It is the whole game: one file, no build step, no network assets, no analytics, no ads and nothing to buy. Everything else in this repository (`package.json`, `test/`, `smoke/`, `.github/`) is a dev-only check and is not needed to play.

## How to play

- **Strike** the anvil to raise heat and hurry the blade on the anvil. With an empty anvil, strikes also sift a little sand and coal (less above 180 sand, none at 400 or more).
- **Fold** turns satetsu and sumi into tamahagane (36 sand + 22 coal → 1 bar). **Fold all** folds every bar you can afford. Folding hammers do this on their own.
- Spend materials to **forge** a weapon. Quality is rolled when the quench finishes: Crude, Serviceable, Fine, Masterwork, Legendary. Heat, the whetstone wheel, the furnace heart and prestige lean the roll.
- The gold button under the anvil suggests the next new blade and forges it when you can afford it.
- **Pin** a blade. Once the water wheel is built, **Tend the pinned blade** keeps forging it whenever an anvil is free and the cost is on hand.
- **Retire** Serviceable or better work from the rack. Retirement grants permanent **mastery**, which speeds every common material.
- **Rekindle** (prestige) when this firing has quenched a tier 6+ weapon, or you have retired a legendary blade of tier 5 or higher. The workshop and common stock reset. Mastery, catalogue metals, the codex and lifetime score remain. Each rekindling adds +15% output. The first opens the outland armoury. The second reveals the claymore.

### Keyboard, touch and screen readers

- Every control is a real button with a visible focus ring. Tab moves between controls; Enter or Space presses them.
- **Space** strikes when no control has focus.
- In the section tabs (Arms, Workshop, Metals, Ledger), the arrow keys, Home and End move between sections.
- A purchase keeps focus on the button you pressed. Buttons that cannot act right now stay focusable and say why when pressed ("Short on materials").
- Dialogs take focus, keep it inside until closed, close with Escape, and hand focus back.
- A polite live region announces purchases, unlocks, first quenches, arrivals and refusals. Production ticks and blades the water wheel tends are not announced.
- `prefers-reduced-motion` turns off the ember, spark, hammer and anvil animations.
- Touch targets are at least 44px tall; nothing visible is under 24px. There is no horizontal scroll at 390px wide.

## Materials

| Id | Name | How it arrives |
| --- | --- | --- |
| `satetsu` | Satetsu | Iron sand. Passive, from the bellows. |
| `sumi` | Sumi | Charcoal. Passive, from the bellows. |
| `urushi` | Urushi | Lacquer. Passive, from the lacquer shed. |
| `whetstone` | Whetstone | Grit. Passive, from the wheel. Also improves quench quality. |
| `tamahagane` | Tamahagane | Folded steel. Spend sand and coal, or let the folding hammers work. |
| `spirit` | Spirit iron | Catalogue metal. Pacts, the night market, or another Rokumon game. |
| `silk` | Moon silk | Catalogue metal. Same courier. |
| `scale` | Dragon scale | Catalogue metal. Same courier. Scale hunts open after a tier 4 blade exists. |

Common stock and tamahagane are cleared on rekindle. Spirit iron, moon silk and dragon scale are kept in full.

Base rates on a fresh forge: satetsu 0.9/s, sumi 0.55/s, urushi 0.03/s, whetstone 0.018/s. Every common rate is multiplied by `1 + prestige × 0.15 + min(1, mastery × 0.0025)`.

## Weapon progression

Quality is rolled per blade. The tier is the weapon itself. Forging counts persist across rekindles, so the codex does not lock again. A run's rekindle gate does reset: each firing must earn its own tier 6+ quench, or a legendary retirement of tier 5+.

### Old steel

| Weapon | Tier | Needs | Cost (base) | Time | Value |
| --- | --- | --- | --- | --- | --- |
| Tanto | 1 | none | 22 sand, 12 coal | 7s | 20 |
| Shuriken set | 1 | none | 18 sand, 10 coal | 6s | 18 |
| Wakizashi | 2 | 1 tanto | 70 sand, 36 coal, 10 grit | 12s | 55 |
| Kusarigama | 3 | 1 shuriken set | 120 sand, 16 lacquer, 14 grit | 16s | 120 |
| Katana | 4 | 1 wakizashi | 22 tamahagane, 18 lacquer, 16 grit | 22s | 280 |
| Naginata | 5 | 1 kusarigama and 1 katana | 36 tamahagane, 28 lacquer, 18 grit | 28s | 520 |
| Tachi | 6 | 1 katana | 48 tamahagane, 6 spirit iron, 24 lacquer | 34s | 980 |
| Yumi | 6 | 1 naginata | 40 tamahagane, 8 moon silk, 4 spirit iron | 32s | 920 |
| Odachi | 8 | 1 tachi and 1 yumi | 80 tamahagane, 10 spirit iron, 2 dragon scale | 48s | 2400 |

### Outland armoury

Opens at prestige 1, except the claymore, which opens at prestige 2.

| Weapon | Tier | Needs | Cost (base) | Time | Value |
| --- | --- | --- | --- | --- | --- |
| Jian | 5 | Prestige 1 | 30 tamahagane, 4 spirit iron | 24s | 640 |
| Shamshir | 6 | 1 jian | 44 tamahagane, 8 spirit iron, 4 moon silk | 30s | 1100 |
| Rapier | 7 | 1 jian | 50 tamahagane, 8 spirit iron, 20 lacquer | 30s | 1400 |
| Claymore | 9 | Prestige 2, 1 shamshir and 1 rapier | 100 tamahagane, 16 spirit iron, 4 dragon scale | 55s | 4200 |

Quench value is `base × quality × (1 + prestige × 0.05)`, rounded. Quality multipliers: Crude 0.7, Serviceable 1, Fine 1.55, Masterwork 2.4, Legendary 4.

The rack keeps the newest 40 blades. Older ones still count toward the codex and lifetime value; they simply leave the rack so retirement stays a choice. Retiring Serviceable or better grants mastery: the quality award (1 / 2 / 4 / 8) plus half the tier, rounded down. Mastery adds +0.25% output each, capped at +100%.

## Workshop

| Upgrade | Max | Effect |
| --- | --- | --- |
| Bellows | 25 | +0.48 sand and +0.28 coal per second each level. |
| Lacquer shed | 20 | +0.065 urushi per second each level. |
| Whetstone wheel | 20 | +0.04 grit per second each level, and a better quench. |
| Folding hammers | 20 | +0.012 tamahagane per second each level, spending sand and coal. |
| Apprentices | 10 | Offline cap and efficiency. Levels 4 and 8 open a second and third anvil. |
| Water wheel | 15 | +14% quench speed each level. Level 1 unlocks tending a pinned blade. |
| Furnace heart | 15 | Heat fades slower and the quench leans finer. |
| Night bell | 12 | Pacts return sooner. Level 5 sends a second runner. From level 5 each level also costs 1 spirit iron. |

Heat from striking speeds the quench, up to 1.71× at full heat, and slightly improves the quality roll. It cools in real time and does not survive a reload or an absence.

## Time, offline progress and the clock

Progress depends on elapsed time, not on frames: every rate is per second and the simulation steps at most a quarter second at a time, so 30, 60 or 144 frames per second give the same result (tested).

- **While the page is open** the game measures time with the browser's monotonic clock, so changing the system clock mid-session does nothing.
- **A short gap** (under 45 seconds, for example a background tab that the browser paused briefly) counts as live play.
- **A longer absence** (closed tab, hidden tab, a sleeping device) counts as offline work: the first 4 hours at 35% efficiency. Apprentices raise both the cap (up to 12 hours) and the efficiency (up to 100%). Heat and strikes do not apply offline. Running blades finish, the pinned blade keeps being tended, and a runner who was already out can return. Pacts do not restart themselves. On return, a **While you were away** note lists what changed.
- **Clock rewinds pay nothing.** The save remembers the latest time it has seen. Winding the system clock back gives no offline time until real time passes that mark, and play carries on normally meanwhile. A save stamped more than a day in the future is treated as a broken clock and forgiven.
- **Clock jumps forward** while the game is closed are paid like any absence, which means up to the cap. A single-player game cannot fully stop this; the cap limits it.

## Save

`localStorage["rokumon-forge-v1"]` holds one JSON object with `v: 2`. It records materials, workshop levels, codex counts, best qualities, the rack, jobs, pacts, market stock, mastery, prestige, lifetime value, the journal, the selected tab and blade, the pin, the tending switch, whether the guide was read, and the mute setting. Live heat is not saved.

The save is written after every purchase and action, every 5 seconds, when the tab hides and when the page closes.

On load:

- Version 1 saves (the first release) are migrated. A v1 job that was stuck by the first release's heat bug is kept and restarted from zero, so its materials are not lost.
- Every number is checked: anything that is not a finite number of the right kind (including numeric strings, `NaN`, `Infinity` and negatives) falls back to its default, and everything else is clamped to a sane range. Workshop levels cannot exceed their maximum, job times come from the weapon table and not the save, unknown weapon, pact and material ids are dropped, and the best tier is rebuilt from the codex.
- Text that is not readable JSON, or an unknown version, starts a fresh forge. The unreadable text is kept under `localStorage["rokumon-forge-v1-unreadable"]` and the player is told.

This makes a damaged or edited save safe to load. It does not make the save tamper-proof: anyone can edit their own browser storage, and within the clamps the game will believe them.

There is no import or export yet.

## Catalogue metals and other Rokumon games

Spirit iron, moon silk and dragon scale are **not** meant to be infinite forge outputs. On the full platform they are the courier's goods: rewards from playing other Rokumon games. This build keeps the loop playable without that courier.

Stand-ins, all in the Metals tab:

- **Iron pilgrimage**: 2 minutes, 1 spirit iron. The night bell shortens the road.
- **Moon-silk bargain**: 3 minutes, 1 moon silk.
- **Scale hunt**: 6 minutes, 1 dragon scale, after any tier 4 weapon has been forged.
- **Night market**: trades common stock (and, for scales, other catalogue metals) for a small restock every 8 minutes of wall-clock time.

### How a real grant should plug in

The forge listens while it is open. Only the page's own parent frame, on the same origin, may post:

```js
iframe.contentWindow.postMessage({
  type: "rokumon:grant", // or "hub:material"
  material: "spirit",    // spirit | silk | scale, plus aliases below
  amount: 1,             // whole number; 1 to 25 per message, at most 12 messages a minute
  source: "rokumon-sudoku"
}, window.location.origin);
```

Accepted material ids and aliases (case does not matter):

| Alias | Metal |
| --- | --- |
| `spirit`, `spirit-iron`, `spiritiron`, `reitekkou` | Spirit iron |
| `silk`, `moon-silk`, `moonsilk`, `tsukuyomi` | Moon silk |
| `scale`, `dragon-scale`, `dragonscale` | Dragon scale |

The same call exists on the page itself, for a hub wrapper that would rather not use `postMessage`:

```js
window.RokumonForge.grantMaterial("spirit", 1, "rokumon-sudoku"); // returns { ok, material, amount, source } or { ok: false, error }
window.dispatchEvent(new CustomEvent("rokumon:grant", {
  detail: { material: "silk", amount: 1, source: "rokumon-word" }
}));
```

Grants are journalled, shown, announced, saved, and reported to the hub as `material-granted`. Common materials and tamahagane cannot be granted this way: they belong to the forge. Unknown materials, non-numeric or non-positive amounts and rate-limited calls are refused without changing anything. The game never waits on this channel. If nothing arrives, pacts and the market keep the armoury reachable.

`window.RokumonForge` also offers `getScore()`, `getMaterials()` and `getSnapshot()` (a copy of the save) for a hub wrapper or a test. None of them can change the game.

## Score and the hub bridge

The page loads `/hub-bridge.js` (the platform file). When that script is missing (a direct open, a folder, a local server) the page installs a stand-in with the same `window.Hub` API, so the game always plays. Standalone, the browser logs a 404 for `/hub-bridge.js`. That is expected and harmless.

The stand-in posts these messages to a same-origin parent frame, and does nothing when there is no parent:

| Call | Message to the parent |
| --- | --- |
| `Hub.ready()` | `{ type: "hub:ready", version: 1 }` |
| `Hub.score(score)` | `{ type: "hub:score", score }` |
| `Hub.gameOver(score, durationMs)` | `{ type: "hub:gameover", score, durationMs }` |
| `Hub.event(name, data)` | `{ type: "hub:event", version: 1, name, data }` |

When the forge calls them:

- `Hub.ready()` once at start, followed by `Hub.score`.
- `Hub.score(score)` whenever the score changes (checked on each event and every 5 seconds).
- `Hub.gameOver(score, durationMs)` when the player rekindles, with the score and length of the firing that just ended. The forge stays open and reports the new score afterwards.
- `Hub.event(name, data)` for the events below.

Score is an integer:

```
floor(lifetime weapon value + prestige × 1000 + highest tier × 25 + mastery × 15)
```

Events declared in `game-hub-manifest.json` (the tests check that the page sends exactly these):

| Event | Data | When |
| --- | --- | --- |
| `weapon-forged` | `weaponId, tier, quality, value` | A blade is quenched while the page is open. Offline quenches are not sent one by one. |
| `weapon-retired` | `weaponId, tier, mastery` | The player retires one blade for mastery. `mastery` is the new total. |
| `prestige` | `level, score` | The forge is rekindled. |
| `contract-fulfilled` | `contractId, material, amount` | A pact runner returns while the page is open. |
| `material-granted` | `material, amount, source` | A courier grant arrives. |
| `forge-upgraded` | `upgradeId, level` | A workshop level is bought. |
| `offline-return` | `seconds, forged` | The player returns from an absence that changed something: `seconds` counted (after the cap) and blades quenched. |

Offline completions still raise lifetime value and the codex. They are reported as one `offline-return` plus the updated score, not as hundreds of events.

## Audio

Taps, the hammer, a finished quench, upgrades and rekindling use a small Web Audio synthesizer. Nothing is fetched. Sound starts after the first gesture, which browsers require. The header control mutes it, and while muted no sound node is created at all. The setting is saved.

## Checks

Dev-only. Node 20 or newer.

```sh
npm install
npx playwright install chromium   # once, for the smoke test
npm test                          # rules, saves, offline, economy simulation
npm run smoke                     # real clicks, taps and keys in headless Chromium
```

`npm test` runs `node --test` over the rules. The rules live in their own `<script id="forge-logic">` block inside `index.html`: plain functions with no DOM, storage, timers or network. The tests read that block out of `index.html` and run it in Node, so they check the exact code that ships. They cover cost and production formulas, purchase rules, offline gain and its cap, the clock rules, save round-trip and migration, validation against corrupt, tampered and fuzzed saves, number formatting, frame-rate independence, the single-file rule, and a greedy-player simulation of six hours of game time (idle and lightly active, three seeds each) plus a 48-hour run, asserting no dead end, no non-finite value and every blade reachable.

`npm run smoke` serves the page from a throwaway local server and checks, at 1280×800 and at 390×844 with touch: the guide and dialogs, earning and buying with clicks, taps and keys, keyboard focus after a purchase, tabs, no console errors or failed requests, no horizontal scroll and no control under 24px at phone width, reload restoring the save, a clock moved 20 hours forward giving exactly the capped offline gain, a clock moved back giving nothing, malformed and tampered saves, a double-click buying once, reduced motion, mute, and the game running inside a frame with no bridge script while still reporting to the parent and accepting a grant.

GitHub Actions runs both on every pull request (`.github/workflows/checks.yml`).

## Known limits

- Balance has been checked by simulation only, not by people. The greedy simulation shows no dead end and no runaway, but a greedy bot is not a player.
- In the simulation an active player meets a wait of about two minutes (127 seconds) somewhere in the first ten minutes, and an idle player under a minute (44 seconds). The longest wait in six hours is about 10 minutes idle and 5 minutes active.
- The greedy bot rekindles as soon as it may, every 15 to 60 minutes, because the rekindle gate stays at tier 6 while output keeps rising. Whether that pace feels right is for human play to decide.
- Two tabs on the same save will overwrite each other's progress.
- The night market restock and offline time use the wall clock, so moving the clock forward while the game is closed pays out up to the offline cap and refreshes the market.
- No import or export of saves.
- Art is in-file SVG silhouettes; there is no music, only synthesized effects.
- Not yet tested on physical phones or with a real screen reader; the checks above use headless Chromium and the accessibility tree.

## Files

| File | Role | Shipped to the hub |
| --- | --- | --- |
| `index.html` | The whole game: markup, style, the rules block and the page script. | Yes |
| `game-hub-manifest.json` | Rokumon Games catalogue entry. | Yes |
| `README.md` | This note. | Yes |
| `ROADMAP.md` | Now, next and later. | No |
| `package.json`, `package-lock.json` | Dev-only check tooling. | No |
| `test/` | `node --test` suites, the VM loader and the greedy player. | No |
| `smoke/smoke.mjs` | Playwright smoke test. | No |
| `.github/workflows/checks.yml` | Runs both on pull requests. | No |

The hub entry is `/games/rokumon-forge/index.html`. The manifest budget is one megabyte and eight files. The shipped bundle is three files.
