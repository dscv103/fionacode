# Contributing to FionaCode

Thank you for your interest in contributing to FionaCode! This guide will help you get started.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contribution Types](#contribution-types)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## Code of Conduct

By participating in this project, you agree to:

- Be respectful and inclusive
- Welcome newcomers
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards others

Report unacceptable behavior to the project maintainers.

---

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 18+ or Bun
- Git
- OpenCode CLI installed
- Familiarity with OpenCode.ai

### First-Time Contributors

1. **Read the documentation**:
   - [README.md](README.md) - Project overview
   - [ARCHITECTURE.md](ARCHITECTURE.md) - System design
   - [QUICKSTART.md](QUICKSTART.md) - Getting started

2. **Find an issue**:
   - Look for issues labeled `good first issue`
   - Check issues labeled `help wanted`
   - Or propose your own improvement

3. **Ask questions**:
   - Use GitHub Discussions for general questions
   - Comment on issues for specific questions
   - Join OpenCode Discord for real-time help

---

## Development Setup

### 1. Fork and Clone

```bash
# Fork on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/fionacode.git
cd fionacode

# Add upstream remote
git remote add upstream https://github.com/dscv103/fionacode.git
```

### 2. Install Dependencies

```bash
# Install Python dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Install pre-commit hooks
pre-commit install
```

### 3. Configure Environment

```bash
# Copy example env file
cp .env.example .env

# Edit .env with your API keys
vim .env

# Source environment
export $(cat .env | xargs)
```

### 4. Verify Setup

```bash
# Run tests
pytest

# Run type checks
mypy src/
pyright src/

# Run linters
ruff check src/
black --check src/

# Run OpenCode
opencode
/init
```

---

## Contribution Types

### 1. Bug Fixes

**Process**:
1. Find or create bug report issue
2. Reproduce the bug locally
3. Write test that demonstrates bug
4. Fix the bug
5. Ensure test passes
6. Submit PR

**Example**:
```
fix(coverage_analyzer): handle missing coverage.json

Fixes #123

- Add file existence check
- Return clear error message when file missing
- Add test for missing file scenario
```

### 2. New Features

**Process**:
1. Create feature request issue
2. Discuss design and approach
3. Get approval from maintainers
4. Implement feature with tests
5. Update documentation
6. Submit PR

**Example**:
```
feat(tools): add mutation testing tool

Implements #456

- Add mutmut integration
- Analyze mutation coverage
- Report surviving mutants
- Include 85% test coverage
- Add tool documentation
```

### 3. Documentation

**Process**:
1. Identify unclear or missing documentation
2. Write or update documentation
3. Ensure examples are accurate
4. Submit PR

**Types**:
- Fix typos or errors
- Clarify existing docs
- Add examples
- Write new guides

### 4. New Tools

**Process**:
1. Propose tool in issue
2. Design input/output schema
3. Implement tool following patterns
4. Write comprehensive tests
5. Document in TOOLS_REFERENCE.md
6. Submit PR

**Requirements**:
- Follow thin-wrapper pattern
- Structured JSON output
- Error handling
- Timeout support
- Type hints
- 80%+ test coverage

### 5. New Agents

**Process**:
1. Propose agent in issue
2. Define role and responsibilities
3. Create agent prompt
4. Configure in opencode.json
5. Test thoroughly
6. Document in README.md
7. Submit PR

**Requirements**:
- Clear, specific role
- Well-defined responsibilities
- Appropriate tools
- Correct permissions
- Proper temperature
- Documentation

---

## Development Workflow

### 1. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

```bash
# Make your changes
vim src/your_file.py

# Test locally
pytest tests/test_your_file.py

# Check types
mypy src/your_file.py

# Format code
black src/your_file.py
ruff check --fix src/your_file.py
```

### 3. Commit Changes

Follow Conventional Commits:

```bash
# Stage changes
git add src/your_file.py tests/test_your_file.py

# Commit with conventional format
git commit -m "feat(scope): add new feature

Detailed description of the change.

Fixes #123"
```

**Commit Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvement
- `test`: Test additions or changes
- `build`: Build system changes
- `ci`: CI configuration
- `chore`: Other changes (dependencies, etc.)

### 4. Push and Create PR

```bash
# Push to your fork
git push origin feature/your-feature-name

# Create PR on GitHub
# Fill out PR template
```

---

## Code Standards

### Python Code Style

**Follow**:
- PEP 8 style guide
- Type hints for all functions
- Docstrings for all public functions (Google style)
- Maximum line length: 100 characters

**Tools**:
- **black**: Code formatting
- **ruff**: Linting
- **mypy**: Type checking
- **pyright**: Additional type checking

**Example**:

```python
from typing import Optional

def validate_email(email: str, strict: bool = False) -> bool:
    """Validate an email address.
    
    Args:
        email: Email address to validate
        strict: If True, use strict RFC validation
        
    Returns:
        True if email is valid, False otherwise
        
    Raises:
        ValueError: If email is empty string
        
    Examples:
        >>> validate_email("user@example.com")
        True
        >>> validate_email("invalid")
        False
    """
    if not email:
        raise ValueError("Email cannot be empty")
    
    # Implementation...
    return True
```

### TypeScript/JavaScript Code Style

For custom tools:

```typescript
import { tool } from "@opencode-ai/plugin"

/**
 * Validate email addresses.
 */
export default tool({
  description: "Validate email addresses using regex",
  args: {
    email: tool.schema.string().describe("Email address to validate"),
    strict: tool.schema.boolean().optional().describe("Use strict validation"),
  },
  async execute(args, context) {
    // Implementation...
    return {
      ok: true,
      valid: true,
      email: args.email,
    }
  },
})
```

### Directory Structure

```
.opencode/
├── prompts/           # Agent system prompts
│   └── agent-name.txt
├── tool/              # Custom tool implementations
│   └── tool_name.ts
└── state/             # Runtime state (gitignored)

src/                   # Python source code
├── utils/             # Utility functions
├── services/          # Business logic
└── api/               # API endpoints

tests/                 # Test files
├── unit/              # Unit tests
├── integration/       # Integration tests
└── fixtures/          # Test fixtures

docs/                  # Additional documentation
pro_docs/              # OpenCode MDX documentation
```

---

## Testing Guidelines

### Test Requirements

**Coverage**:
- Minimum 80% branch coverage for new code
- 100% coverage for critical code paths
- Use `coverage_analyzer` tool to verify

**Test Types**:
1. **Unit tests**: Test individual functions
2. **Integration tests**: Test tool interactions
3. **End-to-end tests**: Test complete workflows

### Writing Tests

**Use pytest**:

```python
import pytest
from src.utils.validators import validate_email

def test_validate_email_valid():
    """Test validation of valid email."""
    assert validate_email("user@example.com") is True

def test_validate_email_invalid():
    """Test validation of invalid email."""
    assert validate_email("invalid") is False

def test_validate_email_empty():
    """Test validation of empty email raises error."""
    with pytest.raises(ValueError, match="Email cannot be empty"):
        validate_email("")

@pytest.mark.parametrize("email,expected", [
    ("user@example.com", True),
    ("invalid", False),
    ("user@", False),
    ("@example.com", False),
])
def test_validate_email_parametrized(email, expected):
    """Test email validation with multiple inputs."""
    assert validate_email(email) == expected
```

**Use fixtures**:

```python
@pytest.fixture
def sample_emails():
    """Sample email addresses for testing."""
    return {
        "valid": ["user@example.com", "test.user@example.co.uk"],
        "invalid": ["invalid", "user@", "@example.com"],
    }

def test_validate_multiple_emails(sample_emails):
    """Test validation of multiple emails."""
    for email in sample_emails["valid"]:
        assert validate_email(email) is True
    
    for email in sample_emails["invalid"]:
        assert validate_email(email) is False
```

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_validators.py

# Run specific test
pytest tests/test_validators.py::test_validate_email_valid

# Run with coverage
pytest --cov --cov-report=html

# Run with verbose output
pytest -v

# Run with markers
pytest -m integration

# Run with keyword filter
pytest -k "email"
```

### Test Organization

**Structure**:
```
tests/
├── unit/
│   ├── test_validators.py
│   ├── test_formatters.py
│   └── test_parsers.py
├── integration/
│   ├── test_tool_integration.py
│   └── test_agent_workflow.py
├── fixtures/
│   ├── conftest.py
│   ├── sample_data.py
│   └── mock_responses.py
└── conftest.py
```

**conftest.py** (root):
```python
import pytest

@pytest.fixture(scope="session")
def test_config():
    """Test configuration."""
    return {
        "timeout_ms": 1000,
        "threshold": 70.0,
    }
```

---

## Documentation Guidelines

### Documentation Types

1. **Code Comments**: Explain "why", not "what"
2. **Docstrings**: Document all public functions
3. **README Updates**: Update for new features
4. **Tool Reference**: Document new tools
5. **Architecture Docs**: Document design decisions

### Docstring Style

Use Google-style docstrings:

```python
def function_name(param1: str, param2: int = 0) -> bool:
    """Brief one-line description.
    
    Longer description explaining what the function does,
    when to use it, and any important details.
    
    Args:
        param1: Description of param1
        param2: Description of param2 (optional, default: 0)
        
    Returns:
        Description of return value
        
    Raises:
        ValueError: When and why this is raised
        TypeError: When and why this is raised
        
    Examples:
        >>> function_name("test", 5)
        True
        >>> function_name("", 0)
        False
        
    Note:
        Additional notes or warnings
    """
    pass
```

### Markdown Guidelines

- Use clear headings (H1, H2, H3)
- Include table of contents for long documents
- Use code blocks with language tags
- Include examples for all features
- Use tables for structured data
- Add links to related documentation

---

## Pull Request Process

### 1. PR Preparation

**Before submitting**:
- [ ] All tests pass (`pytest`)
- [ ] Type checks pass (`mypy`, `pyright`)
- [ ] Code formatted (`black`, `ruff`)
- [ ] Coverage ≥ 80% for new code
- [ ] Documentation updated
- [ ] CHANGELOG.md updated (for features)
- [ ] Commit messages follow conventional format

### 2. PR Template

Fill out the PR template:

```markdown
## Description
Brief description of the change

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to change)
- [ ] Documentation update

