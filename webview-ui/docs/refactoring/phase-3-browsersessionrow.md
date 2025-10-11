# Phase 3: BrowserSessionRow.tsx Refactoring

**File**: `/webview-ui/src/components/chat/BrowserSessionRow.tsx`  
**Current Size**: 649 lines  
**Priority**: 🟡 High  
**Estimated Effort**: 2-3 sessions

---

## 🎯 Goal

Separate browser session rendering concerns by extracting state management, page navigation, and action display into focused modules.

---

## 📋 Current Responsibilities Analysis

### Primary Concerns
1. **Browser State Management** (Lines 114-269)
   - Session state tracking
   - Current page navigation
   - Latest state aggregation
   - Mouse position tracking
   - Console logs management

2. **Message Organization** (Lines 145-226)
   - Paginate browser actions into steps
   - Organize current state vs next actions
   - Track launch messages

3. **Browser UI Components** (Lines 364-503)
   - URL bar display
   - Screenshot area with overlay
   - Mouse cursor rendering
   - Console logs toggle
   - Settings menu integration

4. **Action Rendering** (Lines 295-312, 598-629)
   - Browser action box display
   - Action text formatting
   - Coordinate display

5. **Pagination Controls** (Lines 481-499)
   - Page navigation
   - Step counter
   - Previous/Next buttons

---

## 🗂️ Proposed Module Structure

```
components/chat/browser_session_row/
├── BrowserSessionRow.tsx              # Main component (orchestrator)
├── BrowserSessionRowContent.tsx       # Content renderer (moved)
│
├── components/                        # UI Components
│   ├── BrowserWindow.tsx              # URL bar + screenshot area
│   ├── BrowserUrlBar.tsx              # URL display with settings
│   ├── BrowserScreenshot.tsx          # Screenshot with cursor overlay
│   ├── BrowserCursor.tsx              # Lines 631-647 (extract)
│   ├── BrowserActionBox.tsx           # Lines 598-629
│   ├── BrowserConsoleLogs.tsx         # Console logs section
│   └── BrowserPagination.tsx          # Page navigation controls
│
├── hooks/                             # Custom hooks
│   ├── use_browser_session_state.ts   # State management
│   ├── use_browser_pages.ts           # Message pagination logic
│   ├── use_browser_navigation.ts      # Page navigation
│   └── use_mouse_position.ts          # Mouse tracking
│
└── utils/                             # Pure functions
    ├── browser_action_utils.ts        # Action text formatting
    ├── browser_message_utils.ts       # Message organization
    └── style_constants.ts             # Inline styles (Lines 25-110)
```

---

## 📝 Step-by-Step Refactoring Plan

### **Step 1: Extract Style Constants** (15 min)
**File to create**: `browser_session_row/utils/style_constants.ts`

```typescript
export const browserSessionRowContainerInnerStyle: CSSProperties = { ... }
export const browserIconStyle: CSSProperties = { ... }
export const approveTextStyle: CSSProperties = { ... }
export const urlBarContainerStyle: CSSProperties = { ... }
export const urlTextStyle: CSSProperties = { ... }
export const imgScreenshotStyle: CSSProperties = { ... }
export const noScreenshotContainerStyle: CSSProperties = { ... }
export const noScreenshotIconStyle: CSSProperties = { ... }
// ... etc
```

**Validation**: Import and use, verify styles unchanged

---

### **Step 2: Extract Browser Action Utilities** (20 min)
**File to create**: `browser_session_row/utils/browser_action_utils.ts`

```typescript
export const getBrowserActionText = (
  action: BrowserAction,
  coordinate?: string,
  text?: string
): string => {
  switch (action) {
    case "launch": return `Launch browser at ${text}`
    case "click": return `Click (${coordinate?.replace(",", ", ")})`
    case "type": return `Type "${text}"`
    case "scroll_down": return "Scroll down"
    case "scroll_up": return "Scroll up"
    case "close": return "Close browser"
    default: return action
  }
}
```

