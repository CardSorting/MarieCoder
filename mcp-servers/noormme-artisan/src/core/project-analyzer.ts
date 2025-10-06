/**
 * Project Analyzer for NOORMME Artisan
 * Analyzes the current project structure to provide context-aware commands
 */

import fs from "fs-extra"
import path from "path"
import { ProjectStructure } from "../types.js"

export class ProjectAnalyzer {
	private projectPath: string

	constructor(projectPath: string) {
		this.projectPath = projectPath
	}

	/**
	 * Analyze the current project structure
	 */
	async analyze(): Promise<ProjectStructure> {
		const structure: ProjectStructure = {
			projectPath: this.projectPath,
			hasNextjs: false,
			hasDatabase: false,
			hasAuth: false,
			hasAdmin: false,
			components: [],
			services: [],
			repositories: [],
			pages: [],
			apiRoutes: [],
		}

		try {
			// Check for Next.js project
			structure.hasNextjs = await this.checkNextjsProject()

			if (structure.hasNextjs) {
				// Analyze project structure
				structure.hasDatabase = await this.checkDatabaseSetup()
				structure.hasAuth = await this.checkAuthSetup()
				structure.hasAdmin = await this.checkAdminSetup()

				// Get component files
				structure.components = await this.getComponents()
				structure.services = await this.getServices()
				structure.repositories = await this.getRepositories()
				structure.pages = await this.getPages()
				structure.apiRoutes = await this.getApiRoutes()
			}
		} catch (error) {
			console.warn("Error analyzing project structure:", error)
		}

		return structure
	}

	/**
	 * Check if this is a Next.js project
	 */
	private async checkNextjsProject(): Promise<boolean> {
		try {
			const packageJsonPath = path.join(this.projectPath, "package.json")

			if (!(await fs.pathExists(packageJsonPath))) {
				return false
			}

			const packageJson = await fs.readJson(packageJsonPath)
			return !!(packageJson.dependencies?.next || packageJson.devDependencies?.next)
		} catch {
			return false
		}
	}

