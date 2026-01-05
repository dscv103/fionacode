# FionaCode Configuration Guide

Complete guide to configuring FionaCode's agents, tools, permissions, and workflows.

---

## Table of Contents

- [Configuration File Structure](#configuration-file-structure)
- [Agent Configuration](#agent-configuration)
- [Tool Configuration](#tool-configuration)
- [Permission System](#permission-system)
- [MCP Servers](#mcp-servers)
- [LSP Servers](#lsp-servers)
- [Formatters](#formatters)
- [Environment Variables](#environment-variables)
- [Configuration Examples](#configuration-examples)

---

## Configuration File Structure

FionaCode uses a single `opencode.json` (or `opencode.jsonc`) file at the project root.

### Basic Structure

```jsonc
{
  // Schema for autocomplete and validation
  "$schema": "https://opencode.ai/config.json",
  
  // Agent definitions
  "agents": {
    "agent-name": { /* agent config */ }
  },
  
  // Global tool settings
  "tools": {
    "tool-name": true | false
  },
  
  // Permission settings
  "permission": {
    "edit": "allow" | "ask" | "deny",
    "bash": { /* bash-specific config */ },
    "skill": { /* skill-specific config */ }
  },
  
  // MCP server connections
  "mcp": {
    "server-name": { /* mcp config */ }
  },
  
  // LSP server settings
  "lsp": {
    "server-name": { /* lsp config */ }
  },
  
  // Formatter settings
  "formatter": {
    "formatter-name": { /* formatter config */ }
  },
  
  // Custom commands
  "command": {
    "command-name": { /* command config */ }
  },
  
  // Instructions files
  "instructions": ["CONTRIBUTING.md", "docs/guidelines.md"],
  
  // TUI settings
  "tui": { /* tui config */ },
  
  // Theme
  "theme": "opencode",
  
  // Default model
  "model": "anthropic/claude-sonnet-4-5",
  
  // Auto-update
  "autoupdate": true
}
```

---

## Agent Configuration

### Agent Structure

Each agent is configured with:

```jsonc
{
  "agents": {
    "agent-name": {
      // Human-readable description for orchestrator
      "description": "Brief description of agent's role and capabilities",
      
      // Agent mode: "primary" or "subagent"
      "mode": "subagent",
      
      // Temperature: 0.1 (deterministic) to 0.3 (creative)
      "temperature": 0.2,
      
      // Path to agent prompt file
      "prompt": ".opencode/prompts/agent-name.txt",
      
      // Tools available to agent
      "tools": {
        "read": true,
        "edit": false,
        "bash": true,
        "custom_tool": true,
        "mcp_*": false  // Wildcard patterns
      },
      
      // Permission overrides
      "permissions": {
        "edit": "deny",
        "bash": "allow",
        "webfetch": "ask"
      }
    }
  }
}
```

### Agent Modes

**Primary Agent**:
- Main entry point for user interaction
- Can switch between with Tab key
- Only one active at a time in a session
- Example: Orchestrator

**Subagent**:
- Invoked by primary agents or orchestrator
- Specialized for specific tasks
- Can run in nested sessions
- Examples: Implementer, Code Review, Diagnostics

### Temperature Guidelines

| Range | Use Case | Agents |
|-------|----------|--------|
| 0.1 | Highly deterministic, analytical | Code Review, Executor, Diagnostics, Security Review, Compliance, File Navigator |
| 0.2 | Structured reasoning with flexibility | Orchestrator, Planning, Refactoring, Integration, Web Research |
| 0.3 | Creative output generation | Implementer, Docs, Communication |

### Tool Selection

**Read-only Agents** (review, analysis, planning):
```jsonc
{
  "tools": {
    "read": true,
    "edit": false,
    "bash": true,
    "search": true,
    "list": true
  }
}
```

**Implementation Agents** (write code, tests):
```jsonc
{
  "tools": {
    "read": true,
    "edit": true,
    "bash": true,
    "search": true,
    "type_check_aggregator": true,
    "coverage_analyzer": true
  }
}
```

**Integration Agents** (CI/CD, releases):
```jsonc
{
  "tools": {
    "read": true,
    "edit": true,
    "bash": true,
    "github_*": true,
    "changelog_generator": true,
    "dependency_auditor": true
  }
}
```

---

## Tool Configuration

### Global Tool Settings

Control tool availability across all agents:

```jsonc
{
  "tools": {
    // Disable specific tools
    "write": false,
    
    // Enable specific tools
    "webfetch": true,
    
    // Wildcard patterns
    "github_*": false,        // Disable all GitHub MCP tools
    "mcp_context7_*": true,   // Enable all Context7 tools
    "custom_*": true          // Enable all custom tools starting with "custom_"
  }
}
```

### Per-Agent Tool Override

Agent configurations override global settings:

```jsonc
{
  "tools": {
    // Global: disable GitHub tools
    "github_*": false
  },
  "agents": {
    "integration": {
      "tools": {
        // Override: enable for integration agent
        "github_*": true
      }
    }
  }
}
```

### Built-in Tools

| Tool | Purpose | Default |
|------|---------|---------|
| `bash` | Execute shell commands | enabled |
| `edit` | Modify existing files | enabled |
| `write` | Create new files | enabled |
| `read` | Read file contents | enabled |
| `grep` | Search file contents | enabled |
| `glob` | Find files by pattern | enabled |
| `list` | List directory contents | enabled |
| `patch` | Apply patches | enabled |
| `skill` | Load agent skills | enabled |
| `todowrite` | Manage todo lists | enabled |
| `todoread` | Read todo lists | enabled |
| `webfetch` | Fetch web content | enabled |

### Custom Tools

Custom tools are automatically discovered from:
- `.opencode/tool/*.ts`
- `~/.config/opencode/tool/*.ts`

Enable/disable per agent:
```jsonc
{
  "agents": {
    "implementer": {
      "tools": {
        "coverage_analyzer": true,
        "type_check_aggregator": true,
        "test_runner_smart": true
      }
    }
  }
}
```

---

## Permission System

### Permission Levels

- **`allow`**: Agent can execute without approval
- **`ask`**: Agent must request user approval
- **`deny`**: Agent cannot execute (tool disabled)

### Global Permissions

```jsonc
{
  "permission": {
    "edit": "ask",               // Ask before file edits
    "bash": "ask",               // Ask before bash commands
    "skill": "allow",            // Allow skill loading
    "webfetch": "deny",          // Deny web fetching
    "doom_loop": "ask",          // Ask for subagent loops (default)
    "external_directory": "ask"  // Ask for external dir access (default)
  }
}
```

### Bash Permissions

#### Simple Mode

```jsonc
{
  "permission": {
    "bash": "ask"  // Ask for all bash commands
  }
}
```

#### Command-Specific Mode

```jsonc
{
  "permission": {
    "bash": {
      // Allow specific commands
      "git status": "allow",
      "git diff": "allow",
      "npm run build": "allow",
      
      // Ask for specific commands
      "git push": "ask",
      "npm publish": "ask",
      
      // Deny specific commands
      "rm -rf": "deny",
      
      // Wildcard patterns
      "terraform *": "deny",      // Deny all terraform commands
      "git commit *": "ask",      // Ask for all git commit commands
      
      // Default for unlisted commands
      "*": "ask"
    }
  }
}
```

#### Wildcard Patterns

Wildcards use regex globbing:
- `*` matches zero or more characters
- `?` matches exactly one character
- All other characters match literally

**Examples**:
```jsonc
{
  "permission": {
    "bash": {
      "git *": "ask",          // Ask for any git command
      "npm * --force": "deny", // Deny npm commands with --force
      "pytest test_*.py": "allow", // Allow pytest on test files
      "*": "deny"              // Deny everything else
    }
  }
}
```

### Skill Permissions

Control skill loading:

```jsonc
{
  "permission": {
    "skill": {
      // Allow specific skills
      "pr-review": "allow",
      "code-analysis": "allow",
      
      // Ask for specific skills
      "refactoring": "ask",
      
      // Deny skills
      "dangerous-*": "deny",    // Deny skills starting with "dangerous-"
      
      // Default
      "*": "allow"
    }
  }
}
```

### Per-Agent Permissions

Override global permissions per agent:

```jsonc
{
  "permission": {
    // Global: ask before edits
    "edit": "ask",
    "bash": "ask"
  },
  "agents": {
    "implementer": {
      "permissions": {
        // Override: allow autonomous editing
        "edit": "allow",
        "bash": "allow"
      }
    },
    "code-review": {
      "permissions": {
        // Override: deny all edits
        "edit": "deny",
        "bash": "allow"
      }
    }
  }
}
```

---

## MCP Servers

### MCP Server Structure

```jsonc
{
  "mcp": {
    "server-name": {
      // Server type
      "type": "local" | "remote",
      
      // Enable/disable
      "enabled": true | false,
      
      // Timeout (optional)
      "timeout": 5000,  // milliseconds
      
      // Type-specific config...
    }
  }
}
```

### Local MCP Servers

Run MCP servers as local processes:

```jsonc
{
  "mcp": {
    "filesystem": {
      "type": "local",
      "command": ["npx", "-y", "@modelcontextprotocol/server-filesystem", "."],
      "enabled": true,
      "timeout": 5000,
      "environment": {
        "MY_ENV_VAR": "{env:MY_ENV_VAR}"  // Reference env vars
      }
    },
    "sqlite": {
      "type": "local",
      "command": [
        "npx",
        "-y",
        "@modelcontextprotocol/server-sqlite",
        "--db-path",
        ".opencode/state/metadata.db"
      ],
      "enabled": true
    }
  }
}
```

### Remote MCP Servers

Connect to remote MCP servers via HTTP:

```jsonc
{
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_MCP_PAT}"
      }
    },
    "context7": {
      "type": "remote",
      "url": "https://context7.modelcontextprotocol.io/v1",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:CONTEXT7_API_KEY}"
      }
    }
  }
}
```

### Environment Variable Substitution

Use `{env:VAR_NAME}` syntax to reference environment variables:

```jsonc
{
  "headers": {
    "Authorization": "Bearer {env:API_KEY}",
    "X-Custom-Header": "{env:CUSTOM_VALUE}"
  }
}
```

### OAuth Authentication

For remote servers supporting OAuth:

```jsonc
{
  "mcp": {
    "oauth-server": {
      "type": "remote",
      "url": "https://api.example.com/mcp/",
      "oauth": {
        "client_id": "{env:OAUTH_CLIENT_ID}",
        "client_secret": "{env:OAUTH_CLIENT_SECRET}",
        "authorization_url": "https://auth.example.com/authorize",
        "token_url": "https://auth.example.com/token",
        "scopes": ["read", "write"]
      }
    }
  }
}
```

---

## LSP Servers

### LSP Server Structure

```jsonc
{
  "lsp": {
    "server-name": {
      // Disable server
      "disabled": false,
      
      // Command to start server
      "command": ["language-server", "--stdio"],
      
      // File extensions
      "extensions": [".py", ".pyi"],
      
      // Environment variables
      "env": {
        "PYTHONPATH": "src/"
      },
      
      // Initialization options
      "initialization": {
        "python": {
          "analysis": {
            "typeCheckingMode": "strict"
          }
        }
      }
    }
  }
}
```

### Disable All LSP Servers

```jsonc
{
  "lsp": false
}
```

### Disable Specific LSP Server

```jsonc
{
  "lsp": {
    "typescript": {
      "disabled": true
    }
  }
}
```

### Custom LSP Server

```jsonc
{
  "lsp": {
    "custom-lsp": {
      "command": ["custom-lsp-server", "--stdio"],
      "extensions": [".custom"],
      "env": {
        "LSP_LOG_LEVEL": "debug"
      }
    }
  }
}
```

### Common LSP Configurations

**Python (Pyright)**:
```jsonc
{
  "lsp": {
    "pyright": {
      "initialization": {
        "python": {
          "analysis": {
            "typeCheckingMode": "strict",
            "diagnosticMode": "workspace",
            "useLibraryCodeForTypes": true
          }
        }
      }
    }
  }
}
```

**TypeScript**:
```jsonc
{
  "lsp": {
    "typescript": {
      "initialization": {
        "typescript": {
          "preferences": {
            "quoteStyle": "double",
            "importModuleSpecifierPreference": "relative"
          }
        }
      }
    }
  }
}
```

---

## Formatters

### Formatter Structure

```jsonc
{
  "formatter": {
    "formatter-name": {
      // Disable formatter
      "disabled": false,
      
      // Command to run
      "command": ["formatter-cli", "format"],
      
      // Environment variables
      "environment": {
        "FORMATTER_CONFIG": ".formatterrc"
      },
      
      // File extensions
      "extensions": [".ts", ".tsx"]
    }
  }
}
```

### Disable All Formatters

```jsonc
{
  "formatter": false
}
```

### Disable Specific Formatter

```jsonc
{
  "formatter": {
    "prettier": {
      "disabled": true
    }
  }
}
```

### Custom Formatter

```jsonc
{
  "formatter": {
    "black": {
      "command": ["black", "--line-length=100", "{file}"],
      "extensions": [".py"],
      "environment": {
        "BLACK_CONFIG": "pyproject.toml"
      }
    }
  }
}
```

### Formatter Precedence

If multiple formatters match a file extension, OpenCode uses:
1. Most specific formatter (longest extension match)
2. First formatter in config order

---

## Environment Variables

### OpenCode Environment Variables

```bash
# Configuration
export OPENCODE_CONFIG="/path/to/opencode.json"
export OPENCODE_CONFIG_DIR="/path/to/config/dir"

# LSP
export OPENCODE_DISABLE_LSP_DOWNLOAD="true"

# Experimental features
export OPENCODE_EXPERIMENTAL="true"
export OPENCODE_EXPERIMENTAL_LSP_TOOL="true"

# Logging
export OPENCODE_LOG_LEVEL="debug"  # debug, info, warn, error
```

### FionaCode-Specific Variables

```bash
# MCP Servers
export GITHUB_MCP_PAT="ghp_..."
export CONTEXT7_API_KEY="..."

# Python environment
export PYTHONPATH="src/:tests/"

# Coverage thresholds
export COVERAGE_THRESHOLD="70"

# Custom tool timeouts
export TOOL_TIMEOUT_MS="300000"
```

### Loading Environment Variables

**.env file** (project root):
```bash
# .env
GITHUB_MCP_PAT=ghp_your_token_here
CONTEXT7_API_KEY=your_key_here
```

**Load in shell**:
```bash
# Export from .env
export $(cat .env | xargs)

# Or use direnv
direnv allow
```

---

## Configuration Examples

### Example 1: Minimal Configuration

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "anthropic/claude-sonnet-4-5",
  "theme": "opencode"
}
```

### Example 2: Secure Development

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  "permission": {
    "edit": "ask",
    "bash": {
      "git status": "allow",
      "git diff": "allow",
      "npm test": "allow",
      "git push": "ask",
      "*": "deny"
    },
    "webfetch": "ask",
    "skill": "ask"
  },
  
  "tools": {
    "github_*": false
  }
}
```

### Example 3: Python Project

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  "agents": {
    "implementer": {
      "tools": {
        "coverage_analyzer": true,
        "type_check_aggregator": true,
        "test_runner_smart": true,
        "fixture_generator": true
      }
    },
    "code-review": {
      "tools": {
        "code_complexity_scorer": true,
        "docstring_validator": true,
        "exit_criteria_checker": true
      }
    }
  },
  
  "lsp": {
    "pyright": {
      "initialization": {
        "python": {
          "analysis": {
            "typeCheckingMode": "strict"
          }
        }
      }
    }
  },
  
  "formatter": {
    "black": {
      "command": ["black", "--line-length=100", "{file}"]
    },
    "ruff": {
      "command": ["ruff", "format", "{file}"]
    }
  }
}
```

### Example 4: Full-Stack Project

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  "lsp": {
    "typescript": { "disabled": false },
    "pyright": { "disabled": false },
    "eslint": { "disabled": false }
  },
  
  "formatter": {
    "prettier": {
      "extensions": [".ts", ".tsx", ".js", ".jsx", ".json", ".md"]
    },
    "black": {
      "extensions": [".py"]
    }
  },
  
  "mcp": {
    "github": {
      "type": "remote",
      "url": "https://api.githubcopilot.com/mcp/",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:GITHUB_MCP_PAT}"
      }
    }
  },
  
  "agents": {
    "integration": {
      "tools": {
        "github_*": true,
        "dependency_auditor": true,
        "changelog_generator": true
      }
    }
  }
}
```

### Example 5: High-Security Environment

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  
  "permission": {
    "edit": "ask",
    "bash": {
      // Only allow read-only commands
      "git status": "allow",
      "git log": "allow",
      "git diff": "allow",
      "ls": "allow",
      "pwd": "allow",
      "cat *": "allow",
      // Deny everything else
      "*": "deny"
    },
    "webfetch": "deny",
    "external_directory": "deny"
  },
  
  "tools": {
    // Disable all external tools
    "github_*": false,
    "webfetch": false
  },
  
  "mcp": {
    // Disable all MCP servers
    "github": { "enabled": false },
    "context7": { "enabled": false }
  },
  
  "agents": {
    "orchestrator": {
      "permissions": {
        "edit": "ask",
        "bash": "ask",
        "webfetch": "deny"
      }
    },
    "implementer": {
      "permissions": {
        "edit": "ask",
        "bash": "deny",
        "webfetch": "deny"
      }
    }
  }
}
```

---

## Configuration Best Practices

### 1. Start Permissive, Then Restrict

Begin with default permissions and gradually restrict based on needs:

```jsonc
// Week 1: Learn the system
{ "permission": { "edit": "allow", "bash": "allow" } }

// Week 2: Add guards for sensitive operations
{ "permission": { "edit": "allow", "bash": { "git push": "ask", "*": "allow" } } }

// Week 3: Lock down based on experience
{ "permission": { "edit": "ask", "bash": { /*...*/ } } }
```

### 2. Use Environment Variables for Secrets

Never hardcode secrets in configuration:

```jsonc
// ❌ Bad
{ "headers": { "Authorization": "Bearer ghp_abc123..." } }

// ✅ Good
{ "headers": { "Authorization": "Bearer {env:GITHUB_MCP_PAT}" } }
```

### 3. Configure Per-Project

Keep global config minimal, project config specific:

**Global** (`~/.config/opencode/opencode.json`):
```jsonc
{
  "theme": "opencode",
  "autoupdate": true,
  "permission": {
    "bash": { "rm -rf *": "deny" }
  }
}
```

**Project** (`opencode.json`):
```jsonc
{
  "agents": { /* project-specific agents */ },
  "tools": { /* project-specific tools */ }
}
```

### 4. Version Control Configuration

**Commit to Git**:
- `opencode.json` (project config)
- `AGENTS.md` (project rules)
- `.opencode/prompts/` (agent prompts)

**Do NOT commit**:
- `.env` (secrets)
- `.opencode/state/` (runtime state)

### 5. Document Configuration Choices

Add comments explaining non-obvious settings:

```jsonc
{
  "permission": {
    "bash": {
      // Allow read-only git commands for analysis
      "git status": "allow",
      "git log": "allow",
      
      // Require approval for state-changing operations
      // to prevent accidental force pushes
      "git push *": "ask",
      
      // Block destructive operations entirely
      "git reset --hard": "deny"
    }
  }
}
```

---

## Troubleshooting

### Config Not Loading

Check:
1. Validate JSON syntax (use `jsonlint` or VS Code)
2. Check file location (project root or `~/.config/opencode/`)
3. Verify `OPENCODE_CONFIG` env var if using custom path

### Agent Not Available

Check:
1. Agent defined in `agents` section
2. Prompt file exists at specified path
3. Mode is "subagent" (not "primary" for delegation)

### Tool Not Working

Check:
1. Tool enabled in global `tools` section
2. Tool enabled in agent's `tools` section
3. Permission level allows execution
4. Tool file exists in `.opencode/tool/`

### MCP Server Not Connecting

Check:
1. Server `enabled: true`
2. Environment variables set correctly
3. For remote: network connectivity
4. For local: command available in PATH

---

## Configuration Schema

Full schema: https://opencode.ai/config.json

VS Code autocomplete: Install OpenCode extension or add schema reference:

```jsonc
{
  "$schema": "https://opencode.ai/config.json"
}
```

---

## Additional Resources

- **OpenCode Config Docs**: https://opencode.ai/docs/config/
- **Agent Docs**: https://opencode.ai/docs/agents/
- **Tool Docs**: https://opencode.ai/docs/tools/
- **Permission Docs**: https://opencode.ai/docs/permissions/
- **MCP Docs**: https://opencode.ai/docs/mcp-servers/

---

**Last Updated**: January 4, 2026  
**Configuration Version**: 1.0
