# FionaCode Architecture

## System Overview

FionaCode implements a **hierarchical multi-agent architecture** where specialized AI agents collaborate to deliver production-grade software development capabilities. The system orchestrates complex workflows through agent delegation, structured state management, and quality gates.

---

## Architectural Layers

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE                            │
│              (OpenCode TUI / CLI / IDE Extension)                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATION LAYER                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ORCHESTRATOR (Primary Agent)                            │   │
│  │  - Request decomposition                                 │   │
│  │  - Agent delegation                                      │   │
│  │  - Iteration management                                  │   │
│  │  - Quality gate enforcement                              │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AGENT EXECUTION LAYER                       │
│  ┌────────────┬────────────┬────────────┬────────────────────┐  │
│  │ Planning   │Implementer │  Executor  │  Diagnostics       │  │
│  │ Agent      │  Agent     │   Agent    │    Agent           │  │
│  └────────────┴────────────┴────────────┴────────────────────┘  │
│  ┌────────────┬────────────┬────────────┬────────────────────┐  │
│  │Code Review │  Security  │Refactoring │  Integration       │  │
│  │   Agent    │   Agent    │   Agent    │    Agent           │  │
│  └────────────┴────────────┴────────────┴────────────────────┘  │
│  ┌────────────┬────────────┬────────────┬────────────────────┐  │
│  │    Docs    │ Compliance │    Web     │     File           │  │
│  │   Agent    │   Agent    │  Research  │   Navigator        │  │
│  └────────────┴────────────┴────────────┴────────────────────┘  │
│  ┌────────────┐                                                  │
│  │Communication│                                                 │
│  │   Agent    │                                                  │
│  └────────────┘                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         TOOL LAYER                               │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Phase 1: Core Workflow Tools                             │  │
│  │  - coverage_analyzer      - exit_criteria_checker         │  │
│  │  - type_check_aggregator  - task_tracker                  │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Phase 2: Quality Assurance Tools                         │  │
│  │  - test_runner_smart      - dependency_auditor            │  │
│  │  - changelog_generator                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  Phase 3: Quality of Life Tools                           │  │
│  │  - code_complexity_scorer - fixture_generator             │  │
│  │  - flakiness_detector     - docstring_validator           │  │
│  │  - api_diff_reporter      - smart_commit_builder          │  │
│  │  - branch_strategy_enforcer - agent_handoff_validator     │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTEGRATION LAYER                             │
│  ┌──────────────────┬──────────────────┬──────────────────────┐ │
│  │  MCP Servers     │  LSP Servers     │  Formatters          │ │
│  │  - GitHub        │  - TypeScript    │  - Prettier          │ │
│  │  - Context7      │  - Python        │  - Black/Ruff        │ │
│  │  - Filesystem    │  - Go/Rust/etc   │  - Language-specific │ │
│  │  - SQLite        │                  │                      │ │
│  └──────────────────┴──────────────────┴──────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STATE MANAGEMENT                            │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  - Task Tracker (JSON)    - Coverage Data (JSON)          │  │
│  │  - Metadata DB (SQLite)   - Session State (Memory)        │  │
│  │  - Git State (Repository) - Configuration (JSONC)         │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Core Concepts

### 1. Agent Hierarchy

**Primary Agent**: The Orchestrator
- Single entry point for user requests
- Manages overall workflow
- Delegates to subagents
- Enforces quality gates
- Makes final approve/iterate decisions

**Subagents**: Specialized workers
- Focused on specific domains (implementation, review, testing, etc.)
- Report back to Orchestrator with structured outputs
- Can be invoked independently or as part of a workflow
- Maintain context within their session

### 2. Agent Communication Protocol

All agents follow a **standardized handoff format**:

```
## STATUS
Current state: [in_progress | complete | blocked]
Decision: [approve | iterate | needs_input]

## ARTIFACTS
- artifact_path: description
- artifact_path: description

## NEXT_ACTION
- action_description
- action_description

## NOTES (optional)
Additional context or observations

## BLOCKERS (optional)
- blocker_description
```