	/**
	 * Check if database is set up
	 */
	private async checkDatabaseSetup(): Promise<boolean> {
		try {
			// Check for database files
			const dbFiles = [
				path.join(this.projectPath, "src/lib/db.ts"),
				path.join(this.projectPath, "lib/db.ts"),
				path.join(this.projectPath, "database.sqlite"),
				path.join(this.projectPath, "app.db"),
			]

			for (const dbFile of dbFiles) {
				if (await fs.pathExists(dbFile)) {
					return true
				}
			}

			// Check package.json for database dependencies
			const packageJsonPath = path.join(this.projectPath, "package.json")
			if (await fs.pathExists(packageJsonPath)) {
				const packageJson = await fs.readJson(packageJsonPath)
				const dbDeps = ["kysely", "sqlite3", "better-sqlite3", "noormme"]

				for (const dep of dbDeps) {
					if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
						return true
					}
				}
			}

			return false
		} catch {
			return false
		}
	}

	/**
	 * Check if authentication is set up
	 */
	private async checkAuthSetup(): Promise<boolean> {
		try {
			// Check for auth files
			const authFiles = [
				path.join(this.projectPath, "src/lib/auth.ts"),
				path.join(this.projectPath, "lib/auth.ts"),
				path.join(this.projectPath, "src/app/api/auth"),
				path.join(this.projectPath, "app/api/auth"),
			]

			for (const authFile of authFiles) {
				if (await fs.pathExists(authFile)) {
					return true
				}
			}

			// Check for NextAuth in package.json
			const packageJsonPath = path.join(this.projectPath, "package.json")
			if (await fs.pathExists(packageJsonPath)) {
				const packageJson = await fs.readJson(packageJsonPath)
				return !!(packageJson.dependencies?.["next-auth"] || packageJson.devDependencies?.["next-auth"])
			}

			return false
		} catch {
			return false
		}
	}

	/**
	 * Check if admin panel is set up
	 */
	private async checkAdminSetup(): Promise<boolean> {
		try {
			const adminFiles = [
				path.join(this.projectPath, "src/app/admin"),
				path.join(this.projectPath, "app/admin"),
				path.join(this.projectPath, "src/components/admin"),
				path.join(this.projectPath, "components/admin"),
			]

			for (const adminFile of adminFiles) {
				if (await fs.pathExists(adminFile)) {
					return true
				}
			}

			return false
		} catch {
			return false
		}
	}

	/**
	 * Get all component files
	 */
	private async getComponents(): Promise<string[]> {
		try {
			const componentDirs = [path.join(this.projectPath, "src/components"), path.join(this.projectPath, "components")]

			const components: string[] = []

			for (const dir of componentDirs) {
				if (await fs.pathExists(dir)) {
					const files = await this.getFilesRecursively(dir, [".tsx", ".jsx"])
					components.push(...files.map((file) => path.relative(this.projectPath, file)))
				}
			}

			return components
		} catch {
			return []
		}
	}

	/**
	 * Get all service files
	 */
	private async getServices(): Promise<string[]> {
		try {
			const serviceDirs = [
				path.join(this.projectPath, "src/lib/services"),
				path.join(this.projectPath, "lib/services"),
				path.join(this.projectPath, "src/services"),
				path.join(this.projectPath, "services"),
			]

			const services: string[] = []

			for (const dir of serviceDirs) {
				if (await fs.pathExists(dir)) {
					const files = await this.getFilesRecursively(dir, [".ts", ".js"])
					services.push(...files.map((file) => path.relative(this.projectPath, file)))
				}
			}

			return services
		} catch {
			return []
		}
	}

	/**
	 * Get all repository files
	 */
	private async getRepositories(): Promise<string[]> {
		try {
			const repoDirs = [
				path.join(this.projectPath, "src/lib/repositories"),
				path.join(this.projectPath, "lib/repositories"),
				path.join(this.projectPath, "src/repositories"),
				path.join(this.projectPath, "repositories"),
			]

			const repositories: string[] = []

			for (const dir of repoDirs) {
				if (await fs.pathExists(dir)) {
					const files = await this.getFilesRecursively(dir, [".ts", ".js"])
					repositories.push(...files.map((file) => path.relative(this.projectPath, file)))
				}
			}

			return repositories
		} catch {
			return []
		}
	}

	/**
	 * Get all page files
	 */
	private async getPages(): Promise<string[]> {
		try {
			const pageDirs = [
				path.join(this.projectPath, "src/app"),
				path.join(this.projectPath, "app"),
				path.join(this.projectPath, "pages"),
			]

			const pages: string[] = []

			for (const dir of pageDirs) {
				if (await fs.pathExists(dir)) {
					const files = await this.getFilesRecursively(dir, ["page.tsx", "page.jsx", ".tsx", ".jsx"])
					pages.push(...files.map((file) => path.relative(this.projectPath, file)))
				}
			}

			return pages
		} catch {
			return []
		}
	}

	/**
	 * Get all API route files
	 */
	private async getApiRoutes(): Promise<string[]> {
		try {
			const apiDirs = [
				path.join(this.projectPath, "src/app/api"),
				path.join(this.projectPath, "app/api"),
				path.join(this.projectPath, "pages/api"),
			]

			const apiRoutes: string[] = []

			for (const dir of apiDirs) {
				if (await fs.pathExists(dir)) {
					const files = await this.getFilesRecursively(dir, ["route.ts", "route.js", ".ts", ".js"])
					apiRoutes.push(...files.map((file) => path.relative(this.projectPath, file)))
				}
			}

			return apiRoutes
		} catch {
			return []
		}
	}

	/**
	 * Get files recursively with specific extensions
	 */
	private async getFilesRecursively(dir: string, extensions: string[]): Promise<string[]> {
		const files: string[] = []

		try {
			const entries = await fs.readdir(dir, { withFileTypes: true })

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name)

				if (entry.isDirectory()) {
					const subFiles = await this.getFilesRecursively(fullPath, extensions)
					files.push(...subFiles)
				} else if (entry.isFile()) {
					const ext = path.extname(entry.name)
					if (extensions.some((e) => entry.name.endsWith(e) || ext === e)) {
						files.push(fullPath)
					}
				}
			}
		} catch (_error) {
			// Ignore errors and continue
		}

		return files
	}

	/**
	 * Get project configuration
	 */
	async getProjectConfig(): Promise<any> {
		try {
			const packageJsonPath = path.join(this.projectPath, "package.json")

			if (await fs.pathExists(packageJsonPath)) {
				return await fs.readJson(packageJsonPath)
			}
		} catch {
			// Ignore errors
		}

		return null
	}
}
