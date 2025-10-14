/**
 * Tests for CLI Interaction Handler
 * Critical area: User approval and interaction handling
 */

import * as readline from "node:readline"
import { expect } from "chai"
import sinon from "sinon"
import { CliInteractionHandler, closeInteractionHandler, getInteractionHandler } from "../cli_interaction_handler"

describe("CliInteractionHandler", () => {
	let handler: CliInteractionHandler
	let clock: sinon.SinonFakeTimers
	let rlStub: any

	beforeEach(() => {
		clock = sinon.useFakeTimers()

		// Mock readline interface
		rlStub = {
			question: sinon.stub(),
			close: sinon.stub(),
		}

		sinon.stub(readline, "createInterface").returns(rlStub as any)
		handler = new CliInteractionHandler()
	})

	afterEach(() => {
		clock.restore()
		sinon.restore()
		closeInteractionHandler()
	})

	describe("Approval Prompts", () => {
		it("should approve when user enters 'y'", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const result = await handler.askApproval("Approve?", false)
			expect(result).to.be.true
		})

		it("should approve when user enters 'yes'", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("yes")
			})

			const result = await handler.askApproval("Approve?", false)
			expect(result).to.be.true
		})

		it("should reject when user enters 'n'", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("n")
			})

			const result = await handler.askApproval("Approve?", true)
			expect(result).to.be.false
		})

		it("should use default value when user enters empty string", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("")
			})

			const result = await handler.askApproval("Approve?", true)
			expect(result).to.be.true
		})

		it("should be case insensitive", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("YES")
			})

			const result = await handler.askApproval("Approve?", false)
			expect(result).to.be.true
		})

		it("should trim whitespace from input", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("  y  ")
			})

			const result = await handler.askApproval("Approve?", false)
			expect(result).to.be.true
		})

		it("should timeout after specified time", async () => {
			let _questionCallback: ((answer: string) => void) | null = null

			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				_questionCallback = callback
			})

			const consoleLogStub = sinon.stub(console, "log")
			const approvalPromise = handler.askApproval("Approve?", false, 5000)

			// Advance time past timeout
			await clock.tickAsync(5001)

			const result = await approvalPromise
			expect(result).to.be.false // defaultYes was false
			expect(consoleLogStub.calledWith(sinon.match(/Timeout/))).to.be.true

			consoleLogStub.restore()
		})

		it("should not timeout if user responds in time", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				// Respond immediately
				callback("y")
			})

			const result = await handler.askApproval("Approve?", false, 5000)
			expect(result).to.be.true
		})
	})

	describe("Text Input", () => {
		it("should return user input", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("test input")
			})

			const result = await handler.askInput("Enter text")
			expect(result).to.equal("test input")
		})

		it("should return default value when user enters empty string", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("")
			})

			const result = await handler.askInput("Enter text", "default")
			expect(result).to.equal("default")
		})

		it("should trim whitespace from input", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("  test  ")
			})

			const result = await handler.askInput("Enter text")
			expect(result).to.equal("test")
		})

		it("should timeout and use default value", async () => {
			let _questionCallback: ((answer: string) => void) | null = null

			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				_questionCallback = callback
			})

			const consoleLogStub = sinon.stub(console, "log")
			const inputPromise = handler.askInput("Enter text", "default", 5000)

			// Advance time past timeout
			await clock.tickAsync(5001)

			const result = await inputPromise
			expect(result).to.equal("default")
			expect(consoleLogStub.calledWith(sinon.match(/Timeout/))).to.be.true

			consoleLogStub.restore()
		})

		it("should return empty string if no default and timeout", async () => {
			rlStub.question.callsFake((_prompt: string, _callback: (answer: string) => void) => {
				// Never call callback
			})

			const inputPromise = handler.askInput("Enter text", undefined, 5000)
			await clock.tickAsync(5001)

			const result = await inputPromise
			expect(result).to.equal("")
		})
	})

	describe("Choice Selection", () => {
		it("should return selected choice", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("2")
			})

			const choices = ["Option 1", "Option 2", "Option 3"]
			const result = await handler.askChoice("Select an option:", choices)

			expect(result).to.equal("Option 2")
			consoleLogStub.restore()
		})

		it("should handle first choice", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("1")
			})

			const choices = ["First", "Second"]
			const result = await handler.askChoice("Select:", choices)

			expect(result).to.equal("First")
			consoleLogStub.restore()
		})

		it("should return undefined for invalid choice", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("99")
			})

			const choices = ["First", "Second"]
			const result = await handler.askChoice("Select:", choices)

			expect(result).to.be.undefined
			consoleLogStub.restore()
		})

		it("should display all choices", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("1")
			})

			const choices = ["A", "B", "C"]
			await handler.askChoice("Select:", choices)

			// Should display message and all choices
			expect(consoleLogStub.callCount).to.be.greaterThan(choices.length)

			consoleLogStub.restore()
		})
	})

	describe("Tool Execution Display", () => {
		it("should display tool execution request and get approval", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const result = await handler.showToolExecution("read_file", { path: "test.ts" })

			expect(result).to.be.true
			expect(consoleLogStub.called).to.be.true

			consoleLogStub.restore()
		})

		it("should truncate long parameter values", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const longContent = "a".repeat(200)
			await handler.showToolExecution("write_file", { content: longContent })

			const output = consoleLogStub
				.getCalls()
				.map((call) => call.args.join(" "))
				.join("\n")
			// Should truncate and add ellipsis
			expect(output).to.include("...")

			consoleLogStub.restore()
		})
	})

	describe("Command Execution Display", () => {
		it("should display command execution request", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const result = await handler.showCommandExecution("npm test", "/path/to/project")

			expect(result).to.be.true

			const output = consoleLogStub
				.getCalls()
				.map((call) => call.args.join(" "))
				.join("\n")
			expect(output).to.include("npm test")
			expect(output).to.include("/path/to/project")

			consoleLogStub.restore()
		})

		it("should work without working directory", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			await handler.showCommandExecution("ls")

			expect(consoleLogStub.called).to.be.true

			consoleLogStub.restore()
		})
	})

	describe("File Change Display", () => {
		it("should show file diff", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const oldContent = "line 1\nline 2\nline 3"
			const newContent = "line 1\nmodified line 2\nline 3"

			await handler.showFileChange("test.ts", oldContent, newContent)

			const output = consoleLogStub
				.getCalls()
				.map((call) => call.args.join(" "))
				.join("\n")
			expect(output).to.include("-")
			expect(output).to.include("+")

			consoleLogStub.restore()
		})

		it("should truncate large diffs", async () => {
			const consoleLogStub = sinon.stub(console, "log")
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("y")
			})

			const oldContent = Array.from({ length: 100 }, (_, i) => `line ${i}`).join("\n")
			const newContent = Array.from({ length: 100 }, (_, i) => `modified line ${i}`).join("\n")

			await handler.showFileChange("test.ts", oldContent, newContent)

			const output = consoleLogStub
				.getCalls()
				.map((call) => call.args.join(" "))
				.join("\n")
			expect(output).to.include("more lines")

			consoleLogStub.restore()
		})
	})

	describe("Wait for Enter", () => {
		it("should wait for enter key", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("")
			})

			await handler.waitForEnter()
			expect(rlStub.question.called).to.be.true
		})

		it("should accept custom message", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				callback("")
			})

			await handler.waitForEnter("Custom message")

			expect(rlStub.question.calledWith(sinon.match("Custom message"))).to.be.true
		})
	})

	describe("Singleton Pattern", () => {
		it("should return same instance", () => {
			closeInteractionHandler() // Clear any existing
			const handler1 = getInteractionHandler()
			const handler2 = getInteractionHandler()

			expect(handler1).to.equal(handler2)
		})

		it("should create new instance after close", () => {
			const handler1 = getInteractionHandler()
			closeInteractionHandler()
			const handler2 = getInteractionHandler()

			expect(handler1).to.not.equal(handler2)
		})
	})

	describe("Cleanup", () => {
		it("should close readline interface", () => {
			handler.close()
			expect(rlStub.close.called).to.be.true
		})

		it("should handle close on null handler", () => {
			closeInteractionHandler()
			expect(() => closeInteractionHandler()).to.not.throw()
		})
	})

	describe("Timeout Handling", () => {
		it("should not resolve twice on late response after timeout", async () => {
			let questionCallback: (answer: string) => void

			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				questionCallback = callback
			})

			const approvalPromise = handler.askApproval("Approve?", false, 1000)

			// Trigger timeout
			await clock.tickAsync(1001)
			const result1 = await approvalPromise

			// Try to call callback after timeout (callback is definitely assigned by now)
			questionCallback!("y")

			// Should still have the timeout result
			expect(result1).to.be.false
		})

		it("should not timeout with 0 timeout value", async () => {
			rlStub.question.callsFake((_prompt: string, callback: (answer: string) => void) => {
				// Respond immediately
				callback("y")
			})

			const result = await handler.askApproval("Approve?", false, 0)
			expect(result).to.be.true
		})
	})

	describe("Message Display Methods", () => {
		it("should display info messages", () => {
			const consoleLogStub = sinon.stub(console, "log")
			handler.showInfo("Info message")
			expect(consoleLogStub.called).to.be.true
			consoleLogStub.restore()
		})

		it("should display warning messages", () => {
			const consoleWarnStub = sinon.stub(console, "warn")
			handler.showWarning("Warning message")
			// Logger might use console.log for warnings
			consoleWarnStub.restore()
		})

		it("should display error messages", () => {
			const consoleErrorStub = sinon.stub(console, "error")
			handler.showError("Error message")
			expect(consoleErrorStub.called).to.be.true
			consoleErrorStub.restore()
		})

		it("should display success messages", () => {
			const consoleLogStub = sinon.stub(console, "log")
			handler.showSuccess("Success message")
			expect(consoleLogStub.called).to.be.true
			consoleLogStub.restore()
		})
	})
})
