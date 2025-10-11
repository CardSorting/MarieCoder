# StateManager Refactoring Plan

## 🎯 Overview

**Current State**: Single 754-line monolithic class managing 4 different state types with mixed concerns
**Target State**: Modular state management system with clear separation of concerns

---

## 📊 Analysis - What This File Taught Us

### Observed Patterns
1. **Four distinct state domains**: Global, Task, Secrets, Workspace - each with similar CRUD operations
2. **Debounced persistence**: All state changes are batched and written after delay
3. **File watching**: External changes to taskHistory.json need cache synchronization
4. **Error recovery**: Persistence failures require reinit capability
5. **API Configuration**: Convenience layer composing multiple state keys

### Lessons Learned
- State management benefits from domain separation
- Persistence logic is orthogonal to state operations
- File watching is a specialized concern
- API configuration is a higher-level abstraction

---

## 🏗️ Proposed Architecture

```
src/core/storage/
├── StateManager.ts                    (Facade, ~200 lines)
├── managers/
│   ├── global_state_manager.ts        (~120 lines)
│   ├── task_state_manager.ts          (~150 lines)
│   ├── secrets_manager.ts             (~100 lines)
│   └── workspace_state_manager.ts     (~120 lines)
├── persistence/
│   ├── persistence_coordinator.ts     (~150 lines)
│   └── task_history_watcher.ts        (~100 lines)
├── services/
│   └── api_configuration_service.ts   (~100 lines)
└── types/
    └── state_manager_types.ts         (~50 lines)
```

---

## 📦 Module Breakdown

### 1. **global_state_manager.ts** (~120 lines)
**Responsibility**: Global state CRUD operations
- `setGlobalState()` / `setGlobalStateBatch()`
- `getGlobalStateKey()` / `getGlobalSettingsKey()`
- Cache management for `GlobalStateAndSettings`

### 2. **task_state_manager.ts** (~150 lines)
**Responsibility**: Task-specific settings CRUD
- `setTaskSettings()` / `setTaskSettingsBatch()`
- `loadTaskSettings()` / `clearTaskSettings()`
- Cache management for task-specific `Settings`

### 3. **secrets_manager.ts** (~100 lines)
**Responsibility**: Secure credential storage
- `setSecret()` / `setSecretsBatch()`
- `getSecretKey()`
- Cache management for `Secrets`

### 4. **workspace_state_manager.ts** (~120 lines)
**Responsibility**: Workspace-scoped state
- `setWorkspaceState()` / `setWorkspaceStateBatch()`
- `getWorkspaceStateKey()`
- `clearArbitraryWorkspaceStateKey()` / `getAllWorkspaceStateKeys()`
- Cache management for `LocalState`

### 5. **persistence_coordinator.ts** (~150 lines)
**Responsibility**: Debounced persistence orchestration
- `schedulePersistence()` - debounce logic
- `persistGlobalStateBatch()` / `persistTaskStateBatch()` / etc.
- Coordinates batch writes across all state types
- Error handling and callbacks

### 6. **task_history_watcher.ts** (~100 lines)
**Responsibility**: File system watching for external changes
- `setupWatcher()` / `closeWatcher()`
- `syncTaskHistoryFromDisk()`
- Chokidar integration
- Change detection and callback invocation

### 7. **api_configuration_service.ts** (~100 lines)
**Responsibility**: API configuration convenience layer
- `getApiConfiguration()` - compose from state keys
- `setApiConfiguration()` - decompose to state operations
- Delegates to GlobalStateManager and SecretsManager

### 8. **state_manager_types.ts** (~50 lines)
**Responsibility**: Shared types and interfaces
- `PersistenceErrorEvent`
- `StateManagerCallbacks`
- State manager configuration types

### 9. **StateManager.ts** (Facade, ~200 lines)
**Responsibility**: Public API and coordination
- Singleton pattern
- `initialize()` / `get()` / `reInitialize()`
- Delegates to specialized managers
- Maintains initialization state
- Provides backward-compatible interface

---

## 🔄 Migration Strategy

### Phase 1: Extract Supporting Types
1. Create `types/state_manager_types.ts`
2. Move interfaces and types

### Phase 2: Extract Domain Managers (bottom-up)
1. Create `managers/global_state_manager.ts`
2. Create `managers/task_state_manager.ts`
3. Create `managers/secrets_manager.ts`
4. Create `managers/workspace_state_manager.ts`

### Phase 3: Extract Infrastructure
1. Create `persistence/persistence_coordinator.ts`
2. Create `persistence/task_history_watcher.ts`
3. Create `services/api_configuration_service.ts`

### Phase 4: Refactor Facade
1. Update `StateManager.ts` to delegate to managers
2. Maintain public API compatibility
3. Update imports across codebase

### Phase 5: Testing & Validation
1. Run existing tests
2. Manual testing of state operations
3. Verify persistence works correctly

---

## ✅ Benefits

1. **Clarity**: Each manager has single, clear responsibility
2. **Testability**: Isolated managers easier to unit test
3. **Maintainability**: Smaller files easier to understand and modify
4. **Reusability**: Managers can be composed differently
5. **Type Safety**: Clearer type boundaries
6. **Performance**: No impact - same caching strategy

---

## 🎯 Success Criteria

- [ ] Each manager file < 200 lines
- [ ] Facade file < 250 lines
- [ ] All existing tests pass
- [ ] No changes to public API
- [ ] Clear documentation in each file
- [ ] Imports updated throughout codebase

---

## 📝 Notes

- Keep existing error messages and logging
- Maintain debounce timing (500ms)
- Preserve singleton pattern
- Keep initialization sequence identical
- No behavioral changes

---

*Created: Following MarieCoder philosophy of mindful refactoring with gratitude for existing patterns*

