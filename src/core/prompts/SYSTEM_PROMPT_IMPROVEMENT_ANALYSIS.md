# System Prompt Improvement Analysis

> *Honoring what worked, learning from patterns, evolving with clarity*

## 🔍 Current State Observation

### What Purpose Does This Serve?

The current system prompt architecture in `src/core/prompts/system-prompt/` serves to provide AI agents with:
- **Identity & Role** - Who the agent is and what it does
- **Rules & Standards** - How to write code (KonMari methodology)
- **Tool Capabilities** - What actions the agent can take
- **Context Awareness** - Project-specific information

### What Has This Taught Us?

The current implementation revealed important lessons:

1. **Duplication Creates Confusion**
   - Rules are hardcoded in `components/rules.ts` (lines 11-166)
   - Same rules now exist in `.clinerules/konmari-method.md`
   - Which rules take precedence? Unclear to both AI and developers

2. **System Prompt Bloat**
   - KonMari philosophy repeated in full within system prompt
   - Increases token usage on every request
   - Makes system prompt harder to maintain

3. **Mixed Concerns**
   - `components/rules.ts` contains TWO types of rules:
     - **Philosophical/Development Rules** (KonMari methodology) ← Should be in `.clinerules/`
     - **Operational/Technical Rules** (CWD, tool usage) ← Should stay in system prompt

---

## 🎯 What Brings Clarity Now?

### Separation of Concerns

We need to distinguish between:

| **System Prompt Rules** (Operational) | **Project Rules** (Methodological) |
|--------------------------------------|-----------------------------------|
| ✅ How to use tools correctly | ✅ Code style standards (snake_case) |
| ✅ Current working directory behavior | ✅ Type safety requirements |
| ✅ MCP server communication | ✅ Architecture principles |
| ✅ Browser automation workflow | ✅ Performance benchmarks |
| ✅ Response formatting | ✅ Quality checklists |
| ✅ When to wait for user responses | ✅ KonMari philosophy |

**Rationale**: 
- **System Prompt** = "How the agent *operates* within this environment"
- **Project Rules** = "How the agent *writes code* for this project"

---

## 🏗️ Current Architecture (How It Works)

### Component Flow

```
PromptRegistry.get(context)
    ↓
PromptBuilder.build()
    ↓
1. buildComponents() - Calls each component function
    ↓
2. Component: getRulesSection(variant, context)
    ↓  
3. Resolves rules.ts templates with variables
    ↓
4. Returns FULL rules text (11-166 lines!)
    ↓
5. PromptBuilder.preparePlaceholders()
    ↓
6. TemplateEngine.resolve()
    ↓
7. Final system prompt with rules embedded
```

### Key Files

1. **`components/rules.ts`** (225 lines)
   - Contains hardcoded KonMari rules
   - Template variables: `{{CWD}}`, `{{BROWSER_RULES}}`, etc.
   - Function: `getRulesSection(variant, context)`

2. **`registry/prompt_manager.ts`** (PromptRegistry)
   - Loads all variants and components
   - Provides `get(context)` to build prompts
   - Handles model family fallbacks

3. **`registry/prompt_builder.ts`** (PromptBuilder)
   - Orchestrates component building
   - Resolves placeholders
   - Post-processes final prompt

4. **`components/base_component.ts`**
   - `resolveComponent()` - Unified template resolution
   - `createComponent()` - Higher-order component factory
   - `CommonVariables` & `CommonConditions` utilities

---

## 💡 Proposed Improvements

### Six-Step Evolution Process

#### 1. **OBSERVE** - What Exists

Current `rules.ts` contains:
- ✅ `CORE_METHODOLOGY_RULES` (11-79) - KonMari philosophy
- ✅ `TECHNICAL_IMPLEMENTATION_RULES` (84-114) - Mixed operational + methodology
- ✅ `IMPLEMENTATION_PATTERNS_RULES` (119-166) - Workflows and checklists
- ✅ `CONTEXT_SPECIFIC_RULES` (171-179) - Browser, YOLO mode settings

#### 2. **APPRECIATE** - What Problems It Solved

- ✅ Provided clear, consistent guidance to AI agents
- ✅ Embedded standards directly in every conversation
- ✅ Made KonMari methodology accessible without external files
- ✅ Worked well before `.clinerules/` system existed

