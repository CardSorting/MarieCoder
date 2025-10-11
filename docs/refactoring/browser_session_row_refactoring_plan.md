# BrowserSessionRow.tsx Refactoring Plan

**Target File**: `webview-ui/src/components/chat/BrowserSessionRow.tsx`  
**Current Size**: 649 lines (monolithic)  
**Status**: Planning Phase  
**Date**: October 11, 2025

---

## 🎯 Refactoring Goals

### Primary Objectives
1. **Component Decomposition** - Break down large component into focused subcomponents
2. **Extract Browser Action Logic** - Separate action handling from rendering
3. **Create Custom Hooks** - Extract state and pagination logic
4. **Improve Reusability** - Make screenshot, console, and action components reusable

### Success Criteria
- ✅ Main component < 150 lines
- ✅ All subcomponents < 120 lines
- ✅ All hooks < 80 lines
- ✅ Zero linting errors
- ✅ 100% backward compatible
- ✅ Improved testability

---

## 📊 Current Analysis

### File Structure Overview
```
BrowserSessionRow.tsx (649 lines)
├── Imports & Interfaces (25 lines)
├── Style Constants (85 lines)
├── BrowserSessionRow Component (539 lines)
│   ├── State Management (~60 lines)
│   ├── Screenshot Rendering (~120 lines)
│   ├── Browser Actions (~150 lines)
│   ├── Console Logs (~100 lines)
│   ├── Pagination (~60 lines)
│   └── Event Handlers (~49 lines)
└── Export
```

### Key Responsibilities Identified

1. **Screenshot Display** (~120 lines)
   - Screenshot rendering
   - URL bar display
   - Viewport size handling
   - Image loading/error handling
   - Click to enlarge

2. **Browser Actions** (~150 lines)
   - Action approval/rejection UI
   - Action result display
   - Action state management
   - Multiple action types (click, type, navigate, etc.)

3. **Console Logs** (~100 lines)
   - Console message display
   - Log filtering (errors only)
   - Pagination
   - Expandable log entries

4. **Browser State** (~60 lines)
   - Session started/ended
   - Screenshot state
   - Console state
   - Action state

5. **Pagination** (~60 lines)
   - Page navigation
   - Page count calculation
   - Current page tracking

---

## 🏗️ Proposed Architecture

### Module Structure

```
BrowserSessionRow.tsx (Main - ~130 lines)
├── Orchestrates browser session display
├── Delegates to specialized components
└── Minimal rendering logic

├── hooks/
│   ├── use_browser_state.ts (~70 lines)
│   │   ├── Session state management
│   │   ├── Screenshot tracking
│   │   ├── Console tracking
│   │   └── Action tracking
│   │
│   ├── use_browser_actions.ts (~90 lines)
│   │   ├── Action approval/rejection
│   │   ├── Action result handling
│   │   └── Action state updates
│   │
│   └── use_pagination.ts (~60 lines)
│       ├── Page calculation
│       ├── Page navigation
│       └── Items per page logic
│
├── components/
│   ├── BrowserScreenshot.tsx (~110 lines)
│   │   ├── Screenshot rendering
│   │   ├── URL bar display
│   │   ├── Viewport overlay
│   │   ├── No screenshot state
│   │   └── Click to enlarge
│   │
│   ├── BrowserActionCard.tsx (~120 lines)
│   │   ├── Action display
│   │   ├── Approval buttons
│   │   ├── Action result
│   │   └── Action type formatting
│   │
│   ├── BrowserConsoleLogs.tsx (~100 lines)
│   │   ├── Console display
│   │   ├── Log filtering
│   │   ├── Log formatting
│   │   └── Expandable logs
│   │
│   ├── BrowserPagination.tsx (~70 lines)
│   │   ├── Pagination controls
│   │   ├── Page info display
│   │   └── Navigation buttons
│   │
│   └── BrowserSettingsMenu.tsx (EXISTING - reuse)
│
└── utils/
    ├── browser_action_formatter.ts (~80 lines)
    │   ├── Format action descriptions
    │   ├── Extract action parameters
    │   └── Generate readable text
    │
    └── style_constants.ts (~50 lines)
        ├── Common styles
        └── Color constants
```

