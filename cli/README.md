# fifi - FionaCode CLI

A command-line tool for initializing OpenCode AI projects with the FionaCode configuration.

## Overview

`fifi` packages the FionaCode multi-agent AI development framework configuration, making it easy to start new projects with a proven setup. It includes:

- **opencode.json**: Main configuration with 13 specialized AI agents
- **.opencode/prompts/**: 14 agent-specific prompt templates
- **.opencode/tool/**: 20 custom tools (TypeScript and Python)

## Installation

### Using the install script (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/dscv103/fionacode/main/cli/install.sh | bash
```

This will download the latest release binary and install it to `~/.local/bin/fifi`.

### Using Homebrew (macOS/Linux)

```bash
brew tap dscv103/fifi
brew install fifi
```

### Manual installation

1. Download the latest release from [GitHub Releases](https://github.com/dscv103/fionacode/releases)
2. Extract the archive
3. Move the `fifi` binary to a directory in your PATH

## Usage

### Initialize a new project

Initialize FionaCode in the current directory:

```bash
fifi init
```

Initialize FionaCode in a new directory:

```bash
fifi init my-project
cd my-project
```

This will create:
- `opencode.json` - Main configuration file
- `.opencode/prompts/` - 14 agent prompt files
- `.opencode/tool/` - 20 custom tool implementations

### Validate configuration

Validate the FionaCode configuration in the current directory:

```bash
fifi validate
```

Validate with summary:

```bash
fifi validate --summary
```

Validate a specific directory:

```bash
fifi validate /path/to/project
```

### Show version

```bash
fifi version
```

## Next Steps After Installation

After running `fifi init`, you'll need to:

1. **Install OpenCode CLI** (if not already installed):
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```

2. **Set up API keys** in your environment:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   export OPENAI_API_KEY="your-key-here"
   ```

3. **Review the configuration**:
   - Edit `opencode.json` to customize agents and tools
   - Modify prompts in `.opencode/prompts/` for your use case

4. **Start OpenCode**:
   ```bash
   opencode
   ```

## Configuration Structure

```
your-project/
├── opencode.json              # Main configuration
└── .opencode/
    ├── prompts/               # Agent prompt templates
    │   ├── orchestrator.md
    │   ├── implementer.md
    │   ├── code-review.md
    │   └── ... (11 more)
    └── tool/                  # Custom tools
        ├── task_tracker.ts
        ├── coverage_analyzer.ts
        └── ... (18 more)
```

## Building from Source

### Prerequisites

- Go 1.23 or later

### Build

```bash
cd cli
go mod download
go build -o fifi ./cmd/fifi
```

### Run locally

```bash
./fifi init
```

### Build for all platforms

Install [goreleaser](https://goreleaser.com/):

```bash
go install github.com/goreleaser/goreleaser@latest
```

Build release binaries:

```bash
goreleaser build --snapshot --clean
```

Binaries will be in `dist/`.

## Development

### Project structure

```
cli/
├── cmd/fifi/              # CLI entry point
│   ├── main.go           # Root command
│   ├── init.go           # Init command
│   └── validate.go       # Validate command
├── internal/
│   ├── assets/           # Embedded assets
│   │   └── embed.go      # go:embed directives
│   ├── init/             # Initialization logic
│   │   └── init.go
│   └── validate/         # Validation logic
│       └── validate.go
├── assets/               # Source assets (embedded)
│   ├── opencode.json
│   └── .opencode/
├── go.mod
├── go.sum
├── .goreleaser.yml       # Release configuration
└── README.md
```

### Adding new commands

1. Create a new file in `cmd/fifi/`
2. Define a cobra command
3. Register it with `rootCmd.AddCommand()` in the `init()` function

Example:

```go
package main

import (
    "github.com/spf13/cobra"
)

var myCmd = &cobra.Command{
    Use:   "my-command",
    Short: "Description",
    RunE: func(cmd *cobra.Command, args []string) error {
        // Implementation
        return nil
    },
}

func init() {
    rootCmd.AddCommand(myCmd)
}
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

See [LICENSE](../LICENSE) in the root of the repository.

## Related Projects

- [OpenCode AI](https://opencode.ai) - The AI development framework
- [FionaCode](https://github.com/dscv103/fionacode) - The configuration repository

## Support

- Issues: [GitHub Issues](https://github.com/dscv103/fionacode/issues)
- Discussions: [GitHub Discussions](https://github.com/dscv103/fionacode/discussions)
