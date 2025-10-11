# Refactoring Plan: Large Monolithic Files

## Overview
This document outlines the strategy for refactoring two large monolithic service files (1000+ lines each) into focused, maintainable services following the Single Responsibility Principle.

---

## 1. task_api_service.ts (1,164 lines)

### Current Responsibilities
This service currently handles **10 major responsibilities**:

1. **API Request Management** - Making requests with retry logic
2. **Stream Processing** - Reading and parsing API response streams
3. **Context Window Management** - Handling context overflow and truncation
4. **Error Recovery** - Automatic retries and user-driven recovery
5. **Checkpoint Coordination** - Creating checkpoints on first request
6. **Token Usage Tracking** - Counting and calculating costs
7. **Assistant Message Presentation** - Coordinating UI updates
8. **Mistake Limit Management** - Tracking consecutive mistakes
9. **Auto-Approval Management** - Managing auto-approval limits
10. **Tool Execution Coordination** - Orchestrating tool use blocks

### Refactoring Strategy

#### Extract into Focused Services:

**1. `api_retry_service.ts` (~150 lines)**
- Handles retry logic with exponential backoff
- Context window exceeded error detection and recovery
- Manual retry prompts
- First-chunk failure handling

**2. `api_stream_manager.ts` (~200 lines)**
- Stream reading and chunk processing
- Usage block tracking (tokens, costs)
- Reasoning/thinking block handling
- Stream abortion and cleanup

**3. `task_checkpoint_coordinator.ts` (~100 lines)**
- Checkpoint initialization on first request
- Commit hash tracking
- Error handling for checkpoint failures
- Checkpoint manager lifecycle

**4. `token_usage_tracker.ts` (~80 lines)**
- Token counting (input, output, cache read/write)
- Cost calculation
- Usage metadata aggregation
- Telemetry integration

**5. `task_limit_manager.ts` (~120 lines)**
- Mistake count tracking and limit enforcement
- Auto-approval count tracking and limit enforcement
- User notification on limit reached
- Feedback collection and formatting

#### Refactored `task_api_service.ts` (~400 lines)
After extraction, this will become a **coordinator** that:
- Delegates to specialized services
- Orchestrates the request/response lifecycle
- Maintains backward compatibility
- Reduces complexity from 1,164 → ~400 lines

---

## 2. McpHub.ts (1,155 lines)

### Current Responsibilities
This service currently handles **11 major responsibilities**:

1. **Connection Lifecycle** - Connect, disconnect, restart servers
2. **Transport Management** - Creating and managing stdio/SSE/HTTP transports
3. **Settings File I/O** - Reading, writing, validating settings
4. **File Watching** - Watching settings and server files for changes
5. **Server Discovery** - Fetching tools, resources, and templates
6. **Notification Handling** - Processing MCP server notifications
7. **Auto-Approve Management** - Tool auto-approval configuration
8. **Remote Server Management** - Adding remote servers
9. **Timeout Configuration** - Per-server timeout settings
10. **Error Aggregation** - Collecting and displaying server errors
11. **RPC Method Coordination** - Handling all RPC calls

### Refactoring Strategy

#### Extract into Focused Services:

**1. `mcp_connection_manager.ts` (~250 lines)**
- Server connection lifecycle (connect, disconnect, restart)
- Connection state tracking
- Connection lookup and filtering
- Error state management per connection

**2. `mcp_transport_factory.ts` (~200 lines)**
- Transport creation for stdio/SSE/streamableHttp
- Transport-specific error handlers
- Transport lifecycle management
- Environment variable injection

**3. `mcp_settings_manager.ts` (~150 lines)**
- Settings file path resolution
- JSON reading/writing/validation
- Schema validation with zod
- Settings file watching (chokidar integration)

**4. `mcp_notification_manager.ts` (~120 lines)**
- Notification callback registration
- Pending notification storage
- Notification forwarding to active tasks
- Notification schema validation

**5. `mcp_resource_fetcher.ts` (~100 lines)**
- Fetch tools list from servers
- Fetch resources list from servers
- Fetch resource templates
- Handle fetch errors gracefully

**6. `mcp_file_watcher.ts` (~80 lines)**
- Watch server build files for changes
- Trigger reconnection on file changes
- Manage multiple file watchers
- Cleanup watcher resources

#### Refactored `McpHub.ts` (~250 lines)
After extraction, this will become a **hub-and-spoke coordinator** that:
- Delegates to specialized managers
- Provides a unified API facade
- Coordinates cross-cutting concerns
- Reduces complexity from 1,155 → ~250 lines

---

## Implementation Approach

### Phase 1: task_api_service.ts Refactoring
1. ✅ Create extraction plan (this document)
2. Extract retry service
3. Extract stream manager
4. Extract checkpoint coordinator
5. Extract token tracker
6. Extract limit manager
7. Refactor main service to use delegates

### Phase 2: McpHub.ts Refactoring
1. ✅ Create extraction plan (this document)
2. Extract connection manager
3. Extract transport factory
4. Extract settings manager
5. Extract notification manager
6. Extract resource fetcher
7. Extract file watcher
8. Refactor hub to coordinate delegates

### Phase 3: Integration & Testing
1. Update imports across codebase
2. Run existing tests
3. Verify backward compatibility
4. Update documentation

---

## Benefits

### Maintainability
- **Single Responsibility** - Each service has one clear purpose
- **Easier Testing** - Focused services are easier to unit test
- **Better Organization** - Related functionality grouped together

### Scalability
- **Independent Evolution** - Services can evolve independently
- **Reduced Coupling** - Clear boundaries between concerns
- **Easier Debugging** - Smaller files are easier to reason about

### Developer Experience
- **Better Navigation** - Find functionality faster
- **Clearer Intent** - Service names indicate purpose
- **Reduced Cognitive Load** - Less to understand at once

---

## Success Metrics

- ✅ No service > 400 lines (except complex coordinators)
- ✅ Each service has 1-2 clear responsibilities
- ✅ All existing tests pass
- ✅ No breaking changes to public APIs
- ✅ Clear naming following snake_case convention
- ✅ Comprehensive JSDoc on public methods

---

*This refactoring follows the MarieCoder Development Standards philosophy: evolving code with gratitude for what came before, learning from existing patterns, and choosing clarity with intention.*