The `agent_handoff_validator` tool enforces this contract to ensure proper agent coordination.

### 3. State Management

**Task Tracker** (`.opencode/state/task_tracker.json`):
- Persistent subtask state
- Dependency tracking
- Blocker management
- Artifact linking
- Status transitions (todo → in_progress → blocked → done)

**Metadata Database** (`.opencode/state/metadata.db`):
- Session metadata
- Tool execution history
- Performance metrics
- Agent interaction logs

**Git State**:
- Working directory status
- Branch information
- Commit history
- Diff analysis

### 4. Quality Gates

The system enforces quality standards through exit criteria:

1. **Test Gate**: All pytest tests must pass
2. **Coverage Gate**: Branch coverage ≥ threshold (default 70%)
3. **Type Gate**: mypy/pyright type checks must pass
4. **Review Gate**: Zero critical issues from code review
5. **Security Gate**: No critical/high CVE vulnerabilities

**Exit Criteria Checker** computes a score (0-100%) and returns:
- `approve`: All criteria met → workflow complete
- `iterate`: Some criteria unmet → continue fixing

---

## Workflow Patterns

### Pattern 1: Feature Implementation

```
User Request
    ↓
Planning Agent (creates task breakdown)
    ↓
Task Tracker (initialize subtasks)
    ↓
┌─────────────── IMPLEMENTATION LOOP ──────────────┐
│                                                   │
│  Implementer Agent (writes code + tests)         │
│         ↓                                         │
│  Executor Agent (runs tests)                     │
│         ↓                                         │
│  Coverage Analyzer (checks coverage)             │
│         ↓                                         │
│  Type Check Aggregator (validates types)         │
│         ↓                                         │
│  [Pass?] ──No──> Diagnostics (analyzes failures) │
│     │                      ↓                      │
│     │              Implementer (applies fixes)    │
│     │                      ↓                      │
│     └──────────────── (retry) ──────────────────┘│
│     Yes                                           │
└───────────────────────────────────────────────────┘
    ↓
┌─────────────── REVIEW LOOP ──────────────────────┐
│                                                   │
│  Code Review Agent (validates quality)           │
│         ↓                                         │
│  Security Review Agent (checks vulnerabilities)  │
│         ↓                                         │
│  Compliance Agent (validates policies)           │
│         ↓                                         │
│  Exit Criteria Checker (compute score)           │
│         ↓                                         │
│  [Score 100%?] ──No──> [Return to Impl Loop]    │
│         │                                         │
│         Yes                                       │
└───────────────────────────────────────────────────┘
    ↓
Integration Agent (CI/CD, packaging, releases)
    ↓
Communication Agent (PR description, changelog)
    ↓
Docs Agent (updates documentation)
    ↓
WORKFLOW COMPLETE
```

### Pattern 2: Bug Fix

```
User Report (bug description)
    ↓
Diagnostics Agent (analyzes issue, proposes fix plan)
    ↓
File Navigator Agent (locates affected files)
    ↓
Implementer Agent (applies fixes)
    ↓
Test Runner Smart (runs affected tests)
    ↓
Code Review Agent (validates fix)
    ↓
[Pass?] ──No──> Diagnostics (re-analyze)
    │
    Yes
    ↓
Communication Agent (formats commit message)
    ↓
FIX COMPLETE
```

### Pattern 3: Refactoring

```
User Request (refactoring target)
    ↓
Code Complexity Scorer (identifies candidates)
    ↓
Planning Agent (creates refactoring plan)
    ↓
Refactoring Agent (restructures code)
    ↓
Test Runner Smart (validates behavior preserved)
    ↓
Coverage Analyzer (ensures coverage maintained)
    ↓
Code Review Agent (validates improvements)
    ↓
API Diff Reporter (checks for breaking changes)
    ↓
[Breaking?] ──Yes──> Communication (document in changelog)
    │
    No
    ↓
REFACTORING COMPLETE
```

### Pattern 4: Security Audit

