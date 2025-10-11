# Webview-UI Refactoring Documentation

Welcome to the MarieCoder webview-ui refactoring project. This directory contains actionable plans to break down large monolithic files into maintainable, focused modules.

---

## 📚 Documentation Structure

| Document | Description |
|----------|-------------|
| **[00-overview.md](./00-overview.md)** | Project overview, priorities, and execution strategy |
| **[phase-1-chatrow.md](./phase-1-chatrow.md)** | Refactor ChatRow.tsx (1,466 lines) → ~150 lines |
| **[phase-2-historyview.md](./phase-2-historyview.md)** | Refactor HistoryView.tsx (844 lines) → ~150 lines |
| **[phase-3-browsersessionrow.md](./phase-3-browsersessionrow.md)** | Refactor BrowserSessionRow.tsx (649 lines) → ~150 lines |
| **[phase-4-openroutermodelpicker.md](./phase-4-openroutermodelpicker.md)** | Refactor OpenRouterModelPicker.tsx (606 lines) → ~150 lines |
| **[cleanup-tasks.md](./cleanup-tasks.md)** | Remove legacy files and technical debt |

---

## 🚀 Quick Start

### For First-Time Contributors

1. **Read the overview**: Start with [00-overview.md](./00-overview.md) to understand the philosophy and approach
2. **Choose a phase**: Pick a phase based on priority and your expertise
3. **Create a branch**: Use naming convention `refactor/phase-N-component-name`
4. **Follow the plan**: Each phase document has step-by-step instructions
5. **Test thoroughly**: Validate after each step
6. **Commit with care**: Use descriptive commit messages documenting lessons learned

### For Experienced Contributors

Jump directly to your chosen phase document. All phases are independent and can be executed in parallel by different developers.

---

## 🎯 Project Goals

### Primary Objectives
- ✅ Break down files over 1000 lines into manageable modules
- ✅ Follow MarieCoder development standards
- ✅ Maintain 100% functionality throughout
- ✅ Use snake_case naming for all files
- ✅ Keep no single file over 400 lines

### Success Metrics
- All monolithic files refactored
- No single file exceeds 400 lines
- All tests passing
- No regression in functionality
- Improved code maintainability score

---

## 📊 Current Status

### Overall Progress: 0% Complete

| Phase | Component | Status | Lines Before | Target Lines | Assignee | Branch |
|-------|-----------|--------|--------------|--------------|----------|--------|
| 1 | ChatRow | 🔴 Not Started | 1,466 | ~150 | - | - |
| 2 | HistoryView | 🔴 Not Started | 844 | ~150 | - | - |
| 3 | BrowserSessionRow | 🔴 Not Started | 649 | ~150 | - | - |
| 4 | OpenRouterModelPicker | 🔴 Not Started | 606 | ~150 | - | - |
| 5 | Cleanup Tasks | 🔴 Not Started | - | - | - | - |

**Legend**: 🔴 Not Started | 🟡 In Progress | 🟢 Complete

---

## 🏗️ Development Workflow

### 1. Before Starting

```bash
# Update your local repository
git checkout main
git pull origin main

# Create a feature branch
git checkout -b refactor/phase-1-chatrow
```

### 2. During Development

- Follow the step-by-step plan in the phase document
- Test after each extraction step
- Commit frequently with descriptive messages
- Keep the original file working during extraction

### 3. Commit Message Format

```
refactor(component): brief description

Detailed explanation of what was extracted and why.

Lessons applied:
- Lesson 1
- Lesson 2

Affected files:
- Created: path/to/new/file.ts
- Modified: path/to/existing/file.tsx
```

### 4. Before Submitting

```bash
# Run type checking
npm run typecheck

# Run linter
npm run lint

# Run tests
npm test

# Build the project
npm run build
```

All checks must pass ✅

---

## 🧪 Testing Strategy

### Manual Testing
Each phase document includes a comprehensive manual testing checklist. Test all scenarios before moving to the next step.

### Automated Testing
- Run existing test suite after each phase
- Add new tests for extracted modules
- Ensure no regression in test coverage

### Visual Testing
- Verify UI renders correctly
- Test all interactive features
- Check responsive behavior
- Validate in both light and dark themes

---

## 🎓 Learning Resources

### MarieCoder Standards
Review the project's development standards before starting:
- Located in workspace rules (`.clinerules`)
- Focus on:
  - snake_case file naming
  - Type safety requirements
  - Error handling patterns
  - Commit message format

### Refactoring Patterns
Common patterns used across all phases:
- **Component Extraction**: Break large components into smaller, focused ones
- **Hook Extraction**: Move complex logic into custom hooks
- **Utility Extraction**: Extract pure functions into utility modules
- **Style Constants**: Centralize inline styles

---

## ❓ FAQ

### Q: Can I work on multiple phases simultaneously?
**A:** Yes! Phases are independent and can be executed in parallel. However, learning from Phase 1 patterns may help with later phases.

### Q: What if I find additional issues during refactoring?
**A:** Create a separate issue/ticket for unrelated issues. Focus on the current phase's scope to avoid scope creep.

### Q: Should I update tests while refactoring?
**A:** Yes, but prioritize maintaining existing functionality. Add new tests for extracted modules, but the primary goal is preserving behavior.

### Q: What if the plan doesn't work for a particular step?
**A:** Document the deviation in your commit message and update the phase document with lessons learned. The plans are guidelines, not strict rules.

### Q: How do I handle merge conflicts?
**A:** Since phases are independent, conflicts should be minimal. If conflicts occur, prioritize preserving functionality and consult the team.

---

## 🤝 Getting Help

### Questions or Issues?
- Review the [00-overview.md](./00-overview.md) for general guidance
- Check the specific phase document for detailed steps
- Review MarieCoder development standards
- Ask team members for clarification

### Found a Bug in the Plan?
- Update the relevant phase document
- Document the correction in your commit
- Consider if the change affects other phases

---

## 📈 Progress Tracking

Update this section as phases complete:

### Completed Phases
- [ ] None yet

### In Progress
- [ ] None yet

### Lessons Learned
_Document key insights as phases complete_

---

## 🎉 Celebration Points

### Milestones
- 🎯 Phase 1 Complete (ChatRow refactored)
- 🎯 Phase 2 Complete (HistoryView refactored)
- 🎯 Phase 3 Complete (BrowserSessionRow refactored)
- 🎯 Phase 4 Complete (OpenRouterModelPicker refactored)
- 🎯 Cleanup Complete (Legacy files removed)
- 🎯 All Phases Complete (Codebase modernized!)

---

## 📝 Changelog

### 2025-10-11
- Created refactoring documentation structure
- Defined 4 major phases + cleanup tasks
- Established success criteria and workflow

---

*"Refactoring is not about perfection—it's about intentional, compassionate improvement."*

---

**Next Steps**: Read [00-overview.md](./00-overview.md) to begin your refactoring journey.