## Related Issue
Fixes #123

## Changes Made
- Change 1
- Change 2
- Change 3

## Testing
Describe how you tested the changes:
- Test 1
- Test 2

## Coverage
Current coverage: 85%
Previous coverage: 82%

## Checklist
- [ ] Tests pass
- [ ] Type checks pass
- [ ] Code formatted
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
```

### 3. Review Process

1. **Automated Checks**:
   - Tests run via CI
   - Type checks run
   - Code quality checks
   - Coverage report

2. **Code Review**:
   - Maintainer reviews code
   - Provides feedback
   - May request changes

3. **Approval**:
   - Maintainer approves
   - PR merged to main

### 4. After Merge

```bash
# Update your main branch
git checkout main
git pull upstream main

# Delete feature branch
git branch -d feature/your-feature-name
git push origin --delete feature/your-feature-name
```

---

## Community

### Communication Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and ideas
- **OpenCode Discord**: Real-time chat and support
- **Pull Requests**: Code contributions and reviews

### Getting Help

**For Contributors**:
1. Read relevant documentation
2. Search existing issues/discussions
3. Ask in GitHub Discussions
4. Tag maintainers if urgent

**For Maintainers**:
1. Review PRs promptly
2. Provide constructive feedback
3. Welcome new contributors
4. Document decisions

### Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project README
- GitHub contributors page

---

## Development Tips

### Using FionaCode for Development

Use FionaCode itself to develop FionaCode:

```
I need to add a new tool called mutation_tester.

