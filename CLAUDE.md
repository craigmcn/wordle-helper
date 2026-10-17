# wordle-helper

Enter Wordle guesses (marking each letter correct/present/absent) and see
which words are still possible, ranked by letter commonality. Built with
React 19, Vite 8, TypeScript 6 (strict).

## Commands

```bash
yarn dev             # dev server (http://localhost:3140)
yarn build           # tsc -b + production build → dist/
yarn build:netlify   # dual build: netlify/ (root) + netlify/wordle-helper/ (GH Pages)
yarn test            # vitest watch mode
yarn test:coverage   # vitest run --coverage
yarn test:e2e        # Playwright headless E2E (run `yarn playwright install` once first)
yarn lint            # ESLint (src, e2e)
yarn format:check    # Prettier check
```

## Architecture

- **Word list:** `src/data/words.ts` — the canonical 2,324-word NYT Wordle
  answer list, pulled directly from the Wordle game's own source code (see
  [cfreshman's gist](https://gist.github.com/cfreshman/a03ef2cba789d8cf00c08f767e0fad7b)).
  Previously derived from macOS dictionary words filtered by `wordfreq`
  corpus frequency, but that approximation both missed real answers (e.g.
  "toddy", the 2026-07-06 answer) and let proper nouns leak through; the
  official list fixes both. NYT adds new answers over time, so this list
  will drift again — re-sync from an updated source if gaps reappear.
- **Filtering:** `src/lib/wordFilter.ts` — `isWordPossible` replays each guess
  row's correct/present/absent constraints against a candidate word,
  including the duplicate-letter edge case (a letter marked both present and
  absent means the word has exactly that many occurrences, not more).
  `filterWords` skips any guess row that isn't fully filled in yet.
- **Ranking (stretch goal):** `rankWords` scores each remaining candidate by
  how common its letters are — positionally and overall — within the
  _remaining_ candidate pool itself (not real-world answer frequency data,
  which isn't available offline). Re-scored on every filter pass, so it
  adapts as the candidate list narrows. It also takes `src/data/recentSolutions.ts`
  (a compiled list of actual Wordle answers with dates, currently covering
  2025-07-15 through 2026-10-16) and scales a word's score down the more
  recently it was used as an answer, fading linearly back to no penalty at
  the one-year mark — since NYT started repeating older answers from
  2026-02-02 onward, this keeps freshly-used words from cluttering the top
  of suggestions without excluding them outright. Both data files drift out
  of date over time; re-sync from a Wordle answer archive site if gaps or
  stale rankings reappear.
- **UI:** `src/App.tsx` owns guess state; `src/components/GuessRow.tsx`
  renders one row of 5 single-character inputs. Typing a letter auto-focuses
  the next box; Backspace on an empty box moves focus back. A letter's
  status (absent → present → correct) cycles via click, or via &uarr;/&darr;
  while the box is focused (&uarr; forward, &darr; backward) — no mouse
  required. Whenever a letter is entered — typed, or filled by clicking a
  suggested word (which appends a new row) — it starts grey, unless an
  earlier row has the same letter marked correct in that position, in which
  case it starts green so known letters needn't be re-marked. Only boxes whose
  letter changed are re-derived; manually cycled statuses are left alone.
- **Theming:** `src/index.css` defines semantic CSS custom properties
  (`--text`, `--bg`, `--border`, `--border-strong`, per-letter-status
  colors, etc.) with light defaults on `:root` and a
  `prefers-color-scheme: dark` override block; `src/App.css` consumes only
  `var(--token)` references, no hardcoded colors. No manual light/dark
  toggle — follows [una.im/modern-css-theming](https://una.im/modern-css-theming).
  E2E-verified in `e2e/dark-mode.spec.ts` via `page.emulateMedia`.

## Notes

- `eslint-plugin-jsx-a11y` + `vitest-axe` are wired in from the start (per
  the cross-repo a11y rollout in `~/Web/` `active_projects.md`), rather than
  bolted on later.
- Uses `.node-version` (not `.nvmrc`) — the toolchain standard is `mise`.

## Open TODOs

Tracked as issues in the [wordle-helper GitHub Project](https://github.com/users/craigmcn/projects/14) (GitHub Actions bump).
