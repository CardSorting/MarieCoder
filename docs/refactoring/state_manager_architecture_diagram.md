# StateManager Architecture Diagram

## Before Refactoring: Monolithic (754 lines)

```
┌─────────────────────────────────────────────────────────────┐
│                      StateManager.ts                         │
│                        (754 lines)                           │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Global State Cache + CRUD Methods                  │    │
│  │ (globalStateCache, pendingGlobalState)             │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Task Settings Cache + CRUD Methods                 │    │
│  │ (taskStateCache, pendingTaskState)                 │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Secrets Cache + CRUD Methods                       │    │
│  │ (secretsCache, pendingSecrets)                     │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Workspace State Cache + CRUD Methods               │    │
│  │ (workspaceStateCache, pendingWorkspaceState)       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ Debounced Persistence Logic                        │    │
│  │ (scheduleDebouncedPersistence, persistBatch)       │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ File Watcher Logic                                 │    │
│  │ (taskHistoryWatcher, setupTaskHistoryWatcher)      │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │ API Configuration Composition                      │    │
│  │ (getApiConfiguration, setApiConfiguration)         │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘

Problems:
❌ Mixed concerns (state, persistence, watching, composition)
❌ Hard to test (everything tightly coupled)
❌ Hard to understand (754 lines of intertwined logic)
❌ Hard to modify (change affects multiple concerns)
```

## After Refactoring: Modular (358 line facade + 8 focused modules)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    StateManager.ts (Facade)                          │
│                          (358 lines)                                 │
│                                                                       │
│  • Singleton pattern                                                 │
│  • Initialization lifecycle                                          │
│  • Delegates to specialized managers                                 │
│  • Maintains backward compatible public API                          │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                 ┌──────────────────┼──────────────────┐
                 │                  │                  │
                 ▼                  ▼                  ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ State Managers   │  │  Persistence     │  │   Services       │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
                 │                  │                  │
      ┌──────────┼──────────┐      │                  │
      │          │          │      │                  │
      ▼          ▼          ▼      ▼                  ▼
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Global  │ │  Task   │ │Secrets  │ │Persist. │ │   API   │
│  State  │ │ Settings│ │ Manager │ │Coordin. │ │  Config │
│ Manager │ │ Manager │ │         │ │         │ │ Service │
│(118 ln) │ │(133 ln) │ │(101 ln) │ │(194 ln) │ │(156 ln) │
└─────────┘ └─────────┘ └─────────┘ └─────────┘ └─────────┘

┌─────────┐ ┌─────────┐
│Workspace│ │  Task   │
│  State  │ │ History │
│ Manager │ │ Watcher │
│(115 ln) │ │ (89 ln) │
└─────────┘ └─────────┘

┌─────────────────────────────────────────────────────────────┐
│                   types/state_manager_types.ts               │
│                       (39 lines)                             │
│   • PersistenceErrorEvent                                    │
│   • StateManagerCallbacks                                    │
│   • PersistenceConfig                                        │
└─────────────────────────────────────────────────────────────┘