### Total Distribution
- **Main Component**: ~130 lines (80% reduction)
- **3 New Hooks**: ~220 lines
- **4 New Components**: ~400 lines
- **2 Utility Modules**: ~130 lines
- **1 Existing Component**: ~100 lines (reused)
- **System Total**: ~980 lines (distributed, reusable)

---

## 📋 Implementation Plan

### Phase 1: Extract Hooks (~3 hours)

#### Step 1.1: Browser State Hook
**File**: `webview-ui/src/components/chat/BrowserSessionRow/hooks/use_browser_state.ts`

```typescript
import { useState, useMemo } from "react"
import type { ClineMessage, BrowserAction } from "@shared/ExtensionMessage"

interface BrowserState {
    hasScreenshot: boolean
    currentUrl?: string
    viewportSize?: { width: number; height: number }
    consoleLogs: string[]
    pendingActions: BrowserAction[]
    sessionActive: boolean
}

export function useBrowserState(
    messages: ClineMessage[],
    lastModifiedMessage?: ClineMessage
): BrowserState {
    const [sessionActive, setSessionActive] = useState(false)

    const browserState = useMemo(() => {
        let hasScreenshot = false
        let currentUrl: string | undefined
        let viewportSize: { width: number; height: number } | undefined
        const consoleLogs: string[] = []
        const pendingActions: BrowserAction[] = []

        // Analyze messages to extract browser state
        for (const message of messages) {
            if (message.say === "browser_action_launch") {
                setSessionActive(true)
            } else if (message.say === "browser_action_close") {
                setSessionActive(false)
            }

            // Extract screenshot info
            if (message.images && message.images.length > 0) {
                hasScreenshot = true
            }

            // Extract URL
            if (message.text && message.text.includes("http")) {
                // Parse URL from message
            }

            // Extract console logs
            if (message.say === "browser_action_console") {
                consoleLogs.push(message.text || "")
            }

            // Extract pending actions
            if (message.ask === "browser_action_approve") {
                const action = JSON.parse(message.text || "{}")
                pendingActions.push(action)
            }
        }

        return {
            hasScreenshot,
            currentUrl,
            viewportSize,
            consoleLogs,
            pendingActions,
            sessionActive,
        }
    }, [messages, lastModifiedMessage])

    return browserState
}
```

#### Step 1.2: Browser Actions Hook
**File**: `webview-ui/src/components/chat/BrowserSessionRow/hooks/use_browser_actions.ts`

```typescript
import { useCallback, useState } from "react"
import type { BrowserAction, BrowserActionResult } from "@shared/ExtensionMessage"
import { TaskServiceClient } from "@/services/grpc-client"

interface UseBrowserActionsResult {
    approveAction: (action: BrowserAction) => Promise<void>
    rejectAction: (action: BrowserAction) => Promise<void>
    isProcessing: boolean
    error?: string
}

export function useBrowserActions(): UseBrowserActionsResult {
    const [isProcessing, setIsProcessing] = useState(false)
    const [error, setError] = useState<string>()

    const approveAction = useCallback(async (action: BrowserAction) => {
        setIsProcessing(true)
        setError(undefined)

        try {
            await TaskServiceClient.approveAsk({ response: "yesButtonTapped" })
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsProcessing(false)
        }
    }, [])

    const rejectAction = useCallback(async (action: BrowserAction) => {
        setIsProcessing(true)
        setError(undefined)

        try {
            await TaskServiceClient.approveAsk({ response: "noButtonTapped" })
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setIsProcessing(false)
        }
    }, [])

    return {
        approveAction,
        rejectAction,
        isProcessing,
        error,
    }
}
```

