# Rules Refactor Quick Guide

> **TL;DR**: Move methodology rules from system prompt to `.clinerules/`, keep only operational rules in system prompt.

---

## 🎯 The Problem

```
BEFORE (Current State):
┌────────────────────────────────────┐
│   System Prompt (rules.ts)        │
│                                    │
│   • KonMari Philosophy ──┐         │
│   • Naming Standards     │         │
│   • Type Safety Rules    │ DUPLICATED!
│   • Architecture         │         │
│   • Performance          │         │
│   • Operational Rules    │         │
└──────────────────────────┼─────────┘
                           │
┌──────────────────────────┼─────────┐
│   .clinerules/           │         │
│                          │         │
│   • KonMari Philosophy ──┘         │
│   • Naming Standards               │
│   • Type Safety Rules              │
│   • Architecture                   │
│   • Performance                    │
└────────────────────────────────────┘

ISSUES:
❌ 166 lines of rules in system prompt
❌ ~500-700 tokens per message
❌ Duplication = confusion
❌ Two sources of truth
```

---

## ✅ The Solution

```
AFTER (Proposed State):
┌────────────────────────────────────┐
│   System Prompt (rules.ts)        │
│                                    │
│   • Operational Rules (40 lines)  │
│     - CWD behavior                 │
│     - Tool usage patterns          │
│     - Communication style          │
│     - Browser automation           │
│   • Reference to .clinerules/ ──┐  │
└──────────────────────────────────┼─┘
                                   │
┌──────────────────────────────────┼─┐
│   .clinerules/                   │ │
│                                  ← REFERENCED
│   • KonMari Philosophy            │
│   • Naming Standards              │
│   • Type Safety Rules             │
│   • Architecture                  │
│   • Performance                   │
└───────────────────────────────────┘

BENEFITS:
✅ ~40 lines of rules in system prompt (75% reduction)
✅ ~80-100 tokens per message (saves 400-600 tokens)
✅ Single source of truth
✅ Clear separation of concerns
```

---

## 📋 What Goes Where?

### ✅ Keep in System Prompt (Operational)

```markdown
## How the agent OPERATES

- **Environment**: CWD behavior, no ~ or $HOME
- **File Operations**: Automatic directory creation
- **Communication**: Don't over-ask, use tools
- **Response Style**: Be direct, skip filler
- **Tool Usage**: Wait for confirmations
- **Browser**: Automation workflow
- **YOLO Mode**: Question-asking rules
```

### ✅ Move to .clinerules/ (Methodological)

```markdown
## How the agent WRITES CODE

- **Philosophy**: KonMari-inspired development
- **Naming**: snake_case files, clear variables
- **Type Safety**: No casual `any`, validate inputs
- **Architecture**: Separation of concerns, composition
- **Performance**: <100ms operations, <50ms queries
- **Quality**: Checklists, testing standards
- **Workflows**: New features, refactoring, bug fixes
```

---

## 🔧 Implementation Checklist

### Phase 1: Refactor Code

- [ ] Open `src/core/prompts/system-prompt/components/rules.ts`
- [ ] Remove lines 11-79 (`CORE_METHODOLOGY_RULES`)
- [ ] Remove lines 119-166 (`IMPLEMENTATION_PATTERNS_RULES`)
- [ ] Keep lines 84-114 (`TECHNICAL_IMPLEMENTATION_RULES`) but extract only operational parts
- [ ] Add new `OPERATIONAL_RULES` constant (see analysis doc)
- [ ] Add new `PROJECT_RULES_REFERENCE` constant (see analysis doc)
- [ ] Update `RULES_TEMPLATE` (lines 218-224)
- [ ] Keep `CONTEXT_SPECIFIC_RULES` unchanged (lines 171-179)

### Phase 2: Verify Setup

- [ ] Confirm `.clinerules/konmari-method.md` exists ✅ (already created)
- [ ] Confirm it contains all methodology rules ✅
- [ ] Confirm it's git-tracked (not ignored) ✅

### Phase 3: Test

- [ ] Run tests: `npm test -- src/core/prompts/system-prompt/__tests__`
- [ ] Update snapshots: `npm test -- -u`
- [ ] Review snapshot diffs (rules section should be shorter)
- [ ] Build extension: `npm run build`
- [ ] Load in VSCode/Cursor
- [ ] Start conversation, verify KonMari standards followed
- [ ] Check Rules popover shows `.clinerules/`

### Phase 4: Document

- [ ] Update `src/core/prompts/README.md`
- [ ] Update `src/core/prompts/system-prompt/README.md`
- [ ] Add note to `CONTRIBUTING.md` about `.clinerules/`

---

## 📝 Commit Message Template

