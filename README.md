# FionaCode: Multi-Agent AI Development Framework

## Overview

FionaCode is a sophisticated multi-agent AI development framework built on top of OpenCode.ai. It orchestrates specialized AI agents to handle complex software development workflows with automated testing, code review, security auditing, and quality assurance.

This framework implements a **production-grade development pipeline** with:
- 🤖 **13 specialized AI agents** with distinct roles and responsibilities
- 🛠️ **21+ custom tools** across 3 phases (Core, Quality, and Workflow)
- 🔄 **Automated iteration loops** with exit criteria validation
- 🧪 **Comprehensive testing** with coverage analysis and flakiness detection
- 🔒 **Security auditing** with dependency vulnerability scanning
- 📊 **Code quality metrics** and complexity analysis
- 📝 **Automated documentation** generation and validation

---

## Architecture

### Agent Architecture

The framework follows a **hierarchical agent architecture** with primary coordinators and specialized subagents:

```
┌─────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR (Primary)                   │
│  Coordinates workflow, delegates tasks, manages iterations  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ delegates to
                              ▼
    ┌──────────────────────────────────────────────────────────┐
    │                     SUBAGENTS                             │
    ├──────────────────────────────────────────────────────────┤
    │  Implementer   │  Code Review   │  Planning               │
    │  Executor      │  Security      │  Diagnostics            │
    │  Refactoring   │  Integration   │  Communication          │
    │  Web Research  │  File Navigator│  Docs                   │
    │  Compliance    │                │                         │
    └──────────────────────────────────────────────────────────┘
```

### Workflow Process

1. **Planning Phase**: Planning agent decomposes requirements and creates task structure
2. **Implementation Phase**: Implementer agent writes code with type hints and tests
3. **Validation Phase**: Code Review agent validates quality, tests, and coverage
4. **Iteration Phase**: Diagnostics identifies issues, Implementer fixes them
5. **Approval Phase**: Exit Criteria Checker determines if quality standards are met
6. **Integration Phase**: Integration agent handles CI/CD, packaging, and releases

---

## Agents

### Primary Agent

#### Orchestrator
**Role**: Primary coordinator and workflow manager

**Responsibilities**:
- Decomposes user requests into subtasks with file lists
- Delegates work to appropriate subagents
- Manages iteration loops until exit criteria are met
- Validates agent handoffs
- Enforces branch strategy and workflow rules

**Tools**: read, edit, bash, search, list, webfetch, task_tracker, exit_criteria_checker, branch_strategy_enforcer, agent_handoff_validator

**Temperature**: 0.2 (focused and deterministic)

**Permissions**:
- File edits: **ask** (requires approval)
- Bash commands: **ask** (requires approval)
- Web fetching: **ask** (requires approval)

---

### Specialized Subagents

#### Implementer
**Role**: Code implementation and test writing

**Responsibilities**:
- Generates Python 3.13+ code with full type annotations
- Writes pytest tests with fixtures
- Runs type checkers (mypy/pyright)
- Analyzes code coverage
- Executes smart test runner for affected tests

**Tools**: read, edit, bash, search, list, type_check_aggregator, coverage_analyzer, test_runner_smart, fixture_generator

**Temperature**: 0.3 (creative but structured)

**Permissions**:
- File edits: **allow** (autonomous)
- Bash commands: **allow** (autonomous)
- Web fetching: **deny**

---

#### Code Review
**Role**: Quality validation and decision-making

**Responsibilities**:
- Validates code against requirements
- Checks code quality, tests, and typing
- Analyzes code coverage and complexity
- Validates documentation completeness
- Decides approve vs revision with structured feedback
- Runs exit criteria checker

**Tools**: read, bash, coverage_analyzer, type_check_aggregator, exit_criteria_checker, search, list, code_complexity_scorer, docstring_validator, api_diff_reporter

**Temperature**: 0.1 (highly analytical)

**Permissions**:
- File edits: **deny** (read-only reviewer)
- Bash commands: **allow** (can run checks)
- Web fetching: **deny**

---

