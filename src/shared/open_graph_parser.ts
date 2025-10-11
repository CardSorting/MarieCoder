import { parseHTML } from "linkedom"

export interface OpenGraphData {
	title?: string
	description?: string
	image?: string
	url?: string
	siteName?: string
	type?: string
}

/**
 * Fetches Open Graph metadata from a URL using lightweight parsing
 * Replaces open-graph-scraper with custom implementation using fetch + linkedom
 *
 * @param url The URL to fetch metadata from
 * @returns Promise resolving to OpenGraphData
 */
export async function fetchOpenGraphData(url: string): Promise<OpenGraphData> {
	try {
		// Fetch HTML with timeout using native fetch
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 5000)

		const response = await fetch(url, {
			headers: {
				"user-agent": "Mozilla/5.0 (compatible; VSCodeExtension/1.0; +https://cline.bot)",
			},
			signal: controller.signal,
		})
		clearTimeout(timeoutId)

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}

		const html = await response.text()

		// Parse HTML using linkedom (lightweight DOM parser)
		const { document } = parseHTML(html)

		// Helper to extract meta tag content
		const getMeta = (property: string): string | undefined => {
			// Try Open Graph property first, then name attribute
			const ogMeta = document.querySelector(`meta[property="${property}"]`)
			const nameMeta = document.querySelector(`meta[name="${property}"]`)
			return ogMeta?.getAttribute("content") || nameMeta?.getAttribute("content") || undefined
		}

		// Extract and process image URL
		const getImage = (): string | undefined => {
			let imageUrl = getMeta("og:image") || getMeta("twitter:image")

			// Make relative URLs absolute
			if (imageUrl && (imageUrl.startsWith("/") || imageUrl.startsWith("./"))) {
				try {
					const urlObj = new URL(url)
					const baseUrl = `${urlObj.protocol}//${urlObj.hostname}`
					imageUrl = new URL(imageUrl, baseUrl).href
				} catch (error) {
					console.error(`Error converting relative URL to absolute: ${imageUrl}`, error)
				}
			}

			return imageUrl
		}

		// Extract title with fallbacks
		const title =
			getMeta("og:title") ||
			getMeta("twitter:title") ||
			getMeta("dc:title") ||
			document.querySelector("title")?.textContent ||
			new URL(url).hostname

		// Extract description with fallbacks
		const description =
			getMeta("og:description") ||
			getMeta("twitter:description") ||
			getMeta("dc:description") ||
			getMeta("description") ||
			"No description available"

		// Extract other metadata
		const siteName = getMeta("og:site_name") || new URL(url).hostname
		const ogUrl = getMeta("og:url") || url
		const type = getMeta("og:type")

		return {
			title,
			description,
			image: getImage(),
			url: ogUrl,
			siteName,
			type,
		}
	} catch (_error) {
		// Fallback: Return basic information based on the URL
		try {
			const urlObj = new URL(url)
			return {
				title: urlObj.hostname,
				description: url,
				url: url,
				siteName: urlObj.hostname,
			}
		} catch {
			return {
				title: url,
				description: url,
				url: url,
			}
		}
	}
}

/**
 * Checks if a URL is an image by making a HEAD request and checking the content type
 * @param url The URL to check
 * @returns Promise resolving to boolean indicating if the URL is an image
 */
export async function detectImageUrl(url: string): Promise<boolean> {
	try {
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), 3000)

		const response = await fetch(url, {
			method: "HEAD",
			headers: {
				"User-Agent": "Mozilla/5.0 (compatible; VSCodeExtension/1.0; +https://cline.bot)",
			},
			signal: controller.signal,
		})
		clearTimeout(timeoutId)

		const contentType = response.headers.get("content-type")
		return contentType !== null && contentType.startsWith("image/")
	} catch (_error) {
		// If we can't determine, fall back to checking the file extension
		return /\.(jpg|jpeg|png|gif|webp|bmp|svg|tiff|tif|avif)$/i.test(url)
	}
}
