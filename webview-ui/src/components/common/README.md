# Common Components

Shared UI components used across the application.

## Recent Changes

### Button Consolidation ✨

We've consolidated `DangerButton`, `SuccessButton`, and `SettingsButton` into a single, unified `Button` component with semantic variants.

**Migration:**
```tsx
// Before
import DangerButton from "@/components/common/DangerButton"
<DangerButton onClick={handleDelete}>Delete</DangerButton>

// After
import { Button } from "@/components/common/button"
<Button variant="danger" onClick={handleDelete}>Delete</Button>
```

**Available Variants:**
- `primary` - Default button style
- `secondary` - Secondary actions
- `danger` - Destructive actions (delete, remove)
- `success` - Positive confirmations (save, accept)
- `accent` - Special emphasis
- `ghost` - Minimal style for subtle actions

**See:** `button/Button.tsx` for complete API documentation.

---

## Component Organization

### Simple Components (Single File)
Components with straightforward implementations:
```
ChecklistRenderer.tsx
CheckmarkControl.tsx
CopyButton.tsx
```

### Complex Components (Directory)
Components with multiple files, variants, or utilities get their own directory:
```
button/
├── Button.tsx       # Main component
├── index.ts         # Exports
└── (tests, utils as needed)
```

---

## Available Components

### Buttons
- **Button** - Unified button component with variants (danger, success, etc.)
- **VSCodeButtonLink** - Button styled as a link

### Dialogs & Modals
- **AlertDialog** - Confirmation dialogs

### Markdown & Code
- **MarkdownBlock** - Render markdown content
- **CodeBlock** - Syntax-highlighted code display
- **CodeAccordian** - Collapsible code sections
- **MermaidBlock** - Render Mermaid diagrams

### Tooltips
- **HeroTooltip** - Unified tooltip component using HeroUI with VSCode theme integration
  - Replaced the old `Tooltip` component (removed October 2025)
  - Supports semantic placement, rich content, and better accessibility

### Controls
- **CheckmarkControl** - Checkbox with label
- **CheckpointControls** - Checkpoint management

### Info & Feedback
- **InfoBanner** - Informational banners
- **NewModelBanner** - Feature announcement banners
- **TelemetryBanner** - Telemetry consent banner
- **Demo** - Demo/example component

### Utilities
- **CopyButton** - Copy-to-clipboard button
- **Tab** - Tab navigation component
- **Thumbnails** - Image thumbnail display

---

## Creating New Common Components

### When to add a component here:
✅ Used in 3+ different features
✅ Generic, reusable functionality
✅ Not domain-specific

### When NOT to add here:
❌ Feature-specific components → Keep in `components/[feature]/`
❌ Used in only one place → Keep co-located
❌ Tightly coupled to specific domain logic

### Component Template

```tsx
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import React from "react"

/**
 * Brief description of what this component does
 * 
 * @example
 * ```tsx
 * <MyComponent variant="primary">
 *   Hello World
 * </MyComponent>
 * ```
 */
export interface MyComponentProps {
  /** Describe each prop */
  variant?: "primary" | "secondary"
  children: React.ReactNode
}

export const MyComponent: React.FC<MyComponentProps> = ({
  variant = "primary",
  children,
}) => {
  return (
    <div className="flex items-center gap-4">
      {children}
    </div>
  )
}

export default MyComponent
```

---

## Styling Standards

All components in `common/` should follow these standards:

1. **Use Tailwind CSS** for styling (not styled-components)
2. **Use VSCode theme variables** for colors:
   ```tsx
   className="bg-[var(--vscode-sidebar-background)]"
   ```
3. **Provide TypeScript types** for all props
4. **Add JSDoc comments** for public APIs
5. **Include usage examples** in comments

**See:** [/webview-ui/STYLING_GUIDE.md](../../STYLING_GUIDE.md) for complete guidelines.

---

## Testing

Common components should have tests covering:
- Basic rendering
- Prop variations
- User interactions
- Edge cases

Place tests in `__tests__/` subdirectory or co-located `*.test.tsx` files.

---

## Best Practices

1. **Keep it simple**: Common components should be easy to understand
2. **Single responsibility**: Each component does one thing well
3. **Composable**: Design for composition, not configuration
4. **Accessible**: Follow ARIA guidelines and best practices
5. **Documented**: Clear JSDoc and usage examples

---

## Examples

### Good Common Component
```tsx
// Simple, focused, reusable
export const Badge = ({ children, variant }: BadgeProps) => {
  return (
    <span className={`px-2 py-1 rounded text-sm ${getVariantClass(variant)}`}>
      {children}
    </span>
  )
}
```

### Not a Good Common Component
```tsx
// Too specific to chat feature
export const ChatMessageHeader = ({ message, user }: Props) => {
  // Complex chat-specific logic...
  // This belongs in components/chat/
}
```

---

For questions or guidance, see:
- [CONTRIBUTING.md](../../CONTRIBUTING.md) - General contribution guidelines
- [STYLING_GUIDE.md](../../STYLING_GUIDE.md) - Styling standards
