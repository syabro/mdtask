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
install-skills: install-skill-sdd install-skill-mdtask install-skill-mdtask-add install-skill-mdtask-do
    @echo "All skills installed"

# Install sdd skill to ~/.agents/skills
install-skill-sdd:
    rm -rf ~/.agents/skills/sdd
    mkdir -p ~/.agents/skills/sdd
    cp skills/sdd/* ~/.agents/skills/sdd/
    @echo "Installed sdd skill"

# Install mdtask skill to ~/.agents/skills
install-skill-mdtask:
    rm -rf ~/.agents/skills/mdtask
    mkdir -p ~/.agents/skills/mdtask
    cp skills/mdtask/* ~/.agents/skills/mdtask/
    @echo "Installed mdtask skill"

# Install mdtask-add skill to ~/.agents/skills
install-skill-mdtask-add:
    rm -rf ~/.agents/skills/mdtask-create
    rm -rf ~/.agents/skills/mdtask-add
    mkdir -p ~/.agents/skills/mdtask-add
    cp skills/mdtask-add/* ~/.agents/skills/mdtask-add/
    @echo "Installed mdtask-add skill"

# Install mdtask-do skill to ~/.agents/skills
install-skill-mdtask-do:
    rm -rf ~/.agents/skills/mdtask-do
    mkdir -p ~/.agents/skills/mdtask-do
    cp skills/mdtask-do/* ~/.agents/skills/mdtask-do/
    @echo "Installed mdtask-do skill"

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
