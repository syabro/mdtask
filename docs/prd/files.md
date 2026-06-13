# Files — mdtask

File search across project.

## File search

The `findMarkdownFiles()` function discovers all `.md` files recursively within a base directory. It uses ripgrep (`rg`) as the primary search tool for speed, with automatic fallback to the standard `find` command if ripgrep is unavailable.

The function:
- Searches recursively including hidden directories
- Returns absolute paths sorted alphabetically
- Excludes `node_modules` and `.git` directories by default
- Supports additional exclusions via the `excludeDirs` option or `MDTASK_EXCLUDE_DIRS` environment variable
- Handles file names with spaces and special characters

# Tasks

