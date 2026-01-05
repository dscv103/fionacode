# Changelog

All notable changes to the fifi CLI tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.5] - 2026-01-05

### Fixed
- Fixed MotherDuck MCP server configuration in opencode.json and opencode.disabled.json
  - Changed from npx to uvx (Python package manager)
  - Corrected package name to `mcp-server-motherduck`
  - Added required `--db-path` argument with `:memory:` default
  - Updated environment variable to use lowercase `motherduck_token`

## [0.1.4] - 2026-01-05

### Fixed
- Fixed install script to work with simplified binary names in release archives
- Updated goreleaser config to use simple `fifi` binary name inside archives instead of platform-specific names

## [0.1.3] - 2026-01-05

### Added
- Git pre-commit hook for automatic opencode.json sync between repo root and CLI embedded assets
- Makefile `sync-config` target for manual configuration synchronization
- CONFIG_SYNC.md documentation explaining sync mechanisms and troubleshooting
- MCP server permissions configuration for all 14 agents with role-based access control
- MotherDuck MCP server integration replacing SQLite and PostgreSQL

### Changed
- Updated Context7 MCP server URL from `context7.modelcontextprotocol.io/v1` to `mcp.context7.com/mcp`
- Enhanced build process to automatically sync configuration before compilation
- Improved agent MCP permissions with granular access control:
  - Full access (all 5 MCP servers): orchestrator, implementer, code-review, planning, security-review, compliance, diagnostics, refactoring, integration
  - Limited access: web-research (github + context7 + code-reasoning), file-navigator (filesystem + motherduck), executor (filesystem + motherduck), docs (github + context7 + motherduck + filesystem), communication (github + filesystem)

### Removed
- SQLite MCP server (archived package, replaced by MotherDuck)
- PostgreSQL MCP server (redundant with MotherDuck capabilities)

### Fixed
- MCP server configurations now properly synchronized between development and CLI distribution

## [0.1.1] - 2026-01-04

### Fixed
- Corrected JSON structure from "agents" to "agent" in opencode.json configuration
- Updated validation code to properly recognize "agent" field instead of "agents"
- Fixed embedded template to use correct "agent" key

## [0.1.0] - 2026-01-04

Initial release of fifi CLI tool.

### Added
- Initial implementation of fifi CLI tool
- `init` command to initialize FionaCode projects
- `validate` command to validate existing configurations
- Asset embedding of opencode.json and .opencode directory
- Cross-platform support (Linux, macOS, Windows)
- Installation script for easy distribution
- Automated release workflow via GitHub Actions
- Comprehensive documentation

### Features
- Initialize new FionaCode projects with `fifi init`
- Validate existing configurations with `fifi validate`
- Embed 34 configuration files in single binary
- Support for Linux (amd64, arm64), macOS (amd64, arm64), and Windows (amd64)
- Installation script for automated setup
- Version information with build date

[Unreleased]: https://github.com/dscv103/fionacode/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/dscv103/fionacode/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/dscv103/fionacode/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/dscv103/fionacode/releases/tag/v0.1.0
