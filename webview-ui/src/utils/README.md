# Utils Directory

General-purpose utility functions organized by domain and purpose.

## Organization Principles

### 1. **Domain Subdirectories**
Related utilities are grouped into subdirectories by domain:
- `chat/` - Chat-specific utilities (mentions, slash commands)
- `mcp/` - MCP-specific utilities (server management, display)
- `normie-dev/` - NormieDev-specific utilities (styles, constants)

### 2. **Root-Level Utilities**
General-purpose utilities that don't belong to a specific domain:
- `format.ts` - Data formatting (numbers, sizes, dates)
- `validate.ts` - Input validation
- `platformUtils.ts` - Platform detection and utilities
- `vscStyles.ts` - VSCode theme utilities
- `getLanguageFromPath.ts` - Language detection from file paths

## Directory Structure

```
utils/
├── chat/              # Chat domain utilities
│   ├── context_mentions.ts
│   ├── slash_commands.ts
│   └── index.ts
├── mcp/               # MCP domain utilities
│   ├── mcp_utils.ts
│   └── index.ts
├── normie_dev/        # NormieDev-specific utilities
│   ├── constants.ts
│   ├── style_utils.ts
│   └── index.ts
├── format.ts          # General formatting
├── validate.ts        # General validation
├── platformUtils.ts   # Platform utilities
├── vscStyles.ts       # VSCode styling
└── getLanguageFromPath.ts
```

## Usage Examples

### Domain-Specific Utils

```typescript
// Chat utilities
import { getContextMenuOptions, getAllSlashCommands } from "@/utils/chat"

// MCP utilities
import { getMcpServerDisplayName } from "@/utils/mcp"

// NormieDev utilities
import { NORMIE_DEV } from "@/utils/normie-dev"
```

### General Utils

```typescript
// Formatting
import { formatSize, formatLargeNumber } from "@/utils/format"

// Validation
import { validateApiConfiguration } from "@/utils/validate"

// Platform detection
import { detectOS, isSafari } from "@/utils/platformUtils"
```

## When to Create a New Subdirectory

Create a new domain subdirectory when:
1. You have 3+ related utility functions for a specific domain
2. The utilities are only used within that domain's components
3. The domain has clear boundaries and responsibilities

## Best Practices

1. **Pure Functions**: Utils should be pure functions without side effects
2. **Well-Typed**: Use TypeScript types/interfaces for all parameters and returns
3. **Well-Documented**: Add JSDoc comments explaining purpose and usage
4. **Tested**: Write unit tests for complex logic
5. **Barrel Exports**: Create `index.ts` in subdirectories for clean imports

## Not Hooks!

**Important**: Hooks belong in the `/hooks` directory, not here. If your utility uses React hooks (`useState`, `useEffect`, etc.), it should be in `/hooks` or a component-specific `hooks/` directory.
