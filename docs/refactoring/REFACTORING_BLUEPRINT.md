# Task Refactoring Blueprint - Complete Implementation Guide

## 🎯 Executive Summary

**Current State**: 2,612-line monolithic Task class  
**Target State**: ~300-line orchestrator + 6 focused service modules  
**Estimated Effort**: 40-60 hours  
**Risk Level**: Medium (requires careful testing)  
**Benefits**: 88% code reduction, testable modules, faster debugging

---

## 📋 Phase 1: Extract Message Service (Priority 1)

### File: `src/core/task/services/task_message_service.ts`

**Lines to Extract**: 418-665 from Task class  
**Dependencies**: TaskState, MessageStateHandler, postStateToWebview callback  
**Estimated Size**: ~280 lines

```typescript
import { ClineAsk, ClineAskResponse, ClineMessage, ClineSay } from "@shared/ExtensionMessage"
import { convertClineMessageToProto } from "@shared/proto-conversions/cline-message"
import { sendPartialMessageEvent } from "@core/controller/ui/subscribeToPartialMessage"
import { formatResponse } from "@core/prompts/response_formatters"
import { ClineDefaultTool } from "@shared/tools"
import { TaskState } from "../TaskState"
import { MessageStateHandler } from "../message-state"
import pWaitFor from "p-wait-for"

/**
 * Handles all message communication between Task and the UI webview.
 * 
 * Responsibilities:
 * - Send questions to user (ask)
 * - Send notifications to user (say)
 * - Handle partial/streaming messages
 * - Manage message state and persistence
 */
export class TaskMessageService {
  constructor(
    private readonly taskState: TaskState,
    private readonly messageStateHandler: MessageStateHandler,
    private readonly postStateToWebview: () => Promise<void>
  ) {}

  /**
   * Ask user a question and wait for response
   * 
   * Handles both partial (streaming) and complete messages.
   * Partial messages update existing UI elements progressively.
   * 
   * @param type - Type of question (tool, command, etc.)
   * @param text - Question text
   * @param partial - Whether this is a partial/streaming update
   * @returns User's response with optional text/images/files
   */
  async ask(
    type: ClineAsk,
    text?: string,
    partial?: boolean,
  ): Promise<{
    response: ClineAskResponse
    text?: string
    images?: string[]
    files?: string[]
    askTs?: number
  }> {
    // Check if task was aborted
    if (this.taskState.abort) {
      throw new Error("Task instance aborted")
    }

    let askTs: number

    // Handle partial vs complete messages
    if (partial !== undefined) {
      const result = await this.handlePartialAsk(type, text, partial)
      askTs = result.askTs
    } else {
      askTs = await this.handleCompleteAsk(type, text)
    }

    // Wait for user response
    await pWaitFor(
      () => this.taskState.askResponse !== undefined || this.taskState.lastMessageTs !== askTs,
      { interval: 100 }
    )

    // Verify this response is for our question (not superseded)
    if (this.taskState.lastMessageTs !== askTs) {
      throw new Error("Ask promise was superseded by newer message")
    }

    // Extract and clear response
    const result = {
      response: this.taskState.askResponse!,
      text: this.taskState.askResponseText,
      images: this.taskState.askResponseImages,
      files: this.taskState.askResponseFiles,
    }

    this.clearAskResponse()
    return result
  }

  /**
   * Send message to user (notification, status update, etc.)
   * 
   * @param type - Type of message (text, api_req_started, tool, etc.)
   * @param text - Message text
   * @param images - Optional images
   * @param files - Optional files
   * @param partial - Whether this is a partial/streaming update
   * @returns Message timestamp
   */
  async say(
    type: ClineSay,
    text?: string,
    images?: string[],
    files?: string[],
    partial?: boolean,
  ): Promise<number | undefined> {
    if (this.taskState.abort) {
      throw new Error("Task instance aborted")
    }

    if (partial !== undefined) {
      return await this.handlePartialSay(type, text, images, files, partial)
    } else {
      return await this.handleCompleteSay(type, text, images, files)
    }
  }

  /**
   * Convenience method for missing parameter errors
   */
  async sayAndCreateMissingParamError(
    toolName: ClineDefaultTool,
    paramName: string,
    relPath?: string
  ): Promise<string> {
    await this.say(
      "error",
      `Cline tried to use ${toolName}${
        relPath ? ` for '${relPath.toPosix()}'` : ""
      } without value for required parameter '${paramName}'. Retrying...`,
    )
    return formatResponse.toolError(formatResponse.missingToolParameterError(paramName))
  }

  /**
   * Remove last partial message if it matches criteria
   * Used when transitioning from partial to complete messages
   */
  async removeLastPartialMessageIfExistsWithType(
    type: "ask" | "say",
    askOrSay: ClineAsk | ClineSay
  ): Promise<void> {
    const clineMessages = this.messageStateHandler.getClineMessages()
    const lastMessage = clineMessages.at(-1)

    const shouldRemove =
      lastMessage?.partial &&
      lastMessage.type === type &&
      (lastMessage.ask === askOrSay || lastMessage.say === askOrSay)

    if (shouldRemove) {
      this.messageStateHandler.setClineMessages(clineMessages.slice(0, -1))
      await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
    }
  }

  /**
   * Handle user's response from webview
   * Called by controller when user clicks button or submits input
   */
  handleWebviewAskResponse(
    askResponse: ClineAskResponse,
    text?: string,
    images?: string[],
    files?: string[]
  ): void {
    this.taskState.askResponse = askResponse
    this.taskState.askResponseText = text
    this.taskState.askResponseImages = images
    this.taskState.askResponseFiles = files
  }

  // Private helper methods...
  
  private async handlePartialAsk(type: ClineAsk, text: string | undefined, partial: boolean) {
    const clineMessages = this.messageStateHandler.getClineMessages()
    const lastMessage = clineMessages.at(-1)
    const lastMessageIndex = clineMessages.length - 1

    const isUpdatingPreviousPartial =
      lastMessage?.partial && lastMessage.type === "ask" && lastMessage.ask === type

    if (partial) {
      if (isUpdatingPreviousPartial) {
        // Update existing partial message
        await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
          text,
          partial,
        })
        const protoMessage = convertClineMessageToProto(lastMessage)
        await sendPartialMessageEvent(protoMessage)
        throw new Error("Ask promise superseded by update")
      } else {
        // Create new partial message
        const askTs = Date.now()
        this.taskState.lastMessageTs = askTs
        await this.messageStateHandler.addToClineMessages({
          ts: askTs,
          type: "ask",
          ask: type,
          text,
          partial,
        })
        await this.postStateToWebview()
        throw new Error("Ask promise superseded by new partial")
      }
    } else {
      // Finalize partial message
      if (isUpdatingPreviousPartial) {
        this.clearAskResponse()
        const askTs = lastMessage.ts
        this.taskState.lastMessageTs = askTs
        await this.messageStateHandler.updateClineMessage(lastMessageIndex, {
          text,
          partial: false,
        })
        const protoMessage = convertClineMessageToProto(lastMessage)
        await sendPartialMessageEvent(protoMessage)
        return { askTs }
      } else {
        // New complete message (after partial was handled elsewhere)
        return await this.handleCompleteAsk(type, text)
      }
    }
  }

  private async handleCompleteAsk(type: ClineAsk, text: string | undefined) {
    this.clearAskResponse()
    const askTs = Date.now()
    this.taskState.lastMessageTs = askTs
    await this.messageStateHandler.addToClineMessages({
      ts: askTs,
      type: "ask",
      ask: type,
      text,
    })
    await this.postStateToWebview()
    return { askTs }
  }

  private async handlePartialSay(
    type: ClineSay,
    text: string | undefined,
    images: string[] | undefined,
    files: string[] | undefined,
    partial: boolean
  ): Promise<number | undefined> {
    const lastMessage = this.messageStateHandler.getClineMessages().at(-1)
    const isUpdatingPreviousPartial =
      lastMessage?.partial && lastMessage.type === "say" && lastMessage.say === type

    if (partial) {
      if (isUpdatingPreviousPartial) {
        // Update existing partial
        lastMessage.text = text
        lastMessage.images = images
        lastMessage.files = files
        lastMessage.partial = partial
        const protoMessage = convertClineMessageToProto(lastMessage)
        await sendPartialMessageEvent(protoMessage)
        return undefined
      } else {
        // Create new partial
        const sayTs = Date.now()
        this.taskState.lastMessageTs = sayTs
        await this.messageStateHandler.addToClineMessages({
          ts: sayTs,
          type: "say",
          say: type,
          text,
          images,
          files,
          partial,
        })
        await this.postStateToWebview()
        return sayTs
      }
    } else {
      // Finalize partial
      if (isUpdatingPreviousPartial) {
        this.taskState.lastMessageTs = lastMessage.ts
        lastMessage.text = text
        lastMessage.images = images
        lastMessage.files = files
        lastMessage.partial = false
        await this.messageStateHandler.saveClineMessagesAndUpdateHistory()
        const protoMessage = convertClineMessageToProto(lastMessage)
        await sendPartialMessageEvent(protoMessage)
        return undefined
      } else {
        return await this.handleCompleteSay(type, text, images, files)
      }
    }
  }

  private async handleCompleteSay(
    type: ClineSay,
    text: string | undefined,
    images: string[] | undefined,
    files: string[] | undefined
  ): Promise<number> {
    const sayTs = Date.now()
    this.taskState.lastMessageTs = sayTs
    await this.messageStateHandler.addToClineMessages({
      ts: sayTs,
      type: "say",
      say: type,
      text,
      images,
      files,
    })
    await this.postStateToWebview()
    return sayTs
  }

  private clearAskResponse(): void {
    this.taskState.askResponse = undefined
    this.taskState.askResponseText = undefined
    this.taskState.askResponseImages = undefined
    this.taskState.askResponseFiles = undefined
  }
}
```

