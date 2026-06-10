# mdtask website

Astro landing page for mdtask. Lives in a git worktree on the `website` branch of the main repo.

## Local preview

```bash
pnpm dev
```

Astro dev server with hot reload at http://localhost:4321. Use it to preview changes —
no build step needed, no ad-hoc static servers over `dist/`.

## Deploy

```bash
just deploy
```

Builds with Astro, deploys to Cloudflare Pages via `wrangler pages deploy` (project: `mdtask-dev`).

## Content checks

Run `/check-website` from the main mdtask worktree to verify website content matches project docs.
