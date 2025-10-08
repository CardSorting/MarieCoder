# Styling Guide

**Clear, consistent styling standards for the webview-ui codebase.**

---

## 🎨 **Styling Strategy**

We use a **primary + supplemental** approach to styling:

### **1. Primary: Tailwind CSS** (Use for most components)

**When to use:**
- New components and features
- Simple, declarative styling needs
- Responsive designs
- Utility-first patterns

**Why Tailwind:**
- Fast development with utility classes
- Consistent spacing and sizing
- Built-in responsiveness
- No CSS file management needed

**Example:**
```tsx
<div className="flex items-center gap-4 px-4 py-2 rounded-lg bg-[var(--vscode-button-background)]">
  <span className="text-sm font-medium">Hello World</span>
</div>
```

---

### **2. Supplemental: HeroUI Components** (For complex UI)

**When to use:**
- Complex interactive components (tooltips, modals, dropdowns)
- Components that need sophisticated state management
- When Tailwind would be too verbose

**Available HeroUI Components:**
- `Tooltip` - Rich tooltips with positioning
- `Modal` - Dialog/modal components
- `Dropdown` - Complex dropdown menus

**Example:**
```tsx
import { Tooltip } from "@heroui/react"

<Tooltip content="Helpful information" placement="top">
  <span>Hover me</span>
</Tooltip>
```

---

### **3. Legacy: styled-components** (Being phased out)

**Status:** ⚠️ **Deprecated - Do not use for new code**

**Why we're moving away:**
- Adds runtime overhead
- Mixing styling paradigms creates confusion
- Tailwind covers most use cases better

**If you encounter styled-components:**
- Leave existing code as-is unless refactoring
- When refactoring, convert to Tailwind where possible
- Large refactors should be planned, not incidental

---

## 🎯 **Decision Tree**

```
Need to style a component?
│
├─ Simple layout/spacing/colors?
│  └─ ✅ Use Tailwind
│
├─ Complex interactive component (tooltip, modal)?
│  └─ ✅ Use HeroUI component
│
├─ Existing styled-component code?
│  ├─ Just maintaining? → Leave as-is
│  └─ Major refactor? → Convert to Tailwind
│
└─ Custom theming with VSCode variables?
   └─ ✅ Use Tailwind with CSS variables
```

---

## 🔧 **VSCode Theme Integration**

### **Using VSCode CSS Variables**

Tailwind supports VSCode theme variables via `var()`:

```tsx
// Background colors
className="bg-[var(--vscode-editor-background)]"
className="bg-[var(--vscode-sidebar-background)]"

// Text colors
className="text-[var(--vscode-foreground)]"
className="text-[var(--vscode-descriptionForeground)]"

// Border colors
className="border-[var(--vscode-panel-border)]"

// Button colors
className="bg-[var(--vscode-button-background)]"
className="hover:bg-[var(--vscode-button-hoverBackground)]"
```

### **Common VSCode Variables**

```tsx
// Backgrounds
--vscode-editor-background
--vscode-sidebar-background
--vscode-panel-background
--vscode-input-background

// Foregrounds
--vscode-foreground
--vscode-descriptionForeground
--vscode-disabledForeground

// Semantic colors
--vscode-errorForeground
--vscode-warningForeground
--vscode-charts-green

// Interactive
--vscode-button-background
--vscode-button-hoverBackground
--vscode-button-secondaryBackground
--vscode-focusBorder
```

---

## 📦 **Component Styling Patterns**

### **Pattern 1: Utility-First (Preferred)**

```tsx
export const MyComponent = ({ children }: Props) => {
  return (
    <div className="flex flex-col gap-4 p-6 rounded-lg border border-[var(--vscode-panel-border)]">
      <h2 className="text-lg font-semibold text-[var(--vscode-foreground)]">
        {children}
      </h2>
    </div>
  )
}
```

### **Pattern 2: Dynamic Classes with cn()**

For conditional styling, use the `cn()` utility from HeroUI:

```tsx
import { cn } from "@heroui/react"

export const Button = ({ variant, className }: Props) => {
  return (
    <button
      className={cn(
        "px-4 py-2 rounded-md",
        variant === "danger" && "bg-red-500 text-white",
        variant === "success" && "bg-green-500 text-white",
        className
      )}
    />
  )
}
```

### **Pattern 3: Extracted Variants**

For components with many variants, extract style functions:

