# State Machine Pattern - Proof of Concept

**Date:** October 15, 2025  
**Status:** 📋 Design Document  
**Related:** Future Improvements Investigation

---

## Overview

This document provides a detailed proof-of-concept implementation for the State Machine approach to managing streaming message updates.

## Core Implementation

### 1. State Machine Definition

```typescript
// webview-ui/src/context/message_state_machine.ts

/**
 * Represents the possible states of the message streaming system
 */
export enum MessageStreamState {
    /** No active streaming, ready for full state sync */
    IDLE = 'idle',
    
    /** Actively receiving streaming message chunks */
    STREAMING = 'streaming',
    
    /** Brief cooldown period after streaming ends before allowing full sync */
    COOLDOWN = 'cooldown',
    
    /** Full state synchronization in progress */
    SYNCING = 'syncing',
    
    /** Error state requiring manual recovery */
    ERROR = 'error'
}

/**
 * Types of updates the state machine can handle
 */
export enum UpdateType {
    PARTIAL_MESSAGE = 'partial_message',
    FULL_STATE_SYNC = 'full_state_sync',
    STREAM_COMPLETE = 'stream_complete',
    COOLDOWN_TIMEOUT = 'cooldown_timeout',
    ERROR_OCCURRED = 'error_occurred',
    RESET = 'reset'
}

/**
 * Configuration for state machine behavior
 */
export interface MessageStateMachineConfig {
    /** Time to wait in cooldown before returning to idle (ms) */
    cooldownDuration: number
    
    /** Maximum time to stay in streaming state without updates (ms) */
    streamingTimeout: number
    
    /** Whether to enable detailed logging */
    enableLogging: boolean
}

const DEFAULT_CONFIG: MessageStateMachineConfig = {
    cooldownDuration: 100,
    streamingTimeout: 5000,
    enableLogging: true
}
```

### 2. State Machine Core Logic

