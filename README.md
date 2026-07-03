# Wordle Helper

Enter your Wordle guesses — marking each letter as correct, present, or
absent — and see the list of English words that are still possible.

Remaining words are ranked by how common their letters are among the other
remaining candidates, as a lightweight stand-in for real answer-popularity
data (which isn't available offline).

The word list is the macOS system dictionary's five-letter words, so it
includes some obscure entries alongside common ones.

## Development

```bash
yarn install
yarn dev
```

## Scripts

- `yarn dev` — start the dev server
- `yarn build` — type-check and build for production
- `yarn test` — run tests in watch mode
- `yarn test:coverage` — run tests once with coverage
- `yarn lint` — lint `src`
- `yarn format` / `yarn format:check` — Prettier