#### Planning
**Role**: Architecture and task planning

**Responsibilities**:
- Plans approach and architecture without making changes
- Produces task breakdowns with dependencies
- Identifies risks and constraints
- Defines acceptance criteria
- Uses task tracker for structured state management

**Tools**: read, bash, search, list, webfetch, task_tracker

**Temperature**: 0.2 (structured planning)

**Permissions**:
- File edits: **deny** (planning only)
- Bash commands: **ask**
- Web fetching: **ask**

---

#### Executor
**Role**: Command execution and test running

**Responsibilities**:
- Runs commands, tests, and linters locally
- Reports failures with minimal reproduction steps
- Analyzes coverage and detects flaky tests
- Does not author code unless explicitly instructed

**Tools**: read, coverage_analyzer, bash, search, list, flakiness_detector

**Temperature**: 0.1 (precise execution)

**Permissions**:
- File edits: **deny** (execution only)
- Bash commands: **allow**
- Web fetching: **deny**

---

#### Diagnostics
**Role**: Failure analysis and debugging

**Responsibilities**:
- Deep failure analysis and triage
- Analyzes test failures, type errors, runtime traces
- Proposes root cause and targeted fix plan
- Runs smart test runner and flakiness detection

**Tools**: read, bash, coverage_analyzer, type_check_aggregator, test_runner_smart, search, list, flakiness_detector

**Temperature**: 0.1 (analytical debugging)

**Permissions**:
- File edits: **deny** (diagnostic only)
- Bash commands: **allow**
- Web fetching: **deny**

---

#### Security Review
**Role**: Security validation and vulnerability scanning

**Responsibilities**:
- Security-focused code review
- Validates input validation, auth flows, secrets handling
- Checks dependency vulnerabilities (CVEs)
- Ensures safe defaults and secure configurations
- Runs dependency auditor

**Tools**: read, bash, search, list, webfetch, dependency_auditor

**Temperature**: 0.1 (security-critical)

**Permissions**:
- File edits: **deny** (review only)
- Bash commands: **ask**
- Web fetching: **ask**

---

#### Refactoring
**Role**: Code quality improvement

**Responsibilities**:
- Improves structure and maintainability
- Reduces duplication and simplifies APIs
- Clarifies naming conventions
- Preserves behavior with comprehensive tests
- Uses complexity scorer to identify candidates

**Tools**: read, edit, bash, search, list, code_complexity_scorer

**Temperature**: 0.2 (careful refactoring)

**Permissions**:
- File edits: **ask** (requires approval)
- Bash commands: **ask**
- Web fetching: **deny**

---

#### Integration
**Role**: Cross-cutting integration and releases

**Responsibilities**:
- Wires modules, configs, and CI steps
- Handles packaging and release management
- Manages PR hygiene and branch strategy
- Generates changelogs and smart commit messages
- Audits dependencies

**Tools**: read, edit, bash, search, list, webfetch, github_*, dependency_auditor, changelog_generator, smart_commit_builder, branch_strategy_enforcer

**Temperature**: 0.2 (integration coordination)

**Permissions**:
- File edits: **ask**
- Bash commands: **ask**
- Web fetching: **ask**

---

#### Communication
**Role**: Human-facing documentation

**Responsibilities**:
- Produces PR descriptions and release notes
- Writes changelogs and status updates
- Creates decision logs
- Reports API differences
- Generates smart commit messages

**Tools**: read, edit, search, list, github_*, changelog_generator, api_diff_reporter, smart_commit_builder

**Temperature**: 0.3 (creative writing)

**Permissions**:
- File edits: **allow**
- Bash commands: **deny**
- Web fetching: **deny**

---

#### Web Research
**Role**: External documentation research

**Responsibilities**:
- Finds and summarizes external docs (APIs, libraries, standards)
- Pulls citations and links
- Maps external resources to implementation guidance
- Limited to web and GitHub research

**Tools**: read, webfetch, github_*

**Temperature**: 0.2 (research-focused)

**Permissions**:
- File edits: **deny** (research only)
- Bash commands: **deny**
- Web fetching: **allow**