```
User Request (security audit)
    ↓
Security Review Agent (manual code review)
    ↓
Dependency Auditor (CVE scanning)
    ↓
[Vulnerabilities?] ──Yes──> Planning (create fix plan)
    │                            ↓
    │                       Implementer (upgrade deps)
    │                            ↓
    │                       Executor (run tests)
    │                            ↓
    │                       Security Review (re-validate)
    │                            ↓
    └────────────────────── [Pass?] ────────────────┐
                                │                    │
                                Yes                  No
                                ↓                    │
                         Compliance Agent            │
                         (policy check)              │
                                ↓                    │
                         AUDIT COMPLETE          (retry)
```

---

## Tool Architecture

### Tool Execution Flow

```
Agent Decision
    ↓
Tool Invocation (with args)
    ↓
┌─────────────────────────────────────┐
│  Tool Wrapper (TypeScript/JS)       │
│  - Validate arguments (Zod schema)  │
│  - Execute logic or call subprocess │
│  - Handle errors                    │
│  - Format output as JSON            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│  External Process (optional)        │
│  - Python script                    │
│  - Shell command                    │
│  - External service API             │
└─────────────────────────────────────┘
    ↓
Structured JSON Response
    ↓
Agent Processing (interpretation)
    ↓
Next Action or Result
```

### Tool Categories

**Category 1: Analysis Tools**
- Read-only operations
- Compute metrics and reports
- No side effects
- Examples: coverage_analyzer, code_complexity_scorer, type_check_aggregator

**Category 2: Execution Tools**
- Run commands and tests
- May have side effects (file creation, network calls)
- Examples: test_runner_smart, dependency_auditor, flakiness_detector

**Category 3: Validation Tools**
- Enforce rules and standards
- Return pass/fail with detailed feedback
- Examples: exit_criteria_checker, docstring_validator, branch_strategy_enforcer

**Category 4: Generation Tools**
- Create new artifacts
- Examples: fixture_generator, changelog_generator, smart_commit_builder

**Category 5: State Management Tools**
- Persistent state operations
- Examples: task_tracker

**Category 6: Comparison Tools**
- Diff and change detection
- Examples: api_diff_reporter

### Tool Design Principles

1. **Thin Wrapper Pattern**: Tools are thin wrappers around existing utilities
2. **Structured Output**: Always return JSON with predictable schema
3. **Error Handling**: Always include `ok` boolean and optional `error` string
4. **Timeout Support**: All tools support timeout configuration
5. **Context Awareness**: Tools receive agent context (agent, sessionID, messageID)
6. **Idempotency**: Where possible, tools are idempotent (safe to retry)

---

## Agent Specialization Matrix

| Agent          | Code | Tests | Bash | Review | Security | Docs | Integration |
|----------------|------|-------|------|--------|----------|------|-------------|
| Orchestrator   | ✓    | ✗     | ✓    | ✗      | ✗        | ✗    | ✓           |
| Implementer    | ✓    | ✓     | ✓    | ✗      | ✗        | ✗    | ✗           |
| Code Review    | ✗    | ✗     | ✓    | ✓      | ✗        | ✗    | ✗           |
| Planning       | ✗    | ✗     | ✓    | ✗      | ✗        | ✗    | ✗           |
| Executor       | ✗    | ✗     | ✓    | ✗      | ✗        | ✗    | ✗           |
| Diagnostics    | ✗    | ✗     | ✓    | ✗      | ✗        | ✗    | ✗           |
| Security       | ✗    | ✗     | ✓    | ✓      | ✓        | ✗    | ✗           |
| Refactoring    | ✓    | ✓     | ✓    | ✗      | ✗        | ✗    | ✗           |
| Integration    | ✓    | ✗     | ✓    | ✗      | ✗        | ✗    | ✓           |
| Communication  | ✓    | ✗     | ✗    | ✗      | ✗        | ✓    | ✓           |
| Web Research   | ✗    | ✗     | ✗    | ✗      | ✗        | ✗    | ✗           |
| File Navigator | ✗    | ✗     | ✗    | ✗      | ✗        | ✗    | ✗           |
| Docs           | ✓    | ✗     | ✗    | ✗      | ✗        | ✓    | ✗           |
| Compliance     | ✗    | ✗     | ✗    | ✓      | ✓        | ✗    | ✗           |

