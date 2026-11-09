# Abyss Pearls: Math Spec

Status: **v1, tuned** (M1 pass 2, 2026-11-09). Measured numbers live in `reports/rtp-report.json`
(written by `npm run sim`); this file holds the design values only.

Genre reference: `docs/REFERENCE.md` (reference only, never copied).

## 1. Format (decided 2026-11-09)

| Item | Value |
|---|---|
| Grid | **5 × 3, 243 ways** (decided 2026-11-09) |
| Bet model | Fixed 243 ways; total bet = 25 coins. Coin value 1 / 2 / 4 / 10 Pearls → bets of 25 / 50 / 100 / 250 ✦. All amounts are integers |
| Target RTP band | 96.0% target, band 95.5% – 96.5% |
| RTP split | Base game ~68%, free-spin feature ~28% (decided 2026-11-09) |
| Volatility | Medium-high: σ per spin 6–10× total bet, hit frequency 28–35% |
| Win cap | 5,000× total bet per base spin, including any feature it triggers |
| RNG | Gameplay: `crypto.getRandomValues`. Tests/sim: xoshiro128** seeded via splitmix32. Integers drawn by rejection sampling (no modulo bias) |
| Verification | Base-game RTP computed exactly (per-reel independence). Feature RTP, hit frequency, σ and win distribution from a 10M-spin seeded sim, with 95% confidence interval |

## 2. Symbols (original theme)

| Role | Symbol |
|---|---|
| Hero (stacked) | Whale |
| High | Shark, Octopus |
| Mid | Sea turtle, Anglerfish |
| Low | Pearl, Shell, Starfish, Anchor |
| Wild | Kraken Eye: reels 2–4 only, substitutes for all except Scatter |
| Scatter | Treasure Chest: pays anywhere, triggers free spins |

## 3. Paytable v1 (coins per way; total bet = 25 coins)

| Symbol | 2 | 3 | 4 | 5 |
|---|---|---|---|---|
| Whale | 40 | 150 | 300 | 500 |
| Shark | 15 | 75 | 180 | 300 |
| Octopus | 15 | 60 | 150 | 250 |
| Sea turtle | — | 20 | 60 | 150 |
| Anglerfish | — | 15 | 50 | 125 |
| Pearl | — | 5 | 20 | 80 |
| Shell | — | 4 | 15 | 60 |
| Starfish | — | 4 | 10 | 40 |
| Anchor | — | 3 | 10 | 40 |
| Treasure Chest (scatter, × total bet) | — | 2 | 10 | 50 |

## 4. Feature v1

- **Free spins ("Abyss Dive"):** 3 / 4 / 5 chests = 8 / 12 / 20 spins.
- **Wild multipliers during free spins:** each wild that lands is ×2 or ×3, drawn with integer weights **×2 : ×3 = 7 : 3** (P(×3) = 30%, mean 2.3). Free spins use their own strips (`FREE_SPIN_STRIPS`: more whales and highs, 3 wilds on each of reels 2–4). Multipliers on one way **add**: no wilds = ×1, ×2 + ×3 = ×5, max ×9.
- **Retrigger:** 3+ chests during the bonus = +5 spins. Max 50 free spins per feature.
- **2-of-a-kind:** only Whale, Shark and Octopus pay for 2 reels.
- **Ways rule:** for each symbol, only the longest left-to-right run pays (reel 1 onward, adjacent reels); ways = product of matching cells per reel (symbol or Wild). A way through a Wild pays for every symbol it matches.
- **Multiplier on a way:** sum of the multipliers of the Wilds on that way; a way with no Wild is ×1 (one ×2 Wild = ×2; ×2 + ×3 = ×5).
- **Chests in free spins:** pay their scatter pay *and* retrigger +5 spins.
- **Spin limit:** total free spins per feature never exceed 50; a retrigger past the limit is trimmed.
- **Win cap:** running total of the base spin plus its whole feature is capped at 5,000× total bet; the feature ends early when the cap is hit.
- **Stacked whales:** whale appears in stacks of 1–3 on reel strips (stack sizes tuned in M1).

## 5. Tuning levers (M1)

| Lever | Moves mostly |
|---|---|
| Symbol counts per reel strip | RTP, hit frequency |
| Whale stack size | Volatility, top-end wins |
| Chest count on strips | Bonus trigger rate (draft target ~1 in 150 spins) |
| Wild multiplier weights | Volatility, bonus value |
| Low-symbol pays | Hit frequency, "feel" in the base game |