#### Step 1.3: Pagination Hook
**File**: `webview-ui/src/components/chat/BrowserSessionRow/hooks/use_pagination.ts`

```typescript
import { useState, useMemo, useCallback } from "react"

interface UsePaginationResult {
    currentPage: number
    totalPages: number
    paginatedItems: any[]
    goToNextPage: () => void
    goToPreviousPage: () => void
    goToPage: (page: number) => void
}

export function usePagination<T>(
    items: T[],
    itemsPerPage: number = 10
): UsePaginationResult {
    const [currentPage, setCurrentPage] = useState(1)

    const totalPages = useMemo(() => {
        return Math.ceil(items.length / itemsPerPage)
    }, [items.length, itemsPerPage])

    const paginatedItems = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        return items.slice(startIndex, endIndex)
    }, [items, currentPage, itemsPerPage])

    const goToNextPage = useCallback(() => {
        setCurrentPage((prev) => Math.min(prev + 1, totalPages))
    }, [totalPages])

    const goToPreviousPage = useCallback(() => {
        setCurrentPage((prev) => Math.max(prev - 1, 1))
    }, [])

    const goToPage = useCallback((page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)))
    }, [totalPages])

    return {
        currentPage,
        totalPages,
        paginatedItems,
        goToNextPage,
        goToPreviousPage,
        goToPage,
    }
}
```

---

### Phase 2: Create Components (~5 hours)

#### Step 2.1: Browser Screenshot Component
**File**: `webview-ui/src/components/chat/BrowserSessionRow/components/BrowserScreenshot.tsx`

```typescript
import { memo, useState, CSSProperties } from "react"
import { BROWSER_VIEWPORT_PRESETS } from "@shared/BrowserSettings"

interface BrowserScreenshotProps {
    screenshotUrl?: string
    currentUrl?: string
    viewportSize?: { width: number; height: number }
    onImageClick?: () => void
}

const containerStyle: CSSProperties = {
    position: "relative",
    width: "100%",
    aspectRatio: "16/10",
    backgroundColor: "var(--vscode-editor-background)",
    border: "1px solid var(--vscode-editorGroup-border)",
    borderRadius: "3px",
    overflow: "hidden",
}

const urlBarStyle: CSSProperties = {
    margin: "5px auto",
    width: "calc(100% - 10px)",
    display: "flex",
    alignItems: "center",
    gap: "4px",
    padding: "4px 8px",
    backgroundColor: "var(--vscode-input-background)",
    border: "1px solid var(--vscode-input-border)",
    borderRadius: "2px",
}

const imageStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "contain",
    cursor: "pointer",
}

const noScreenshotStyle: CSSProperties = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    textAlign: "center",
}

export const BrowserScreenshot = memo(({ 
    screenshotUrl,
    currentUrl,
    viewportSize,
    onImageClick 
}: BrowserScreenshotProps) => {
    const [imageError, setImageError] = useState(false)

    const handleImageError = () => {
        setImageError(true)
    }

    const viewportPreset = viewportSize 
        ? BROWSER_VIEWPORT_PRESETS.find(
            p => p.width === viewportSize.width && p.height === viewportSize.height
          )
        : undefined

    return (
        <div>
            {/* URL Bar */}
            {currentUrl && (
                <div style={urlBarStyle}>
                    <span className="codicon codicon-link" />
                    <span style={{ 
                        textOverflow: "ellipsis",
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        flex: 1,
                    }}>
                        {currentUrl}
                    </span>
                    {viewportPreset && (
                        <span style={{ 
                            fontSize: "0.85em",
                            opacity: 0.7,
                        }}>
                            {viewportPreset.name}
                        </span>
                    )}
                </div>
            )}

            {/* Screenshot Container */}
            <div style={containerStyle}>
                {screenshotUrl && !imageError ? (
                    <img
                        src={screenshotUrl}
                        alt="Browser screenshot"
                        style={imageStyle}
                        onClick={onImageClick}
                        onError={handleImageError}
                    />
                ) : (
                    <div style={noScreenshotStyle}>
                        <span 
                            className="codicon codicon-browser"
                            style={{ 
                                fontSize: "80px",
                                color: "var(--vscode-descriptionForeground)",
                            }}
                        />
                        <div style={{ marginTop: "10px", opacity: 0.7 }}>
                            {imageError ? "Failed to load screenshot" : "No screenshot available"}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
})

BrowserScreenshot.displayName = "BrowserScreenshot"
```

