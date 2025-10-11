# ChatRowContent.tsx Refactoring Plan

**Target File**: `webview-ui/src/components/chat/chat_row/ChatRowContent.tsx`  
**Current Size**: 707 lines (monolithic)  
**Status**: Planning Phase  
**Date**: October 11, 2025

---

## 🎯 Refactoring Goals

### Primary Objectives
1. **Extract Message Type Handlers** - Separate rendering logic for different message types
2. **Create Custom Hooks** - Extract complex state and logic into focused hooks
3. **Component Decomposition** - Break down large component into smaller, focused ones
4. **Improve Reusability** - Make message type renderers reusable and testable

### Success Criteria
- ✅ Main component < 200 lines
- ✅ All extracted components < 150 lines
- ✅ All hooks < 100 lines
- ✅ Zero linting errors
- ✅ 100% backward compatible rendering
- ✅ Improved testability

---

## 📊 Current Analysis

### File Structure Overview
```
ChatRowContent.tsx (707 lines)
├── Imports (37 lines)
├── Interface Definitions (10 lines)
├── ChatRowContent Component (660 lines)
│   ├── State & Hooks (~50 lines)
│   ├── Icon & Title Logic (~100 lines)
│   ├── Message Type Rendering (~400 lines)
│   │   ├── Error Messages (~50 lines)
│   │   ├── Command Messages (~60 lines)
│   │   ├── MCP Server Messages (~80 lines)
│   │   ├── Completion Results (~70 lines)
│   │   ├── API Request Messages (~50 lines)
│   │   ├── Tool Messages (~40 lines)
│   │   └── Question/Feedback Messages (~50 lines)
│   └── Event Handlers (~60 lines)
└── Export
```

### Key Responsibilities Identified

1. **Message Header Logic** (~100 lines)
   - Icon determination based on message type
   - Title formatting based on message type
   - Status indicators (progress, error, success)

2. **Message Content Rendering** (~400 lines)
   - Different rendering per message type
   - Conditional UI elements
   - Complex nested structures

3. **State Management** (~50 lines)
   - Cost calculation
   - Retry status tracking
   - Command/MCP execution status
   - Quote selection state

4. **Event Handling** (~60 lines)
   - Toggle expansion
   - Quote selection
   - Button interactions
   - Task feedback

5. **Existing Specialized Renderers** (Already extracted!)
   - ✅ CommandMessageRenderer
   - ✅ McpMessageRenderer
   - ✅ ToolMessageRenderer

---

## 🏗️ Proposed Architecture

### Module Structure

```
chat_row/
├── ChatRowContent.tsx (Main - ~150 lines)
│   ├── Orchestrates message rendering
│   ├── Delegates to specialized renderers
│   └── Minimal rendering logic
│
├── hooks/ (NEW & EXISTING)
│   ├── use_message_state.ts (EXISTING - keep)
│   ├── use_quote_selection.ts (EXISTING - keep)
│   ├── use_message_header.ts (~80 lines) NEW
│   │   ├── Icon determination
│   │   ├── Title formatting
│   │   └── Status indicators
│   │
│   └── use_message_actions.ts (~90 lines) NEW
│       ├── Approval/rejection handling
│       ├── Feedback submission
│       └── Quote/expand actions
│
├── components/ (NEW & EXISTING)
│   ├── Markdown.tsx (EXISTING - keep)
│   ├── ProgressIndicator.tsx (EXISTING - keep)
│   │
│   ├── MessageHeader.tsx (~100 lines) NEW
│   │   ├── Renders icon + title
│   │   ├── Handles expansion UI
│   │   └── Shows status badges
│   │
│   ├── MessageContent.tsx (~120 lines) NEW
│   │   ├── Routes to specialized renderers
│   │   ├── Wraps content with common UI
│   │   └── Handles quote selection
│   │
│   ├── ErrorMessage.tsx (~80 lines) NEW
│   │   ├── Error display
│   │   ├── Retry handling
│   │   └── Error details
│   │
│   ├── CompletionResult.tsx (~100 lines) NEW
│   │   ├── Completion display
│   │   ├── Changes summary
│   │   └── Feedback UI
│   │
│   └── ApiRequestDisplay.tsx (~90 lines) NEW
│       ├── API request info
│       ├── Cost display
│       └── Status indicators
│
├── message_types/ (EXISTING - enhanced)
│   ├── command_message_renderer.tsx (EXISTING)
│   ├── mcp_message_renderer.tsx (EXISTING)
│   ├── tool_message_renderer.tsx (EXISTING)
│   │
│   ├── question_message_renderer.tsx (~90 lines) NEW
│   │   ├── Question display
│   │   ├── Input handling
│   │   └── Options rendering
│   │
│   └── feedback_message_renderer.tsx (~70 lines) NEW
│       ├── Feedback UI
│       ├── Emoji reactions
│       └── Text feedback
│
└── utils/ (EXISTING - keep)
    └── style_constants.ts (EXISTING)
```

