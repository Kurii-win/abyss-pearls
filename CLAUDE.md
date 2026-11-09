# Abyss Pearls — Project Rules

A deep-sea themed video slot, built as a **portfolio website** to pitch to studios and licensed operators.
It is a demo: it runs on localhost, uses **virtual currency only**, and exists to show math, feel and architecture.

Every agent reads this file first. If a request conflicts with it, stop and flag the conflict to Kurii.

---

## 1. Hard rules (never broken, never "just for the demo")

1. **Virtual currency only.** The only currency is ✦ Pearls. Pearls cannot be bought, sold, transferred, or cashed out.
2. **No payment or banking code.** No deposit/withdrawal flows, bank pickers, QR top-ups, card fields, payment-gateway SDKs,
   crypto wallets, or screens styled after real banks or payment apps. A "Get Free Pearls" button is the only top-up.
   If a task asks for any of this, refuse that part and tell Kurii.
3. **Original IP only.** No names, logos, art, sounds or symbol sets from existing slot games (e.g. Aristocrat titles).
   All art comes from `tools/art/` generator scripts. Mechanics (ways-to-win, free spins, multipliers) are fine.
4. **The Model decides, the View performs.** A spin's outcome is computed in `src/models/` the instant Spin is pressed.
   Animations only reveal a result that already exists. The View never decides who won.
5. **Teach before build.** No new milestone or system starts until the `/mentor` lesson for it is done and Kurii approves.

## 2. Stack

| Concern | Choice |
|---|---|
| Build tool | Vite (dev server on `http://localhost:5173`) |
| UI | React + TypeScript (strict mode) |
| Routing | React Router |
| Unit tests | Vitest |
| Browser tests | Playwright |
| Art generation | Python 3 + Pillow in project venv `.venv/` (`tools/art/`) |

## 3. Folder structure (MVC)

```
src/
  models/        Pure TypeScript. NEVER imports React or anything from views/controllers.
                 rng.ts · reelStrips.ts · paytable.ts · evaluator.ts · wallet.ts · types.ts
  controllers/   React hooks + reducers that connect models to views.
                 useSlotMachine.ts · slotReducer.ts (the spin state machine)
  views/
    game/        Reel.tsx · Symbol.tsx · SpinButton.tsx · BalanceBar.tsx · WinOverlay.tsx
    pages/       Home.tsx · Play.tsx · MathFairness.tsx · Architecture.tsx · Contact.tsx
  assets/        Generated PNGs only (output of tools/art/)
tests/
  unit/          Vitest specs for models/ and controllers/
  sim/           Million-spin RTP simulation
  e2e/           Playwright smoke tests
tools/art/       Python asset generators
reports/         rtp-report.json (written by the simulation, read by the Math & Fairness page)
docs/            DECISIONS.md · MATH.md · MILESTONES.md
```

### Layer rules
- `models/` → imports only other `models/`. Fully testable without a browser.
- `controllers/` → may import `models/`. Owns the spin state machine and animation timing.
- `views/` → may import `controllers/` and `assets/`. Never imports `models/` logic directly (types are OK).

## 4. Spin state machine

```
IDLE → SPINNING → STOPPING (reel by reel) → EVALUATING → SHOWING_WINS → IDLE
                                                       ↘ FREE_SPINS loop ↗
```

## 5. RNG
- Gameplay uses `crypto.getRandomValues`.
- Tests and the simulation use a **seeded** RNG through the same interface, so results are reproducible.
- `rng.ts` exposes one interface; nothing else calls `Math.random()`.

## 6. Game spec (finalised milestone by milestone with `/mentor`)
- 5 reels × 3 rows, **243 ways to win**.
- Stacked hero symbol (Whale), Wild, Scatter-triggered free spins with wild multipliers.
- Target RTP and volatility are chosen in the math milestone and recorded in `docs/MATH.md`.
- Every number on the Math & Fairness page must come from `reports/rtp-report.json`, never typed by hand.

## 7. Agent team

| Agent | Role |
|---|---|
| `/mentor` (skill) | Teaches the concepts for a milestone, waits for approval, records the decision |
| `builder` | Implements approved work inside the MVC rules |
| `tester` | Unit tests, RTP simulation, browser smoke tests; reports, does not fix model code |
| `artist` | Writes deterministic Python generators for all PNG assets |

## 8. Definition of done (per task)
- `npm run lint`, `npm run test` pass.
- Model changes → simulation re-run, `reports/rtp-report.json` updated, RTP still inside the target band.
- Decision recorded in `docs/DECISIONS.md` (date, what, why).
- Milestone checkbox ticked in `docs/MILESTONES.md`.

## 9. Commands
```
npm run dev        # localhost:5173
npm run test       # vitest
npm run sim        # RTP simulation → reports/rtp-report.json
npm run e2e        # playwright
npm run art        # .venv/bin/python tools/art/build_all.py (Pillow lives in the project venv)
```
