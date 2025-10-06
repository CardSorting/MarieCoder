/**
 * JSX type declarations for template usage
 * This allows the template to compile without React dependencies
 */

declare global {
	namespace JSX {
		interface IntrinsicElements {
			[elemName: string]: any
		}
	}
}

export {}