### Total Distribution
- **Main Component**: ~150 lines (79% reduction)
- **2 New Hooks**: ~170 lines
- **5 New Components**: ~490 lines
- **2 New Renderers**: ~160 lines
- **3 Existing Renderers**: ~300 lines (unchanged)
- **2 Existing Hooks**: ~150 lines (unchanged)
- **System Total**: ~1,420 lines (distributed, reusable)

---

## 📋 Implementation Plan

### Phase 1: Extract Message Header Logic (~2 hours)

#### Step 1.1: Create Message Header Hook
**File**: `webview-ui/src/components/chat/chat_row/hooks/use_message_header.ts`

```typescript
import { useMemo } from "react"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { errorColor, normalColor, successColor } from "../utils/style_constants"
import { ProgressIndicator } from "../components/ProgressIndicator"

interface MessageHeaderConfig {
    icon: JSX.Element
    title: JSX.Element
    color: string
}

export function useMessageHeader(
    message: ClineMessage,
    isCommandExecuting: boolean,
    isMcpServerResponding: boolean,
    cost: number,
    apiReqCancelReason?: string,
    apiRequestFailedMessage?: string,
    retryStatus?: string
): MessageHeaderConfig {
    const type = message.type === "ask" ? message.ask : message.say

    return useMemo(() => {
        switch (type) {
            case "error":
                return {
                    icon: <span className="codicon codicon-error" 
                                style={{ color: errorColor, marginBottom: "-1.5px" }} />,
                    title: <span style={{ color: errorColor, fontWeight: "bold" }}>Error</span>,
                    color: errorColor,
                }

            case "command":
                return {
                    icon: isCommandExecuting ? 
                        <ProgressIndicator /> : 
                        <span className="codicon codicon-terminal" 
                              style={{ color: normalColor, marginBottom: "-1.5px" }} />,
                    title: <span style={{ color: normalColor, fontWeight: "bold" }}>
                        Marie wants to execute this command:
                    </span>,
                    color: normalColor,
                }

            case "completion_result":
                return {
                    icon: <span className="codicon codicon-check" 
                                style={{ color: successColor, marginBottom: "-1.5px" }} />,
                    title: <span style={{ color: successColor, fontWeight: "bold" }}>
                        Task Completed
                    </span>,
                    color: successColor,
                }

            // ... other cases
            
            default:
                return {
                    icon: <span className="codicon codicon-info" />,
                    title: <span>Message</span>,
                    color: normalColor,
                }
        }
    }, [type, isCommandExecuting, isMcpServerResponding, cost, apiReqCancelReason])
}
```

#### Step 1.2: Create Message Header Component
**File**: `webview-ui/src/components/chat/chat_row/components/MessageHeader.tsx`

```typescript
import { memo } from "react"
import { headerStyle } from "../utils/style_constants"

interface MessageHeaderProps {
    icon: JSX.Element
    title: JSX.Element
    isExpanded: boolean
    onToggle: () => void
}

export const MessageHeader = memo(({ icon, title, isExpanded, onToggle }: MessageHeaderProps) => {
    return (
        <div style={headerStyle} onClick={onToggle}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {icon}
                {title}
            </div>
            <span 
                className={`codicon codicon-chevron-${isExpanded ? "up" : "down"}`}
                style={{ marginLeft: "auto" }}
            />
        </div>
    )
})

MessageHeader.displayName = "MessageHeader"
```

---

