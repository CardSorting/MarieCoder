# Unified Subscription Pattern - Proof of Concept

**Date:** October 15, 2025  
**Status:** 📋 Design Document  
**Related:** Future Improvements Investigation

---

## Overview

This document provides detailed proof-of-concept implementations for the Unified Subscription Pattern approach, presented in two variants:
1. **Frontend Consolidation** (Recommended - Lower Risk)
2. **Backend Consolidation** (More Comprehensive)

---

## Variant 1: Frontend Consolidation

### Concept

Consolidate subscription handling on the frontend by creating an intelligent stream manager that coordinates both data sources.

### Architecture

```
┌─────────────────────────────────────────────────┐
│              Backend (Unchanged)                 │
│  ┌─────────────────┐   ┌─────────────────────┐ │
│  │ StateService    │   │ UiService           │ │
│  │ (Full State)    │   │ (Partial Messages)  │ │
│  └────────┬────────┘   └──────────┬──────────┘ │
└───────────┼────────────────────────┼────────────┘
            │                        │
            │                        │
┌───────────┼────────────────────────┼────────────┐
│           ↓                        ↓             │
│  ┌──────────────────────────────────────────┐  │
│  │   UnifiedMessageStream (NEW)             │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ Priority Queue                     │  │  │
│  │  │ • STREAMING: High Priority         │  │  │
│  │  │ • IDLE: Low Priority               │  │  │
│  │  └────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────┐  │  │
│  │  │ Conflict Resolution               │  │  │
│  │  │ • Merge strategies                │  │  │
│  │  │ • Deduplication                   │  │  │
│  │  └────────────────────────────────────┘  │  │
│  └──────────────────┬───────────────────────┘  │
│                     │                           │
│                     ↓                           │
│  ┌──────────────────────────────────────────┐  │
│  │  TaskStateContext                        │  │
│  │  • Single subscription point             │  │
│  │  • Simplified state updates              │  │
│  └──────────────────────────────────────────┘  │
│              Frontend                            │
└─────────────────────────────────────────────────┘
```

### Implementation

