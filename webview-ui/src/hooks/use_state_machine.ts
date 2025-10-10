/**
 * State Machine Hook
 *
 * Provides a robust state machine implementation for managing complex state transitions.
 * Inspired by XState but lightweight and tailored for our needs.
 *
 * Features:
 * - Type-safe state transitions
 * - Guard functions to validate transitions
 * - Actions (side effects) on enter/exit
 * - Context data alongside state
 * - Transition history
 * - Debug logging
 *
 * @example
 * ```typescript
 * const machine = createStateMachine({
 *   initial: 'idle',
 *   states: {
 *     idle: {
 *       on: { START: 'loading' }
 *     },
 *     loading: {
 *       on: { SUCCESS: 'success', FAILURE: 'error' },
 *       onEnter: () => console.log('Loading started')
 *     }
 *   }
 * })
 *
 * const [state, send, context] = useStateMachine(machine)
 * ```
 */

import { useCallback, useEffect, useReducer, useRef } from "react"
import { debug } from "@/utils/debug_logger"

// ============================================================================
// Types
// ============================================================================

/**
 * State machine event - triggers transitions
 */
export interface StateMachineEvent<TEventType extends string = string, TPayload = unknown> {
	type: TEventType
	payload?: TPayload
}

/**
 * Guard function - determines if a transition should occur
 * @returns true to allow transition, false to block it
 */
export type Guard<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> = (
	context: TContext,
	event: TEvent,
) => boolean

/**
 * Action function - side effect that runs on transition
 */
export type Action<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> = (
	context: TContext,
	event: TEvent,
) => undefined | Partial<TContext> | Promise<undefined | Partial<TContext>>

/**
 * State transition definition
 */
export interface StateTransition<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> {
	/** Target state to transition to */
	target: string
	/** Guard function to check before transition */
	guard?: Guard<TContext, TEvent>
	/** Actions to run on transition */
	actions?: Action<TContext, TEvent>[]
}

/**
 * State definition
 */
export interface StateDefinition<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> {
	/** Transitions for this state */
	on?: Record<string, string | StateTransition<TContext, TEvent>>
	/** Action to run when entering this state */
	onEnter?: Action<TContext, TEvent>
	/** Action to run when exiting this state */
	onExit?: Action<TContext, TEvent>
	/** Initial nested state (for hierarchical state machines) */
	initial?: string
	/** Nested states (for hierarchical state machines) */
	states?: Record<string, StateDefinition<TContext, TEvent>>
}

/**
 * State machine configuration
 */
export interface StateMachineConfig<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> {
	/** Unique identifier for the machine */
	id?: string
	/** Initial state */
	initial: string
	/** Initial context data */
	context?: TContext
	/** State definitions */
	states: Record<string, StateDefinition<TContext, TEvent>>
	/** Enable debug logging */
	debug?: boolean
}

/**
 * Current state of the machine
 */
export interface MachineState<TContext = unknown> {
	/** Current state name */
	value: string
	/** Current context data */
	context: TContext
	/** History of state transitions */
	history: Array<{ from: string; to: string; event: string; timestamp: number }>
	/** Previous state (for easy rollback) */
	previousState?: string
	/** Whether the machine can go back */
	canGoBack: boolean
}

/**
 * Send function to trigger events
 */
export type SendFunction<TEvent extends StateMachineEvent = StateMachineEvent> = (
	eventOrType: TEvent | TEvent["type"],
	payload?: TEvent["payload"],
) => void

/**
 * State machine service - returned by the hook
 */
export interface StateMachineService<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent> {
	/** Current state */
	state: MachineState<TContext>
	/** Send an event to trigger a transition */
	send: SendFunction<TEvent>
	/** Check if the machine can handle an event */
	can: (eventType: string) => boolean
	/** Get available events for current state */
	getAvailableEvents: () => string[]
	/** Update context without changing state */
	updateContext: (updates: Partial<TContext>) => void
	/** Go back to previous state */
	goBack: () => void
	/** Check if machine is in a specific state */
	matches: (state: string) => boolean
	/** Reset machine to initial state */
	reset: () => void
}

// ============================================================================
// State Machine Hook
// ============================================================================

/**
 * Use a state machine for complex state management
 *
 * @param config State machine configuration
 * @returns State machine service
 *
 * @example
 * ```typescript
 * const chatMachine = useStateMachine({
 *   initial: 'idle',
 *   context: { messageCount: 0 },
 *   states: {
 *     idle: {
 *       on: { SEND: 'sending' }
 *     },
 *     sending: {
 *       on: { SUCCESS: 'idle', ERROR: 'error' },
 *       onEnter: (ctx) => ({ messageCount: ctx.messageCount + 1 })
 *     }
 *   }
 * })
 * ```
 */
