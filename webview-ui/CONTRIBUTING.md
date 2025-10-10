# Contributing Guide

**Guidelines for contributing to the webview-ui codebase with compassion and clarity.**

---

## 🎯 **Core Philosophy**

We follow the **KonMari Method** for code:
- **Observe** what exists and learn from it
- **Appreciate** the problems it solved
- **Learn** from patterns and friction points
- **Evolve** to clearer implementations
- **Release** old code once new path is stable
- **Share** lessons learned in commit messages

**Before changing any code, ask:**
1. What purpose did this serve?
2. What has this taught us?
3. What brings clarity now?

---

## 📁 **Code Organization**

### **Directory Structure**

```
webview-ui/src/
├── components/          # React components
│   ├── common/         # Shared UI components (Button, Tooltip, etc.)
│   │   └── button/     # Each complex component gets a directory
│   ├── chat/           # Chat feature components
│   │   └── hooks/      # Chat-specific hooks
│   ├── settings/       # Settings feature components
│   └── [feature]/      # Organize by feature, not by type
│
├── hooks/              # Global, reusable hooks
│   ├── use_keyboard.ts
│   ├── use_debounce_effect.ts
│   └── index.ts        # Barrel export
│
├── utils/              # Utility functions
│   ├── chat/           # Chat-specific utilities
│   ├── mcp/            # MCP-specific utilities
│   ├── marie_coder/    # MarieCoder-specific utilities
│   └── format.ts       # General utilities at root
│
├── context/            # React contexts
├── services/           # API/service clients
└── config/             # Configuration files
```

---

## 🎨 **Styling Standards**

### **Primary: Tailwind CSS**
Use Tailwind for all new styling:
```tsx
<div className="flex items-center gap-4 px-4 py-2">
  Content here
</div>
```

### **VSCode Theme Variables**
Always use VSCode theme variables for colors:
```tsx
className="bg-[var(--vscode-sidebar-background)] text-[var(--vscode-foreground)]"
```

### **Complex Components: HeroUI**
Use HeroUI for tooltips, modals, dropdowns:
```tsx
import { Tooltip } from "@heroui/react"
```

### **Avoid**
- ❌ New styled-components
- ❌ Inline styles (unless absolutely necessary)
- ❌ Hardcoded colors
- ❌ Magic numbers

**See [STYLING_GUIDE.md](./STYLING_GUIDE.md) for complete details.**

---

## 📝 **Naming Conventions**

### **Files: snake_case**
```
✅ prompt_manager.ts
✅ response_formatter.ts
✅ use_debounce_effect.ts

❌ PromptManager.ts
❌ responseFormatter.ts
❌ useDebounceEffect.ts
```

### **Components: PascalCase**
```tsx
export const Button = () => { }
export const ChatTextArea = () => { }
```

### **Functions & Variables: camelCase**
```tsx
const getUserById = () => { }
const isValidEmail = () => { }
const userCount = 42
```

### **Types & Interfaces: PascalCase**
```tsx
interface ButtonProps { }
type ButtonVariant = "primary" | "secondary"
```

---

## 🔧 **Component Guidelines**

### **1. Component Structure**

```tsx
import { /* imports */ } from "package"
import { /* local imports */ } from "@/path"

/**
 * Component description
 * 
 * @example
 * ```tsx
 * <MyComponent variant="primary">Hello</MyComponent>
 * ```
 */
export interface MyComponentProps {
  /** Prop description */
  variant?: "primary" | "secondary"
  /** Child content */
  children: React.ReactNode
}

export const MyComponent = ({
  variant = "primary",
  children,
}: MyComponentProps) => {
  return (
    <div className="...">
      {children}
    </div>
  )
}
```

### **2. TypeScript Standards**

✅ **Do:**
- Use specific types (never `any` without justification)
- Export types/interfaces from components
- Add JSDoc comments to public APIs
- Validate all inputs

❌ **Don't:**
- Use `any` casually
- Skip input validation
- Leave public APIs undocumented

### **3. Error Handling**

Always provide actionable error messages:
```tsx
if (!data.email) {
  throw new Error(
    'Email required. Please provide a valid email address'
  )
}
```

---

## 🪝 **Hooks Organization**

### **When to place in `/hooks`**
✅ Reusable across features
✅ General-purpose utility
✅ Used in multiple unrelated components

### **When to place in `components/[feature]/hooks/`**
✅ Specific to one feature
✅ Depends on feature-specific logic
✅ Only used within that feature

**Example:**
```
✅ /hooks/use_debounce_effect.ts       (general utility)
✅ /components/chat/hooks/useChatState.ts  (chat-specific)
```

---

## 🔨 **Utils Organization**

### **Domain Subdirectories**
Create subdirectories for related utilities:
```
utils/
├── chat/           # 3+ chat-specific utilities
│   ├── context_mentions.ts
│   ├── slash_commands.ts
│   └── index.ts
├── mcp/            # MCP-specific utilities
└── format.ts       # General utility at root
```

