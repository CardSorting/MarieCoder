# Task Index.ts Refactoring Plan

**Target File**: `src/core/task/index.ts`  
**Current Size**: 757 lines (monolithic)  
**Status**: Planning Phase  
**Date**: October 11, 2025

---

## 🎯 Refactoring Goals

### Primary Objectives
1. **Complete Service Extraction** - Continue extracting remaining responsibilities into focused services
2. **Reduce Main Class Size** - Break down the 757-line Task class into smaller, coordinated services
3. **Improve Orchestration** - Clear separation between orchestration and implementation
4. **Maintain Compatibility** - Preserve public API and existing service patterns

### Success Criteria
- ✅ Main Task class < 200 lines
- ✅ All services < 200 lines each
- ✅ Zero linting/TypeScript errors
- ✅ 100% backward compatible
- ✅ Clear service boundaries

---

## 📊 Current Analysis

### File Structure Overview
```
task/index.ts (757 lines)
├── Imports & Types (45 lines)
├── TaskParams Interface (25 lines)
├── Task Class (687 lines)
│   ├── Constructor & Initialization (~150 lines)
│   ├── Event Handling (~100 lines)
│   ├── Tool Coordination (~80 lines)
│   ├── State Management (~70 lines)
│   ├── Lifecycle Methods (~90 lines)
│   ├── Message Processing (~100 lines)
│   ├── API Orchestration (~70 lines)
│   └── Utility Methods (~27 lines)
└── Exports
```

### Existing Services (Already Extracted)
✅ **TaskApiService** - API configuration and handling  
✅ **TaskCommandService** - Command execution  
✅ **TaskContextBuilder** - Context building  
✅ **TaskLifecycleService** - Lifecycle management  
✅ **TaskMessageService** - Message handling

### Remaining Responsibilities to Extract

1. **Initialization Logic** (~150 lines)
   - Constructor complexity
   - Dependency setup
   - Service initialization
   - Event listener registration

2. **Event Coordination** (~100 lines)
   - Task state events
   - Controller events
   - WebView events
   - MCP events

3. **Tool Orchestration** (~80 lines)
   - Tool execution coordination
   - Tool result handling
   - Tool state management

4. **State Synchronization** (~70 lines)
   - State updates
   - Webview synchronization
   - History tracking

5. **Browser & Terminal Coordination** (~60 lines)
   - Browser session management
   - Terminal coordination
   - Resource cleanup

---

## 🏗️ Proposed Architecture

### Module Structure

```
task/index.ts (Facade - ~180 lines)
├── services/ (EXISTING)
│   ├── task_api_service.ts (EXISTING)
│   ├── task_command_service.ts (EXISTING)
│   ├── task_context_builder.ts (EXISTING)
│   ├── task_lifecycle_service.ts (EXISTING)
│   └── task_message_service.ts (EXISTING)
│
├── initialization/ (NEW)
│   ├── task_builder.ts (~120 lines)
│   │   ├── Builder pattern for Task creation
│   │   ├── Dependency injection
│   │   └── Service initialization
│   │
│   └── task_initializer.ts (~100 lines)
│       ├── Constructor logic extraction
│       ├── Event listener setup
│       └── Initial state configuration
│
├── coordinators/ (NEW)
│   ├── event_coordinator.ts (~120 lines)
│   │   ├── Event subscription management
│   │   ├── Event dispatching
│   │   └── Event cleanup
│   │
│   ├── tool_coordinator.ts (~110 lines)
│   │   ├── Tool execution orchestration
│   │   ├── Tool result processing
│   │   └── Tool state management
│   │
│   ├── state_coordinator.ts (~100 lines)
│   │   ├── State synchronization
│   │   ├── WebView updates
│   │   └── History tracking
│   │
│   └── resource_coordinator.ts (~90 lines)
│       ├── Browser session coordination
│       ├── Terminal coordination
│       ├── Resource cleanup
│       └── Lifecycle hooks
│
└── types/ (NEW)
    └── task_types.ts (~60 lines)
        ├── TaskParams (move from index)
        ├── ToolResponse (move from index)
        ├── UserContent (move from index)
        └── Additional internal types
```