```typescript
/**
 * State machine for managing message stream lifecycle
 * 
 * Coordinates updates from multiple sources (full state sync and partial messages)
 * to prevent race conditions and ensure consistent state.
 */
export class MessageStateMachine {
    private currentState: MessageStreamState = MessageStreamState.IDLE
    private messages: ClineMessage[] = []
    private config: MessageStateMachineConfig
    private listeners: Set<(messages: ClineMessage[]) => void> = new Set()
    
    // Timers
    private cooldownTimer: NodeJS.Timeout | null = null
    private streamingTimeoutTimer: NodeJS.Timeout | null = null
    
    // Metrics for monitoring
    private metrics = {
        partialUpdatesReceived: 0,
        fullSyncsReceived: 0,
        fullSyncsRejected: 0,
        stateTransitions: 0,
        errors: 0
    }
    
    constructor(config: Partial<MessageStateMachineConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config }
    }
    
    /**
     * Subscribe to message updates
     * @returns Unsubscribe function
     */
    public subscribe(callback: (messages: ClineMessage[]) => void): () => void {
        this.listeners.add(callback)
        
        // Immediately send current state
        callback(this.messages)
        
        return () => {
            this.listeners.delete(callback)
        }
    }
    
    /**
     * Handle a partial message update
     */
    public handlePartialMessage(message: ClineMessage): void {
        this.log(`Received partial message in state: ${this.currentState}`)
        this.metrics.partialUpdatesReceived++
        
        switch (this.currentState) {
            case MessageStreamState.IDLE:
                // Start streaming session
                this.transition(MessageStreamState.STREAMING)
                this.updateMessage(message)
                this.resetStreamingTimeout()
                break
                
            case MessageStreamState.STREAMING:
                // Continue streaming
                this.updateMessage(message)
                this.resetStreamingTimeout()
                break
                
            case MessageStreamState.COOLDOWN:
                // Interrupt cooldown - streaming resumed
                this.clearCooldownTimer()
                this.transition(MessageStreamState.STREAMING)
                this.updateMessage(message)
                this.resetStreamingTimeout()
                break
                
            case MessageStreamState.SYNCING:
                // Streaming started during sync - prioritize streaming
                this.transition(MessageStreamState.STREAMING)
                this.updateMessage(message)
                this.resetStreamingTimeout()
                break
                
            case MessageStreamState.ERROR:
                // Attempt recovery
                this.log('Attempting recovery from error state')
                this.transition(MessageStreamState.STREAMING)
                this.updateMessage(message)
                this.resetStreamingTimeout()
                break
        }
    }
    
    /**
     * Handle a full state synchronization
     */
    public handleFullStateSync(newMessages: ClineMessage[]): void {
        this.log(`Received full state sync in state: ${this.currentState}`)
        this.metrics.fullSyncsReceived++
        
        switch (this.currentState) {
            case MessageStreamState.IDLE:
                // Safe to apply full state
                this.transition(MessageStreamState.SYNCING)
                this.replaceAllMessages(newMessages)
                this.transition(MessageStreamState.IDLE)
                break
                
            case MessageStreamState.STREAMING:
                // Reject full sync during active streaming
                this.log('Rejecting full state sync - streaming in progress')
                this.metrics.fullSyncsRejected++
                break
                
            case MessageStreamState.COOLDOWN:
                // Reject during cooldown - streaming may resume
                this.log('Rejecting full state sync - in cooldown period')
                this.metrics.fullSyncsRejected++
                break
                
            case MessageStreamState.SYNCING:
                // Already syncing - queue this update
                this.log('Already syncing - replacing with newer state')
                this.replaceAllMessages(newMessages)
                break
                
            case MessageStreamState.ERROR:
                // Full sync can help recover from error
                this.log('Applying full state sync for error recovery')
                this.transition(MessageStreamState.SYNCING)
                this.replaceAllMessages(newMessages)
                this.transition(MessageStreamState.IDLE)
                break
        }
    }
    
    /**
     * Signal that streaming has completed
     */
    public handleStreamComplete(): void {
        this.log(`Stream complete in state: ${this.currentState}`)
        
        if (this.currentState === MessageStreamState.STREAMING) {
            this.clearStreamingTimeout()
            this.transition(MessageStreamState.COOLDOWN)
            this.startCooldownTimer()
        }
    }
    
    /**
     * Handle an error condition
     */
    public handleError(error: Error): void {
        this.log(`Error occurred: ${error.message}`)
        this.metrics.errors++
        
        this.clearAllTimers()
        this.transition(MessageStreamState.ERROR)
    }
    
    /**
     * Reset the state machine to idle
     */
    public reset(): void {
        this.log('Resetting state machine')
        
        this.clearAllTimers()
        this.transition(MessageStreamState.IDLE)
        this.messages = []
        this.notifyListeners()
    }
    
    /**
     * Get current state for debugging
     */
    public getState(): {
        state: MessageStreamState
        messageCount: number
        metrics: typeof this.metrics
    } {
        return {
            state: this.currentState,
            messageCount: this.messages.length,
            metrics: { ...this.metrics }
        }
    }
    
    // ============ Private Methods ============
    
    private transition(newState: MessageStreamState): void {
        if (this.currentState === newState) {
            return
        }
        
        this.log(`Transition: ${this.currentState} → ${newState}`)
        this.currentState = newState
        this.metrics.stateTransitions++
    }
    
    private updateMessage(message: ClineMessage): void {
        const index = findLastIndex(
            this.messages,
            (msg) => msg.ts === message.ts
        )
        
        if (index !== -1) {
            // Update existing message
            this.messages[index] = message
        } else {
            // Add new message
            this.messages.push(message)
        }
        
        this.notifyListeners()
    }
    
    private replaceAllMessages(newMessages: ClineMessage[]): void {
        this.messages = [...newMessages]
        this.notifyListeners()
    }
    
    private notifyListeners(): void {
        for (const listener of this.listeners) {
            listener([...this.messages])
        }
    }
    
    private startCooldownTimer(): void {
        this.cooldownTimer = setTimeout(() => {
            this.log('Cooldown period ended')
            this.transition(MessageStreamState.IDLE)
        }, this.config.cooldownDuration)
    }
    
    private clearCooldownTimer(): void {
        if (this.cooldownTimer) {
            clearTimeout(this.cooldownTimer)
            this.cooldownTimer = null
        }
    }
    
    private resetStreamingTimeout(): void {
        this.clearStreamingTimeout()
        
        this.streamingTimeoutTimer = setTimeout(() => {
            this.log('Streaming timeout - no updates received')
            this.handleStreamComplete()
        }, this.config.streamingTimeout)
    }
    
    private clearStreamingTimeout(): void {
        if (this.streamingTimeoutTimer) {
            clearTimeout(this.streamingTimeoutTimer)
            this.streamingTimeoutTimer = null
        }
    }
    
    private clearAllTimers(): void {
        this.clearCooldownTimer()
        this.clearStreamingTimeout()
    }
    
    private log(message: string): void {
        if (this.config.enableLogging) {
            debug.log(`[MessageStateMachine] ${message}`)
        }
    }
    
    /**
     * Cleanup resources
     */
    public dispose(): void {
        this.clearAllTimers()
        this.listeners.clear()
    }
}
```

### 3. Integration with TaskStateContext