```typescript
// webview-ui/src/services/unified_message_stream.ts

import type { ClineMessage } from '@shared/ExtensionMessage'
import { findLastIndex } from '@shared/array'
import { debug, logError } from '@/utils/debug_logger'
import { StateServiceClient, UiServiceClient } from './grpc-client'
import { EmptyRequest } from '@shared/proto/cline/common'
import { convertProtoToClineMessage } from '@shared/proto-conversions/cline-message'

/**
 * Types of message updates in the system
 */
enum UpdateType {
    FULL_STATE = 'full_state',
    PARTIAL_MESSAGE = 'partial_message'
}

/**
 * Priority levels for updates
 */
enum Priority {
    LOW = 1,
    MEDIUM = 2,
    HIGH = 3
}

/**
 * Represents a queued message update
 */
interface MessageUpdate {
    type: UpdateType
    priority: Priority
    timestamp: number
    data: ClineMessage[] | ClineMessage
}

/**
 * Configuration for the unified message stream
 */
export interface UnifiedMessageStreamConfig {
    /** How long to wait before processing queued updates (ms) */
    processingDelay: number
    
    /** Maximum queue size before forcing a drain */
    maxQueueSize: number
    
    /** Time window to consider updates as "batched" (ms) */
    batchWindow: number
    
    /** Enable detailed logging */
    enableLogging: boolean
}

const DEFAULT_CONFIG: UnifiedMessageStreamConfig = {
    processingDelay: 10,
    maxQueueSize: 100,
    batchWindow: 50,
    enableLogging: true
}

/**
 * Unified message stream manager
 * 
 * Coordinates multiple subscription sources and intelligently merges updates
 * to prevent race conditions and ensure consistent state.
 */
export class UnifiedMessageStream {
    private config: UnifiedMessageStreamConfig
    private updateQueue: MessageUpdate[] = []
    private currentMessages: ClineMessage[] = []
    private isStreaming: boolean = false
    private lastPartialUpdate: number = 0
    
    // Subscriptions
    private stateUnsubscribe: (() => void) | null = null
    private partialUnsubscribe: (() => void) | null = null
    
    // Processing
    private processTimer: NodeJS.Timeout | null = null
    private streamingTimeoutTimer: NodeJS.Timeout | null = null
    
    // Observers
    private observers: Set<(messages: ClineMessage[]) => void> = new Set()
    
    // Metrics
    private metrics = {
        totalUpdates: 0,
        fullStateUpdates: 0,
        partialUpdates: 0,
        updatesQueued: 0,
        updatesProcessed: 0,
        conflictsResolved: 0
    }
    
    constructor(config: Partial<UnifiedMessageStreamConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }
    
    /**
     * Start the unified stream
     */
    public start(): void {
        this.log('Starting unified message stream')
        
        // Subscribe to full state updates
        this.stateUnsubscribe = StateServiceClient.subscribeToState(
            EmptyRequest.create({}),
            {
                onResponse: (response) => {
                    if (response.stateJson) {
                        try {
                            const stateData = JSON.parse(response.stateJson)
                            if (stateData.clineMessages) {
                                this.enqueueFullStateUpdate(stateData.clineMessages)
                            }
                        } catch (error) {
                            logError('Error parsing state JSON:', error)
                        }
                    }
                },
                onError: (error) => {
                    logError('Error in state subscription:', error)
                },
                onComplete: () => {
                    this.log('State subscription completed')
                }
            }
        )
        
        // Subscribe to partial message updates
        this.partialUnsubscribe = UiServiceClient.subscribeToPartialMessage(
            EmptyRequest.create({}),
            {
                onResponse: (protoMessage) => {
                    try {
                        const partialMessage = convertProtoToClineMessage(protoMessage)
                        
                        // Validate message
                        if (!partialMessage.ts || partialMessage.ts <= 0) {
                            logError('Invalid timestamp in partial message')
                            return
                        }
                        
                        // Filter empty handshake messages
                        if (!partialMessage.ask && !partialMessage.say && !partialMessage.text) {
                            return
                        }
                        
                        this.enqueuePartialMessageUpdate(partialMessage)
                    } catch (error) {
                        logError('Failed to process partial message:', error)
                    }
                },
                onError: (error) => {
                    logError('Error in partial message subscription:', error)
                },
                onComplete: () => {
                    this.log('Partial message subscription completed')
                    this.handleStreamComplete()
                }
            }
        )
    }
    
    /**
     * Subscribe to message updates
     */
    public subscribe(callback: (messages: ClineMessage[]) => void): () => void {
        this.observers.add(callback)
        
        // Send current state immediately
        callback([...this.currentMessages])
        
        return () => {
            this.observers.delete(callback)
        }
    }
    
    /**
     * Stop the unified stream and clean up
     */
    public stop(): void {
        this.log('Stopping unified message stream')
        
        // Unsubscribe from backend streams
        if (this.stateUnsubscribe) {
            this.stateUnsubscribe()
            this.stateUnsubscribe = null
        }
        
        if (this.partialUnsubscribe) {
            this.partialUnsubscribe()
            this.partialUnsubscribe = null
        }
        
        // Clear timers
        this.clearProcessTimer()
        this.clearStreamingTimeout()
        
        // Clear queue and observers
        this.updateQueue = []
        this.observers.clear()
    }
    
    /**
     * Get current metrics
     */
    public getMetrics() {
        return {
            ...this.metrics,
            queueSize: this.updateQueue.length,
            isStreaming: this.isStreaming,
            messageCount: this.currentMessages.length
        }
    }
    
    // ============ Private Methods ============
    
    private enqueueFullStateUpdate(messages: ClineMessage[]): void {
        this.metrics.fullStateUpdates++
        
        // Determine priority based on streaming state
        const priority = this.isStreaming ? Priority.LOW : Priority.HIGH
        
        const update: MessageUpdate = {
            type: UpdateType.FULL_STATE,
            priority,
            timestamp: Date.now(),
            data: messages
        }
        
        this.enqueueUpdate(update)
    }
    
    private enqueuePartialMessageUpdate(message: ClineMessage): void {
        this.metrics.partialUpdates++
        
        // Mark as streaming
        this.isStreaming = true
        this.lastPartialUpdate = Date.now()
        this.resetStreamingTimeout()
        
        const update: MessageUpdate = {
            type: UpdateType.PARTIAL_MESSAGE,
            priority: Priority.HIGH,
            timestamp: Date.now(),
            data: message
        }
        
        this.enqueueUpdate(update)
    }
    
    private enqueueUpdate(update: MessageUpdate): void {
        this.metrics.updatesQueued++
        
        // Add to queue in priority order
        this.updateQueue.push(update)
        this.updateQueue.sort((a, b) => b.priority - a.priority)
        
        // Enforce max queue size
        if (this.updateQueue.length > this.config.maxQueueSize) {
            this.log('Queue full - forcing drain')
            this.processQueue()
            return
        }
        
        // Schedule processing
        this.scheduleProcessing()
    }
    
    private scheduleProcessing(): void {
        if (this.processTimer) {
            return // Already scheduled
        }
        
        this.processTimer = setTimeout(() => {
            this.processQueue()
        }, this.config.processingDelay)
    }
    
    private processQueue(): void {
        this.clearProcessTimer()
        
        if (this.updateQueue.length === 0) {
            return
        }
        
        this.log(`Processing queue with ${this.updateQueue.length} update(s)`)
        
        // Collect updates within batch window
        const now = Date.now()
        const batchCutoff = now - this.config.batchWindow
        const batch = this.updateQueue.filter(update => update.timestamp >= batchCutoff)
        
        // Remove processed updates from queue
        this.updateQueue = this.updateQueue.filter(update => update.timestamp < batchCutoff)
        
        if (batch.length === 0) {
            return
        }
        
        // Process batch intelligently
        this.processBatch(batch)
    }
    
    private processBatch(batch: MessageUpdate[]): void {
        this.log(`Processing batch of ${batch.length} update(s)`)
        
        // Separate update types
        const fullStateUpdates = batch.filter(u => u.type === UpdateType.FULL_STATE)
        const partialUpdates = batch.filter(u => u.type === UpdateType.PARTIAL_MESSAGE)
        
        // Strategy 1: If we have partial updates, they take priority
        if (partialUpdates.length > 0) {
            this.log('Applying partial updates (high priority)')
            
            for (const update of partialUpdates) {
                this.applyPartialUpdate(update.data as ClineMessage)
            }
            
            // Discard full state updates during active streaming
            if (fullStateUpdates.length > 0) {
                this.log(`Discarding ${fullStateUpdates.length} full state update(s) during streaming`)
                this.metrics.conflictsResolved += fullStateUpdates.length
            }
        }
        // Strategy 2: No partial updates - safe to apply full state
        else if (fullStateUpdates.length > 0) {
            this.log('Applying full state update (no streaming)')
            
            // Take the most recent full state update
            const latest = fullStateUpdates[fullStateUpdates.length - 1]
            this.applyFullStateUpdate(latest.data as ClineMessage[])
        }
        
        this.metrics.updatesProcessed += batch.length
        
        // Notify observers
        this.notifyObservers()
    }
    
    private applyPartialUpdate(message: ClineMessage): void {
        const index = findLastIndex(
            this.currentMessages,
            (msg) => msg.ts === message.ts
        )
        
        if (index !== -1) {
            // Update existing message
            this.currentMessages[index] = message
        } else {
            // Add new message
            this.currentMessages.push(message)
        }
    }
    
    private applyFullStateUpdate(messages: ClineMessage[]): void {
        this.currentMessages = [...messages]
    }
    
    private notifyObservers(): void {
        const messagesCopy = [...this.currentMessages]
        for (const observer of this.observers) {
            observer(messagesCopy)
        }
    }
    
    private handleStreamComplete(): void {
        this.log('Streaming session completed')
        this.isStreaming = false
        this.clearStreamingTimeout()
    }
    
    private resetStreamingTimeout(): void {
        this.clearStreamingTimeout()
        
        // After 2 seconds of no partial updates, consider streaming complete
        this.streamingTimeoutTimer = setTimeout(() => {
            const timeSinceLastPartial = Date.now() - this.lastPartialUpdate
            if (timeSinceLastPartial >= 2000) {
                this.handleStreamComplete()
            }
        }, 2000)
    }
    
    private clearStreamingTimeout(): void {
        if (this.streamingTimeoutTimer) {
            clearTimeout(this.streamingTimeoutTimer)
            this.streamingTimeoutTimer = null
        }
    }
    
    private clearProcessTimer(): void {
        if (this.processTimer) {
            clearTimeout(this.processTimer)
            this.processTimer = null
        }
    }
    
    private log(message: string): void {
        if (this.config.enableLogging) {
            debug.log(`[UnifiedMessageStream] ${message}`)
        }
    }
}
```