**Legend**:
- ✓ = Primary capability
- ✗ = Not authorized or not applicable

---

## Permission System

### Permission Levels

1. **allow**: Agent can execute without approval
2. **ask**: Agent must request user approval
3. **deny**: Agent cannot execute (tool disabled)

### Permission Scope

Permissions are applied at three levels:

1. **Global** (in `opencode.json` → `tools`)
2. **Per-Agent** (in agent config → `permissions`)
3. **Runtime** (user can grant/deny on-demand)

**Priority**: Runtime > Per-Agent > Global

### Permission Patterns

**Read-Only Agents** (Code Review, Diagnostics, Planning):
```json
{
  "permissions": {
    "edit": "deny",
    "bash": "allow",
    "webfetch": "deny"
  }
}
```

**Autonomous Agents** (Implementer, Docs):
```json
{
  "permissions": {
    "edit": "allow",
    "bash": "allow",
    "webfetch": "deny"
  }
}
```

**Approval-Required Agents** (Orchestrator, Integration, Refactoring):
```json
{
  "permissions": {
    "edit": "ask",
    "bash": "ask",
    "webfetch": "ask"
  }
}
```

---

## Temperature Strategy

Agent temperatures control creativity vs determinism:

### Low Temperature (0.1)
**Agents**: Code Review, Executor, Diagnostics, Security Review, Compliance, File Navigator

**Rationale**: These agents need **deterministic, analytical reasoning**. Low temperature ensures:
- Consistent evaluation criteria
- Reproducible failure analysis
- Reliable security assessments
- Precise navigation and search

### Medium-Low Temperature (0.2)
**Agents**: Orchestrator, Planning, Refactoring, Integration, Web Research

**Rationale**: These agents need **structured reasoning with some flexibility**:
- Task decomposition benefits from exploration
- Refactoring requires creative restructuring (within constraints)
- Integration needs to adapt to different environments

### Medium Temperature (0.3)
**Agents**: Implementer, Docs, Communication

**Rationale**: These agents need **creative output generation**:
- Code implementation requires varied approaches
- Documentation needs clear, varied explanations
- Communication benefits from natural language flexibility

---

## Data Flow

### Information Flow Diagram

```
┌────────────┐
│ User Input │
└────────────┘
      │
      ▼
┌────────────────────────┐
│ Orchestrator           │
│ - Parse request        │◄────────┐
│ - Create task plan     │         │
│ - Delegate to agents   │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Task Tracker           │         │
│ - Initialize state     │         │
│ - Track dependencies   │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Implementer            │         │
│ - Read files           │         │
│ - Generate code        │         │
│ - Write files          │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Executor               │         │
│ - Run tests            │         │
│ - Run type checks      │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Coverage Analyzer      │         │
│ - Parse coverage.json  │         │
│ - Compute metrics      │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Type Check Aggregator  │         │
│ - Run mypy/pyright     │         │
│ - Aggregate errors     │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Code Review            │         │
│ - Validate quality     │         │
│ - Check complexity     │         │
│ - Validate docs        │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
┌────────────────────────┐         │
│ Exit Criteria Checker  │         │
│ - Compute score        │         │
│ - Decide approve/iter  │         │
└────────────────────────┘         │
      │                             │
      ▼                             │
   [Score 100%?]                    │
      │                             │
      No ─────────────────────────►─┘
      │
      Yes
      ▼
┌────────────────────────┐
│ Integration            │
│ - CI/CD setup          │
│ - Packaging            │
└────────────────────────┘
      │
      ▼
┌────────────────────────┐
│ Communication          │
│ - PR description       │
│ - Changelog            │
└────────────────────────┘
      │
      ▼
┌────────────────────────┐
│ Docs                   │
│ - Update README        │
│ - Update docstrings    │
└────────────────────────┘
      │
      ▼
┌────────────┐
│ User Output│
└────────────┘
```

---

## Scalability Considerations

### Horizontal Scaling

**Multi-Session Support**: OpenCode supports multiple parallel sessions
- Different features can be developed simultaneously
- Each session maintains independent state
- Sessions can be on different branches

