# Controller Index.ts Refactoring Plan

**Target File**: `src/core/controller/index.ts`  
**Current Size**: 693 lines (monolithic)  
**Status**: Planning Phase  
**Date**: October 11, 2025

---

## 🎯 Refactoring Goals

### Primary Objectives
1. **Extract Initialization Logic** - Move complex setup into dedicated modules
2. **Create Coordinators** - Separate orchestration concerns
3. **Improve Workspace Management** - Dedicated workspace coordination
4. **Enhance MCP Integration** - Clearer MCP hub management

### Success Criteria
- ✅ Main Controller class < 200 lines
- ✅ All coordinators < 150 lines each
- ✅ Zero linting/TypeScript errors
- ✅ 100% backward compatible
- ✅ Clear service boundaries

---

## 📊 Current Analysis

### File Structure Overview
```
controller/index.ts (693 lines)
├── Imports (43 lines)
├── Controller Class (650 lines)
│   ├── Constructor & Initialization (~150 lines)
│   ├── Task Management (~80 lines)
│   ├── State Management (~70 lines)
│   ├── Workspace Handling (~90 lines)
│   ├── MCP Hub Management (~60 lines)
│   ├── Event Handling (~100 lines)
│   └── UI/WebView Integration (~100 lines)
└── Exports
```

### Key Responsibilities Identified

1. **Initialization** (~150 lines)
   - Extension context setup
   - StateManager initialization
   - MCP Hub creation
   - Workspace detection
   - Settings directory creation

2. **Workspace Management** (~90 lines)
   - Multi-root workspace handling
   - Workspace root detection
   - CWD management
   - Workspace change events

3. **Task Orchestration** (~80 lines)
   - Task creation
   - Task lifecycle
   - Task cancellation
   - Task history updates

4. **State Coordination** (~70 lines)
   - State synchronization
   - WebView updates
   - Settings persistence
   - Cache management

5. **MCP Hub Coordination** (~60 lines)
   - Server management
   - Marketplace catalog
   - Tool/resource registration

6. **Event Handling** (~100 lines)
   - Workspace events
   - Configuration changes
   - Extension lifecycle events

---

## 🏗️ Proposed Architecture

### Module Structure

```
controller/
├── index.ts (Facade - ~180 lines)
│   ├── Main Controller class
│   ├── Task orchestration
│   └── High-level coordination
│
├── initialization/
│   ├── controller_initializer.ts (~130 lines)
│   │   ├── Constructor logic extraction
│   │   ├── Dependency setup
│   │   ├── Event subscription
│   │   └── Initial state configuration
│   │
│   └── extension_setup.ts (~100 lines)
│       ├── Extension context configuration
│       ├── Directory creation (cache, settings, MCP)
│       ├── Cleanup legacy data
│       └── Version checks
│
├── coordinators/
│   ├── workspace_coordinator.ts (~140 lines)
│   │   ├── Multi-root workspace management
│   │   ├── Workspace detection & setup
│   │   ├── CWD resolution
│   │   ├── Workspace change handling
│   │   └── WorkspaceRootManager lifecycle
│   │
│   ├── mcp_coordinator.ts (~120 lines)
│   │   ├── MCP Hub lifecycle
│   │   ├── Server connection management
│   │   ├── Marketplace catalog handling
│   │   ├── Tool/resource registration
│   │   └── MCP event propagation
│   │
│   ├── state_coordinator.ts (~130 lines)
│   │   ├── State synchronization
│   │   ├── WebView state updates
│   │   ├── Persistence error handling
│   │   ├── Cache recovery
│   │   └── External change sync
│   │
│   └── task_coordinator.ts (~110 lines)
│       ├── Task creation orchestration
│       ├── Task lifecycle management
│       ├── History updates
│       ├── Task cancellation
│       └── Task reinit handling
│
├── services/
│   └── webview_service.ts (~120 lines)
│       ├── WebView message dispatching
│       ├── State serialization
│       ├── Event forwarding
│       └── UI updates
│
└── types/
    └── controller_types.ts (~50 lines)
        ├── Controller dependencies
        ├── Initialization options
        └── Event handler types
```

### Total Distribution
- **Facade**: ~180 lines (74% reduction)
- **2 Initialization Modules**: ~230 lines
- **4 Coordinators**: ~500 lines
- **1 Service**: ~120 lines
- **1 Types Module**: ~50 lines
- **System Total**: ~1,080 lines (distributed, organized)

---

