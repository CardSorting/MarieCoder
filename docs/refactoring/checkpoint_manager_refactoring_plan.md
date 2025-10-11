# TaskCheckpointManager Refactoring Plan

## 🎯 Overview

**Current State**: Single 947-line monolithic class managing checkpoint creation, restoration, diffing, and UI coordination  
**Target State**: Modular checkpoint management system with clear separation of concerns

---

## 📊 Analysis - What This File Taught Us

### Observed Patterns
1. **Multiple distinct operations**: Save, restore, diff, validate - each complex
2. **Heavy UI coordination**: User messages, notifications, error handling throughout
3. **Complex restoration logic**: Different restore types (task/workspace/both)
4. **Tracker initialization**: Lazy initialization with timeout handling
5. **Message state coordination**: Heavy interaction with MessageStateHandler
6. **Error recovery**: Multiple error paths with user notification

### Lessons Learned
- Checkpoint operations are distinct workflows (save vs restore vs diff)
- UI coordination is orthogonal to core checkpoint logic
- Restoration has complex state management
- Tracker initialization is a specialized concern
- Error handling needs to be centralized

---

## 🏗️ Proposed Architecture

```
src/integrations/checkpoints/
├── index.ts                                  (Facade, ~250 lines)
├── types.ts                                  (Already exists)
├── operations/
│   ├── checkpoint_saver.ts                   (~150 lines)
│   ├── checkpoint_restorer.ts                (~180 lines)
│   ├── checkpoint_diff_presenter.ts          (~120 lines)
│   └── checkpoint_validator.ts               (~80 lines)
├── coordinators/
│   ├── ui_coordinator.ts                     (~100 lines)
│   ├── message_state_coordinator.ts          (~120 lines)
│   └── restoration_coordinator.ts            (~150 lines)
├── initialization/
│   ├── tracker_initializer.ts                (~120 lines)
│   └── workspace_resolver.ts                 (~60 lines)
└── utils/
    └── checkpoint_state_manager.ts           (~80 lines)
```

---

## 📦 Module Breakdown

### 1. **index.ts** (Facade, ~250 lines)
**Responsibility**: Public API and coordination
- Implements `ICheckpointManager` interface
- Delegates to specialized operations
- Maintains dependencies (services, callbacks, config)
- Manages internal state coordination

### 2. **operations/checkpoint_saver.ts** (~150 lines)
**Responsibility**: Checkpoint creation logic
- `saveCheckpoint()` - Main save operation
- `saveAttemptCompletion()` - Completion-specific logic
- `saveRegularCheckpoint()` - Regular checkpoint logic
- Handles duplicate prevention
- Updates messages with commit hashes

### 3. **operations/checkpoint_restorer.ts** (~180 lines)
**Responsibility**: Core restoration logic
- `restoreByType()` - Route to correct restore type
- `restoreTask()` - Task-only restoration
- `restoreWorkspace()` - Workspace-only restoration
- `restoreTaskAndWorkspace()` - Full restoration
- Handles different restore scenarios

### 4. **operations/checkpoint_diff_presenter.ts** (~120 lines)
**Responsibility**: Multi-file diff presentation
- `presentDiff()` - Main diff presentation
- `getDiffChanges()` - Get changes between checkpoints
- Integration with DiffViewProvider
- Handles diff navigation

### 5. **operations/checkpoint_validator.ts** (~80 lines)
**Responsibility**: Validation and checks
- `validateCheckpointAvailable()` - Check if checkpoint exists
- `validateConfigurationEnabled()` - Check if checkpoints enabled
- `findCheckpointForMessage()` - Locate checkpoint hash
- `doesLatestTaskCompletionHaveNewChanges()` - Check for changes

### 6. **coordinators/ui_coordinator.ts** (~100 lines)
**Responsibility**: User interface coordination
- `showSuccess()` - Success messages
- `showError()` - Error messages
- `showInfo()` - Information messages
- `relinquishControl()` - UI control handling
- Centralized user communication