```typescript
// webview-ui/src/context/TaskStateContext.tsx

import { MessageStateMachine } from './message_state_machine'

export const TaskStateContextProvider: React.FC<{
    children: React.ReactNode
}> = ({ children }) => {
    const [clineMessages, setClineMessages] = useState<ClineMessage[]>([])
    const [taskHistory, setTaskHistory] = useState<HistoryItem[]>([])
    const [currentTaskId, setCurrentTaskId] = useState<string | undefined>(undefined)
    
    // State machine for coordinating message updates
    const stateMachine = useRef<MessageStateMachine | null>(null)
    
    // Initialize state machine
    useEffect(() => {
        stateMachine.current = new MessageStateMachine({
            cooldownDuration: 100,
            streamingTimeout: 5000,
            enableLogging: true
        })
        
        // Subscribe to state machine updates
        const unsubscribe = stateMachine.current.subscribe((messages) => {
            setClineMessages(messages)
        })
        
        return () => {
            unsubscribe()
            stateMachine.current?.dispose()
        }
    }, [])
    
    // Subscribe to full state updates
    useEffect(() => {
        const unsubscribe = StateServiceClient.subscribeToState(
            EmptyRequest.create({}),
            {
                onResponse: (response) => {
                    if (response.stateJson) {
                        try {
                            const stateData = JSON.parse(response.stateJson)
                            
                            // Route through state machine
                            if (stateData.clineMessages) {
                                stateMachine.current?.handleFullStateSync(
                                    stateData.clineMessages
                                )
                            }
                            
                            // Other state updates (not message-related)
                            if (stateData.taskHistory) {
                                setTaskHistory(stateData.taskHistory)
                            }
                            if (stateData.currentTaskItem?.id) {
                                setCurrentTaskId(stateData.currentTaskItem.id)
                            }
                        } catch (error) {
                            logError('Error parsing state JSON:', error)
                            stateMachine.current?.handleError(error as Error)
                        }
                    }
                },
                onError: (error) => {
                    logError('Error in state subscription:', error)
                    stateMachine.current?.handleError(error)
                },
                onComplete: () => {
                    debug.log('State subscription completed')
                }
            }
        )
        
        return unsubscribe
    }, [])
    
    // Subscribe to partial message updates
    useEffect(() => {
        const unsubscribe = UiServiceClient.subscribeToPartialMessage(
            EmptyRequest.create({}),
            {
                onResponse: (protoMessage) => {
                    try {
                        const partialMessage = convertProtoToClineMessage(protoMessage)
                        
                        // Validate critical fields
                        if (!partialMessage.ts || partialMessage.ts <= 0) {
                            logError('Invalid timestamp in partial message:', partialMessage)
                            return
                        }
                        
                        // Filter empty handshake messages
                        if (!partialMessage.ask && !partialMessage.say && !partialMessage.text) {
                            return
                        }
                        
                        // Route through state machine
                        stateMachine.current?.handlePartialMessage(partialMessage)
                    } catch (error) {
                        logError('Failed to process partial message:', error)
                        stateMachine.current?.handleError(error as Error)
                    }
                },
                onError: (error) => {
                    logError('Error in partial message subscription:', error)
                    stateMachine.current?.handleError(error)
                },
                onComplete: () => {
                    debug.log('Partial message subscription completed')
                    stateMachine.current?.handleStreamComplete()
                }
            }
        )
        
        return unsubscribe
    }, [])
    
    // Rest of context implementation...
}
```

### 4. Unit Tests

