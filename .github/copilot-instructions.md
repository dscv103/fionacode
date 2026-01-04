# GitHub Copilot Instructions for OpenCode

This repository contains OpenCode, an open-source AI coding agent. Follow these guidelines when working with this codebase.

## Language and Version

- **Python 3.13+**: Use modern Python syntax and features
- Leverage Python 3.13+ performance improvements and language enhancements
- Use match statements, type hints, dataclasses, and other modern Python features

## Coding Standards

### Style Guidelines

- Follow **PEP 8** style guidelines strictly
- Write clear, self-documenting code with descriptive names
- Keep functions focused and single-purpose
- Follow DRY (Don't Repeat Yourself) principles
- Use appropriate standard library modules

### Type Safety

- **Always add type annotations** to all function signatures and methods
- Use appropriate types from the `typing` module (Optional, Union, List, Dict, etc.)
- Use Python 3.13+ type syntax where applicable
- All code must pass `mypy --strict` checks
- Optionally verify with `pyright` for additional type checking
- Fix all type errors before considering code complete

### Documentation

- Add **docstrings** to all public functions, classes, and modules
- Use comments to explain complex logic, not obvious code
- Type hints serve as inline documentation
- Keep README and other documentation accurate and up-to-date

## Testing Requirements

### Test Framework

- Use **pytest** for all testing
- Write comprehensive unit tests for all implemented functionality
- Create integration tests for component interactions when applicable

### Test Coverage

- Cover edge cases, boundary conditions, empty inputs, and error cases
- Use pytest fixtures for common test setup
- Use `@pytest.mark.parametrize` for multiple test cases
- Aim for **minimum 70% test coverage**, preferably higher
- All tests must pass before code is considered complete

### Verification Commands

```bash
# Run tests
pytest -v tests/

# Check test coverage
pytest --cov=<module>

# Run type checks
mypy --strict <files>
pyright <files>
```

## Error Handling and Logging

- Handle errors appropriately with try/except or error returns
- Use **logging** for debugging rather than print statements
- Ensure resources are properly managed (files closed, connections cleaned up)
- Avoid memory leaks or resource exhaustion risks

## Security Practices

- No security vulnerabilities (SQL injection, XSS, etc.)
- Validate all external inputs
- Do not include secrets or passwords in source code
- Follow security best practices for data handling

## Project Structure

### Configuration Files

- **opencode.json**: Main configuration file (supports JSON and JSONC)
- **.opencode/**: Project-specific configuration directory
  - **prompts/**: Agent-specific prompt files
  - **tool/**: Custom tool implementations
- **pro_docs/**: Documentation files in MDX format

### Agent System

This project uses a multi-agent system with:
- **Primary agent**: orchestrator (coordinates tasks and delegates to subagents)
- **Subagents**: Specialized agents for specific tasks:
  - implementer: Code generation with Python 3.13+, typing, and tests
  - code-review: Read-only reviewer for validation
  - planning: Architecture and task planning
  - web-research: External documentation research
  - file-navigator: Fast codebase exploration
  - executor: Runs commands/tests/linters
  - security-review: Security-focused review
  - docs: Documentation writing/updating
  - compliance: Policy/standards alignment
  - diagnostics: Failure analysis
  - refactoring: Structure/maintainability improvements
  - integration: Cross-cutting integration work
  - communication: PR descriptions, changelogs, etc.
- Agent configurations in `opencode.json` define their behavior, tools, and permissions

## Markdown Linting

- Follow markdownlint rules defined in `.markdownlint.json`
- Note: MD001, MD013, MD024, MD033, MD040, MD041, MD046, MD059 are disabled

## Development Workflow

1. Review requirements and specifications carefully
2. Plan implementation approach
3. Generate code with full type annotations
4. Write comprehensive tests
5. Run all verification checks (pytest, mypy/pyright)
6. Document any known issues or limitations
7. Ensure all tests and type checks pass

## Performance Considerations

- No obvious performance bottlenecks
- Efficient use of Python standard library
- Consider scalability for AI agent operations

## Dependencies

- Only add dependencies that are necessary
- Document rationale for any new dependencies
- Keep dependencies minimal and well-maintained

## Communication in Code

- Report progress and blockers clearly in comments or documentation
- Document implementation decisions and trade-offs
- Provide context for complex code sections
- Ask clarifying questions if specifications are ambiguous
