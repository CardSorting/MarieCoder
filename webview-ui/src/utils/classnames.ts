/**
 * Lightweight className utility to replace @heroui/react's cn function
 * Combines class names conditionally without requiring clsx/classnames dependency
 */

type ClassValue = string | number | boolean | undefined | null | ClassValue[]

/**
 * Combines class names, filtering out falsy values
 * Replaces: cn from @heroui/react (which is essentially clsx)
 */
export function cn(...classes: ClassValue[]): string {
	const result: string[] = []

	for (const cls of classes) {
		if (!cls) continue

		if (typeof cls === "string" || typeof cls === "number") {
			result.push(String(cls))
		} else if (Array.isArray(cls)) {
			const nested = cn(...cls)
			if (nested) result.push(nested)
		}
	}

	return result.join(" ")
}
