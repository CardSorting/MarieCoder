# Chat State Architecture Comparison

## Current Architecture (Before Refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatView                                 │
│                                                                   │
│  useChatState(messages)                                          │
│  ├── inputValue ────────────────────────────┐                   │
│  ├── activeQuote                             │                   │
│  ├── isTextAreaFocused ──────────┐          │                   │
│  ├── selectedImages               │          │                   │
│  ├── selectedFiles                │          │                   │
│  ├── sendingDisabled              │          │                   │
│  ├── enableButtons (stored) ❌   │          │                   │
│  ├── primaryButtonText (stored) ❌│          │                   │
│  ├── secondaryButtonText (stored)❌│         │                   │
│  ├── expandedRows                 │          │                   │
│  ├── textAreaRef ─────────────────│──────────│─────┐            │
│  ├── lastMessage (in state) ⚠️    │          │     │            │
│  ├── task (in state) ⚠️           │          │     │            │
│  └── clineAsk (in state) ⚠️       │          │     │            │
│                                    │          │     │            │
│  Also computed directly:           │          │     │            │
│  ├── task = messages.at(0) ⚠️     │          │     │            │
│  ├── lastMessage (duplicate) ⚠️   │          │     │            │
│  └── modifiedMessages              │          │     │            │
│                                    │          │     │            │
│                                    ▼          ▼     ▼            │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ChatTextArea (forwardRef)                   │   │
│  │                                                           │   │
│  │  Props from ChatView:                                    │   │
│  │  ├── inputValue ──────────────┐                         │   │
│  │  ├── onFocusChange ────────────│──┐                     │   │
│  │  ├── ref (forwarded) ──────────│──│──┐                  │   │
│  │  └── ...                       │  │  │                  │   │
│  │                                │  │  │                  │   │
│  │  useInputState()               │  │  │                  │   │
│  │  ├── isTextAreaFocused ────────┼──┘  │  ❌ DUPLICATE   │   │
│  │  ├── textAreaRef ──────────────┼─────┘  ❌ DUPLICATE   │   │
│  │  ├── cursorPosition            │                        │   │
│  │  └── intendedCursorPosition    │                        │   │
│  │                                │                        │   │
│  │  ❌ State Sync Issue:          │                        │   │
│  │     onFocusChange tries to sync duplicate states       │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Issues:
❌ textAreaRef duplicated in useChatState AND useInputState
❌ isTextAreaFocused duplicated in useChatState AND useInputState
❌ enableButtons, button texts stored instead of derived
⚠️  lastMessage, task, clineAsk computed in useChatState but also in ChatView
⚠️  Mixed responsibilities in useChatState
```

---

## Proposed Architecture (After Refactoring)

```
┌─────────────────────────────────────────────────────────────────┐
│                         ChatView                                 │
│                                                                   │
│  Derived from messages (compute once):                           │
│  ├── task = messages.at(0)                                       │
│  ├── lastMessage = messages.at(-1)                               │
│  ├── modifiedMessages = combine(messages)                        │
│  ├── clineAsk = lastMessage?.ask                                 │
│  ├── enableButtons = Boolean(clineAsk)       ✅ DERIVED         │
│  └── buttonConfig = getButtonConfig(clineAsk) ✅ DERIVED        │
│                                                                   │
│  useInputState() - Shared input state                            │
│  ├── inputValue                                                  │
│  ├── activeQuote                                                 │
│  └── sendingDisabled                                             │
│                                                                   │
│  useAttachments() - File attachments                             │
│  ├── selectedImages                                              │
│  └── selectedFiles                                               │
│                                                                   │
│  useMessageUI() - Message display state                          │
│  └── expandedRows                                                │
│                                                                   │
│  useScrollBehavior() - Scroll management                         │
│  ├── virtuosoRef                                                 │
│  ├── showScrollToBottom                                          │
│  ├── isAtBottom                                                  │
│  └── ...scroll methods                                           │
│                                                                   │
│  textAreaRef = useRef() ────────────────────────┐               │
│  ├── Forward to ChatTextArea                     │               │
│  └── Use for focus() when needed                │               │
│                                                  │               │
│                                                  ▼               │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              ChatTextArea (forwardRef)                   │   │
│  │                                                           │   │
│  │  Props from ChatView:                                    │   │
│  │  ├── inputValue                                          │   │
│  │  ├── onInputChange                                       │   │
│  │  ├── ref (forwarded from ChatView) ✅ SINGLE SOURCE     │   │
│  │  └── ...                                                 │   │
│  │                                                           │   │
│  │  Internal state (not exposed):                           │   │
│  │  ├── cursorPosition           ✅ INTERNAL ONLY          │   │
│  │  ├── intendedCursorPosition   ✅ INTERNAL ONLY          │   │
│  │  ├── isTextAreaFocused        ✅ INTERNAL ONLY          │   │
│  │  ├── menu states                                         │   │
│  │  └── highlight states                                    │   │
│  │                                                           │   │
│  │  Refs ref to forwarded ref:                              │   │
│  │  └── Uses ref from parent     ✅ NO DUPLICATION         │   │
│  │                                                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘

