# Abyss Pearls: Milestones

Each milestone starts with `/mentor` and ends with `tester` PASS.

## M0. Project setup
- [x] Vite + React + TypeScript (strict) scaffold, React Router, Vitest, Playwright, ESLint
- [x] MVC folders created per `CLAUDE.md`
- [x] `npm run dev` shows a placeholder Home page on localhost:5173

## M1. Slot math model (no UI)
- [ ] `rng.ts`: crypto RNG + seeded RNG behind one interface
- [ ] `reelStrips.ts`, `paytable.ts`, `evaluator.ts` (243 ways, wilds, scatter)
- [ ] Free spins + wild multipliers
- [ ] `npm run sim` writes `reports/rtp-report.json`; RTP inside the target band in `docs/MATH.md`

## M2. Art set v1
- [ ] Palette + symbol generators (whale, 5 creatures, 4 low symbols, wild, scatter)
- [ ] Reel frame, Spin button, balance bar, background

## M3. Playable game
- [ ] `slotReducer` state machine + `useSlotMachine` hook
- [ ] Reels spin and stop reel-by-reel on the model's result
- [ ] Win highlights, win counter, free-spins mode
- [ ] Pearls wallet: balance, bet size, "Get Free Pearls", session history

## M4. Portfolio pages
- [ ] Home (hero + pitch + Play Demo)
- [ ] Math & Fairness (reads `reports/rtp-report.json`)
- [ ] Architecture (MVC diagram, "RGS-ready" explanation)
- [ ] Contact

## M5. Polish and pitch-ready
- [ ] Sound, juice, mobile layout
- [ ] Playwright smoke tests green
- [ ] Production build runs from `npm run preview`
