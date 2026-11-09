# Abyss Pearls: Decisions

| Date | Decision | Why |
|---|---|---|
| 2026-11-09 | Portfolio site to pitch studios and licensed operators; runs on localhost | Side-hustle pitch piece |
| 2026-11-09 | Original deep-sea theme, working title "Abyss Pearls"; mechanics inspired by 243-ways slots | Mechanics are free to use; another game's name, art and symbols are not |
| 2026-11-09 | React + TypeScript + Vite, MVC folder structure | Clean, testable architecture is part of the pitch |
| 2026-11-09 | Virtual ✦ Pearls only, no payment or banking code | Legal safety; licensed operators bring their own wallet |
| 2026-11-09 | Agent team: /mentor skill + builder, tester, artist agents | Same teach-before-build workflow as Kurii's game project |
| 2026-11-09 | Project gets its own git repo inside `AbyssPearls/` | Parent repo was rooted at the home folder; the pitch repo needs a clean, project-only history |
| 2026-11-09 | React Router v7 in data mode (`createBrowserRouter`), route table in `src/router.tsx` | One file maps the whole site; supports loaders later; framework mode (SSR) is overkill for a localhost demo |
| 2026-11-09 | MVC layer rules enforced by ESLint `no-restricted-imports` per folder | `npm run lint` fails on layer violations; no extra dependency; "architecture enforced by tooling" is a pitch point |
| 2026-11-09 | Grid locked: 5 reels × 3 rows, 243 ways (5×4 / 1,024 rejected) | Matches CLAUDE.md §6; mobile-friendly; lower variance, cheaper to verify; keeps distance from the reference game format. Evaluator stays generic over `rows` |
| 2026-11-09 | Free-spin wild multipliers (×2/×3) **add** on a way (max ×9) | Easier to explain on the Math page, lower variance, moves away from the reference game's multiplying wilds |
| 2026-11-09 | Volatility medium-high (σ 6–10× bet, hit freq 28–35%) | Exciting feature, still verifiable with a 10M-spin sim |
| 2026-11-09 | Win cap 5,000× total bet per base spin incl. its feature | Bounds the top end; standard disclosure on the rules screen |
| 2026-11-09 | Total bet = 25 coins; coin value 1/2/4/10 Pearls; integer-only money | No float rounding errors in RTP or wallet |
| 2026-11-09 | RTP 96.0% (band 95.5–96.5%); xoshiro128** + rejection sampling; exact base RTP + 10M-spin sim with 95% CI | Exact theoretical RTP like certified games; sim verifies the feature and volatility |
| 2026-11-09 | Retrigger +5 spins, max 50 free spins per feature; 2-of-a-kind pays only for Whale/Shark/Octopus | Caps feature length; gives high symbols more frequent pays |
| 2026-11-09 | RTP split: base game ~68%, free-spin feature ~28% (total 96.0%) | Matches medium-high volatility: base ticks along, big wins come from the feature with wild multipliers |
| 2026-11-09 | Spec clarifications: longest-run ways rule; way multiplier = sum of its wilds (×1 if none); chests pay and retrigger in free spins; 50-spin limit trims retriggers; cap is a running total and ends the feature | Raised by tester after pass 1; industry-standard defaults, proposed by mentor and approved by Kurii |
| 2026-11-09 | M1 closed after builder fixes tester's 5 report/test issues (report committed, stratified CI checked, hash covers rule code, sim experiments don't overwrite the report, stored stratified seed) | Report integrity is what the Math & Fairness page stands on |
| 2026-11-09 | `docs/REFERENCE.md` kept locally, gitignored | It names a commercial game; useful to agents, but has no place in the pitch repo |
| 2026-11-09 | Art: 48×48 native tiles shown at integer scale (×2), `image-rendering: pixelated` | Enough detail to tell 11 symbols apart; sharp pixels |
| 2026-11-09 | Stacked Whale drawn as joined segments (single/top/mid/bottom); View picks the segment from neighbouring strip cells | Memorable hero moment; presentation only, outcome unchanged |
| 2026-11-09 | Own ~24-colour deep-sea palette in `tools/art/palette.py` | Fully original; one-file reskin |
| 2026-11-09 | Art set v1 approved as-is (27-colour palette) | Kurii reviewed the mock reel; revisions (whale head detail, quieter low symbols, chest rays) parked for later |
| 2026-11-09 | Combined /mentor lesson for M3–M5 approved in one go; build M3 → M4 → M5 with tester + commit per milestone | Kurii wants the finished demo; Hard rule 5 satisfied by one approved lesson covering all three |
| 2026-11-09 | Rendering: DOM + CSS transforms (no Canvas/Pixi) | 15 cells; React-friendly; Playwright-testable |
| 2026-11-09 | Wallet: start 10,000 ✦ in localStorage; "Get Free Pearls" +5,000 only when balance < min bet; last 50 spins history | Virtual currency only; simple and honest |
| 2026-11-09 | Free spins auto-play with Skip; slam-stop on second Spin press | Model already decided; View only presents |
| 2026-11-09 | `?seed=` seeded RNG only in dev/test builds; production always crypto | Reproducible e2e tests without weakening production fairness |
| 2026-11-09 | Contact page: placeholder links Kurii fills in, no form backend; no email published | Privacy; no server |
| 2026-11-09 | Sound: WebAudio-synthesised SFX, enabled after first interaction, mute toggle | Original IP, no sample files; browser autoplay rules |
| 2026-11-09 | Round settles at Spin press (bet + full win incl. feature booked and saved at once); display counts up; reload mid-feature shows the final balance | Mirrors how a game server settles; consistent with "Model decides, View performs" |
