# Rule Commit Push Code

Use this checklist before committing or pushing backend changes.

## Commit rules

- Check scope first: `git status --short --untracked-files=all`.
- Do not commit one large mixed change unless the change is truly atomic.
- Split commits by feature or fix group:
  - `feat: ...` for a new user-facing/API feature.
  - `fix: ...` for bug fixes or behavior corrections.
  - `refactor: ...` only when behavior stays the same.
  - `docs: ...` for documentation-only changes.
  - `chore: ...` for tooling, config, generated maintenance, or cleanup.
- Prefer staging explicit paths: `git add path/to/file.ts path/to/other.ts`.
- Use `git add -p` when one file contains unrelated changes.
- Keep each commit buildable when practical.
- Do not stage `.env`, local dumps, logs, `.DS_Store`, `dist`, or `node_modules`.

## Backend verification

- Run `npm run build` before committing TypeScript/API changes.
- Run targeted smoke/provider scripts when the touched area needs it:
  - `npm run test:smoke`
  - `npm run test:providers`
- For Prisma changes, include schema, migration, and related seed/service changes in the same commit.
- Mention any skipped verification in the final note.

## Push rules

- Review the final commits with `git log --oneline -n 10`.
- Check the tree again with `git status --short`.
- Push only after commits are split cleanly and verification is done.
- If pushing a shared branch, use normal `git push`; avoid force push unless explicitly approved.
