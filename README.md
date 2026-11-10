# Rokumon Forge

An idle forge for the Rokumon Games platform. The player keeps a traditional workshop breathing: materials gather from the coals, steel is folded, and weapons of rising tier are quenched. Two loops run side by side. The workshop gets faster and more honest. The armoury gets longer and rarer. Mastery and a rekindling (prestige) make the next firing stronger.

Open `index.html` in a browser. No build step and no network assets. Progress is stored in `localStorage` under `rokumon-forge-v1`.

## How to play

- **Strike** the anvil to raise heat and hurry the blade on the anvil. With an empty anvil, early strikes also sift a little sand and coal.
- **Fold steel** turns satetsu and sumi into tamahagane (36 sand + 22 coal → 1 bar). Folding hammers do this on their own.
- Spend materials to **forge** a weapon. Quality is rolled when the quench finishes: Crude, Serviceable, Fine, Masterwork, Legendary. Heat, the whetstone wheel, the furnace heart and prestige lean the roll.
- **Pin** a blade. Once the water wheel is built, **Tend the pinned blade** keeps forging it whenever the anvil is free and the cost is on hand.
- **Retire** Serviceable or better work from the rack. Retirement grants permanent **mastery**, which speeds every common material.
- **Rekindle** (prestige) when this firing has quenched a tier 6+ weapon, or you have retired a legendary blade of tier 5 or higher. The workshop and common stock reset. Mastery, catalogue metals, the codex and lifetime score remain. Each rekindling adds +15% output. The first opens the outland armoury. The second reveals the claymore.
- **Space** strikes when focus is not on a button. The guide in the header explains the three loops.

While the tab is hidden, the forge keeps working. The first four hours count at 35% efficiency. Apprentices raise both the cap (up to 12 hours) and the efficiency (up to 100%). On return, a short **While you were away** note lists what changed.

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

## Weapon progression

Quality is rolled per blade. The tier is the weapon itself. Forging counts persist across rekindles, so the codex does not lock again. A run's rekindle gate does reset: each firing must earn its own tier 6+ quench, or a legendary retirement of tier 5+.

### Old steel

| Weapon | Tier | Needs | Cost (base) | Time | Value |
| --- | --- | --- | --- | --- | --- |
| Tanto | 1 | — | 22 sand, 12 coal | 7s | 20 |
| Shuriken set | 1 | — | 18 sand, 10 coal | 6s | 18 |
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

| Upgrade | Effect |
| --- | --- |
| Bellows | More satetsu and sumi. |
| Lacquer shed | More urushi. |
| Whetstone wheel | More grit and a better quench. |
| Folding hammers | Automatic tamahagane, spending sand and coal. |
| Apprentices | Offline cap and efficiency. Levels 4 and 8 open a second and third anvil. |
| Water wheel | Faster quench. Level 1 unlocks tending a pinned blade. |
| Furnace heart | Heat fades slower and the quench leans finer. |
| Night bell | Pacts return sooner. Level 5 sends a second runner. |

Heat from striking speeds the quench (up to roughly double at full heat) and slightly improves the quality roll. It cools in real time and does not persist offline.

## Catalogue metals and other Rokumon games

Spirit iron, moon silk and dragon scale are **not** meant to be infinite forge outputs. On the full platform they are the courier's goods: rewards from playing other Rokumon games. This build keeps the loop playable without that courier.

Stand-ins, all in the Metals tab:

- **Iron pilgrimage** — about 2 minutes, 1 spirit iron. Night bell shortens the road.
- **Moon-silk bargain** — about 3 minutes, 1 moon silk.
- **Scale hunt** — about 6 minutes, 1 dragon scale, after any tier 4 weapon has been forged.
- **Night market** — trades common stock (and, for scales, other catalogue metals) for a small restock every 8 minutes.

Pacts do not restart themselves, including offline. A runner who was already out can finish while you are away, and that is all.

### How a real grant should plug in

The forge listens while it is open. Any same-origin parent frame (the hub) may post:

```js
iframe.contentWindow.postMessage({
  type: "rokumon:grant", // or "hub:material"
  material: "spirit",    // spirit | silk | scale, plus aliases below
  amount: 1,             // integer, 1–25 per message, 12 messages / minute
  source: "rokumon-sudoku"
}, window.location.origin);
```

Accepted material ids and aliases:

| Alias | Metal |
| --- | --- |
| `spirit`, `spirit-iron`, `reitekkou` | Spirit iron |
| `silk`, `moon-silk`, `tsukuyomi` | Moon silk |
| `scale`, `dragon-scale` | Dragon scale |

The same call exists on the page itself, for a hub wrapper that would rather not use `postMessage`:

```js
window.RokumonForge.grantMaterial("spirit", 1, "rokumon-sudoku");
window.dispatchEvent(new CustomEvent("rokumon:grant", {
  detail: { material: "silk", amount: 1, source: "rokumon-word" }
}));
```

Grants are journalled, toasted, saved, and reported to the hub as `material-granted`. Common materials and tamahagane cannot be granted this way: they belong to the forge. The hub bridge remains one-way for gameplay. This grant channel is the deliberate inbound seam for catalogue metals only. The game never blocks on it. If nothing arrives, pacts and the market keep the armoury reachable.

A future hub quest such as "finish a daily in Rokumon Word" would pay the player by posting `rokumon:grant` into this frame. No forge update is required beyond the metal id already listed.

## Score and the hub bridge

The page loads `/hub-bridge.js` (the platform file) and installs the same `window.Hub` API if that script is missing, so the game still runs from a folder or a direct open.

```js
Hub.ready();
Hub.score(score);
Hub.event("weapon-forged", { weaponId, tier, quality, value });
Hub.gameOver(score, durationMs); // once per rekindle, then play continues
```

Score is an integer:

```
floor(lifetime weapon value + prestige × 1000 + highest tier × 25 + mastery × 15)
```

`Hub.score` is sent when the score changes. `Hub.gameOver` marks the end of a firing when the player rekindles; the forge stays open and reports the new score afterwards.

Events declared in `game-hub-manifest.json`:

| Event | When |
| --- | --- |
| `weapon-forged` | A blade is quenched while the tab is open. Offline quenches are not emitted one by one. |
| `weapon-retired` | The player retires a blade for mastery. |
| `prestige` | The forge is rekindled. |
| `contract-fulfilled` | A pact returns. |
| `material-granted` | A courier grant arrives. |
| `forge-upgraded` | A workshop level is bought. |
| `offline-return` | The player comes back to an away-summary with `seconds` counted and `forged` blades quenched. |

Offline completions still raise lifetime value and the codex. They are reported as one `offline-return` plus the updated score, not as hundreds of events.

## Audio

Taps, the hammer, a finished quench, upgrades and rekindling use a small Web Audio synthesizer. Nothing is fetched. Sound starts after the first gesture, which browsers require, and the header control mutes it. The preference is saved.

## Save

`localStorage["rokumon-forge-v1"]` holds materials, workshop levels, codex counts, best qualities, the rack, jobs, pacts, market stock, mastery, prestige, lifetime value and the journal. The save is written on a short timer, when the tab hides, and when the page closes. A bad save is ignored and a fresh forge starts.

## Files

| File | Role |
| --- | --- |
| `index.html` | The whole game: markup, style and simulation. |
| `game-hub-manifest.json` | Rokumon Games catalogue entry. |
| `README.md` | This note. |

The hub entry is `/games/rokumon-forge/index.html`. The manifest budget is one megabyte and eight files. This release is three.
