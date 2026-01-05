# FionaCode Quick Start Guide

Get up and running with FionaCode in 5 minutes.

---

## Prerequisites

Before you begin, ensure you have:

- ✅ **Python 3.13+** installed
- ✅ **Node.js 18+** or **Bun** installed
- ✅ **Git** installed and configured
- ✅ **Modern terminal emulator** (WezTerm, Alacritty, Ghostty, or Kitty)
- ✅ **API keys** for LLM providers (Anthropic Claude, OpenAI, etc.)

---

## Step 1: Install OpenCode

Choose your preferred installation method:

### Option A: Install Script (Recommended)

```bash
curl -fsSL https://opencode.ai/install | bash
```

### Option B: Package Managers

**macOS/Linux (Homebrew)**:
```bash
brew install opencode
```

**Arch Linux (Paru)**:
```bash
paru -S opencode-bin
```

**Node.js (npm)**:
```bash
npm install -g opencode-ai
```

**Verify installation**:
```bash
opencode --version
```

---

## Step 2: Configure LLM Provider

Configure your preferred LLM provider. We recommend **Anthropic Claude** for best results.

### Configure Anthropic Claude

1. **Get your API key**:
   - Visit https://console.anthropic.com/
   - Navigate to API Keys
   - Create a new key

2. **Run OpenCode**:
   ```bash
   opencode
   ```

3. **Connect provider**:
   ```
   /connect
   ```

4. **Select Anthropic**:
   - Choose "anthropic" from the list
   - Paste your API key when prompted

5. **Select model** (recommended):
   - `claude-sonnet-4-5` (best quality)
   - or `claude-sonnet-3-5` (good balance)

---

## Step 3: Clone FionaCode

```bash
# Clone the repository
git clone https://github.com/dscv103/fionacode.git
cd fionacode

# Create environment file
cp .env.example .env

# Edit .env with your API keys
vim .env
```

**Required environment variables**:

```bash
# Add to .env file
GITHUB_MCP_PAT="ghp_your_github_pat_here"  # Optional, for GitHub integration
CONTEXT7_API_KEY="your_context7_key_here"   # Optional, for Context7
```

---

## Step 4: Initialize FionaCode

```bash
# Start OpenCode in the fionacode directory
cd fionacode
opencode

# Initialize the project
/init
```

This will:
- Analyze the codebase
- Generate `AGENTS.md` with project rules
- Configure agent prompts
- Set up custom tools

---

## Step 5: Verify Setup

Let's verify everything is working:

```bash
# In OpenCode session, ask:
```

**Test query**:
```
Can you explain the agent architecture of this project?
```

You should see the Orchestrator agent activate and provide a comprehensive explanation.

---

## Step 6: Your First Task

Now let's try a simple task to see the multi-agent workflow in action.

### Example Task: Add a New Utility Function

```
I need a utility function that validates email addresses.

Requirements:
- Add it to src/utils/validators.py
- Use regex for validation
- Include type hints
- Write pytest tests with at least 80% coverage
- Include docstrings

Please implement this and ensure all tests pass.
```

Watch as the agents collaborate:

1. **Orchestrator** decomposes the task
2. **Planning** creates the implementation plan
3. **Implementer** writes the code and tests
4. **Executor** runs the tests
5. **Coverage Analyzer** checks coverage
6. **Type Check Aggregator** validates types
7. **Code Review** approves the implementation

---

## Common Commands

Once OpenCode is running, use these commands:

### Navigation
- **Tab**: Switch between Build and Plan modes
- **Ctrl+D**: Exit OpenCode

### Commands
- `/init`: Initialize project rules
- `/connect`: Configure LLM provider
- `/undo`: Undo last change
- `/redo`: Redo last undone change
- `/share`: Create shareable session link
- `/help`: Show all available commands

### File References
- `@filename.py`: Reference a specific file
- Fuzzy search with `@` + partial filename

### Image Upload
- Drag and drop images into terminal for visual context

---

## Understanding Agent Modes

### Build Mode (Default)
- Full access to file operations
- Can make changes to codebase
- Runs tests and checks automatically
- **Indicator**: "Build" in bottom-right corner

### Plan Mode
- Read-only mode
- Creates implementation plans
- Suggests changes without making them
- **Indicator**: "Plan" in bottom-right corner

