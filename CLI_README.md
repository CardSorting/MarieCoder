# MarieCoder CLI - Standalone Command-Line Interface

> **AI coding assistant for your terminal** - All the power of MarieCoder without VSCode

## 🚀 Quick Start

### Installation

#### From Source
```bash
# Clone the repository
git clone https://github.com/CardSorting/MarieCoder.git
cd MarieCoder

# Install dependencies
npm install

# Build the CLI
npm run cli:build

# Run it
npm run cli
```

#### Via NPM (Coming Soon)
```bash
npm install -g mariecoder-cli
mariecoder --help
```

### First Run

```bash
# Set your API key (required)
export ANTHROPIC_API_KEY="your-api-key-here"

# Run in interactive mode
mariecoder

# Or execute a single task
mariecoder "Create a React component for a todo list"
```

## 📖 Usage

### Interactive Mode

Start an interactive session where you can have continuous conversations:

```bash
mariecoder
```

This opens an interactive prompt where you can:
- Execute multiple tasks in sequence
- Get immediate feedback
- Iterate on solutions
- Type `exit` or `quit` to end the session

### Single Task Mode

Execute a single task and exit:

```bash
mariecoder "Your task description here"
```

### Examples

```bash
# Create a new component
mariecoder "Create a React component for a user profile card with avatar and bio"

# Fix code issues
mariecoder "Add error handling to the API calls in auth.ts"

# Refactor code
mariecoder "Refactor the user service to use async/await instead of promises"

# Add tests
mariecoder "Add unit tests for the authentication module"

# Documentation
mariecoder "Add JSDoc comments to all exported functions in utils.ts"
```

## ⚙️ Configuration

### Command-Line Options

```
mariecoder [options] <prompt>

OPTIONS:
  -h, --help                        Show help message
  -v, --version                     Show version
  -w, --workspace <path>            Workspace directory (default: current directory)
  -m, --model <model>               AI model to use
  -k, --api-key <key>               API key for the AI provider
  -p, --provider <provider>         AI provider (anthropic, openai, openrouter)
  -t, --temperature <temp>          Temperature (0.0 - 1.0)
  --max-tokens <number>             Maximum tokens for responses
  -y, --auto-approve                Auto-approve all actions (use with caution!)
  --verbose                         Show detailed logging
```

### Environment Variables

Set these in your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
# API Keys
export ANTHROPIC_API_KEY="sk-ant-..."
export OPENAI_API_KEY="sk-..."
export OPENROUTER_API_KEY="sk-..."

# Or use a generic key
export MARIE_API_KEY="your-key"
```

### Configuration File

Settings are stored in `~/.mariecoder/cli/state.json`:

```json
{
  "apiProvider": "anthropic",
  "apiModelId": "claude-3-5-sonnet-20241022",
  "apiKey": "your-api-key",
  "temperature": 0.7,
  "maxTokens": 4096
}
```

## 🎯 Common Use Cases

### 1. Starting a New Project

```bash
cd my-new-project
mariecoder "Initialize a TypeScript Node.js project with Express and testing setup"
```

### 2. Adding Features

```bash
mariecoder "Add user authentication with JWT tokens"
```

### 3. Debugging

```bash
mariecoder "Fix the TypeError in getUserById - the function is not handling null values"
```

### 4. Code Review

```bash
mariecoder "Review the code in src/api/ and suggest improvements"
```

### 5. Refactoring

```bash
mariecoder "Extract the validation logic into reusable utility functions"
```

### 6. Testing

```bash
mariecoder "Add integration tests for the REST API endpoints"
```

## 🔧 How It Works

MarieCoder CLI provides the same powerful AI coding capabilities as the VSCode extension, but in your terminal:

1. **Reads your workspace** - Understands your project structure and code
2. **Plans the approach** - Breaks down tasks into steps
3. **Executes tools** - Creates files, runs commands, makes edits
4. **Asks for approval** - You review and approve each action
5. **Iterates** - Continues until the task is complete

### Tool Approvals

The CLI will ask for your approval before:
- Creating or modifying files
- Executing terminal commands
- Making multiple related changes

Example:
```
🔧 Tool Execution Request: write_to_file
────────────────────────────────────────────────────────────────
  path: src/components/TodoList.tsx
  content: import React from 'react'...
────────────────────────────────────────────────────────────────
Approve this action? [Y/n]:
```

### Auto-Approve Mode

For trusted workflows, use auto-approve mode:

```bash
mariecoder -y "Run the test suite and fix any failing tests"
```

⚠️ **Warning**: This executes all actions without confirmation. Use carefully!

## 🎨 Model Selection

### Anthropic Claude (Default)

```bash
# Use Claude 3.5 Sonnet (recommended)
mariecoder -m claude-3-5-sonnet-20241022 "Your task"

