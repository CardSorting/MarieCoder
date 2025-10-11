# Base Component System - Quick Reference

> 🌸 *A cheat sheet for creating and refactoring system prompt components*

## 📋 TL;DR

```typescript
import { createComponent, CommonVariables, CommonConditions } from "./base_component"

export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: MY_TEMPLATE,
  // Optional:
  buildVariables: (context) => ({ VAR: "value" }),
  shouldInclude: (context) => true,
})
```

## 🎯 Common Patterns

### Pattern 1: Simple Static Template
```typescript
const MY_TEMPLATE = `Content here...`

export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: MY_TEMPLATE,
})
```

### Pattern 2: Dynamic Template (uses context)
```typescript
const getMyTemplate = (context: SystemPromptContext) => 
  `Content with ${context.something}...`

export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: getMyTemplate,
})
```

### Pattern 3: Template with Variables
```typescript
const MY_TEMPLATE = `Content {{VAR1}} more {{VAR2}}...`

export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: MY_TEMPLATE,
  buildVariables: (context) => ({
    VAR1: context.something || "default",
    VAR2: calculateSomething(context),
  }),
})
```

### Pattern 4: Conditional Inclusion
```typescript
export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: MY_TEMPLATE,
  shouldInclude: (context) => context.featureEnabled === true,
})
```

### Pattern 5: Async Variable Building
```typescript
export const getMySection = createComponent({
  section: SystemPromptSection.MY_SECTION,
  defaultTemplate: MY_TEMPLATE,
  buildVariables: async (context) => {
    const data = await fetchSomething(context)
    return { DATA: formatData(data) }
  },
})
```

### Pattern 6: Complex Logic (use resolveComponent)
```typescript
import { resolveComponent } from "./base_component"

export async function getMySection(variant, context) {
  // Your custom logic here
  const customValue = doComplexThing(context)
  const conditionalValue = context.flag ? "yes" : "no"
  
  return resolveComponent({
    section: SystemPromptSection.MY_SECTION,
    defaultTemplate: MY_TEMPLATE,
    buildVariables: () => ({
      CUSTOM: customValue,
      CONDITIONAL: conditionalValue,
    }),
  }, variant, context)
}
```

## 🛠️ Utilities

### CommonVariables

```typescript
import { CommonVariables } from "./base_component"

// Current working directory
CommonVariables.cwd(context)
// → "/path/to/workspace"

// Browser support (with fallback)
CommonVariables.browserSupport(context, "Browser available", "Not available")
// → "Browser available" or "Not available"

// YOLO mode conditional
CommonVariables.yoloMode(context, "When enabled", "When disabled")
// → "When enabled" or "When disabled"

// Focus chain status
CommonVariables.focusChainEnabled(context)
// → true or false
```

### CommonConditions

```typescript
import { CommonConditions } from "./base_component"

// Only include if focus chain enabled
shouldInclude: CommonConditions.requiresFocusChain

// Only include if has content
shouldInclude: (context) => CommonConditions.hasContent(myString)

// Only include if array has items
shouldInclude: (context) => CommonConditions.hasItems(myArray)

// Combine conditions
shouldInclude: (context) => 
  CommonConditions.requiresFocusChain(context) && 
  CommonConditions.hasContent(context.something)
```

## 🔄 Migration Checklist

Refactoring an existing component? Follow these steps:

- [ ] **Read the old code** - understand what it does
- [ ] **Identify the pattern** - simple, variables, conditional, complex?
- [ ] **Choose approach** - createComponent or resolveComponent?
- [ ] **Extract domain logic** - keep helper functions separate
- [ ] **Build config object** - section, template, variables, conditions
- [ ] **Remove old imports** - no more TemplateEngine, etc.
- [ ] **Add base imports** - createComponent, utilities as needed
- [ ] **Test the output** - verify no functionality changes
- [ ] **Clean up** - remove unnecessary code

## 📐 Decision Tree

