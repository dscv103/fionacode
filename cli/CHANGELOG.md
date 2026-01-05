# Changelog

All notable changes to the fifi CLI tool will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of fifi CLI tool
- `init` command to initialize FionaCode projects
- `validate` command to validate existing configurations
- Asset embedding of opencode.json and .opencode directory
- Cross-platform support (Linux, macOS, Windows)
- Installation script for easy distribution
- Automated release workflow via GitHub Actions
- Comprehensive documentation

### Changed
- N/A (initial release)

### Deprecated
- N/A (initial release)

### Removed
- N/A (initial release)

### Fixed
- Corrected JSON structure from "agents" to "agent" in opencode.json configuration
- Updated validation code to properly recognize "agent" field instead of "agents"
- Fixed embedded template to use correct "agent" key

### Security
- N/A (initial release)

## [0.1.0] - TBD

Initial release of fifi CLI tool.

### Features
- Initialize new FionaCode projects with `fifi init`
- Validate existing configurations with `fifi validate`
- Embed 34 configuration files in single binary
- Support for Linux (amd64, arm64), macOS (amd64, arm64), and Windows (amd64)
- Installation script for automated setup
- Version information with build date

[Unreleased]: https://github.com/dscv103/fionacode/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/dscv103/fionacode/releases/tag/v0.1.0