**Validation**: Test all browser action displays

---

### **Step 3: Extract Browser Cursor Component** (10 min)
**File to create**: `browser_session_row/components/BrowserCursor.tsx`

```typescript
interface BrowserCursorProps {
  style?: CSSProperties
}

export const BrowserCursor: React.FC<BrowserCursorProps> = ({ style }) => {
  const cursorBase64 = "data:image/png;base64,iVBOR..."
  
  return (
    <img
      alt="cursor"
      src={cursorBase64}
      style={{ width: "17px", height: "22px", ...style }}
    />
  )
}
```

**Validation**: Verify cursor renders correctly

---

### **Step 4: Extract Browser Action Box** (15 min)
**File to create**: `browser_session_row/components/BrowserActionBox.tsx`

```typescript
interface BrowserActionBoxProps {
  action: BrowserAction
  coordinate?: string
  text?: string
}

export const BrowserActionBox: React.FC<BrowserActionBoxProps> = ({ action, coordinate, text }) => {
  return (
    <div style={browserActionBoxContainerStyle}>
      <div style={browserActionBoxContainerInnerStyle}>
        <div style={browseActionRowContainerStyle}>
          <span style={browseActionRowStyle}>
            <span style={browseActionTextStyle}>Browse Action: </span>
            {getBrowserActionText(action, coordinate, text)}
          </span>
        </div>
      </div>
    </div>
  )
}
```

**Validation**: Test action box display

---

### **Step 5: Extract Browser Pages Hook** (45 min)
**File to create**: `browser_session_row/hooks/use_browser_pages.ts`

```typescript
interface BrowserPage {
  currentState: {
    url?: string
    screenshot?: string
    mousePosition?: string
    consoleLogs?: string
    messages: ClineMessage[]
  }
  nextAction?: {
    messages: ClineMessage[]
  }
}

export const useBrowserPages = (messages: ClineMessage[]) => {
  const pages = useMemo(() => {
    const result: BrowserPage[] = []
    let currentStateMessages: ClineMessage[] = []
    let nextActionMessages: ClineMessage[] = []
    
    // Organize messages into pages logic (Lines 145-226)
    messages.forEach((message) => { ... })
    
    return result
  }, [messages])
  
  return { pages }
}
```

**Validation**: Test page organization with various message sequences

---

### **Step 6: Extract Browser Navigation Hook** (25 min)
**File to create**: `browser_session_row/hooks/use_browser_navigation.ts`

```typescript
export const useBrowserNavigation = (totalPages: number, isBrowsing: boolean) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0)
  
  // Auto-advance to latest page
  useEffect(() => {
    setCurrentPageIndex(totalPages - 1)
  }, [totalPages])
  
  const isLastPage = currentPageIndex === totalPages - 1
  
  const goToPrevious = useCallback(() => {
    if (currentPageIndex > 0 && !isBrowsing) {
      setCurrentPageIndex(i => i - 1)
    }
  }, [currentPageIndex, isBrowsing])
  
  const goToNext = useCallback(() => {
    if (currentPageIndex < totalPages - 1 && !isBrowsing) {
      setCurrentPageIndex(i => i + 1)
    }
  }, [currentPageIndex, totalPages, isBrowsing])
  
  return {
    currentPageIndex,
    isLastPage,
    goToPrevious,
    goToNext,
  }
}
```

**Validation**: Test page navigation

---

### **Step 7: Extract Mouse Position Hook** (20 min)
**File to create**: `browser_session_row/hooks/use_mouse_position.ts`