```typescript
// webview-ui/src/context/__tests__/message_state_machine.test.ts

import { MessageStateMachine, MessageStreamState } from '../message_state_machine'
import type { ClineMessage } from '@shared/ExtensionMessage'

describe('MessageStateMachine', () => {
    let stateMachine: MessageStateMachine
    let messages: ClineMessage[]
    
    beforeEach(() => {
        stateMachine = new MessageStateMachine({
            cooldownDuration: 50,
            streamingTimeout: 200,
            enableLogging: false
        })
        
        messages = []
        stateMachine.subscribe((newMessages) => {
            messages = newMessages
        })
    })
    
    afterEach(() => {
        stateMachine.dispose()
    })
    
    describe('State Transitions', () => {
        test('starts in IDLE state', () => {
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.IDLE)
        })
        
        test('transitions to STREAMING on first partial message', () => {
            const message = createMockMessage(1)
            stateMachine.handlePartialMessage(message)
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.STREAMING)
        })
        
        test('transitions to COOLDOWN after stream complete', async () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handleStreamComplete()
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.COOLDOWN)
        })
        
        test('returns to IDLE after cooldown period', async () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handleStreamComplete()
            
            // Wait for cooldown
            await sleep(100)
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.IDLE)
        })
    })
    
    describe('Race Condition Prevention', () => {
        test('rejects full state sync during streaming', () => {
            // Start streaming
            stateMachine.handlePartialMessage(createMockMessage(1))
            
            // Attempt full sync
            const fullState = [createMockMessage(1), createMockMessage(2)]
            stateMachine.handleFullStateSync(fullState)
            
            // Full sync should be rejected
            const state = stateMachine.getState()
            expect(state.metrics.fullSyncsRejected).toBe(1)
            expect(messages.length).toBe(1) // Only partial message applied
        })
        
        test('rejects full state sync during cooldown', () => {
            // Stream and complete
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handleStreamComplete()
            
            // Attempt full sync during cooldown
            const fullState = [createMockMessage(1), createMockMessage(2)]
            stateMachine.handleFullStateSync(fullState)
            
            const state = stateMachine.getState()
            expect(state.metrics.fullSyncsRejected).toBe(1)
        })
        
        test('accepts full state sync when idle', () => {
            const fullState = [createMockMessage(1), createMockMessage(2)]
            stateMachine.handleFullStateSync(fullState)
            
            expect(messages.length).toBe(2)
            const state = stateMachine.getState()
            expect(state.metrics.fullSyncsRejected).toBe(0)
        })
    })
    
    describe('Message Updates', () => {
        test('adds new partial message', () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            
            expect(messages.length).toBe(1)
            expect(messages[0].ts).toBe(1)
        })
        
        test('updates existing message by timestamp', () => {
            const message1 = createMockMessage(1, 'Initial text')
            stateMachine.handlePartialMessage(message1)
            
            const message1Updated = createMockMessage(1, 'Updated text')
            stateMachine.handlePartialMessage(message1Updated)
            
            expect(messages.length).toBe(1)
            expect(messages[0].text).toBe('Updated text')
        })
        
        test('replaces all messages on full state sync', async () => {
            // Add partial message
            stateMachine.handlePartialMessage(createMockMessage(1))
            
            // Complete streaming and wait for cooldown
            stateMachine.handleStreamComplete()
            await sleep(100)
            
            // Apply full state
            const fullState = [createMockMessage(2), createMockMessage(3)]
            stateMachine.handleFullStateSync(fullState)
            
            expect(messages.length).toBe(2)
            expect(messages[0].ts).toBe(2)
            expect(messages[1].ts).toBe(3)
        })
    })
    
    describe('Error Handling', () => {
        test('transitions to ERROR state on error', () => {
            stateMachine.handleError(new Error('Test error'))
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.ERROR)
            expect(state.metrics.errors).toBe(1)
        })
        
        test('recovers from error with partial message', () => {
            stateMachine.handleError(new Error('Test error'))
            stateMachine.handlePartialMessage(createMockMessage(1))
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.STREAMING)
        })
        
        test('recovers from error with full state sync', () => {
            stateMachine.handleError(new Error('Test error'))
            
            const fullState = [createMockMessage(1)]
            stateMachine.handleFullStateSync(fullState)
            
            const state = stateMachine.getState()
            expect(state.state).toBe(MessageStreamState.IDLE)
        })
    })
    
    describe('Metrics', () => {
        test('tracks partial updates', () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handlePartialMessage(createMockMessage(2))
            
            const state = stateMachine.getState()
            expect(state.metrics.partialUpdatesReceived).toBe(2)
        })
        
        test('tracks rejected full syncs', () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handleFullStateSync([createMockMessage(2)])
            
            const state = stateMachine.getState()
            expect(state.metrics.fullSyncsRejected).toBe(1)
        })
        
        test('tracks state transitions', () => {
            stateMachine.handlePartialMessage(createMockMessage(1))
            stateMachine.handleStreamComplete()
            
            const state = stateMachine.getState()
            expect(state.metrics.stateTransitions).toBeGreaterThan(0)
        })
    })
})

// Helper functions
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

## Benefits Demonstrated

1. **Explicit State Management** ✅
   - Clear states and transitions
   - Guards prevent invalid transitions
   - Easy to reason about behavior

2. **Race Condition Prevention** ✅
   - Full state sync blocked during streaming
   - Cooldown period prevents premature sync
   - Automatic recovery mechanisms

3. **Testability** ✅
   - State machine logic is isolated
   - Transitions are deterministic
   - Easy to test edge cases

4. **Observability** ✅
   - Metrics tracking
   - State inspection
   - Detailed logging

5. **Robustness** ✅
   - Error handling and recovery
   - Automatic timeouts
   - Resource cleanup

## Trade-offs

### Complexity
- More code than debounce solution
- Requires understanding of state machines
- Higher initial learning curve

### Performance
- Minimal overhead (just state checks)
- No significant memory impact
- Negligible CPU usage

### Maintenance
- Well-isolated logic
- Clear responsibilities
- Easy to extend with new states

## Conclusion

The State Machine pattern provides a robust, testable solution to the streaming race condition problem. While more complex than the current debounce approach, it offers better long-term maintainability and extensibility if the system continues to evolve.

---

**Status:** ✅ Ready for Evaluation  
**Recommendation:** Consider for systems requiring complex message lifecycle management  
**Author:** MarieCoder AI Assistant  
**Date:** October 15, 2025

