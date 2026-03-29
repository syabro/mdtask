deploy:
    pnpm astro build
    wrangler pages deploy dist --project-name mdtask-dev --commit-dirty=true