### 7. **coordinators/message_state_coordinator.ts** (~120 lines)
**Responsibility**: Message state operations
- `updateCheckpointFlags()` - Update isCheckpointCheckedOut
- `addCheckpointMessage()` - Add checkpoint_created messages
- `updateMessageWithHash()` - Update messages with commit hash
- `truncateMessages()` - Remove messages after restoration
- Abstracts MessageStateHandler interactions

### 8. **coordinators/restoration_coordinator.ts** (~150 lines)
**Responsibility**: Complex restoration state management
- `prepareRestoration()` - Pre-restoration setup
- `executeRestoration()` - Core restoration execution
- `finalizeRestoration()` - Post-restoration cleanup
- `handleSuccessfulRestore()` - Success path
- `handleFailedRestore()` - Failure path
- `aggregateDeletedMetrics()` - Aggregate API metrics

### 9. **initialization/tracker_initializer.ts** (~120 lines)
**Responsibility**: CheckpointTracker initialization
- `checkAndInit()` - Check and initialize if needed
- `initialize()` - Core initialization logic
- `initializeWithTimeout()` - Timeout handling
- Error handling and retry logic
- Timeout error message management

### 10. **initialization/workspace_resolver.ts** (~60 lines)
**Responsibility**: Workspace path resolution
- `getWorkspacePath()` - Get correct workspace path
- Handle multi-root vs single-root
- Integration with WorkspaceRootManager

### 11. **utils/checkpoint_state_manager.ts** (~80 lines)
**Responsibility**: Internal state management
- `getState()` - Get current state
- `setState()` - Update state
- `getCheckpointTracker()` - Get tracker instance
- `setCheckpointTracker()` - Set tracker instance
- `getErrorMessage()` / `setErrorMessage()` - Error state
- `getDeletedRange()` / `setDeletedRange()` - Deleted range tracking

---

## 🔄 Migration Strategy

### Phase 1: Extract Utility Modules (bottom-up)
1. Create `initialization/workspace_resolver.ts`
2. Create `utils/checkpoint_state_manager.ts`
3. Create `operations/checkpoint_validator.ts`

### Phase 2: Extract Coordination Modules
1. Create `coordinators/ui_coordinator.ts`
2. Create `coordinators/message_state_coordinator.ts`
3. Create `initialization/tracker_initializer.ts`

### Phase 3: Extract Operation Modules
1. Create `operations/checkpoint_saver.ts`
2. Create `operations/checkpoint_diff_presenter.ts`
3. Create `coordinators/restoration_coordinator.ts`
4. Create `operations/checkpoint_restorer.ts`

### Phase 4: Refactor Facade
1. Update `index.ts` to delegate to modules
2. Maintain ICheckpointManager interface
3. Wire up dependencies
4. Preserve all public behavior

### Phase 5: Testing & Validation
1. Run existing tests
2. Manual testing of checkpoint operations
3. Verify all restore types work
4. Test error scenarios

---

## ✅ Benefits

1. **Clarity**: Each module has single, clear responsibility
2. **Testability**: Isolated modules easier to unit test
3. **Maintainability**: Smaller files easier to understand and modify
4. **UI Separation**: UI coordination decoupled from business logic
5. **Error Handling**: Centralized error and notification management
6. **Reusability**: Modules can be composed differently

---

## 🎯 Key Improvements

### Separation of Concerns
- **Business Logic** (operations/) - Core checkpoint operations
- **Coordination** (coordinators/) - Orchestration and state management
- **Infrastructure** (initialization/) - Setup and initialization
- **UI** (coordinators/ui_coordinator) - User interaction

### Testability
- Operations can be tested without UI
- UI coordination can be tested with mocks
- Initialization logic isolated
- State management testable independently

### Error Handling
- Centralized in UICoordinator
- Consistent error messages
- Clear error paths
- User-friendly notifications

---

## 📝 Detailed Module Responsibilities