---

#### File Navigator
**Role**: Codebase exploration

**Responsibilities**:
- Fast codebase exploration and navigation
- Locates files and symbols
- Traces call paths
- Inventories modules
- Reports where changes should be made

**Tools**: read, search, list

**Temperature**: 0.1 (precise navigation)

**Permissions**:
- File edits: **deny** (navigation only)
- Bash commands: **deny**
- Web fetching: **deny**

---

#### Docs
**Role**: Documentation authoring

**Responsibilities**:
- Writes and updates README, usage guides, docstrings
- Creates code examples
- Ensures consistency with current behavior
- Validates docstring completeness
- Minimal or no bash usage

**Tools**: read, edit, search, list, docstring_validator

**Temperature**: 0.3 (creative documentation)

**Permissions**:
- File edits: **allow**
- Bash commands: **deny**
- Web fetching: **deny**

---

#### Compliance
**Role**: Policy and standards validation

**Responsibilities**:
- Checks policy and standards alignment
- Validates style rules, licensing, data handling
- Flags compliance gaps for orchestrator
- Audits dependencies for license issues

**Tools**: read, search, list, dependency_auditor

**Temperature**: 0.1 (compliance-critical)

**Permissions**:
- File edits: **deny** (validation only)
- Bash commands: **deny**
- Web fetching: **deny**

---

## Custom Tools

The framework provides 21+ custom tools organized into three phases:

### Phase 1: Core Workflow Tools

#### coverage_analyzer
Parses pytest coverage reports and produces structured metrics.

**Inputs**:
- `run_pytest` (boolean): Run pytest or parse existing coverage.json
- `coverage_file` (string): Path to coverage.json
- `pytest_args` (array): Additional pytest arguments
- `timeout_ms` (number): Timeout in milliseconds
- `threshold` (number): Branch coverage threshold percentage

**Outputs**: Coverage summary, file-level metrics, missing lines/branches, pass/fail status

**Used by**: Implementer, Code Review, Diagnostics, Executor

---

#### exit_criteria_checker
Evaluates workflow exit criteria to automate approve vs iterate decisions.

**Inputs**:
- `tests_passed` (boolean): Test suite status
- `branch_coverage` (number): Coverage percentage
- `type_checks_passed` (boolean): Type checker status
- `critical_issues_count` (number): Critical issue count (must be 0)
- `notes` (string): Optional context

**Outputs**: Decision (approve/iterate), score (0-100), criteria breakdown, unmet criteria

**Used by**: Orchestrator, Code Review

---

#### type_check_aggregator
Runs mypy/pyright and consolidates errors by severity and file.

**Inputs**:
- `profile` (enum): "pyright" | "mypy" | "both"
- `timeout_ms` (number): Timeout per command

**Outputs**: Pass/fail status, error counts, diagnostics grouped by file and severity

**Used by**: Implementer, Code Review, Diagnostics

---

#### task_tracker
Maintains persistent structured state for subtasks, dependencies, and artifacts.

**Actions**:
- `init`: Initialize state
- `create_task`: Create new task
- `update_task`: Update task details
- `set_status`: Update task status (todo/in_progress/blocked/done)
- `link_dep`: Link task dependencies
- `add_blocker`: Add blocker
- `clear_blocker`: Clear blocker
- `attach_artifact`: Attach artifact to task
- `get_snapshot`: Get full state snapshot

**Used by**: Orchestrator, Planning

---

### Phase 2: Quality Assurance Tools

#### test_runner_smart
Runs only tests affected by changed files (delta testing) for 10-100x speedup.

**Modes**:
- `auto`: Detect changes and run affected tests
- `all`: Run all tests
- `affected`: Only changed files
- `specific`: Run specified test files

**Outputs**: Test results, execution duration, affected files, pass/fail status

**Used by**: Executor, Implementer, Diagnostics

---

#### dependency_auditor
Audits Python dependencies for vulnerabilities, license conflicts, and outdated packages.

