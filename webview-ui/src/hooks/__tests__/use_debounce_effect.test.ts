/**
 * Tests for useDebounceEffect hook
 */

import { renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useDebounceEffect } from "../use_debounce_effect"

describe("useDebounceEffect", () => {
	beforeEach(() => {
		vi.useFakeTimers()
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	it("should debounce effect execution", () => {
		const effect = vi.fn()
		renderHook(({ deps }) => useDebounceEffect(effect, 100, deps), {
			initialProps: { deps: [1] },
		})

		// Effect should not be called immediately
		expect(effect).not.toHaveBeenCalled()

		// Fast-forward time
		vi.advanceTimersByTime(100)

		// Effect should be called once
		expect(effect).toHaveBeenCalledTimes(1)
	})

	it("should cancel previous effect when deps change", () => {
		const effect = vi.fn()
		const { rerender } = renderHook(({ deps }) => useDebounceEffect(effect, 100, deps), {
			initialProps: { deps: [1] },
		})

		// Fast-forward 50ms
		vi.advanceTimersByTime(50)

		// Change deps
		rerender({ deps: [2] })

		// Fast-forward another 50ms (total 100ms from first render)
		vi.advanceTimersByTime(50)

		// Effect should not have been called yet
		expect(effect).not.toHaveBeenCalled()

		// Fast-forward another 50ms to complete the new debounce
		vi.advanceTimersByTime(50)

		// Effect should be called once
		expect(effect).toHaveBeenCalledTimes(1)
	})

	it("should use the latest effect function", () => {
		const effect1 = vi.fn()
		const effect2 = vi.fn()

		const { rerender } = renderHook(({ effect, deps }) => useDebounceEffect(effect, 100, deps), {
			initialProps: { effect: effect1, deps: [1] },
		})

		// Change the effect function (but not deps)
		rerender({ effect: effect2, deps: [1] })

		// Fast-forward time
		vi.advanceTimersByTime(100)

		// Only the latest effect should be called
		expect(effect1).not.toHaveBeenCalled()
		expect(effect2).toHaveBeenCalledTimes(1)
	})

	it("should handle multiple dependency changes", () => {
		const effect = vi.fn()
		const { rerender } = renderHook(({ deps }) => useDebounceEffect(effect, 100, deps), {
			initialProps: { deps: [1] },
		})

		// Change deps multiple times
		rerender({ deps: [2] })
		vi.advanceTimersByTime(30)

		rerender({ deps: [3] })
		vi.advanceTimersByTime(30)

		rerender({ deps: [4] })
		vi.advanceTimersByTime(30)

		// Effect should not have been called yet
		expect(effect).not.toHaveBeenCalled()

		// Fast-forward to complete the debounce
		vi.advanceTimersByTime(100)

		// Effect should be called once
		expect(effect).toHaveBeenCalledTimes(1)
	})

	it("should handle different delay values", () => {
		const effect = vi.fn()
		const { rerender } = renderHook(({ delay, deps }) => useDebounceEffect(effect, delay, deps), {
			initialProps: { delay: 100, deps: [1] },
		})

		vi.advanceTimersByTime(50)
		expect(effect).not.toHaveBeenCalled()

		// Change delay
		rerender({ delay: 200, deps: [1] })

		vi.advanceTimersByTime(100)
		expect(effect).not.toHaveBeenCalled()

		vi.advanceTimersByTime(100)
		expect(effect).toHaveBeenCalledTimes(1)
	})

	it("should cleanup on unmount", () => {
		const effect = vi.fn()
		const { unmount } = renderHook(() => useDebounceEffect(effect, 100, [1]))

		vi.advanceTimersByTime(50)

		// Unmount before effect executes
		unmount()

		vi.advanceTimersByTime(100)

		// Effect should not be called
		expect(effect).not.toHaveBeenCalled()
	})

	it("should work with zero delay", () => {
		const effect = vi.fn()
		renderHook(() => useDebounceEffect(effect, 0, [1]))

		expect(effect).not.toHaveBeenCalled()

		vi.advanceTimersByTime(0)

		expect(effect).toHaveBeenCalledTimes(1)
	})

	it("should handle array dependencies correctly", () => {
		const effect = vi.fn()
		const { rerender } = renderHook(({ deps }) => useDebounceEffect(effect, 100, deps), {
			initialProps: { deps: ["a", "b"] },
		})

		vi.advanceTimersByTime(100)
		expect(effect).toHaveBeenCalledTimes(1)

		// Change one dependency
		rerender({ deps: ["a", "c"] })

		vi.advanceTimersByTime(100)
		expect(effect).toHaveBeenCalledTimes(2)

		// Keep same dependencies
		rerender({ deps: ["a", "c"] })

		vi.advanceTimersByTime(100)
		// Should be called again because useEffect always runs on rerender
		expect(effect).toHaveBeenCalledTimes(3)
	})
})