#### Step 2.2: Browser Action Card Component
**File**: `webview-ui/src/components/chat/BrowserSessionRow/components/BrowserActionCard.tsx`

```typescript
import { memo, CSSProperties } from "react"
import type { BrowserAction, BrowserActionResult } from "@shared/ExtensionMessage"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import CodeBlock, { CODE_BLOCK_BG_COLOR } from "@/components/common/CodeBlock"
import { formatBrowserAction } from "../utils/browser_action_formatter"

interface BrowserActionCardProps {
    action: BrowserAction
    result?: BrowserActionResult
    isPending: boolean
    onApprove?: () => void
    onReject?: () => void
}

const cardStyle: CSSProperties = {
    padding: "10px 0 0 0",
}

const cardInnerStyle: CSSProperties = {
    borderRadius: 3,
    backgroundColor: CODE_BLOCK_BG_COLOR,
    overflow: "hidden",
    border: "1px solid var(--vscode-editorGroup-border)",
}

const actionRowStyle: CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "9px 10px",
}

const buttonGroupStyle: CSSProperties = {
    display: "flex",
    gap: "6px",
    marginLeft: "auto",
}

export const BrowserActionCard = memo(({ 
    action,
    result,
    isPending,
    onApprove,
    onReject 
}: BrowserActionCardProps) => {
    const actionDescription = formatBrowserAction(action)

    return (
        <div style={cardStyle}>
            <div style={cardInnerStyle}>
                {/* Action Description */}
                <div style={actionRowStyle}>
                    <div style={{ 
                        whiteSpace: "normal",
                        wordBreak: "break-word",
                        flex: 1,
                    }}>
                        <span style={{ fontWeight: 500 }}>
                            {action.action}:
                        </span>{" "}
                        <span>{actionDescription}</span>
                    </div>

                    {/* Approval Buttons */}
                    {isPending && (
                        <div style={buttonGroupStyle}>
                            <VSCodeButton onClick={onApprove}>
                                Approve
                            </VSCodeButton>
                            <VSCodeButton onClick={onReject}>
                                Reject
                            </VSCodeButton>
                        </div>
                    )}
                </div>

                {/* Action Result */}
                {result && (
                    <div style={{ 
                        padding: "10px",
                        borderTop: "1px solid var(--vscode-editorGroup-border)",
                        backgroundColor: "var(--vscode-editor-background)",
                    }}>
                        {result.success ? (
                            <div style={{ color: "var(--vscode-testing-iconPassed)" }}>
                                <span className="codicon codicon-check" />
                                {" "}Action completed successfully
                            </div>
                        ) : (
                            <div style={{ color: "var(--vscode-errorForeground)" }}>
                                <span className="codicon codicon-error" />
                                {" "}Action failed: {result.error}
                            </div>
                        )}
                    </div>
                )}

                {/* Action Details (expandable) */}
                {action.coordinate && (
                    <div style={{ 
                        padding: "10px",
                        borderTop: "1px solid var(--vscode-editorGroup-border)",
                        fontSize: "0.9em",
                        opacity: 0.8,
                    }}>
                        Position: ({action.coordinate.x}, {action.coordinate.y})
                    </div>
                )}
            </div>
        </div>
    )
})

BrowserActionCard.displayName = "BrowserActionCard"
```

#### Step 2.3: Browser Console Logs Component
**File**: `webview-ui/src/components/chat/BrowserSessionRow/components/BrowserConsoleLogs.tsx`