# Use Claude 3 Opus (more capable, slower)
mariecoder -m claude-3-opus-20240229 "Your task"

# Use Claude 3 Haiku (faster, cheaper)
mariecoder -m claude-3-haiku-20240307 "Your task"
```

### OpenAI

```bash
mariecoder -p openai -m gpt-4 -k "sk-..." "Your task"
```

### OpenRouter

```bash
mariecoder -p openrouter -m "anthropic/claude-3.5-sonnet" "Your task"
```

## 📊 Workspace Support

The CLI works with any workspace:

```bash
# Use current directory
mariecoder "Your task"

# Specify workspace
mariecoder -w /path/to/project "Your task"

# Multiple projects
cd project1 && mariecoder "Task 1"
cd ../project2 && mariecoder "Task 2"
```

### Cline Rules Integration

The CLI automatically loads and applies `.clinerules` from your workspace, just like the VSCode extension:

```bash
# Create a .clinerules directory in your project
mkdir .clinerules

# Add your coding standards
echo "# Project Standards

## Naming Conventions
- Use snake_case for file names
- Use camelCase for variables

## Code Style  
- Use TypeScript strict mode
- Add JSDoc to all exports" > .clinerules/standards.md
```

**What are Cline Rules?**
- Project-specific coding standards and conventions
- Automatically applied to all AI interactions
- Help maintain consistency across your codebase
- Loaded by default - no configuration needed

**Rule Locations:**
- **Local Rules**: `.clinerules/` in your workspace (project-specific)
- **Global Rules**: `~/Documents/Cline/Rules/` (apply to all projects)

The CLI will inform you when rules are loaded:
```
✓ Loaded 3 local rule files from .clinerules/
```

For more details, see the [Cline Rules documentation](https://docs.getcline.com/features/cline-rules).

## 🔐 Security & Privacy

- **API Keys**: Stored securely in `~/.mariecoder/cli/secrets.json` (not tracked in git)
- **Code Privacy**: Your code is sent to the AI provider you choose
- **Command Approval**: All commands require approval (unless using `-y`)
- **No Telemetry**: The CLI doesn't send usage data anywhere

### Privacy Levels

1. **Cloud AI** (Anthropic, OpenAI): Code sent to AI provider
2. **Local AI** (Ollama): Coming soon - run everything locally
3. **Hybrid**: Use local models for sensitive code, cloud for general tasks

## 🐛 Troubleshooting

### CLI Not Found

```bash
# Make sure it's built
npm run cli:build

# Run directly
npm run cli
```

### API Key Issues

```bash
# Check if key is set
echo $ANTHROPIC_API_KEY

# Set it temporarily
ANTHROPIC_API_KEY="sk-..." mariecoder "Your task"

# Or pass via flag
mariecoder -k "sk-..." "Your task"
```

### Permission Errors

```bash
# Make the binary executable
chmod +x dist-cli/mariecoder.js
```

### Module Errors

```bash
# Rebuild dependencies
npm run clean:all
npm install
npm run cli:build
```

## 🚧 Current Limitations

The CLI is in early development. Some features from the VSCode extension are not yet available:

- ❌ Browser automation (coming soon)
- ❌ Visual diff view (terminal diffs only)
- ❌ MCP server integration (planned)
- ❌ Checkpoint system (planned)
- ❌ Task history UI (available as JSON)

## 🗺️ Roadmap

### v0.1 (Current)
- ✅ Basic CLI interface
- ✅ File operations
- ✅ Terminal commands
- ✅ Interactive mode
- ✅ Multi-provider support

### v0.2 (Planned)
- [ ] Enhanced diff viewing
- [ ] Task history management
- [ ] Browser automation
- [ ] MCP server support
- [ ] Checkpoint/restore

### v0.3 (Future)
- [ ] Local model support (Ollama)
- [ ] Plugin system
- [ ] Team collaboration features
- [ ] Advanced workflows

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Try it out** and report issues
2. **Suggest features** that would make it more useful
3. **Submit PRs** to improve the code
4. **Write docs** to help others

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## 📝 License

Apache 2.0 - See [LICENSE](LICENSE) for details.

Built with ❤️ by the MarieCoder community, based on [Cline](https://github.com/cline/cline).

## 🔗 Links

- **Documentation**: https://github.com/CardSorting/MarieCoder/docs
- **Issues**: https://github.com/CardSorting/MarieCoder/issues
- **Discord**: https://discord.gg/VPxMugw2g9
- **VSCode Extension**: Install from VS Code Marketplace

---

*Made with the spirit of Marie Curie - breaking barriers and making powerful tools accessible to everyone* ⚡