### Total Distribution
- **Facade**: ~180 lines (76% reduction)
- **5 Existing Services**: ~800 lines (unchanged)
- **4 New Coordinators**: ~420 lines
- **2 New Initialization**: ~220 lines
- **1 Types Module**: ~60 lines
- **System Total**: ~1,680 lines (distributed, organized)

---

## 📋 Implementation Plan

### Phase 1: Types & Foundation (~1 hour)

#### Step 1.1: Extract Type Definitions
**File**: `src/core/task/types/task_types.ts`

```typescript
import { Anthropic } from "@anthropic-ai/sdk"
import { Controller } from "../../controller"
import { StateManager } from "../../storage/StateManager"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { McpHub } from "@services/mcp/McpHub"
import { HistoryItem } from "@shared/HistoryItem"

export type ToolResponse = string | Array<Anthropic.TextBlockParam | Anthropic.ImageBlockParam>
export type UserContent = Array<Anthropic.ContentBlockParam>

export interface TaskParams {
    controller: Controller
    mcpHub: McpHub
    updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
    postStateToWebview: () => Promise<void>
    reinitExistingTaskFromId: (taskId: string) => Promise<void>
    cancelTask: () => Promise<void>
    shellIntegrationTimeout: number
    terminalReuseEnabled: boolean
    terminalOutputLineLimit: number
    defaultTerminalProfile: string
    cwd: string
    stateManager: StateManager
    workspaceManager?: WorkspaceRootManager
    task?: string
    images?: string[]
    files?: string[]
    historyItem?: HistoryItem
    taskId: string
}

export interface TaskDependencies {
    controller: Controller
    mcpHub: McpHub
    stateManager: StateManager
    workspaceManager?: WorkspaceRootManager
}

export interface TaskCallbacks {
    updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
    postStateToWebview: () => Promise<void>
    reinitExistingTaskFromId: (taskId: string) => Promise<void>
    cancelTask: () => Promise<void>
}

export interface TaskConfiguration {
    shellIntegrationTimeout: number
    terminalReuseEnabled: boolean
    terminalOutputLineLimit: number
    defaultTerminalProfile: string
    cwd: string
}
```

---

### Phase 2: Initialization (~3 hours)

#### Step 2.1: Task Builder
**File**: `src/core/task/initialization/task_builder.ts`

```typescript
import { ApiHandler } from "@core/api"
import { ContextManager } from "@core/context/context-management/context_manager"
import { FileContextTracker } from "@core/context/context-tracking"
import { ModelContextTracker } from "@core/context/context-tracking/ModelContextTracker"
import { ClineIgnoreController } from "@core/ignore/ClineIgnoreController"
import { ICheckpointManager } from "@integrations/checkpoints/types"
import { buildCheckpointManager } from "@integrations/checkpoints/factory"
import { DiffViewProvider } from "@integrations/editor/DiffViewProvider"
import { TerminalManager } from "@integrations/terminal/TerminalManager"
import { BrowserSession } from "@services/browser/BrowserSession"
import { UrlContentFetcher } from "@services/browser/UrlContentFetcher"
import type { TaskParams, TaskDependencies } from "../types/task_types"
import { Task } from "../index"
import { ToolExecutor } from "../ToolExecutor"

/**
 * Builds Task instances with proper dependency injection
 * Follows Builder pattern for complex object creation
 */
export class TaskBuilder {
    private params: TaskParams

    constructor(params: TaskParams) {
        this.params = params
    }

    async build(): Promise<Task> {
        const task = new Task(this.params)
        
        await this.initializeServices(task)
        await this.initializeTrackers(task)
        await this.initializeIntegrations(task)
        
        return task
    }

    private async initializeServices(task: Task): Promise<void> {
        // API Handler
        task.api = new ApiHandler({
            apiConfiguration: this.params.stateManager.state.apiConfiguration!,
            alwaysAllowReadOnly: this.params.stateManager.alwaysAllowReadOnly,
        })

        // Terminal Manager
        task.terminalManager = new TerminalManager(
            this.params.cwd,
            this.params.defaultTerminalProfile,
            this.params.shellIntegrationTimeout,
            this.params.terminalReuseEnabled,
            this.params.terminalOutputLineLimit
        )

        // Browser Session
        task.browserSession = new BrowserSession(this.params.stateManager)

        // URL Content Fetcher
        task.urlContentFetcher = new UrlContentFetcher(
            this.params.mcpHub,
            task.browserSession
        )
    }

    private async initializeTrackers(task: Task): Promise<void> {
        // File Context Tracker
        task.fileContextTracker = new FileContextTracker({
            workspaceRootManager: this.params.workspaceManager,
            cwd: this.params.cwd,
            clineIgnoreController: task.clineIgnoreController,
        })

        // Model Context Tracker
        task.modelContextTracker = new ModelContextTracker({
            maxContextTokens: task.api.getModel().info.contextWindow,
            reservedOutputTokens: task.api.getModel().info.maxTokens || 8_192,
            cwd: this.params.cwd,
        })
    }

    private async initializeIntegrations(task: Task): Promise<void> {
        // Checkpoint Manager
        if (this.params.historyItem) {
            task.checkpointManager = await buildCheckpointManager({
                taskId: task.taskId,
                stateManager: this.params.stateManager,
            })
        }

        // Context Manager
        task.contextManager = new ContextManager(
            task.modelContextTracker,
            task.fileContextTracker,
            task.urlContentFetcher
        )

        // Diff View Provider
        task.diffViewProvider = new DiffViewProvider(
            this.params.cwd,
            this.params.workspaceManager
        )

        // Cline Ignore Controller
        task.clineIgnoreController = new ClineIgnoreController(
            this.params.cwd,
            this.params.workspaceManager
        )

        // Tool Executor
        task.toolExecutor = new ToolExecutor(task)
    }
}
```