### Integration with TaskStateContext

```typescript
// webview-ui/src/context/TaskStateContext.tsx

import { UnifiedMessageStream } from '../services/unified_message_stream'

export const TaskStateContextProvider: React.FC<{
    children: React.ReactNode
}> = ({ children }) => {
    const [clineMessages, setClineMessages] = useState<ClineMessage[]>([])
    const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([])
    const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined)
    
    // Unified message stream (replaces dual subscriptions)
    const messageStream = useRef<UnifiedMessageStream | null>(null)
    
    // Initialize unified stream
    useEffect(() => {
        messageStream.current = new UnifiedMessageStream({
            processingDelay: 10,
            maxQueueSize: 100,
            batchWindow: 50,
            enableLogging: true
        })
        
        // Subscribe to unified stream
        const unsubscribe = messageStream.current.subscribe((messages) => {
            setClineMessages(messages)
        })
        
        // Start the stream
        messageStream.current.start()
        
        return () => {
            messageStream.current?.stop()
            unsubscribe()
        }
    }, [])
    
    // Subscribe to state updates for non-message data
    useEffect(() => {
        const unsubscribe = StateServiceClient.subscribeToState(
            EmptyRequest.create({}),
            {
                onResponse: (response) => {
                    if (response.stateJson) {
                        try {
                            const stateData = JSON.parse(response.stateJson)
                            
                            // Only handle non-message state
                            // (messages are handled by UnifiedMessageStream)
                            if (stateData.taskHistory) {
                                setTaskHistory(stateData.taskHistory)
                            }
                            if (stateData.currentTaskItem?.id) {
                                setCurrentTaskId(stateData.currentTaskItem.id)
                            }
                        } catch (error) {
                            logError('Error parsing state JSON:', error)
                        }
                    }
                },
                onError: (error) => {
                    logError('Error in state subscription:', error)
                },
                onComplete: () => {
                    debug.log('State subscription completed')
                }
            }
        )
        
        return unsubscribe
    }, [])
    
    // Rest of context implementation...
}
```