```
refactor: Separate operational and methodological rules

Previous system embedded all rules in system prompt.
Evolved to use .clinerules/ for methodology standards.

Lessons applied:
- Clear separation of concerns (operational vs. methodological)
- Token efficiency (reduced rules section by ~75%)
- Single source of truth for standards
- Flexibility for per-project customization

Changes:
- Refactored components/rules.ts to contain only operational rules
- Added PROJECT_RULES_REFERENCE pointing to .clinerules/
- Removed duplicated KonMari methodology from system prompt
- Updated tests and snapshots to reflect new structure

Impact:
- Token savings: ~400-600 tokens per message
- Rules section: 166 lines → 40 lines (75% reduction)
- No functional changes to agent behavior
```

---

## 🎨 Visual: Rules Flow

```
┌──────────────────────────────────────────────────────┐
│              USER SENDS MESSAGE                      │
└─────────────────┬────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│         PromptRegistry.get(context)                  │
└─────────────────┬────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│           PromptBuilder.build()                      │
│                                                      │
│   1. buildComponents()                               │
│      ├─ getRulesSection() ──→ OPERATIONAL_RULES     │
│      │                     └→ PROJECT_RULES_REF      │
│      ├─ getToolsSection()                            │
│      └─ ... other components                         │
│                                                      │
│   2. preparePlaceholders()                           │
│                                                      │
│   3. TemplateEngine.resolve()                        │
│                                                      │
│   4. postProcess()                                   │
└─────────────────┬────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│          SYSTEM PROMPT READY                         │
│                                                      │
│   RULES (40 lines)                                   │
│   • Operational requirements                         │
│   • Reference: See .clinerules/ for standards       │
└──────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│         CLINE LOADS .clinerules/                     │
│                                                      │
│   • konmari-method.md (257 lines)                    │
│   • Naming, type safety, architecture, etc.          │
└──────────────────────────────────────────────────────┘
                  │
                  ▼
┌──────────────────────────────────────────────────────┐
│         AI RECEIVES COMPLETE CONTEXT                 │
│                                                      │
│   System Prompt: How to operate                      │
│   + .clinerules/: How to write code                  │
│   = Full guidance, no duplication                    │
└──────────────────────────────────────────────────────┘
```

---

## 💡 Key Insights

### 1. Why This Matters

**Token costs compound**:
- 500 extra tokens × 100 messages = 50,000 tokens wasted
- At scale (1000s of users), this is significant cost

**Clarity matters**:
- Developers need to know WHERE to update rules
- Two sources of truth = bugs waiting to happen

### 2. Why This is Safe

**Non-breaking change**:
- `.clinerules/` already loaded by Cline separately
- We're just removing duplication, not changing behavior
- Tests will confirm agent still follows standards

**Reversible**:
- Git history preserves old approach
- Can revert if issues arise

### 3. Why This is Better

**Separation of Concerns**:
- System prompt = Environment operations
- Project rules = Code methodology
- Each has single responsibility

**Team Flexibility**:
- Different projects can have different `.clinerules/`
- System prompt stays consistent across all projects
- Toggle rules via UI as needed

---

## 🚀 Quick Start (5 Minutes)

```bash
# 1. Create branch
git checkout -b refactor/system-prompt-rules-separation

# 2. Open the file
code src/core/prompts/system-prompt/components/rules.ts

# 3. Copy the new implementation from SYSTEM_PROMPT_IMPROVEMENT_ANALYSIS.md
#    (See "Refactored rules.ts Structure" section)

# 4. Replace the entire file content

# 5. Run tests
npm test -- src/core/prompts/system-prompt/__tests__

# 6. Update snapshots
npm test -- -u

# 7. Review changes
git diff

# 8. Commit
git add .
git commit -F- <<EOF
refactor: Separate operational and methodological rules

Previous system embedded all rules in system prompt.
Evolved to use .clinerules/ for methodology standards.

Lessons applied:
- Clear separation of concerns
- Token efficiency (75% reduction)
- Single source of truth
- Flexibility for projects
EOF
```

---

## ❓ FAQ

### Q: Will this change agent behavior?

**A**: No. The agent still receives the same rules:
- Operational rules via system prompt
- Methodology rules via `.clinerules/`
- Just no longer duplicated

### Q: What if .clinerules/ doesn't exist?

**A**: The `PROJECT_RULES_REFERENCE` still provides guidance:
- Points agent to look for `.clinerules/`
- Explains what should be there
- Agent can still operate (just won't have methodology standards)

### Q: Do we need to update all variants?

**A**: No. The refactor is in `components/rules.ts`, which is used by all variants through the component system.

### Q: What about backward compatibility?

**A**: Fully backward compatible:
- Existing conversations still work
- New conversations use new structure
- `.clinerules/` system already exists and working

---

## 🎯 Success Criteria

- ✅ System prompt rules section < 50 lines
- ✅ No duplication between system prompt and `.clinerules/`
- ✅ All tests pass
- ✅ Agent follows KonMari standards in testing
- ✅ Clear documentation of change
- ✅ Token savings measurable (~400-600 per message)

---

*Remember: This isn't about perfection—it's about intentional, compassionate improvement.* 🙏

