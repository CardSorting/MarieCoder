/**
 * State Machine Visualizer
 *
 * Provides utilities for visualizing and debugging state machines.
 * Generates ASCII diagrams, state transition logs, and debug information.
 */

import type { MachineState, StateMachineConfig, StateMachineEvent } from "../use_state_machine"

// ============================================================================
// Types
// ============================================================================

export interface VisualizationOptions {
	/** Show transition history */
	showHistory?: boolean
	/** Maximum history entries to show */
	maxHistoryEntries?: number
	/** Show context data */
	showContext?: boolean
	/** Show available events */
	showAvailableEvents?: boolean
	/** Color output (for terminal) */
	useColors?: boolean
}

export interface TransitionLog {
	timestamp: number
	from: string
	to: string
	event: string
	duration: number
}

// ============================================================================
// ASCII Diagram Generation
// ============================================================================

/**
 * Generate an ASCII state diagram
 *
 * @example
 * ```
 * State Machine: chatMessage
 *
 * ┌─────────┐
 * │  idle   │ ◀── initial
 * └─────────┘
 *      │ SEND
 *      ▼
 * ┌─────────┐
 * │validating│
 * └─────────┘
 *      │ VALIDATION_SUCCESS
 *      ▼
 * ┌─────────┐
 * │ sending │
 * └─────────┘
 * ```
 */
export function generateStateDiagram<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
	currentState?: string,
): string {
	const lines: string[] = []
	const states = Object.keys(config.states)

	// Header
	lines.push(`State Machine: ${config.id || "unnamed"}`)
	lines.push("")

	// Generate each state box
	for (const stateName of states) {
		const stateConfig = config.states[stateName]
		const isCurrent = stateName === currentState
		const isInitial = stateName === config.initial

		// State box
		const stateLabel = stateName.padEnd(12)
		if (isCurrent) {
			lines.push(`┏━━━━━━━━━━━━━┓`)
			lines.push(`┃ ${stateLabel} ┃ ◀── CURRENT`)
			lines.push(`┗━━━━━━━━━━━━━┛`)
		} else if (isInitial) {
			lines.push(`┌─────────────┐`)
			lines.push(`│ ${stateLabel} │ ◀── initial`)
			lines.push(`└─────────────┘`)
		} else {
			lines.push(`┌─────────────┐`)
			lines.push(`│ ${stateLabel} │`)
			lines.push(`└─────────────┘`)
		}

		// Transitions
		if (stateConfig.on) {
			const events = Object.keys(stateConfig.on)
			for (const eventType of events) {
				const transition = stateConfig.on[eventType]
				const target = typeof transition === "string" ? transition : transition.target

				lines.push(`     │ ${eventType}`)
				lines.push(`     ▼`)
				lines.push(`   ${target}`)
				lines.push("")
			}
		}

		lines.push("")
	}

	return lines.join("\n")
}

/**
 * Generate a compact state flow visualization
 *
 * @example
 * ```
 * idle → validating → sending → waiting → streaming → complete
 *   ↓                              ↓
 * error ←───────────────────────────
 * ```
 */
export function generateFlowDiagram<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
	currentState?: string,
): string {
	const flow: string[] = []

	// Build main flow
	const currentFlow: string[] = []
	const visited = new Set<string>()

	function buildFlow(stateName: string, depth: number = 0) {
		if (visited.has(stateName) || depth > 10) {
			return
		}

		visited.add(stateName)

		const marker = stateName === currentState ? `[${stateName}]` : stateName
		currentFlow.push(marker)

		const stateConfig = config.states[stateName]
		if (stateConfig?.on) {
			const events = Object.keys(stateConfig.on)
			if (events.length > 0) {
				const firstEvent = events[0]
				const transition = stateConfig.on[firstEvent]
				const target = typeof transition === "string" ? transition : transition.target

				currentFlow.push(" → ")
				buildFlow(target, depth + 1)
			}
		}
	}

	buildFlow(config.initial)
	flow.push(currentFlow.join(""))

	return flow.join("\n")
}

// ============================================================================
// Transition History
// ============================================================================

/**
 * Format transition history as a readable log
 *
 * @example
 * ```
 * Transition History (last 5):
 * 1. idle → validating (SEND) - 12ms ago
 * 2. validating → sending (VALIDATION_SUCCESS) - 8ms ago
 * 3. sending → waiting (SENT_SUCCESS) - 5ms ago
 * 4. waiting → streaming (STREAMING_STARTED) - 2ms ago
 * 5. streaming → complete (STREAMING_COMPLETE) - just now
 * ```
 */
export function formatTransitionHistory<TContext>(state: MachineState<TContext>, maxEntries: number = 10): string {
	const lines: string[] = []
	const now = Date.now()

	lines.push(`Transition History (last ${maxEntries}):`)
	lines.push("")

	const history = state.history.slice(-maxEntries)

	if (history.length === 0) {
		lines.push("(no transitions yet)")
		return lines.join("\n")
	}

	history.forEach((entry, index) => {
		const timeAgo = formatTimeAgo(now - entry.timestamp)
		lines.push(`${index + 1}. ${entry.from} → ${entry.to} (${entry.event}) - ${timeAgo}`)
	})

	return lines.join("\n")
}

/**
 * Calculate transition statistics
 */