```typescript
import { memo, useState, CSSProperties } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"
import CodeBlock from "@/components/common/CodeBlock"
import { BrowserPagination } from "./BrowserPagination"
import { usePagination } from "../hooks/use_pagination"

interface BrowserConsoleLogsProps {
    logs: string[]
    onSetQuote?: (text: string) => void
}

const containerStyle: CSSProperties = {
    width: "100%",
    marginTop: "15px",
}

const headerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "10px",
}

const titleStyle: CSSProperties = {
    fontSize: "0.9em",
    fontWeight: "bold",
    opacity: 0.8,
}

export const BrowserConsoleLogs = memo(({ 
    logs,
    onSetQuote 
}: BrowserConsoleLogsProps) => {
    const [showErrorsOnly, setShowErrorsOnly] = useState(false)

    const filteredLogs = showErrorsOnly
        ? logs.filter(log => log.toLowerCase().includes("error"))
        : logs

    const {
        currentPage,
        totalPages,
        paginatedItems,
        goToNextPage,
        goToPreviousPage,
    } = usePagination(filteredLogs, 10)

    if (logs.length === 0) {
        return null
    }

    return (
        <div style={containerStyle}>
            {/* Header */}
            <div style={headerStyle}>
                <div style={titleStyle}>
                    Console Logs ({filteredLogs.length})
                </div>
                <VSCodeButton
                    appearance="secondary"
                    onClick={() => setShowErrorsOnly(!showErrorsOnly)}
                >
                    {showErrorsOnly ? "Show All" : "Errors Only"}
                </VSCodeButton>
            </div>

            {/* Logs */}
            <div>
                {paginatedItems.map((log, index) => (
                    <div 
                        key={index}
                        style={{ marginBottom: "8px" }}
                    >
                        <CodeBlock
                            code={log}
                            language="log"
                            onQuote={onSetQuote}
                        />
                    </div>
                ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <BrowserPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onNext={goToNextPage}
                    onPrevious={goToPreviousPage}
                />
            )}
        </div>
    )
})

BrowserConsoleLogs.displayName = "BrowserConsoleLogs"
```

#### Step 2.4: Browser Pagination Component
**File**: `webview-ui/src/components/chat/BrowserSessionRow/components/BrowserPagination.tsx`

```typescript
import { memo, CSSProperties } from "react"
import { VSCodeButton } from "@vscode/webview-ui-toolkit/react"

interface BrowserPaginationProps {
    currentPage: number
    totalPages: number
    onNext: () => void
    onPrevious: () => void
}

const containerStyle: CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 0px",
    marginTop: "15px",
    borderTop: "1px solid var(--vscode-editorGroup-border)",
}

const buttonGroupStyle: CSSProperties = {
    display: "flex",
    gap: "4px",
}

const pageInfoStyle: CSSProperties = {
    fontSize: "0.9em",
    opacity: 0.8,
}

export const BrowserPagination = memo(({ 
    currentPage,
    totalPages,
    onNext,
    onPrevious 
}: BrowserPaginationProps) => {
    return (
        <div style={containerStyle}>
            <div style={pageInfoStyle}>
                Page {currentPage} of {totalPages}
            </div>
            <div style={buttonGroupStyle}>
                <VSCodeButton
                    appearance="icon"
                    onClick={onPrevious}
                    disabled={currentPage === 1}
                >
                    <span className="codicon codicon-chevron-left" />
                </VSCodeButton>
                <VSCodeButton
                    appearance="icon"
                    onClick={onNext}
                    disabled={currentPage === totalPages}
                >
                    <span className="codicon codicon-chevron-right" />
                </VSCodeButton>
            </div>
        </div>
    )
})

BrowserPagination.displayName = "BrowserPagination"
```

---

### Phase 3: Utility Functions (~1 hour)

#### Step 3.1: Browser Action Formatter
**File**: `webview-ui/src/components/chat/BrowserSessionRow/utils/browser_action_formatter.ts`

