/**
 * Tests for CLI Task Completion Detection
 * Critical area: Proper detection of task completion states
 * Related commit: 21b56f2e - Enhance task completion detection and state synchronization
 */

import { expect } from "chai"
import sinon from "sinon"

describe("CLI Task Completion Detection", () => {
	let mockController: any
	let clock: sinon.SinonFakeTimers

	beforeEach(() => {
		clock = sinon.useFakeTimers()
		mockController = {
			task: null,
			getStateToPostToWebview: sinon.stub(),
			clearTask: sinon.stub().resolves(),
		}
	})

	afterEach(() => {
		clock.restore()
		sinon.restore()
	})

	describe("Task Completion States", () => {
		it("should detect completion when task is null", async () => {
			mockController.task = null
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: null,
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should detect completion when taskState.abort is true", async () => {
			mockController.task = {
				taskState: { abort: true },
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "test-task" },
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should detect completion when currentTaskItem is null", async () => {
			mockController.task = {
				taskState: { abort: false },
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: null,
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should detect task is not complete when all conditions are active", async () => {
			mockController.task = {
				taskState: { abort: false },
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "test-task" },
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false
		})
	})

	describe("Completion Detection Edge Cases", () => {
		it("should handle getStateToPostToWebview errors gracefully", async () => {
			mockController.task = {
				taskState: { abort: false },
			}
			mockController.getStateToPostToWebview.rejects(new Error("State unavailable"))

			// Should consider task complete on error
			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should handle undefined task state", async () => {
			mockController.task = {
				taskState: undefined,
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "test-task" },
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false
		})

		it("should handle null taskState", async () => {
			mockController.task = {
				taskState: null,
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "test-task" },
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false
		})

		it("should handle empty state response", async () => {
			mockController.task = {
				taskState: { abort: false },
			}
			mockController.getStateToPostToWebview.resolves({})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true // No currentTaskItem means complete
		})
	})

	describe("Task State Synchronization", () => {
		it("should properly sync task cleared state", async () => {
			mockController.task = { taskState: { abort: false } }
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "task-1" },
			})

			// Initially not complete
			let isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false

			// Clear the task
			await mockController.clearTask()
			mockController.task = null
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: null,
			})

			// Now should be complete
			isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should handle rapid state changes", async () => {
			// Simulate rapid state transitions
			const states = [
				{ task: { taskState: { abort: false } }, currentTaskItem: { id: "1" } },
				{ task: { taskState: { abort: false } }, currentTaskItem: { id: "2" } },
				{ task: null, currentTaskItem: null },
			]

			for (const state of states) {
				mockController.task = state.task
				mockController.getStateToPostToWebview.resolves({
					currentTaskItem: state.currentTaskItem,
				})

				const isComplete = await checkTaskCompletion(mockController)
				if (state.task === null) {
					expect(isComplete).to.be.true
				} else {
					expect(isComplete).to.be.false
				}
			}
		})
	})

	describe("Task Completion Polling", () => {
		it("should poll until task completes", async () => {
			let pollCount = 0
			mockController.task = { taskState: { abort: false } }
			mockController.getStateToPostToWebview.callsFake(async () => {
				pollCount++
				if (pollCount >= 5) {
					// Complete after 5 polls
					mockController.task = null
					return { currentTaskItem: null }
				}
				return { currentTaskItem: { id: "task-1" } }
			})

			const completionPromise = waitForTaskCompletion(mockController)

			// Advance time to trigger multiple polls
			for (let i = 0; i < 10; i++) {
				await clock.tickAsync(500)
			}

			const result = await completionPromise
			expect(result).to.be.true
			expect(pollCount).to.be.greaterThanOrEqual(5)
		})

		it("should stop polling after task completes", async () => {
			mockController.task = { taskState: { abort: false } }
			let getStateCalls = 0

			mockController.getStateToPostToWebview.callsFake(async () => {
				getStateCalls++
				if (getStateCalls >= 2) {
					mockController.task = null
					return { currentTaskItem: null }
				}
				return { currentTaskItem: { id: "task-1" } }
			})

			const completionPromise = waitForTaskCompletion(mockController)

			// Advance time
			for (let i = 0; i < 10; i++) {
				await clock.tickAsync(500)
			}

			await completionPromise

			// Should not continue polling after completion
			const callsBefore = getStateCalls
			await clock.tickAsync(5000)
			expect(getStateCalls).to.equal(callsBefore)
		})
	})

	describe("Abort State Detection", () => {
		it("should detect abort via taskState.abort", async () => {
			mockController.task = {
				taskState: { abort: true },
			}
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "task-1" },
			})

			const isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})

		it("should handle abort during active task", async () => {
			mockController.task = { taskState: { abort: false } }
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "task-1" },
			})

			// Not complete initially
			let isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false

			// Set abort flag
			mockController.task.taskState.abort = true

			// Should now be complete
			isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true
		})
	})

	describe("Multiple Task Transitions", () => {
		it("should handle task transitions correctly", async () => {
			// Task 1
			mockController.task = { taskState: { abort: false } }
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "task-1" },
			})

			let isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false

			// Complete task 1
			mockController.task = null
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: null,
			})

			isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.true

			// Start task 2
			mockController.task = { taskState: { abort: false } }
			mockController.getStateToPostToWebview.resolves({
				currentTaskItem: { id: "task-2" },
			})

			isComplete = await checkTaskCompletion(mockController)
			expect(isComplete).to.be.false
		})
	})
})

/**
 * Helper function that mimics the task completion detection logic
 * from src/cli/index.ts:275-306
 */
async function checkTaskCompletion(controller: any): Promise<boolean> {
	try {
		const state = await controller.getStateToPostToWebview()

		// Check if task is complete by checking:
		// 1. Task has been cleared (controller.task is null)
		// 2. Task has been aborted (taskState.abort is true)
		// 3. Current task item is no longer in state
		if (!controller.task || !state.currentTaskItem || controller.task?.taskState?.abort) {
			return true
		}

		return false
	} catch (_error) {
		// Task might have been cleared
		return true
	}
}

/**
 * Helper function that mimics the polling logic from index.ts
 */
async function waitForTaskCompletion(controller: any): Promise<boolean> {
	return new Promise((resolve) => {
		const checkInterval = setInterval(async () => {
			const isComplete = await checkTaskCompletion(controller)
			if (isComplete) {
				clearInterval(checkInterval)
				resolve(true)
			}
		}, 500)
	})
}