Benefits:
✅ Single textAreaRef owned by ChatView, forwarded to ChatTextArea
✅ Focus state is internal to ChatTextArea (doesn't need to be shared)
✅ Button state derived from messages, not stored
✅ Message-derived values computed once in ChatView
✅ Clear separation: shared state vs internal state
✅ Smaller, focused hooks with single responsibilities
```

---

## State Ownership Matrix

| State Item | Current Owner | New Owner | Visibility |
|-----------|---------------|-----------|------------|
| `textAreaRef` | ❌ Both | ✅ ChatView | Forwarded to ChatTextArea |
| `isTextAreaFocused` | ❌ Both | ✅ ChatTextArea | Internal only |
| `cursorPosition` | ChatTextArea | ChatTextArea | Internal only |
| `inputValue` | ChatView | ChatView | Prop to ChatTextArea |
| `activeQuote` | ChatView | ChatView | Shared state |
| `selectedImages` | ChatView | ChatView | Shared state |
| `selectedFiles` | ChatView | ChatView | Shared state |
| `sendingDisabled` | ChatView | ChatView | Shared state |
| `enableButtons` | ❌ Stored | ✅ Derived | Computed |
| `primaryButtonText` | ❌ Stored | ✅ Derived | Computed |
| `secondaryButtonText` | ❌ Stored | ✅ Derived | Computed |
| `expandedRows` | ChatView | ChatView | Shared state |
| `lastMessage` | ❌ Both | ✅ ChatView | Computed once |
| `task` | ❌ Both | ✅ ChatView | Computed once |
| `clineAsk` | ❌ Stored | ✅ ChatView | Computed once |

---

## Hook Responsibilities Comparison

### Before: `useChatState` (Mixed Responsibilities)

```typescript
// Too many responsibilities in one hook
export function useChatState(messages: ClineMessage[]): ChatState {
  // 1. Input state
  const [inputValue, setInputValue] = useState("")
  const [activeQuote, setActiveQuote] = useState<string | null>(null)
  
  // 2. Focus state (DUPLICATE)
  const [isTextAreaFocused, setIsTextAreaFocused] = useState(false)
  
  // 3. Attachments
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  
  // 4. UI state
  const [sendingDisabled, setSendingDisabled] = useState(false)
  const [enableButtons, setEnableButtons] = useState<boolean>(false) // Should be derived
  const [primaryButtonText, setPrimaryButtonText] = useState(...) // Should be derived
  const [secondaryButtonText, setSecondaryButtonText] = useState(...) // Should be derived
  
  // 5. Layout
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  
  // 6. Refs (DUPLICATE)
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  
  // 7. Derived message state
  const lastMessage = useMemo(() => messages.at(-1), [messages])
  const task = useMemo(() => messages.at(0), [messages])
  const clineAsk = useMemo(...)
  
  return { /* returns 20+ properties */ }
}
```

---

### After: Multiple Focused Hooks

```typescript
// Hook 1: Input state (text and context)
export function useInputState() {
  const [inputValue, setInputValue] = useState("")
  const [activeQuote, setActiveQuote] = useState<string | null>(null)
  const [sendingDisabled, setSendingDisabled] = useState(false)
  
  return {
    inputValue,
    setInputValue,
    activeQuote,
    setActiveQuote,
    sendingDisabled,
    setSendingDisabled,
  }
}

// Hook 2: Attachments (images and files)
export function useAttachments() {
  const [selectedImages, setSelectedImages] = useState<string[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  
  return {
    selectedImages,
    setSelectedImages,
    selectedFiles,
    setSelectedFiles,
  }
}

// Hook 3: Message UI state
export function useMessageUI() {
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})
  
  const clearExpandedRows = useCallback(() => {
    setExpandedRows({})
  }, [])
  
  return {
    expandedRows,
    setExpandedRows,
    clearExpandedRows,
  }
}

