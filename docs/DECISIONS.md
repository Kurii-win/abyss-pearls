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