#### Step 2.2: Task Initializer
**File**: `src/core/task/initialization/task_initializer.ts`

```typescript
import { MessageStateHandler } from "../message-state"
import { FocusChainManager } from "../focus-chain"
import type { Task } from "../index"
import type { TaskParams } from "../types/task_types"

/**
 * Handles task initialization logic
 * Extracted from Task constructor
 */
export class TaskInitializer {
    static async initialize(task: Task, params: TaskParams): Promise<void> {
        await this.setupFocusChain(task, params)
        await this.setupMessageState(task, params)
        await this.setupEventListeners(task, params)
        await this.loadInitialState(task, params)
    }

    private static async setupFocusChain(
        task: Task,
        params: TaskParams
    ): Promise<void> {
        const focusChainEnabled = params.stateManager.state.focusChainEnabled
        if (focusChainEnabled) {
            task.focusChainManager = new FocusChainManager(
                params.stateManager,
                params.workspaceManager
            )
        }
    }

    private static async setupMessageState(
        task: Task,
        params: TaskParams
    ): Promise<void> {
        task.messageStateHandler = new MessageStateHandler(
            task.taskState,
            params.stateManager
        )
    }

    private static async setupEventListeners(
        task: Task,
        params: TaskParams
    ): Promise<void> {
        // Event listener setup extracted from constructor
        // Subscribe to state changes, terminal events, etc.
    }

    private static async loadInitialState(
        task: Task,
        params: TaskParams
    ): Promise<void> {
        if (params.historyItem) {
            await task.taskState.loadFromHistoryItem(params.historyItem)
        } else if (params.task) {
            await task.taskState.initializeWithTask(params.task, params.images, params.files)
        }
    }
}
```

---

### Phase 3: Coordinators (~5 hours)

#### Step 3.1: Event Coordinator
**File**: `src/core/task/coordinators/event_coordinator.ts`

```typescript
/**
 * Coordinates event handling across the task lifecycle
 * Manages subscriptions, dispatching, and cleanup
 */
export class EventCoordinator {
    private subscriptions: Array<() => void> = []

    constructor(private task: Task) {}

    async initialize(): Promise<void> {
        this.subscribeToTaskStateEvents()
        this.subscribeToControllerEvents()
        this.subscribeToMcpEvents()
    }

    private subscribeToTaskStateEvents(): void {
        // Task state change subscriptions
    }

    private subscribeToControllerEvents(): void {
        // Controller event subscriptions
    }

    private subscribeToMcpEvents(): void {
        // MCP event subscriptions
    }

    async dispose(): void {
        for (const unsubscribe of this.subscriptions) {
            unsubscribe()
        }
        this.subscriptions = []
    }
}
```