**Switch modes**: Press `Tab`

---

## Agent Overview

Here's what each agent does:

| Agent | Role | When to Use |
|-------|------|-------------|
| **Orchestrator** | Workflow coordinator | Always active (primary agent) |
| **Planning** | Task breakdown | Complex features, architecture decisions |
| **Implementer** | Code writing | Writing code and tests |
| **Executor** | Command execution | Running tests, builds, linters |
| **Code Review** | Quality validation | Validating changes before approval |
| **Diagnostics** | Failure analysis | When tests fail or errors occur |
| **Security Review** | Security validation | Security-sensitive changes |
| **Refactoring** | Code improvement | Improving code structure |
| **Integration** | CI/CD and releases | Release management, packaging |
| **Communication** | Documentation | PR descriptions, changelogs |
| **Docs** | Documentation writing | README, guides, docstrings |

---

## Key Tools

### Core Tools

**coverage_analyzer**
```typescript
// Run tests and analyze coverage
coverage_analyzer({ 
  run_pytest: true, 
  threshold: 80.0 
})
```

**type_check_aggregator**
```typescript
// Run type checkers
type_check_aggregator({ 
  profile: "both"  // mypy and pyright
})
```

**exit_criteria_checker**
```typescript
// Check if quality standards are met
exit_criteria_checker({
  tests_passed: true,
  branch_coverage: 85.3,
  type_checks_passed: true,
  critical_issues_count: 0
})
```

### Quality Tools

**test_runner_smart**
```typescript
// Run only affected tests (delta testing)
test_runner_smart({ 
  mode: "auto"  // or "all", "affected", "specific"
})
```

**dependency_auditor**
```typescript
// Scan for vulnerabilities
dependency_auditor({
  check_vulnerabilities: true,
  check_licenses: true,
  check_outdated: true
})
```

**code_complexity_scorer**
```typescript
// Identify complex code
code_complexity_scorer({
  file_path: "src/services/processor.py",
  complexity_threshold: 10
})
```

---

## Example Workflows

### Workflow 1: Fix a Bug

```
There's a bug in src/api/auth.py where login fails with special characters 
in the password. Can you:

1. Investigate the issue
2. Write a test that reproduces the bug
3. Fix the issue
4. Ensure all tests pass
5. Update the changelog
```

**Expected agent flow**:
- Diagnostics → Implementer → Executor → Code Review

---

### Workflow 2: Add a Feature

```
Add a new feature: user profile photos

Requirements:
- Upload endpoint in src/api/users.py
- Validate file type (jpg, png only)
- Resize to 256x256
- Store in /uploads directory
- Add tests with 80%+ coverage
- Update API documentation
```

**Expected agent flow**:
- Planning → Implementer → Executor → Coverage Analyzer → Code Review → Docs

---

### Workflow 3: Security Audit

```
Run a security audit on the entire codebase:

1. Scan dependencies for CVEs
2. Review authentication code
3. Check for hardcoded secrets
4. Validate input sanitization
5. Report findings and recommendations
```

**Expected agent flow**:
- Security Review → Dependency Auditor → Code Review → Communication

---

## Best Practices

### 1. Start with Planning

For complex features, switch to **Plan mode** first:

```bash
<Tab>  # Switch to Plan mode
```

Then describe your feature and review the plan before implementation.

### 2. Provide Context

Give agents enough context:

```
Good: "Add email validation to @src/utils/validators.py 
       following the pattern in @src/utils/strings.py"

Bad: "Add email validation"
```

### 3. Reference Files

Use `@` to reference files:

```
Update @README.md to include the new feature from @src/api/users.py
```

### 4. Iterate on Plans

If a plan isn't quite right, refine it:

```
The plan looks good, but also include:
- Add rate limiting to the endpoint
- Log all failed attempts
- Add integration tests
```

### 5. Use Delta Testing

For large codebases, use smart test runner:

```
Run only the tests affected by my recent changes
```

This invokes `test_runner_smart` with `mode: "auto"` for 10-100x speedup.

### 6. Check Quality Gates

Before submitting, ensure quality standards:

```
Run a full quality check: tests, coverage, type checks, and security scan
```

---

## Troubleshooting

### Issue: "Agent handoff validation failed"