### Testing Strategy for Message Service:

```typescript
// src/core/task/services/__tests__/task_message_service.test.ts

describe("TaskMessageService", () => {
  let service: TaskMessageService
  let mockTaskState: TaskState
  let mockMessageHandler: MessageStateHandler
  let mockPostToWebview: jest.Mock

  beforeEach(() => {
    mockTaskState = new TaskState()
    mockMessageHandler = createMockMessageHandler()
    mockPostToWebview = jest.fn()
    service = new TaskMessageService(mockTaskState, mockMessageHandler, mockPostToWebview)
  })

  describe("ask", () => {
    it("should create new message and wait for response", async () => {
      // Arrange
      const promise = service.ask("tool", "Test question")
      setTimeout(() => {
        service.handleWebviewAskResponse("yesButtonClicked")
      }, 100)

      // Act
      const result = await promise

      // Assert
      expect(result.response).toBe("yesButtonClicked")
      expect(mockMessageHandler.addToClineMessages).toHaveBeenCalled()
    })

    it("should handle partial messages", async () => {
      // Test partial message flow...
    })

    it("should throw when task is aborted", async () => {
      mockTaskState.abort = true
      await expect(service.ask("tool", "Test")).rejects.toThrow("aborted")
    })
  })

  describe("say", () => {
    it("should send message to webview", async () => {
      const ts = await service.say("text", "Hello")
      expect(ts).toBeGreaterThan(0)
      expect(mockPostToWebview).toHaveBeenCalled()
    })
  })
})
```