export function useStateMachine<TContext = unknown, TEvent extends StateMachineEvent = StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
): StateMachineService<TContext, TEvent> {
	const [machineState, dispatch] = useReducer(createReducer(config), createInitialState(config))

	const configRef = useRef(config)
	const pendingActionsRef = useRef<Action<TContext, TEvent>[]>([])

	// Update config ref when config changes
	useEffect(() => {
		configRef.current = config
	}, [config])

	// Log state changes in debug mode
	useEffect(() => {
		if (config.debug) {
			debug.log(`[StateMachine:${config.id || "unnamed"}] State: ${machineState.value}`, machineState.context)
		}
	}, [machineState.value, machineState.context, config.debug, config.id])

	// Execute pending async actions
	useEffect(() => {
		const actions = pendingActionsRef.current
		if (actions.length > 0) {
			pendingActionsRef.current = []
			executeActions(actions, machineState.context, { type: "NOOP" } as TEvent)
		}
	}, [machineState.context])

	/**
	 * Send an event to trigger a transition
	 */
	const send: SendFunction<TEvent> = useCallback((eventOrType, payload?) => {
		if (typeof eventOrType === "string") {
			dispatch({ type: "SEND_EVENT", event: { type: eventOrType, payload } as TEvent })
		} else {
			dispatch({ type: "SEND_EVENT", event: eventOrType })
		}
	}, [])

	/**
	 * Check if the machine can handle an event in the current state
	 */
	const can = useCallback(
		(eventType: string): boolean => {
			const currentState = configRef.current.states[machineState.value]
			if (!currentState?.on) {
				return false
			}

			const transition = currentState.on[eventType]
			if (!transition) {
				return false
			}

			// If transition has a guard, check it
			if (typeof transition === "object" && transition.guard) {
				return transition.guard(machineState.context, { type: eventType } as TEvent)
			}

			return true
		},
		[machineState.value, machineState.context],
	)

	/**
	 * Get available events for current state
	 */
	const getAvailableEvents = useCallback((): string[] => {
		const currentState = configRef.current.states[machineState.value]
		if (!currentState?.on) {
			return []
		}

		return Object.keys(currentState.on).filter((eventType) => can(eventType))
	}, [machineState.value, can])

	/**
	 * Update context without changing state
	 */
	const updateContext = useCallback((updates: Partial<TContext>) => {
		dispatch({ type: "UPDATE_CONTEXT", updates })
	}, [])

	/**
	 * Go back to previous state
	 */
	const goBack = useCallback(() => {
		if (machineState.canGoBack && machineState.previousState) {
			dispatch({ type: "GO_BACK" })
		}
	}, [machineState.canGoBack, machineState.previousState])

	/**
	 * Check if machine is in a specific state
	 */
	const matches = useCallback(
		(state: string): boolean => {
			return machineState.value === state
		},
		[machineState.value],
	)

	/**
	 * Reset machine to initial state
	 */
	const reset = useCallback(() => {
		dispatch({ type: "RESET" })
	}, [])

	return {
		state: machineState,
		send,
		can,
		getAvailableEvents,
		updateContext,
		goBack,
		matches,
		reset,
	}
}

// ============================================================================
// Internal Helpers
// ============================================================================

/**
 * Create initial state from config
 */
function createInitialState<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
): MachineState<TContext> {
	return {
		value: config.initial,
		context: (config.context || {}) as TContext,
		history: [],
		canGoBack: false,
	}
}

/**
 * Reducer action types
 */
type ReducerAction<TContext, TEvent extends StateMachineEvent> =
	| { type: "SEND_EVENT"; event: TEvent }
	| { type: "UPDATE_CONTEXT"; updates: Partial<TContext> }
	| { type: "GO_BACK" }
	| { type: "RESET" }

/**
 * Create reducer for state machine
 */
