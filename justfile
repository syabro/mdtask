# mdtask development commands

# Install mdtask skill globally for Claude Code
install:
    mkdir -p ~/.claude/skills/mdtask
    cp .claude/skills/mdtask/SKILL.md ~/.claude/skills/mdtask/SKILL.md
    @echo "mdtask skill installed to ~/.claude/skills/mdtask/"