### Phase 2: Extract Message Type Renderers (~4 hours)

#### Step 2.1: Question Message Renderer
**File**: `webview-ui/src/components/chat/chat_row/message_types/question_message_renderer.tsx`

```typescript
import { memo } from "react"
import type { ClineAskQuestion, ClineMessage } from "@shared/ExtensionMessage"
import { Button } from "@/components/common/Button"

interface QuestionMessageRendererProps {
    message: ClineMessage
    onAnswer: (answer: string) => void
}

export const QuestionMessageRenderer = memo(({ message, onAnswer }: QuestionMessageRendererProps) => {
    const question = JSON.parse(message.text || "{}") as ClineAskQuestion

    return (
        <div>
            <div style={{ marginBottom: "15px" }}>
                {question.question}
            </div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {question.options?.map((option, index) => (
                    <Button
                        key={index}
                        onClick={() => onAnswer(option)}
                    >
                        {option}
                    </Button>
                ))}
            </div>
        </div>
    )
})

QuestionMessageRenderer.displayName = "QuestionMessageRenderer"
```

#### Step 2.2: Feedback Message Renderer
**File**: `webview-ui/src/components/chat/chat_row/message_types/feedback_message_renderer.tsx`

```typescript
import { memo, useState } from "react"
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons"

interface FeedbackMessageRendererProps {
    taskId: string
    onFeedbackSubmit: (feedback: { rating: number; comment: string }) => void
}

export const FeedbackMessageRenderer = memo(({ 
    taskId, 
    onFeedbackSubmit 
}: FeedbackMessageRendererProps) => {
    const [selectedRating, setSelectedRating] = useState<number | null>(null)
    const [feedbackComment, setFeedbackComment] = useState("")

    const handleSubmit = () => {
        if (selectedRating !== null) {
            onFeedbackSubmit({
                rating: selectedRating,
                comment: feedbackComment,
            })
        }
    }

    return (
        <div>
            <TaskFeedbackButtons
                taskId={taskId}
                onRatingSelect={setSelectedRating}
                selectedRating={selectedRating}
            />
            {selectedRating !== null && (
                <div style={{ marginTop: "10px" }}>
                    <textarea
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                        placeholder="Tell us more (optional)..."
                        style={{ width: "100%", minHeight: "60px" }}
                    />
                    <button onClick={handleSubmit}>Submit Feedback</button>
                </div>
            )}
        </div>
    )
})

FeedbackMessageRenderer.displayName = "FeedbackMessageRenderer"
```

---

### Phase 3: Extract Specialized Components (~3 hours)

#### Step 3.1: Error Message Component
**File**: `webview-ui/src/components/chat/chat_row/components/ErrorMessage.tsx`

```typescript
import { memo } from "react"
import { ErrorBlockTitle } from "@/components/chat/ErrorBlockTitle"
import ErrorRow from "@/components/chat/ErrorRow"
import { errorColor } from "../utils/style_constants"

interface ErrorMessageProps {
    errorText: string
    cost?: number
    apiReqCancelReason?: string
    apiRequestFailedMessage?: string
    retryStatus?: string
    onRetry?: () => void
}

export const ErrorMessage = memo(({ 
    errorText,
    cost,
    apiReqCancelReason,
    apiRequestFailedMessage,
    retryStatus,
    onRetry 
}: ErrorMessageProps) => {
    return (
        <div style={{ padding: "10px", borderRadius: "3px", backgroundColor: "var(--vscode-inputValidation-errorBackground)" }}>
            <div style={{ marginBottom: "10px", color: errorColor, fontWeight: "bold" }}>
                Error Details
            </div>
            <div style={{ whiteSpace: "pre-wrap", marginBottom: "10px" }}>
                {errorText}
            </div>
            {apiRequestFailedMessage && (
                <ErrorRow message={apiRequestFailedMessage} />
            )}
            {retryStatus && (
                <div style={{ marginTop: "10px", fontStyle: "italic" }}>
                    {retryStatus}
                </div>
            )}
            {onRetry && (
                <button onClick={onRetry} style={{ marginTop: "10px" }}>
                    Retry
                </button>
            )}
        </div>
    )
})

ErrorMessage.displayName = "ErrorMessage"
```

