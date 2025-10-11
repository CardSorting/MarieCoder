# MarieCoder CLI - Quick Reference Guide

> **Version:** 1.1.0 (Enhanced)  
> **Last Updated:** October 11, 2025  
> **Status:** 4/12 Core Features Complete

---

## ⚡ Quick Start (30 seconds)

```bash
# 1. Install (if not already installed)
npm install -g mariecoder

# 2. First-time setup
mariecoder --setup
# Follow prompts to configure API key and preferences

# 3. Start coding!
mariecoder
> Create a REST API for user management
```

### How MarieCoder CLI Works

```
┌─────────────────────────────────────────────────────────────────┐
│                      MarieCoder CLI Workflow                     │
└─────────────────────────────────────────────────────────────────┘

    You                    MarieCoder CLI              AI Models
     │                           │                          │
     │  "Create REST API"       │                          │
     ├──────────────────────────>│                          │
     │                           │  Send task + context     │
     │                           ├─────────────────────────>│
     │                           │                          │
     │                           │  <─── Response           │
     │                           │                          │
     │  ← Show proposed changes  │                          │
     │                           │                          │
     │  Approve/Reject          │                          │
     ├──────────────────────────>│                          │
     │                           │                          │
     │                           │  Execute actions         │
     │                           │  • Edit files            │
     │                           │  • Run commands          │
     │                           │  • Use MCP tools         │
     │                           │                          │
     │  ← Task complete          │                          │
     │                           │                          │
     │  Export history          │                          │
     ├──────────────────────────>│                          │
     │                           │                          │
     │  ← Markdown report        │                          │
     │                           │                          │

Features:
  • Plan/Act Modes: Review vs. Execute
  • Task History: Resume & Export
  • MCP Integration: Extended capabilities
  • Context Management: Automatic optimization
```

---

## 📖 Table of Contents