### CheckpointSaver
```typescript
export class CheckpointSaver {
  constructor(
    private readonly tracker: CheckpointTracker | undefined,
    private readonly messageCoordinator: MessageStateCoordinator,
    private readonly config: CheckpointManagerConfig,
  ) {}

  async save(
    isAttemptCompletion: boolean,
    completionMessageTs?: number
  ): Promise<void> {
    if (isAttemptCompletion) {
      return this.saveAttemptCompletion(completionMessageTs)
    }
    return this.saveRegularCheckpoint()
  }

  private async saveAttemptCompletion(ts?: number): Promise<void>
  private async saveRegularCheckpoint(): Promise<void>
}
```

### CheckpointRestorer
```typescript
export class CheckpointRestorer {
  constructor(
    private readonly tracker: CheckpointTracker | undefined,
    private readonly validator: CheckpointValidator,
    private readonly restorationCoordinator: RestorationCoordinator,
  ) {}

  async restore(
    messageTs: number,
    restoreType: ClineCheckpointRestore,
    offset?: number
  ): Promise<CheckpointRestoreStateUpdate> {
    // Validate
    // Route to correct restore type
    // Execute restoration
    // Handle results
  }

  private async restoreTask(...): Promise<void>
  private async restoreWorkspace(...): Promise<void>
  private async restoreTaskAndWorkspace(...): Promise<void>
}
```

### UICoordinator
```typescript
export class CheckpointUICoordinator {
  showSuccess(message: string): void
  showError(error: Error | string): void
  showInfo(message: string): void
  relinquishControl(): void
  
  // Specific success messages
  showRestoreSuccess(restoreType: ClineCheckpointRestore): void
  showSaveSuccess(): void
}
```

### MessageStateCoordinator
```typescript
export class MessageStateCoordinator {
  constructor(
    private readonly messageStateHandler: MessageStateHandler
  ) {}

  updateCheckpointFlags(messageTs: number): Promise<void>
  addCheckpointMessage(): Promise<number | undefined>
  updateMessageWithHash(ts: number, hash: string): Promise<void>
  truncateMessagesAfter(index: number): Promise<ClineMessage[]>
  getClineMessages(): ClineMessage[]
}
```

---

## 🔍 Success Criteria

- [ ] Each module < 200 lines
- [ ] Facade file < 300 lines
- [ ] All existing tests pass
- [ ] ICheckpointManager interface preserved
- [ ] Clear documentation in each file
- [ ] Zero linting errors
- [ ] No behavioral changes

---

## 📋 Migration Checklist

### Pre-Implementation
- [x] Analyze existing file structure
- [x] Identify distinct concerns
- [x] Design module boundaries
- [x] Create refactoring plan

### Implementation
- [ ] Create directory structure
- [ ] Extract workspace resolver
- [ ] Extract state manager
- [ ] Extract validator
- [ ] Extract UI coordinator
- [ ] Extract message coordinator
- [ ] Extract tracker initializer
- [ ] Extract checkpoint saver
- [ ] Extract diff presenter
- [ ] Extract restoration coordinator
- [ ] Extract checkpoint restorer
- [ ] Rewrite facade

### Validation
- [ ] Run tests
- [ ] Check linting
- [ ] Manual testing
- [ ] Documentation review

---

## 🚨 Risk Mitigation

### Complex Restoration Logic
- Extract to dedicated coordinator first
- Maintain exact behavior
- Test all restore types

### Message State Interactions
- Create abstraction layer (MessageStateCoordinator)
- Preserve all message updates
- Test message ordering

### Error Handling
- Centralize in UICoordinator
- Maintain all error paths
- Test error scenarios

### Tracker Initialization
- Keep initialization logic intact
- Maintain timeout behavior
- Test lazy initialization

---

## 📝 Notes

- Preserve all existing behavior
- Keep error messages identical
- Maintain timeout values
- No changes to CheckpointTracker or related utilities
- Focus only on TaskCheckpointManager (index.ts)

---

*Created: Following MarieCoder philosophy of mindful refactoring with gratitude for existing patterns*

