# MarieCoder CLI - Feature Enhancement Plan

> Bringing the feature-rich extension experience to the command-line interface

## Overview

This document outlines the plan to bring MarieCoder's full feature set from the extension to the CLI, ensuring a seamless AI agent coding experience across both interfaces.

## Current Status

### ✅ Already Implemented
- [x] Basic task execution and lifecycle management
- [x] Setup wizard with interactive configuration
- [x] Multi-provider API support (Anthropic, OpenRouter, LM Studio, custom endpoints)
- [x] Configuration management (file-based, environment variables, CLI args)
- [x] Interactive and single-task modes
- [x] Basic approval system for commands and file operations
- [x] .clinerules support (automatic loading and enabling)
- [x] Task monitoring and progress tracking
- [x] Workspace context initialization
- [x] Basic error handling and validation

### 🚧 Features to Implement

## Priority 1: Core Features (Essential for Production)

### 1. MCP (Model Context Protocol) Integration
**Status:** Not Implemented  
**Priority:** Critical  
**Estimated Effort:** 2-3 hours

**What:** Enable MCP servers, tools, and resources in CLI mode
- Load and initialize MCP servers from configuration
- Support MCP tool calls and resource access
- Interactive MCP server setup in CLI
- MCP marketplace integration (optional)

**Implementation:**
- Leverage existing `McpHub` and `McpCoordinator` from extension
- Create `cli_mcp_manager.ts` for CLI-specific MCP handling
- Add MCP server configuration to setup wizard
- Display MCP operations in CLI-friendly format

**Benefits:**
- Extends CLI capabilities through MCP servers
- Access to file systems, databases, APIs via MCP
- Consistent tool ecosystem with extension

### 2. Plan/Act Mode Switching
**Status:** Not Implemented  
**Priority:** Critical  
**Estimated Effort:** 1-2 hours

**What:** Support plan and act modes with separate model configurations
- Toggle between plan (review) and act (execute) modes
- Configure separate models for each mode
- Interactive mode switching during task execution
- Persistent mode preferences

**Implementation:**
- Add mode toggle command in interactive mode
- Update configuration to support plan/act model settings
- Enhance task monitor to show current mode
- Add mode-specific approval flows

**Benefits:**
- Better control over AI actions
- Cost optimization (use cheaper models for planning)
- Enhanced safety for sensitive operations

### 3. Advanced Context Management
**Status:** Partially Implemented  
**Priority:** High  
**Estimated Effort:** 2-3 hours

**What:** Advanced context window optimization and auto-condensation
- Auto-condense context when approaching limits
- Context window utilization metrics
- Smart file reading with optimization
- Context history tracking

**Implementation:**
- Integrate `context_manager.ts` with CLI
- Add context metrics to verbose output
- Configure auto-condense thresholds in settings
- Display context usage warnings

**Benefits:**
- Handle larger projects effectively
- Reduce token usage and costs
- Better conversation continuity

### 4. Enhanced Terminal Integration
**Status:** Basic Implementation  
**Priority:** High  
**Estimated Effort:** 1-2 hours

**What:** Advanced terminal features for CLI
- Shell integration support
- Terminal output line limits
- Terminal session reuse
- Background command execution monitoring

**Implementation:**
- Enhance `cli_task_monitor.ts` with terminal tracking
- Add output limiting and truncation
- Implement terminal session management
- Support for long-running commands

**Benefits:**
- Better resource management
- Cleaner output in long sessions
- Improved command execution tracking

## Priority 2: User Experience Enhancements

### 5. Improved Diff Viewing
**Status:** Basic Implementation  
**Priority:** Medium  
**Estimated Effort:** 2-3 hours

**What:** Better diff visualization and approval in CLI
- Syntax-highlighted diffs (using terminal colors)
- Side-by-side diff view option
- Line-by-line diff approval
- Diff summary statistics

**Implementation:**
- Enhance `cli_diff_provider.ts` with color support
- Add diff statistics (additions, deletions, files changed)
- Interactive diff review mode
- Integration with git diff if available

**Benefits:**
- Easier code review in CLI
- Better understanding of changes
- Reduced errors from unreviewed edits

### 6. Task History Management
**Status:** Basic Implementation  
**Priority:** Medium  
**Estimated Effort:** 1-2 hours

**What:** Enhanced task history viewing and management
- List recent tasks with summaries
- Resume/continue previous tasks
- Export task history as markdown
- Search task history

**Implementation:**
- Add `--history` flag to list tasks
- Add `--resume <task-id>` for continuing tasks
- Add `--export <task-id>` for markdown export
- Create CLI-friendly task history viewer

**Benefits:**
- Better task continuity
- Easy task documentation export
- Improved workflow tracking

### 7. Slash Commands
**Status:** Not Implemented  
**Priority:** Medium  
**Estimated Effort:** 2-3 hours

**What:** Support for slash commands in CLI prompts
- `/search <query>` - Search codebase
- `/replace <pattern> <replacement>` - Bulk replacements
- `/analyze <file>` - Analyze specific files
- `/mcp <server>` - MCP operations
- `/checkpoint` - Create/restore checkpoints

**Implementation:**
- Create `cli_slash_commands.ts` handler
- Parse slash commands from user input
- Integrate with existing slash command registry
- Add command completion hints

**Benefits:**
- Faster common operations
- Consistent with extension UX
- Power user productivity boost

## Priority 3: Advanced Features

