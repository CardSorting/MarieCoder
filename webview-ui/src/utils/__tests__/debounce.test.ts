/**
 * Tests for debounce utility
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { debounce } from "../debounce"

describe("debounce", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should debounce function calls", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 100)

		debouncedFunc()
		debouncedFunc()
		debouncedFunc()

		// Function should not be called immediately
		expect(func).not.toHaveBeenCalled()

		// Fast-forward time
		vi.advanceTimersByTime(100)

		// Function should be called once
		expect(func).toHaveBeenCalledTimes(1)
	})

	it("should pass arguments correctly", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 100)

		debouncedFunc("arg1", "arg2", 123)

		vi.advanceTimersByTime(100)

		expect(func).toHaveBeenCalledWith("arg1", "arg2", 123)
	})

	it("should cancel previous call when called again", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 100)

		debouncedFunc("first")
		vi.advanceTimersByTime(50)

		debouncedFunc("second")
		vi.advanceTimersByTime(50)

		// First call should be cancelled
		expect(func).not.toHaveBeenCalled()

		vi.advanceTimersByTime(50)

		// Only second call should execute
		expect(func).toHaveBeenCalledTimes(1)
		expect(func).toHaveBeenCalledWith("second")
	})

	it("should handle multiple sequences of calls", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 100)

		// First sequence
		debouncedFunc("call1")
		vi.advanceTimersByTime(100)

		expect(func).toHaveBeenCalledTimes(1)
		expect(func).toHaveBeenLastCalledWith("call1")

		// Second sequence
		debouncedFunc("call2")
		vi.advanceTimersByTime(100)

		expect(func).toHaveBeenCalledTimes(2)
		expect(func).toHaveBeenLastCalledWith("call2")
	})

	it("should handle rapid calls correctly", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 100)

		// Rapid calls
		for (let i = 0; i < 10; i++) {
			debouncedFunc(i)
			vi.advanceTimersByTime(10)
		}

		// Should not have been called yet
		expect(func).not.toHaveBeenCalled()

		// Wait for debounce to complete
		vi.advanceTimersByTime(100)

		// Should be called once with last value
		expect(func).toHaveBeenCalledTimes(1)
		expect(func).toHaveBeenCalledWith(9)
	})

	it("should work with different wait times", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 500)

		debouncedFunc()

		vi.advanceTimersByTime(400)
		expect(func).not.toHaveBeenCalled()

		vi.advanceTimersByTime(100)
		expect(func).toHaveBeenCalledTimes(1)
	})

	it("should handle zero wait time", () => {
		const func = vi.fn()
		const debouncedFunc = debounce(func, 0)

		debouncedFunc()

		expect(func).not.toHaveBeenCalled()

		vi.advanceTimersByTime(0)

		expect(func).toHaveBeenCalledTimes(1)
	})
})
