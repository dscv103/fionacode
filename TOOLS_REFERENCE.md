# FionaCode Custom Tools Reference

Complete reference for all 21+ custom tools across three phases.

---

## Table of Contents

- [Phase 1: Core Workflow Tools](#phase-1-core-workflow-tools)
  - [coverage_analyzer](#coverage_analyzer)
  - [exit_criteria_checker](#exit_criteria_checker)
  - [type_check_aggregator](#type_check_aggregator)
  - [task_tracker](#task_tracker)
- [Phase 2: Quality Assurance Tools](#phase-2-quality-assurance-tools)
  - [test_runner_smart](#test_runner_smart)
  - [dependency_auditor](#dependency_auditor)
  - [changelog_generator](#changelog_generator)
- [Phase 3: Quality of Life Tools](#phase-3-quality-of-life-tools)
  - [code_complexity_scorer](#code_complexity_scorer)
  - [fixture_generator](#fixture_generator)
  - [flakiness_detector](#flakiness_detector)
  - [docstring_validator](#docstring_validator)
  - [api_diff_reporter](#api_diff_reporter)
  - [smart_commit_builder](#smart_commit_builder)
  - [branch_strategy_enforcer](#branch_strategy_enforcer)
  - [agent_handoff_validator](#agent_handoff_validator)

---

## Phase 1: Core Workflow Tools

### coverage_analyzer

**Purpose**: Parse pytest coverage reports and produce structured metrics for identifying coverage gaps.

**File**: `.opencode/tool/coverage_analyzer.ts`

**Agents**: Implementer, Code Review, Diagnostics, Executor

#### Input Schema

```typescript
{
  run_pytest?: boolean        // If true, runs pytest with coverage; if false, parses existing coverage.json
                              // Default: true
  coverage_file?: string      // Path to coverage.json
                              // Default: "coverage.json"
  pytest_args?: string[]      // Additional pytest arguments
                              // Default: ["--cov", "--cov-report=json"]
  timeout_ms?: number         // Timeout in milliseconds
                              // Default: 300000 (5 minutes)
  threshold?: number          // Branch coverage threshold percentage
                              // Default: 70.0
}
```

#### Output Schema

```typescript
{
  ok: boolean                 // Whether the operation succeeded
  summary: {
    total_statements: number  // Total statements in codebase
    covered_statements: number // Covered statements
    total_branches: number     // Total branches
    covered_branches: number   // Covered branches
    line_coverage: number      // Line coverage percentage (0-100)
    branch_coverage: number    // Branch coverage percentage (0-100)
    file_count: number         // Number of files analyzed
  }
  files: Array<{
    path: string              // File path
    line_coverage: number      // Line coverage percentage
    branch_coverage: number    // Branch coverage percentage
    missing_lines: number[]    // Line numbers not covered
    missing_branches: Array<{
      line: number            // Branch line number
      branch: number          // Branch index
    }>
    severity: "critical" | "high" | "medium" | "low"
  }>
  passed: boolean             // Whether coverage meets threshold
  threshold: number           // The coverage threshold used
  error?: string              // Error message if parsing failed
}
```

#### Usage Examples

**Run pytest and analyze coverage**:
```typescript
const result = await coverage_analyzer({
  run_pytest: true,
  threshold: 80.0
})

if (!result.passed) {
  console.log(`Coverage ${result.summary.branch_coverage}% < ${result.threshold}%`)
  result.files
    .filter(f => f.severity === "critical")
    .forEach(f => console.log(`${f.path}: ${f.branch_coverage}%`))
}
```

**Parse existing coverage.json**:
```typescript
const result = await coverage_analyzer({
  run_pytest: false,
  coverage_file: "coverage.json"
})
```

**Custom pytest arguments**:
```typescript
const result = await coverage_analyzer({
  run_pytest: true,
  pytest_args: ["--cov", "--cov-report=json", "-k", "test_api", "--maxfail=1"]
})
```

#### Best Practices

1. **Set appropriate thresholds**: Start at 50% for new projects, increase to 70-90% for production
2. **Focus on critical files**: Sort by severity and address critical/high files first
3. **Incremental improvement**: Track coverage trends over time
4. **Custom pytest args**: Use `-k` to test specific modules, `--maxfail` for fast feedback

#### Error Handling

Common errors:
- **pytest not found**: Ensure pytest is installed in project
- **timeout**: Increase `timeout_ms` for large test suites
- **coverage.json not found**: Check file path or run with `run_pytest: true`

---

### exit_criteria_checker

**Purpose**: Evaluate workflow exit criteria from test/coverage/typecheck/review results to automate approve vs iterate decisions.

**File**: `.opencode/tool/exit_criteria_checker.ts`

**Agents**: Orchestrator, Code Review

#### Input Schema

```typescript
{
  tests_passed?: boolean           // Whether the test suite passed
  branch_coverage?: number         // Branch coverage percentage (0-100)
  type_checks_passed?: boolean     // Whether type checks passed (mypy/pyright/tsc)
  critical_issues_count?: number   // Count of critical issues from review (must be 0 to approve)
  notes?: string                   // Optional context from the agent
}
```

#### Output Schema

```typescript
{
  ok: boolean                      // Whether the operation succeeded
  decision: "approve" | "iterate"  // Final decision
  score: number                    // Percentage score 0-100 based on met criteria
  thresholds: {
    tests_passed: boolean          // Expected: true
    branch_coverage: number        // Expected: >= 70.0
    type_checks_passed: boolean    // Expected: true
    critical_issues_count: number  // Expected: 0
  }
  inputs: {
    tests_passed?: boolean
    branch_coverage?: number
    type_checks_passed?: boolean
    critical_issues_count?: number
  }
  criteria: Array<{
    name: string                   // Criterion name
    met: boolean                   // Whether criterion was met
    value: any                     // Actual value
    threshold: any                 // Expected value
    reason: string                 // Explanation
  }>
  unmet: Array<{
    name: string
    value: any
    threshold: any
    reason: string
  }>
  summary: string                  // Human-readable summary
}
```

#### Usage Examples

**All criteria met (approve)**:
```typescript
const result = await exit_criteria_checker({
  tests_passed: true,
  branch_coverage: 85.3,
  type_checks_passed: true,
  critical_issues_count: 0
})

// result.decision === "approve"
// result.score === 100
// result.unmet === []
```

**Some criteria unmet (iterate)**:
```typescript
const result = await exit_criteria_checker({
  tests_passed: false,
  branch_coverage: 65.0,
  type_checks_passed: true,
  critical_issues_count: 0
})

// result.decision === "iterate"
// result.score === 50 (2 of 4 criteria met)
// result.unmet.length === 2
```

**With context notes**:
```typescript
const result = await exit_criteria_checker({
  tests_passed: true,
  branch_coverage: 88.0,
  type_checks_passed: true,
  critical_issues_count: 0,
  notes: "All tests pass after fixing authentication bug"
})
```

#### Best Practices

1. **Use after all checks complete**: Run this as the final step in validation loop
2. **Provide full context**: Include all available metrics for accurate decision
3. **Review unmet criteria**: Use `result.unmet` to identify what needs fixing
4. **Iterate based on score**: Score < 80% suggests significant issues remain

#### Thresholds

Default thresholds (can be customized in tool implementation):
- `tests_passed`: must be `true`
- `branch_coverage`: must be `>= 70.0`
- `type_checks_passed`: must be `true`
- `critical_issues_count`: must be `0`

#### Workflow Integration

```
┌─────────────────────────────────────────┐
│ Implementation/Fixes Complete           │
└─────────────────────────────────────────┘
                  ↓
┌─────────────────────────────────────────┐
│ Run exit_criteria_checker               │
└─────────────────────────────────────────┘
                  ↓
         [decision === "approve"]?
                  │
          ┌───────┴───────┐
          Yes             No
           ↓               ↓
    ┌──────────┐   ┌─────────────┐
    │ WORKFLOW │   │ Check unmet │
    │ COMPLETE │   │ criteria    │
    └──────────┘   └─────────────┘
                           ↓
                   ┌───────────────┐
                   │ Fix issues    │
                   └───────────────┘
                           ↓
                   [Return to start]
```

---

### type_check_aggregator

**Purpose**: Run mypy/pyright and consolidate errors by severity and file, providing actionable summaries for the review loop.

**File**: `.opencode/tool/type_check_aggregator.ts`

**Agents**: Implementer, Code Review, Diagnostics

#### Input Schema

```typescript
{
  profile: "pyright" | "mypy" | "both"  // Which type checker profile to run
  timeout_ms?: number                   // Timeout per command in milliseconds
                                        // Default: 180000 (3 minutes)
}
```

#### Output Schema

```typescript
{
  ok: boolean                    // Always true (operation completed)
  profile: string                // The profile that was run
  passed: boolean                // Whether all checks passed with no errors
  counts: {
    error: number                // Total errors
    warning: number              // Total warnings
    info: number                 // Total info messages
  }
  files: Array<{
    path: string                 // File path
    error_count: number          // Errors in this file
    warning_count: number        // Warnings in this file
    info_count: number           // Info messages in this file
    diagnostics: Array<...>      // Diagnostics for this file
  }>
  diagnostics: Array<{
    checker: "mypy" | "pyright"  // Which checker produced this
    path: string                 // File path
    line: number                 // Line number
    column: number               // Column number
    severity: "error" | "warning" | "info"
    category: string             // Error category/code
    code: string                 // Error code (e.g., "type-arg")
    message: string              // Error message
  }>
  runs: Array<{
    checker: "mypy" | "pyright"
    command: string              // Command executed
    stdout: string               // Standard output
    stderr: string               // Standard error
    exitCode: number             // Exit code
  }>
}
```

#### Usage Examples

**Run both checkers**:
```typescript
const result = await type_check_aggregator({
  profile: "both",
  timeout_ms: 120000
})

if (!result.passed) {
  console.log(`Found ${result.counts.error} errors`)
  result.files
    .filter(f => f.error_count > 0)
    .forEach(f => {
      console.log(`${f.path}: ${f.error_count} errors`)
      f.diagnostics.forEach(d => console.log(`  Line ${d.line}: ${d.message}`))
    })
}
```

**Run only pyright**:
```typescript
const result = await type_check_aggregator({
  profile: "pyright"
})
```

**Run only mypy**:
```typescript
const result = await type_check_aggregator({
  profile: "mypy"
})
```

#### Best Practices

1. **Use both checkers**: Different checkers catch different issues
2. **Fix errors first**: Address all errors before warnings
3. **Group by file**: Use `result.files` to tackle one file at a time
4. **Understand error codes**: Research category/code for fixing strategies
5. **Incremental fixing**: Start with most critical files (highest error count)

#### Common Error Categories

**mypy**:
- `type-arg`: Missing or incorrect type arguments
- `arg-type`: Argument type mismatch
- `return-value`: Return type mismatch
- `assignment`: Assignment type mismatch
- `attr-defined`: Attribute not defined

**pyright**:
- `reportGeneralTypeIssues`: General type problems
- `reportMissingTypeStubs`: Missing type stubs for libraries
- `reportUnknownMemberType`: Unknown member type
- `reportOptionalMemberAccess`: Optional member access
- `reportUnusedVariable`: Unused variable

#### Timeout Considerations

- Small projects (< 1000 lines): 30000ms (30 seconds)
- Medium projects (1000-10000 lines): 180000ms (3 minutes, default)
- Large projects (> 10000 lines): 300000ms+ (5+ minutes)

---

### task_tracker

**Purpose**: Maintain persistent structured state for subtasks, dependencies, blockers, and artifacts across workflow iterations.

**File**: `.opencode/tool/task_tracker.ts`

**Agents**: Orchestrator, Planning

#### Actions

1. `init` - Initialize task tracker state
2. `create_task` - Create new task
3. `update_task` - Update task details
4. `set_status` - Update task status
5. `link_dep` - Link task dependency
6. `add_blocker` - Add blocker to task
7. `clear_blocker` - Clear specific blocker
8. `attach_artifact` - Attach artifact to task
9. `get_snapshot` - Get full state snapshot

#### Input Schema

```typescript
{
  action: "init" | "create_task" | "update_task" | "set_status" | 
          "link_dep" | "add_blocker" | "clear_blocker" | 
          "attach_artifact" | "get_snapshot"
  
  // For init action
  force?: boolean              // If true, overwrite existing state
  
  // For most actions (required)
  task_id?: string             // Task UUID
  
  // For create_task
  title?: string               // Task title (required for create_task)
  description?: string         // Task description
  
  // For update_task, set_status
  status?: "todo" | "in_progress" | "blocked" | "done"
  
  // For link_dep
  depends_on?: string          // Dependency task UUID
  
  // For add_blocker
  blocker_reason?: string      // Blocker description
  
  // For clear_blocker
  blocker_id?: string          // Blocker UUID
  
  // For attach_artifact
  artifact_path?: string       // Artifact path
  artifact_type?: string       // Artifact type (e.g., "code", "test", "doc")
  artifact_note?: string       // Optional artifact note
}
```

#### Output Schema

```typescript
{
  ok: boolean                  // Whether the operation succeeded
  message?: string             // Status message
  task_id?: string             // Task UUID (for create_task)
  path: string                 // Path to task_tracker.json state file
  state?: {                    // Full state (for get_snapshot)
    tasks: {
      [task_id: string]: {
        id: string
        title: string
        description?: string
        status: "todo" | "in_progress" | "blocked" | "done"
        created_at: string     // ISO timestamp
        updated_at: string     // ISO timestamp
        dependencies: string[] // Array of task IDs
        blockers: Array<{
          id: string
          reason: string
          created_at: string
        }>
        artifacts: Array<{
          path: string
          type: string
          note?: string
          created_at: string
        }>
      }
    }
    metadata: {
      created_at: string
      updated_at: string
      version: number
    }
  }
}
```

#### Usage Examples

**Initialize tracker**:
```typescript
await task_tracker({ action: "init" })
```

**Create tasks**:
```typescript
const task1 = await task_tracker({
  action: "create_task",
  title: "Implement user authentication",
  description: "Add JWT-based authentication to the API"
})

const task2 = await task_tracker({
  action: "create_task",
  title: "Write authentication tests"
})
```

**Link dependency**:
```typescript
await task_tracker({
  action: "link_dep",
  task_id: task2.task_id,
  depends_on: task1.task_id  // task2 depends on task1
})
```

**Update status**:
```typescript
await task_tracker({
  action: "set_status",
  task_id: task1.task_id,
  status: "in_progress"
})
```

**Add blocker**:
```typescript
await task_tracker({
  action: "add_blocker",
  task_id: task1.task_id,
  blocker_reason: "Waiting for API key from external service"
})
```

**Attach artifact**:
```typescript
await task_tracker({
  action: "attach_artifact",
  task_id: task1.task_id,
  artifact_path: "src/api/auth.py",
  artifact_type: "code",
  artifact_note: "Authentication implementation"
})
```

**Get full snapshot**:
```typescript
const snapshot = await task_tracker({ action: "get_snapshot" })

// Analyze state
const todoTasks = Object.values(snapshot.state.tasks)
  .filter(t => t.status === "todo")
const blockedTasks = Object.values(snapshot.state.tasks)
  .filter(t => t.status === "blocked")
```

#### Best Practices

1. **Initialize once**: Call `init` at the start of workflow
2. **Create hierarchy**: Use dependencies to model task relationships
3. **Track blockers**: Add blockers when tasks can't progress
4. **Attach artifacts**: Link code/test/doc files to tasks
5. **Use snapshots**: Periodically get snapshot to review progress
6. **Status transitions**: Follow lifecycle: todo → in_progress → done (or blocked)

#### State File Location

State is persisted in: `.opencode/state/task_tracker.json`

This file is:
- **JSON format**: Human-readable and git-friendly
- **Persistent**: Survives OpenCode restarts
- **Shareable**: Can be committed to repository
- **Mergeable**: Can be merged across branches (with care)

---

## Phase 2: Quality Assurance Tools

### test_runner_smart

**Purpose**: Run only tests affected by changed files (delta testing) to speed up iteration cycles by 10-100x for large codebases.

**File**: `.opencode/tool/test_runner_smart.ts`

**Agents**: Executor, Implementer, Diagnostics

#### Input Schema

```typescript
{
  mode?: "auto" | "all" | "affected" | "specific"
    // auto: Detect changes and run affected tests (default)
    // all: Run all tests
    // affected: Only tests for changed files
    // specific: Run provided test files
  
  test_files?: string[]        // Specific test files (for mode='specific')
  pytest_args?: string[]       // Additional pytest arguments
                               // Example: ['-k', 'test_foo', '--maxfail=1']
  timeout_ms?: number          // Timeout in milliseconds
                               // Default: 300000 (5 minutes)
}
```

#### Output Schema

```typescript
{
  ok: boolean                  // Whether the operation succeeded
  mode: string                 // The mode that was executed
  changed_files: string[]      // List of changed Python files from git diff
  affected_test_files: string[] // Test files identified as affected
  total_tests: number          // Total number of tests run
  passed_tests: number         // Number of passed tests
  failed_tests: number         // Number of failed tests
  skipped_tests: number        // Number of skipped tests
  duration_ms: number          // Execution duration in milliseconds
  all_passed: boolean          // Whether all tests passed
  results: Array<{
    file: string               // Test file path
    passed: boolean            // Whether this file's tests passed
    duration_ms: number        // Duration for this file
    failures: Array<{
      test_name: string        // Failed test name
      error: string            // Error message
      traceback: string        // Full traceback
    }>
  }>
  pytest_output: string        // Full pytest stdout/stderr
  error?: string               // Error message if operation failed
}
```

#### Usage Examples

**Auto-detect changed files**:
```typescript
const result = await test_runner_smart({ mode: "auto" })

if (!result.all_passed) {
  console.log(`${result.failed_tests} of ${result.total_tests} tests failed`)
  result.results
    .filter(r => !r.passed)
    .forEach(r => {
      console.log(`\n${r.file}:`)
      r.failures.forEach(f => console.log(`  - ${f.test_name}: ${f.error}`))
    })
}

console.log(`Ran ${result.affected_test_files.length} affected test files`)
console.log(`Duration: ${result.duration_ms}ms`)
```

**Run specific test files**:
```typescript
const result = await test_runner_smart({
  mode: "specific",
  test_files: ["tests/test_auth.py", "tests/test_api.py"]
})
```

**Run all tests with custom args**:
```typescript
const result = await test_runner_smart({
  mode: "all",
  pytest_args: ["-v", "--maxfail=3", "--tb=short"]
})
```

**Run only tests with specific marker**:
```typescript
const result = await test_runner_smart({
  mode: "all",
  pytest_args: ["-m", "integration"]
})
```

#### Best Practices

1. **Default to auto mode**: Let the tool detect affected tests
2. **Use for iteration**: Run after each code change for fast feedback
3. **Full suite before PR**: Run `mode: "all"` before submitting
4. **Custom pytest args**: Use `-k` for patterns, `-m` for markers, `--maxfail` for fast failure
5. **Parallel execution**: Add `-n auto` (requires pytest-xdist) for parallel runs

#### How Delta Testing Works

1. **Detect changes**: Git diff against HEAD or base branch
2. **Analyze imports**: Parse changed Python files for imports
3. **Find test files**: Match test files that import changed modules
4. **Run affected**: Execute only matched test files

**Example**:
```
Changed: src/api/auth.py
Imports: src/api/auth.py → src/utils/validators.py
Test files importing these:
  - tests/test_auth.py ✓ (directly imports auth)
  - tests/test_api.py ✓ (imports auth)
  - tests/test_validators.py ✓ (imports validators)
  - tests/test_unrelated.py ✗ (no imports)

Result: Run 3 test files instead of all 50 → 17x speedup
```

#### Pytest Args Reference

Common pytest arguments:
- `-v, --verbose`: Verbose output
- `-k EXPRESSION`: Run tests matching expression
- `-m MARKER`: Run tests with specific marker
- `--maxfail=N`: Stop after N failures
- `-x`: Stop on first failure
- `--tb=short`: Shorter tracebacks
- `--tb=no`: No tracebacks
- `-n auto`: Parallel execution (requires pytest-xdist)
- `--lf`: Run last failed tests
- `--ff`: Run failures first

---

### dependency_auditor

**Purpose**: Audit Python dependencies for known vulnerabilities (CVEs), license conflicts, and outdated packages using pip-audit, safety, and pip-licenses.

**File**: `.opencode/tool/dependency_auditor.ts`

**Agents**: Security Review, Compliance, Integration

#### Input Schema

```typescript
{
  check_vulnerabilities?: boolean  // Check for security vulnerabilities
                                   // Default: true
  check_licenses?: boolean         // Check for license issues
                                   // Default: true
  check_outdated?: boolean         // Check for outdated packages
                                   // Default: true
  timeout_ms?: number              // Timeout per check in milliseconds
                                   // Default: 60000 (1 minute)
}
```

#### Output Schema

```typescript
{
  ok: boolean                      // Whether the operation succeeded
  
  vulnerabilities: Array<{
    package: string                // Package name
    version: string                // Installed version
    vulnerability_id: string       // CVE ID (e.g., "CVE-2024-1234")
    severity: "critical" | "high" | "medium" | "low"
    description: string            // Vulnerability description
    fixed_in: string[]             // Versions that fix the vulnerability
  }>
  
  license_issues: Array<{
    package: string                // Package name
    version: string                // Installed version
    license: string                // License type
    issue_type: "incompatible" | "unknown" | "restrictive"
    description: string            // Issue description
  }>
  
  outdated_packages: Array<{
    package: string                // Package name
    current_version: string        // Currently installed version
    latest_version: string         // Latest available version
    update_type: "major" | "minor" | "patch"
  }>
  
  vulnerability_counts: {
    critical: number
    high: number
    medium: number
    low: number
  }
  
  total_vulnerabilities: number    // Total vulnerabilities found
  total_license_issues: number     // Total license issues found
  total_outdated: number           // Total outdated packages
  passed: boolean                  // True if no critical or high severity vulnerabilities
  error?: string                   // Error message if operation failed
}
```

#### Usage Examples

**Full audit**:
```typescript
const result = await dependency_auditor({})

if (!result.passed) {
  console.log("Security audit FAILED")
  console.log(`Critical: ${result.vulnerability_counts.critical}`)
  console.log(`High: ${result.vulnerability_counts.high}`)
  
  result.vulnerabilities
    .filter(v => v.severity === "critical" || v.severity === "high")
    .forEach(v => {
      console.log(`\n${v.package}@${v.version}`)
      console.log(`  ${v.vulnerability_id}: ${v.description}`)
      console.log(`  Fix: Upgrade to ${v.fixed_in.join(" or ")}`)
    })
}

if (result.license_issues.length > 0) {
  console.log("\nLicense Issues:")
  result.license_issues.forEach(l => {
    console.log(`  ${l.package}: ${l.license} (${l.issue_type})`)
  })
}
```

**Only check vulnerabilities**:
```typescript
const result = await dependency_auditor({
  check_vulnerabilities: true,
  check_licenses: false,
  check_outdated: false
})
```

**Only check licenses**:
```typescript
const result = await dependency_auditor({
  check_vulnerabilities: false,
  check_licenses: true,
  check_outdated: false
})
```

**Check outdated packages**:
```typescript
const result = await dependency_auditor({
  check_vulnerabilities: false,
  check_licenses: false,
  check_outdated: true
})

result.outdated_packages
  .filter(p => p.update_type === "major")
  .forEach(p => {
    console.log(`${p.package}: ${p.current_version} → ${p.latest_version} (MAJOR)`)
  })
```

#### Best Practices

1. **Run regularly**: Include in CI/CD pipeline
2. **Fix critical/high first**: Address by severity
3. **Update promptly**: Keep dependencies up-to-date
4. **Review licenses**: Ensure compatibility with project license
5. **Document exceptions**: If vulnerabilities can't be fixed immediately, document why

#### Severity Levels

**Critical**:
- Remote code execution (RCE)
- Authentication bypass
- SQL injection
- Command injection

**High**:
- Cross-site scripting (XSS)
- Path traversal
- Denial of service (DoS)
- Information disclosure

**Medium**:
- Less severe XSS
- CSRF vulnerabilities
- Insecure defaults

**Low**:
- Informational issues
- Best practice violations

#### License Types

**Permissive** (usually safe):
- MIT, Apache 2.0, BSD, ISC

**Copyleft** (require attribution):
- GPL, LGPL, AGPL, MPL

**Proprietary** (check carefully):
- Custom licenses
- Commercial licenses

**Unknown** (investigate):
- No license file
- Custom/unrecognized license

#### Integration with CI/CD

Add to GitHub Actions:
```yaml
- name: Security Audit
  run: |
    opencode run "Run dependency_auditor and fail if critical vulnerabilities found"
```

---

### changelog_generator

**Purpose**: Generate structured changelog from git commit messages using conventional commit format. Groups changes by type and identifies breaking changes.

**File**: `.opencode/tool/changelog_generator.ts`

**Agents**: Communication, Integration

#### Input Schema

```typescript
{
  from_ref?: string       // Starting git reference (tag, commit, branch)
                          // Default: latest tag or HEAD~10
  to_ref?: string         // Ending git reference
                          // Default: HEAD
  version?: string        // Version string for the changelog header (e.g., '1.2.0')
  timeout_ms?: number     // Timeout in milliseconds
                          // Default: 30000 (30 seconds)
}
```

#### Output Schema

```typescript
{
  ok: boolean                    // Whether the operation succeeded
  version?: string               // Version string used in header
  date: string                   // ISO date string for the changelog
  
  sections: Array<{
    title: string                // Section title (e.g., "Features", "Bug Fixes")
    commits: Array<{
      hash: string               // Commit SHA
      shortHash: string          // Short commit SHA (7 chars)
      type: string               // Commit type (feat, fix, docs, etc.)
      scope?: string             // Commit scope
      subject: string            // Commit subject
      body?: string              // Commit body
      breaking: boolean          // Whether this is a breaking change
      author: string             // Commit author
      date: string               // Commit date
    }>
  }>
  
  breaking_changes: Array<{      // List of breaking changes
    hash: string
    subject: string
    body?: string
  }>
  
  total_commits: number          // Total commits processed
  markdown: string               // Full formatted markdown changelog
  error?: string                 // Error message if operation failed
}
```

#### Usage Examples

**Generate from latest tag to HEAD**:
```typescript
const result = await changelog_generator({
  version: "1.2.0"
})

console.log(result.markdown)
// Outputs:
// # 1.2.0 (2026-01-04)
// 
// ## Features
// * **auth**: add JWT support (abc1234)
// * **api**: add rate limiting (def5678)
// 
// ## Bug Fixes
// * **db**: fix connection pooling (ghi9012)
// ...
```

**Generate from specific range**:
```typescript
const result = await changelog_generator({
  from_ref: "v1.1.0",
  to_ref: "main",
  version: "1.2.0"
})
```

**Check for breaking changes**:
```typescript
const result = await changelog_generator({ version: "2.0.0" })

if (result.breaking_changes.length > 0) {
  console.log("⚠️  BREAKING CHANGES:")
  result.breaking_changes.forEach(bc => {
    console.log(`  - ${bc.subject}`)
    if (bc.body) console.log(`    ${bc.body}`)
  })
}
```

#### Conventional Commit Format

The tool parses commits following the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Examples**:
```
feat(auth): add JWT authentication

Implements JWT-based authentication for the API endpoints.

BREAKING CHANGE: Token format changed from opaque to JWT
```

```
fix(api): handle null values in response

Fixes crash when API returns null values.

Closes #123
```

#### Commit Types

Commits are grouped into sections:

| Type | Section | Description |
|------|---------|-------------|
| `feat` | Features | New features |
| `fix` | Bug Fixes | Bug fixes |
| `docs` | Documentation | Documentation changes |
| `style` | Styles | Code style changes (formatting, etc.) |
| `refactor` | Code Refactoring | Code refactoring |
| `perf` | Performance | Performance improvements |
| `test` | Tests | Test additions or changes |
| `build` | Build System | Build system changes |
| `ci` | CI | CI configuration changes |
| `chore` | Chores | Other changes (dependencies, etc.) |
| `revert` | Reverts | Commit reverts |

#### Breaking Changes

Breaking changes are detected via:
1. `BREAKING CHANGE:` in commit footer
2. `!` after type/scope: `feat!: ...` or `feat(api)!: ...`

#### Best Practices

1. **Follow conventional commits**: Ensure team uses conventional commit format
2. **Tag releases**: Use git tags for version milestones
3. **Include version**: Always provide version string
4. **Review before release**: Check generated changelog before publishing
5. **Document breaking changes**: Always include BREAKING CHANGE footer for breaking changes

#### Integration Examples

**Update CHANGELOG.md**:
```typescript
const result = await changelog_generator({ version: "1.2.0" })

// Prepend to CHANGELOG.md
const existingChangelog = await readFile("CHANGELOG.md", "utf-8")
const newChangelog = result.markdown + "\n\n" + existingChangelog
await writeFile("CHANGELOG.md", newChangelog)
```

**GitHub Release**:
```typescript
const result = await changelog_generator({ version: "1.2.0" })

// Use result.markdown as release notes
await github.repos.createRelease({
  owner: "your-org",
  repo: "your-repo",
  tag_name: "v1.2.0",
  name: "v1.2.0",
  body: result.markdown
})
```

---

## Phase 3: Quality of Life Tools

### code_complexity_scorer

Calculate cyclomatic complexity and maintainability index for Python files using radon.

**Purpose**: Identifies functions that need refactoring and ranks them by complexity.

**File**: `.opencode/tool/code_complexity_scorer.ts`

**Agents**: Refactoring, Code Review

#### Input Schema

```typescript
{
  file_path: string              // Path to Python file to analyze
  complexity_threshold?: number  // Minimum complexity to report
                                 // Default: 10
  timeout_ms?: number            // Timeout in milliseconds
                                 // Default: 10000 (10 seconds)
}
```

#### Output Schema

```typescript
{
  ok: boolean                    // Whether the operation succeeded
  file_path: string              // Path to analyzed file
  overall_grade: string          // Overall maintainability grade (A-F)
  overall_mi: number             // Overall maintainability index (0-100)
  
  file_complexity: Array<{
    filename: string
    functions: Array<{...}>
    average_complexity: number
    max_complexity: number
    maintainability_index: number
    grade: string              // A-F
  }>
  
  functions: Array<{
    name: string                 // Function name
    complexity: number           // Cyclomatic complexity
    rank: string                 // Complexity rank (A-F)
    line_number: number          // Line number
  }>
  
  needs_refactoring: Array<{     // Functions exceeding threshold
    name: string
    complexity: number
    line_number: number
  }>
  
  total_functions: number        // Total functions analyzed
  average_complexity: number     // Average cyclomatic complexity
  error?: string                 // Error message if operation failed
}
```

#### Usage Examples

**Analyze single file**:
```typescript
const result = await code_complexity_scorer({
  file_path: "src/services/processor.py",
  complexity_threshold: 15
})

if (result.needs_refactoring.length > 0) {
  console.log(`Found ${result.needs_refactoring.length} complex functions:`)
  result.needs_refactoring.forEach(f => {
    console.log(`  ${f.name} (line ${f.line_number}): complexity ${f.complexity}`)
  })
}

console.log(`Overall grade: ${result.overall_grade} (MI: ${result.overall_mi})`)
```

#### Complexity Ranks

- **A (1-5)**: Simple, easy to maintain
- **B (6-10)**: Moderate complexity
- **C (11-20)**: Complex, consider refactoring
- **D (21-30)**: Very complex, should refactor
- **E (31-40)**: Extremely complex, must refactor
- **F (41+)**: Unmaintainable, urgent refactoring needed

#### Maintainability Index

- **A (100-80)**: Highly maintainable
- **B (79-70)**: Moderately maintainable
- **C (69-50)**: Low maintainability
- **D (49-25)**: Very low maintainability
- **E (24-0)**: Unmaintainable

#### Best Practices

1. **Target C+ functions first**: Focus on complexity 11-20
2. **Extract methods**: Break down complex functions
3. **Reduce nesting**: Flatten conditional logic
4. **Early returns**: Use guard clauses
5. **Track trends**: Monitor complexity over time

---

### fixture_generator

Auto-generate pytest fixtures from function signatures using Python AST parsing.

**Purpose**: Creates type-aware mock fixtures for testing.

**File**: `.opencode/tool/fixture_generator.ts`

**Agents**: Implementer

#### Input Schema

```typescript
{
  file_path: string              // Path to Python module to analyze
  output_path?: string           // Where to write fixture file
                                 // Default: tests/fixtures/conftest.py
  include_classes?: boolean      // Include class instantiation fixtures
                                 // Default: true
  timeout_ms?: number            // Timeout in milliseconds
                                 // Default: 15000 (15 seconds)
}
```

#### Output Schema

```typescript
{
  ok: boolean                    // Whether the operation succeeded
  file_path: string              // Source file analyzed
  output_path: string            // Path where fixtures were written
  
  fixtures_generated: Array<{
    name: string                 // Fixture name
    signature: string            // Function signature
    fixture_code: string         // Generated pytest fixture code
  }>
  
  total_fixtures: number         // Total fixtures generated
  error?: string                 // Error message if operation failed
}
```

#### Usage Example

```typescript
const result = await fixture_generator({
  file_path: "src/services/auth.py",
  output_path: "tests/fixtures/auth_fixtures.py"
})

console.log(`Generated ${result.total_fixtures} fixtures`)
result.fixtures_generated.forEach(f => {
  console.log(`  - ${f.name}`)
})
```

Generated fixture example:
```python
import pytest
from unittest.mock import Mock

@pytest.fixture
def mock_authenticate_user():
    """Auto-generated fixture for authenticate_user"""
    mock = Mock()
    mock.return_value = {"user_id": "test123", "email": "test@example.com"}
    return mock
```

---

## Additional Tools

Due to length constraints, the remaining tools follow similar patterns. Here's a brief overview:

### flakiness_detector
- **Purpose**: Run tests multiple times to detect non-deterministic failures
- **Key params**: `iterations`, `fail_threshold`
- **Output**: Flaky tests with pass rates

### docstring_validator
- **Purpose**: Verify docstrings match function signatures
- **Key params**: `file_path`, `style` (google/sphinx/numpy)
- **Output**: Missing/incomplete documentation issues

### api_diff_reporter
- **Purpose**: Compare public API before/after changes
- **Key params**: `file_path`, `before_ref`, `after_ref`
- **Output**: Breaking changes flag, added/removed/modified symbols

### smart_commit_builder
- **Purpose**: Suggest conventional commit messages from staged files
- **Key params**: `custom_subject`, `custom_scope`
- **Output**: Commit suggestions with confidence scores

### branch_strategy_enforcer
- **Purpose**: Validate branch naming and up-to-date status
- **Key params**: `base_branch`, `naming_pattern`, `max_commits_behind`
- **Output**: Validation status, issues with fix suggestions

### agent_handoff_validator
- **Purpose**: Validate agent responses follow handoff contract
- **Key params**: `response_text`, `require_optional`, `strict_mode`
- **Output**: Valid/invalid, missing sections, issues

---

## Tool Design Patterns

All tools follow these patterns:

### 1. Consistent Interface

```typescript
{
  ok: boolean              // Operation success
  // ... tool-specific outputs
  error?: string           // Error if failed
}
```

### 2. Timeout Support

All tools accept `timeout_ms` parameter.

### 3. Error Handling

Tools return `{ ok: false, error: "message" }` on failure.

### 4. Context Awareness

Tools receive context:
```typescript
async execute(args, context: {
  agent: string
  sessionID: string
  messageID: string
})
```

### 5. Structured Output

All outputs are JSON-serializable for agent consumption.

---

## Tool Selection Guide

| Task | Recommended Tool |
|------|------------------|
| Check test coverage | `coverage_analyzer` |
| Run specific tests | `test_runner_smart` |
| Validate types | `type_check_aggregator` |
| Decide approve/iterate | `exit_criteria_checker` |
| Track subtasks | `task_tracker` |
| Scan vulnerabilities | `dependency_auditor` |
| Generate changelog | `changelog_generator` |
| Find complex code | `code_complexity_scorer` |
| Generate test fixtures | `fixture_generator` |
| Detect flaky tests | `flakiness_detector` |
| Validate docstrings | `docstring_validator` |
| Check API changes | `api_diff_reporter` |
| Format commit message | `smart_commit_builder` |
| Validate branch | `branch_strategy_enforcer` |
| Validate agent handoff | `agent_handoff_validator` |

---

## Contributing

When adding new tools:

1. Follow the thin-wrapper pattern
2. Include comprehensive JSDoc comments
3. Provide Zod schema validation
4. Return structured JSON output
5. Handle errors gracefully
6. Support timeout configuration
7. Document in this reference guide

---

## License

This documentation is part of the FionaCode project and is available under the MIT License.

---

**Last Updated**: January 4, 2026  
**Tool Count**: 21+ custom tools  
**Phase**: 3 (Core, QA, QoL)