function createReducer<TContext, TEvent extends StateMachineEvent>(config: StateMachineConfig<TContext, TEvent>) {
	const initialState = createInitialState(config)

	return (state: MachineState<TContext>, action: ReducerAction<TContext, TEvent>): MachineState<TContext> => {
		switch (action.type) {
			case "SEND_EVENT": {
				const { event } = action
				const currentStateConfig = config.states[state.value]

				if (!currentStateConfig?.on) {
					if (config.debug) {
						debug.log(`[StateMachine:${config.id}] No transitions defined for state: ${state.value}`)
					}
					return state
				}

				const transition = currentStateConfig.on[event.type]
				if (!transition) {
					if (config.debug) {
						debug.log(`[StateMachine:${config.id}] No transition for event: ${event.type} in state: ${state.value}`)
					}
					return state
				}

				// Normalize transition to object
				const normalizedTransition: StateTransition<TContext, TEvent> =
					typeof transition === "string" ? { target: transition } : transition

				// Check guard
				if (normalizedTransition.guard && !normalizedTransition.guard(state.context, event)) {
					if (config.debug) {
						debug.log(`[StateMachine:${config.id}] Guard blocked transition: ${event.type}`)
					}
					return state
				}

				const targetState = normalizedTransition.target
				const targetStateConfig = config.states[targetState]

				if (!targetStateConfig) {
					console.error(`[StateMachine:${config.id}] Invalid target state: ${targetState}`)
					return state
				}

				// Execute exit action of current state
				let newContext = state.context
				if (currentStateConfig.onExit) {
					const result = currentStateConfig.onExit(state.context, event)
					if (result && typeof result === "object" && !(result instanceof Promise)) {
						newContext = { ...newContext, ...result }
					}
				}

				// Execute transition actions
				if (normalizedTransition.actions) {
					for (const action of normalizedTransition.actions) {
						const result = action(newContext, event)
						if (result && typeof result === "object" && !(result instanceof Promise)) {
							newContext = { ...newContext, ...result }
						}
					}
				}

				// Execute enter action of target state
				if (targetStateConfig.onEnter) {
					const result = targetStateConfig.onEnter(newContext, event)
					if (result && typeof result === "object" && !(result instanceof Promise)) {
						newContext = { ...newContext, ...result }
					}
				}

				// Create new state
				const newState: MachineState<TContext> = {
					value: targetState,
					context: newContext,
					history: [
						...state.history,
						{
							from: state.value,
							to: targetState,
							event: event.type,
							timestamp: Date.now(),
						},
					].slice(-20), // Keep last 20 transitions
					previousState: state.value,
					canGoBack: true,
				}

				if (config.debug) {
					debug.log(`[StateMachine:${config.id}] Transition: ${state.value} -> ${targetState} (${event.type})`)
				}

				return newState
			}

			case "UPDATE_CONTEXT": {
				return {
					...state,
					context: { ...state.context, ...action.updates },
				}
			}

			case "GO_BACK": {
				if (!state.canGoBack || !state.previousState) {
					return state
				}

				return {
					value: state.previousState,
					context: state.context,
					history: state.history.slice(0, -1),
					previousState: state.history[state.history.length - 2]?.from,
					canGoBack: state.history.length > 1,
				}
			}

			case "RESET": {
				return initialState
			}

			default: {
				return state
			}
		}
	}
}

/**
 * Execute array of actions
 */
async function executeActions<TContext, TEvent extends StateMachineEvent>(
	actions: Action<TContext, TEvent>[],
	context: TContext,
	event: TEvent,
): Promise<Partial<TContext> | undefined> {
	let updatedContext: Partial<TContext> = {}

	for (const action of actions) {
		const result = await action(context, event)
		if (result) {
			updatedContext = { ...updatedContext, ...result }
		}
	}

	return Object.keys(updatedContext).length > 0 ? updatedContext : undefined
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create a guard that checks multiple conditions (AND logic)
 */
export function and<TContext, TEvent extends StateMachineEvent>(...guards: Guard<TContext, TEvent>[]): Guard<TContext, TEvent> {
	return (context, event) => guards.every((guard) => guard(context, event))
}

/**
 * Create a guard that checks if any condition passes (OR logic)
 */
export function or<TContext, TEvent extends StateMachineEvent>(...guards: Guard<TContext, TEvent>[]): Guard<TContext, TEvent> {
	return (context, event) => guards.some((guard) => guard(context, event))
}

/**
 * Create a guard that inverts another guard (NOT logic)
 */
export function not<TContext, TEvent extends StateMachineEvent>(guard: Guard<TContext, TEvent>): Guard<TContext, TEvent> {
	return (context, event) => !guard(context, event)
}

/**
 * Create a typed event creator
 */
export function createEvent<TType extends string, TPayload = undefined>(
	type: TType,
): TPayload extends undefined
	? () => StateMachineEvent<TType, TPayload>
	: (payload: TPayload) => StateMachineEvent<TType, TPayload> {
	return ((payload?: TPayload) => ({
		type,
		payload,
	})) as any
}