```typescript
import type { BrowserAction } from "@shared/ExtensionMessage"

/**
 * Formats browser action into human-readable description
 */
export function formatBrowserAction(action: BrowserAction): string {
    switch (action.action) {
        case "launch":
            return `Launch browser at ${action.url || "about:blank"}`
        
        case "click":
            return action.coordinate
                ? `Click at (${action.coordinate.x}, ${action.coordinate.y})`
                : "Click element"
        
        case "type":
            return `Type: "${action.text || ""}"`
        
        case "navigate":
            return `Navigate to ${action.url || ""}`
        
        case "screenshot":
            return "Take screenshot"
        
        case "console":
            return "Get console logs"
        
        case "close":
            return "Close browser"
        
        case "scroll":
            return action.coordinate
                ? `Scroll to (${action.coordinate.x}, ${action.coordinate.y})`
                : "Scroll page"
        
        default:
            return action.action
    }
}

/**
 * Extract key parameters from browser action
 */
export function extractActionParameters(action: BrowserAction): Record<string, any> {
    const params: Record<string, any> = {}

    if (action.url) params.url = action.url
    if (action.text) params.text = action.text
    if (action.coordinate) params.coordinate = action.coordinate
    if (action.selector) params.selector = action.selector

    return params
}

/**
 * Determine if action requires approval
 */
export function requiresApproval(action: BrowserAction): boolean {
    const autoApproveActions = ["screenshot", "console"]
    return !autoApproveActions.includes(action.action)
}
```

---

### Phase 4: Main Component Refactoring (~2 hours)

#### Step 4.1: Simplified BrowserSessionRow
**File**: `webview-ui/src/components/chat/BrowserSessionRow.tsx` (Refactored)

```typescript
import { memo, useCallback } from "react"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { useBrowserState } from "./hooks/use_browser_state"
import { useBrowserActions } from "./hooks/use_browser_actions"
import { BrowserScreenshot } from "./components/BrowserScreenshot"
import { BrowserActionCard } from "./components/BrowserActionCard"
import { BrowserConsoleLogs } from "./components/BrowserConsoleLogs"
import { BrowserSettingsMenu } from "@/components/browser/BrowserSettingsMenu"

interface BrowserSessionRowProps {
    messages: ClineMessage[]
    expandedRows: Record<number, boolean>
    onToggleExpand: (messageTs: number) => void
    lastModifiedMessage?: ClineMessage
    isLast: boolean
    onHeightChange: (isTaller: boolean) => void
    onSetQuote: (text: string) => void
}

/**
 * Renders browser session information including screenshot, actions, and console
 * Simplified main component that delegates to specialized subcomponents
 */
export const BrowserSessionRow = memo(({ 
    messages,
    expandedRows,
    onToggleExpand,
    lastModifiedMessage,
    isLast,
    onHeightChange,
    onSetQuote 
}: BrowserSessionRowProps) => {
    // Extract browser state
    const browserState = useBrowserState(messages, lastModifiedMessage)
    
    // Browser action handling
    const { approveAction, rejectAction, isProcessing } = useBrowserActions()

    // Handle screenshot click (enlarge)
    const handleScreenshotClick = useCallback(() => {
        // Open screenshot in full view
    }, [])

    return (
        <div style={{ padding: "15px 0" }}>
            {/* Browser Session Status */}
            {browserState.sessionActive && (
                <div style={{ 
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "15px",
                }}>
                    <span 
                        className="codicon codicon-browser"
                        style={{ color: "var(--vscode-foreground)" }}
                    />
                    <span style={{ fontWeight: "bold" }}>
                        Browser Session Active
                    </span>
                    <BrowserSettingsMenu />
                </div>
            )}

            {/* Screenshot */}
            {browserState.hasScreenshot && (
                <BrowserScreenshot
                    screenshotUrl={browserState.screenshotUrl}
                    currentUrl={browserState.currentUrl}
                    viewportSize={browserState.viewportSize}
                    onImageClick={handleScreenshotClick}
                />
            )}

            {/* Pending Actions */}
            {browserState.pendingActions.map((action, index) => (
                <BrowserActionCard
                    key={index}
                    action={action}
                    isPending={true}
                    onApprove={() => approveAction(action)}
                    onReject={() => rejectAction(action)}
                />
            ))}

            {/* Console Logs */}
            {browserState.consoleLogs.length > 0 && (
                <BrowserConsoleLogs
                    logs={browserState.consoleLogs}
                    onSetQuote={onSetQuote}
                />
            )}
        </div>
    )
})

BrowserSessionRow.displayName = "BrowserSessionRow"
```

