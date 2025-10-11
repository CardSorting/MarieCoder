# Rules Component Implementation - Before & After

> **Complete implementation for refactoring `components/rules.ts`**

---

## 📋 File: `src/core/prompts/system-prompt/components/rules.ts`

### ❌ REMOVE (Lines to Delete)

Delete these sections entirely:

```typescript
// DELETE LINES 11-79
const CORE_METHODOLOGY_RULES = `## 🎯 Core Philosophy (KonMari-Inspired)

**Inspired by KonMari Method**: Honor what served us, learn from it, evolve with gratitude. Philosophy guides thinking; clarity guides code.

### Before Any Change - Three Questions:
1. **What purpose did this serve?** (Observe with curiosity)
2. **What has this taught us?** (Learn with gratitude)
3. **What brings clarity now?** (Choose with intention)

### Six-Step Evolution Process:
When code has completed its purpose:
1. **OBSERVE** - Understand why it exists
2. **APPRECIATE** - Honor problems it solved
3. **LEARN** - Extract wisdom from patterns
4. **EVOLVE** - Build clearer implementations
5. **RELEASE** - Let go once new path is stable
6. **SHARE** - Document lessons in commits

## 📝 Naming Standards (Non-Negotiable)

### Files - MUST use snake_case:
✅ \`prompt_manager.ts\`, \`response_formatters.ts\`
❌ \`PromptRegistry.ts\` (wrong case), \`loadMcpDocumentation.ts\` (camelCase)

### Variables & Functions:
- **MUST be self-explanatory** without comments
- **NO abbreviations** (except: \`id\`, \`url\`, \`api\`)
- **Indicate type/purpose**: \`getUserById()\`, \`isValidEmail()\`, \`userCount\`

## 🔧 Type Safety & Quality (Required)

✅ **DO**:
- Use specific types (never \`any\` without justification)
- Validate ALL inputs before database operations
- Write tests for public methods (target 80%+)
- Add JSDoc to all public APIs
- Create actionable error messages with fix guidance

❌ **DON'T**:
- Use \`any\` type casually
- Skip input validation
- Leave public APIs undocumented
- Write vague error messages

## 🏗️ Architecture Standards

### Core Principles:
- **Separation of Concerns**: Separate data access from business logic
- **Service Layer**: Only when business logic complexity justifies it
- **Organize by Feature**: Group related functionality together (not by technical type)
- **Composition Over Creation**: Prefer proven libraries over custom implementations

## ⚡ Performance Standards

### Target Benchmarks:
- **Response Times**: Aim for <100ms for user-facing operations
- **Database Queries**: Target <50ms per query
- **API Endpoints**: Strive for <200ms response time

### Performance Principles:
- **Measure First**: Profile before optimizing
- **Cache Strategically**: Cache expensive operations, not everything
- **Optimize Queries**: Ensure proper indexing and query efficiency
- **Handle Errors Gracefully**: Implement proper error boundaries

## 🙏 Mindset
Honor existing work → Compose over create → Simplify with compassion → System-wide changes → Natural order: Architecture → Naming → Tests → Performance → Documentation

We **release** code because we learned better ways (not because we hate it). We **evolve** to honor lessons (not to criticize past decisions). We **practice** clarity habits (not enforce rigid rules).`
```

```typescript
// DELETE LINES 84-114 (keep structure, remove methodology content)
const TECHNICAL_IMPLEMENTATION_RULES = `## 🛠️ Technical Implementation (Required)

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
```

```typescript
// DELETE LINES 119-166
const IMPLEMENTATION_PATTERNS_RULES = `## 🎯 Implementation Workflows

### New Features:
1. **Reflect** → Study existing patterns
2. **Plan** → Design with type safety and performance
3. **Implement** → Build with clear names and validation
4. **Test** → Cover public APIs (80%+ target)
5. **Document** → JSDoc and commit messages with context

### Refactoring:
1. **Observe** → What patterns completed their purpose?
2. **Learn** → What lessons does this offer?
3. **Envision** → What would serve better?
4. **Evolve** → Implement new pattern
5. **Release** → Remove old code once stable
6. **Document** → Share lessons learned