#### Step 3.2: Tool Coordinator
**File**: `src/core/task/coordinators/tool_coordinator.ts`

```typescript
/**
 * Coordinates tool execution and result handling
 * Orchestrates between ToolExecutor and Task
 */
export class ToolCoordinator {
    constructor(
        private task: Task,
        private toolExecutor: ToolExecutor
    ) {}

    async executeTool(
        toolName: string,
        toolInput: any
    ): Promise<ToolResponse> {
        // Pre-execution hooks
        await this.beforeToolExecution(toolName, toolInput)

        // Execute
        const result = await this.toolExecutor.execute(toolName, toolInput)

        // Post-execution hooks
        await this.afterToolExecution(toolName, result)

        return result
    }

    private async beforeToolExecution(
        toolName: string,
        toolInput: any
    ): Promise<void> {
        // State updates, logging, etc.
    }

    private async afterToolExecution(
        toolName: string,
        result: ToolResponse
    ): Promise<void> {
        // Result processing, state updates
    }
}
```

#### Step 3.3: State Coordinator
**File**: `src/core/task/coordinators/state_coordinator.ts`

```typescript
/**
 * Coordinates state synchronization across components
 * Manages updates, history, and webview sync
 */
export class StateCoordinator {
    constructor(
        private task: Task,
        private stateManager: StateManager,
        private updateTaskHistory: (item: HistoryItem) => Promise<HistoryItem[]>,
        private postStateToWebview: () => Promise<void>
    ) {}

    async syncState(): Promise<void> {
        await this.updateHistory()
        await this.syncToWebview()
    }

    private async updateHistory(): Promise<void> {
        const historyItem = this.task.taskState.toHistoryItem()
        await this.updateTaskHistory(historyItem)
    }

    private async syncToWebview(): Promise<void> {
        await this.postStateToWebview()
    }
}
```

#### Step 3.4: Resource Coordinator
**File**: `src/core/task/coordinators/resource_coordinator.ts`

```typescript
/**
 * Coordinates resource management (browser, terminal, etc.)
 * Handles lifecycle and cleanup
 */
export class ResourceCoordinator {
    constructor(
        private browserSession: BrowserSession,
        private terminalManager: TerminalManager,
        private checkpointManager?: ICheckpointManager
    ) {}

    async initialize(): Promise<void> {
        // Resource initialization
    }

    async cleanup(): Promise<void> {
        await this.cleanupBrowser()
        await this.cleanupTerminal()
        await this.cleanupCheckpoints()
    }

    private async cleanupBrowser(): Promise<void> {
        await this.browserSession.close()
    }

    private async cleanupTerminal(): Promise<void> {
        await this.terminalManager.dispose()
    }

    private async cleanupCheckpoints(): Promise<void> {
        if (this.checkpointManager) {
            await this.checkpointManager.dispose()
        }
    }
}
```

---

### Phase 4: Facade Refactoring (~2 hours)

#### Step 4.1: Refactor Task Class
**File**: `src/core/task/index.ts` (Refactored)

