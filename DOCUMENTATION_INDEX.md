# FionaCode Documentation Index

Welcome to the FionaCode documentation. This index helps you find the information you need quickly.

---

## 📚 Documentation Files

### Core Documentation

| Document | Description | When to Read |
|----------|-------------|--------------|
| **[README.md](README.md)** | Project overview, features, agents, tools, workflows | **Start here** - First time users |
| **[QUICKSTART.md](QUICKSTART.md)** | 5-minute setup guide with examples | Getting started quickly |
| **[ARCHITECTURE.md](ARCHITECTURE.md)** | System design, layers, patterns, data flow | Understanding the system |
| **[TOOLS_REFERENCE.md](TOOLS_REFERENCE.md)** | Complete tool documentation with examples | Using custom tools |
| **[CONFIGURATION.md](CONFIGURATION.md)** | Configuration guide for agents, tools, permissions | Customizing FionaCode |
| **[CONTRIBUTING.md](CONTRIBUTING.md)** | Contribution guidelines | Contributing to the project |

### OpenCode Documentation (MDX)

Located in `pro_docs/`:

| Document | Description |
|----------|-------------|
| [index.mdx](pro_docs/index.mdx) | OpenCode introduction and installation |
| [agents.mdx](pro_docs/agents.mdx) | Agent types, usage, and configuration |
| [tools.mdx](pro_docs/tools.mdx) | Built-in tools reference |
| [custom-tools.mdx](pro_docs/custom-tools.mdx) | Creating custom tools |
| [config.mdx](pro_docs/config.mdx) | OpenCode configuration format |
| [permissions.mdx](pro_docs/permissions.mdx) | Permission system details |
| [commands.mdx](pro_docs/commands.mdx) | Custom command creation |
| [skills.mdx](pro_docs/skills.mdx) | Agent skills (SKILL.md) |
| [plugins.mdx](pro_docs/plugins.mdx) | Plugin development |
| [mcp-servers.mdx](pro_docs/mcp-servers.mdx) | MCP server integration |
| [lsp.mdx](pro_docs/lsp.mdx) | LSP server configuration |
| [formatters.mdx](pro_docs/formatters.mdx) | Code formatter setup |
| [rules.mdx](pro_docs/rules.mdx) | AGENTS.md rules files |

---

## 🎯 Quick Navigation

### By Role

**I'm a Developer**:
1. Read [QUICKSTART.md](QUICKSTART.md) to get running in 5 minutes
2. Review [README.md](README.md) for feature overview
3. Check [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) for tools you'll use

**I'm a Team Lead**:
1. Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand the system
2. Review [CONFIGURATION.md](CONFIGURATION.md) for team settings
3. Check [README.md](README.md) for workflows and best practices

**I'm a Contributor**:
1. Read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines
2. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system design
3. Check [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx) for tool development

**I'm an DevOps Engineer**:
1. Read [CONFIGURATION.md](CONFIGURATION.md) for CI/CD setup
2. Review [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) for relevant tools
3. Check [README.md](README.md) for workflow integration

---

### By Task

**Setting Up**:
- [QUICKSTART.md](QUICKSTART.md) - Installation and first steps
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration guide

**Understanding the System**:
- [README.md](README.md) - Overview and features
- [ARCHITECTURE.md](ARCHITECTURE.md) - Deep dive into design

**Using Tools**:
- [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) - Complete tool reference
- [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx) - Creating tools

**Configuring Agents**:
- [README.md](README.md) - Agent overview
- [pro_docs/agents.mdx](pro_docs/agents.mdx) - Agent details
- [CONFIGURATION.md](CONFIGURATION.md) - Agent configuration

**Troubleshooting**:
- [QUICKSTART.md](QUICKSTART.md) - Common issues
- [CONFIGURATION.md](CONFIGURATION.md) - Configuration problems
- [README.md](README.md) - Troubleshooting section

---

## 📖 Reading Paths

### Path 1: Quick Start (15 minutes)

For developers who want to start using FionaCode immediately:

