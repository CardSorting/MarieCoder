# MarieCoder UI Components

Simple, focused UI components following the Marie Kondo methodology - keep only what sparks joy!

## Structure

```
marie-coder/
├── badge/           # Badge components
├── button/          # Button components
├── card/            # Card components
├── chat/            # Chat interface components
├── header/          # Header components
└── index.ts         # Main exports
```

## Available Components

### Badge
```tsx
import { MarieCoderBadge } from '@/components/marie-coder'

<MarieCoderBadge variant="primary">New</MarieCoderBadge>
```

### Button
```tsx
import { MarieCoderButton } from '@/components/marie-coder'

<MarieCoderButton variant="primary" onClick={handleClick}>
  Click me
</MarieCoderButton>
```

### Card
```tsx
import { MarieCoderCard } from '@/components/marie-coder'

<MarieCoderCard title="Card Title">
  Card content goes here
</MarieCoderCard>
```

### Chat Header
```tsx
import { MarieCoderChatHeader } from '@/components/marie-coder'

<MarieCoderChatHeader title="Chat" />
```

### Header
```tsx
import { MarieCoderHeader } from '@/components/marie-coder'

<MarieCoderHeader>Page Title</MarieCoderHeader>
```

## Services

```tsx
import { projectTemplates } from '@/services/marie-coder'
```

## Utils

```tsx
import { getVariantStyles, MARIE_CODER } from '@/utils/marie-coder'
```

## Philosophy

- **Simple**: Minimal props, clear interfaces
- **Focused**: One responsibility per component
- **Joyful**: Clean, delightful interactions
- **Organized**: Clear directory structure
