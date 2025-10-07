# Core Prompts - Clear & Simple Structure

This directory contains core prompt utilities with **self-explanatory names** following the NORMIE DEV methodology.

## 📁 File Overview

| File | Purpose |
|------|---------|
| `command_responses.ts` | Command-specific response templates for new task, condense, and other commands |
| `context_summarization.ts` | Context management and conversation summarization utilities |
| `mcp_server_guide.ts` | MCP server creation guide and documentation loader |
| `response_formatters.ts` | Response formatting utilities and error handling |

## 🎯 Design Principles

### **Self-Explanatory Names**
- Every file name clearly describes what it does
- No abbreviations or cryptic names
- Easy to understand at a glance

### **Single Responsibility**
- Each file has one clear purpose
- No overlapping functionality
- Easy to maintain and modify

### **NORMIE DEV Methodology**
- **Does this spark joy?** → Clear, understandable names spark joy
- **Can we DELETE legacy?** → Deleted cryptic, confusing names
- **Is this the simplest solution?** → Yes, descriptive names are simplest

## 📊 Key Improvements Applied

### **Before (Confusing):**
```
commands.ts              ← What commands?
contextManagement.ts     ← What kind of management?
loadMcpDocumentation.ts  ← Too verbose
responses.ts             ← What kind of responses?
```

### **After (Crystal Clear):**
```
command_responses.ts     ← Response templates for commands
context_summarization.ts ← Context summarization utilities
mcp_server_guide.ts      ← Guide for creating MCP servers
response_formatters.ts   ← Response formatting utilities
```

## 🚀 Usage

Each file exports utilities for specific prompt functionality:

```typescript
import { newTaskToolResponse } from './command_responses'
import { summarizeTask } from './context_summarization'
import { loadMcpDocumentation } from './mcp_server_guide'
import { formatResponse } from './response_formatters'

// Use specific utilities
const newTaskPrompt = newTaskToolResponse()
const summaryPrompt = summarizeTask(focusChainSettings)
const mcpGuide = await loadMcpDocumentation(mcpHub)
const errorResponse = formatResponse.toolError("Something went wrong")
```

## 🎉 Benefits

- **Zero Mental Load** - Names tell you exactly what each file does
- **Easy Navigation** - No guessing about file contents
- **Simple Maintenance** - Clear structure makes changes obvious
- **Self-Documenting** - File names serve as documentation

---

**Remember**: If it doesn't spark joy and make development easier, simplify it or delete it.