1. ⏱️ **5 min**: [QUICKSTART.md](QUICKSTART.md) - Setup and first task
2. ⏱️ **5 min**: [README.md](README.md) - Skim agents and tools sections
3. ⏱️ **5 min**: [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) - Skim tool descriptions

**Goal**: Get FionaCode running and complete your first task.

---

### Path 2: Deep Understanding (1 hour)

For team leads and architects who need to understand the system:

1. ⏱️ **15 min**: [README.md](README.md) - Complete overview
2. ⏱️ **30 min**: [ARCHITECTURE.md](ARCHITECTURE.md) - System design
3. ⏱️ **15 min**: [CONFIGURATION.md](CONFIGURATION.md) - Configuration options

**Goal**: Understand how FionaCode works and how to configure it for your team.

---

### Path 3: Contributor Onboarding (2 hours)

For developers who want to contribute to FionaCode:

1. ⏱️ **15 min**: [README.md](README.md) - Project overview
2. ⏱️ **30 min**: [ARCHITECTURE.md](ARCHITECTURE.md) - System internals
3. ⏱️ **30 min**: [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) - Tool patterns
4. ⏱️ **15 min**: [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx) - Tool development
5. ⏱️ **30 min**: [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution process

**Goal**: Be ready to contribute code, tools, or agents.

---

### Path 4: Complete Mastery (4 hours)

For power users who want to master every aspect:

1. ⏱️ **30 min**: [QUICKSTART.md](QUICKSTART.md) + [README.md](README.md)
2. ⏱️ **60 min**: [ARCHITECTURE.md](ARCHITECTURE.md)
3. ⏱️ **60 min**: [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md)
4. ⏱️ **60 min**: [CONFIGURATION.md](CONFIGURATION.md)
5. ⏱️ **30 min**: All [pro_docs/*.mdx](pro_docs/) files

**Goal**: Expert-level understanding of FionaCode.

---

## 🔍 Topic Index

### Agents

- **Overview**: [README.md § Agents](README.md#agents)
- **Architecture**: [ARCHITECTURE.md § Agent Architecture](ARCHITECTURE.md#agent-architecture)
- **Configuration**: [CONFIGURATION.md § Agent Configuration](CONFIGURATION.md#agent-configuration)
- **Details**: [pro_docs/agents.mdx](pro_docs/agents.mdx)

**Specific Agents**:
- Orchestrator: [README.md § Orchestrator](README.md#orchestrator)
- Implementer: [README.md § Implementer](README.md#implementer)
- Code Review: [README.md § Code Review](README.md#code-review)
- All others: [README.md § Specialized Subagents](README.md#specialized-subagents)

### Tools

- **Overview**: [README.md § Custom Tools](README.md#custom-tools)
- **Reference**: [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md)
- **Creating Tools**: [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx)
- **Built-in Tools**: [pro_docs/tools.mdx](pro_docs/tools.mdx)

**Phase 1 Tools**:
- coverage_analyzer: [TOOLS_REFERENCE.md § coverage_analyzer](TOOLS_REFERENCE.md#coverage_analyzer)
- exit_criteria_checker: [TOOLS_REFERENCE.md § exit_criteria_checker](TOOLS_REFERENCE.md#exit_criteria_checker)
- type_check_aggregator: [TOOLS_REFERENCE.md § type_check_aggregator](TOOLS_REFERENCE.md#type_check_aggregator)
- task_tracker: [TOOLS_REFERENCE.md § task_tracker](TOOLS_REFERENCE.md#task_tracker)

**Phase 2 Tools**: [TOOLS_REFERENCE.md § Phase 2](TOOLS_REFERENCE.md#phase-2-quality-assurance-tools)

**Phase 3 Tools**: [TOOLS_REFERENCE.md § Phase 3](TOOLS_REFERENCE.md#phase-3-quality-of-life-tools)

### Configuration

- **Overview**: [CONFIGURATION.md](CONFIGURATION.md)
- **OpenCode Config**: [pro_docs/config.mdx](pro_docs/config.mdx)
- **Examples**: [CONFIGURATION.md § Configuration Examples](CONFIGURATION.md#configuration-examples)
- **Permissions**: [CONFIGURATION.md § Permission System](CONFIGURATION.md#permission-system)

### Workflows

- **Overview**: [README.md § Workflows](README.md#workflows)
- **Architecture**: [ARCHITECTURE.md § Workflow Patterns](ARCHITECTURE.md#workflow-patterns)
- **Examples**: [QUICKSTART.md § Example Workflows](QUICKSTART.md#example-workflows)

### MCP Servers

- **Configuration**: [CONFIGURATION.md § MCP Servers](CONFIGURATION.md#mcp-servers)
- **Details**: [pro_docs/mcp-servers.mdx](pro_docs/mcp-servers.mdx)
- **Setup**: [README.md § MCP Servers](README.md#mcp-servers)

### LSP Servers

- **Configuration**: [CONFIGURATION.md § LSP Servers](CONFIGURATION.md#lsp-servers)
- **Details**: [pro_docs/lsp.mdx](pro_docs/lsp.mdx)

### Permissions

- **System**: [CONFIGURATION.md § Permission System](CONFIGURATION.md#permission-system)
- **Details**: [pro_docs/permissions.mdx](pro_docs/permissions.mdx)
- **Examples**: [README.md § Best Practices](README.md#best-practices)

---

## 💡 Common Questions

**Q: How do I get started?**  
A: Read [QUICKSTART.md](QUICKSTART.md) - you'll be running in 5 minutes.

**Q: How do agents work together?**  
A: See [ARCHITECTURE.md § Agent Hierarchy](ARCHITECTURE.md#agent-hierarchy) and [README.md § Workflows](README.md#workflows).

**Q: What tools are available?**  
A: See [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md) for all 21+ custom tools.

**Q: How do I configure agents?**  
A: See [CONFIGURATION.md § Agent Configuration](CONFIGURATION.md#agent-configuration).

**Q: How do I create a custom tool?**  
A: See [pro_docs/custom-tools.mdx](pro_docs/custom-tools.mdx) and [TOOLS_REFERENCE.md § Tool Design Patterns](TOOLS_REFERENCE.md#tool-design-patterns).

**Q: What are the exit criteria?**  
A: See [README.md § Exit Criteria](README.md#exit-criteria) and [TOOLS_REFERENCE.md § exit_criteria_checker](TOOLS_REFERENCE.md#exit_criteria_checker).

**Q: How do permissions work?**  
A: See [CONFIGURATION.md § Permission System](CONFIGURATION.md#permission-system) and [pro_docs/permissions.mdx](pro_docs/permissions.mdx).

**Q: How do I troubleshoot issues?**  
A: See [QUICKSTART.md § Troubleshooting](QUICKSTART.md#troubleshooting) and [README.md § Troubleshooting](README.md#troubleshooting).

---

## 🎓 Learning Resources

### Official OpenCode Resources

- **Website**: https://opencode.ai
- **Documentation**: https://opencode.ai/docs
- **GitHub**: https://github.com/anomalyco/opencode
- **Discord**: https://opencode.ai/discord
- **Example Sessions**: https://opencode.ai/s/

### FionaCode Resources

- **Repository**: https://github.com/dscv103/fionacode
- **Issues**: https://github.com/dscv103/fionacode/issues
- **Discussions**: https://github.com/dscv103/fionacode/discussions

---

## 📋 Checklists

### New User Checklist

- [ ] Read [QUICKSTART.md](QUICKSTART.md)
- [ ] Install OpenCode
- [ ] Clone FionaCode repository
- [ ] Configure environment variables
- [ ] Run `/init` in your project
- [ ] Complete first task (from QUICKSTART)
- [ ] Review [README.md](README.md) for full capabilities

### Team Setup Checklist

- [ ] Read [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Review [CONFIGURATION.md](CONFIGURATION.md)
- [ ] Create team `opencode.json` configuration
- [ ] Set up shared `AGENTS.md` rules
- [ ] Configure permissions for your workflow
- [ ] Set up MCP servers (if needed)
- [ ] Document team conventions
- [ ] Train team members

### Contributor Checklist

- [ ] Read [CONTRIBUTING.md](CONTRIBUTING.md)
- [ ] Read [ARCHITECTURE.md](ARCHITECTURE.md)
- [ ] Review [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md)
- [ ] Set up development environment
- [ ] Run tests locally
- [ ] Read code style guidelines
- [ ] Join discussions
- [ ] Submit first PR

---

## 📞 Getting Help

### Documentation Issues

If you find unclear or missing documentation:

1. **Search existing issues**: [GitHub Issues](https://github.com/dscv103/fionacode/issues)
2. **Open new issue**: Use "Documentation" label
3. **Suggest improvements**: PRs welcome!

### Usage Questions

For questions about using FionaCode:

1. **Check documentation**: Use this index to find answers
2. **Search discussions**: [GitHub Discussions](https://github.com/dscv103/fionacode/discussions)
3. **Ask in Discord**: [OpenCode Discord](https://opencode.ai/discord)
4. **Open discussion**: Create new discussion thread

### Bug Reports

For bugs in FionaCode:

1. **Check existing issues**: [GitHub Issues](https://github.com/dscv103/fionacode/issues)
2. **Create detailed report**: Include configuration, logs, and steps to reproduce
3. **Use bug template**: Follow issue template guidelines

---

## 🔄 Keeping Updated

### Documentation Updates

This documentation is updated regularly. Check back for:

- New tools and features
- Configuration best practices
- Workflow improvements
- Troubleshooting guides

### Version Information

- **Documentation Version**: 1.0.0
- **Last Updated**: January 4, 2026
- **OpenCode Version**: 1.0+
- **FionaCode Version**: 1.0.0

---

## 📝 Documentation Standards

All FionaCode documentation follows these principles:

1. **Clear Structure**: Hierarchical organization with clear navigation
2. **Practical Examples**: Real-world usage examples in every section
3. **Progressive Disclosure**: Start simple, go deep when needed
4. **Searchable**: Well-indexed with clear topic references
5. **Up-to-date**: Regular reviews and updates
6. **Accessible**: Clear language, no jargon without explanation

---

## 🎯 Quick Reference Cards

### Agent Quick Reference

| Agent | Temperature | Mode | Key Tools |
|-------|-------------|------|-----------|
| Orchestrator | 0.2 | primary | task_tracker, exit_criteria_checker |
| Implementer | 0.3 | subagent | coverage_analyzer, type_check_aggregator |
| Code Review | 0.1 | subagent | exit_criteria_checker, code_complexity_scorer |
| Diagnostics | 0.1 | subagent | test_runner_smart, flakiness_detector |

**Full list**: [README.md § Agents](README.md#agents)

### Tool Quick Reference

| Tool | Phase | Purpose | Output |
|------|-------|---------|--------|
| coverage_analyzer | 1 | Coverage metrics | Coverage report with gaps |
| exit_criteria_checker | 1 | Approve/iterate decision | Decision with score |
| type_check_aggregator | 1 | Type checking | Errors by file and severity |
| test_runner_smart | 2 | Delta testing | Test results with failures |
| dependency_auditor | 2 | Vulnerability scan | CVEs and license issues |

**Full list**: [TOOLS_REFERENCE.md](TOOLS_REFERENCE.md)

### Command Quick Reference

| Command | Purpose |
|---------|---------|
| `/init` | Initialize project rules |
| `/connect` | Configure LLM provider |
| `/undo` | Undo last change |
| `/redo` | Redo last undone change |
| `/share` | Create shareable link |
| `Tab` | Switch Build/Plan mode |

**Full list**: [pro_docs/commands.mdx](pro_docs/commands.mdx)

---

## 📚 Related Documentation

### External Resources

- **Model Context Protocol**: https://modelcontextprotocol.io/
- **Anthropic Claude**: https://console.anthropic.com/
- **Pytest Documentation**: https://docs.pytest.org/
- **Conventional Commits**: https://www.conventionalcommits.org/

---

**Documentation maintained by**: FionaCode Contributors  
**License**: MIT  
**Contact**: See [GitHub Issues](https://github.com/dscv103/fionacode/issues)

---

> **Tip**: Bookmark this page! It's your central hub for all FionaCode documentation.