### Tests

```typescript
// webview-ui/src/services/__tests__/unified_message_stream.test.ts

import { UnifiedMessageStream } from '../unified_message_stream'
import type { ClineMessage } from '@shared/ExtensionMessage'

describe('UnifiedMessageStream', () => {
    let stream: UnifiedMessageStream
    let messages: ClineMessage[]
    
    beforeEach(() => {
        stream = new UnifiedMessageStream({
            processingDelay: 10,
            maxQueueSize: 100,
            batchWindow: 50,
            enableLogging: false
        })
        
        messages = []
        stream.subscribe((newMessages) => {
            messages = newMessages
        })
        
        stream.start()
    })
    
    afterEach(() => {
        stream.stop()
    })
    
    describe('Priority Handling', () => {
        test('prioritizes partial updates over full state during streaming', async () => {
            // Simulate streaming
            const partial1 = createMockMessage(1, 'Streaming...')
            stream['enqueuePartialMessageUpdate'](partial1)
            
            // Full state arrives during streaming
            const fullState = [createMockMessage(1, 'Different text')]
            stream['enqueueFullStateUpdate'](fullState)
            
            // Wait for processing
            await sleep(100)
            
            // Partial update should win
            expect(messages[0].text).toBe('Streaming...')
            
            // Check metrics
            const metrics = stream.getMetrics()
            expect(metrics.conflictsResolved).toBeGreaterThan(0)
        })
        
        test('applies full state when not streaming', async () => {
            const fullState = [createMockMessage(1), createMockMessage(2)]
            stream['enqueueFullStateUpdate'](fullState)
            
            await sleep(100)
            
            expect(messages.length).toBe(2)
        })
    })
    
    describe('Queue Management', () => {
        test('batches updates within window', async () => {
            // Enqueue multiple updates quickly
            stream['enqueuePartialMessageUpdate'](createMockMessage(1))
            stream['enqueuePartialMessageUpdate'](createMockMessage(2))
            stream['enqueuePartialMessageUpdate'](createMockMessage(3))
            
            await sleep(100)
            
            expect(messages.length).toBe(3)
        })
        
        test('enforces max queue size', () => {
            const smallStream = new UnifiedMessageStream({
                maxQueueSize: 5,
                processingDelay: 1000 // Long delay to fill queue
            })
            
            // Try to exceed max size
            for (let i = 0; i < 10; i++) {
                smallStream['enqueuePartialMessageUpdate'](createMockMessage(i))
            }
            
            // Queue should have been drained
            const metrics = smallStream.getMetrics()
            expect(metrics.queueSize).toBeLessThanOrEqual(5)
            
            smallStream.stop()
        })
    })
    
    describe('Streaming Detection', () => {
        test('detects streaming state', async () => {
            stream['enqueuePartialMessageUpdate'](createMockMessage(1))
            
            const metrics = stream.getMetrics()
            expect(metrics.isStreaming).toBe(true)
        })
        
        test('ends streaming after timeout', async () => {
            stream['enqueuePartialMessageUpdate'](createMockMessage(1))
            
            // Wait for streaming timeout
            await sleep(2500)
            
            const metrics = stream.getMetrics()
            expect(metrics.isStreaming).toBe(false)
        })
    })
    
    describe('Metrics', () => {
        test('tracks update counts', async () => {
            stream['enqueuePartialMessageUpdate'](createMockMessage(1))
            stream['enqueueFullStateUpdate']([createMockMessage(2)])
            
            await sleep(100)
            
            const metrics = stream.getMetrics()
            expect(metrics.partialUpdates).toBe(1)
            expect(metrics.fullStateUpdates).toBe(1)
            expect(metrics.updatesProcessed).toBeGreaterThan(0)
        })
    })
})

function createMockMessage(ts: number, text?: string): ClineMessage {
    return {
        ts,
        type: 'say',
        say: 'assistant',
        text: text || `Message ${ts}`,
    } as ClineMessage
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
}
```