Benefits:
✅ Clear separation of concerns
✅ Easy to test (isolated modules)
✅ Easy to understand (< 200 lines per module)
✅ Easy to modify (changes isolated to relevant module)
✅ Composition over monolith
✅ Same public API (backward compatible)
```

## Detailed Module Responsibilities

```
┌──────────────────────────────────────────────────────────────┐
│                 GlobalStateManager                            │
│                    (118 lines)                                │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Manage global state cache                                  │
│  • CRUD operations for GlobalStateAndSettings                 │
│  • Batch operations                                           │
│  • Persistence delegation                                     │
│                                                               │
│ Key Methods:                                                  │
│  • set() / setBatch()                                         │
│  • getStateKey() / getSettingsKey()                           │
│  • persistBatch()                                             │
│  • clear()                                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  TaskStateManager                             │
│                    (133 lines)                                │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Manage task-specific settings overrides                    │
│  • Load/save task settings from disk                          │
│  • Fallback to global settings                                │
│  • Lifecycle management                                       │
│                                                               │
│ Key Methods:                                                  │
│  • load(taskId) / clear()                                     │
│  • set() / setBatch() / get()                                 │
│  • persistBatch()                                             │
│  • reset()                                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    SecretsManager                             │
│                     (101 lines)                               │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Manage secure credentials (API keys)                       │
│  • Use VS Code secrets API                                    │
│  • Never log or expose secrets                                │
│  • Batch operations                                           │
│                                                               │
│ Key Methods:                                                  │
│  • set() / setBatch() / get()                                 │
│  • persistBatch() - stores/deletes in VS Code secrets         │
│  • clear()                                                    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                WorkspaceStateManager                          │
│                     (115 lines)                               │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Manage workspace-scoped state                              │
│  • Handle arbitrary key cleanup                               │
│  • Per-workspace settings                                     │
│  • Dynamic key management                                     │
│                                                               │
│ Key Methods:                                                  │
│  • set() / setBatch() / get()                                 │
│  • clearArbitraryKey() - for migrations                       │
│  • getAllKeys() - includes dynamic keys                       │
│  • persistBatch()                                             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│               PersistenceCoordinator                          │
│                     (194 lines)                               │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Coordinate debounced persistence                           │
│  • Batch writes across all state types                        │
│  • 500ms debounce window                                      │
│  • Error handling with callbacks                              │
│                                                               │
│ Key Methods:                                                  │
│  • scheduleGlobalState() / scheduleTaskState()                │
│  • scheduleSecrets() / scheduleWorkspaceState()               │
│  • persistTaskStateImmediate()                                │
│  • clearPending()                                             │
│                                                               │
│ Coordinates:                                                  │
│  • GlobalStateManager.persistBatch()                          │
│  • TaskStateManager.persistBatch()                            │
│  • SecretsManager.persistBatch()                              │
│  • WorkspaceStateManager.persistBatch()                       │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                 TaskHistoryWatcher                            │
│                      (89 lines)                               │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Watch taskHistory.json for external changes                │
│  • Sync cache without triggering writes                       │
│  • Prevent write loops                                        │
│  • Callback on external changes                               │
│                                                               │
│ Key Methods:                                                  │
│  • start() - initialize chokidar watcher                      │
│  • stop() - cleanup watcher                                   │
│  • syncTaskHistoryFromDisk() - private                        │
│                                                               │
│ Events Handled:                                               │
│  • add, change, unlink, error                                 │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              ApiConfigurationService                          │
│                     (156 lines)                               │
├──────────────────────────────────────────────────────────────┤
│ Responsibilities:                                             │
│  • Compose API configuration from state keys                  │
│  • Decompose configuration to state updates                   │
│  • Handle plan mode and act mode configs                      │
│  • Convenience layer for API configuration                    │
│                                                               │
│ Key Methods:                                                  │
│  • getConfiguration() - compose from managers                 │
│  • setConfiguration() - decompose to managers                 │
│                                                               │
│ Coordinates:                                                  │
│  • GlobalStateManager (settings + config)                     │
│  • TaskStateManager (overrides)                               │
│  • SecretsManager (API keys)                                  │
└──────────────────────────────────────────────────────────────┘
```

## Data Flow Examples

### Setting API Configuration

```
User Code
    │
    ▼
StateManager.setApiConfiguration(config)
    │
    ├─► ApiConfigurationService.setConfiguration(config)
    │       │
    │       ├─► GlobalStateManager.setBatch({ planMode..., actMode... })
    │       └─► SecretsManager.setBatch({ apiKey, openRouterApiKey })
    │
    └─► PersistenceCoordinator.scheduleGlobalStateBatch([keys...])
    └─► PersistenceCoordinator.scheduleSecretsBatch([keys...])
            │
            ▼
        (500ms debounce)
            │
            ▼
        GlobalStateManager.persistBatch()
        SecretsManager.persistBatch()
            │
            ▼
        VS Code State APIs
```

### Loading Task Settings

```
User Code
    │
    ▼
StateManager.loadTaskSettings(taskId)
    │
    └─► TaskStateManager.load(taskId)
            │
            ├─► readTaskSettingsFromStorage(taskId)  // disk
            │
            └─► Populate TaskStateManager cache

Getting Setting (with fallback):
User Code
    │
    ▼
StateManager.getGlobalSettingsKey(key)
    │
    ├─► TaskStateManager.get(key)  // Check override
    │       │
    │       ├─► If found: return task value
    │       └─► If not found: continue
    │
    └─► GlobalStateManager.getSettingsKey(key)  // Get global default
```

### External File Change Sync

```
External Edit: taskHistory.json modified
    │
    ▼
Chokidar detects 'change' event
    │
    ▼
TaskHistoryWatcher.syncTaskHistoryFromDisk()
    │
    ├─► readTaskHistoryFromState()  // disk
    │
    ├─► Compare with GlobalStateManager.getCachedValue('taskHistory')
    │
    ├─► If different:
    │   │
    │   ├─► GlobalStateManager.set('taskHistory', newValue)
    │   │   (NOTE: Does NOT trigger persistence)
    │   │
    │   └─► TaskHistoryWatcher.onSyncExternalChange()
    │           │
    │           └─► Callback to Controller to update UI
    │
    └─► If same: no action (prevents loops)
```

## Summary

The refactoring transformed a 754-line monolithic class into a clean, modular system:

- **358-line facade** maintains backward compatibility
- **8 focused modules** each with clear, single responsibility
- **Better testability** through isolated concerns
- **Easier maintenance** with smaller, focused files
- **No breaking changes** to public API
- **Zero new errors** introduced

This sets the pattern for refactoring the remaining 6 large files.