#### 3. **LEARN** - What Wisdom Can We Extract?

**Lessons Applied**:
- **Token Efficiency**: Large rules in system prompt consume tokens on EVERY message
- **Maintainability**: Two sources of truth = double maintenance burden
- **Flexibility**: `.clinerules/` allows per-project customization without code changes
- **Clarity**: Operational rules (system) vs. methodological rules (project) need separation

#### 4. **EVOLVE** - Build Clearer Implementation

### Refactored `rules.ts` Structure

```typescript
/**
 * OPERATIONAL RULES - System-level requirements
 * 
 * These rules define HOW the agent operates within the environment.
 * They are NOT about coding standards - those belong in .clinerules/
 */
const OPERATIONAL_RULES = `## 🛠️ System Operations (Required)

### Environment - MUST Follow:
- **Current directory**: {{CWD}}
- **CANNOT \`cd\`** - Always operate from {{CWD}}, pass correct 'path' parameter to tools
- **NO ~ or $HOME** - Do not use these to refer to home directory
- **Check SYSTEM INFORMATION** before execute_command to ensure compatibility

### File Operations - MUST Follow:
- **New projects**: Organize in dedicated project directory (unless user specifies otherwise)
- **Automatic directory creation**: write_to_file creates necessary directories
- **Consider context**: Always check how/where code is used before modifying
- **Direct modifications**: Use replace_in_file or write_to_file with desired changes

### Communication - MUST Follow:
- **Don't over-ask**: Use tools to discover information instead of asking
- **{{YOLO_MODE_RULES}}** Example: User mentions Desktop file → use list_files to find it vs. asking for path
- **Assume success**: If no terminal output, assume command succeeded and proceed{{YOLO_MODE_TERMINAL_RULES}}
- **Goal**: Accomplish task efficiently, NOT engage in back-and-forth

{{BROWSER_RULES}}

### Response Style - MUST Follow:
- **Be direct**: Skip filler like "Great", "Certainly", "Okay", "Sure"
- **Provide clear results**: Complete tasks without prompting further conversation
- **Use vision capabilities**: Thoroughly examine images for meaningful information
- **Efficiency over dialogue**: Accomplish tasks, don't chat

### Tool Usage - MUST Follow:
- **CRITICAL**: Wait for user response after each tool use to confirm success{{BROWSER_WAIT_RULES}}
- **MCP operations**: Use one at a time, wait for confirmation before proceeding`

/**
 * PROJECT RULES REFERENCE - Points to .clinerules/
 */
const PROJECT_RULES_REFERENCE = `## 📋 Project Standards

This project uses **Cline Rules** for coding standards and methodology.

- **Location**: \`.clinerules/\` directory in project root
- **Active Rules**: All \`.md\` files in \`.clinerules/\` are automatically applied
- **Management**: Use the Rules popover UI in chat to toggle specific rules

The project rules cover:
- 📝 Naming conventions (snake_case files, clear variable names)
- 🔧 Type safety and quality requirements
- 🏗️ Architecture patterns and principles
- ⚡ Performance standards and benchmarks
- 🎯 Implementation workflows and checklists
- 🙏 KonMari-inspired development philosophy

**Note**: Always honor the project rules in \`.clinerules/\` when writing or modifying code.`

/**
 * Context-specific operational rules
 */
const CONTEXT_SPECIFIC_RULES = {
	browser: `- The user may ask generic non-development tasks, such as "what's the latest news" or "look up the weather in San Diego", in which case you might use the browser_action tool to complete the task if it makes sense to do so, rather than trying to create a website or using curl to answer the question. However, if an available MCP server tool or resource can be used instead, you should prefer to use it over browser_action.`,
	browserWait: ` Then if you want to test your work, you might use browser_action to launch the site, wait for the user's response confirming the site was launched along with a screenshot, then perhaps e.g., click a button to test functionality if needed, wait for the user's response confirming the button was clicked along with a screenshot of the new state, before finally closing the browser.`,
	yoloMode: `You are only allowed to ask the user questions using the ask_followup_question tool. Use this tool only when you need additional details to complete a task, and be sure to use a clear and concise question that will help you move forward with the task. However if you can use the available tools to avoid having to ask the user questions, you should do so`,
	yoloModeTerminal: ` If you absolutely need to see the actual terminal output, use the ask_followup_question tool to request the user to copy and paste it back to you.`,
}

