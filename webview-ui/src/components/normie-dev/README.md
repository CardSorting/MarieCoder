# NormieDev UI Components

Simple, focused UI components following the Marie Kondo methodology - keep only what sparks joy!

## Structure

```
normie-dev/
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
import { NormieDevBadge } from '@/components/normie-dev'

<NormieDevBadge variant="primary">New</NormieDevBadge>
```

### Button
```tsx
import { NormieDevButton } from '@/components/normie-dev'

<NormieDevButton variant="primary" onClick={handleClick}>
  Click me
</NormieDevButton>
```

### Card
```tsx
import { NormieDevCard } from '@/components/normie-dev'

<NormieDevCard title="Card Title">
  Card content goes here
</NormieDevCard>
```

### Chat Header
```tsx
import { NormieDevChatHeader } from '@/components/normie-dev'

<NormieDevChatHeader title="Chat" />
```

### Header
```tsx
import { NormieDevHeader } from '@/components/normie-dev'

<NormieDevHeader>Page Title</NormieDevHeader>
```

## Services

```tsx
import { projectTemplates } from '@/services/normie-dev'
```

## Utils

```tsx
import { getVariantStyles, NORMIE_DEV } from '@/utils/normie-dev'
```

## Philosophy

- **Simple**: Minimal props, clear interfaces
- **Focused**: One responsibility per component
- **Joyful**: Clean, delightful interactions
- **Organized**: Clear directory structure
