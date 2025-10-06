/**
 * Make Page Command
 * Creates new Next.js pages with proper structure and templates
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const makePageCommand: ArtisanCommand = {
	name: "make:page",
	description: "Create a new Next.js page",
	signature: "make:page <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the page (route path)",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "type",
			description: "Type of page (page, layout, loading, error, not-found)",
			type: "string",
			default: "page",
			alias: "t",
		},
		{
			name: "with-layout",
			description: "Include layout wrapper",
			type: "boolean",
			default: true,
		},
		{
			name: "with-metadata",
			description: "Include metadata export",
			type: "boolean",
			default: true,
		},
		{
			name: "with-server-actions",
			description: "Include server actions",
			type: "boolean",
			default: false,
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config = {
				name: args.name as string,
				type: options.type || "page",
				withLayout: options["with-layout"] !== false,
				withMetadata: options["with-metadata"] !== false,
				withServerActions: options["with-server-actions"] || false,
				withTests: options["with-tests"] !== false,
			}

			const result = await createPage(config)

			return {
				success: true,
				message: `Page "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create page "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createPage(config: any): Promise<{ files: string[] }> {
	const files: string[] = []
	const baseDir = process.cwd()

	// Determine page directory and file name
	const { pageDir, fileName } = getPagePath(config.name, config.type)
	const fullPath = path.join(baseDir, pageDir, fileName)

	// Ensure directory exists
	await fs.ensureDir(path.dirname(fullPath))

	// Generate page content
	const pageContent = generatePageContent(config)
	await fs.writeFile(fullPath, pageContent)
	files.push(fullPath)

	// Generate tests if requested
	if (config.withTests) {
		const testPath = path.join(baseDir, pageDir, `${config.name}.test.tsx`)
		const testContent = generateTestContent(config)
		await fs.writeFile(testPath, testContent)
		files.push(testPath)
	}

	return { files }
}

function getPagePath(name: string, type: string): { pageDir: string; fileName: string } {
	const routePath = name.startsWith("/") ? name.slice(1) : name

	// Handle different page types
	switch (type) {
		case "layout":
			return {
				pageDir: `src/app/${routePath}`,
				fileName: "layout.tsx",
			}
		case "loading":
			return {
				pageDir: `src/app/${routePath}`,
				fileName: "loading.tsx",
			}
		case "error":
			return {
				pageDir: `src/app/${routePath}`,
				fileName: "error.tsx",
			}
		case "not-found":
			return {
				pageDir: `src/app/${routePath}`,
				fileName: "not-found.tsx",
			}
		default:
			return {
				pageDir: `src/app/${routePath}`,
				fileName: "page.tsx",
			}
	}
}

function generatePageContent(config: any): string {
	const _pascalName = toPascalCase(config.name)
	const metadata = config.withMetadata ? generateMetadata(config) : ""
	const serverActions = config.withServerActions ? generateServerActions(config) : ""
	const layout = config.withLayout ? generateLayoutWrapper(config) : ""

	return `import React from 'react'${metadata ? "\n" + metadata : ""}${serverActions ? "\n" + serverActions : ""}

${generatePageComponent(config, layout)}
`
}

function generateMetadata(config: any): string {
	const pascalName = toPascalCase(config.name)

	return `export const metadata = {
  title: '${pascalName}',
  description: '${pascalName} page',
}`
}

function generateServerActions(_config: any): string {
	return `'use server'

export async function serverAction() {
  // Server action implementation
  console.log('Server action executed')
}`
}

function generateLayoutWrapper(_config: any): string {
	return `  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Page content */}
        </div>
      </div>
    </div>
  )`
}

function generatePageComponent(config: any, layout: string): string {
	const pascalName = toPascalCase(config.name)

	switch (config.type) {
		case "layout":
			return `export default function ${pascalName}Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="${pascalName.toLowerCase()}-layout">
      {children}
    </div>
  )
}`

		case "loading":
			return `export default function ${pascalName}Loading() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
    </div>
  )
}`

		case "error":
			return `'use client'

export default function ${pascalName}Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong!</h2>
        <button
          onClick={reset}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Try again
        </button>
      </div>
    </div>
  )
}`

		case "not-found":
			return `export default function ${pascalName}NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Not Found</h2>
        <p className="text-gray-600 mb-4">The page you're looking for doesn't exist.</p>
        <a
          href="/"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}`

		default:
			return `export default function ${pascalName}Page() {${
				layout ||
				`
  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900">${pascalName}</h1>
      <p className="mt-4 text-gray-600">Welcome to the ${pascalName} page!</p>
    </div>
  )`
			}
}`
	}
}

function generateTestContent(config: any): string {
	const pascalName = toPascalCase(config.name)

	return `import React from 'react'
import { render, screen } from '@testing-library/react'
import ${pascalName}${config.type === "layout" ? "Layout" : config.type === "loading" ? "Loading" : config.type === "error" ? "Error" : config.type === "not-found" ? "NotFound" : "Page"} from './${config.name}'

describe('${pascalName}${config.type === "layout" ? "Layout" : config.type === "loading" ? "Loading" : config.type === "error" ? "Error" : config.type === "not-found" ? "NotFound" : "Page"}', () => {
  it('renders without crashing', () => {
    render(<${pascalName}${config.type === "layout" ? "Layout" : config.type === "loading" ? "Loading" : config.type === "error" ? "Error" : config.type === "not-found" ? "NotFound" : "Page"} />)
  })

  it('displays the correct content', () => {
    render(<${pascalName}${config.type === "layout" ? "Layout" : config.type === "loading" ? "Loading" : config.type === "error" ? "Error" : config.type === "not-found" ? "NotFound" : "Page"} />)
    // Add specific assertions based on page type
  })
})
`
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s/]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
