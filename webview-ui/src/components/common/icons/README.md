# Icon Usage Guide

## Overview

MarieCoder uses two complementary icon systems:

1. **Custom Lightweight SVG Icons** - Tree-shakeable, minimal bundle size icons from `@/components/icons`
2. **VSCode Codicons** - VSCode's native icon font for theme consistency

---

## MarieCoder Brand Colors

The extension follows a consistent purple gradient brand:

- **Primary Purple**: `#6B46C1` to `#9333EA` (gradient)
- **Accent White**: `#FFFFFF` to `#E0E7FF` (gradient)
- **Soft Purple**: `#F3E8FF` (accent dots)

Use these colors when creating custom branded icons or illustrations.

---

## When to Use Each System

### Use Custom SVG Icons When:
- Creating custom UI components
- Need flexibility with colors, sizes, and stroke widths
- Building feature-rich interactive elements
- Modern, clean aesthetics are needed

**Example:**
```tsx
import { PlusIcon, SettingsIcon } from "@/components/icons"

<PlusIcon size={16} strokeWidth={1.5} className="text-foreground" />
```

### Use VSCode Codicons When:
- Integrating with VSCode's native UI patterns
- Need automatic theme color inheritance
- Using standard VSCode actions (server, terminal, game, etc.)
- Maintaining consistency with VSCode UX

**Example:**
```tsx
<span className="codicon codicon-server text-sm" />
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
import { HistoryIcon, SettingsIcon, PlusIcon } from "@/components/icons"

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
import { TrashIcon, CheckIcon, CopyIcon } from "@/components/icons"

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

- **Custom Icons Source**: `/webview-ui/src/components/icons/index.tsx`
- **VSCode Codicons**: https://microsoft.github.io/vscode-codicons/dist/codicon.html
- **MarieCoder Brand**: Purple gradient (#6B46C1 to #9333EA)
- **Accessibility**: Always provide `aria-label` for icon-only buttons

---

## Adding New Icons

When you need to add a new icon:

1. Find the icon on [Lucide Icons](https://lucide.dev/icons/)
2. Copy the SVG path data
3. Add it to `/webview-ui/src/components/icons/index.tsx` following the existing pattern
4. Export both the component and an alias with "Icon" suffix

**Example:**
```tsx
export const Star = (props: IconProps) => (
  <Icon {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Icon>
)

export const StarIcon = Star
```

---

## Branded Icons

Use the `BrandedIcon` component wrapper to apply Marie's purple gradient to any icon:

```tsx
import { BrandedIcon } from "@/components/icons/BrandedIcon"
import { Star } from "@/components/icons"

// Regular icon with theme colors
<Star size={24} />

// Icon with Marie brand purple gradient
<BrandedIcon branded size={24}>
  <path d="..." /> {/* SVG path */}
</BrandedIcon>
```

Brand colors are centralized in `/webview-ui/src/components/icons/brand-colors.ts`:

```tsx
import { MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

// Use brand colors in components
const styles = {
  background: MARIE_BRAND_COLORS.gradients.purple,
  color: MARIE_BRAND_COLORS.softPurple,
}
```

---

*This guide evolves with MarieCoder. When introducing new patterns, update this documentation.*