**Checks**:
- `check_vulnerabilities`: CVE scanning with pip-audit/safety
- `check_licenses`: License conflict detection
- `check_outdated`: Outdated package detection

**Outputs**: Vulnerabilities by severity, license issues, outdated packages, pass/fail status

**Used by**: Security Review, Compliance, Integration

---

#### changelog_generator
Generates structured changelog from git commit messages using conventional commit format.

**Inputs**:
- `from_ref`: Starting git reference (tag/commit/branch)
- `to_ref`: Ending git reference
- `version`: Version string for changelog

**Outputs**: Markdown changelog, breaking changes, sections by type (Features/Bug Fixes/etc.)

**Used by**: Communication, Integration

---

### Phase 3: Quality of Life Tools

#### code_complexity_scorer
Calculates cyclomatic complexity and maintainability index using radon.

**Outputs**: Overall grade (A-F), maintainability index, per-function complexity, refactoring candidates

**Used by**: Refactoring, Code Review

---

#### fixture_generator
Auto-generates pytest fixtures from function signatures using Python AST parsing.

**Outputs**: Type-aware mock fixtures, generated fixture code

**Used by**: Implementer

---

#### flakiness_detector
Runs pytest tests multiple times to detect non-deterministic failures.

**Inputs**:
- `iterations`: Number of times to run tests
- `fail_threshold`: Pass rate % threshold for flakiness

**Outputs**: Flaky tests with pass rates

**Used by**: Executor, Diagnostics

---

#### docstring_validator
Verifies Python docstrings match function signatures.

**Styles**: Google, Sphinx, NumPy, auto-detect

**Outputs**: Missing/incomplete/mismatched documentation issues

**Used by**: Docs, Code Review

---

#### api_diff_reporter
Compares public API surface before and after changes to detect breaking changes.

**Outputs**: Breaking changes flag, added/removed/modified symbols, markdown diff report

**Used by**: Code Review, Communication

---

#### smart_commit_builder
Analyzes staged files and suggests conventional commit messages.

**Outputs**: Commit type/scope/subject suggestions, confidence scores, formatted commit message

**Used by**: Communication, Integration

---

#### branch_strategy_enforcer
Validates branch naming, checks if branch is up-to-date, detects merge conflicts.

**Inputs**:
- `base_branch`: Base branch to compare against
- `naming_pattern`: Regex pattern for branch naming
- `max_commits_behind`: Max commits behind threshold

**Outputs**: Validation status, commits ahead/behind, conflict detection, actionable issues

**Used by**: Integration, Orchestrator

---

#### agent_handoff_validator
Validates agent handoff responses contain required sections (status/artifacts/next-action).

**Outputs**: Validation status, missing sections, issues by severity

**Used by**: Orchestrator

---

## MCP Servers

The framework integrates external tools via Model Context Protocol (MCP):

### GitHub MCP Server
**Type**: Remote  
**URL**: https://api.githubcopilot.com/mcp/  
**Authentication**: Bearer token via GITHUB_MCP_PAT  
**Used by**: Web Research, Integration, Communication

Provides GitHub API access for:
- Repository operations
- Pull request management
- Issue tracking
- Code search

---

### Context7 MCP Server
**Type**: Remote  
**URL**: https://context7.modelcontextprotocol.io/v1  
**Authentication**: Bearer token via CONTEXT7_API_KEY

Provides external context and documentation access.

---

### Filesystem MCP Server
**Type**: Local  
**Command**: `npx -y @modelcontextprotocol/server-filesystem .`

Provides enhanced filesystem operations.

---

### SQLite MCP Server
**Type**: Local  
**Command**: `npx -y @modelcontextprotocol/server-sqlite --db-path .opencode/state/metadata.db`

Provides persistent state storage for metadata.

---

## Configuration

### Directory Structure