---

## 📋 Phase 2: Extract Context Builder (Priority 2)

### File: `src/core/task/services/task_context_builder.ts`

**Lines to Extract**: 2280-2611 from Task class  
**Estimated Size**: ~350 lines

```typescript
/**
 * Builds context for system prompts and API requests
 * 
 * Responsibilities:
 * - Gather workspace information
 * - Format file details
 * - Build environment context
 * - Generate system prompt context
 */
export class TaskContextBuilder {
  constructor(
    private readonly cwd: string,
    private readonly stateManager: StateManager,
    private readonly workspaceManager?: WorkspaceRootManager,
    private readonly clineIgnoreController?: ClineIgnoreController
  ) {}

  async buildSystemPromptContext(): Promise<SystemPromptContext> {
    // Implementation from loadContext()
  }

  async getEnvironmentDetails(includeFileDetails: boolean = false): Promise<EnvironmentInfo> {
    // Implementation from getEnvironmentDetails()
  }

  private formatWorkspaceRootsSection(): string {
    // Implementation from formatWorkspaceRootsSection()
  }

  private formatFileDetailsHeader(): string {
    // Implementation from formatFileDetailsHeader()
  }
}
```

---

## 📋 Phase 3: Extract API Service (Priority 3)

### File: `src/core/task/services/task_api_service.ts`

**Lines to Extract**: 1610-2278 from Task class  
**Estimated Size**: ~700 lines (largest service)

```typescript
/**
 * Handles all API communication with LLM providers
 * 
 * Responsibilities:
 * - Make API requests
 * - Stream responses
 * - Parse assistant messages
 * - Handle retries and errors
 * - Track token usage
 */
export class TaskApiService {
  constructor(
    private readonly api: ApiHandler,
    private readonly taskState: TaskState,
    private readonly messageService: TaskMessageService,
    private readonly contextBuilder: TaskContextBuilder
  ) {}

  async makeApiRequest(userContent: UserContent): Promise<boolean> {
    // Implementation from recursivelyMakeClineRequests()
  }

  private async handleStreamChunk(chunk: any): Promise<void> {
    // Stream parsing logic
  }

  private async attemptApiRequest(previousApiReqIndex: number): AsyncIterableIterator<ApiStream> {
    // Implementation from attemptApiRequest()
  }
}
```

---

## 📋 Phase 4-6: Remaining Services

### `task_lifecycle_service.ts` (~150 lines)
- startTask()
- abortTask()
- Task initialization
- Cleanup logic