```
Need to refactor a component?
│
├─ Is it just a template with no variables?
│  └─> Pattern 1: Simple Static Template
│
├─ Does template need context values inline?
│  └─> Pattern 2: Dynamic Template
│
├─ Does template use {{VARIABLES}}?
│  └─> Pattern 3: Template with Variables
│
├─ Should it only show conditionally?
│  └─> Pattern 4: Conditional Inclusion
│
├─ Need to fetch data asynchronously?
│  └─> Pattern 5: Async Variable Building
│
└─ Has complex custom logic?
   └─> Pattern 6: Complex Logic (resolveComponent)
```

## ✨ Tips & Best Practices

### DO ✅

```typescript
// DO: Keep template content separate and clear
const MY_TEMPLATE = `Clear content here`
export const getMySection = createComponent({ ... })

// DO: Use CommonVariables for standard patterns
buildVariables: (context) => ({
  CWD: CommonVariables.cwd(context),
})

// DO: Keep domain logic in separate functions
function formatMyData(data) { ... }
buildVariables: (context) => ({
  DATA: formatMyData(context.data),
})

// DO: Use descriptive variable names in templates
const TEMPLATE = `The {{USER_NAME}} is...`
```

### DON'T ❌

```typescript
// DON'T: Inline everything
export const getMySection = createComponent({
  defaultTemplate: `Huge template ${context.thing}...`,
  buildVariables: (context) => ({
    X: context.a ? "yes" : context.b ? "maybe" : "no",
  }),
})

// DON'T: Recreate utility logic
buildVariables: (context) => ({
  CWD: context.cwd || process.cwd(), // Use CommonVariables.cwd!
})

// DON'T: Mix concerns
function getMySection(variant, context) {
  doSomeUnrelatedThing() // Keep side effects separate
  return createComponent({ ... })
}
```

## 🎓 Examples from Real Components

### agent_identity.ts (Simple)
```typescript
const AGENT_ROLE = "You are Marie..."

export const getAgentRoleSection = createComponent({
  section: SystemPromptSection.AGENT_ROLE,
  defaultTemplate: AGENT_ROLE,
})
```

### task_progress.ts (Conditional)
```typescript
export const getTaskProgressSection = createComponent({
  section: SystemPromptSection.TASK_PROGRESS,
  defaultTemplate: TASK_PROGRESS_TEMPLATE_TEXT,
  shouldInclude: CommonConditions.requiresFocusChain,
})
```

### tools_and_capabilities.ts (With Variables)
```typescript
export const getToolUseSection = createComponent({
  section: SystemPromptSection.TOOL_USE,
  defaultTemplate: TOOL_USE_TEMPLATE_TEXT,
  buildVariables: (context) => ({
    BROWSER_TOOLS: CommonVariables.browserSupport(
      context, 
      "\n- `browser_action` - Interact with web pages"
    ),
    CWD: CommonVariables.cwd(context),
  }),
})
```

## 🐛 Troubleshooting

### "My variables aren't being replaced"
- Check template uses `{{VARIABLE_NAME}}` format
- Verify `buildVariables` returns object with matching keys
- Ensure variable names are uppercase by convention

### "Section not showing up"
- Check `shouldInclude` condition
- Verify variant overrides aren't hiding it
- Look for `undefined` return in logs

### "Template function not working"
- Functions can be used for `defaultTemplate`
- But they receive context, not variant
- Use `buildVariables` if you need variant info

### "Async not working"
- `buildVariables` can be async
- `shouldInclude` can be async
- Component function is already async

## 📚 See Also

- `REFACTORING_PLAN.md` - Detailed migration guide
- `CONSOLIDATION_SUMMARY.md` - Overview and benefits
- `_REFACTORING_EXAMPLES.ts` - Complete examples
- `base_component.ts` - Source code with JSDoc

---

**Remember**: This system is about clarity and compassion. If something feels unclear, that's feedback for improving the system, not a failure on your part. Ask questions, iterate, and trust the process. 🙏

