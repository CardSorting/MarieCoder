# Controller Event System

A decoupled event system for coordinator communication without tight coupling.

## Overview

The Controller Event System provides a type-safe, decoupled way for coordinators to communicate events without direct dependencies on each other. This improves testability, maintainability, and allows for flexible event-driven architecture.

## Architecture

```
┌─────────────┐
│ Controller  │
│             │
│ ┌─────────┐ │       ┌────────────────┐
│ │ Event   │ │◄──────┤ Coordinators   │
│ │ Emitter │ │       │ emit events    │
│ └─────────┘ │       └────────────────┘
│      │      │
│      ▼      │
│ ┌─────────┐ │       ┌────────────────┐
│ │ Event   │ │──────►│ Subscribers    │
│ │ Bus     │ │       │ listen to events│
│ └─────────┘ │       └────────────────┘
└─────────────┘
```

## Components

### 1. ControllerEventType (Enum)

Defines all available event types:

```typescript
export enum ControllerEventType {
	// Workspace events
	WORKSPACE_INITIALIZED = "workspace:initialized",
	WORKSPACE_CHANGED = "workspace:changed",
	
	// MCP events
	MCP_MARKETPLACE_REFRESH_STARTED = "mcp:marketplace_refresh_started",
	MCP_MARKETPLACE_REFRESH_COMPLETED = "mcp:marketplace_refresh_completed",
	
	// State events
	STATE_SYNCED = "state:synced",
	STATE_PERSISTENCE_ERROR = "state:persistence_error",
	
	// Task events
	TASK_CREATED = "task:created",
	TASK_CANCELLED = "task:cancelled",
	// ... more events
}
```

### 2. ControllerEventPayloads (Interface)

Type-safe payloads for each event:

```typescript
export interface ControllerEventPayloads {
	[ControllerEventType.TASK_CREATED]: {
		taskId: string
		isReinitialization: boolean
	}
	[ControllerEventType.STATE_SYNCED]: {
		timestamp: number
	}
	// ... payload for each event type
}
```

### 3. ControllerEventEmitter (Class)

The event bus implementation:

- **`on(event, listener)`** - Subscribe to an event
- **`once(event, listener)`** - Subscribe one-time
- **`off(event, listener)`** - Unsubscribe
- **`emit(event, payload)`** - Emit an event

## Usage Examples

### Emitting Events (Coordinators)

```typescript
// In TaskCoordinator
await this.eventEmitter.emit(ControllerEventType.TASK_CREATED, {
	taskId,
	isReinitialization: false,
})

// In StateCoordinator
await this.eventEmitter.emit(ControllerEventType.STATE_SYNCED, {
	timestamp: Date.now(),
})
```

### Subscribing to Events (External Code)

```typescript
// Subscribe to task creation
const unsubscribe = controller.on(
	ControllerEventType.TASK_CREATED,
	async (payload) => {
		console.log(`Task created: ${payload.taskId}`)
		if (payload.isReinitialization) {
			console.log("This is a reinitialized task")
		}
	}
)

// Unsubscribe when done
unsubscribe()
```

### One-Time Subscriptions

```typescript
// Subscribe once
controller.once(
	ControllerEventType.WORKSPACE_INITIALIZED,
	async (payload) => {
		console.log(`Workspace initialized with ${payload.rootCount} roots`)
	}
)
```

### Complex Event Handling

```typescript
// Listen to multiple events
const subscriptions = [
	controller.on(ControllerEventType.TASK_CREATED, handleTaskCreated),
	controller.on(ControllerEventType.TASK_CANCELLED, handleTaskCancelled),
	controller.on(ControllerEventType.STATE_SYNCED, handleStateSynced),
]

// Cleanup
function cleanup() {
	subscriptions.forEach(unsub => unsub())
}
```

## Event Categories

### Workspace Events

| Event | Payload | Description |
|-------|---------|-------------|
| `WORKSPACE_INITIALIZED` | `{ rootCount, roots, primaryIndex }` | Workspace manager initialized |
| `WORKSPACE_CHANGED` | `{ added, removed }` | Workspace folders changed |
| `WORKSPACE_CWD_CHANGED` | `{ oldCwd, newCwd }` | Current working directory changed |

