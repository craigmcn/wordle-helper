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

- **Word list:** `src/data/words.ts` — 8,506 five-letter words extracted from
  the macOS system dictionary (`/usr/share/dict/words`). Includes some
  obscure/archaic words; there's no offline source for the real NYT Wordle
  answer/guess lists.
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
  renders one row of 5 letter inputs, clicking a filled letter cycles
  absent → present → correct.

## Notes

- `eslint-plugin-jsx-a11y` + `vitest-axe` are wired in from the start (per
  the cross-repo a11y rollout in `~/Web/` `active_projects.md`), rather than
  bolted on later.
- Uses `.node-version` (not `.nvmrc`) — the toolchain standard is `mise`.
