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

# Install all project skills to ~/.claude/skills
install-skills: install-skill-mdtask install-skill-mdtask-create install-skill-mdtask-next install-skill-check
    @echo "All skills installed"

# Install mdtask skill to ~/.claude/skills
install-skill-mdtask:
    rm -rf ~/.claude/skills/mdtask
    mkdir -p ~/.claude/skills/mdtask
    cp docs/skills/mdtask/* ~/.claude/skills/mdtask/
    @echo "Installed mdtask skill"

# Install mdtask-create skill to ~/.claude/skills
install-skill-mdtask-create:
    rm -rf ~/.claude/skills/mdtask-create
    mkdir -p ~/.claude/skills/mdtask-create
    cp docs/skills/mdtask-create/* ~/.claude/skills/mdtask-create/
    @echo "Installed mdtask-create skill"

# Install mdtask-next skill to ~/.claude/skills
install-skill-mdtask-next:
    rm -rf ~/.claude/skills/mdtask-next
    mkdir -p ~/.claude/skills/mdtask-next
    cp docs/skills/mdtask-next/* ~/.claude/skills/mdtask-next/
    @echo "Installed mdtask-next skill"

# Install check skill to ~/.claude/skills
install-skill-check:
    rm -rf ~/.claude/skills/check
    mkdir -p ~/.claude/skills/check
    cp docs/skills/check/* ~/.claude/skills/check/
    @echo "Installed check skill"

# Release to npm (just release patch/minor/major)
release bump="patch":
    @git diff-index --quiet HEAD || (echo "Error: uncommitted changes" && exit 1)
    pnpm build
    pnpm test
    npm version {{bump}} --no-git-tag-version
    git add package.json
    git commit -m "v$(node -p "require('./package.json').version")"
    git tag "v$(node -p "require('./package.json').version")"
    pnpm publish --no-git-checks --access public
    git push --follow-tags