### `task_checkpoint_service.ts` (~200 lines)
- saveCheckpoint()
- Git operations
- Checkpoint manager integration

### `task_state_sync.ts` (~100 lines)
- postStateToWebview()
- updateTaskHistory()
- State persistence

---

## 📋 Phase 7: Refactor Main Task Class

### New `src/core/task/index.ts` (~300 lines)

```typescript
export class Task {
  readonly taskId: string
  readonly ulid: string
  
  // Services (dependency injection)
  private readonly services: {
    messages: TaskMessageService
    context: TaskContextBuilder
    api: TaskApiService
    lifecycle: TaskLifecycleService
    checkpoints: TaskCheckpointService
    stateSync: TaskStateSynchronizer
  }
  
  // External dependencies
  readonly api: ApiHandler
  readonly terminalManager: TerminalManager
  readonly browserSession: BrowserSession
  readonly contextManager: ContextManager
  readonly messageStateHandler: MessageStateHandler
  readonly taskState: TaskState
  
  constructor(params: TaskParams) {
    // Initialize core dependencies
    this.taskId = params.taskId
    this.ulid = ulid()
    this.taskState = new TaskState()
    
    // Initialize services
    this.services = {
      messages: new TaskMessageService(
        this.taskState,
        this.messageStateHandler,
        params.postStateToWebview
      ),
      context: new TaskContextBuilder(
        params.cwd,
        params.stateManager,
        params.workspaceManager
      ),
      api: new TaskApiService(
        this.api,
        this.taskState,
        this.services.messages,
        this.services.context
      ),
      lifecycle: new TaskLifecycleService(/* ... */),
      checkpoints: new TaskCheckpointService(/* ... */),
      stateSync: new TaskStateSynchronizer(/* ... */)
    }
  }
  
  // Delegate to services
  async ask(type: ClineAsk, text?: string, partial?: boolean) {
    return this.services.messages.ask(type, text, partial)
  }
  
  async say(type: ClineSay, text?: string, images?: string[], files?: string[], partial?: boolean) {
    return this.services.messages.say(type, text, images, files, partial)
  }
  
  // Main orchestration method
  private async startTask(task?: string, images?: string[], files?: string[]) {
    await this.services.lifecycle.initialize()
    const context = await this.services.context.buildSystemPromptContext()
    const userContent = this.buildUserContent(task, images, files)
    await this.services.api.makeApiRequest(userContent)
  }
}
```

---

## ✅ Migration Checklist

### Before Starting:
- [ ] Create feature branch: `refactor/task-decomposition`
- [ ] Ensure all tests pass on main branch
- [ ] Document current test coverage baseline
- [ ] Set up automated backup/checkpoint system

### During Migration (Per Service):
- [ ] Extract service methods to new file
- [ ] Add proper TypeScript types
- [ ] Add JSDoc documentation
- [ ] Create unit tests (target 80%+ coverage)
- [ ] Update Task class to delegate to service
- [ ] Run integration tests
- [ ] Fix any regressions

### After Each Service:
- [ ] Code review
- [ ] Merge to main (if using incremental approach)
- [ ] Update documentation
- [ ] Deploy to staging for testing

### Final Steps:
- [ ] Remove commented-out old code
- [ ] Update architecture documentation
- [ ] Create migration guide for other teams
- [ ] Celebrate! 🎉

---

## 🎯 Success Metrics

| Metric | Before | Target | Measure |
|--------|--------|---------|---------|
| Task class lines | 2,612 | ~300 | Line count |
| Largest file size | 2,612 | ~350 | Line count |
| Average file size | N/A | ~200 | Line count |
| Test coverage | ~40% | 80%+ | Jest coverage |
| Time to understand Task flow | ~2 hours | ~30 min | Team survey |
| Bugs per deploy (related to Task) | Baseline | -60% | 3 months post-refactor |
| PR review time (Task changes) | Baseline | -50% | Time tracking |

---

## 🚨 Risks & Mitigation

### Risk 1: Breaking Changes
**Mitigation**: Incremental refactoring, comprehensive tests, feature flags

### Risk 2: Performance Regression
**Mitigation**: Benchmark before/after, profile critical paths

### Risk 3: Team Velocity Impact
**Mitigation**: Detailed documentation, pair programming, gradual rollout

### Risk 4: Missed Edge Cases
**Mitigation**: Review git history, check issue tracker, add integration tests

---

## 📚 Additional Resources

- [Martin Fowler - Refactoring](https://refactoring.com/)
- [Working Effectively with Legacy Code](https://www.amazon.com/Working-Effectively-Legacy-Michael-Feathers/dp/0131177052)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)

---

*Guided by KonMari: We honor what this class taught us, and evolve with gratitude toward clarity.*

