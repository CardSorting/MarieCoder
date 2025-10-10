/**
 * Deep equality comparison utility
 * Replaces fast-deep-equal package (10KB) with zero-dependency implementation
 *
 * Performs deep comparison of two values including:
 * - Primitives (string, number, boolean, null, undefined)
 * - Objects (plain objects and arrays)
 * - Dates
 * - RegExp
 *
 * @param a - First value to compare
 * @param b - Second value to compare
 * @returns true if values are deeply equal, false otherwise
 */
export function deepEqual(a: any, b: any): boolean {
	// Same reference or primitive equality
	if (a === b) {
		return true
	}

	// Handle null and undefined
	if (a == null || b == null) {
		return a === b
	}

	// Different types
	if (typeof a !== typeof b) {
		return false
	}

	// Handle Date objects
	if (a instanceof Date && b instanceof Date) {
		return a.getTime() === b.getTime()
	}

	// Handle RegExp objects
	if (a instanceof RegExp && b instanceof RegExp) {
		return a.toString() === b.toString()
	}

	// Non-object types (already checked === above, but this covers edge cases)
	if (typeof a !== "object") {
		return false
	}

	// Handle arrays
	if (Array.isArray(a)) {
		if (!Array.isArray(b) || a.length !== b.length) {
			return false
		}

		for (let i = 0; i < a.length; i++) {
			if (!deepEqual(a[i], b[i])) {
				return false
			}
		}

		return true
	}

	// Handle plain objects
	const keysA = Object.keys(a)
	const keysB = Object.keys(b)

	if (keysA.length !== keysB.length) {
		return false
	}

	// Check if all keys in a exist in b and have equal values
	for (const key of keysA) {
		if (!Object.hasOwn(b, key)) {
			return false
		}

		if (!deepEqual(a[key], b[key])) {
			return false
		}
	}

	return true
}

/**
 * Default export for drop-in replacement compatibility with fast-deep-equal
 */
export default deepEqual
