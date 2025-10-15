# Streaming UX Improvement Plan

## Problem Statement

Currently, streaming responses create a visual collision where:
- **Code snippets** (from `write_to_file`, `search_replace`, etc.) appear in **both** the webview chat AND editor tabs
- **Text responses and thinking** stream into the webview chat
- This creates visual clutter and confusing UX where users don't know where to look

## Desired State

### 1. Code Snippets → Editor Tabs
- File operations should stream **line-by-line** directly into VSCode editor tabs
- Show **minimal summary** in chat (e.g., "✏️ Editing `components/Button.tsx`...")
- User watches the actual code being written in the editor, not in chat

### 2. Responses & Thinking → Chat
- AI text responses stay in chat with full markdown rendering
- Thinking/reasoning blocks stay in chat (collapsible)
- Status updates and confirmations stay in chat

## Current Architecture

### Streaming Flow (Backend)
```
Task → ApiStreamManager → parseAndPresentStreamingText
  ├─ "text" → TaskMessageService.say("text", ..., partial=true)
  ├─ "reasoning" → TaskMessageService.say("reasoning", ..., partial=true)  
  └─ "tool_use" → ToolExecutor → WriteToFileToolHandler
      ├─ handlePartialBlock → DiffViewProvider.update (streams to editor)
      └─ also sends → TaskMessageService.ask("tool", ..., partial=true)
```

### Display Flow (Frontend)
```
webview-ui receives messages:
  ├─ "text" → MessageContent → Markdown component (chat)
  ├─ "reasoning" → MessageContent → ThinkingBlock (chat)
  └─ "tool" → ToolMessageRenderer → CodeAccordian (chat) ❌ COLLISION
```

## Solution Design

### Phase 1: Simplify Tool Messages in Chat ✅

**Goal**: Show only compact summaries for tool operations in chat

**Changes Needed**:

