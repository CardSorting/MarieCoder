# MarieCoder CLI - Directory Structure

This document explains the logical organization of the CLI codebase.

## 📁 Directory Structure

```
/src/cli/
├── index.ts                     # Main entry point for the CLI
│
├── /core/                       # Core functionality and context
│   ├── context.ts              # CLI context (simulates VSCode ExtensionContext)
│   └── constants.ts            # CLI constants (timeouts, limits, etc.)
│
├── /config/                     # Configuration management
│   ├── config_manager.ts       # Configuration loading, saving, validation
│   └── setup_wizard.ts         # Interactive setup wizard
│
├── /ui/                         # User interface and display
│   ├── /output/                # Output and formatting
│   │   ├── output.ts           # Main output manager
│   │   ├── output_buffer.ts    # Buffered output
│   │   ├── terminal_colors.ts  # Color utilities and ANSI codes
│   │   ├── terminal_state.ts   # Terminal state management
│   │   └── message_formatter.ts # Message formatting utilities
│   ├── /components/            # UI components
│   │   ├── advanced_ui.ts      # Advanced UI components
│   │   ├── animations.ts       # Animation utilities
│   │   ├── data_visualization.ts # Charts, tables, sparklines
│   │   ├── interactive_components.ts # Interactive UI elements
│   │   └── layout_helpers.ts   # Layout utilities
│   └── /feedback/              # User feedback and progress
│       ├── enhanced_feedback.ts # Live activity monitors, metrics
│       ├── enhanced_progress.ts # Enhanced progress bars
│       ├── fluid_experience.ts # Fluid UI transitions
│       ├── immersive_experience.ts # Splash screens, tutorials
│       └── progressive_renderer.ts # Progressive rendering
│
├── /commands/                   # Command handling
│   ├── slash_commands.ts       # Slash command parser and executor
│   ├── interaction_handler.ts  # User interaction and approval handling
│   └── mentions_parser.ts      # @mention parsing and resolution
│
├── /tasks/                      # Task management
│   ├── task_monitor.ts         # Task monitoring and progress
│   ├── workflow_manager.ts     # Workflow orchestration
│   ├── task_history_manager.ts # Task history and resumption
│   ├── checkpoint_integration.ts # Checkpoint support
│   └── focus_chain_manager.ts  # Focus chain visualization
│
├── /terminal/                   # Terminal management
│   ├── terminal_manager.ts     # Terminal creation and management
│   └── stream_handler.ts       # Streaming output handler
│
├── /monitoring/                 # Progress and monitoring
│   └── progress_manager.ts     # Progress bar management
│
├── /infrastructure/             # Core infrastructure
│   ├── logger.ts               # Logging system
│   ├── cancellation.ts         # Cancellation token management
│   ├── connection_pool.ts      # API connection pooling
│   ├── console_proxy.ts        # Console output proxy
│   ├── error_boundary.ts       # Error boundary handling
│   └── request_deduplicator.ts # Request deduplication
│
├── /providers/                  # Provider implementations
│   ├── webview_provider.ts     # Webview provider for CLI
│   ├── diff_provider.ts        # Diff view provider
│   ├── host_bridge.ts          # Host bridge client
│   └── mcp_manager.ts          # MCP (Model Context Protocol) manager
│
├── /shims/                      # Compatibility shims
│   ├── vscode_shim.ts          # VSCode API shim for CLI
│   └── import_meta_shim.js     # import.meta shim
│
├── /__tests__/                  # Test files
│   ├── config_manager.test.ts
│   ├── constants.test.ts
│   ├── interaction_handler.test.ts
│   ├── task_monitor.test.ts
│   └── terminal_colors.test.ts
│
└── CLI_ENHANCEMENTS_USAGE.md   # Usage guide for CLI enhancements
```

## 🎯 Design Principles

This structure follows the **MarieCoder Development Standards**:

1. **Feature-based Organization** - Files are grouped by feature/domain rather than technical type
2. **Separation of Concerns** - Clear boundaries between different responsibilities
3. **Self-documenting Names** - Files use descriptive names without abbreviations
4. **Logical Hierarchy** - Related functionality is nested appropriately

## 📝 Naming Conventions

- **Files**: `snake_case.ts` (e.g., `config_manager.ts`)
- **No Prefixes**: Removed `cli_` prefix since all files are in the CLI directory
- **Descriptive**: Names clearly indicate purpose (e.g., `task_monitor.ts`, not `monitor.ts`)

## 🔗 Import Paths

When importing from within the CLI directory:

```typescript
// From root level (index.ts)
import { output } from './ui/output/output'
import { CliContext } from './core/context'

// From subdirectory (e.g., tasks/task_monitor.ts)
import { output } from '../ui/output/output'
import { TIMEOUTS } from '../core/constants'

// From deeper subdirectory (e.g., ui/components/data_visualization.ts)
import { TerminalColors } from '../output/terminal_colors'
```

## 🏗️ Key Components

### Core
- **context.ts**: Simulates VSCode's ExtensionContext for CLI environment
- **constants.ts**: Centralized constants for timeouts, limits, and configuration

### Configuration
- **config_manager.ts**: Manages CLI configuration with secure API key storage
- **setup_wizard.ts**: Interactive wizard for first-time setup

### UI
- **output/**: Core output formatting and terminal color utilities
- **components/**: Reusable UI components (tables, animations, etc.)
- **feedback/**: Progress indicators and user feedback systems

### Commands
- **slash_commands.ts**: Handles `/search`, `/analyze`, etc.
- **interaction_handler.ts**: Manages user approval prompts
- **mentions_parser.ts**: Resolves `@file:`, `@url:`, `@folder:` mentions

### Tasks
- **task_monitor.ts**: Monitors task execution and handles streaming updates
- **workflow_manager.ts**: Orchestrates complex multi-step workflows
- **task_history_manager.ts**: Tracks and resumes previous tasks

## 🔧 Building

```bash
# Build production CLI
npm run cli:build

# Development build with watch mode
npm run cli:watch

# Run CLI directly
npm run cli
```

## 📚 Documentation

- [CLI Enhancements Usage Guide](./CLI_ENHANCEMENTS_USAGE.md)
- [MarieCoder Development Standards](../../.cursor/rules)

## 🎨 Philosophy

This structure embodies the **KonMari principles** applied to code:

> *"I honor the code before me. I learn from every pattern. I refactor not as criticism, but evolution. I write for clarity."*

Each file has a clear purpose and location. Related functionality lives together. The structure grows naturally with the codebase.

---

**Last Updated**: October 15, 2025  
**Maintained with**: ❤️ and KonMari Principles

