# Onboarding: wordle-helper

Welcome! This doc walks through how `wordle-helper` is put together, in plain
English, assuming you're comfortable with React/TypeScript basics but new to
this specific codebase.

## What this app is

`wordle-helper` is a small React + TypeScript single-page app that helps you
solve Wordle. You type in each guess you've made and mark each letter's
result (grey/yellow/green), and the app narrows a fixed word list down to
every word that's still consistent with what you've told it — then ranks
those survivors so the most useful next guess floats to the top.

There's no backend and no database. Everything — the word list, the
filtering, the ranking — runs client-side against two static data files
bundled with the app.

## Getting it running

```bash
yarn dev             # dev server at http://localhost:3140
yarn test            # vitest, watch mode
yarn test:coverage   # vitest run --coverage
yarn test:e2e        # Playwright (run `yarn playwright install` once first)
yarn lint            # ESLint (src, e2e, playwright.config.ts)
yarn format          # Prettier, writes changes
yarn build           # tsc -b + production build
```

A pre-commit hook (Husky) runs `prettier --check` → lint → `tsc -b` → tests
before every commit, so if `yarn dev` and `yarn test` both work, you're in
good shape. Playwright is deliberately excluded from that hook (booting a
browser is too slow for pre-commit) — it only runs in CI.

## The three-layer mental model

```
words.ts / recentSolutions.ts   →   wordFilter.ts   →   App.tsx / GuessRow.tsx
     (static data)                  (pure logic)            (UI)
```

1. **Data** (`src/data/words.ts`, `src/data/recentSolutions.ts`) — two
   hand-maintained arrays, nothing computed. No React, no logic.
2. **Logic** (`src/lib/wordFilter.ts`) — pure functions that take a word list
   and the guesses so far, and return a filtered, ranked word list. Knows
   nothing about the DOM.
3. **UI** (`src/App.tsx`, `src/components/GuessRow.tsx`) — owns guess state,
   calls into `wordFilter.ts` on every change, renders the result.

If you're trying to understand _why a word did or didn't appear in the
results_, the answer is always in `wordFilter.ts`, never in the UI layer.

## The data: two files, two different jobs

### `src/data/words.ts`