---

## 🎓 Key Patterns Applied

### React Component Patterns:

1. **Component Composition**
   - Main component orchestrates
   - Specialized components for each concern
   - Reusable subcomponents

2. **Custom Hooks**
   - Browser state extraction
   - Action handling logic
   - Pagination logic

3. **Utility Functions**
   - Action formatting
   - Parameter extraction
   - Business logic separation

### From Previous Refactorings:

1. **Single Responsibility**
   - Screenshot → BrowserScreenshot
   - Actions → BrowserActionCard
   - Console → BrowserConsoleLogs
   - Pagination → BrowserPagination

2. **Clear Boundaries**
   - State management in hooks
   - UI rendering in components
   - Logic in utilities

3. **Reusability**
   - Components can be used elsewhere
   - Hooks are framework-agnostic logic
   - Utilities are pure functions

---

## ✅ Quality Checklist

### Before Implementation:
- [x] Understand browser session flow
- [x] Identify component boundaries
- [x] Plan hook extractions
- [x] Design utility functions
- [x] Estimate component sizes

### During Implementation:
- [ ] Maintain TypeScript strict mode
- [ ] Add comprehensive prop types
- [ ] Test each component independently
- [ ] Ensure accessibility
- [ ] Verify browser actions work

### After Implementation:
- [ ] Main component < 150 lines
- [ ] All components < 120 lines
- [ ] All hooks < 80 lines
- [ ] Zero linting errors
- [ ] Browser session fully functional
- [ ] Performance maintained

---

## 📈 Expected Results

### Before:
- **1 file**: 649 lines
- **Complexity**: High (mixed concerns)
- **Testability**: Difficult (tight coupling)
- **Reusability**: Low (monolithic)

### After:
- **Main component**: ~130 lines (80% reduction)
- **3 new hooks**: ~220 lines
- **4 new components**: ~400 lines
- **2 utilities**: ~130 lines
- **Total**: ~880 lines (distributed)
- **Complexity**: Low per module
- **Testability**: High (isolated)
- **Reusability**: High (composable)

---

## 🚀 Implementation Strategy

1. **Phase 1**: Extract hooks (state, actions, pagination)
2. **Phase 2**: Create components (screenshot, actions, console, pagination)
3. **Phase 3**: Build utilities (formatters, validators)
4. **Phase 4**: Refactor main component (integration)
5. **Phase 5**: Test & validate (browser functionality)
6. **Phase 6**: Document (completion summary)

---

## 🙏 Philosophy Application

### OBSERVE
BrowserSessionRow evolved to handle screenshots, actions, console logs, and pagination all in one component.

### APPRECIATE
This centralized approach enabled rapid browser feature development and kept related logic together.

### LEARN
We learned that browser UI can be decomposed into reusable components that work together through composition.

### EVOLVE
We'll extract specialized components and hooks while maintaining the orchestration in the main component.

### RELEASE
The monolithic component served us well during browser feature development. Now we refactor with gratitude.

### SHARE
This plan applies React patterns and lessons from ChatRowContent refactoring.

---

*Plan created following MarieCoder Development Standards*  
*Estimated time: 11-13 hours*  
*Ready for implementation*

