# Contributing

Thanks for helping make **Memories** better!

## Dev setup
- Node **20+** recommended.
- `npm i`, then `npm test` to verify the suite passes.
- Keep PRs focused and small.

## Code style
- ES Modules, no transpiler.
- Prefer small pure functions and explicit returns.
- Keep I/O at the edges (Synology client, HTTP, Apprise).

## Linting & tests
- `npm run lint` (eslint) and `npm run format` (prettier).
- Extend tests in `test/`. Avoid breaking snapshots without clear intent.

## Commits
- Use clear, conventional messages (fix:, feat:, docs:, chore:).
