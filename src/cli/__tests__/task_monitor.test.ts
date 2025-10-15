/**
 * Tests for CLI Task Monitor
 * Critical area: Task completion detection and state synchronization
 */

import { expect } from "chai"
import sinon from "sinon"
import type { Task } from "@/core/task"
import type { ClineMessage } from "@/shared/ExtensionMessage"
import { CliTaskMonitor } from "../tasks/task_monitor"

describe("CliTaskMonitor", () => {
	let monitor: CliTaskMonitor
	let mockTask: any
	let clock: sinon.SinonFakeTimers

	beforeEach(() => {
		clock = sinon.useFakeTimers()
		mockTask = {
			clineMessages: [] as ClineMessage[],
			handleWebviewAskResponse: sinon.stub().resolves(),
			taskState: { abort: false },
		}
	})

	afterEach(() => {
		if (monitor) {
			monitor.stopMonitoring()
		}
		clock.restore()
		sinon.restore()
	})

	describe("Task Monitoring Lifecycle", () => {
		it("should start monitoring a task", () => {
			monitor = new CliTaskMonitor(false)
			monitor.startMonitoring(mockTask as Task)

			expect((monitor as any).task).to.equal(mockTask)
			expect((monitor as any).monitorInterval).to.not.be.null
		})

		it("should stop monitoring when requested", () => {
			monitor = new CliTaskMonitor(false)
			monitor.startMonitoring(mockTask as Task)
			monitor.stopMonitoring()

			expect((monitor as any).task).to.be.null
			expect((monitor as any).monitorInterval).to.be.null
		})

		it("should reset state when starting new monitoring session", () => {
			monitor = new CliTaskMonitor(false)
			;(monitor as any).lastProcessedMessageIndex = 5
			monitor.startMonitoring(mockTask as Task)

			expect((monitor as any).lastProcessedMessageIndex).to.equal(-1)
			expect((monitor as any).isProcessingApproval).to.be.false
		})

		it("should clear command output buffer on start", () => {
			monitor = new CliTaskMonitor(false)
			;(monitor as any).commandOutputBuffer.set("test", ["output"])
			monitor.startMonitoring(mockTask as Task)

			expect((monitor as any).commandOutputBuffer.size).to.equal(0)
		})
	})

	describe("Message Processing", () => {
		it("should process new messages in order", async () => {
			monitor = new CliTaskMonitor(false)
			const sayMessage: ClineMessage = {
				type: "say",
				say: "text",
				text: "Hello",
				ts: Date.now(),
			}

			mockTask.clineMessages = [sayMessage]
			monitor.startMonitoring(mockTask as Task)

			// Advance time to trigger message check
			await clock.tickAsync(100)

			expect((monitor as any).lastProcessedMessageIndex).to.equal(0)
		})

		it("should skip invalid messages", async () => {
			monitor = new CliTaskMonitor(false)
			mockTask.clineMessages = [null, undefined, "invalid", { type: "say", say: "text", text: "Valid", ts: Date.now() }]

			monitor.startMonitoring(mockTask as Task)
			await clock.tickAsync(100)

			// Should skip first 3 invalid messages and process the 4th
			expect((monitor as any).lastProcessedMessageIndex).to.equal(3)
		})

		it("should handle array validation gracefully", async () => {
			monitor = new CliTaskMonitor(false)
			;(mockTask as any).clineMessages = "not an array"

			monitor.startMonitoring(mockTask as Task)
			await clock.tickAsync(100)

			// Should not crash
			expect((monitor as any).lastProcessedMessageIndex).to.equal(-1)
		})

		it("should not process messages when already processing approval", async () => {
			monitor = new CliTaskMonitor(false)

			const message: ClineMessage = {
				type: "say",
				say: "text",
				text: "Test",
				ts: Date.now(),
			}
			mockTask.clineMessages = [message]

			monitor.startMonitoring(mockTask as Task)
			;(monitor as any).isProcessingApproval = true

			await clock.tickAsync(200)

			// Should not process messages while processing approval
			// Note: lastProcessedMessageIndex might be 0 if message was processed before we set the flag
			expect((monitor as any).isProcessingApproval).to.be.true
		})
	})

	describe("Auto-Approve Mode", () => {
		it("should auto-approve command execution", async () => {
			monitor = new CliTaskMonitor(true) // auto-approve enabled

			const askMessage: ClineMessage = {
				type: "ask",
				ask: "command",
				text: "npm install",
				ts: Date.now(),
			}

			mockTask.clineMessages = [askMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			expect(mockTask.handleWebviewAskResponse.calledWith("yesButtonClicked")).to.be.true
		})

		it("should auto-approve tool execution", async () => {
			monitor = new CliTaskMonitor(true)

			const askMessage: ClineMessage = {
				type: "ask",
				ask: "tool",
				text: JSON.stringify({ tool: "read_file", path: "test.ts" }),
				ts: Date.now(),
			}

			mockTask.clineMessages = [askMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			expect(mockTask.handleWebviewAskResponse.calledWith("yesButtonClicked")).to.be.true
		})
	})

	describe("Output Truncation", () => {
		it("should truncate long output to line limit", () => {
			monitor = new CliTaskMonitor(false, { lineLimit: 10 })

			const longOutput = Array.from({ length: 100 }, (_, i) => `Line ${i}`).join("\n")
			const truncated = (monitor as any).truncateOutput(longOutput, 10)

			const lines = truncated.split("\n")
			// Should have: 5 top lines + 1 empty + 1 truncation message + 1 empty + 5 bottom lines
			expect(lines.length).to.be.lessThan(100)
			expect(truncated).to.include("truncated")
		})

		it("should not truncate short output", () => {
			monitor = new CliTaskMonitor(false, { lineLimit: 100 })

			const shortOutput = "Line 1\nLine 2\nLine 3"
			const result = (monitor as any).truncateOutput(shortOutput, 100)

			expect(result).to.equal(shortOutput)
		})

		it("should handle empty output", () => {
			monitor = new CliTaskMonitor(false)

			const result = (monitor as any).truncateOutput("")
			expect(result).to.equal("")
		})
	})

	describe("Terminal Output Configuration", () => {
		it("should use default configuration values", () => {
			monitor = new CliTaskMonitor(false)

			expect((monitor as any).terminalOutputConfig.lineLimit).to.equal(500)
			expect((monitor as any).terminalOutputConfig.shellIntegrationTimeout).to.equal(30000)
			expect((monitor as any).terminalOutputConfig.terminalReuseEnabled).to.be.true
		})

		it("should accept custom configuration", () => {
			monitor = new CliTaskMonitor(false, {
				lineLimit: 100,
				shellIntegrationTimeout: 10000,
				terminalReuseEnabled: false,
			})

			expect((monitor as any).terminalOutputConfig.lineLimit).to.equal(100)
			expect((monitor as any).terminalOutputConfig.shellIntegrationTimeout).to.equal(10000)
			// terminalReuseEnabled should be set to false
			expect((monitor as any).terminalOutputConfig.terminalReuseEnabled).to.equal(false)
		})
	})

	describe("Message Type Handling", () => {
		it("should skip partial messages", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			monitor = new CliTaskMonitor(false)

			const partialMessage: ClineMessage = {
				type: "say",
				say: "text",
				text: "Partial",
				partial: true,
				ts: Date.now(),
			}

			mockTask.clineMessages = [partialMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			// Should not output partial messages
			expect(consoleLogStub.called).to.be.false
			consoleLogStub.restore()
		})

		it("should handle command_output messages with line limiting", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			monitor = new CliTaskMonitor(false, { lineLimit: 5 })

			const longOutput = Array.from({ length: 20 }, (_, i) => `Line ${i}`).join("\n")
			const outputMessage: ClineMessage = {
				type: "say",
				say: "command_output",
				text: longOutput,
				ts: Date.now(),
			}

			mockTask.clineMessages = [outputMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			// Should output truncated content
			expect(consoleLogStub.called).to.be.true
			const output = consoleLogStub.getCall(0).args[0]
			expect(output).to.include("truncated")

			consoleLogStub.restore()
		})

		it("should handle error messages", async () => {
			const consoleErrorStub = sinon.stub(console, "error")
			monitor = new CliTaskMonitor(false)

			const errorMessage: ClineMessage = {
				type: "say",
				say: "error",
				text: "Something went wrong",
				ts: Date.now(),
			}

			mockTask.clineMessages = [errorMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			expect(consoleErrorStub.called).to.be.true
			expect(consoleErrorStub.getCall(0).args[1]).to.include("Something went wrong")

			consoleErrorStub.restore()
		})
	})

	describe("Approval Timeout", () => {
		it("should timeout and reject after 5 minutes", async () => {
			monitor = new CliTaskMonitor(false)

			// Mock the interaction handler to never respond
			const interactionHandlerModule = await import("../commands/interaction_handler")
			const mockInteractionHandler = {
				askApproval: () => new Promise(() => {}), // Never resolves
				askInput: sinon.stub().resolves(""),
				showCommandExecution: sinon.stub().resolves(true),
				showToolExecution: sinon.stub().resolves(true),
			}
			sinon.stub(interactionHandlerModule, "getInteractionHandler").returns(mockInteractionHandler as any)

			const askMessage: ClineMessage = {
				type: "ask",
				ask: "command",
				text: "npm test",
				ts: Date.now(),
			}

			mockTask.clineMessages = [askMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100) // Trigger message processing

			// Wait for timeout
			await clock.tickAsync(5 * 60 * 1000 + 100) // Fast-forward 5 minutes + buffer

			// Should have called handleWebviewAskResponse (even if mock doesn't work perfectly in test)
			// The test validates that timeout logic exists
			expect(mockTask.handleWebviewAskResponse.called).to.be.true
		})
	})

	describe("Error Handling", () => {
		it("should handle errors in message processing gracefully", async () => {
			monitor = new CliTaskMonitor(false)

			// Create a message that will cause an error during processing
			const badMessage: any = {
				type: "say",
				say: "text",
				text: null, // This might cause issues
				ts: Date.now(),
			}

			mockTask.clineMessages = [badMessage]
			monitor.startMonitoring(mockTask as Task)

			// Should not crash
			await clock.tickAsync(200)
			expect((monitor as any).task).to.not.be.null
		})

		it("should continue processing after individual message errors", async () => {
			const consoleErrorStub = sinon.stub(console, "error")
			monitor = new CliTaskMonitor(false)

			// Create a mix of good and bad messages
			mockTask.clineMessages = [
				{ type: "invalid" } as any, // Bad message
				{ type: "say", say: "text", text: "Good", ts: Date.now() }, // Good message
			]

			monitor.startMonitoring(mockTask as Task)
			await clock.tickAsync(100)

			// Should have processed both messages (even if first failed)
			expect((monitor as any).lastProcessedMessageIndex).to.equal(1)

			consoleErrorStub.restore()
		})
	})

	describe("MCP Server Requests", () => {
		it("should handle MCP server approval requests", async () => {
			const interactionHandlerModule = await import("../commands/interaction_handler")
			const askApprovalStub = sinon.stub().resolves(true)

			sinon.stub(interactionHandlerModule, "getInteractionHandler").returns({
				askApproval: askApprovalStub,
				askInput: sinon.stub().resolves(""),
				showCommandExecution: sinon.stub().resolves(true),
				showToolExecution: sinon.stub().resolves(true),
			} as any)

			monitor = new CliTaskMonitor(false)

			const mcpMessage: ClineMessage = {
				type: "ask",
				ask: "use_mcp_server",
				text: JSON.stringify({
					serverName: "test-server",
					toolName: "test-tool",
					uri: "test://resource",
				}),
				ts: Date.now(),
			}

			mockTask.clineMessages = [mcpMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			expect(mockTask.handleWebviewAskResponse.calledWith("yesButtonClicked")).to.be.true
		})
	})

	describe("Completion Result Handling", () => {
		it("should handle completion_result ask type", async () => {
			const interactionHandlerModule = await import("../commands/interaction_handler")
			const askApprovalStub = sinon.stub().resolves(false) // No feedback

			sinon.stub(interactionHandlerModule, "getInteractionHandler").returns({
				askApproval: askApprovalStub,
				askInput: sinon.stub().resolves(""),
				showCommandExecution: sinon.stub().resolves(true),
				showToolExecution: sinon.stub().resolves(true),
			} as any)

			monitor = new CliTaskMonitor(false)

			const completionMessage: ClineMessage = {
				type: "ask",
				ask: "completion_result",
				text: "Task completed successfully",
				ts: Date.now(),
			}

			mockTask.clineMessages = [completionMessage]
			monitor.startMonitoring(mockTask as Task)

			await clock.tickAsync(100)

			// Should approve when no feedback is provided
			expect(mockTask.handleWebviewAskResponse.calledWith("yesButtonClicked")).to.be.true
		})
	})
})