### **When to create a subdirectory**
- Have 3+ related utility functions for a domain
- Utilities are only used within that domain
- Domain has clear boundaries

### **Best Practices**
- Pure functions (no side effects)
- Well-typed parameters and returns
- JSDoc comments
- Unit tests for complex logic
- Barrel exports (`index.ts`)

---

## 📦 **Adding New Features**

### **Step 1: Plan Organization**
```
Where does this feature belong?
├─ New major feature? → Create components/[feature]/
├─ Enhancement to existing? → Add to components/[feature]/
└─ Shared component? → Add to components/common/
```

### **Step 2: Create Structure**
```
components/my-feature/
├── MyFeature.tsx        # Main component
├── MyFeatureItem.tsx    # Sub-components
├── hooks/               # Feature-specific hooks
│   └── useMyFeature.ts
└── index.ts             # Barrel export
```

### **Step 3: Add Tests**
Target 80%+ coverage for public APIs:
```
components/my-feature/
├── __tests__/
│   ├── MyFeature.test.tsx
│   └── useMyFeature.test.ts
```

### **Step 4: Document**
- JSDoc on public APIs
- Update relevant READMEs
- Add usage examples

---

## 🧪 **Testing Standards**

### **What to Test**
- Public component APIs
- Edge cases and error conditions
- User interactions
- Business logic in hooks/utils

### **Example Test**
```tsx
describe("Button", () => {
  it("calls onClick when clicked", () => {
    const handleClick = jest.fn()
    render(<Button onClick={handleClick}>Click me</Button>)
    
    fireEvent.click(screen.getByText("Click me"))
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })
})
```

---

## 📄 **Documentation Standards**

### **Component Documentation**
```tsx
/**
 * A versatile button component with multiple variants.
 * 
 * @example
 * ```tsx
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete
 * </Button>
 * ```
 */
export const Button = (props: ButtonProps) => { }
```

### **Function Documentation**
```tsx
/**
 * Formats a file size in bytes to human-readable format.
 * 
 * @param bytes - The size in bytes
 * @returns Formatted string (e.g., "1.5 MB")
 * 
 * @example
 * formatSize(1500000) // "1.5 MB"
 */
export const formatSize = (bytes: number): string => { }
```

---

## 🔄 **Refactoring Guidelines**

### **Before Refactoring**
1. **Understand**: Why does the code exist?
2. **Document**: What problems did it solve?
3. **Plan**: What would be clearer?
4. **Test**: Ensure existing tests pass

### **During Refactoring**
1. **Small steps**: Incremental changes
2. **Keep it working**: Don't break functionality
3. **Add tests**: Cover new code paths
4. **Update docs**: Keep documentation current

### **After Refactoring**
1. **Verify**: All tests pass
2. **Review**: Check for unintended changes
3. **Document**: Share lessons learned
4. **Clean up**: Remove deprecated code

### **Example Commit Message**
```
feat: Consolidate button components into unified API

Previous separate button components (DangerButton, SuccessButton,
SettingsButton) taught us about semantic variants and icon handling.
Evolved to single Button component with variant prop.

Lessons applied:
- Semantic variants improve clarity
- Icon prop better than inline styles
- Consistent API reduces mental load

Files:
- Created: components/common/button/Button.tsx
- Updated: 7 files to use new Button API
- Removed: 3 deprecated button components
```

---

## ✅ **Pre-Commit Checklist**

Before submitting a pull request:

- [ ] All tests pass (`npm test`)
- [ ] No linter errors (`npm run lint`)
- [ ] Code follows naming conventions
- [ ] Components are properly typed
- [ ] Public APIs have JSDoc comments
- [ ] Error messages are actionable
- [ ] Styling uses Tailwind (not styled-components)
- [ ] VSCode theme variables used for colors
- [ ] Documentation updated (if needed)
- [ ] Commit message explains "why" not just "what"

---

## 🎓 **Learning from the Code**

Good places to learn patterns:
- `components/common/button/` - Component organization
- `components/chat/chat-view/` - Complex feature structure
- `components/settings/` - Provider pattern
- `hooks/` - Hook organization
- `utils/chat/` - Domain-specific utilities

---

## 💬 **Getting Help**

When stuck:
1. **Read the code**: Look for similar patterns
2. **Check docs**: READMEs in directories
3. **Ask questions**: Better to ask than guess
4. **Document solutions**: Help others who follow

---

## 🙏 **Mindset**

**Remember:**
- Code is a conversation with future developers
- "Legacy" was once innovative
- We refactor to evolve, not criticize
- Small, consistent improvements compound
- Every commit is an act of care

**Be gentle with yourself. Be gentle with the code. Be gentle with those who came before.**

---

*Inspired by the KonMari Method: We evolve code with intention, gratitude, and compassion.*
