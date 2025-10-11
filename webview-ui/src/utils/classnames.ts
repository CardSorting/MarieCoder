/**
 * Lightweight className utility to replace @heroui/react's cn function
 * Combines class names conditionally without requiring clsx/classnames dependency
 */

type ClassValue = string | number | boolean | undefined | null | ClassRecord | ClassValue[]
type ClassRecord = Record<string, boolean | undefined | null>

/**
 * Combines class names, filtering out falsy values
 * Replaces: cn from @heroui/react (which is essentially clsx)
 *
 * Supports:
 * - Strings: cn('foo', 'bar') => 'foo bar'
 * - Objects: cn({ foo: true, bar: false }) => 'foo'
 * - Arrays: cn(['foo', { bar: true }]) => 'foo bar'
 * - Mixed: cn('foo', { bar: true }, ['baz']) => 'foo bar baz'
 */
export function cn(...classes: ClassValue[]): string {
	const result: string[] = []

	for (const cls of classes) {
		if (!cls) {
			continue
		}

		if (typeof cls === "string" || typeof cls === "number") {
			result.push(String(cls))
		} else if (Array.isArray(cls)) {
			const nested = cn(...cls)
			if (nested) {
				result.push(nested)
			}
		} else if (typeof cls === "object") {
			for (const [key, value] of Object.entries(cls)) {
				if (value) {
					result.push(key)
				}
			}
		}
	}

	return result.join(" ")
}