#### Step 3.2: Completion Result Component
**File**: `webview-ui/src/components/chat/chat_row/components/CompletionResult.tsx`

```typescript
import { memo, useState } from "react"
import { COMPLETION_RESULT_CHANGES_FLAG } from "@shared/ExtensionMessage"
import { Markdown } from "./Markdown"
import TaskFeedbackButtons from "@/components/chat/TaskFeedbackButtons"
import { Button } from "@/components/common/Button"

interface CompletionResultProps {
    text: string
    taskId: string
    onSeeChanges?: () => void
}

export const CompletionResult = memo(({ 
    text, 
    taskId,
    onSeeChanges 
}: CompletionResultProps) => {
    const [showFeedback, setShowFeedback] = useState(false)
    const hasChanges = text.includes(COMPLETION_RESULT_CHANGES_FLAG)

    return (
        <div>
            <Markdown text={text.replace(COMPLETION_RESULT_CHANGES_FLAG, "")} />
            
            {hasChanges && onSeeChanges && (
                <div style={{ marginTop: "15px" }}>
                    <Button onClick={onSeeChanges}>
                        See Changes
                    </Button>
                </div>
            )}

            <div style={{ marginTop: "20px", paddingTop: "15px", borderTop: "1px solid var(--vscode-editorGroup-border)" }}>
                <div style={{ marginBottom: "10px", fontWeight: "bold" }}>
                    How did Marie do?
                </div>
                <TaskFeedbackButtons
                    taskId={taskId}
                    onRatingSelect={(rating) => console.log("Rating:", rating)}
                    selectedRating={null}
                />
            </div>
        </div>
    )
})

CompletionResult.displayName = "CompletionResult"
```

#### Step 3.3: API Request Display Component
**File**: `webview-ui/src/components/chat/chat_row/components/ApiRequestDisplay.tsx`

```typescript
import { memo } from "react"
import { VSCodeBadge } from "@vscode/webview-ui-toolkit/react"
import { ProgressIndicator } from "./ProgressIndicator"

interface ApiRequestDisplayProps {
    cost: number
    isStreaming: boolean
    isCancelled: boolean
    cancelReason?: string
    errorMessage?: string
}

export const ApiRequestDisplay = memo(({ 
    cost,
    isStreaming,
    isCancelled,
    cancelReason,
    errorMessage 
}: ApiRequestDisplayProps) => {
    return (
        <div style={{ padding: "10px", borderRadius: "3px", backgroundColor: "var(--vscode-editor-background)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                {isStreaming && <ProgressIndicator />}
                <span style={{ fontWeight: "bold" }}>API Request</span>
                {cost > 0 && (
                    <VSCodeBadge>
                        ${cost.toFixed(4)}
                    </VSCodeBadge>
                )}
            </div>
            
            {isCancelled && cancelReason && (
                <div style={{ color: "var(--vscode-errorForeground)", marginTop: "5px" }}>
                    Cancelled: {cancelReason}
                </div>
            )}
            
            {errorMessage && (
                <div style={{ color: "var(--vscode-errorForeground)", marginTop: "5px" }}>
                    {errorMessage}
                </div>
            )}
        </div>
    )
})

ApiRequestDisplay.displayName = "ApiRequestDisplay"
```

---

### Phase 4: Create Message Content Router (~2 hours)

#### Step 4.1: Message Content Component
**File**: `webview-ui/src/components/chat/chat_row/components/MessageContent.tsx`

