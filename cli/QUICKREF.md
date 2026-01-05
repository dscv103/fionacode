# fifi CLI - Quick Reference

## Installation

```bash
# Via install script (recommended)
curl -fsSL https://raw.githubusercontent.com/dscv103/fionacode/main/cli/install.sh | bash

# Or build from source
git clone https://github.com/dscv103/fionacode.git
cd fionacode/cli
make build
sudo make install
```

## Commands

### Initialize a Project

```bash
# In current directory
fifi init

# In new directory
fifi init my-project

# Creates:
# - opencode.json
# - .opencode/prompts/ (14 files)
# - .opencode/tool/ (20 files)
```

### Validate Configuration

```bash
# Basic validation
fifi validate

# With summary
fifi validate --summary

# Specific directory
fifi validate /path/to/project
```

### Version Info

```bash
fifi --version
```

### Help

```bash
fifi --help
fifi init --help
fifi validate --help
```

## Workflow

1. **Install fifi**
   ```bash
   curl -fsSL https://raw.githubusercontent.com/dscv103/fionacode/main/cli/install.sh | bash
   ```

2. **Initialize project**
   ```bash
   mkdir my-ai-project && cd my-ai-project
   fifi init
   ```

3. **Install OpenCode** (if needed)
   ```bash
   curl -fsSL https://opencode.ai/install | bash
   ```

4. **Configure API keys**
   ```bash
   export ANTHROPIC_API_KEY="your-key"
   export OPENAI_API_KEY="your-key"
   ```

5. **Customize configuration**
   ```bash
   # Edit opencode.json
   vim opencode.json
   
   # Validate changes
   fifi validate --summary
   ```

6. **Start OpenCode**
   ```bash
   opencode
   ```

## Development

### Build

```bash
cd cli

# Build for current platform
make build

# Build for all platforms
make build-all

# Clean build artifacts
make clean
```

### Test

```bash
# Run tests
make test

# Test binary
./fifi init /tmp/test-project
./fifi validate /tmp/test-project
```

### Install Locally

```bash
# Install to /usr/local/bin
make install

# Install to ~/.local/bin
make install-local
```

## File Structure

```
my-project/
├── opencode.json                      # Main configuration
└── .opencode/
    ├── prompts/                       # Agent prompts (14 files)
    │   ├── orchestrator.txt
    │   ├── implementer.txt
    │   ├── code-review.txt
    │   └── ...
    └── tool/                          # Custom tools (20 files)
        ├── task_tracker.ts
        ├── coverage_analyzer.ts
        ├── test_runner_smart.py
        └── ...
```

## Environment Variables

```bash
# Required
export ANTHROPIC_API_KEY="sk-..."

# Optional
export OPENAI_API_KEY="sk-..."
export OPENAI_MODEL="gpt-4"
export OPENCODE_LOG_LEVEL="info"
```

## Troubleshooting

### Binary not found after install
```bash
# Add to PATH
export PATH="$PATH:$HOME/.local/bin"

# Or for permanent
echo 'export PATH="$PATH:$HOME/.local/bin"' >> ~/.bashrc
source ~/.bashrc
```

### Permission denied
```bash
chmod +x ~/.local/bin/fifi
```

### Files already exist
```bash
# Remove existing files
rm opencode.json
rm -rf .opencode

# Or initialize in different directory
fifi init new-project
```

## Links

- **Repository**: https://github.com/dscv103/fionacode
- **CLI Documentation**: https://github.com/dscv103/fionacode/tree/main/cli
- **Releases**: https://github.com/dscv103/fionacode/releases
- **Issues**: https://github.com/dscv103/fionacode/issues
- **OpenCode**: https://opencode.ai