/**
 * Rules Section - Focused on operations, references project rules
 */
export async function getRulesSection(variant: PromptVariant, context: SystemPromptContext): Promise<string> {
	// Determine context-specific rules
	const browserRules = context.supportsBrowserUse ? CONTEXT_SPECIFIC_RULES.browser : ""
	const browserWaitRules = context.supportsBrowserUse ? CONTEXT_SPECIFIC_RULES.browserWait : ""
	const yoloModeRules =
		context.yoloModeToggled !== true
			? CONTEXT_SPECIFIC_RULES.yoloMode
			: "Use your available tools and apply your best judgment to accomplish the task without asking the user any followup questions, making reasonable assumptions from the provided context"
	const yoloModeTerminalRules = context.yoloModeToggled !== true ? CONTEXT_SPECIFIC_RULES.yoloModeTerminal : ""

	const result = await resolveComponent(
		{
			section: SystemPromptSection.RULES,
			defaultTemplate: RULES_TEMPLATE,
			buildVariables: () => ({
				CWD: context.cwd || process.cwd(),
				BROWSER_RULES: browserRules,
				BROWSER_WAIT_RULES: browserWaitRules,
				YOLO_MODE_RULES: yoloModeRules,
				YOLO_MODE_TERMINAL_RULES: yoloModeTerminalRules,
				OPERATIONAL_RULES: OPERATIONAL_RULES,
				PROJECT_RULES_REFERENCE: PROJECT_RULES_REFERENCE,
			}),
		},
		variant,
		context,
	)
	return result ?? ""
}

/**
 * Rules template - Streamlined with clear separation
 */
const RULES_TEMPLATE = `RULES

{{OPERATIONAL_RULES}}

{{PROJECT_RULES_REFERENCE}}`
```

---

## 📊 Impact Analysis

### Before Refactor

```
System Prompt Rules Section: ~166 lines of rules
- CORE_METHODOLOGY_RULES: 69 lines
- TECHNICAL_IMPLEMENTATION_RULES: 30 lines  
- IMPLEMENTATION_PATTERNS_RULES: 47 lines
- CONTEXT_SPECIFIC_RULES: Variable

.clinerules/konmari-method.md: 257 lines
- Same content duplicated!

Total: 423 lines (with duplication)
Tokens per message: ~500-700 tokens for rules alone
```

### After Refactor

```
System Prompt Rules Section: ~40 lines
- OPERATIONAL_RULES: 30 lines
- PROJECT_RULES_REFERENCE: 10 lines
- CONTEXT_SPECIFIC_RULES: Variable

.clinerules/konmari-method.md: 257 lines
- Single source of truth

