# NormieDev UI Components

Simple, focused UI components following the Marie Kondo methodology - keep only what sparks joy!

## Structure

```
normie-dev/
├── header/           # Header components
├── card/            # Card components  
├── button/          # Button components
├── badge/           # Badge components
├── welcome/         # Welcome screen components
├── chat/            # Chat interface components
├── examples/        # Usage examples
└── index.ts         # Main exports
```

## Usage

```tsx
import { NormieDevWelcome, NormieDevButton } from '@/components/normie-dev'

// Simple usage
<NormieDevWelcome onGetStarted={handleStart} />
<NormieDevButton variant="primary">Click me</NormieDevButton>
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