**Agent Parallelization**: Some tools can run in parallel
- Multiple coverage analyzers on different modules
- Parallel test execution with test_runner_smart
- Independent security scans per dependency

### Vertical Scaling

**Tool Timeout Configuration**: All tools support timeout adjustments
- Increase timeouts for large codebases
- Decrease timeouts for fast iteration

**Coverage Threshold Tuning**: Adjust coverage requirements
- Start at 50% for prototypes
- Increase to 70% for production code
- Require 90%+ for critical modules

### Performance Optimization

**Delta Testing**: `test_runner_smart` provides 10-100x speedup
- Only runs tests affected by changes
- Caches test results
- Identifies test dependencies

**LSP Caching**: LSP servers cache semantic information
- Faster symbol lookup
- Reduced re-indexing
- Incremental updates

**MCP Connection Pooling**: Remote MCP servers maintain connections
- Reduced latency for subsequent calls
- Shared authentication
- Request batching

---

## Security Architecture

### Security Layers

1. **Permission System**: Controls agent capabilities
2. **Tool Validation**: Input validation via Zod schemas
3. **MCP Authentication**: Bearer token authentication
4. **Dependency Scanning**: CVE detection via dependency_auditor
5. **Code Review**: Security-focused review agent
6. **Compliance Checks**: Policy enforcement

### Security Best Practices

**Environment Variables**: Sensitive data via env vars
```bash
export GITHUB_MCP_PAT="ghp_..."
export CONTEXT7_API_KEY="..."
```

**Permission Defaults**: Secure defaults
- File edits: `ask` for orchestrator
- Bash commands: `ask` for sensitive agents
- Web fetching: `ask` or `deny` for most agents

**Audit Trail**: All tool executions logged
- SQLite metadata database
- Session logs
- Git history

---

## Monitoring and Observability

### Metrics

**Task Tracker Metrics**:
- Total tasks created
- Task completion rate
- Average time to completion
- Blocked task count

**Tool Execution Metrics**:
- Tool invocation count
- Success/failure rates
- Average execution time
- Timeout occurrences

**Agent Metrics**:
- Agent invocation count
- Handoff validation success rate
- Temperature effectiveness

**Quality Metrics**:
- Test pass rate
- Coverage percentage trends
- Type check error trends
- CVE detection count

### Logging

**Log Levels**:
- DEBUG: Tool inputs/outputs, agent decisions
- INFO: Workflow milestones, agent handoffs
- WARN: Quality gate failures, retry attempts
- ERROR: Tool failures, unrecoverable errors

**Log Locations**:
- `.opencode/state/logs/` (session logs)
- Terminal output (real-time)
- SQLite metadata DB (structured logs)

---

## Future Architecture Considerations

### Planned Enhancements

1. **Distributed Agents**: Run agents on remote servers
2. **Agent Learning**: Feedback loops for agent improvement
3. **Custom Agent Types**: User-defined agent specializations
4. **Tool Marketplace**: Community-contributed tools
5. **Workflow Templates**: Predefined workflow patterns
6. **Real-time Collaboration**: Multi-user sessions
7. **Advanced Metrics**: ML-based quality prediction
8. **Integration Ecosystem**: More MCP servers and LSPs

### Extensibility Points

- **Agent Prompts**: Fully customizable in `.opencode/prompts/`
- **Custom Tools**: TypeScript/JavaScript tool definitions
- **MCP Servers**: Any MCP-compatible server
- **LSP Servers**: Any LSP-compatible server
- **Formatters**: Any code formatter with CLI
- **Plugins**: Event-driven plugin system

---

## Conclusion

FionaCode's architecture emphasizes:
- **Modularity**: Independent, composable agents
- **Reliability**: Quality gates and exit criteria
- **Extensibility**: Custom tools, agents, and integrations
- **Scalability**: Parallel execution and delta testing
- **Security**: Multi-layer security controls
- **Observability**: Comprehensive logging and metrics

This architecture enables **production-grade AI-assisted development** while maintaining developer control and code quality standards.
