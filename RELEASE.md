# Releasing fifi

## Prerequisites

1. **Install goreleaser**:
   ```bash
   go install github.com/goreleaser/goreleaser@latest
   ```

2. **Set up GitHub token** (if not already set):
   ```bash
   export GITHUB_TOKEN="your-github-token"
   ```

## Creating a Release

### 1. Ensure everything is committed

```bash
cd /home/dscv/Repositories/fionacode
git add .
git commit -m "Add fifi CLI tool"
git push origin main
```

### 2. Create and push a version tag

```bash
# Create a new version tag
git tag -a v0.1.0 -m "Initial release of fifi CLI"

# Push the tag
git push origin v0.1.0
```

### 3. GitHub Actions will automatically:

- Build binaries for all platforms (Linux, macOS, Windows)
- Create a GitHub Release
- Upload binaries and checksums
- Generate release notes

### 4. Monitor the release

Visit: https://github.com/dscv103/fionacode/actions

### 5. Verify the release

After the workflow completes:
1. Visit: https://github.com/dscv103/fionacode/releases
2. Check that binaries are uploaded
3. Test installation:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/dscv103/fionacode/main/cli/install.sh | bash
   ```

## Manual Release (Alternative)

If you prefer to release manually:

```bash
cd cli

# Test the release configuration
goreleaser build --snapshot --clean

# Create actual release (requires tag)
goreleaser release --clean
```

## Version Naming Convention

Follow semantic versioning:
- `v0.1.0` - Initial release
- `v0.1.1` - Bug fixes
- `v0.2.0` - New features (backward compatible)
- `v1.0.0` - Stable release

## Post-Release

### Update install script URL

The install script currently points to:
```
https://github.com/dscv103/fionacode/releases/download/${version}/${archive_name}
```

This should work automatically once the release is published.

### Announce the release

1. Update README.md with release information
2. Post in relevant communities
3. Share on social media

### Create Homebrew tap (optional)

For easier macOS/Linux installation:

```bash
# Create a new repository
gh repo create dscv103/homebrew-fifi --public

# The .goreleaser.yml is already configured to update the tap
# It will automatically update on each release
```

## Troubleshooting

### Release fails

1. Check GitHub Actions logs
2. Verify goreleaser.yml syntax
3. Ensure all files are committed
4. Check that tag follows semantic versioning

### Binary doesn't work

1. Test locally first:
   ```bash
   cd cli
   make build
   ./fifi --version
   ```

2. Test cross-compilation:
   ```bash
   make build-all
   ```

3. Check goreleaser build:
   ```bash
   goreleaser build --snapshot --clean
   ./dist/fifi_linux_amd64_v1/fifi --version
   ```

## Next Release

To create subsequent releases:

```bash
# Update version
git tag -a v0.2.0 -m "Release v0.2.0"
git push origin v0.2.0
```

The GitHub Actions workflow will handle the rest automatically.
