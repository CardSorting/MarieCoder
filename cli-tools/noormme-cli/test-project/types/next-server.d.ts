/**
 * Next.js Server Types
 * Type declarations for Next.js server-side functionality
 */

declare module "next/server" {
	export interface NextRequest extends Request {
		nextUrl: URL
		cookies: {
			get: (name: string) => { name: string; value: string } | undefined
			set: (name: string, value: string, options?: any) => void
			delete: (name: string, options?: any) => void
			has: (name: string) => boolean
			clear: () => void
			toString: () => string
		}
		geo: {
			city?: string
			country?: string
			region?: string
			latitude?: string
			longitude?: string
		}
		ip?: string
		ua?: string
	}

	export class NextResponse extends Response {
		static json(body: any, init?: ResponseInit): NextResponse
		static redirect(url: string | URL, status?: number): NextResponse
		static rewrite(url: string | URL): NextResponse
		static next(): NextResponse
	}

	export interface RouteParams {
		params: Record<string, string>
	}

	export interface RouteContext {
		params: Record<string, string>
		searchParams: URLSearchParams
	}
}