## 📋 Implementation Plan

### Phase 1: Types & Foundation (~1 hour)

#### Step 1.1: Extract Type Definitions
**File**: `src/core/controller/types/controller_types.ts`

```typescript
import * as vscode from "vscode"
import { StateManager } from "../../storage/StateManager"
import { McpHub } from "@services/mcp/McpHub"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { Task } from "../../task"

export interface ControllerDependencies {
    context: vscode.ExtensionContext
    stateManager: StateManager
    mcpHub: McpHub
    workspaceManager?: WorkspaceRootManager
}

export interface ControllerInitOptions {
    cleanupLegacyData?: boolean
    initializeWorkspace?: boolean
    setupEventListeners?: boolean
}

export interface TaskCreationParams {
    task?: string
    images?: string[]
    files?: string[]
    historyItem?: any
}

export interface StateUpdateEvent {
    type: "persistence_error" | "external_change" | "task_update"
    data?: any
}

export type EventUnsubscribe = () => void
```

---

### Phase 2: Initialization (~3 hours)

#### Step 2.1: Extension Setup
**File**: `src/core/controller/initialization/extension_setup.ts`

```typescript
import * as vscode from "vscode"
import {
    ensureCacheDirectoryExists,
    ensureMcpServersDirectoryExists,
    ensureSettingsDirectoryExists,
} from "../../storage/disk"
import { cleanupLegacyCheckpoints } from "@integrations/checkpoints/CheckpointMigration"
import { Logger } from "@services/logging/Logger"

/**
 * Handles extension-level setup and configuration
 * Extracted from Controller constructor
 */
export class ExtensionSetup {
    static async initialize(context: vscode.ExtensionContext): Promise<void> {
        await this.createDirectories()
        await this.cleanupLegacyData(context)
        await this.validateEnvironment()
    }

    private static async createDirectories(): Promise<void> {
        try {
            await ensureCacheDirectoryExists()
            await ensureMcpServersDirectoryExists()
            await ensureSettingsDirectoryExists()
        } catch (error) {
            Logger.error(
                "[ExtensionSetup] Failed to create directories",
                error instanceof Error ? error : new Error(String(error))
            )
            throw error
        }
    }

    private static async cleanupLegacyData(
        context: vscode.ExtensionContext
    ): Promise<void> {
        try {
            await cleanupLegacyCheckpoints(context.globalStorageUri.fsPath)
        } catch (error) {
            Logger.warn(
                "[ExtensionSetup] Failed to cleanup legacy data",
                error instanceof Error ? error : new Error(String(error))
            )
            // Non-critical, continue
        }
    }

    private static async validateEnvironment(): Promise<void> {
        // Environment validation logic
        // Check required permissions, paths, etc.
    }
}
```

#### Step 2.2: Controller Initializer
**File**: `src/core/controller/initialization/controller_initializer.ts`

```typescript
import * as vscode from "vscode"
import { Controller } from "../index"
import { StateManager } from "../../storage/StateManager"
import { McpHub } from "@services/mcp/McpHub"
import { ExtensionSetup } from "./extension_setup"
import { WorkspaceCoordinator } from "../coordinators/workspace_coordinator"
import { McpCoordinator } from "../coordinators/mcp_coordinator"
import { StateCoordinator } from "../coordinators/state_coordinator"
import type { ControllerInitOptions } from "../types/controller_types"

/**
 * Orchestrates Controller initialization
 * Extracted from Controller constructor
 */
export class ControllerInitializer {
    static async initialize(
        controller: Controller,
        context: vscode.ExtensionContext,
        options: ControllerInitOptions = {}
    ): Promise<void> {
        // Extension-level setup
        await ExtensionSetup.initialize(context)

        // Setup StateManager callbacks
        await this.setupStateManager(controller)

        // Initialize coordinators
        await this.initializeCoordinators(controller, context)

        // Setup event listeners
        if (options.setupEventListeners !== false) {
            await this.setupEventListeners(controller, context)
        }

        // Initialize workspace if requested
        if (options.initializeWorkspace) {
            await controller.workspaceCoordinator.initialize()
        }
    }

    private static async setupStateManager(
        controller: Controller
    ): Promise<void> {
        StateManager.get().registerCallbacks({
            onPersistenceError: async ({ error }) => {
                await controller.stateCoordinator.handlePersistenceError(error)
            },
            onSyncExternalChange: async () => {
                await controller.stateCoordinator.syncExternalChanges()
            },
        })
    }

    private static async initializeCoordinators(
        controller: Controller,
        context: vscode.ExtensionContext
    ): Promise<void> {
        // Workspace Coordinator
        controller.workspaceCoordinator = new WorkspaceCoordinator(
            context,
            controller.stateManager
        )

        // MCP Coordinator
        controller.mcpCoordinator = new McpCoordinator(
            controller.mcpHub,
            controller.stateManager
        )

        // State Coordinator
        controller.stateCoordinator = new StateCoordinator(
            controller.stateManager,
            controller
        )

        // Task Coordinator
        controller.taskCoordinator = new TaskCoordinator(
            controller,
            controller.stateManager,
            controller.mcpHub
        )
    }

    private static async setupEventListeners(
        controller: Controller,
        context: vscode.ExtensionContext
    ): Promise<void> {
        // Workspace change events
        context.subscriptions.push(
            vscode.workspace.onDidChangeWorkspaceFolders(async (event) => {
                await controller.workspaceCoordinator.handleWorkspaceChange(event)
            })
        )

        // Configuration change events
        context.subscriptions.push(
            vscode.workspace.onDidChangeConfiguration(async (event) => {
                if (event.affectsConfiguration("marie")) {
                    await controller.stateCoordinator.syncState()
                }
            })
        )
    }
}
```

