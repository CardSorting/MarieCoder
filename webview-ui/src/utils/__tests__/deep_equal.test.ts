/**
 * Tests for deep equality utility
 */

import { describe, expect, it } from "vitest"
import { deepEqual } from "../deep_equal"

describe("deepEqual", () => {
	describe("Primitives", () => {
		it("should return true for equal numbers", () => {
			expect(deepEqual(1, 1)).toBe(true)
			expect(deepEqual(0, 0)).toBe(true)
			expect(deepEqual(-1, -1)).toBe(true)
		})

		it("should return false for different numbers", () => {
			expect(deepEqual(1, 2)).toBe(false)
			expect(deepEqual(0, 1)).toBe(false)
		})

		it("should return true for equal strings", () => {
			expect(deepEqual("hello", "hello")).toBe(true)
			expect(deepEqual("", "")).toBe(true)
		})

		it("should return false for different strings", () => {
			expect(deepEqual("hello", "world")).toBe(false)
		})

		it("should return true for equal booleans", () => {
			expect(deepEqual(true, true)).toBe(true)
			expect(deepEqual(false, false)).toBe(true)
		})

		it("should return false for different booleans", () => {
			expect(deepEqual(true, false)).toBe(false)
		})

		it("should handle null and undefined", () => {
			expect(deepEqual(null, null)).toBe(true)
			expect(deepEqual(undefined, undefined)).toBe(true)
			expect(deepEqual(null, undefined)).toBe(false)
			expect(deepEqual(null, 0)).toBe(false)
			expect(deepEqual(undefined, 0)).toBe(false)
		})
	})

	describe("Arrays", () => {
		it("should return true for equal arrays", () => {
			expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true)
			expect(deepEqual([], [])).toBe(true)
		})

		it("should return false for different arrays", () => {
			expect(deepEqual([1, 2, 3], [1, 2, 4])).toBe(false)
			expect(deepEqual([1, 2], [1, 2, 3])).toBe(false)
		})

		it("should handle nested arrays", () => {
			expect(deepEqual([1, [2, 3]], [1, [2, 3]])).toBe(true)
			expect(deepEqual([1, [2, 3]], [1, [2, 4]])).toBe(false)
		})

		it("should handle arrays with objects", () => {
			expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 2 }])).toBe(true)
			expect(deepEqual([{ a: 1 }, { b: 2 }], [{ a: 1 }, { b: 3 }])).toBe(false)
		})
	})

	describe("Objects", () => {
		it("should return true for equal objects", () => {
			expect(deepEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true)
			expect(deepEqual({}, {})).toBe(true)
		})

		it("should return false for different objects", () => {
			expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false)
			expect(deepEqual({ a: 1 }, { b: 1 })).toBe(false)
		})

		it("should handle nested objects", () => {
			expect(deepEqual({ a: { b: 1 } }, { a: { b: 1 } })).toBe(true)
			expect(deepEqual({ a: { b: 1 } }, { a: { b: 2 } })).toBe(false)
		})

		it("should handle objects with different key counts", () => {
			expect(deepEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false)
		})

		it("should handle objects with different key order", () => {
			expect(deepEqual({ a: 1, b: 2 }, { b: 2, a: 1 })).toBe(true)
		})
	})

	describe("Dates", () => {
		it("should return true for equal dates", () => {
			const date1 = new Date("2023-01-01")
			const date2 = new Date("2023-01-01")
			expect(deepEqual(date1, date2)).toBe(true)
		})

		it("should return false for different dates", () => {
			const date1 = new Date("2023-01-01")
			const date2 = new Date("2023-01-02")
			expect(deepEqual(date1, date2)).toBe(false)
		})
	})

	describe("RegExp", () => {
		it("should return true for equal regexes", () => {
			expect(deepEqual(/test/, /test/)).toBe(true)
			expect(deepEqual(/test/gi, /test/gi)).toBe(true)
		})

		it("should return false for different regexes", () => {
			expect(deepEqual(/test/, /test2/)).toBe(false)
			expect(deepEqual(/test/i, /test/g)).toBe(false)
		})
	})

	describe("Complex structures", () => {
		it("should handle complex nested structures", () => {
			const obj1 = {
				name: "test",
				age: 25,
				address: {
					street: "123 Main St",
					city: "New York",
				},
				hobbies: ["reading", "coding"],
			}
			const obj2 = {
				name: "test",
				age: 25,
				address: {
					street: "123 Main St",
					city: "New York",
				},
				hobbies: ["reading", "coding"],
			}
			expect(deepEqual(obj1, obj2)).toBe(true)
		})

		it("should detect differences in complex structures", () => {
			const obj1 = {
				name: "test",
				address: {
					street: "123 Main St",
					city: "New York",
				},
			}
			const obj2 = {
				name: "test",
				address: {
					street: "456 Main St",
					city: "New York",
				},
			}
			expect(deepEqual(obj1, obj2)).toBe(false)
		})
	})

	describe("Edge cases", () => {
		it("should handle comparing with non-objects", () => {
			expect(deepEqual({}, null)).toBe(false)
			expect(deepEqual([], null)).toBe(false)
			expect(deepEqual(1, {})).toBe(false)
		})

		it("should handle same reference", () => {
			const obj = { a: 1 }
			expect(deepEqual(obj, obj)).toBe(true)
		})

		it("should handle different types", () => {
			expect(deepEqual("1", 1)).toBe(false)
			expect(deepEqual([], {})).toBe(false)
		})

		it("should handle NaN", () => {
			// NaN is not equal to itself in JavaScript
			expect(deepEqual(NaN, NaN)).toBe(false)
		})
	})
})