```typescript
import { memo, forwardRef } from "react"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { CommandMessageRenderer } from "../message_types/command_message_renderer"
import { McpMessageRenderer } from "../message_types/mcp_message_renderer"
import { ToolMessageRenderer } from "../message_types/tool_message_renderer"
import { QuestionMessageRenderer } from "../message_types/question_message_renderer"
import { FeedbackMessageRenderer } from "../message_types/feedback_message_renderer"
import { ErrorMessage } from "./ErrorMessage"
import { CompletionResult } from "./CompletionResult"
import { ApiRequestDisplay } from "./ApiRequestDisplay"

interface MessageContentProps {
    message: ClineMessage
    isExpanded: boolean
    isLast: boolean
    cost: number
    isCommandExecuting: boolean
    isMcpServerResponding: boolean
    apiReqCancelReason?: string
    apiRequestFailedMessage?: string
    retryStatus?: string
    onAnswer?: (answer: string) => void
    onFeedback?: (feedback: any) => void
}

export const MessageContent = memo(
    forwardRef<HTMLDivElement, MessageContentProps>(
        ({ message, isExpanded, isLast, cost, ...props }, ref) => {
            const type = message.type === "ask" ? message.ask : message.say

            if (!isExpanded && type !== "user_feedback_diff") {
                return null
            }

            return (
                <div ref={ref} style={{ padding: "10px 0" }}>
                    {/* Route to appropriate renderer based on message type */}
                    {type === "error" && (
                        <ErrorMessage
                            errorText={message.text || ""}
                            cost={cost}
                            apiReqCancelReason={props.apiReqCancelReason}
                            apiRequestFailedMessage={props.apiRequestFailedMessage}
                            retryStatus={props.retryStatus}
                        />
                    )}

                    {type === "command" && (
                        <CommandMessageRenderer message={message} />
                    )}

                    {type === "use_mcp_server" && (
                        <McpMessageRenderer message={message} />
                    )}

                    {type === "tool" && (
                        <ToolMessageRenderer message={message} />
                    )}

                    {type === "completion_result" && (
                        <CompletionResult
                            text={message.text || ""}
                            taskId={message.taskId || ""}
                        />
                    )}

                    {type === "api_req_started" && (
                        <ApiRequestDisplay
                            cost={cost}
                            isStreaming={isLast}
                            isCancelled={!!props.apiReqCancelReason}
                            cancelReason={props.apiReqCancelReason}
                            errorMessage={props.apiRequestFailedMessage}
                        />
                    )}

                    {/* Add more renderers as needed */}
                </div>
            )
        }
    )
)

MessageContent.displayName = "MessageContent"
```

---

### Phase 5: Refactor Main Component (~2 hours)

#### Step 5.1: Simplified ChatRowContent
**File**: `webview-ui/src/components/chat/chat_row/ChatRowContent.tsx` (Refactored)

```typescript
import { memo, useCallback, useEffect } from "react"
import type { ClineMessage } from "@shared/ExtensionMessage"
import { useExtensionState } from "@/context/ExtensionStateContext"
import { useMessageState } from "./hooks/use_message_state"
import { useQuoteSelection } from "./hooks/use_quote_selection"
import { useMessageHeader } from "./hooks/use_message_header"
import { MessageHeader } from "./components/MessageHeader"
import { MessageContent } from "./components/MessageContent"
import QuoteButton from "@/components/chat/QuoteButton"

interface ChatRowContentProps {
    message: ClineMessage
    isExpanded: boolean
    onToggleExpand: (ts: number) => void
    lastModifiedMessage?: ClineMessage
    isLast: boolean
    inputValue?: string
    sendMessageFromChatRow?: (text: string, images: string[], files: string[]) => void
    onSetQuote: (text: string) => void
}

/**
 * Main content renderer for chat messages
 * Orchestrates rendering by delegating to specialized components
 */
export const ChatRowContent = memo(({
    message,
    isExpanded,
    onToggleExpand,
    lastModifiedMessage,
    isLast,
    inputValue,
    sendMessageFromChatRow,
    onSetQuote,
}: ChatRowContentProps) => {
    const { onRelinquishControl } = useExtensionState()
    
    // State hooks
    const {
        cost,
        apiReqCancelReason,
        apiReqStreamingFailedMessage,
        retryStatus,
        apiRequestFailedMessage,
        isCommandExecuting,
        isMcpServerResponding,
    } = useMessageState(message, lastModifiedMessage, isLast)

    // Quote selection
    const { quoteButtonState, contentRef, handleQuoteClick, handleMouseUp } = 
        useQuoteSelection(onSetQuote)

    // Header configuration
    const headerConfig = useMessageHeader(
        message,
        isCommandExecuting,
        isMcpServerResponding,
        cost,
        apiReqCancelReason,
        apiRequestFailedMessage,
        retryStatus
    )

    // Handlers
    const handleToggle = useCallback(() => {
        onToggleExpand(message.ts)
    }, [onToggleExpand, message.ts])

    return (
        <div style={{ position: "relative" }} onMouseUp={handleMouseUp}>
            {/* Quote button */}
            {quoteButtonState.show && (
                <QuoteButton
                    position={quoteButtonState.position}
                    onClick={handleQuoteClick}
                />
            )}

            {/* Message header */}
            <MessageHeader
                icon={headerConfig.icon}
                title={headerConfig.title}
                isExpanded={isExpanded}
                onToggle={handleToggle}
            />

            {/* Message content */}
            <MessageContent
                ref={contentRef}
                message={message}
                isExpanded={isExpanded}
                isLast={isLast}
                cost={cost}
                isCommandExecuting={isCommandExecuting}
                isMcpServerResponding={isMcpServerResponding}
                apiReqCancelReason={apiReqCancelReason}
                apiRequestFailedMessage={apiRequestFailedMessage}
                retryStatus={retryStatus}
            />
        </div>
    )
})

ChatRowContent.displayName = "ChatRowContent"
```