```typescript
export const useMousePosition = (
  currentPage: BrowserPage | undefined,
  isBrowsing: boolean,
  displayState: { mousePosition: string }
) => {
  const latestClickPosition = useMemo(() => {
    if (!isBrowsing) return undefined
    
    // Look through current page's next actions for latest browser_action
    const actions = currentPage?.nextAction?.messages || []
    for (let i = actions.length - 1; i >= 0; i--) {
      const message = actions[i]
      if (message.say === "browser_action") {
        const browserAction = JSON.parse(message.text || "{}") as ClineSayBrowserAction
        if (browserAction.action === "click" && browserAction.coordinate) {
          return browserAction.coordinate
        }
      }
    }
    return undefined
  }, [isBrowsing, currentPage?.nextAction?.messages])
  
  // Use latest click position while browsing, otherwise use display state
  const mousePosition = isBrowsing 
    ? latestClickPosition || displayState.mousePosition 
    : displayState.mousePosition
  
  return { mousePosition }
}
```

**Validation**: Test mouse cursor position updates

---

### **Step 8: Extract Browser Session State Hook** (40 min)
**File to create**: `browser_session_row/hooks/use_browser_session_state.ts`

```typescript
export const useBrowserSessionState = (
  messages: ClineMessage[],
  lastModifiedMessage?: ClineMessage,
  isLast?: boolean
) => {
  const isLastApiReqInterrupted = useMemo(() => { ... }, [messages, lastModifiedMessage, isLast])
  const isLastMessageResume = useMemo(() => { ... }, [lastModifiedMessage?.ask])
  const isBrowsing = useMemo(() => { ... }, [isLast, messages, isLastApiReqInterrupted])
  
  const initialUrl = useMemo(() => {
    const launchMessage = messages.find(m => 
      m.ask === "browser_action_launch" || m.say === "browser_action_launch"
    )
    return launchMessage?.text || ""
  }, [messages])
  
  const isAutoApproved = useMemo(() => {
    const launchMessage = messages.find(m => 
      m.ask === "browser_action_launch" || m.say === "browser_action_launch"
    )
    return launchMessage?.say === "browser_action_launch"
  }, [messages])
  
  return {
    isLastApiReqInterrupted,
    isLastMessageResume,
    isBrowsing,
    initialUrl,
    isAutoApproved,
  }
}
```

**Validation**: Test session state detection

---

### **Step 9: Extract Console Logs Component** (25 min)
**File to create**: `browser_session_row/components/BrowserConsoleLogs.tsx`

```typescript
interface BrowserConsoleLogsProps {
  consoleLogs?: string
}

export const BrowserConsoleLogs: React.FC<BrowserConsoleLogsProps> = ({ consoleLogs }) => {
  const [isExpanded, setIsExpanded] = useState(false)
  
  return (
    <div style={consoleLogsContainerStyle}>
      <button
        aria-expanded={isExpanded}
        aria-label={`${isExpanded ? "Collapse" : "Expand"} console logs`}
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ ... }}
        type="button"
      >
        <span className={`codicon codicon-chevron-${isExpanded ? "down" : "right"}`}></span>
        <span style={consoleLogsTextStyle}>Console Logs</span>
      </button>
      {isExpanded && (
        <CodeBlock source={`\`\`\`shell\n${consoleLogs || "(No new logs)"}\n\`\`\``} />
      )}
    </div>
  )
}
```

**Validation**: Test console logs expand/collapse

---

### **Step 10: Extract Browser Screenshot Component** (30 min)
**File to create**: `browser_session_row/components/BrowserScreenshot.tsx`

```typescript
interface BrowserScreenshotProps {
  screenshot?: string
  mousePosition?: string
  viewportWidth: number
  viewportHeight: number
}

