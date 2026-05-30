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

# Install all project skills to ~/.agents/skills
install-skills: install-skill-sdd install-skill-mdtask install-skill-mdtask-create install-skill-mdtask-next
    @echo "All skills installed"

# Install sdd skill to ~/.agents/skills
install-skill-sdd:
    rm -rf ~/.agents/skills/sdd
    mkdir -p ~/.agents/skills/sdd
    cp docs/skills/sdd/* ~/.agents/skills/sdd/
    @echo "Installed sdd skill"

# Install mdtask skill to ~/.agents/skills
install-skill-mdtask:
    rm -rf ~/.agents/skills/mdtask
    mkdir -p ~/.agents/skills/mdtask
    cp docs/skills/mdtask/* ~/.agents/skills/mdtask/
    @echo "Installed mdtask skill"

# Install mdtask-create skill to ~/.agents/skills
install-skill-mdtask-create:
    rm -rf ~/.agents/skills/mdtask-create
    mkdir -p ~/.agents/skills/mdtask-create
    cp docs/skills/mdtask-create/* ~/.agents/skills/mdtask-create/
    @echo "Installed mdtask-create skill"

# Install mdtask-next skill to ~/.agents/skills
install-skill-mdtask-next:
    rm -rf ~/.agents/skills/mdtask-next
    mkdir -p ~/.agents/skills/mdtask-next
    cp docs/skills/mdtask-next/* ~/.agents/skills/mdtask-next/
    @echo "Installed mdtask-next skill"

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
