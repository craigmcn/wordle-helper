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
yarn lint            # ESLint (src)
yarn format:check    # Prettier check
```

## Architecture

- **Word list:** `src/data/words.ts` — 2,403 five-letter words: macOS system
  dictionary words (`/usr/share/dict/words`) filtered to those with a Zipf
  frequency ≥ 2.7 in the `wordfreq` English corpus. This intersection filters
  out both obscure dictionary entries and proper nouns (which `wordfreq`'s
  corpus alone doesn't exclude), landing close to the size of the real NYT
  Wordle answer list (~2,300 words) — there's no offline source for the
  actual list. Regenerate via a throwaway `wordfreq` venv if the cutoff needs
  tuning; see git history for the exact filtering script.
- **Filtering:** `src/lib/wordFilter.ts` — `isWordPossible` replays each guess
  row's correct/present/absent constraints against a candidate word,
  including the duplicate-letter edge case (a letter marked both present and
  absent means the word has exactly that many occurrences, not more).
  `filterWords` skips any guess row that isn't fully filled in yet.
- **Ranking (stretch goal):** `rankWords` scores each remaining candidate by
  how common its letters are — positionally and overall — within the
  _remaining_ candidate pool itself (not real-world answer frequency data,
  which isn't available offline). Re-scored on every filter pass, so it
  adapts as the candidate list narrows.
- **UI:** `src/App.tsx` owns guess state; `src/components/GuessRow.tsx`
  renders one row of 5 single-character inputs. Typing a letter auto-focuses
  the next box; Backspace on an empty box moves focus back. A letter's
  status (absent → present → correct) cycles via click, or via &uarr;/&darr;
  while the box is focused (&uarr; forward, &darr; backward) — no mouse
  required.

## Notes

- `eslint-plugin-jsx-a11y` + `vitest-axe` are wired in from the start (per
  the cross-repo a11y rollout in `~/Web/` `active_projects.md`), rather than
  bolted on later.
- Uses `.node-version` (not `.nvmrc`) — the toolchain standard is `mise`.