### Bug Fixes:
1. **Understand** → Find root cause, not just symptom
2. **Fix** → Address underlying issue
3. **Test** → Prevent regression
4. **Document** → Share discovery
5. **Strengthen** → Add type safety/validation to prevent recurrence

## ✅ Quality Checklist

### Before Starting:
- [ ] Understand existing code and patterns
- [ ] Plan clear, descriptive names
- [ ] Design error handling with actionable messages
- [ ] Consider architecture (repositories, services)
- [ ] Identify performance requirements

### During Development:
- [ ] Strict TypeScript (no casual \`any\`)
- [ ] Self-documenting names
- [ ] Actionable error messages
- [ ] Validate all inputs
- [ ] Write tests (80%+ target)
- [ ] JSDoc on public APIs

### Before Completing:
- [ ] All linter errors resolved
- [ ] Names immediately clear
- [ ] Changes documented in commit
- [ ] Patterns applied system-wide
- [ ] Tests passing
- [ ] Performance targets met (<100ms operations, <50ms queries)`
```

---

## ✅ ADD (New Content)

Replace the deleted sections with these new constants:

```typescript
/**
 * Operational Rules - System-level requirements for agent operation
 * 
 * These rules define HOW the agent operates within the environment.
 * They are NOT about coding standards - those belong in .clinerules/
 * 
 * This focuses on:
 * - Environment behavior (CWD, paths, system info)
 * - File operation patterns
 * - Communication style
 * - Tool usage protocols
 * - Browser automation workflows
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
 * Project Rules Reference - Points to .clinerules/ system
 * 
 * This provides a lightweight reference to where coding standards live.
 * Instead of embedding 150+ lines of rules in every system prompt,
 * we point to the .clinerules/ directory which Cline loads separately.
 * 
 * Benefits:
 * - Token efficiency (~500 token savings per message)
 * - Single source of truth (no duplication)
 * - Per-project customization
 * - Easy updates without code changes
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
```

---

## 🔄 MODIFY (Update Existing)

### Update `getRulesSection()` function

**BEFORE** (lines 184-213):
```typescript
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
				CORE_METHODOLOGY_RULES: CORE_METHODOLOGY_RULES,  // ← REMOVE
				TECHNICAL_IMPLEMENTATION_RULES: TECHNICAL_IMPLEMENTATION_RULES,  // ← REMOVE
				IMPLEMENTATION_PATTERNS_RULES: IMPLEMENTATION_PATTERNS_RULES,  // ← REMOVE
			}),
		},
		variant,
		context,
	)
	return result ?? ""
}
```

**AFTER**:
```typescript
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
				OPERATIONAL_RULES: OPERATIONAL_RULES,  // ← ADD
				PROJECT_RULES_REFERENCE: PROJECT_RULES_REFERENCE,  // ← ADD
			}),
		},
		variant,
		context,
	)
	return result ?? ""
}
```

### Update `RULES_TEMPLATE`

**BEFORE** (lines 218-224):
```typescript
const RULES_TEMPLATE = `RULES

{{CORE_METHODOLOGY_RULES}}

{{TECHNICAL_IMPLEMENTATION_RULES}}

{{IMPLEMENTATION_PATTERNS_RULES}}`
```

**AFTER**:
```typescript
const RULES_TEMPLATE = `RULES

{{OPERATIONAL_RULES}}

{{PROJECT_RULES_REFERENCE}}`
```

---

## ✅ KEEP UNCHANGED

These sections remain exactly as they are:

```typescript
// KEEP LINES 1-9 (imports and JSDoc)
import { SystemPromptSection } from "../templates/section_definitions"
import type { PromptVariant, SystemPromptContext } from "../types"
import { resolveComponent } from "./base_component"

/**
 * Core MARIECODER methodology - KonMari-inspired development principles
 *
 * Clear, concise, and explicit standards with compassionate tone.
 * Guidance, not gospel. Continuous evolution over perfection.
 */
```

```typescript
// KEEP LINES 171-179 (Context-specific rules)
const CONTEXT_SPECIFIC_RULES = {
	browser: `- The user may ask generic non-development tasks, such as "what's the latest news" or "look up the weather in San Diego", in which case you might use the browser_action tool to complete the task if it makes sense to do so, rather than trying to create a website or using curl to answer the question. However, if an available MCP server tool or resource can be used instead, you should prefer to use it over browser_action.`,

	browserWait: ` Then if you want to test your work, you might use browser_action to launch the site, wait for the user's response confirming the site was launched along with a screenshot, then perhaps e.g., click a button to test functionality if needed, wait for the user's response confirming the button was clicked along with a screenshot of the new state, before finally closing the browser.`,

	yoloMode: `You are only allowed to ask the user questions using the ask_followup_question tool. Use this tool only when you need additional details to complete a task, and be sure to use a clear and concise question that will help you move forward with the task. However if you can use the available tools to avoid having to ask the user questions, you should do so`,

	yoloModeTerminal: ` If you absolutely need to see the actual terminal output, use the ask_followup_question tool to request the user to copy and paste it back to you.`,
}
```

---

## 📊 Complete Refactored File

Here's the entire file after refactoring (approximately 100 lines vs. 225 lines):

```typescript
import { SystemPromptSection } from "../templates/section_definitions"
import type { PromptVariant, SystemPromptContext } from "../types"
import { resolveComponent } from "./base_component"

/**
 * System Rules Component - Operational requirements only
 *
 * This component provides OPERATIONAL rules for how the agent interacts
 * with the environment. Coding standards and methodology live in .clinerules/
 *
 * Separation of concerns:
 * - System Prompt (here): How to USE tools, navigate CWD, communicate
 * - .clinerules/: How to WRITE code, naming standards, architecture
 */

/**
 * Operational Rules - System-level requirements for agent operation
 * 
 * These rules define HOW the agent operates within the environment.
 * They are NOT about coding standards - those belong in .clinerules/
 * 
 * This focuses on:
 * - Environment behavior (CWD, paths, system info)
 * - File operation patterns
 * - Communication style
 * - Tool usage protocols
 * - Browser automation workflows
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
 * Project Rules Reference - Points to .clinerules/ system
 * 
 * This provides a lightweight reference to where coding standards live.
 * Instead of embedding 150+ lines of rules in every system prompt,
 * we point to the .clinerules/ directory which Cline loads separately.
 * 
 * Benefits:
 * - Token efficiency (~500 token savings per message)
 * - Single source of truth (no duplication)
 * - Per-project customization
 * - Easy updates without code changes
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

## 🎯 Verification Steps

After making changes:

1. **Save the file**
   ```bash
   # File should now be ~100 lines (vs. 225 lines before)
   wc -l src/core/prompts/system-prompt/components/rules.ts
   ```

2. **Run tests**
   ```bash
   npm test -- src/core/prompts/system-prompt/__tests__
   ```

3. **Update snapshots** (rules section will be different)
   ```bash
   npm test -- -u
   ```

4. **Review snapshot diffs**
   ```bash
   git diff src/core/prompts/system-prompt/__tests__/__snapshots__/
   ```
   
   Expected changes:
   - Rules section should be ~40 lines (vs. ~166 lines)
   - Should contain OPERATIONAL_RULES
   - Should contain PROJECT_RULES_REFERENCE
   - Should NOT contain KonMari philosophy, naming standards, etc.

5. **Build and test**
   ```bash
   npm run build
   # Load extension in VSCode/Cursor
   # Start a conversation
   # Ask to create a new TypeScript file
   # Verify it follows snake_case naming
   ```

---

## ✅ Success Checklist

- [ ] `rules.ts` reduced from 225 lines to ~100 lines
- [ ] All references to `CORE_METHODOLOGY_RULES` removed
- [ ] All references to `IMPLEMENTATION_PATTERNS_RULES` removed
- [ ] New `OPERATIONAL_RULES` constant added
- [ ] New `PROJECT_RULES_REFERENCE` constant added
- [ ] `getRulesSection()` updated with new variables
- [ ] `RULES_TEMPLATE` updated to use new structure
- [ ] `CONTEXT_SPECIFIC_RULES` kept unchanged
- [ ] All tests pass
- [ ] Snapshots updated and reviewed
- [ ] Agent still follows KonMari standards in testing

---

*This refactor honors the work that came before, learns from duplication patterns, and evolves toward clarity.* 🙏

