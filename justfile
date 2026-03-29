# mdtask development commands

# Build the project
build:
    pnpm build

# Run tests
test:
    pnpm test

# Lint and check formatting
lint:
    pnpm lint

# Fix lint and formatting issues
lint-fix:
    pnpm lint:fix

# Watch mode for development
dev:
    pnpm dev

# Release to npm (just release patch/minor/major)
release bump="patch":
    @git diff-index --quiet HEAD || (echo "Error: uncommitted changes" && exit 1)
    pnpm build
    pnpm test
    npm version {{bump}} --no-git-tag-version
    git add package.json
    git commit -m "v$(node -p "require('./package.json').version")"
    git tag "v$(node -p "require('./package.json').version")"
    pnpm publish --no-git-checks
    git push --follow-tags