export const BrowserScreenshot: React.FC<BrowserScreenshotProps> = ({
  screenshot,
  mousePosition,
  viewportWidth,
  viewportHeight,
}) => {
  const { browserSettings } = useExtensionState()
  
  return (
    <div
      style={{
        width: "100%",
        paddingBottom: `${(viewportHeight / viewportWidth) * 100}%`,
        position: "relative",
        backgroundColor: "var(--vscode-input-background)",
      }}
    >
      {screenshot ? (
        <img
          alt="Browser screenshot"
          onClick={() => FileServiceClient.openImage(...)}
          src={screenshot}
          style={imgScreenshotStyle}
        />
      ) : (
        <div style={noScreenshotContainerStyle}>
          <span className="codicon codicon-globe" style={noScreenshotIconStyle} />
        </div>
      )}
      {mousePosition && (
        <BrowserCursor
          style={{
            position: "absolute",
            top: `${(parseInt(mousePosition.split(",")[1]) / viewportHeight) * 100}%`,
            left: `${(parseInt(mousePosition.split(",")[0]) / viewportWidth) * 100}%`,
            transition: "top 0.3s ease-out, left 0.3s ease-out",
          }}
        />
      )}
    </div>
  )
}
```

**Validation**: Test screenshot display and cursor overlay

---

### **Step 11: Extract Browser URL Bar Component** (20 min)
**File to create**: `browser_session_row/components/BrowserUrlBar.tsx`

```typescript
interface BrowserUrlBarProps {
  url: string
}

export const BrowserUrlBar: React.FC<BrowserUrlBarProps> = ({ url }) => {
  return (
    <div style={urlBarContainerStyle}>
      <div
        style={{
          flex: 1,
          backgroundColor: "var(--vscode-input-background)",
          border: "1px solid var(--vscode-input-border)",
          borderRadius: "4px",
          padding: "3px 5px",
          minWidth: 0,
          color: url ? "var(--vscode-input-foreground)" : "var(--vscode-descriptionForeground)",
          fontSize: "12px",
        }}
      >
        <div style={urlTextStyle}>{url || "http"}</div>
      </div>
      <BrowserSettingsMenu />
    </div>
  )
}
```

**Validation**: Test URL display

---

### **Step 12: Extract Browser Window Component** (35 min)
**File to create**: `browser_session_row/components/BrowserWindow.tsx`

```typescript
interface BrowserWindowProps {
  url: string
  screenshot?: string
  mousePosition?: string
  consoleLogs?: string
  maxWidth?: number
}

export const BrowserWindow: React.FC<BrowserWindowProps> = ({
  url,
  screenshot,
  mousePosition,
  consoleLogs,
  maxWidth,
}) => {
  const { browserSettings } = useExtensionState()
  
  return (
    <div
      style={{
        borderRadius: 3,
        border: "1px solid var(--vscode-editorGroup-border)",
        backgroundColor: CODE_BLOCK_BG_COLOR,
        maxWidth,
        margin: "0 auto 10px auto",
      }}
    >
      <BrowserUrlBar url={url} />
      <BrowserScreenshot
        screenshot={screenshot}
        mousePosition={mousePosition}
        viewportWidth={browserSettings.viewport.width}
        viewportHeight={browserSettings.viewport.height}
      />
      <BrowserConsoleLogs consoleLogs={consoleLogs} />
    </div>
  )
}
```

**Validation**: Test complete browser window

---

### **Step 13: Extract Browser Pagination Component** (20 min)
**File to create**: `browser_session_row/components/BrowserPagination.tsx`

```typescript
interface BrowserPaginationProps {
  currentPage: number
  totalPages: number
  isBrowsing: boolean
  onPrevious: () => void
  onNext: () => void
}