### MCP Events

| Event | Payload | Description |
|-------|---------|-------------|
| `MCP_MARKETPLACE_REFRESH_STARTED` | `{ silent }` | Marketplace refresh started |
| `MCP_MARKETPLACE_REFRESH_COMPLETED` | `{ catalog, itemCount, silent }` | Marketplace refreshed |
| `MCP_MARKETPLACE_ERROR` | `{ error, silent }` | Marketplace error occurred |

### State Events

| Event | Payload | Description |
|-------|---------|-------------|
| `STATE_SYNCED` | `{ timestamp }` | State synced to webview |
| `STATE_PERSISTENCE_ERROR` | `{ error }` | State persistence failed |
| `STATE_RECOVERY_SUCCESS` | `{ timestamp }` | Recovery succeeded |
| `STATE_RECOVERY_FAILED` | `{ error }` | Recovery failed |

### Task Events

| Event | Payload | Description |
|-------|---------|-------------|
| `TASK_CREATED` | `{ taskId, isReinitialization }` | Task created |
| `TASK_CANCELLED` | `{ taskId }` | Task cancelled |
| `TASK_REINITIALIZE` | `{ taskId }` | Task reinitialize requested |
| `TASK_HISTORY_UPDATED` | `{ historyItem, historyLength }` | Task history updated |
| `TASK_NEW_USER_STATUS_CHANGED` | `{ isNewUser, taskCount }` | New user status changed |

## Benefits

### 1. Decoupling
Coordinators can communicate without knowing about each other.

### 2. Testability
Easy to mock event emitter and verify events in tests.

### 3. Flexibility
Add new event handlers without modifying coordinator code.

### 4. Type Safety
TypeScript ensures correct event types and payloads.

### 5. Debugging
All events flow through one place, making debugging easier.

## Best Practices

### 1. Event Naming
Use hierarchical naming: `category:action`
```typescript
WORKSPACE_INITIALIZED  // workspace:initialized
MCP_MARKETPLACE_ERROR  // mcp:marketplace_error
```

### 2. Payload Design
Keep payloads focused and minimal:
```typescript
// Good
{ taskId, isReinitialization }

// Bad (too much data)
{ task, taskId, controller, stateManager, ... }
```

### 3. Error Handling
Event listeners should handle their own errors:
```typescript
controller.on(ControllerEventType.TASK_CREATED, async (payload) => {
	try {
		await doSomething(payload)
	} catch (error) {
		Logger.error("Failed to handle task created", error)
	}
})
```

### 4. Cleanup
Always unsubscribe when done:
```typescript
const unsubscribe = controller.on(event, handler)

// Later...
unsubscribe()
```

### 5. Async Listeners
Event emitter waits for async listeners:
```typescript
controller.on(ControllerEventType.STATE_SYNCED, async (payload) => {
	await saveToDatabase(payload)  // Will wait
})
```

## Testing

### Mocking Events

```typescript
// Create mock emitter
const mockEmitter = new ControllerEventEmitter()

// Spy on emit
const emitSpy = sinon.spy(mockEmitter, 'emit')

// Verify event was emitted
expect(emitSpy.calledWith(
	ControllerEventType.TASK_CREATED,
	{ taskId: '123', isReinitialization: false }
)).to.be.true
```

### Testing Event Handlers

```typescript
// Subscribe to event
let receivedPayload
controller.on(ControllerEventType.TASK_CREATED, async (payload) => {
	receivedPayload = payload
})

// Trigger event
await taskCoordinator.createTask({ task: "test" })

// Verify
expect(receivedPayload.taskId).to.exist
```

## Performance

- Events are emitted asynchronously
- Multiple listeners are called in parallel
- Event emitter can be disabled temporarily:
  ```typescript
  controller.eventEmitter.setEnabled(false)
  ```

## Future Enhancements

1. **Event History** - Track recent events for debugging
2. **Event Metrics** - Count emissions per event type
3. **Event Filtering** - Subscribe with filters
4. **Event Replay** - Replay events for debugging
5. **Priority Listeners** - Execute some listeners first

---

*The event system closes the loop by enabling decoupled coordinator communication while maintaining type safety and testability.*