The canonical ~2,319-word NYT Wordle answer list, copied directly from
Wordle's own source code (via
[cfreshman's gist](https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b))
rather than derived from a general dictionary. That distinction matters: an
earlier version of this app built its word list from macOS's dictionary
filtered by word-frequency data, and that approximation both missed real
answers (like "toddy") and let proper nouns leak in. Pulling the list
straight from the game's own code sidesteps both problems.

This is a **static, closed list** — the app only ever suggests words that
are _in_ this file. It's every word Wordle could pick as an answer, not
just words that are valid guesses (Wordle accepts a much larger guess
dictionary; this app doesn't model that distinction, since suggesting a
word that could never be the answer isn't useful here).

NYT adds new answers to the real game periodically, so this file will drift
out of date — re-sync from an updated source if a real answer stops showing
up as a suggestion.

### `src/data/recentSolutions.ts`

A dated list of _actual_ recent Wordle answers (currently 2025-07-15
onward), compiled from public Wordle archive sites. This isn't used for
filtering — every word in it is already in `words.ts`. It's used only to
scale down a word's _rank_ the more recently it was an actual answer (see
below), because NYT started repeating older answers from its list starting
2026-02-02.

Both data files are manually maintained and will need periodic re-syncing —
see CLAUDE.md's Architecture section and the repo's commit history (e.g.
"Add 'geode' and sync recent solutions through 2026-08-14") for how past
syncs were done.

## The logic: `src/lib/wordFilter.ts`

Two exported functions, each doing one job:

### `filterWords` / `isWordPossible` — narrowing the candidate list

`isWordPossible(candidate, guesses)` replays every _complete_ guess row
against a candidate word and rejects it if it's inconsistent with any of
them. For each guess row it checks, letter by letter:

- **`correct`** — the candidate must have that exact letter in that exact
  position.
- **`present`** — the candidate must contain that letter somewhere, but
  _not_ in that position (that's what "present" means: right letter, wrong
  spot).
- **`absent`** — handled separately, see the duplicate-letter case below.

**The duplicate-letter edge case is the trickiest part of this file, and
worth understanding before you touch it.** Wordle's actual rule for a
repeated letter (say your guess has two Es) is: if the answer contains
exactly one E, the first E you guessed correctly/present gets marked
correct/present, and the _second_ E gets marked absent — not because "E
isn't in the word," but because "there isn't a _second_ E." So `absent`
does not always mean zero occurrences; it means "no more occurrences than
the ones already accounted for by `correct`/`present` marks on the same
letter in that row."

That's why the code doesn't do a naive "candidate must not contain any
absent letter" check. Instead it counts, per row, how many times each
letter was marked `correct` or `present` (`minCount`), then requires that
any letter also marked `absent` in that row appears in the candidate
**exactly** that many times — not fewer (that would contradict the
correct/present marks) and not more (that's what `absent` is telling you).

`filterWords` is the thin wrapper `App.tsx` actually calls: it drops any
guess row that isn't fully filled in yet (so a half-typed guess doesn't
warp the results), then runs every candidate in `words.ts` through
`isWordPossible`.

### `rankWords` — ordering the survivors

Real Wordle answer-frequency data isn't available offline, so instead of
modeling "which words are actually likely to be Wordle answers," this
function scores each candidate by **letter commonality within the
remaining candidate pool itself** — recomputed fresh on every filter pass,
so it adapts as the pool narrows. Two components, summed per word:

- **Positional frequency** — how often each letter appears _in that exact
  position_ across the remaining candidates (a `w` in position 0 is scored
  against how many remaining words start with `w`).
- **Overall frequency** — how many remaining words contain that letter
  _anywhere_, counted once per word even if a letter repeats (so `speed`'s
  double-e counts once, not twice, toward `e`'s overall score).

On top of that raw score, `recencyFactor` applies a penalty if the word
appears in `recentSolutions.ts`: no penalty at all once a year has passed
since it was last used, scaling linearly down to a 0.3× floor for a word
used very recently. The intent isn't to exclude recently-used words
(NYT does repeat them now) — just to keep them from cluttering the top of
the list ahead of fresher options.

If you're adding a new ranking signal, follow the same shape: a pure
function of `(word, context) → number`, multiplied or added into `score()`,
covered by a test in `wordFilter.test.ts` that asserts the _relative_
ordering it should produce (not brittle exact scores).

## The UI: `App.tsx` and `GuessRow.tsx`

`App.tsx` owns all state — an array of `Guess[]` (one entry per guess row)
— and re-runs `filterWords` → `rankWords` inside a `useMemo` keyed on that
array, so the results section is always in sync with whatever's currently
typed. `WORD_LENGTH` and `RESULTS_SHOWN` (currently 5 and 100) are the two
constants to know about if you need to change either.

A `Guess` is `GuessLetter[]`, and a `GuessLetter` is just `{ letter,
status }` where `status` is `"absent" | "present" | "correct"` (see
`src/types.ts`). `GuessRow` renders one row of five single-character
`<input>`s and owns all the keyboard/click ergonomics:

- Typing a letter auto-advances focus to the next box; Backspace on an
  empty box moves focus back — small, deliberate UX so you can type a full
  guess without touching the mouse.
- Clicking a letter box, or focusing it and pressing **↑**/**↓**, cycles its
  status forward/backward through absent → present → correct (see
  `nextStatus`/`previousStatus` in `GuessRow.tsx`). Cycling only works once
  a letter's been typed — an empty box has no status to cycle.
- Every input carries an `aria-label` that states both the position and
  (once a letter's typed) the current status in plain English, e.g.
  `"Letter 3, in word, wrong position"` — this is what makes the status
  cycling usable with a screen reader, not just visually via color.

One more interaction worth knowing: clicking a suggested word in the
results list doesn't edit the current row — it calls `applyWordAsGuess`,
which **appends a brand-new guess row** pre-filled with that word (all
marked "absent" by default, ready for you to cycle each letter to its
actual result). `focusFirstInput` on the newest row is what auto-focuses
its first box so you can immediately start marking statuses.

## Theming

`src/index.css` defines semantic CSS custom properties (`--text`, `--bg`,
`--border`, `--letter-correct-bg`, etc.) with light-mode values on `:root`
and a `prefers-color-scheme: dark` override block. `App.css` and
`GuessRow`'s classes consume only `var(--token)` references — no hardcoded
colors anywhere outside `index.css`. There's no manual light/dark toggle in
the UI; it follows the OS/browser preference automatically (see
[una.im/modern-css-theming](https://una.im/modern-css-theming) for the
pattern this is based on). `e2e/dark-mode.spec.ts` verifies both themes via
Playwright's `page.emulateMedia`.

If you add a new colored element, add a token for it in both blocks of
`index.css` rather than hardcoding a color in a component's CSS — that's
the whole mechanism keeping dark mode correct.

## Tests

- **Unit tests** (Vitest + React Testing Library, `happy-dom` environment):
  `wordFilter.test.ts` is the one to read first — it's a good tour of the
  duplicate-letter edge cases described above, expressed as concrete
  examples. `App.test.tsx` covers the integration between typing guesses
  and seeing filtered/ranked results.
- **Accessibility**: `vitest-axe` is wired in from the start (per the
  cross-repo a11y rollout — see `~/Web/active_projects.md`), not bolted on
  later. A skipped heading level or missing accessible name fails tests,
  not just looks wrong.
- **E2E** (Playwright, Chromium only, headless): `e2e/wordle-helper.spec.ts`
  drives the real UI end-to-end against `yarn dev` on port 3140;
  `e2e/dark-mode.spec.ts` checks both color schemes render correctly. Runs
  in CI only, not pre-commit.

## Deployment

Built and deployed twice from the same source: **Netlify** (site root) and
**GitHub Pages** (`/wordle-helper/` subdirectory, alongside Craig's other
tools under the same domain). `yarn build:netlify` runs Vite twice with
different `--base`/`--outDir` flags to produce both bundles. CI
(`.github/workflows/test.yml`) runs format check → lint → build → tests →
Playwright e2e on every push to `main` and every PR; merging requires a
review from the repo's one code owner.

## A few conventions worth knowing up front

- **Commit messages**: short imperative title (≤50 chars), then a 3–4 line
  description of what changed and why.
- **Branch naming/commit types** follow `type/description` and
  `type(scope): description` conventions (`feat`, `fix`, `refactor`, `docs`,
  `test`, `chore`, `style`, `perf`, `build`, `ci`, `revert`) — see the root
  `active_projects.md` for the full table if you're not sure which to use.
- **CLAUDE.md stays current-state only** — architecture, commands, and
  design decisions, not a running changelog. Dated "what changed and why"
  narrative belongs in commit messages/PR descriptions for now; if this
  repo's CLAUDE.md ever accumulates several dated write-up sections, split
  them out into a `docs/HISTORY.md` (a pattern already used in a few
  sibling repos) rather than letting CLAUDE.md keep growing.