---

### Phase 3: Coordinators (~5 hours)

#### Step 3.1: Workspace Coordinator
**File**: `src/core/controller/coordinators/workspace_coordinator.ts`

```typescript
import * as vscode from "vscode"
import { StateManager } from "../../storage/StateManager"
import { WorkspaceRootManager } from "@core/workspace/WorkspaceRootManager"
import { detectWorkspaceRoots } from "@core/workspace/detection"
import { setupWorkspaceManager } from "@core/workspace/setup"
import { isMultiRootEnabled } from "@core/workspace/multi-root-utils"
import { getCwd } from "@utils/path"
import { Logger } from "@services/logging/Logger"

/**
 * Coordinates workspace management and multi-root support
 */
export class WorkspaceCoordinator {
    private workspaceManager?: WorkspaceRootManager
    private currentCwd: string

    constructor(
        private context: vscode.ExtensionContext,
        private stateManager: StateManager
    ) {
        this.currentCwd = getCwd()
    }

    async initialize(): Promise<void> {
        if (isMultiRootEnabled()) {
            await this.setupMultiRootWorkspace()
        } else {
            Logger.info("[WorkspaceCoordinator] Multi-root disabled, using single CWD")
        }
    }

    async setupMultiRootWorkspace(): Promise<void> {
        try {
            const roots = await detectWorkspaceRoots()
            if (roots.length > 0) {
                this.workspaceManager = await setupWorkspaceManager(
                    roots,
                    this.stateManager
                )
                Logger.info(
                    `[WorkspaceCoordinator] Multi-root workspace initialized with ${roots.length} roots`
                )
            }
        } catch (error) {
            Logger.error(
                "[WorkspaceCoordinator] Failed to setup multi-root workspace",
                error instanceof Error ? error : new Error(String(error))
            )
            // Fallback to single CWD
        }
    }

    async handleWorkspaceChange(
        event: vscode.WorkspaceFoldersChangeEvent
    ): Promise<void> {
        Logger.info(
            `[WorkspaceCoordinator] Workspace changed: +${event.added.length} -${event.removed.length}`
        )

        if (isMultiRootEnabled()) {
            await this.reinitializeWorkspace()
        }
    }

    async reinitializeWorkspace(): Promise<void> {
        await this.cleanup()
        await this.initialize()
    }

    getCwd(): string {
        return this.workspaceManager?.getActiveCwd() || this.currentCwd
    }

    getWorkspaceManager(): WorkspaceRootManager | undefined {
        return this.workspaceManager
    }

    async cleanup(): Promise<void> {
        if (this.workspaceManager) {
            await this.workspaceManager.dispose()
            this.workspaceManager = undefined
        }
    }
}
```

#### Step 3.2: MCP Coordinator
**File**: `src/core/controller/coordinators/mcp_coordinator.ts`