export function calculateTransitionStats<TContext>(state: MachineState<TContext>): {
	totalTransitions: number
	averageTransitionTime: number
	stateFrequency: Record<string, number>
	eventFrequency: Record<string, number>
} {
	const { history } = state

	const stateFrequency: Record<string, number> = {}
	const eventFrequency: Record<string, number> = {}

	let totalTime = 0
	let timeCount = 0

	for (let i = 0; i < history.length; i++) {
		const entry = history[i]

		// Count states
		stateFrequency[entry.from] = (stateFrequency[entry.from] || 0) + 1
		stateFrequency[entry.to] = (stateFrequency[entry.to] || 0) + 1

		// Count events
		eventFrequency[entry.event] = (eventFrequency[entry.event] || 0) + 1

		// Calculate transition time
		if (i > 0) {
			const prevEntry = history[i - 1]
			const timeDiff = entry.timestamp - prevEntry.timestamp
			totalTime += timeDiff
			timeCount++
		}
	}

	return {
		totalTransitions: history.length,
		averageTransitionTime: timeCount > 0 ? totalTime / timeCount : 0,
		stateFrequency,
		eventFrequency,
	}
}

// ============================================================================
// Debug Information
// ============================================================================

/**
 * Generate complete debug information for a state machine
 */
export function generateDebugInfo<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
	state: MachineState<TContext>,
	options: VisualizationOptions = {},
): string {
	const { showHistory = true, showContext = true, showAvailableEvents = true, maxHistoryEntries = 10 } = options

	const lines: string[] = []

	// Header
	lines.push("═══════════════════════════════════════════════════════")
	lines.push(`State Machine Debug Info: ${config.id || "unnamed"}`)
	lines.push("═══════════════════════════════════════════════════════")
	lines.push("")

	// Current state
	lines.push("Current State:")
	lines.push(`  ${state.value}`)
	lines.push("")

	// State diagram
	lines.push("State Diagram:")
	lines.push(generateFlowDiagram(config, state.value))
	lines.push("")

	// Available events
	if (showAvailableEvents) {
		const currentStateConfig = config.states[state.value]
		if (currentStateConfig?.on) {
			lines.push("Available Events:")
			Object.keys(currentStateConfig.on).forEach((eventType) => {
				lines.push(`  • ${eventType}`)
			})
			lines.push("")
		}
	}

	// Context
	if (showContext) {
		lines.push("Context:")
		lines.push(JSON.stringify(state.context, null, 2))
		lines.push("")
	}

	// History
	if (showHistory && state.history.length > 0) {
		lines.push(formatTransitionHistory(state, maxHistoryEntries))
		lines.push("")

		// Statistics
		const stats = calculateTransitionStats(state)
		lines.push("Statistics:")
		lines.push(`  Total Transitions: ${stats.totalTransitions}`)
		lines.push(`  Average Transition Time: ${stats.averageTransitionTime.toFixed(2)}ms`)
		lines.push("")
		lines.push("  State Frequency:")
		Object.entries(stats.stateFrequency)
			.sort(([, a], [, b]) => b - a)
			.forEach(([stateName, count]) => {
				lines.push(`    ${stateName}: ${count}`)
			})
		lines.push("")
		lines.push("  Event Frequency:")
		Object.entries(stats.eventFrequency)
			.sort(([, a], [, b]) => b - a)
			.forEach(([eventType, count]) => {
				lines.push(`    ${eventType}: ${count}`)
			})
		lines.push("")
	}

	lines.push("═══════════════════════════════════════════════════════")

	return lines.join("\n")
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format milliseconds as human-readable time ago
 */
function formatTimeAgo(ms: number): string {
	if (ms < 1000) {
		return `${ms}ms ago`
	}
	if (ms < 60000) {
		return `${(ms / 1000).toFixed(1)}s ago`
	}
	if (ms < 3600000) {
		return `${(ms / 60000).toFixed(1)}m ago`
	}
	return `${(ms / 3600000).toFixed(1)}h ago`
}

/**
 * Export state machine to JSON for analysis
 */
export function exportToJSON<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
	state: MachineState<TContext>,
): string {
	return JSON.stringify(
		{
			config: {
				id: config.id,
				initial: config.initial,
				states: Object.keys(config.states),
			},
			currentState: {
				value: state.value,
				context: state.context,
				history: state.history,
				canGoBack: state.canGoBack,
			},
		},
		null,
		2,
	)
}

/**
 * Create a mermaid.js state diagram
 * Can be used in markdown documentation
 *
 * @example
 * ```mermaid
 * stateDiagram-v2
 *   [*] --> idle
 *   idle --> validating: SEND
 *   validating --> sending: VALIDATION_SUCCESS
 *   sending --> waiting: SENT_SUCCESS
 *   waiting --> streaming: STREAMING_STARTED
 *   streaming --> complete: STREAMING_COMPLETE
 * ```
 */
export function generateMermaidDiagram<TContext, TEvent extends StateMachineEvent>(
	config: StateMachineConfig<TContext, TEvent>,
): string {
	const lines: string[] = []

	lines.push("```mermaid")
	lines.push("stateDiagram-v2")
	lines.push(`  [*] --> ${config.initial}`)

	// Generate transitions
	for (const [stateName, stateConfig] of Object.entries(config.states)) {
		if (stateConfig.on) {
			for (const [eventType, transition] of Object.entries(stateConfig.on)) {
				const target = typeof transition === "string" ? transition : transition.target
				lines.push(`  ${stateName} --> ${target}: ${eventType}`)
			}
		}
	}

	lines.push("```")

	return lines.join("\n")
}
