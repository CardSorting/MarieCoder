# Webview-UI Refactoring Overview

> **Goal**: Break down large monolithic files (1000+ lines) into smaller, maintainable, single-responsibility modules following MarieCoder development standards.

---

## 📊 Identified Monolithic Files

| Priority | File | Lines | Status | Phase |
|----------|------|-------|--------|-------|
| 🔴 Critical | `ChatRow.tsx` | 1,466 | Not Started | [Phase 1](./phase-1-chatrow.md) |
| 🟡 High | `HistoryView.tsx` | 844 | Not Started | [Phase 2](./phase-2-historyview.md) |
| 🟡 High | `BrowserSessionRow.tsx` | 649 | Not Started | [Phase 3](./phase-3-browsersessionrow.md) |
| 🟡 High | `OpenRouterModelPicker.tsx` | 606 | Not Started | [Phase 4](./phase-4-openroutermodelpicker.md) |
| ⚠️ Cleanup | `ExtensionStateContext.old.tsx` | 707 | Not Started | [Cleanup Tasks](./cleanup-tasks.md) |

---

## 🎯 Refactoring Principles

Following MarieCoder standards, each refactoring phase should:

### 1. **Observe & Learn**
- Understand why the code exists in its current form
- Identify what problems it solves
- Document patterns and friction points

### 2. **Plan with Intention**
- Design clear module boundaries
- Use descriptive, self-documenting names (snake_case for files)
- Maintain type safety throughout

### 3. **Evolve Gradually**
- Extract small, testable pieces first
- Keep the original working during extraction
- Validate each step before proceeding

### 4. **Release with Gratitude**
- Remove old code only after new implementation is stable
- Document lessons learned in commit messages
- Update imports systematically

---

## 📋 Execution Order

### **Phase 1: ChatRow.tsx** (Priority: Critical)
- **Estimated Effort**: 3-4 sessions
- **Impact**: Highest - Core message rendering component
- **Dependencies**: None
- [View Phase 1 Details →](./phase-1-chatrow.md)

### **Phase 2: HistoryView.tsx** (Priority: High)
- **Estimated Effort**: 2-3 sessions
- **Impact**: High - Task history management
- **Dependencies**: None
- [View Phase 2 Details →](./phase-2-historyview.md)

### **Phase 3: BrowserSessionRow.tsx** (Priority: High)
- **Estimated Effort**: 2-3 sessions
- **Impact**: Medium-High - Browser interaction display
- **Dependencies**: ChatRow patterns (learn from Phase 1)
- [View Phase 3 Details →](./phase-3-browsersessionrow.md)

### **Phase 4: OpenRouterModelPicker.tsx** (Priority: Medium)
- **Estimated Effort**: 2 sessions
- **Impact**: Medium - Model selection UI
- **Dependencies**: None
- [View Phase 4 Details →](./phase-4-openroutermodelpicker.md)

### **Cleanup Tasks** (Priority: Low)
- **Estimated Effort**: 1 session
- **Impact**: Code hygiene - Remove legacy code
- **Dependencies**: Verify no usage
- [View Cleanup Tasks →](./cleanup-tasks.md)

---

## 🔄 Common Refactoring Patterns

### Component Extraction Pattern
```typescript
// Before: Monolithic component with multiple responsibilities
export const LargeComponent = () => {
  // 1000+ lines of mixed concerns
}

// After: Focused components with clear boundaries
export const LargeComponent = () => {
  return (
    <>
      <ComponentHeader />
      <ComponentContent />
      <ComponentActions />
    </>
  )
}
```

### Hook Extraction Pattern
```typescript
// Extract complex logic into custom hooks
export const useComponentLogic = () => {
  // Encapsulate state management, effects, callbacks
  return { state, actions }
}
```

### Utility Module Pattern
```typescript
// Extract pure functions into utility modules
// File: component_name_utils.ts
export const formatData = (data: Data): FormattedData => { }
export const validateInput = (input: Input): boolean => { }
```

---

## 📁 Proposed Directory Structure

```
components/
├── chat/
│   ├── ChatRow.tsx                    # Main component (reduced)
│   ├── chat_row/                      # Extracted modules
│   │   ├── message_types/             # Type-specific renderers
│   │   │   ├── tool_message_renderer.tsx
│   │   │   ├── command_message_renderer.tsx
│   │   │   ├── api_message_renderer.tsx
│   │   │   └── mcp_message_renderer.tsx
│   │   ├── components/                # Reusable UI pieces
│   │   │   ├── QuoteButton.tsx
│   │   │   ├── ProgressIndicator.tsx
│   │   │   └── MessageHeader.tsx
│   │   ├── hooks/                     # Custom hooks
│   │   │   ├── use_quote_selection.ts
│   │   │   └── use_message_state.ts
│   │   └── utils/                     # Pure functions
│   │       ├── message_utils.ts
│   │       └── style_constants.ts
```

---

## ✅ Success Criteria

Each phase is complete when:

- [ ] Original functionality preserved 100%
- [ ] All extracted files use snake_case naming
- [ ] No single file exceeds 400 lines
- [ ] Type safety maintained throughout
- [ ] All imports updated
- [ ] No linter errors
- [ ] Commit message documents lessons learned

---

## 🚀 Getting Started

1. Read the [Phase 1 details](./phase-1-chatrow.md)
2. Create a new branch for Phase 1: `refactor/phase-1-chatrow`
3. Follow the step-by-step extraction plan
4. Test thoroughly before moving to Phase 2
5. Document any deviations or discoveries

---

## 📝 Progress Tracking

Update this section as phases complete:

- [ ] Phase 1: ChatRow.tsx
- [ ] Phase 2: HistoryView.tsx
- [ ] Phase 3: BrowserSessionRow.tsx
- [ ] Phase 4: OpenRouterModelPicker.tsx
- [ ] Cleanup: Remove legacy files

---

*Last Updated: 2025-10-11*