Total: 297 lines (no duplication)
Tokens per message: ~80-100 tokens for system rules
Token savings: ~400-600 tokens per message
```

### Benefits

✅ **Clarity**
- Clear separation: operational vs. methodological rules
- No confusion about which rules apply
- Easy to understand for new team members

✅ **Maintainability**
- Single source of truth for methodology rules
- Update `.clinerules/` without code changes
- System prompt stays focused on operations

✅ **Efficiency**
- Reduced token usage on every message
- Faster prompt building
- Lower API costs

✅ **Flexibility**
- Teams can customize `.clinerules/` per project
- System prompt remains consistent
- Toggle rules via UI as needed

---

## 🎯 Implementation Plan

### Phase 1: Refactor Rules Component (Non-Breaking)

**File**: `src/core/prompts/system-prompt/components/rules.ts`

**Changes**:
1. ✅ Remove `CORE_METHODOLOGY_RULES` (lines 11-79)
2. ✅ Remove methodology content from `TECHNICAL_IMPLEMENTATION_RULES`
3. ✅ Remove `IMPLEMENTATION_PATTERNS_RULES` (lines 119-166)
4. ✅ Add `OPERATIONAL_RULES` constant (operational requirements only)
5. ✅ Add `PROJECT_RULES_REFERENCE` constant (points to `.clinerules/`)
6. ✅ Update `RULES_TEMPLATE` to use new structure
7. ✅ Keep `CONTEXT_SPECIFIC_RULES` unchanged (browser, YOLO mode)

### Phase 2: Verify .clinerules/ Setup

**Directory**: `.clinerules/`

**Verify**:
1. ✅ `konmari-method.md` exists and is complete
2. ✅ Contains all methodology rules from old `rules.ts`
3. ✅ Git tracked (not in `.gitignore`)
4. ✅ Readable by Cline rules system

### Phase 3: Test & Validate

**Testing**:
1. ✅ Build system prompt with `PromptRegistry.get(context)`
2. ✅ Verify rules section is concise (~40 lines vs. 166)
3. ✅ Verify `.clinerules/` loads in Cline UI
4. ✅ Test agent behavior with new prompt
5. ✅ Ensure KonMari standards still followed

### Phase 4: Update Documentation

**Files to Update**:
1. ✅ `src/core/prompts/README.md` - Explain new rules separation
2. ✅ `src/core/prompts/system-prompt/README.md` - Document OPERATIONAL_RULES
3. ✅ `src/core/prompts/system-prompt/components/README.md` - Update rules component docs
4. ✅ Root `README.md` or `CONTRIBUTING.md` - Mention `.clinerules/` system

---

## 🔄 Migration Path (Safe)

### Step-by-Step

1. **Backup Current State**
   ```bash
   git add .
   git commit -m "chore: Backup before rules refactor"
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b refactor/system-prompt-rules-separation
   ```

3. **Refactor rules.ts**
   - Implement new structure shown above
   - Keep only operational rules in system prompt

4. **Verify .clinerules/ exists**
   - Already created ✅
   - Contains complete methodology

5. **Run Tests**
   ```bash
   npm test -- src/core/prompts/system-prompt/__tests__
   ```

6. **Update Snapshots**
   - Snapshots will change (rules section is shorter)
   - Review diff to ensure only expected changes
   - Update with `npm test -- -u`

7. **Integration Test**
   - Build extension
   - Load in VSCode/Cursor
   - Start new conversation
   - Verify agent follows KonMari standards
   - Check Rules popover shows `.clinerules/`

8. **Commit Changes**
   ```bash
   git add .
   git commit -m "refactor: Separate operational and methodological rules

   Previous system embedded all rules in system prompt.
   Evolved to use .clinerules/ for methodology standards.

   Lessons applied:
   - Clear separation of concerns (operational vs. methodological)
   - Token efficiency (reduced rules section by ~75%)
   - Single source of truth for standards
   - Flexibility for per-project customization"
   ```

---

## 🙏 Reflection

### Before Each Change - Three Questions:

1. **What purpose did this serve?**
   - Embedded rules provided consistent guidance before `.clinerules/` existed
   - Made standards accessible in every conversation
   - Prevented AI from forgetting project conventions

2. **What has this taught us?**
   - Duplication creates confusion and maintenance burden
   - Operational rules (how to use tools) differ from methodological rules (how to write code)
   - Token efficiency matters at scale
   - Separation of concerns applies to prompts, not just code

3. **What brings clarity now?**
   - Operational rules in system prompt (environment-specific)
   - Methodological rules in `.clinerules/` (project-specific)
   - Clear reference connecting the two
   - Single source of truth for each concern

### The Path Forward

- **Honor existing work** → The embedded rules served us well
- **Compose over create** → Use `.clinerules/` system, don't reinvent
- **Simplify with compassion** → Evolution, not demolition
- **System-wide changes** → Update tests, docs, and examples
- **Natural order** → Architecture → Implementation → Testing → Documentation

---

## 📈 Success Metrics

### Quantitative

- ✅ Rules section reduced from ~166 lines to ~40 lines (75% reduction)
- ✅ Token usage reduced by ~400-600 tokens per message
- ✅ No duplication between system prompt and `.clinerules/`
- ✅ All tests passing with updated snapshots

### Qualitative

- ✅ Clear separation between operational and methodological rules
- ✅ Easy for developers to understand where rules live
- ✅ Easy for teams to customize `.clinerules/` per project
- ✅ Agent behavior unchanged (still follows KonMari standards)
- ✅ Documentation explains new structure clearly

---

## 🎯 Next Steps

1. **Review this analysis** with team
2. **Get feedback** on proposed structure
3. **Implement Phase 1** (refactor rules.ts)
4. **Test thoroughly** with real conversations
5. **Update documentation** to reflect changes
6. **Share lessons** in commit message and team discussion

---

*Philosophy guides thinking. Clarity guides implementation. Compassion guides evolution.*

