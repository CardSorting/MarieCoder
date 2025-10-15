/**
 * CLI Focus Chain Manager
 * Manages structured multi-step task execution with focus chains
 *
 * Enhanced with webview-ui improvements:
 * - Better visual formatting with terminal styling
 * - Enhanced progress visualization
 * - Improved task state display
 */

import { formatFocusChain } from "./cli_message_formatter"

export interface FocusChainStep {
	id: string
	description: string
	status: "pending" | "in_progress" | "completed" | "skipped"
	startTime?: number
	endTime?: number
	result?: string
}

export interface FocusChain {
	id: string
	taskId: string
	title: string
	steps: FocusChainStep[]
	currentStepIndex: number
	createdAt: number
	updatedAt: number
}

export class CliFocusChainManager {
	private activeFocusChain: FocusChain | null = null
	private verbose: boolean

	constructor(verbose = false) {
		this.verbose = verbose
	}

	/**
	 * Create a new focus chain
	 */
	createFocusChain(taskId: string, title: string, steps: string[]): FocusChain {
		const focusChain: FocusChain = {
			id: this.generateFocusChainId(),
			taskId,
			title,
			steps: steps.map((description, index) => ({
				id: `step_${index + 1}`,
				description,
				status: index === 0 ? "in_progress" : "pending",
			})),
			currentStepIndex: 0,
			createdAt: Date.now(),
			updatedAt: Date.now(),
		}

		this.activeFocusChain = focusChain

		if (this.verbose) {
			console.log(`[FocusChain] Created: ${focusChain.id} with ${steps.length} steps`)
		}

		return focusChain
	}

	/**
	 * Get the active focus chain
	 */
	getActiveFocusChain(): FocusChain | null {
		return this.activeFocusChain
	}

	/**
	 * Update step status
	 */
	updateStepStatus(stepIndex: number, status: FocusChainStep["status"], result?: string): void {
		if (!this.activeFocusChain) {
			throw new Error("No active focus chain")
		}

		if (stepIndex < 0 || stepIndex >= this.activeFocusChain.steps.length) {
			throw new Error(`Invalid step index: ${stepIndex}`)
		}

		const step = this.activeFocusChain.steps[stepIndex]
		const previousStatus = step.status

		step.status = status
		if (result) {
			step.result = result
		}

		if (status === "in_progress" && previousStatus !== "in_progress") {
			step.startTime = Date.now()
		}

		if ((status === "completed" || status === "skipped") && !step.endTime) {
			step.endTime = Date.now()
		}

		this.activeFocusChain.updatedAt = Date.now()

		if (this.verbose) {
			console.log(`[FocusChain] Step ${stepIndex + 1} status: ${previousStatus} -> ${status}`)
		}
	}

	/**
	 * Move to next step
	 */
	nextStep(): boolean {
		if (!this.activeFocusChain) {
			return false
		}

		const currentStep = this.activeFocusChain.steps[this.activeFocusChain.currentStepIndex]
		if (currentStep.status === "in_progress") {
			currentStep.status = "completed"
			currentStep.endTime = Date.now()
		}

		if (this.activeFocusChain.currentStepIndex < this.activeFocusChain.steps.length - 1) {
			this.activeFocusChain.currentStepIndex++
			const nextStep = this.activeFocusChain.steps[this.activeFocusChain.currentStepIndex]
			nextStep.status = "in_progress"
			nextStep.startTime = Date.now()
			this.activeFocusChain.updatedAt = Date.now()
			return true
		}

		return false
	}

	/**
	 * Skip current step
	 */
	skipCurrentStep(): boolean {
		if (!this.activeFocusChain) {
			return false
		}

		const currentStep = this.activeFocusChain.steps[this.activeFocusChain.currentStepIndex]
		currentStep.status = "skipped"
		currentStep.endTime = Date.now()

		return this.nextStep()
	}

	/**
	 * Check if focus chain is complete
	 */
	isComplete(): boolean {
		if (!this.activeFocusChain) {
			return false
		}

		return this.activeFocusChain.steps.every((step) => step.status === "completed" || step.status === "skipped")
	}

	/**
	 * Clear the active focus chain
	 */
	clearFocusChain(): void {
		this.activeFocusChain = null
		if (this.verbose) {
			console.log("[FocusChain] Cleared active focus chain")
		}
	}

	/**
	 * Display focus chain progress
	 * Enhanced with better visual formatting
	 */
	displayFocusChain(): string {
		if (!this.activeFocusChain) {
			return "No active focus chain."
		}

		// Convert steps to the format expected by formatFocusChain
		const formattedSteps = this.activeFocusChain.steps.map((step) => {
			let duration: number | undefined
			if (step.startTime && step.endTime) {
				duration = Math.round((step.endTime - step.startTime) / 1000)
			}

			return {
				description: step.description,
				status: step.status,
				result: step.result,
				duration,
			}
		})

		// Use the enhanced formatter
		return formatFocusChain({
			title: this.activeFocusChain.title,
			steps: formattedSteps,
			currentStepIndex: this.activeFocusChain.currentStepIndex,
		})
	}

	/**
	 * Get a compact summary of the current step
	 */
	getCurrentStepSummary(): string {
		if (!this.activeFocusChain) {
			return ""
		}

		const step = this.activeFocusChain.steps[this.activeFocusChain.currentStepIndex]
		const stepNum = this.activeFocusChain.currentStepIndex + 1
		const totalSteps = this.activeFocusChain.steps.length

		return `[Step ${stepNum}/${totalSteps}] ${step.description}`
	}

	/**
	 * Generate a unique focus chain ID
	 */
	private generateFocusChainId(): string {
		const timestamp = Date.now()
		const random = Math.random().toString(36).substring(2, 8)
		return `fc_${timestamp}_${random}`
	}
}