---

## Variant 2: Backend Consolidation

### Concept

Create a new backend service that merges both state and partial message streams into a single, coordinated stream.

### Protobuf Definition

```protobuf
// proto/cline/message_stream.proto

syntax = "proto3";
package cline;

import "cline/common.proto";
import "cline/ui.proto";

option go_package = "github.com/cline/grpc-go/cline";
option java_package = "bot.cline.proto";
option java_multiple_files = true;

/**
 * Service for unified message streaming
 * Consolidates full state sync and partial message updates
 */
service MessageStreamService {
    // Subscribe to unified message updates
    rpc subscribeToMessageStream(EmptyRequest) returns (stream MessageStreamUpdate);
}

/**
 * Unified message stream update
 * Contains either full state or partial message
 */
message MessageStreamUpdate {
    // Type of update
    MessageUpdateType type = 1;
    
    // Full state sync (present when type = FULL_SYNC)
    repeated ClineMessage full_state = 2;
    
    // Partial message update (present when type = PARTIAL_UPDATE)
    optional ClineMessage partial_message = 3;
    
    // Session markers
    bool is_streaming = 4;
}

/**
 * Type of message stream update
 */
enum MessageUpdateType {
    // Complete state replacement
    FULL_SYNC = 0;
    
    // Single message update or addition
    PARTIAL_UPDATE = 1;
    
    // Streaming session started
    STREAM_START = 2;
    
    // Streaming session ended
    STREAM_END = 3;
}
```

### Backend Implementation (Conceptual)

```typescript
// src/services/message_stream_service.ts

import type { ServerUnaryCall, ServerWritableStream } from '@grpc/grpc-js'
import type { MessageStreamUpdate } from '@shared/proto/cline/message_stream'
import { MessageUpdateType } from '@shared/proto/cline/message_stream'

export class MessageStreamService {
    private stateService: StateService
    private uiService: UiService
    
    /**
     * Subscribe to unified message stream
     * Merges full state and partial messages intelligently
     */
    async subscribeToMessageStream(
        call: ServerWritableStream<EmptyRequest, MessageStreamUpdate>
    ): Promise<void> {
        let isStreaming = false
        let lastPartialUpdate = 0
        
        // Subscribe to partial messages (high priority during streaming)
        const partialUnsubscribe = this.uiService.onPartialMessage((message) => {
            if (!isStreaming) {
                // Mark streaming start
                call.write({
                    type: MessageUpdateType.STREAM_START,
                    is_streaming: true
                })
                isStreaming = true
            }
            
            // Send partial update
            call.write({
                type: MessageUpdateType.PARTIAL_UPDATE,
                partial_message: message,
                is_streaming: true
            })
            
            lastPartialUpdate = Date.now()
            
            // Auto-detect streaming end
            setTimeout(() => {
                if (Date.now() - lastPartialUpdate >= 2000) {
                    call.write({
                        type: MessageUpdateType.STREAM_END,
                        is_streaming: false
                    })
                    isStreaming = false
                }
            }, 2000)
        })
        
        // Subscribe to full state (low priority during streaming)
        const stateUnsubscribe = this.stateService.onStateChange((state) => {
            // Only send full state when not streaming
            if (!isStreaming) {
                call.write({
                    type: MessageUpdateType.FULL_SYNC,
                    full_state: state.clineMessages,
                    is_streaming: false
                })
            }
        })
        
        // Cleanup on disconnect
        call.on('cancelled', () => {
            partialUnsubscribe()
            stateUnsubscribe()
        })
    }
}
```