```typescript
import { McpHub } from "@services/mcp/McpHub"
import { StateManager } from "../../storage/StateManager"
import { sendMcpMarketplaceCatalogEvent } from "../mcp/subscribeToMcpMarketplaceCatalog"
import { Logger } from "@services/logging/Logger"
import type { McpMarketplaceCatalog } from "@shared/mcp"

/**
 * Coordinates MCP Hub lifecycle and events
 */
export class McpCoordinator {
    constructor(
        private mcpHub: McpHub,
        private stateManager: StateManager
    ) {}

    async initialize(): Promise<void> {
        await this.loadMarketplaceCatalog()
        await this.connectServers()
    }

    async loadMarketplaceCatalog(): Promise<void> {
        try {
            const catalog = await this.mcpHub.getMarketplaceCatalog()
            await sendMcpMarketplaceCatalogEvent(catalog)
        } catch (error) {
            Logger.error(
                "[McpCoordinator] Failed to load marketplace catalog",
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async connectServers(): Promise<void> {
        const enabledServers = this.stateManager.state.mcpServers || []
        
        for (const server of enabledServers) {
            if (server.enabled) {
                await this.connectServer(server.name)
            }
        }
    }

    async connectServer(serverName: string): Promise<void> {
        try {
            await this.mcpHub.connectServer(serverName)
            Logger.info(`[McpCoordinator] Connected to MCP server: ${serverName}`)
        } catch (error) {
            Logger.error(
                `[McpCoordinator] Failed to connect to ${serverName}`,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async disconnectServer(serverName: string): Promise<void> {
        try {
            await this.mcpHub.disconnectServer(serverName)
            Logger.info(`[McpCoordinator] Disconnected from MCP server: ${serverName}`)
        } catch (error) {
            Logger.error(
                `[McpCoordinator] Failed to disconnect from ${serverName}`,
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async refreshMarketplace(): Promise<McpMarketplaceCatalog | null> {
        try {
            const catalog = await this.mcpHub.refreshMarketplaceCatalog()
            await sendMcpMarketplaceCatalogEvent(catalog)
            return catalog
        } catch (error) {
            Logger.error(
                "[McpCoordinator] Failed to refresh marketplace",
                error instanceof Error ? error : new Error(String(error))
            )
            return null
        }
    }

    async cleanup(): Promise<void> {
        await this.mcpHub.disconnectAll()
    }
}
```

#### Step 3.3: State Coordinator
**File**: `src/core/controller/coordinators/state_coordinator.ts`

```typescript
import { StateManager } from "../../storage/StateManager"
import { sendStateUpdate } from "../state/subscribeToState"
import { Logger } from "@services/logging/Logger"
import { HostProvider } from "@/hosts/host-provider"
import { ShowMessageType } from "@/shared/proto/host/window"
import type { Controller } from "../index"

/**
 * Coordinates state synchronization and persistence
 */
export class StateCoordinator {
    constructor(
        private stateManager: StateManager,
        private controller: Controller
    ) {}

    async syncState(): Promise<void> {
        await this.postStateToWebview()
    }

    async postStateToWebview(): Promise<void> {
        try {
            await sendStateUpdate(this.controller)
        } catch (error) {
            Logger.error(
                "[StateCoordinator] Failed to post state to webview",
                error instanceof Error ? error : new Error(String(error))
            )
        }
    }

    async handlePersistenceError(error: unknown): Promise<void> {
        Logger.error(
            "[StateCoordinator] Cache persistence failed, recovering",
            error instanceof Error ? error : new Error(String(error))
        )

        try {
            await this.recoverFromPersistenceError()
            await this.postStateToWebview()
            
            HostProvider.window.showMessage({
                type: ShowMessageType.WARNING,
                message: "Saving settings to storage failed.",
            })
        } catch (recoveryError) {
            Logger.error(
                "[StateCoordinator] Cache recovery failed",
                recoveryError instanceof Error ? 
                    recoveryError : 
                    new Error(String(recoveryError))
            )
            
            HostProvider.window.showMessage({
                type: ShowMessageType.ERROR,
                message: "Failed to save settings. Please restart the extension.",
            })
        }
    }

    async recoverFromPersistenceError(): Promise<void> {
        await this.stateManager.reInitialize(this.controller.task?.taskId)
    }

    async syncExternalChanges(): Promise<void> {
        Logger.info("[StateCoordinator] Syncing external state changes")
        await this.postStateToWebview()
    }

    async updateTaskHistory(historyItem: any): Promise<any[]> {
        const currentHistory = this.stateManager.state.taskHistory || []
        const updatedHistory = [historyItem, ...currentHistory]
        
        await this.stateManager.setState({
            taskHistory: updatedHistory,
        })

        return updatedHistory
    }
}
```

