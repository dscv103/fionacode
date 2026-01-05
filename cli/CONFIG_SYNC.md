# OpenCode Config Sync

This document explains how the `opencode.json` configuration is synchronized between the repository root and the CLI embedded assets.

## Automatic Sync Methods

### 1. Git Pre-Commit Hook (Recommended)

A Git pre-commit hook automatically syncs `opencode.json` whenever it's committed:

**Location**: `.git/hooks/pre-commit`

**How it works**:
- Detects when `opencode.json` is staged for commit
- Copies it to `cli/internal/assets/embedded/opencode.json`
- Automatically stages the CLI version

**Setup**: Already configured! The hook is executable and ready to use.

**Usage**: Just commit changes to `opencode.json` normally:
```bash
git add opencode.json
git commit -m "Update agent configurations"
# Hook automatically syncs to CLI and stages it
```

### 2. Makefile Target (Manual)

A Makefile target syncs the config before building:

**Location**: `cli/Makefile`

**Target**: `sync-config`

**Usage**:
```bash
cd cli
make sync-config    # Sync only
make build          # Automatically syncs before building
```

The `build` target depends on `sync-config`, so building always uses the latest config.

## File Locations

- **Source**: `opencode.json` (repository root)
- **Embedded**: `cli/internal/assets/embedded/opencode.json` (compiled into binary)

## Why Two Copies?

1. **Root `opencode.json`**: The source of truth for development and configuration
2. **CLI embedded**: Embedded into the `fifi` binary for distribution

When you run `fifi init`, it extracts this embedded config to `.opencode/opencode.json` in the user's project.

## Manual Sync (if needed)

If you need to manually sync:

```bash
cp opencode.json cli/internal/assets/embedded/opencode.json
```

## Verification

To verify the CLI has the latest config:

```bash
# Check if files are identical
diff opencode.json cli/internal/assets/embedded/opencode.json

# Build and test
cd cli
make build
./fifi --version
```

## Troubleshooting

### Hook not running?
- Check if it's executable: `ls -la .git/hooks/pre-commit`
- Make it executable: `chmod +x .git/hooks/pre-commit`

### Files out of sync?
- Run manual sync: `cd cli && make sync-config`
- Check git status: `git status`

### Hook skipped?
If you commit with `--no-verify`, the hook won't run. Sync manually:
```bash
cd cli && make sync-config
git add cli/internal/assets/embedded/opencode.json
git commit --amend --no-edit
```

## Release Process

The sync is automatic during the release process:

1. Update `opencode.json`
2. Commit (hook syncs automatically)
3. Push and tag: `git push origin v0.x.x`
4. GitHub Actions builds with synced config
5. Release includes latest configuration

## Notes

- The pre-commit hook only syncs when `opencode.json` in the root is staged
- Always test locally before releasing: `cd cli && make build && ./fifi init`
- The embedded config is read-only in the binary; users get a copy they can modify