```
.opencode/
├── prompts/              # Agent system prompts
│   ├── orchestrator.txt
│   ├── implementer.txt
│   ├── code-review.txt
│   ├── planning.txt
│   ├── executor.txt
│   └── ...
├── tool/                 # Custom tool implementations
│   ├── coverage_analyzer.ts
│   ├── exit_criteria_checker.ts
│   ├── type_check_aggregator.ts
│   └── ...
├── state/               # Runtime state
│   ├── metadata.db      # SQLite state database
│   └── task_tracker.json # Task tracking state
├── skill/               # Agent skills (SKILL.md files)
├── command/             # Custom commands
└── plugin/              # Custom plugins

opencode.json            # Main configuration file
AGENTS.md               # Project-specific rules and guidelines
```

### Configuration File

The `opencode.json` file defines:
- Agent configurations (descriptions, modes, temperatures, tools, permissions)
- Tool availability per agent
- MCP server connections
- Global tool settings

**Key configuration sections**:

```jsonc
{
  "agents": {
    "orchestrator": { /* primary agent config */ },
    "implementer": { /* subagent config */ },
    // ... other agents
  },
  "tools": {
    "github_*": false  // Disable all GitHub tools globally
  },
  "mcp": {
    "github": { /* GitHub MCP config */ },
    "context7": { /* Context7 MCP config */ },
    // ... other MCPs
  }
}
```

---

## Workflows

### Typical Development Workflow

1. **User Request**: Developer provides feature request or bug report
2. **Planning**: Planning agent creates task breakdown and architecture plan
3. **Task Tracking**: Orchestrator initializes task tracker with subtasks
4. **Implementation Loop**:
   - Implementer writes code with type hints
   - Implementer writes pytest tests
   - Executor runs tests and type checkers
   - Coverage Analyzer validates coverage
   - If issues: Diagnostics analyzes, provides fix plan
   - Implementer applies fixes
   - Repeat until clean
5. **Review Loop**:
   - Code Review validates quality, tests, coverage
   - Security Review checks for vulnerabilities
   - Compliance checks policy alignment
   - Exit Criteria Checker determines approve/iterate
   - If iterate: return to Implementation Loop
6. **Integration**:
   - Integration agent handles CI/CD setup
   - Communication agent writes PR description
   - Changelog Generator creates changelog
   - Smart Commit Builder formats commit messages
   - Branch Strategy Enforcer validates branch state
7. **Documentation**:
   - Docs agent updates README and guides
   - Docstring Validator checks documentation
   - API Diff Reporter identifies breaking changes

### Exit Criteria

The workflow iterates until all criteria are met:

- ✅ **Tests Passed**: All pytest tests pass
- ✅ **Coverage**: Branch coverage ≥ threshold (default 70%)
- ✅ **Type Checks**: mypy/pyright pass with no errors
- ✅ **Critical Issues**: Zero critical issues from review
- ✅ **Security**: No critical/high vulnerabilities

**Score Calculation**: Percentage of met criteria (0-100)

**Decision**:
- Score 100% → **Approve** (workflow complete)
- Score < 100% → **Iterate** (continue fixing)

---

## Best Practices

### Agent Delegation

- Use **Planning** first for complex features
- Use **File Navigator** to locate relevant files
- Use **Web Research** for external API documentation
- Use **Implementer** for code changes
- Use **Executor** for running tests/commands
- Use **Diagnostics** when tests fail
- Use **Code Review** for quality validation
- Use **Security Review** for security-sensitive changes
- Use **Refactoring** to improve code quality
- Use **Integration** for releases and CI/CD
- Use **Communication** for user-facing documentation

### Tool Selection

- Use `test_runner_smart` with `mode: auto` for fast iteration
- Use `coverage_analyzer` with `run_pytest: true` for comprehensive coverage
- Use `type_check_aggregator` with `profile: both` for full type checking
- Use `dependency_auditor` regularly to catch vulnerabilities early
- Use `code_complexity_scorer` to identify refactoring candidates
- Use `flakiness_detector` when tests are unreliable
- Use `api_diff_reporter` before releases to catch breaking changes

### Configuration Tips