Requirements:
- Integrate with mutmut
- Run mutation testing on specified files
- Report mutation score and surviving mutants
- Include at least 80% test coverage
- Follow existing tool patterns
- Add documentation to TOOLS_REFERENCE.md

Please implement this following our contribution guidelines.
```

### Testing Tools Locally

```bash
# Test tool execution
opencode run "Test the coverage_analyzer tool on this project"

# Test agent delegation
opencode run "Have the implementer create a simple utility function"

# Test workflow
opencode run "Run a full quality check with all tools"
```

### Debugging

**Enable debug logging**:
```bash
export OPENCODE_LOG_LEVEL=debug
opencode
```

**Check tool output**:
```typescript
// In tool implementation
console.log("Debug info:", { args, context })
```

**Test in isolation**:
```bash
# Test Python functions directly
python -c "from src.utils import validate_email; print(validate_email('test@example.com'))"

# Test tools via OpenCode
opencode run "Execute coverage_analyzer with debug output"
```

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes (backwards compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in appropriate files
- [ ] Git tag created
- [ ] Release notes written
- [ ] Announcement prepared

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

- **Documentation**: [DOCUMENTATION_INDEX.md](DOCUMENTATION_INDEX.md)
- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/dscv103/fionacode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/dscv103/fionacode/discussions)

---

**Thank you for contributing to FionaCode!** 🎉

Your contributions help make AI-assisted development better for everyone.
