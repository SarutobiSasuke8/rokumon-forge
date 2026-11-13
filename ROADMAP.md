# Rokumon Forge roadmap

## Now

- [x] Fix the first-session forge freeze (heat started undefined and turned NaN, so no blade could finish until a reload, which then dropped the job)
- [x] Move the rules into a pure, testable block inside `index.html`, driven by elapsed time
- [x] Version the save, migrate v1, validate and clamp every field, reset safely on unreadable data and keep a backup
- [x] Offline progress that is capped, ignores clock rewinds and no longer depends on dismissing the guide
- [x] Keyboard and screen-reader pass: focus kept after purchases, tab arrow keys, dialog focus, live announcements
- [x] Respect `prefers-reduced-motion` for sparks and the hammer swing
- [x] `npm test` (unit tests and greedy economy simulation) and `npm run smoke` (Playwright), run on pull requests
- [ ] Human play of the first hour on desktop and on a real phone, with notes on pacing
- [ ] Hub intake review: check the stand-in bridge messages against the platform's real `/hub-bridge.js`

## Next

- [ ] Balance from human play: early whetstone wait, rekindle cadence (the gate stays at tier 6 while output rises), value of the water wheel and apprentices
- [ ] Test with a real screen reader (NVDA, VoiceOver) and on iOS Safari and Android Chrome
- [ ] Save export and import as text
- [ ] Guard against two open tabs overwriting each other
- [ ] Connect the courier: real `rokumon:grant` payouts from other Rokumon games

## Later

- [ ] Art pass beyond the SVG silhouettes: hearth, anvil, weapon plates
- [ ] Sound pass: a fuller hammer, quench hiss, an optional ambient bed
- [ ] Cover, hero and screenshots for the hub manifest
- [ ] A late-game goal past the claymore so later rekindles mean more than +15%