- Set agent **temperatures** low (0.1-0.2) for deterministic tasks (review, execution, diagnostics)
- Set agent **temperatures** higher (0.3) for creative tasks (implementation, documentation, communication)
- Use **permissions** to control agent autonomy (allow/ask/deny)
- Disable GitHub tools globally if not needed to reduce context usage
- Enable MCP servers selectively based on requirements
- Use task tracker for complex multi-step workflows
- Configure branch strategy enforcer with team conventions

---

## Environment Variables

Required environment variables:

```bash
# GitHub MCP Server (optional, only if using GitHub integration)
export GITHUB_MCP_PAT="ghp_your_github_personal_access_token"

# Context7 MCP Server (optional, only if using Context7)
export CONTEXT7_API_KEY="your_context7_api_key"

# OpenCode Configuration (optional)
export OPENCODE_CONFIG="/path/to/custom/opencode.json"
export OPENCODE_CONFIG_DIR="/path/to/custom/config/dir"

# LSP Configuration (optional)
export OPENCODE_DISABLE_LSP_DOWNLOAD="true"  # Disable auto-downloads

# Experimental Features (optional)
export OPENCODE_EXPERIMENTAL_LSP_TOOL="true"  # Enable LSP tool
```

---

## Development Setup

### Prerequisites

- Python 3.13+
- Node.js 18+ or Bun
- OpenCode CLI installed
- Modern terminal (WezTerm, Alacritty, Ghostty, or Kitty)
- API keys for LLM providers

### Installation

1. **Install OpenCode**:

```bash
curl -fsSL https://opencode.ai/install | bash
```

2. **Clone this repository**:

```bash
git clone https://github.com/dscv103/fionacode.git
cd fionacode
```

3. **Configure environment**:

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your API keys
vim .env
```

4. **Initialize OpenCode**:

```bash
opencode
/init
```

5. **Start developing**:

```bash
opencode
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov --cov-report=json

# Run specific test file
pytest tests/test_coverage_analyzer.py

# Run smart test runner (delta testing)
# (via tool execution in OpenCode session)
```

### Type Checking

```bash
# Run mypy
mypy src/

# Run pyright
pyright src/

# Run both via type_check_aggregator tool
# (via tool execution in OpenCode session)
```

---

## Project Structure

```
fionacode/
├── .opencode/
│   ├── prompts/              # Agent system prompts
│   ├── tool/                 # Custom tool implementations
│   ├── state/                # Runtime state and tracking
│   ├── skill/                # Agent skills
│   └── plugin/               # Custom plugins
├── pro_docs/                 # OpenCode documentation (MDX format)
│   ├── index.mdx            # Introduction
│   ├── agents.mdx           # Agent documentation
│   ├── config.mdx           # Configuration guide
│   ├── custom-tools.mdx     # Custom tool guide
│   ├── formatters.mdx       # Formatter configuration
│   ├── lsp.mdx              # LSP server integration
│   ├── mcp-servers.mdx      # MCP server guide
│   ├── permissions.mdx      # Permission system
│   ├── plugins.mdx          # Plugin development
│   ├── rules.mdx            # AGENTS.md rules
│   ├── skills.mdx           # Agent skills guide
│   ├── tools.mdx            # Built-in tools reference
│   └── commands.mdx         # Custom commands
├── src/                      # Source code
├── tests/                    # Test suite
├── opencode.json            # Main configuration
├── AGENTS.md                # Project rules and guidelines
├── README.md                # This file
├── pyproject.toml           # Python project configuration
└── .env                     # Environment variables (gitignored)
```

---

## Extending the Framework

### Adding a New Agent

1. **Create agent prompt** in `.opencode/prompts/your-agent.txt`:

```markdown
# Your Agent

Role: Brief description

## Responsibilities
- List key responsibilities
- Be specific and actionable

## Constraints
- No file edits (if read-only)
- Specific tool usage patterns

## Output Format
Structured output format for orchestrator
```

2. **Add agent configuration** to `opencode.json`:

```jsonc
{
  "agents": {
    "your-agent": {
      "description": "Brief description for orchestrator",
      "mode": "subagent",
      "temperature": 0.2,
      "prompt": ".opencode/prompts/your-agent.txt",
      "tools": {
        "read": true,
        "edit": false,
        "bash": true
      },
      "permissions": {
        "edit": "deny",
        "bash": "ask"
      }
    }
  }
}
```

### Adding a New Custom Tool

1. **Create tool file** in `.opencode/tool/your_tool.ts`:

```typescript
import { tool } from "@opencode-ai/plugin"