```tsx
const getVariantClasses = (variant: Variant) => {
  switch (variant) {
    case "danger":
      return "bg-[#c42b2b] text-white hover:bg-[#a82424]"
    case "success":
      return "bg-[#176f2c] text-white hover:bg-[#197f31]"
    default:
      return "bg-[var(--vscode-button-background)]"
  }
}

export const Button = ({ variant, className }: Props) => {
  return (
    <button className={`${getVariantClasses(variant)} ${className}`}>
      {children}
    </button>
  )
}
```

---

## 🚫 **Anti-Patterns (Avoid These)**

### **❌ Don't mix inline styles with Tailwind**
```tsx
// Bad: Mixing paradigms
<div className="flex gap-4" style={{ padding: "16px" }}>

// Good: Use Tailwind consistently
<div className="flex gap-4 p-4">
```

### **❌ Don't use arbitrary values excessively**
```tsx
// Bad: Magic numbers everywhere
<div className="mt-[13px] ml-[27px] w-[342px]">

// Good: Use Tailwind scale
<div className="mt-3 ml-6 w-80">
```

### **❌ Don't create new styled-components**
```tsx
// Bad: Adding more styled-components
const StyledDiv = styled.div`
  padding: 16px;
`

// Good: Use Tailwind
<div className="p-4">
```

### **❌ Don't duplicate color values**
```tsx
// Bad: Hardcoded colors
<div className="bg-[#1e1e1e]">

// Good: Use theme variables
<div className="bg-[var(--vscode-editor-background)]">
```

---

## ✅ **Best Practices**

### **1. Consistent Spacing**
Use Tailwind's spacing scale (0.25rem increments):
```tsx
// 4px increments: 0, 1, 2, 3, 4, 5, 6, 8, 10, 12, etc.
gap-1  // 0.25rem = 4px
gap-2  // 0.5rem  = 8px
gap-4  // 1rem    = 16px
gap-6  // 1.5rem  = 24px
```

### **2. VSCode-Compatible Colors**
Always use VSCode theme variables for colors that should adapt to theme:
```tsx
// Text
className="text-[var(--vscode-foreground)]"

// Backgrounds
className="bg-[var(--vscode-sidebar-background)]"

// Borders
className="border-[var(--vscode-panel-border)]"
```

### **3. Responsive Design**
Use Tailwind's responsive prefixes when needed:
```tsx
className="flex flex-col md:flex-row gap-4"
```

### **4. Focus States**
Always provide clear focus indicators for accessibility:
```tsx
className="focus:outline-none focus:ring-2 focus:ring-[var(--vscode-focusBorder)]"
```

### **5. Hover States**
Make interactive elements obvious:
```tsx
className="hover:bg-[var(--vscode-list-hoverBackground)] cursor-pointer transition-colors"
```

---

## 📝 **Checklist for New Components**

- [ ] Uses Tailwind for styling (unless complex component needing HeroUI)
- [ ] Uses VSCode theme variables for colors
- [ ] Has appropriate hover/focus states
- [ ] Follows spacing scale (gap-1, gap-2, gap-4, etc.)
- [ ] No inline styles (unless absolutely necessary)
- [ ] No new styled-components
- [ ] Responsive if layout needs it
- [ ] Accessible (focus indicators, semantic HTML)

---

## 🔄 **Migration Strategy**

When refactoring styled-components to Tailwind:

1. **Keep it working**: Don't break existing functionality
2. **Convert incrementally**: One component at a time
3. **Test thoroughly**: Verify visual appearance matches
4. **Document changes**: Note in PR what was migrated
5. **Remove dependencies**: Clean up unused styled-components imports

**Example Migration:**
```tsx
// Before (styled-components)
const StyledButton = styled(VSCodeButton)`
  background-color: var(--vscode-button-secondaryBackground);
  width: 100%;
  &:hover {
    background-color: var(--vscode-button-secondaryHoverBackground);
  }
`

// After (Tailwind)
<VSCodeButton
  className="w-full bg-[var(--vscode-button-secondaryBackground)] hover:bg-[var(--vscode-button-secondaryHoverBackground)]"
/>
```

---

## 🎓 **Learning Resources**

- **Tailwind Docs**: https://tailwindcss.com/docs
- **HeroUI Docs**: https://www.heroui.com/docs/components
- **VSCode Theme Colors**: Check VSCode theme color references

---

**Remember**: Consistency matters more than perfection. When in doubt, follow existing patterns in recently-updated components, and prefer Tailwind for new work.