export const BrowserPagination: React.FC<BrowserPaginationProps> = ({
  currentPage,
  totalPages,
  isBrowsing,
  onPrevious,
  onNext,
}) => {
  if (totalPages <= 1) return null
  
  return (
    <div style={paginationContainerStyle}>
      <div>
        Step {currentPage + 1} of {totalPages}
      </div>
      <div style={paginationButtonGroupStyle}>
        <VSCodeButton disabled={currentPage === 0 || isBrowsing} onClick={onPrevious}>
          Previous
        </VSCodeButton>
        <VSCodeButton disabled={currentPage === totalPages - 1 || isBrowsing} onClick={onNext}>
          Next
        </VSCodeButton>
      </div>
    </div>
  )
}
```

**Validation**: Test pagination controls

---

### **Step 14: Refactor Main BrowserSessionRow Component** (30 min)
**Update**: `BrowserSessionRow.tsx` to orchestrate extracted modules

```typescript
const BrowserSessionRow = memo((props: BrowserSessionRowProps) => {
  const { messages, isLast, onHeightChange, lastModifiedMessage } = props
  const { browserSettings } = useExtensionState()
  
  const prevHeightRef = useRef(0)
  const [maxActionHeight, setMaxActionHeight] = useState(0)
  
  // Use extracted hooks
  const sessionState = useBrowserSessionState(messages, lastModifiedMessage, isLast)
  const { pages } = useBrowserPages(messages)
  const navigation = useBrowserNavigation(pages.length, sessionState.isBrowsing)
  
  const currentPage = pages[navigation.currentPageIndex]
  
  // Get display state
  const latestState = useMemo(() => { ... }, [pages])
  const displayState = navigation.isLastPage ? { ... } : { ... }
  
  const { mousePosition } = useMousePosition(currentPage, sessionState.isBrowsing, displayState)
  
  const browserSessionRowRef = useRef<HTMLDivElement>(null)
  const browserSessionRowSize = useSize(browserSessionRowRef)
  
  // Height tracking effect
  useEffect(() => { ... }, [height, isLast, onHeightChange])
  
  const maxWidth = browserSettings.viewport.width < BROWSER_VIEWPORT_PRESETS["Small Desktop (900x600)"].width 
    ? 200 
    : undefined
  
  return (
    <div className="group relative" ref={browserSessionRowRef} style={...}>
      <div style={browserSessionRowContainerInnerStyle}>
        {sessionState.isBrowsing && !sessionState.isLastMessageResume ? (
          <ProgressIndicator />
        ) : (
          <span className="codicon codicon-inspect" style={browserIconStyle}></span>
        )}
        <span style={approveTextStyle}>
          {sessionState.isAutoApproved 
            ? "Marie is using the browser:" 
            : "Marie wants to use the browser:"}
        </span>
      </div>
      
      <BrowserWindow
        url={displayState.url}
        screenshot={displayState.screenshot}
        mousePosition={mousePosition}
        consoleLogs={displayState.consoleLogs}
        maxWidth={maxWidth}
      />
      
      <div style={{ minHeight: maxActionHeight }}>
        {/* Action content */}
        {currentPage?.nextAction?.messages.map((message) => (
          <BrowserSessionRowContent key={message.ts} message={message} {...props} />
        ))}
      </div>
      
      <BrowserPagination
        currentPage={navigation.currentPageIndex}
        totalPages={pages.length}
        isBrowsing={sessionState.isBrowsing}
        onPrevious={navigation.goToPrevious}
        onNext={navigation.goToNext}
      />
    </div>
  )
}, deepEqual)
```

**Validation**: Full regression test

---

## ✅ Validation Checklist

- [ ] Browser window renders correctly
- [ ] Screenshot displays properly
- [ ] Mouse cursor moves correctly
- [ ] Console logs toggle works
- [ ] Page navigation functions
- [ ] Browser actions display
- [ ] URL bar shows current page
- [ ] Settings menu accessible
- [ ] Height tracking still works
- [ ] No TypeScript/linter errors

---

## 📊 Expected Outcome

### Before
- BrowserSessionRow.tsx: 649 lines
- Complex state management

### After
- BrowserSessionRow.tsx: ~150 lines (orchestrator)
- BrowserSessionRowContent.tsx: ~80 lines
- 7 components: ~50-150 lines each
- 4 custom hooks: ~50-100 lines each
- 2 utility files: ~30-50 lines each
- **Total**: More maintainable and testable

---

## 🚨 Risks & Mitigation

### Risk: Mouse position tracking breaks
**Mitigation**: Test with various click sequences

### Risk: Page navigation state issues
**Mitigation**: Test auto-advance and manual navigation

### Risk: Screenshot rendering performance
**Mitigation**: Keep memoization, test with rapid updates

---

*Dependencies: Learn from Phase 1 patterns*  
*Start After: Phase 1 or 2 complete (optional)*