1. **Modify `ToolMessageRenderer` Component** (`webview-ui/src/components/chat/chat_row/message_types/tool_message_renderer.tsx`)
   - Add a new compact display mode for streaming tool operations
   - Show: Icon + File path + Status indicator (streaming/complete)
   - Hide: Full code content (it's already in editor)
   - Add "View in Editor" button that focuses the editor tab

2. **Create `CompactToolDisplay` Component**
   ```tsx
   // webview-ui/src/components/chat/chat_row/message_types/CompactToolDisplay.tsx
   
   interface CompactToolDisplayProps {
     tool: ClineSayTool
     isStreaming: boolean
     isComplete: boolean
   }
   
   // Shows:
   // ✏️ Editing components/Button.tsx... [streaming dots]
   // [View in Editor ↗]
   ```

3. **Add Settings Toggle**
   - `settings.compactToolDisplay` (default: `true`)
   - Users can opt back into full code in chat if preferred
   - Store in ExtensionState settings

### Phase 2: Enhanced Editor Focus ✅

**Goal**: Make editor the primary focus for code operations

**Changes Needed**:

1. **Auto-Focus Editor on Tool Execution** (`src/core/task/tools/handlers/WriteToFileToolHandler.ts`)
   - When `handlePartialBlock` opens editor, bring it to focus
   - Ensure editor tab is visible and active
   - Use `preserveFocus: false` in `showTextDocument`

2. **Add Editor Sync Service** (`src/services/editor/editor_sync_service.ts`)
   ```typescript
   export class EditorSyncService {
     // Tracks which files are currently being edited by AI
     private activeEdits: Map<string, EditorEditSession>
     
     async startEditSession(filePath: string): Promise<void>
     async updateEditSession(filePath: string, content: string, isComplete: boolean): Promise<void>
     async endEditSession(filePath: string): Promise<void>
     
     // Emits events for UI to show "AI is editing..." indicators
   }
   ```

3. **Editor Decorations** (already partially implemented in `DiffViewProvider`)
   - Keep existing faded overlay for unedited lines
   - Keep existing active line highlighting
   - Add subtle "streaming" indicator (animated border or glow)

### Phase 3: Streaming Indicator Improvements ✅

**Goal**: Clear visual feedback about what's happening where

**Changes Needed**:

1. **Chat Streaming Indicator**
   - When AI is streaming text/thinking: Show typing indicator in chat
   - When AI is editing files: Show compact file status in chat
   - Clear separation of concerns

2. **Editor Streaming Indicator**
   - Add subtle animation/glow to editor tab being edited
   - Show "Marie is editing..." in status bar
   - Line-by-line reveal animation (already exists but can be enhanced)

3. **Status Bar Integration** (`src/integrations/status_bar/`)
   ```typescript
   // Show in VSCode status bar:
   // "$(sync~spin) Marie is editing Button.tsx..."
   // "$(check) Marie completed editing Button.tsx"
   ```

## Implementation Plan

### Step 1: Create Compact Tool Display (Priority: HIGH)
- [ ] Create `CompactToolDisplay.tsx` component
- [ ] Modify `ToolMessageRenderer.tsx` to use compact display for streaming
- [ ] Add "View in Editor" button with focus functionality
- [ ] Add settings toggle for compact mode

### Step 2: Enhance Editor Focus (Priority: HIGH)  
- [ ] Modify `WriteToFileToolHandler.handlePartialBlock` to auto-focus editor
- [ ] Update `DiffViewProvider.openDiffEditor` with focus options
- [ ] Add editor tab activation after opening

### Step 3: Create Editor Sync Service (Priority: MEDIUM)
- [ ] Create `EditorSyncService` class
- [ ] Integrate with `WriteToFileToolHandler`
- [ ] Add event emitters for UI updates
- [ ] Track active edit sessions

### Step 4: Status Bar Integration (Priority: MEDIUM)
- [ ] Create status bar item for streaming status
- [ ] Update status during file operations
- [ ] Clear status on completion/error

### Step 5: Polish & Testing (Priority: MEDIUM)
- [ ] Add animation enhancements to editor streaming
- [ ] Test with rapid file operations
- [ ] Test with multiple simultaneous edits
- [ ] Add E2E tests for new flows

## Benefits

### User Experience
- ✅ **Clear focus**: Users know to watch the editor for code, chat for explanations
- ✅ **Less clutter**: Chat no longer filled with large code blocks
- ✅ **Better context**: Code shown in proper editor with syntax highlighting and line numbers
- ✅ **Familiar workflow**: Matches how developers normally work (code in editor, not chat)

### Performance
- ✅ **Reduced webview load**: Less DOM manipulation in chat
- ✅ **Better streaming**: Editor handles large files better than chat markdown rendering
- ✅ **Faster rendering**: Native editor rendering vs markdown parsing

### Maintainability
- ✅ **Separation of concerns**: Code display logic in editor, conversation in chat
- ✅ **Reusable components**: `CompactToolDisplay` can be used for all tools
- ✅ **Clear architecture**: Each component has single responsibility

## Edge Cases to Handle

1. **Multiple Files Being Edited**
   - Show list of active edits in compact display
   - Allow user to switch between editor tabs
   - Status bar shows count: "Editing 3 files..."

2. **User Manually Closes Editor Tab**
   - Keep compact status in chat
   - "View in Editor" button reopens the tab
   - Don't interrupt streaming

3. **User Manually Edits File While AI is Editing**
   - Conflict detection (already handled by DiffViewProvider)
   - Show warning in chat
   - Allow user to abort or continue

4. **Very Large Files**
   - Editor handles better than chat markdown
   - Chunk streaming already implemented
   - Status shows progress: "Editing... (45%)"

5. **User Preference for Old Behavior**
   - Settings toggle: `compactToolDisplay: false`
   - Graceful fallback to current full-code-in-chat display

## Migration Strategy

### Phase 1: Opt-in (v1.0)
- Add as new feature with settings toggle
- Default: `compactToolDisplay: false` (current behavior)
- Users can enable in settings

### Phase 2: Opt-out (v1.1)
- After validation, flip default: `compactToolDisplay: true`
- Users can disable in settings if preferred
- Show one-time notification about new UX

### Phase 3: Standard (v2.0)
- Remove toggle, make compact display standard
- Legacy mode deprecated
- Focus on polish and edge cases

## Technical Considerations

### Protocol Changes
- No protobuf changes needed ✅
- Existing message types support this
- Just change how we render them in UI

### Backward Compatibility
- Settings toggle maintains compatibility ✅
- Old chat messages still render correctly
- No migration needed for existing tasks

### Performance Impact
- Expected improvement in webview ✅
- Reduced markdown rendering
- Native editor more efficient

## Success Metrics

### Quantitative
- 📊 Webview rendering time (target: -30%)
- 📊 Time to first visible code change (target: -20%)
- 📊 User time spent scrolling chat (target: -40%)

### Qualitative
- 😊 User feedback: "I know where to look now"
- 😊 Fewer questions about "where is the code?"
- 😊 Better alignment with developer expectations

## Related Files

### Backend (Extension)
- `src/core/task/services/api_stream_manager.ts` - Stream processing
- `src/core/task/services/task_message_service.ts` - Message sending
- `src/core/task/tools/handlers/WriteToFileToolHandler.ts` - File operations
- `src/integrations/editor/DiffViewProvider.ts` - Editor streaming
- `src/hosts/vscode/VscodeDiffViewProvider.ts` - VSCode-specific editor

### Frontend (Webview UI)
- `webview-ui/src/components/chat/chat_row/message_types/tool_message_renderer.tsx` - Tool display
- `webview-ui/src/components/chat/chat_row/message_types/CompactToolDisplay.tsx` - ⭐ NEW
- `webview-ui/src/components/chat/chat_row/components/MessageContent.tsx` - Message routing
- `webview-ui/src/context/SettingsContext.tsx` - Settings state

### Services (New)
- `src/services/editor/editor_sync_service.ts` - ⭐ NEW - Track active edits
- `src/integrations/status_bar/streaming_status.ts` - ⭐ NEW - Status bar updates

## Open Questions

1. ❓ Should thinking/reasoning also be minimized? (Current answer: No, keep in chat)
2. ❓ Should we show a preview thumbnail of code in compact display? (Current answer: No, too complex)
3. ❓ What about non-file tools (execute_command, list_files)? (Current answer: Keep current display)
4. ❓ Should compact display be per-tool configurable? (Current answer: No, global setting is sufficient)

## Conclusion

This plan provides a clear path to resolve the streaming collision by:
1. **Separating concerns**: Code in editor, conversation in chat
2. **Improving UX**: Clear focus, less clutter, better performance
3. **Maintaining compatibility**: Settings toggle for gradual rollout
4. **Leveraging existing infrastructure**: DiffViewProvider already streams to editor

The implementation is low-risk, high-impact, and aligns with developer expectations of how code editing should work.

