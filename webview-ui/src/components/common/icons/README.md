# Icon Usage Guide

## Overview

NOORMME uses two complementary icon systems:

1. **Lucide React** - Modern, tree-shakeable SVG icons
2. **VSCode Codicons** - VSCode's native icon font for theme consistency

---

## When to Use Each System

### Use Lucide React When:
- Creating custom UI components
- Need flexibility with colors, sizes, and stroke widths
- Building feature-rich interactive elements
- Modern, clean aesthetics are needed

**Example:**
```tsx
import { PlusIcon, SettingsIcon } from "lucide-react"

<PlusIcon size={16} strokeWidth={1.5} className="text-foreground" />
```

### Use VSCode Codicons When:
- Integrating with VSCode's native UI patterns
- Need automatic theme color inheritance
- Using standard VSCode actions (trash, gear, etc.)
- Maintaining consistency with VSCode UX

**Example:**
```tsx
<span className="codicon codicon-trash text-sm" />
```

---

## Standard Icon Sizes

Use these standardized sizes for consistency:

| Size | Use Case | Example |
|------|----------|---------|
| `12px` | Small inline icons, compact UI | Context menu items |
| `14px` | Default text-adjacent icons | Inline buttons |
| `16px` | Standard UI buttons | Toolbar buttons |
| `18px` | Emphasized actions | Primary navigation |
| `20px` | Large interactive elements | Main action buttons |
| `24px` | Headers, prominent UI | Page titles |

---

## Best Practices

### 1. Consistent Sizing
```tsx
// ✅ Good - using standard sizes
<PlusIcon size={16} />
<span className="codicon codicon-gear" style={{ fontSize: '16px' }} />

// ❌ Avoid - non-standard sizes
<PlusIcon size={13} />
<PlusIcon size={12.5} />
```

### 2. Semantic Icon Usage
```tsx
// ✅ Good - meaningful aria-labels
<button aria-label="Delete task">
  <TrashIcon size={16} />
</button>

// ❌ Avoid - missing accessibility
<button>
  <TrashIcon size={16} />
</button>
```

### 3. Color Inheritance
```tsx
// ✅ Good - inherit from parent/theme
<PlusIcon className="text-foreground" />
<span className="codicon codicon-close text-error" />

// ❌ Avoid - hardcoded colors
<PlusIcon color="#FF0000" />
```

---

## Common Icon Patterns

### Navigation Icons
```tsx
import { HistoryIcon, SettingsIcon, PlusIcon } from "lucide-react"

const NavButton = () => (
  <HeroTooltip content="Settings">
    <button>
      <SettingsIcon size={18} strokeWidth={1} />
    </button>
  </HeroTooltip>
)
```

### Action Buttons
```tsx
import { TrashIcon, CheckIcon, CopyIcon } from "lucide-react"

// Delete action
<TrashIcon size={16} className="text-error" />

// Success state
<CheckIcon size={16} className="text-success" />
```

### Status Indicators
```tsx
// Loading/syncing
<span className="codicon codicon-sync codicon-modifier-spin" />

// Chevrons for expand/collapse
<span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`} />
```

---

## Icon Component Wrapper (Future Enhancement)

For frequently used icons, consider creating semantic wrapper components:

```tsx
// components/common/icons/semantic-icons.tsx
export const DeleteIcon = ({ size = 16, ...props }) => (
  <TrashIcon size={size} className="text-error" {...props} />
)

export const SuccessIcon = ({ size = 16, ...props }) => (
  <CheckIcon size={size} className="text-success" {...props} />
)
```

---

## Resources

- **Lucide Icons**: https://lucide.dev/icons/
- **VSCode Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- **Accessibility**: Always provide `aria-label` for icon-only buttons

---

*This guide evolves with the codebase. When introducing new patterns, update this documentation.*
