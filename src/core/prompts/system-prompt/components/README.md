# System Prompt Components - Clear & Simple

This directory contains the system prompt components with **self-explanatory names** following the MARIECODER methodology.

## 📁 Component Overview

| File | Purpose |
|------|---------|
| `agent_planning_modes.ts` | ACT vs PLAN mode instructions - how the agent switches between planning and execution |
| `agent_role.ts` | Agent identity and role definition |
| `available_tools.ts` | Lists all available tools and capabilities |
| `environment_context.ts` | System environment information and context |
| `external_servers.ts` | MCP server integration and external tool connections |
| `file_operations.ts` | File editing guidelines (write_to_file, replace_in_file) |
| `mission_statement.ts` | Core mission, objectives, and MARIECODER methodology |
| `progress_tracking.ts` | Task progress management and tracking |
| `rules.ts` | MARIECODER methodology rules and quality standards |
| `task_tracking.ts` | Automatic todo list management |
| `tool_use.ts` | Tool usage instructions and examples |
| `user_guidance.ts` | User instruction handling and processing |
| `user_support.ts` | User feedback and support information |

## 🎯 Design Principles

### **Self-Explanatory Names**
- Every file name clearly describes what it does
- No abbreviations or cryptic names
- Easy to understand at a glance

### **Single Responsibility**
- Each component has one clear purpose
- No overlapping functionality
- Easy to maintain and modify

### **Flat Structure**
- No unnecessary subdirectories
- Everything in one place
- Zero navigation complexity

### **MARIECODER Methodology**
- **Does this spark joy?** → Clear, understandable names spark joy
- **Can we DELETE legacy?** → Deleted cryptic, confusing names
- **Is this the simplest solution?** → Yes, flat structure with descriptive names

## 🚀 Usage

Each component exports a function that generates the appropriate prompt section:

```typescript
import { getRulesSection } from './rules'
import { getToolUseSection } from './tool_use'

// Use in system prompt generation
const rules = await getRulesSection(variant, context)
const tools = await getToolUseSection(variant, context)
```

## 📊 Benefits

- **Zero Mental Load** - Names tell you exactly what each file does
- **Easy Navigation** - No guessing about file contents
- **Simple Maintenance** - Clear structure makes changes obvious
- **Self-Documenting** - File names serve as documentation

---

**Remember**: If it doesn't spark joy and make development easier, simplify it or delete it.