### 8. Checkpoints System
**Status:** Not Implemented  
**Priority:** Medium-Low  
**Estimated Effort:** 2-3 hours

**What:** Save and restore task states at checkpoints
- Auto-checkpoints at key task stages
- Manual checkpoint creation
- List and restore from checkpoints
- Checkpoint cleanup management

**Implementation:**
- Leverage existing checkpoint infrastructure
- Add `--checkpoint` commands
- Integrate with task state management
- CLI-friendly checkpoint listing

**Benefits:**
- Recover from errors easily
- Experiment safely with rollback
- Resume complex tasks mid-stream

### 9. Focus Chain Support
**Status:** Not Implemented  
**Priority:** Low  
**Estimated Effort:** 1-2 hours

**What:** Structured multi-step task execution
- Display focus chain checklist
- Track progress through focus chain
- Focus-chain-aware task execution

**Implementation:**
- Integrate focus chain display in CLI output
- Track and display progress
- Optional focus chain configuration

**Benefits:**
- Better structured task execution
- Clearer progress tracking for complex tasks

### 10. Mentions System
**Status:** Not Implemented  
**Priority:** Low  
**Estimated Effort:** 2-3 hours

**What:** Reference files, URLs, and context using @ mentions
- `@file:path/to/file` - Reference specific files
- `@url:https://...` - Include URL content
- `@folder:path/` - Reference folder contents
- Auto-completion for file paths

**Implementation:**
- Parse mentions from user input
- Resolve mentions to actual content
- Integrate with context management
- Display resolved mentions clearly

**Benefits:**
- Easier context specification
- Consistent with extension UX
- Reduced manual file reading

### 11. Workflow Support
**Status:** Not Implemented  
**Priority:** Low  
**Estimated Effort:** 2-3 hours

**What:** Pre-defined task sequences and workflows
- Create and save workflows
- Execute workflows by name
- Workflow templates (e.g., "new feature", "bug fix")
- Workflow variables and customization

**Implementation:**
- Create workflow definition format
- Workflow storage in .mariecoder/workflows/
- Workflow executor integrated with task system
- Template library

**Benefits:**
- Automate common task patterns
- Team standardization
- Faster iteration on repetitive tasks

### 12. Browser Automation
**Status:** Not Implemented  
**Priority:** Low (specialized use case)  
**Estimated Effort:** 2-3 hours

**What:** Playwright browser automation in CLI
- Launch browser sessions
- Execute browser commands
- Capture screenshots
- Web scraping and testing

**Implementation:**
- Integrate Playwright in headless mode
- CLI-specific browser interaction handlers
- Screenshot/content output to console
- Browser session management

**Benefits:**
- Web testing automation
- Web scraping capabilities
- End-to-end testing from CLI

## Implementation Strategy

### Phase 1: Core Features (Week 1)
1. MCP Integration ✅
2. Plan/Act Mode ✅
3. Advanced Context Management ✅
4. Enhanced Terminal Integration ✅

### Phase 2: UX Enhancements (Week 2)
5. Improved Diff Viewing ✅
6. Task History Management ✅
7. Slash Commands ✅

### Phase 3: Advanced Features (Week 3)
8. Checkpoints System ✅
9. Focus Chain Support ✅
10. Mentions System ✅
11. Workflow Support ✅
12. Browser Automation (if time permits) ✅

## Technical Approach

### Design Principles
1. **Reuse Extension Code**: Leverage existing controllers and coordinators
2. **CLI-Native UX**: Adapt features for terminal interaction
3. **Non-Blocking**: Keep CLI responsive during long operations
4. **Progressive Enhancement**: Each feature is optional and independently useful
5. **Backwards Compatible**: New features don't break existing workflows

### Key Patterns
- **Coordinators**: Use existing coordinators for business logic
- **CLI Adapters**: Create CLI-specific adapters for user interaction
- **Event-Driven**: Subscribe to controller events for updates
- **Graceful Degradation**: Features work without full configuration

### Testing Strategy
- Test each feature independently
- Integration tests for feature combinations
- Real-world usage scenarios
- Performance testing for large projects

## Configuration Extensions

### New Configuration Keys
```typescript
interface EnhancedCliConfiguration {
  // Existing...
  
  // MCP
  mcpServers?: McpServerConfig[]
  mcpMarketplaceEnabled?: boolean
  
  // Plan/Act Mode
  planModeApiProvider?: string
  planModeApiModel?: string
  actModeApiProvider?: string
  actModeApiModel?: string
  currentMode?: "plan" | "act"
  
  // Context Management
  autoCondenseEnabled?: boolean
  autoCondenseThreshold?: number
  
  // Terminal
  terminalOutputLineLimit?: number
  terminalReuseEnabled?: boolean
  shellIntegrationTimeout?: number
  
  // History
  taskHistoryLimit?: number
  
  // Workflows
  defaultWorkflow?: string
  workflowsEnabled?: boolean
}
```

## Success Metrics

- [ ] All Priority 1 features implemented and tested
- [ ] CLI achieves feature parity with extension core features
- [ ] Performance remains acceptable (<2s startup, <100ms response)
- [ ] Documentation updated with new features
- [ ] User feedback collected and incorporated

## Next Steps

1. ✅ Complete this planning document
2. Update TODO list with implementation tasks
3. Begin Phase 1 implementation (MCP Integration)
4. Create feature-specific implementation docs as needed
5. Regular testing and user feedback collection

---

**Document Status:** Living Document  
**Last Updated:** 2025-10-11  
**Owner:** MarieCoder Development Team

