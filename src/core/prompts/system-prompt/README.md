# System Prompt Directory - Clear & Simple Structure

This directory contains the system prompt architecture with **self-explanatory names** following the MARIECODER methodology.

## 📁 Directory Overview

| Directory | Purpose |
|-----------|---------|
| `components/` | Prompt component implementations (agent role, rules, tools, etc.) |
| `registry/` | Prompt management and building system |
| `shared/` | Shared utilities and model configurations |
| `templates/` | Template engine and section definitions |
| `tools/` | All tool implementations with descriptive names |
| `variants/` | Model-specific prompt variants and configurations |
| `__tests__/` | Test files and snapshots |

## 🎯 Design Principles

### **Self-Explanatory Names**
- Every file name clearly describes what it does
- No abbreviations or cryptic names
- Easy to understand at a glance

### **Single Responsibility**
- Each component has one clear purpose
- No overlapping functionality
- Easy to maintain and modify

### **Flat Structure Where Possible**
- Minimal unnecessary subdirectories
- Clear navigation paths
- Zero navigation complexity

### **MARIECODER Methodology**
- **Does this spark joy?** → Clear, understandable names spark joy
- **Can we DELETE legacy?** → Deleted cryptic, confusing names
- **Is this the simplest solution?** → Yes, descriptive names are simplest

## 📊 Key Improvements Applied

### **Before (Confusing):**
```
PromptRegistry.ts          ← What does this do?
enhanced-variant-builder.ts ← What is "enhanced"?
template-optimization-service.ts ← Too many words
ask_followup_question.ts   ← Underscore confusion
```

### **After (Crystal Clear):**
```
prompt_manager.ts          ← Manages prompts
variant_builder.ts         ← Builds variants
template_optimizer.ts      ← Optimizes templates
ask_user_questions.ts      ← Asks user questions
```

## 🚀 Component Structure

### **Components Directory**
- `agent_planning_modes.ts` - ACT vs PLAN mode instructions
- `agent_role.ts` - Agent identity and role
- `available_tools.ts` - Available tools and capabilities
- `environment_context.ts` - System environment info
- `external_servers.ts` - MCP server integration
- `file_operations.ts` - File editing guidelines
- `mission_statement.ts` - Core mission and objectives
- `progress_tracking.ts` - Task progress management
- `rules.ts` - MARIECODER methodology rules
- `task_tracking.ts` - Automatic todo list management
- `tool_use.ts` - Tool usage instructions
- `user_guidance.ts` - User instruction handling
- `user_support.ts` - User feedback and support

### **Registry Directory**
- `prompt_manager.ts` - Main prompt registry and management
- `prompt_builder.ts` - Prompt building logic
- `tool_sets.ts` - Tool set definitions

### **Shared Directory**
- `model_configurations.ts` - Model family configurations
- `variant_builder.ts` - Variant building utilities
- `template_optimizer.ts` - Template optimization service
- `tool_organizer.ts` - Tool organization service
- `shared_utils.ts` - Common utilities
- `validation_utils.ts` - Validation utilities
- `variant_configurator.ts` - Variant configuration service

### **Templates Directory**
- `section_definitions.ts` - Prompt section definitions
- `template_engine.ts` - Template processing engine

### **Tools Directory**
- `mcp_resource_access.ts` - Access MCP server resources
- `ask_user_questions.ts` - Ask follow-up questions
- `task_completion.ts` - Complete and present tasks
- `web_browser_actions.ts` - Browser automation
- `command_execution.ts` - Execute CLI commands
- `focus_tracking.ts` - Focus chain management
- `code_definitions.ts` - List code definitions
- `file_listing.ts` - List files and directories
- `mcp_documentation.ts` - Load MCP documentation
- `task_creation.ts` - Create new tasks
- `planning_responses.ts` - Plan mode responses
- `file_reading.ts` - Read file contents
- `file_editing.ts` - Edit existing files
- `file_searching.ts` - Search file contents
- `mcp_tool_usage.ts` - Use MCP tools
- `web_requests.ts` - Make web requests
- `file_writing.ts` - Write new files

### **Variants Directory**
- `generic/` - Generic model variant
- `gpt-5/` - GPT-5 specific variant
- `next-gen/` - Next-gen model variant
- `xs/` - Compact model variant
- `configuration_template.ts` - Configuration template
- `variant_builder.ts` - Variant building utilities
- `variant_validator.ts` - Variant validation utilities

## 🎉 Benefits

- **Zero Mental Load** - Names tell you exactly what each file does
- **Easy Navigation** - No guessing about file contents
- **Simple Maintenance** - Clear structure makes changes obvious
- **Self-Documenting** - File names serve as documentation
- **Consistent Naming** - All files follow the same naming pattern

## 🔧 Usage

Each component exports functions that generate the appropriate prompt sections:

```typescript
import { getRulesSection } from './components/rules'
import { getToolUseSection } from './components/tool_use'
import { PromptRegistry } from './registry/prompt_manager'

// Use in system prompt generation
const registry = PromptRegistry.getInstance()
const prompt = await registry.get(context)
```

---

**Remember**: If it doesn't spark joy and make development easier, simplify it or delete it.