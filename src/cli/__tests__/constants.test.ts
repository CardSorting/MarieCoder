/**
 * Tests for CLI Constants
 */

import { expect } from "chai"
import { describe, it } from "mocha"
import {
	API_LIMITS,
	FORMATTING,
	HISTORY,
	MODEL_DEFAULTS,
	OUTPUT_LIMITS,
	RATE_LIMIT_WINDOWS,
	RETRY,
	STREAMING,
	TIMEOUTS,
} from "../core/constants"

describe("CLI Constants", () => {
	describe("TIMEOUTS", () => {
		it("should export all timeout constants", () => {
			expect(TIMEOUTS.APPROVAL_REQUEST).to.equal(5 * 60 * 1000)
			expect(TIMEOUTS.USER_INPUT).to.equal(5 * 60 * 1000)
			expect(TIMEOUTS.SHELL_INTEGRATION).to.equal(30 * 1000)
			expect(TIMEOUTS.CONNECTION_POOL_QUEUE).to.equal(30 * 1000)
			expect(TIMEOUTS.TASK_CHECK_INTERVAL).to.equal(500)
			expect(TIMEOUTS.MESSAGE_CHECK_INTERVAL).to.equal(100)
		})
	})

	describe("OUTPUT_LIMITS", () => {
		it("should export all output limit constants", () => {
			expect(OUTPUT_LIMITS.DEFAULT_LINE_LIMIT).to.equal(500)
			expect(OUTPUT_LIMITS.MAX_PARTIAL_LENGTH).to.equal(500)
			expect(OUTPUT_LIMITS.FILE_CHANGE_PREVIEW_LINES).to.equal(50)
			expect(OUTPUT_LIMITS.FILE_CHANGE_MIN_LINES).to.equal(20)
			expect(OUTPUT_LIMITS.TOOL_PARAM_MAX_LENGTH).to.equal(100)
			expect(OUTPUT_LIMITS.DEFAULT_TERMINAL_WIDTH).to.equal(80)
			expect(OUTPUT_LIMITS.BOX_CONTENT_WIDTH).to.equal(76)
		})
	})

	describe("STREAMING", () => {
		it("should export all streaming constants", () => {
			expect(STREAMING.THROTTLE_MS).to.equal(100)
			expect(STREAMING.SPINNER_FRAME_DURATION).to.equal(80)
			expect(STREAMING.PROGRESS_BAR_THROTTLE).to.equal(100)
		})
	})

	describe("API_LIMITS", () => {
		it("should export all API limit constants", () => {
			expect(API_LIMITS.MAX_CONCURRENT_REQUESTS).to.equal(10)
			expect(API_LIMITS.REQUESTS_PER_MINUTE).to.equal(60)
			expect(API_LIMITS.REQUESTS_PER_SECOND).to.equal(10)
			expect(API_LIMITS.DEDUPLICATION_TTL).to.equal(60 * 1000)
		})
	})

	describe("MODEL_DEFAULTS", () => {
		it("should export model default constants", () => {
			expect(MODEL_DEFAULTS.TEMPERATURE).to.equal(0.0)
			expect(MODEL_DEFAULTS.MAX_TOKENS).to.be.undefined
		})
	})

	describe("HISTORY", () => {
		it("should export history constants", () => {
			expect(HISTORY.TASK_HISTORY_LIMIT).to.equal(100)
			expect(HISTORY.SECRETS_FILE_MODE).to.equal(0o600)
		})
	})

	describe("FORMATTING", () => {
		it("should export formatting constants", () => {
			expect(FORMATTING.SEPARATOR_CHAR).to.equal("─")
			expect(FORMATTING.SEPARATOR_LENGTH).to.equal(80)
			expect(FORMATTING.PROGRESS_BAR_WIDTH).to.equal(40)
			expect(FORMATTING.THINKING_PREVIEW_LENGTH).to.equal(70)
			expect(FORMATTING.DIFF_CONTEXT_LINES).to.equal(3)
		})
	})

	describe("RATE_LIMIT_WINDOWS", () => {
		it("should export rate limit window constants", () => {
			expect(RATE_LIMIT_WINDOWS.ONE_SECOND).to.equal(1000)
			expect(RATE_LIMIT_WINDOWS.ONE_MINUTE).to.equal(60 * 1000)
		})
	})

	describe("RETRY", () => {
		it("should export retry constants", () => {
			expect(RETRY.POLLING_INTERVAL).to.equal(100)
			expect(RETRY.SHUTDOWN_CHECK_INTERVAL).to.equal(100)
		})
	})
})