// In ChatView - derive message state
const task = useMemo(() => messages.at(0), [messages])
const lastMessage = useMemo(() => messages.at(-1), [messages])
const clineAsk = useMemo(
  () => lastMessage?.type === "ask" ? lastMessage.ask : undefined,
  [lastMessage]
)
const enableButtons = useMemo(() => Boolean(clineAsk), [clineAsk])
const buttonConfig = useMemo(() => getButtonConfig(clineAsk), [clineAsk])
```

---

## Migration Strategy

### Step 1: Create Utility for Button Config

```typescript
// utils/button_config.ts
export function getButtonConfig(clineAsk: ClineAsk | undefined) {
  if (!clineAsk) return null
  
  switch (clineAsk) {
    case "tool":
      return { primary: "Approve", secondary: "Reject" }
    case "command":
      return { primary: "Run Command", secondary: "Reject" }
    case "followup":
      return { primary: "Continue", secondary: "Stop" }
    // ... other cases
    default:
      return { primary: "Approve", secondary: "Reject" }
  }
}
```

### Step 2: Remove Ref from useChatState

```typescript
// Remove textAreaRef from useChatState
// Move to ChatView:
const textAreaRef = useRef<HTMLTextAreaElement>(null)

// Forward to ChatTextArea:
<ChatTextArea ref={textAreaRef} ... />

// ChatTextArea uses forwarded ref instead of creating its own
```

### Step 3: Remove Focus State from useChatState

```typescript
// ChatTextArea keeps focus state internal
// Remove isTextAreaFocused from useChatState
// Remove onFocusChange callback (not needed)
```

### Step 4: Derive Button State

```typescript
// In ChatView, replace stored state with derived:
const enableButtons = useMemo(() => Boolean(clineAsk), [clineAsk])
const buttonConfig = useMemo(() => getButtonConfig(clineAsk), [clineAsk])

// Remove from useChatState:
// ❌ const [enableButtons, setEnableButtons] = useState(false)
// ❌ const [primaryButtonText, setPrimaryButtonText] = useState(...)
// ❌ const [secondaryButtonText, setSecondaryButtonText] = useState(...)
```

### Step 5: Split useChatState

```typescript
// Replace single hook with focused hooks:
const inputState = useInputState()
const attachments = useAttachments()
const messageUI = useMessageUI()

// Derive message state directly in ChatView:
const task = useMemo(() => messages.at(0), [messages])
const lastMessage = useMemo(() => messages.at(-1), [messages])
const clineAsk = useMemo(
  () => lastMessage?.type === "ask" ? lastMessage.ask : undefined,
  [lastMessage]
)
```

---

## Testing Strategy

### Unit Tests for New Hooks

```typescript
describe('useInputState', () => {
  it('should manage input value', () => { /* ... */ })
  it('should manage active quote', () => { /* ... */ })
  it('should manage sending disabled state', () => { /* ... */ })
})

describe('useAttachments', () => {
  it('should manage selected images', () => { /* ... */ })
  it('should manage selected files', () => { /* ... */ })
})

describe('useMessageUI', () => {
  it('should manage expanded rows', () => { /* ... */ })
  it('should clear expanded rows', () => { /* ... */ })
})

describe('getButtonConfig', () => {
  it('should return correct config for each ask type', () => { /* ... */ })
  it('should return null for undefined ask', () => { /* ... */ })
})
```

### Integration Tests

```typescript
describe('ChatView integration', () => {
  it('should forward ref to textarea', () => { /* ... */ })
  it('should derive button state from messages', () => { /* ... */ })
  it('should manage attachments independently', () => { /* ... */ })
})
```

---

## Success Metrics

- ✅ Zero duplicate refs
- ✅ Zero duplicate focus state
- ✅ All button state derived from messages
- ✅ Each hook has single, clear responsibility
- ✅ Less than 10 properties per hook
- ✅ No optional properties in state interfaces
- ✅ 100% test coverage for new hooks
- ✅ No regression in functionality