- [Getting Started](#-getting-started)
- [Command Reference](#-command-reference-table)
- [Interactive Commands](#-interactive-mode-commands)
- [Configuration](#️-configuration)
- [Command-Line Flags](#-command-line-flags)
- [Usage Examples](#-usage-examples)
- [Features Deep Dive](#-features-deep-dive)
- [Project Integration](#-project-integration-clinerules)
- [Tips & Best Practices](#-tips--best-practices)
- [Troubleshooting](#-troubleshooting)
- [Getting Help](#-getting-help)

---

## 🚀 Getting Started

### First-Time Setup

```bash
# Run interactive setup wizard
mariecoder --setup

# What you'll configure:
# ✓ API provider (Anthropic, OpenRouter, LM Studio, etc.)
# ✓ API key
# ✓ Default model
# ✓ Plan/Act mode preferences (optional)
# ✓ Separate models for plan and act modes (optional)
```

### Basic Usage

```bash
# Interactive mode (recommended)
mariecoder

# Single-task mode
mariecoder "Create a React component for user login"

# With specific workspace
mariecoder -w ./my-project "Add tests for auth module"

# View configuration
mariecoder --config

# Show help
mariecoder --help
```

---

## 📊 Command Reference Table

| Command | Shortcut | Description | Example |
|---------|----------|-------------|---------|
| `config` | - | Show current configuration | `> config` |
| `mode` | `toggle` | Switch between plan/act modes | `> mode` |
| `history` | - | View task history | `> history` |
| `history export <id>` | - | Export task as markdown | `> history export task_abc123` |
| `history resume <id>` | - | Resume previous task | `> history resume task_abc123` |
| `history search <query>` | - | Search task history | `> history search "bug fix"` |
| `history details <id>` | - | View task details | `> history details task_abc123` |
| `history delete <id>` | - | Delete task from history | `> history delete task_old456` |
| `mcp` | - | Show MCP server status | `> mcp` |
| `mcp tools` | - | List available MCP tools | `> mcp tools` |
| `help` | `?` | Show help message | `> help` |
| `clear` | `cls` | Clear screen | `> clear` |
| `exit` | `quit` | Exit interactive mode | `> exit` |

---

## 📋 Interactive Mode Commands

### Essential Commands

```bash
# Exit the CLI
exit            # or 'quit'

# Show current configuration
config

# Switch between plan and act modes
mode            # or 'toggle'

# View task history
history

# Show MCP server status
mcp

# Get help
help

# Clear screen
clear
```

### Mode Management

```bash
# View current mode
config          # Shows: Mode: plan (or act)

# Toggle mode
mode            # Switches: plan ↔ act

# Plan mode: AI proposes changes for review (safer)
# Act mode: AI executes changes directly (faster)
```

### Task History

```bash
# View recent tasks
history

# Export task as markdown
history export <task-id>

# Resume a previous task
history resume <task-id>

# Search task history
history search "bug fix"

# View task details
history details <task-id>

# Delete task from history
history delete <task-id>
```

### MCP Integration

```bash
# Show MCP server status
mcp

# List available MCP tools and resources
mcp tools

# Example output:
#   ✓ filesystem - connected
#   ✓ database - connected
#   ✗ api-gateway - disconnected
```

---

## ⚙️ Configuration

### Setup Wizard

```bash
# Run interactive setup (recommended for first-time users)
mariecoder --setup

# View current settings
mariecoder --config

# Reset all configuration (start fresh)
mariecoder --reset-config
```

### Configuration Files

Configuration is stored in `~/.mariecoder/cli/`:

```bash
~/.mariecoder/cli/
├── config.json      # Main configuration
└── secrets.json     # API keys (secure, 0600 permissions)
```

### Configuration Options

Complete configuration schema:

```json
{
  "apiProvider": "anthropic",
  "apiModelId": "claude-sonnet-4-5-20250929",
  "mode": "act",
  "planActSeparateModelsSetting": true,
  "planModeApiProvider": "anthropic",
  "planModeApiModelId": "claude-3-5-sonnet-20241022",
  "actModeApiProvider": "anthropic",
  "actModeApiModelId": "claude-sonnet-4-5-20250929",
  "temperature": 0.0,
  "maxTokens": null,
  "hasCompletedSetup": true
}
```

### Configuration Precedence

Settings are resolved in this order (highest to lowest priority):

1. **Command-line flags** (e.g., `-p anthropic -m claude-3-5-sonnet`)
2. **Configuration files** (`~/.mariecoder/cli/config.json`)
3. **Environment variables** (e.g., `MARIE_PROVIDER`, `ANTHROPIC_API_KEY`)
4. **Built-in defaults**

**Example:**
```bash
# This will use anthropic regardless of config.json
mariecoder -p anthropic "Create a function"

# Environment variable used if no config or flag
export MARIE_PROVIDER=openrouter
mariecoder "Create a function"
```

### Custom Model Configuration

#### Adding Custom Models

Edit `config.json` to add custom models:

```json
{
  "apiProvider": "openrouter",
  "apiModelId": "anthropic/claude-3.5-sonnet",
  "openRouterModels": {
    "myCustomModel": {
      "id": "custom/model-id",
      "name": "My Custom Model",
      "maxTokens": 8192
    }
  }
}
```

#### LM Studio Configuration

For local models via LM Studio:

```bash
# 1. Start LM Studio server on default port (1234)

# 2. Configure MarieCoder
mariecoder --setup
# Select: LM Studio
# Base URL: http://localhost:1234
# Model: (auto-detected from server)

# 3. Use normally
mariecoder "Create a function"
```

#### OpenRouter Configuration

For OpenRouter with custom routing:

```bash
mariecoder --setup
# Select: OpenRouter
# API Key: sk-or-...
# Model: anthropic/claude-3.5-sonnet (or any OpenRouter model)
```

---

## 🎯 Command-Line Flags

### API Configuration

```bash
-p, --provider <provider>    # AI provider (anthropic, openrouter, lmstudio)
-m, --model <model>          # AI model to use
-k, --api-key <key>          # API key
-t, --temperature <temp>     # Temperature (0.0-1.0)
--max-tokens <number>        # Maximum tokens
```

### Workspace & Execution

```bash
-w, --workspace <path>       # Workspace directory
-y, --auto-approve           # Auto-approve all actions (⚠️ use with caution!)
--verbose                    # Show detailed logging
```

### Setup & Info

```bash
--setup                      # Run setup wizard
--config                     # Show current configuration
--reset-config               # Reset all configuration
-h, --help                   # Show help
-v, --version                # Show version
```

---

## 💡 Usage Examples

### Basic Usage

```bash
# First-time setup
$ mariecoder --setup
# Follow prompts to configure API key, provider, and model

# Start coding
$ mariecoder
> Create a REST API for user management

# Switch to plan mode for complex changes
$ mariecoder
> mode
# Now in plan mode - safer review workflow
```

### Advanced Usage

```bash
# Use specific workspace
mariecoder -w ./my-project "Add tests for auth module"

# Use specific model
mariecoder -m claude-3-5-sonnet "Refactor database queries"

# Auto-approve mode (for trusted tasks)
mariecoder -y "Run linter and fix all errors"

# Verbose output (for debugging)
mariecoder --verbose "Investigate memory leak"

# Custom provider
mariecoder -p openrouter -m "anthropic/claude-3.5-sonnet" "Task"
```

### Task History Examples

```bash
# Interactive mode
$ mariecoder
> history
# Shows: List of recent tasks with IDs

> history export task_abc123
# Exports task to markdown file

> history resume task_abc123
# Resumes previous task - continues from where it left off

> history search "authentication"
# Finds all tasks related to authentication

> history delete task_old456
# Removes old task from history
```

### MCP Examples

```bash
# Check MCP status
$ mariecoder
> mcp
# Shows:
#   ✓ filesystem - connected
#   ✓ database - connected

> mcp tools
# Lists available tools from all connected servers
```

---

## 🔧 Environment Variables

```bash
# API Keys (lowest priority, overridden by config)
export ANTHROPIC_API_KEY=sk-ant-...
export OPENAI_API_KEY=sk-...
export OPENROUTER_API_KEY=sk-...
export MARIE_API_KEY=sk-...

# Custom settings
export MARIE_PROVIDER=anthropic
export MARIE_MODEL=claude-sonnet-4-5-20250929
export MARIE_TEMPERATURE=0.0
export MARIE_MAX_TOKENS=4096
```

---

## 🎨 Features Deep Dive

### 1. Plan/Act Mode Switching ✓

**What it is:** Two distinct operation modes for different workflow needs.

**Plan Mode (Review):**
- AI proposes changes
- You review before execution
- Safer for critical code
- Better for complex refactoring

**Act Mode (Execute):**
- AI executes changes directly
- Faster iteration
- Great for routine tasks
- Trusted operations

**Commands:**
```bash
$ mariecoder
> mode           # Toggle between plan/act
> config         # View current mode
```

**Use Cases:**

| Scenario | Recommended Mode | Why |
|----------|-----------------|-----|
| Critical security code | Plan | Review before execution |
| Architecture changes | Plan | Understand impact first |
| Linting/formatting | Act | Routine, low-risk |
| Bug fixes | Plan | Verify approach |
| Adding tests | Act | Straightforward |
| Refactoring | Plan | Review logic changes |

**Pro Tip:** Use separate models for plan vs. act modes to optimize costs!
```json
{
  "planModeApiModelId": "claude-3-5-haiku",      // Cheaper for planning
  "actModeApiModelId": "claude-sonnet-4-5-..."   // Powerful for execution
}
```

---

### 2. MCP Integration ✓

**What it is:** Access to Model Context Protocol servers for extended capabilities.

**Available Features:**
- File system operations
- Database queries
- API interactions
- Custom tool integrations
- Resource management

**Commands:**
```bash
$ mariecoder
> mcp              # Show server status
> mcp tools        # List available tools

# Example output:
🔌 MCP Server Status
────────────────────────────────────────────────────────────────────────────────
  ✓ filesystem - connected (5 tools, 2 resources)
  ✓ database - connected (8 tools, 1 resource)
  ✗ api-gateway - disconnected
      Error: Connection timeout

  Summary: 2/3 servers connected
────────────────────────────────────────────────────────────────────────────────
```

**How to Configure MCP Servers:**

MarieCoder CLI uses the same MCP configuration as the VS Code extension.

1. **Via VS Code Extension Settings:**
   ```json
   // settings.json
   {
     "mariecoder.mcpServers": {
       "filesystem": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-filesystem", "/path"]
       },
       "database": {
         "command": "npx",
         "args": ["-y", "@modelcontextprotocol/server-postgres"],
         "env": {
           "POSTGRES_URL": "postgresql://..."
         }
       }
     }
   }
   ```

2. **Verify in CLI:**
   ```bash
   $ mariecoder
   > mcp
   # Should show configured servers
   ```

**Benefits:**
- Extends AI capabilities beyond code editing
- Consistent ecosystem with extension
- Real-time status monitoring
- Graceful error handling

---

### 3. Task History Management ✓

**What it is:** Complete task lifecycle management with search, resume, and export capabilities.

**Commands:**
```bash
$ mariecoder
> history                      # List recent tasks
> history export task_abc123   # Export as markdown
> history resume task_abc123   # Resume previous task
> history search "auth"        # Search history
> history details task_abc123  # View details
> history delete task_old456   # Clean up
```

**Example Output:**
```
📜 Task History
────────────────────────────────────────────────────────────────────────────────
  Showing 10 most recent tasks:

  • task_abc123 (30 messages, completed)
     10/11/2025, 10:30:00 AM
     "Create a React component for user authentication"
     
  • task_def456 (15 messages, in progress)
     10/10/2025, 3:45:00 PM
     "Add unit tests for API endpoints"

  • task_ghi789 (8 messages, completed)
     10/09/2025, 9:15:00 AM
     "Refactor database queries for performance"

Commands:
  • history export <id>   - Export task as markdown
  • history resume <id>   - Resume a previous task
  • history search <term> - Search task history
  • history details <id>  - View detailed information
  • history delete <id>   - Delete a task from history
────────────────────────────────────────────────────────────────────────────────
```

**Use Cases:**
- **Resume Work:** Continue where you left off
- **Documentation:** Export important tasks as markdown
- **Learning:** Review how problems were solved
- **Auditing:** Track what changes were made
- **Cleanup:** Remove outdated tasks

**Export Format:**

Exported tasks include:
- Task metadata (ID, timestamp, status)
- Complete conversation history
- All code changes made
- Tool calls and results
- Error messages and resolutions

---

### 4. Advanced Context Management ✓

**What it is:** Automatic context optimization for long conversations and large projects.

**How it Works:**
- Monitors context window usage
- Automatically condenses when needed
- Preserves critical information
- Maintains conversation continuity

**Benefits:**
- Handle massive codebases
- Long-running tasks
- No manual context management
- Seamless operation

**Note:** This feature works automatically; no user interaction required.

---

## 📁 Project Integration (.clinerules)

### What is .clinerules?

A project directory containing custom coding standards, rules, and guidelines that MarieCoder automatically loads and applies.

### Setup

```bash
# In your project root
mkdir .clinerules

# Add coding standards
cat > .clinerules/standards.md << 'EOF'
# Project Coding Standards

## Code Style
- Use TypeScript strict mode
- Prefer functional programming patterns
- Use meaningful variable names
- No abbreviations except: id, url, api

## Naming Conventions
- Files: snake_case (e.g., user_controller.ts)
- Functions: camelCase (e.g., getUserById)
- Classes: PascalCase (e.g., UserService)
- Constants: UPPER_SNAKE_CASE (e.g., MAX_RETRIES)

## Testing
- Write unit tests for all public APIs
- Aim for 80%+ code coverage
- Use descriptive test names
- Test edge cases and errors

## Documentation
- Add JSDoc comments to public functions
- Keep README up to date
- Document breaking changes
- Include usage examples

## Error Handling
- Use specific error types
- Provide actionable error messages
- Log errors with context
- Graceful degradation

## Performance
- Profile before optimizing
- Cache expensive operations
- Use efficient data structures
- Minimize database queries
EOF
```

### Advanced .clinerules

You can include multiple files:

```bash
.clinerules/
├── standards.md           # General coding standards
├── architecture.md        # Architecture guidelines
├── security.md            # Security requirements
├── api-design.md          # API design principles
└── testing-strategy.md    # Testing approach
```

### How MarieCoder Uses .clinerules

1. **Automatic Loading:** Loaded at task start
2. **Context Integration:** Included in AI context
3. **Consistent Application:** Applied to all code generation
4. **Team Alignment:** Everyone follows same standards

### Example Rules Files

**architecture.md:**
```markdown
# Architecture Guidelines

## Layered Architecture
- Presentation Layer: UI components
- Business Logic Layer: Services and use cases
- Data Access Layer: Repositories
- Infrastructure Layer: External services

## Dependency Rules
- Higher layers can depend on lower layers
- Lower layers cannot depend on higher layers
- Use dependency injection

## Module Organization
- Group by feature, not by technical type
- Each feature is self-contained
- Shared utilities in common module
```

**security.md:**
```markdown
# Security Requirements

## Authentication
- Use JWT tokens
- Refresh tokens expire in 7 days
- Access tokens expire in 1 hour

## Input Validation
- Validate all user inputs
- Sanitize before database queries
- Use parameterized queries

## Sensitive Data
- Never log passwords or tokens
- Encrypt sensitive data at rest
- Use HTTPS for all APIs
```

### Benefits

- **Consistency:** All code follows same standards
- **Quality:** Enforced best practices
- **Onboarding:** New team members get standards automatically
- **Documentation:** Living documentation in code
- **Maintainability:** Easier to maintain consistent codebase

---

## 🎓 Tips & Best Practices

### Mode Selection

**Use Plan Mode When:**
- Working on critical/sensitive code
- Making large architectural changes
- Unsure about the approach
- Want to review before execution

**Use Act Mode When:**
- Doing routine tasks (linting, formatting)
- Making small, well-defined changes
- Trust the AI's judgment
- Want faster iteration

### Task History

- **Export frequently:** Keep markdown records of important tasks
- **Clean up regularly:** Delete old/irrelevant tasks
- **Use search:** Find related tasks for context
- **Resume wisely:** Consider if resuming makes sense vs. starting fresh

### MCP Integration

- **Check status first:** Run `mcp` to see what's available
- **Leverage tools:** MCP extends capabilities beyond file editing
- **Monitor connections:** Reconnect if servers go down
- **Configure wisely:** Only enable servers you need

### Performance

- **Workspace size:** Smaller workspaces = faster context loading
- **Model selection:** Smaller models = faster responses (but less capable)
- **Auto-approve:** Only use for trusted, routine tasks
- **Verbose mode:** Use sparingly (only for debugging)

---

## ❓ Troubleshooting

### API Key Issues

#### Problem: "Invalid API key" or "Authentication failed"

**Solution:**
```bash
# 1. Check current configuration
mariecoder --config

# 2. Verify API key format
# Anthropic: sk-ant-api03-...
# OpenAI: sk-...
# OpenRouter: sk-or-v1-...

# 3. Verify key has correct permissions
# - Check dashboard of your provider
# - Ensure key is not expired
# - Verify billing is active

# 4. Re-run setup with correct key
mariecoder --setup

# 5. Test with verbose logging
mariecoder --verbose "test task"
```

#### Problem: "Rate limit exceeded"

**Solution:**
```bash
# Option 1: Wait for rate limit reset (usually 1 minute)

# Option 2: Switch to different model/provider
mariecoder -p openrouter -m "anthropic/claude-3-5-sonnet"

# Option 3: Check your API plan limits
# - Anthropic: https://console.anthropic.com/
# - OpenAI: https://platform.openai.com/usage
```

---

### MCP Server Issues

#### Problem: MCP servers not connecting

**Diagnosis:**
```bash
$ mariecoder
> mcp

# Look for error messages like:
# ✗ server-name - disconnected
#     Error: Connection timeout
#     Error: Server not found
#     Error: Permission denied
```

**Common Solutions:**

**1. Server Not Installed:**
```bash
# Install missing MCP server
npx @modelcontextprotocol/server-filesystem --help

# Verify installation
which npx
```

**2. Configuration Path Incorrect:**
```json
// VS Code settings.json
{
  "mariecoder.mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/correct/path"]
    }
  }
}
```

**3. Server Process Crashed:**
```bash
# Check VS Code extension logs
# Look for MCP-related errors

# Restart VS Code and try again
```

**4. Permission Issues:**
```bash
# Check file permissions
ls -la ~/.mariecoder/

# Fix if needed
chmod 700 ~/.mariecoder/
chmod 600 ~/.mariecoder/cli/secrets.json
```

---

### Task History Issues

#### Problem: Can't resume a task

**Diagnosis:**
```bash
$ mariecoder
> history details <task-id>

# Check for:
# - Task status (in_progress, completed, failed)
# - Error messages
# - Corruption indicators
```

**Solutions:**
```bash
# Option 1: Export and review
> history export <task-id>
# Review the markdown, start fresh with insights

# Option 2: Delete corrupted task
> history delete <task-id>

# Option 3: Clean all history (nuclear option)
rm -rf ~/.mariecoder/tasks/
# Then restart mariecoder
```

#### Problem: Task history is too large / slow

**Solution:**
```bash
# Clean up old tasks
$ mariecoder
> history

# Delete tasks you don't need
> history delete <old-task-id>
> history delete <another-old-task-id>

# Or manually clean
rm -rf ~/.mariecoder/tasks/*_older_than_30_days*
```

---

### Performance Issues

#### Problem: Slow responses

**Diagnosis:**
- Large workspace (1000+ files)?
- Complex task requiring deep analysis?
- Underpowered model selected?
- Network issues?

**Solutions:**

**1. Use Faster Model:**
```bash
# Switch to Haiku (fastest)
mariecoder -m claude-3-5-haiku "simple task"

# Or configure in setup
mariecoder --setup
# Select: claude-3-5-haiku for plan mode
```

**2. Limit Workspace Scope:**
```bash
# Only process specific directory
mariecoder -w ./src/components "refactor Button component"

# Instead of entire project
mariecoder "refactor Button component"  # Scans everything
```

**3. Reduce Context:**
```bash
# Clear old history
$ mariecoder
> history
> history delete <id>

# Or use fresh session
mariecoder "new task"  # Don't resume old tasks
```

**4. Check Network:**
```bash
# Test API connectivity
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-haiku-20241022","max_tokens":10,"messages":[{"role":"user","content":"Hi"}]}'
```

---

### Configuration Issues

#### Problem: Settings not taking effect

**Check Precedence:**
```bash
# Remember: Flags > Config File > Environment > Defaults

# If you set config but it's ignored:
mariecoder --config  # Shows effective config

# Check if you're using flags that override:
mariecoder -p anthropic  # This overrides config.json provider!
```

#### Problem: Can't find config file

**Solution:**
```bash
# Config should be at:
ls -la ~/.mariecoder/cli/

# If missing:
mariecoder --setup  # Creates config

# If corrupted:
mariecoder --reset-config  # Reset to defaults
```

#### Problem: Setup wizard keeps asking for input

**Solution:**
```bash
# Ensure you complete all steps
mariecoder --setup

# If it keeps looping:
rm -rf ~/.mariecoder/cli/config.json
mariecoder --setup
```

---

### Workspace Issues

#### Problem: "Permission denied" when accessing files

**Solution:**
```bash
# Check workspace permissions
ls -la /path/to/workspace

# Fix if needed
chmod -R u+rw /path/to/workspace

# Or use sudo (not recommended)
sudo mariecoder -w /protected/path
```

#### Problem: Changes not being saved

**Solution:**
```bash
# Check if workspace is correct
pwd  # Where am I?
mariecoder --verbose "test write"  # See what workspace is used

# Specify explicit workspace
mariecoder -w $(pwd) "make changes"
```

---

### Common Error Messages

#### "Cannot find module 'X'"

**Solution:**
```bash
# Reinstall dependencies
cd /path/to/mariecoder
npm install

# Or reinstall globally
npm uninstall -g mariecoder
npm install -g mariecoder
```

#### "Context limit exceeded"

**Solution:**
```bash
# Task is too complex, break it down
mariecoder "Step 1: Analyze the problem"
mariecoder "Step 2: Implement solution"

# Or start fresh (triggers auto-condense)
```

#### "Model not found"

**Solution:**
```bash
# Check available models
mariecoder --setup
# View model list

# Use correct model ID
mariecoder -m "claude-sonnet-4-5-20250929"  # Correct
# Not: "claude-4" or "sonnet-4.5"  # Wrong
```

---

### Getting More Help

#### Enable Verbose Logging

```bash
# See detailed logs
mariecoder --verbose "your task"

# Logs show:
# - API calls
# - MCP communications
# - File operations
# - Error stack traces
```

#### Check Logs

```bash
# Extension logs (if using VS Code)
# View > Output > Select "MarieCoder" from dropdown

# System logs
tail -f ~/.mariecoder/logs/cli.log  # If logging is enabled
```

#### Report Issue

Before reporting, collect this information:

```bash
# 1. Version
mariecoder --version

# 2. Configuration (mask API key!)
mariecoder --config | sed 's/sk-[^ ]*/sk-XXXXXXXX/g'

# 3. Verbose output
mariecoder --verbose "reproduce issue" 2>&1 | tee error.log

# 4. System info
uname -a
node --version
npm --version
```

Then open an issue at: https://github.com/CardSorting/MarieCoder/issues

---

## 🆘 Getting Help

### Documentation

- **Full Docs:** `mariecoder --help`
- **Interactive Help:** Type `help` in interactive mode
- **Online Docs:** https://github.com/CardSorting/MarieCoder

### Community

- **Discord:** https://discord.gg/VPxMugw2g9
- **Issues:** https://github.com/CardSorting/MarieCoder/issues
- **Discussions:** https://github.com/CardSorting/MarieCoder/discussions

### Reporting Issues

```bash
# Include this information:
mariecoder --version          # Version number
mariecoder --config           # Configuration (mask API key!)
mariecoder --verbose "task"   # Verbose output of issue
```

---

## 🎯 Keyboard Shortcuts

While in interactive mode:

- **Ctrl+C** - Interrupt current task
- **Ctrl+D** - Exit interactive mode (same as 'exit')
- **↑/↓** - Navigate command history (if supported by terminal)
- **Tab** - Command completion (future feature)

---

## 🔄 What's New (v1.1.0)

### ✅ Completed Features (4/12)

#### 1. Plan/Act Mode Switching
- Toggle between review (plan) and execute (act) modes
- Separate model configuration for each mode
- Cost optimization with different models
- Interactive `mode` command
- Enhanced safety for critical operations

#### 2. MCP Integration
- Automatic MCP server initialization
- Real-time server status monitoring
- Access to tools and resources from MCP servers
- Graceful error handling and reconnection
- Consistent with VS Code extension

#### 3. Enhanced Task History
- Complete task lifecycle management
- Export tasks as markdown
- Resume previous tasks
- Search task history
- View detailed task information
- Clean up old tasks

#### 4. Advanced Context Management
- Automatic context window monitoring
- Smart context condensing
- Better handling of large projects
- Seamless long conversations

### 🚀 Improved
- ⚡ **Faster startup** - Dynamic imports for better performance
- 🎨 **Better UX** - Improved command organization and help
- 📝 **Enhanced setup** - Interactive wizard with more options
- 🔧 **More control** - Expanded configuration options
- 📊 **Better visibility** - Status displays for MCP and config
- 🛡️ **More secure** - Proper permissions for secrets file

### ⏳ Coming Soon (Phase 2 & 3)

**Priority 1 (Next):**
- Terminal output management and limits
- Improved diff viewing with syntax highlighting
- Line-by-line approval for changes

**Priority 2:**
- Slash commands (`/search`, `/replace`, `/analyze`)
- Mentions system (`@file:`, `@url:`, `@folder:`)
- Checkpoints for save/restore

**Priority 3:**
- Focus chain display
- Workflow templates
- Browser automation (Playwright)

### 📊 Progress Summary

- **Total Features Planned:** 12
- **Completed:** 4 (33%)
- **In Progress:** 0
- **Remaining:** 8 (67%)

**Phase 1 (Core Features):** 4/4 ✅ Complete  
**Phase 2 (Enhanced UX):** 0/4 ⏳ Planned  
**Phase 3 (Advanced):** 0/4 ⏳ Planned

---

## 📋 Quick Reference Cheat Sheet

### Most Common Commands

```bash
# Setup and Configuration
mariecoder --setup              # Initial setup wizard
mariecoder --config             # Show current configuration
mariecoder --reset-config       # Reset to defaults

# Running Tasks
mariecoder                      # Start interactive mode
mariecoder "task description"   # Run single task
mariecoder -w ./path "task"     # Specific workspace

# Interactive Mode
> mode                          # Toggle plan/act mode
> config                        # Show configuration
> history                       # View task history
> mcp                           # MCP server status
> help                          # Show help
> clear                         # Clear screen
> exit                          # Exit CLI

# Task History
> history                       # List tasks
> history export <id>           # Export to markdown
> history resume <id>           # Resume task
> history search "term"         # Search tasks
> history details <id>          # View details
> history delete <id>           # Delete task

# MCP
> mcp                           # Server status
> mcp tools                     # List available tools
```

### Common Flags

```bash
# Provider and Model
-p, --provider <name>           # anthropic, openrouter, lmstudio
-m, --model <id>                # Model identifier
-k, --api-key <key>             # API key

# Workspace and Execution
-w, --workspace <path>          # Workspace directory
-y, --auto-approve              # Auto-approve all actions
--verbose                       # Detailed logging

# Configuration
-t, --temperature <n>           # Temperature (0.0-1.0)
--max-tokens <n>                # Maximum tokens
```

### Configuration File Locations

```bash
~/.mariecoder/cli/config.json   # Main configuration
~/.mariecoder/cli/secrets.json  # API keys (secure)
.clinerules/                    # Project rules (in workspace)
```

### Environment Variables

```bash
# API Keys
ANTHROPIC_API_KEY               # Anthropic API key
OPENAI_API_KEY                  # OpenAI API key
OPENROUTER_API_KEY              # OpenRouter API key
MARIE_API_KEY                   # Generic key

# Configuration
MARIE_PROVIDER                  # Default provider
MARIE_MODEL                     # Default model
MARIE_TEMPERATURE               # Default temperature
MARIE_MAX_TOKENS                # Default max tokens
```

### Typical Workflows

**First-Time Setup:**
```bash
1. mariecoder --setup
2. Configure API key and provider
3. Choose default model
4. Set plan/act preferences
5. mariecoder "start coding"
```

**Daily Usage:**
```bash
# Quick task
mariecoder "add logging to authentication module"

# Interactive session
mariecoder
> Create a REST API endpoint
> history export <id>
> exit
```

**Reviewing Past Work:**
```bash
mariecoder
> history
> history details task_abc123
> history export task_abc123
> history resume task_abc123
```

**Troubleshooting:**
```bash
# Check configuration
mariecoder --config

# Verbose mode for debugging
mariecoder --verbose "reproduce issue"

# Reset everything
mariecoder --reset-config
mariecoder --setup
```

### Quick Tips

1. **Use plan mode** for critical changes
2. **Use act mode** for routine tasks
3. **Export important tasks** for documentation
4. **Clean up history** regularly
5. **Check MCP status** if tools aren't working
6. **Specify workspace** for large projects
7. **Use verbose mode** only for debugging
8. **Set up .clinerules** for consistent code quality

---

## 🎉 Success Stories

### Common Use Cases

**"I used MarieCoder CLI to..."**

- ✅ Refactor 50+ files in minutes with plan mode review
- ✅ Generate comprehensive test suites with 90% coverage
- ✅ Migrate from one framework to another systematically
- ✅ Debug complex issues with AI pair programming
- ✅ Document entire codebases automatically
- ✅ Set up CI/CD pipelines from scratch
- ✅ Optimize performance bottlenecks
- ✅ Implement security best practices

### Tips from Power Users

1. **Use .clinerules religiously** - Ensures consistent code quality
2. **Export key tasks** - Great for team knowledge sharing
3. **Separate models** - Save money with plan/act optimization
4. **MCP for databases** - Query and modify data directly
5. **Resume interrupted tasks** - Never lose progress
6. **Verbose for learning** - See how AI thinks
7. **Auto-approve cautiously** - Only for trusted operations
8. **Search history** - Find solutions to similar problems

---

**Happy Coding!** 🚀

> *"Code with confidence, iterate with speed, maintain with care."*

---

**Resources:**
- 📖 Full Documentation: https://github.com/CardSorting/MarieCoder
- 💬 Discord Community: https://discord.gg/VPxMugw2g9
- 🐛 Report Issues: https://github.com/CardSorting/MarieCoder/issues
- 💡 Discussions: https://github.com/CardSorting/MarieCoder/discussions

**Made with ❤️ by the MarieCoder community**

---

*Last updated: October 11, 2025*  
*Document version: 1.1.0*  
*CLI version: 1.1.0*

