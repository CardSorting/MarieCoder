/**
 * Template Loader for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, efficient template loading and caching
 */

export class TemplateLoader {
	private templateCache: Map<string, string> = new Map()

	/**
	 * Load template content with caching
	 */
	async loadTemplate(templatePath: string): Promise<string> {
		// Check cache first
		if (this.templateCache.has(templatePath)) {
			return this.templateCache.get(templatePath)!
		}

		// Load from embedded templates
		const content = this.getEmbeddedTemplate(templatePath)

		// Cache the template
		this.templateCache.set(templatePath, content)

		return content
	}

	/**
	 * Load template group (multiple related templates)
	 */
	async loadTemplateGroup(groupPath: string): Promise<string[]> {
		const templatePaths = this.getEmbeddedTemplateGroup(groupPath)
		const templates: string[] = []

		for (const templatePath of templatePaths) {
			templates.push(await this.loadTemplate(templatePath))
		}

		return templates
	}

	/**
	 * Get embedded template content
	 */
	private getEmbeddedTemplate(templatePath: string): string {
		// This would normally load from embedded templates
		// For now, return a placeholder that indicates the template type
		return `<!-- Template: ${templatePath} -->\n<!-- This would contain the actual template content -->`
	}

	/**
	 * Get embedded template group
	 */
	private getEmbeddedTemplateGroup(groupPath: string): string[] {
		// This would normally return a list of template paths for the group
		// For now, return placeholder paths
		switch (groupPath) {
			case "nextjs-basic":
				return [
					"package.json",
					"tsconfig.json",
					"next.config.js",
					"tailwind.config.js",
					"postcss.config.js",
					".env.example",
					".gitignore",
					"README.md",
				]
			case "nextjs-auth":
				return ["nextjs-basic", "auth/middleware.ts", "auth/providers.ts", "auth/types.ts"]
			case "nextjs-admin":
				return ["nextjs-auth", "admin/layout.tsx", "admin/dashboard.tsx", "admin/users.tsx"]
			default:
				return []
		}
	}

	/**
	 * Clear template cache
	 */
	clearCache(): void {
		this.templateCache.clear()
	}

	/**
	 * Get cache statistics
	 */
	getCacheStats(): { size: number; keys: string[] } {
		return {
			size: this.templateCache.size,
			keys: Array.from(this.templateCache.keys()),
		}
	}
}