---

## 🎓 Key Patterns Applied

### React Component Patterns:

1. **Component Composition**
   - Main component orchestrates
   - Specialized renderers handle specific types
   - Shared components for common UI

2. **Custom Hooks**
   - Extract complex state logic
   - Isolate side effects
   - Improve reusability

3. **Render Props & Children**
   - Flexible component composition
   - Inversion of control

4. **Memoization**
   - Prevent unnecessary re-renders
   - Optimize performance

### From Previous Refactorings:

1. **Single Responsibility**
   - Each component renders one thing
   - Each hook manages one concern

2. **Clear Boundaries**
   - Message types → Renderers
   - State logic → Hooks
   - UI elements → Components

3. **Progressive Enhancement**
   - Existing renderers kept
   - New renderers added
   - Main component simplified

---

## ✅ Quality Checklist

### Before Implementation:
- [x] Understand current component structure
- [x] Identify message type patterns
- [x] Plan hook extractions
- [x] Design component hierarchy
- [x] Estimate component sizes

### During Implementation:
- [ ] Maintain TypeScript strict mode
- [ ] Add comprehensive prop types
- [ ] Test each renderer independently
- [ ] Ensure accessibility
- [ ] Verify memo effectiveness

### After Implementation:
- [ ] Main component < 200 lines
- [ ] All components < 150 lines
- [ ] All hooks < 100 lines
- [ ] Zero linting errors
- [ ] Rendering identical to original
- [ ] Performance maintained/improved

---

## 📈 Expected Results

### Before:
- **1 file**: 707 lines
- **Complexity**: Very High (mixed concerns)
- **Testability**: Difficult (tight coupling)
- **Reusability**: Low (monolithic)

### After:
- **Main component**: ~150 lines (79% reduction)
- **2 new hooks**: ~170 lines
- **5 new components**: ~490 lines
- **2 new renderers**: ~160 lines
- **Total**: ~970 lines (distributed)
- **Complexity**: Low per module
- **Testability**: High (isolated)
- **Reusability**: High (composable)

---

## 🚀 Implementation Strategy

1. **Phase 1**: Extract header hook & component (foundation)
2. **Phase 2**: Create message type renderers (specialized logic)
3. **Phase 3**: Build specialized components (error, completion, API)
4. **Phase 4**: Create message content router (orchestration)
5. **Phase 5**: Refactor main component (integration)
6. **Phase 6**: Test & validate (ensure compatibility)
7. **Phase 7**: Document (completion summary)

---

## 🙏 Philosophy Application

### OBSERVE
ChatRowContent evolved to handle many message types with complex rendering logic all in one place.

### APPRECIATE
This approach enabled rapid iteration and kept message rendering logic centralized during development.

### LEARN
We learned that specialized renderers improve clarity, make testing easier, and enable reuse across the UI.

### EVOLVE
We'll extract renderers, create focused hooks, and compose them into a cleaner main component.

### RELEASE
The monolithic component served us well. Now we refactor with gratitude.

### SHARE
This plan applies React best practices and lessons from backend refactorings.

---

*Plan created following MarieCoder Development Standards*  
*Estimated time: 13-16 hours*  
*Ready for implementation*

