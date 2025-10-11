# MarieCoder Design System

Welcome to the MarieCoder design system! This guide provides everything you need to create beautiful, consistent, and accessible interfaces for the MarieCoder extension.

---

## Table of Contents

- [Overview](#overview)
- [Brand Colors](#brand-colors)
- [Typography](#typography)
- [Spacing](#spacing)
- [Components](#components)
- [CSS Utilities](#css-utilities)
- [Best Practices](#best-practices)

---

## Overview

The MarieCoder design system balances:
- **Brand Identity**: Purple gradient (#6B46C1 → #9333EA) that makes MarieCoder distinctive
- **VSCode Integration**: Dynamic theme colors that adapt to user preferences
- **Accessibility**: WCAG 2.1 Level AA compliant focus states and contrast ratios

---

## Brand Colors

### Primary Palette

MarieCoder's signature purple gradient:

```tsx
import { MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

// Primary purple gradient
MARIE_BRAND_COLORS.purpleStart // #6B46C1
MARIE_BRAND_COLORS.purpleEnd   // #9333EA

// Accent colors
MARIE_BRAND_COLORS.whiteStart  // #FFFFFF
MARIE_BRAND_COLORS.whiteEnd    // #E0E7FF
MARIE_BRAND_COLORS.softPurple  // #F3E8FF

// Pre-built gradients
MARIE_BRAND_COLORS.gradients.purple // CSS gradient string
```

### Tailwind Classes

```tsx
// Use in JSX
<div className="bg-brand-purple text-brand-accent-white">
  MarieCoder
</div>

// Gradient backgrounds
<div className="marie-brand-gradient">
  Branded button
</div>

// Gradient text
<h1 className="marie-brand-gradient-text">
  MarieCoder
</h1>
```

### VSCode Theme Colors

Dynamic colors that respect user's theme:

```tsx
import { colors } from "@/styles/design-system"

// Background colors
colors.vscode.background        // Editor background
colors.vscode.hover            // List hover state
colors.vscode.active           // Active selection

// Semantic colors
colors.vscode.error            // Error messages
colors.vscode.warning          // Warnings
colors.vscode.success          // Success states
colors.vscode.info             // Information

// Interactive elements
colors.vscode.buttonBackground // Primary button
colors.vscode.focus           // Focus indicators
```

---

## Typography

### Font Sizes

Responsive sizes based on VSCode settings:

| Class | Size | Usage |
|-------|------|-------|
| `text-xxs` | 0.75× | Small labels, meta info |
| `text-xs` | 0.85× | Secondary text, captions |
| `text-sm` | 1× | Body text, buttons |
| `text-md` | 1.25× | Subheadings |
| `text-lg` | 1.5× | Section headings |
| `text-xl` | 2× | Page titles |

### Font Weights

```tsx
<span className="font-normal">   {/* 400 */}
<span className="font-medium">   {/* 500 */}
<span className="font-semibold"> {/* 600 */}
<span className="font-bold">     {/* 700 */}
```

### Examples

```tsx
// Page heading
<h1 className="text-lg font-semibold text-foreground">
  Settings
</h1>

// Section heading with brand accent
<h2 className="text-md font-medium">
  <span className="text-foreground">Configure </span>
  <span className="marie-brand-gradient-text">MarieCoder</span>
</h2>

// Body text
<p className="text-sm text-description">
  Description text goes here
</p>
```

---

## Spacing

Based on a 4px grid system:

| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `xs` | 4px | `space-xs` | Tight spacing |
| `sm` | 8px | `space-sm` | Small gaps |
| `md` | 12px | `space-md` | Default spacing |
| `lg` | 16px | `space-lg` | Comfortable spacing |
| `xl` | 20px | `space-xl` | Large spacing |

### Examples

```tsx
// Margin
<div className="mb-md">     {/* margin-bottom: 12px */}
<div className="mt-lg">     {/* margin-top: 16px */}

// Padding
<div className="p-md">      {/* padding: 12px */}
<div className="px-lg py-sm"> {/* padding: 8px 16px */}

// Gap (for flex/grid)
<div className="flex gap-sm"> {/* gap: 8px */}
```

---

## Components

### Buttons

```tsx
import { Button } from "@/components/common/button/Button"

// Primary button (VSCode style)
<Button variant="primary" onClick={handleClick}>
  Continue
</Button>

// Secondary button
<Button variant="secondary">
  Cancel
</Button>

// Branded accent button
<Button variant="accent">
  Get Started
</Button>

// Success button
<Button variant="success">
  Save Changes
</Button>

// Danger button
<Button variant="danger">
  Delete
</Button>

// With icon
<Button
  icon={<span className="codicon codicon-add" />}
  variant="accent"
>
  Add Item
</Button>
```

### Cards

Pre-styled card components with hover effects:

```tsx
// Default card
<div className="marie-card">
  Card content
</div>

// Branded card with left accent
<div className="marie-card branded">
  Featured content
</div>
```

**Custom card example:**

```tsx
<div className="marie-card cursor-pointer" onClick={handleClick}>
  <h3 className="text-sm font-medium text-foreground mb-2">
    Task Title
  </h3>
  <p className="text-xs text-description">
    Task description goes here
  </p>
</div>
```

### Badges

```tsx
import { Badge } from "@/components/common/Badge"

// Default badge
<Badge>New</Badge>

// Branded badge with gradient
<Badge variant="branded">Premium</Badge>

// Semantic badges
<Badge variant="success">Active</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>

// With icon
<Badge
  variant="branded"
  icon={<span className="codicon codicon-star-full" />}
>
  Featured
</Badge>
```

---

## CSS Utilities

### Branded Backgrounds

```css
/* Full gradient background */
.marie-brand-gradient {
  background: linear-gradient(135deg, #6B46C1 0%, #9333EA 100%);
}

/* Gradient text */
.marie-brand-gradient-text {
  background: linear-gradient(135deg, #6B46C1 0%, #9333EA 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Interactive Elements

```css
/* Accent button (auto-applied to Button variant="accent") */
.marie-coder-accent {
  /* Purple gradient with hover effects */
}

/* Subtle branded background */
.marie-coder-subtle {
  /* Light purple tint */
}

/* Clean, minimal animation */
.marie-kondo-clean {
  /* Subtle lift on hover */
}
```

### Cards

```css
/* Default card */
.marie-card {
  /* Semi-transparent background with border */
}

/* Branded card with left accent */
.marie-card.branded {
  /* Same as .marie-card with purple left border */
}
```

---

## Best Practices

### 1. Use Semantic Colors

```tsx
// ✅ Good - semantic, theme-aware
<p className="text-description">Secondary text</p>
<span className="text-error">Error message</span>

// ❌ Avoid - hardcoded colors
<p style={{ color: '#999' }}>Secondary text</p>
<span style={{ color: 'red' }}>Error message</span>
```

### 2. Brand Colors Sparingly

Use brand colors for:
- Key call-to-action buttons
- Logo and main heading accents
- Feature highlights
- Status indicators (favorited, premium, etc.)

**Don't** overuse purple everywhere - it reduces impact.

```tsx
// ✅ Good - subtle brand accent
<h1>
  <span className="text-foreground">Welcome to </span>
  <span className="marie-brand-gradient-text">MarieCoder</span>
</h1>

// ❌ Too much - overwhelming
<div className="marie-brand-gradient p-4">
  <h1 className="marie-brand-gradient-text">MarieCoder</h1>
  <Button variant="accent">Get Started</Button>
</div>
```

### 3. Consistent Spacing

Use design tokens instead of arbitrary values:

```tsx
// ✅ Good - consistent spacing
<div className="mb-md mt-lg p-sm">

// ❌ Avoid - arbitrary values
<div className="mb-3 mt-5 p-2">
```

### 4. Accessibility

Always include:
- Focus states (automatic with our utilities)
- ARIA labels for icon buttons
- Keyboard navigation support

```tsx
// ✅ Good - accessible
<button
  aria-label="Delete item"
  className="marie-focus-ring"
  onClick={handleDelete}
>
  <span className="codicon codicon-trash" />
</button>

// ❌ Avoid - missing label
<button onClick={handleDelete}>
  <span className="codicon codicon-trash" />
</button>
```

### 5. Responsive Text

Use relative font sizes that scale with VSCode settings:

```tsx
// ✅ Good - scales with user preferences
<p className="text-sm">Body text</p>

// ❌ Avoid - fixed sizes
<p style={{ fontSize: '14px' }}>Body text</p>
```

---

## Quick Reference

### Component Import Paths

```tsx
// Design system
import { colors, spacing, radius } from "@/styles/design-system"
import { MARIE_BRAND_COLORS } from "@/components/icons/brand-colors"

// Components
import { Button } from "@/components/common/button/Button"
import { Badge } from "@/components/common/Badge"
import MarieCoderLogo from "@/assets/MarieCoderLogo"

// Icons
import { PlusIcon, SettingsIcon } from "@/components/icons"
```

### Common Patterns

```tsx
// Card with branded accent
<div className="marie-card branded cursor-pointer" onClick={...}>
  <h3 className="text-sm font-medium mb-2">Title</h3>
  <p className="text-xs text-description">Description</p>
</div>

// Accent button with icon
<Button
  variant="accent"
  icon={<PlusIcon size={16} />}
  onClick={handleAdd}
>
  Add Item
</Button>

// Branded heading
<h1 className="text-lg font-semibold">
  <span className="marie-brand-gradient-text">Marie</span>
  <span className="text-foreground">Coder</span>
</h1>
```

---

## Contributing

When adding new components or utilities:

1. Use design tokens from `/src/styles/design-system.ts`
2. Follow the naming convention: `marie-[purpose]-[variant]`
3. Test in both light and dark themes
4. Ensure WCAG 2.1 Level AA compliance
5. Document your additions in this README

---

*This design system evolves with MarieCoder. Keep it updated as patterns emerge.*