**Solution**: The agent's response is missing required sections. This usually happens when:
- Agent is trying a new approach
- Response format changed
- Retry the request

```bash
/undo
# Rephrase your request with more specific instructions
```

---

### Issue: "Coverage below threshold"

**Solution**: Add more tests or adjust the threshold:

```
The coverage is at 65% but threshold is 70%. Can you:
1. Identify which lines are not covered
2. Add tests to cover them
```

Or adjust threshold in tool call:
```typescript
coverage_analyzer({ threshold: 65.0 })
```

---

### Issue: "Type check failures"

**Solution**: Fix type errors or add type annotations:

```
There are type check failures. Can you:
1. Show me the errors
2. Fix them by adding proper type hints
```

---

### Issue: "Tests are flaky"

**Solution**: Use flakiness detector:

```
Run the flakiness detector on tests/test_api.py with 10 iterations
```

This will identify non-deterministic tests.

---

### Issue: "MCP authentication failed"

**Solution**: Verify environment variables:

```bash
# Check if env vars are set
echo $GITHUB_MCP_PAT
echo $CONTEXT7_API_KEY

# Re-export if needed
export GITHUB_MCP_PAT="ghp_..."
export CONTEXT7_API_KEY="..."

# Restart OpenCode
opencode
```

---

## Performance Tips

### 1. Use Delta Testing
Run only affected tests instead of full suite:
```
test_runner_smart({ mode: "auto" })
```

### 2. Adjust Timeouts
For large codebases, increase tool timeouts:
```typescript
coverage_analyzer({ 
  timeout_ms: 600000  // 10 minutes
})
```

### 3. Parallel Sessions
Run multiple OpenCode sessions for different features:
```bash
# Terminal 1
cd feature-branch-1
opencode

# Terminal 2
cd feature-branch-2
opencode
```

### 4. Disable Unused MCPs
If not using GitHub/Context7, disable them in `opencode.json`:
```json
{
  "mcp": {
    "github": { "enabled": false },
    "context7": { "enabled": false }
  }
}
```

---

## Configuration Quick Reference

### Temperature Settings

```json
{
  "agents": {
    "your-agent": {
      "temperature": 0.1  // Deterministic (review, diagnostics)
                   // 0.2  // Structured (planning, orchestration)
                   // 0.3  // Creative (implementation, docs)
    }
  }
}
```

### Permission Settings

```json
{
  "agents": {
    "your-agent": {
      "permissions": {
        "edit": "allow",    // Autonomous
             // "ask",      // Requires approval
             // "deny"      // Disabled
        "bash": "allow",
        "webfetch": "deny"
      }
    }
  }
}
```

### Tool Availability

```json
{
  "agents": {
    "your-agent": {
      "tools": {
        "read": true,
        "edit": false,
        "bash": true,
        "coverage_analyzer": true,
        "github_*": false  // Wildcard: disable all GitHub tools
      }
    }
  }
}
```

---

## Next Steps

Now that you're set up:

1. **Read the full documentation**: Check out [README.md](README.md) and [ARCHITECTURE.md](ARCHITECTURE.md)
2. **Explore agents**: Review agent prompts in `.opencode/prompts/`
3. **Customize tools**: Add custom tools in `.opencode/tool/`
4. **Join the community**: Visit [OpenCode Discord](https://opencode.ai/discord)
5. **Contribute**: Submit PRs to improve FionaCode

---

## Learning Resources

### Official OpenCode Documentation
- **Main docs**: https://opencode.ai/docs
- **GitHub**: https://github.com/anomalyco/opencode
- **Discord**: https://opencode.ai/discord

### FionaCode Documentation
- **README**: [README.md](README.md) - Full overview
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md) - Deep dive
- **Agent Docs**: [pro_docs/agents.mdx](pro_docs/agents.mdx)
- **Tool Docs**: [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx)

### Example Sessions
- Share your session: `/share` in OpenCode
- View example sessions: https://opencode.ai/s/

---

## Getting Help

**Issues**: Create an issue on [GitHub](https://github.com/dscv103/fionacode/issues)

**Discussions**: Join [GitHub Discussions](https://github.com/dscv103/fionacode/discussions)

**OpenCode Support**: [OpenCode Discord](https://opencode.ai/discord)

---

**Happy coding with FionaCode! 🚀**