#### Step 3.4: Task Coordinator
**File**: `src/core/controller/coordinators/task_coordinator.ts`

```typescript
import { Task } from "../../task"
import { StateManager } from "../../storage/StateManager"
import { McpHub } from "@services/mcp/McpHub"
import { Logger } from "@services/logging/Logger"
import type { Controller } from "../index"
import type { TaskCreationParams } from "../types/controller_types"
import { HistoryItem } from "@shared/HistoryItem"

/**
 * Coordinates task lifecycle and orchestration
 */
export class TaskCoordinator {
    constructor(
        private controller: Controller,
        private stateManager: StateManager,
        private mcpHub: McpHub
    ) {}

    async createTask(params: TaskCreationParams): Promise<Task> {
        const taskId = ulid()

        const task = new Task({
            controller: this.controller,
            mcpHub: this.mcpHub,
            updateTaskHistory: this.updateTaskHistory.bind(this),
            postStateToWebview: this.postStateToWebview.bind(this),
            reinitExistingTaskFromId: this.reinitTask.bind(this),
            cancelTask: this.cancelTask.bind(this),
            shellIntegrationTimeout: this.getShellIntegrationTimeout(),
            terminalReuseEnabled: this.getTerminalReuseEnabled(),
            terminalOutputLineLimit: this.getTerminalOutputLineLimit(),
            defaultTerminalProfile: this.getDefaultTerminalProfile(),
            cwd: this.controller.workspaceCoordinator.getCwd(),
            stateManager: this.stateManager,
            workspaceManager: this.controller.workspaceCoordinator.getWorkspaceManager(),
            taskId,
            ...params,
        })

        this.controller.task = task
        await this.postStateToWebview()

        return task
    }

    async cancelTask(): Promise<void> {
        if (this.controller.task) {
            await this.controller.task.abort()
            this.controller.task = undefined
            await this.postStateToWebview()
        }
    }

    async reinitTask(taskId: string): Promise<void> {
        Logger.info(`[TaskCoordinator] Reinitializing task: ${taskId}`)
        
        const historyItem = this.findHistoryItem(taskId)
        if (!historyItem) {
            Logger.error(`[TaskCoordinator] Task not found: ${taskId}`)
            return
        }

        await this.createTask({ historyItem })
    }

    private findHistoryItem(taskId: string): HistoryItem | undefined {
        return this.stateManager.state.taskHistory?.find(
            (item) => item.id === taskId
        )
    }

    private async updateTaskHistory(historyItem: HistoryItem): Promise<HistoryItem[]> {
        return this.controller.stateCoordinator.updateTaskHistory(historyItem)
    }

    private async postStateToWebview(): Promise<void> {
        await this.controller.stateCoordinator.postStateToWebview()
    }

    private getShellIntegrationTimeout(): number {
        return this.stateManager.state.shellIntegrationTimeout || 5000
    }

    private getTerminalReuseEnabled(): boolean {
        return this.stateManager.state.terminalReuseEnabled ?? true
    }

    private getTerminalOutputLineLimit(): number {
        return this.stateManager.state.terminalOutputLineLimit || 500
    }

    private getDefaultTerminalProfile(): string {
        return this.stateManager.state.defaultTerminalProfile || ""
    }
}
```

---

### Phase 4: Facade Refactoring (~2 hours)

#### Step 4.1: Simplified Controller
**File**: `src/core/controller/index.ts` (Refactored)