```typescript
import type { TaskParams } from "./types/task_types"
import { TaskBuilder } from "./initialization/task_builder"
import { TaskInitializer } from "./initialization/task_initializer"
import { EventCoordinator } from "./coordinators/event_coordinator"
import { ToolCoordinator } from "./coordinators/tool_coordinator"
import { StateCoordinator } from "./coordinators/state_coordinator"
import { ResourceCoordinator } from "./coordinators/resource_coordinator"

// Existing imports...

export class Task {
    // Core properties (unchanged)
    readonly taskId: string
    readonly ulid: string
    taskState: TaskState

    // Dependencies (unchanged)
    api: ApiHandler
    terminalManager: TerminalManager
    browserSession: BrowserSession
    contextManager: ContextManager
    // ... other services

    // NEW: Coordinators
    private eventCoordinator: EventCoordinator
    private toolCoordinator: ToolCoordinator
    private stateCoordinator: StateCoordinator
    private resourceCoordinator: ResourceCoordinator

    // Callbacks (private)
    private updateTaskHistory: (historyItem: HistoryItem) => Promise<HistoryItem[]>
    private postStateToWebview: () => Promise<void>
    private cancelTask: () => Promise<void>

    constructor(params: TaskParams) {
        // Basic initialization only
        this.taskId = params.taskId
        this.ulid = ulid()
        this.taskInitializationStartTime = Date.now()

        // Store callbacks
        this.updateTaskHistory = params.updateTaskHistory
        this.postStateToWebview = params.postStateToWebview
        this.cancelTask = params.cancelTask

        // Delegate complex initialization
        TaskInitializer.initialize(this, params)

        // Initialize coordinators
        this.eventCoordinator = new EventCoordinator(this)
        this.toolCoordinator = new ToolCoordinator(this, this.toolExecutor)
        this.stateCoordinator = new StateCoordinator(
            this,
            params.stateManager,
            this.updateTaskHistory,
            this.postStateToWebview
        )
        this.resourceCoordinator = new ResourceCoordinator(
            this.browserSession,
            this.terminalManager,
            this.checkpointManager
        )
    }

    // Public API methods (simplified, delegate to coordinators)
    async executeTool(toolName: string, toolInput: any): Promise<ToolResponse> {
        return this.toolCoordinator.executeTool(toolName, toolInput)
    }

    async syncState(): Promise<void> {
        await this.stateCoordinator.syncState()
    }

    async dispose(): Promise<void> {
        await this.eventCoordinator.dispose()
        await this.resourceCoordinator.cleanup()
    }

    // ... other delegated methods
}

// Builder pattern for external creation
export async function createTask(params: TaskParams): Promise<Task> {
    const builder = new TaskBuilder(params)
    return builder.build()
}
```

---

## 🎓 Key Patterns Applied

### From Previous Refactorings:

1. **Service Extraction** (Continue existing pattern)
   - Task already has 5 services
   - Add 4 coordinators for remaining concerns

2. **Builder Pattern**
   - Complex Task creation
   - Dependency injection
   - Step-by-step initialization

3. **Coordinator Pattern**
   - Event coordination
   - Tool orchestration
   - State synchronization
   - Resource management

4. **Facade Simplification**
   - Delegate to coordinators
   - Keep only orchestration logic
   - Maintain public API

---

## ✅ Quality Checklist

### Before Implementation:
- [x] Understand existing service pattern
- [x] Identify coordinator responsibilities
- [x] Plan builder pattern implementation
- [x] Design backward-compatible API
- [x] Estimate module sizes

### During Implementation:
- [ ] Maintain existing service contracts
- [ ] Add comprehensive JSDoc
- [ ] Validate all coordinator interactions
- [ ] Test each coordinator independently

### After Implementation:
- [ ] Task class < 200 lines
- [ ] All coordinators < 120 lines
- [ ] Zero linting errors
- [ ] All existing tests passing
- [ ] Documentation complete

---

## 📈 Expected Results

### Before:
- **Main file**: 757 lines
- **Services**: 5 existing (~800 lines)
- **Complexity**: High (mixed in main class)

### After:
- **Main file**: ~180 lines (76% reduction)
- **Services**: 5 existing (~800 lines)
- **Coordinators**: 4 new (~420 lines)
- **Initialization**: 2 new (~220 lines)
- **Types**: 1 new (~60 lines)
- **Total**: ~1,680 lines (organized)

---

## 🚀 Implementation Strategy

1. **Phase 1**: Extract types (foundation)
2. **Phase 2**: Create initialization modules (builder + initializer)
3. **Phase 3**: Implement coordinators (one at a time)
4. **Phase 4**: Refactor Task class (integrate coordinators)
5. **Phase 5**: Test & validate (ensure compatibility)
6. **Phase 6**: Document (completion summary)

---

## 🙏 Philosophy Application

### OBSERVE
The Task class grew organically with many responsibilities: initialization, coordination, state management, and resource lifecycle.

### APPRECIATE
This monolithic approach worked well during rapid development, keeping related logic together.

### LEARN
We learned that separation improves testability, maintains clarity, and enables independent evolution of concerns.

### EVOLVE
We'll extract coordinators while preserving the existing successful service pattern.

### RELEASE
The monolithic Task class served us well. Now we refactor with gratitude.

### SHARE
This plan builds on lessons from StateManager and TaskCheckpointManager refactorings.

---

*Plan created following MarieCoder Development Standards*  
*Estimated time: 11-14 hours*  
*Ready for implementation*