### Frontend Integration

```typescript
// webview-ui/src/services/grpc-client.ts (generated)

export class MessageStreamServiceClient extends ProtoBusClient {
    static override serviceName: string = "cline.MessageStreamService"
    
    static subscribeToMessageStream(
        request: proto.cline.EmptyRequest,
        callbacks: Callbacks<proto.cline.MessageStreamUpdate>
    ): () => void {
        return this.makeStreamingRequest(
            "subscribeToMessageStream",
            request,
            proto.cline.EmptyRequest.toJSON,
            proto.cline.MessageStreamUpdate.fromJSON,
            callbacks
        )
    }
}
```

```typescript
// webview-ui/src/context/TaskStateContext.tsx

import { MessageStreamServiceClient } from '../services/grpc-client'
import { MessageUpdateType } from '@shared/proto/cline/message_stream'

export const TaskStateContextProvider: React.FC<{
    children: React.ReactNode
}> = ({ children }) => {
    const [clineMessages, setClineMessages] = useState<ClineMessage[]>([])
    
    useEffect(() => {
        const unsubscribe = MessageStreamServiceClient.subscribeToMessageStream(
            EmptyRequest.create({}),
            {
                onResponse: (update) => {
                    switch (update.type) {
                        case MessageUpdateType.FULL_SYNC:
                            // Replace all messages
                            setClineMessages(update.fullState || [])
                            break
                            
                        case MessageUpdateType.PARTIAL_UPDATE:
                            // Update or add single message
                            if (update.partialMessage) {
                                setClineMessages((prev) => {
                                    const index = findLastIndex(
                                        prev,
                                        (msg) => msg.ts === update.partialMessage!.ts
                                    )
                                    
                                    if (index !== -1) {
                                        const updated = [...prev]
                                        updated[index] = update.partialMessage!
                                        return updated
                                    }
                                    
                                    return [...prev, update.partialMessage!]
                                })
                            }
                            break
                            
                        case MessageUpdateType.STREAM_START:
                            debug.log('Streaming started')
                            break
                            
                        case MessageUpdateType.STREAM_END:
                            debug.log('Streaming ended')
                            break
                    }
                },
                onError: (error) => {
                    logError('Error in message stream:', error)
                },
                onComplete: () => {
                    debug.log('Message stream completed')
                }
            }
        )
        
        return unsubscribe
    }, [])
    
    // Much simpler - single subscription!
}
```

---

## Comparison: Frontend vs Backend Consolidation

| Aspect | Frontend | Backend |
|--------|----------|---------|
| **Implementation Complexity** | Medium | Medium-High |
| **Backend Changes** | None | New service required |
| **Frontend Simplicity** | Medium | High |
| **Data Efficiency** | Same bandwidth | Reduced (single stream) |
| **Migration Risk** | Low | Medium-High |
| **Rollback Difficulty** | Easy | Moderate |
| **Testing Scope** | Frontend only | Frontend + Backend |
| **Team Coordination** | Frontend team | Frontend + Backend teams |

---

## Recommendations

### Choose Frontend Consolidation IF:
- ✅ Want to avoid backend changes
- ✅ Need quick implementation (1-2 weeks)
- ✅ Easy rollback is important
- ✅ Backend team bandwidth is limited

### Choose Backend Consolidation IF:
- ✅ Want cleaner architecture
- ✅ Backend team can coordinate
- ✅ Want to reduce redundant data transmission
- ✅ Have 2-3 weeks for implementation + migration

### Start With:
**Frontend Consolidation** - Lower risk, faster to implement, easier to validate. Can always migrate to backend consolidation later if proven valuable.

---

## Next Steps

1. **Prototype** - Build working version of frontend consolidation
2. **Benchmark** - Compare performance vs current debounce solution
3. **Test** - Validate race condition elimination
4. **Evaluate** - Assess if benefits justify migration effort
5. **Decide** - Choose to deploy, keep current, or explore backend variant

---

**Status:** ✅ Ready for Prototyping  
**Recommendation:** Start with frontend consolidation variant  
**Author:** MarieCoder AI Assistant  
**Date:** October 15, 2025