```typescript
import * as vscode from "vscode"
import { StateManager } from "../storage/StateManager"
import { McpHub } from "@services/mcp/McpHub"
import { Task } from "../task"
import { ControllerInitializer } from "./initialization/controller_initializer"
import { WorkspaceCoordinator } from "./coordinators/workspace_coordinator"
import { McpCoordinator } from "./coordinators/mcp_coordinator"
import { StateCoordinator } from "./coordinators/state_coordinator"
import { TaskCoordinator } from "./coordinators/task_coordinator"
import type { TaskCreationParams } from "./types/controller_types"

/**
 * Main Controller for Marie extension
 * Orchestrates coordinators and manages extension lifecycle
 */
export class Controller {
    // Current task
    task?: Task

    // Core services
    readonly mcpHub: McpHub
    readonly stateManager: StateManager

    // Coordinators
    workspaceCoordinator: WorkspaceCoordinator
    mcpCoordinator: McpCoordinator
    stateCoordinator: StateCoordinator
    taskCoordinator: TaskCoordinator

    constructor(readonly context: vscode.ExtensionContext) {
        // Initialize core services
        HostProvider.get().logToChannel("Controller instantiated")
        this.stateManager = StateManager.get()
        
        this.mcpHub = new McpHub(
            () => ensureMcpServersDirectoryExists(),
            () => ensureSettingsDirectoryExists(),
            ExtensionRegistryInfo.version
        )

        // Delegate initialization
        ControllerInitializer.initialize(this, context, {
            initializeWorkspace: true,
            setupEventListeners: true,
        })
    }

    /**
     * Create a new task with given parameters
     */
    async startTask(params: TaskCreationParams): Promise<Task> {
        return this.taskCoordinator.createTask(params)
    }

    /**
     * Cancel the current task
     */
    async cancelCurrentTask(): Promise<void> {
        await this.taskCoordinator.cancelTask()
    }

    /**
     * Reinitialize task from history
     */
    async reinitTask(taskId: string): Promise<void> {
        await this.taskCoordinator.reinitTask(taskId)
    }

    /**
     * Update webview with current state
     */
    async postStateToWebview(): Promise<void> {
        await this.stateCoordinator.postStateToWebview()
    }

    /**
     * Get current working directory
     */
    getCwd(): string {
        return this.workspaceCoordinator.getCwd()
    }

    /**
     * Cleanup resources
     */
    async dispose(): Promise<void> {
        await this.task?.abort()
        await this.workspaceCoordinator.cleanup()
        await this.mcpCoordinator.cleanup()
    }
}
```

---

## 🎓 Key Patterns Applied

### From Previous Refactorings:

1. **Coordinator Pattern**
   - WorkspaceCoordinator: Workspace management
   - McpCoordinator: MCP Hub lifecycle
   - StateCoordinator: State synchronization
   - TaskCoordinator: Task orchestration

2. **Initializer Pattern**
   - Complex initialization extracted
   - Step-by-step setup
   - Error handling centralized

3. **Facade Simplification**
   - Controller delegates to coordinators
   - Public API simplified
   - Internal complexity hidden

4. **Single Responsibility**
   - Each coordinator manages one concern
   - Clear boundaries
   - Easy to test

---

## ✅ Quality Checklist

### Before Implementation:
- [x] Understand controller responsibilities
- [x] Identify coordinator boundaries
- [x] Plan initialization flow
- [x] Design coordinator interfaces
- [x] Estimate module sizes

### During Implementation:
- [ ] Maintain all callbacks
- [ ] Preserve event handling
- [ ] Test workspace switching
- [ ] Validate MCP integration
- [ ] Ensure state sync works

### After Implementation:
- [ ] Controller < 200 lines
- [ ] All coordinators < 150 lines
- [ ] Zero linting errors
- [ ] All functionality preserved
- [ ] Documentation complete

---

## 📈 Expected Results

### Before:
- **Main file**: 693 lines
- **Complexity**: Very High (mixed concerns)
- **Testability**: Difficult (tight coupling)

### After:
- **Main file**: ~180 lines (74% reduction)
- **Initialization**: 2 modules (~230 lines)
- **Coordinators**: 4 modules (~500 lines)
- **Services**: 1 module (~120 lines)
- **Types**: 1 module (~50 lines)
- **Total**: ~1,080 lines (organized)
- **Complexity**: Low per module
- **Testability**: High (isolated)

---

## 🚀 Implementation Strategy

1. **Phase 1**: Extract types (foundation)
2. **Phase 2**: Create initialization modules (setup logic)
3. **Phase 3**: Implement coordinators (one at a time)
4. **Phase 4**: Refactor Controller class (integration)
5. **Phase 5**: Test & validate (ensure all features work)
6. **Phase 6**: Document (completion summary)

---

## 🙏 Philosophy Application

### OBSERVE
The Controller evolved to manage extension lifecycle, workspace, MCP, state, and tasks—all in one class.

### APPRECIATE
This centralized approach enabled rapid development and kept control logic accessible.

### LEARN
We learned that coordination can be separated from implementation, improving clarity and testability.

### EVOLVE
We'll extract coordinators for each major concern while preserving the Controller's orchestration role.

### RELEASE
The monolithic Controller served us well. Now we refactor with gratitude.

### SHARE
This plan applies patterns proven in StateManager, TaskCheckpointManager, and Task refactorings.

---

*Plan created following MarieCoder Development Standards*  
*Estimated time: 11-14 hours*  
*Ready for implementation*