export default tool({
  description: "Clear description for LLM",
  args: {
    param1: tool.schema.string().describe("Parameter description"),
    param2: tool.schema.number().optional().describe("Optional parameter"),
  },
  async execute(args, context) {
    // Tool implementation
    return {
      ok: true,
      // ... structured output
    }
  },
})
```

2. **Add tool to agent configurations** in `opencode.json`:

```jsonc
{
  "agents": {
    "implementer": {
      "tools": {
        "your_tool": true
      }
    }
  }
}
```

### Adding a New MCP Server

1. **Add MCP configuration** to `opencode.json`:

```jsonc
{
  "mcp": {
    "your-mcp": {
      "type": "local",  // or "remote"
      "command": ["npx", "-y", "your-mcp-package"],
      "enabled": true,
      "timeout": 5000,
      "environment": {
        "API_KEY": "{env:YOUR_API_KEY}"
      }
    }
  }
}
```

2. **Reference in agent tools** using wildcard:

```jsonc
{
  "agents": {
    "web-research": {
      "tools": {
        "your-mcp_*": true
      }
    }
  }
}
```

---

## Troubleshooting

### Common Issues

**Issue**: Agent handoff validation fails  
**Solution**: Ensure agent responses include required sections: STATUS, ARTIFACTS, NEXT_ACTION

**Issue**: Coverage analyzer times out  
**Solution**: Increase `timeout_ms` parameter or optimize test suite

**Issue**: Type checker aggregator fails  
**Solution**: Ensure mypy/pyright are installed and configured correctly

**Issue**: GitHub MCP authentication fails  
**Solution**: Verify `GITHUB_MCP_PAT` environment variable is set correctly

**Issue**: Tests are flaky  
**Solution**: Run `flakiness_detector` to identify non-deterministic tests

**Issue**: Branch strategy enforcer rejects branch  
**Solution**: Check branch naming convention and update `naming_pattern`

### Debug Mode

Enable verbose logging in OpenCode:

```bash
export OPENCODE_LOG_LEVEL=debug
opencode
```

### Checking Tool Output

All tools return structured JSON. Check the output format:

```typescript
{
  ok: boolean,        // Operation success
  error?: string,     // Error message if failed
  // ... tool-specific fields
}
```

---

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Follow conventional commits**: `feat:`, `fix:`, `docs:`, `refactor:`, etc.
4. **Write tests** for new functionality
5. **Ensure coverage** meets threshold (70%+)
6. **Run type checkers** (mypy/pyright)
7. **Update documentation** in `pro_docs/` if needed
8. **Submit PR** with clear description

### Code Standards

- **Python 3.13+** with full type annotations
- **pytest** for testing with fixtures
- **Branch coverage** ≥ 70%
- **Docstrings** for all public functions (Google style)
- **Type hints** for all function signatures
- **Conventional commits** for git messages

---

## License

This project is open source and available under the [MIT License](LICENSE).

---

## Acknowledgments

Built on top of [OpenCode.ai](https://opencode.ai/) - the open source AI coding agent.

Special thanks to:
- OpenCode team for the excellent framework
- Anthropic for Claude models
- The open source community

---

## Resources

- **OpenCode Documentation**: https://opencode.ai/docs
- **OpenCode GitHub**: https://github.com/anomalyco/opencode
- **OpenCode Discord**: https://opencode.ai/discord
- **Model Context Protocol**: https://modelcontextprotocol.io/

---

## Contact

For questions, issues, or contributions:
- **GitHub Issues**: [Create an issue](https://github.com/dscv103/fionacode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dscv103/fionacode/discussions)

---

**Last Updated**: January 4, 2026  
**Version**: 1.0.0  
**OpenCode Version**: 1.0+
