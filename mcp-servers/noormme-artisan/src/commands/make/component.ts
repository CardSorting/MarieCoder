/**
 * Make Component Command
 * Creates new React components with proper structure and templates
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult, ComponentConfig } from "../../types.js"

export const makeComponentCommand: ArtisanCommand = {
	name: "make:component",
	description: "Create a new React component",
	signature: "make:component <name> [options]",
	arguments: [
		{
			name: "name",
			description: "Name of the component",
			type: "string",
			required: true,
		},
	],
	options: [
		{
			name: "type",
			description: "Type of component (ui, page, layout, feature, admin, auth)",
			type: "string",
			default: "ui",
			alias: "t",
		},
		{
			name: "path",
			description: "Custom path for the component",
			type: "string",
			alias: "p",
		},
		{
			name: "with-styles",
			description: "Include CSS module styles",
			type: "boolean",
			default: false,
		},
		{
			name: "with-tests",
			description: "Include test file",
			type: "boolean",
			default: true,
		},
		{
			name: "with-story",
			description: "Include Storybook story",
			type: "boolean",
			default: false,
		},
		{
			name: "with-props",
			description: "Include props interface",
			type: "boolean",
			default: true,
		},
	],
	handler: async (args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config: ComponentConfig = {
				name: args.name as string,
				type: options.type || "ui",
				path: options.path as string,
				withStyles: options["with-styles"] || false,
				withTests: options["with-tests"] !== false,
				withStory: options["with-story"] || false,
				withProps: options["with-props"] !== false,
			}

			const result = await createComponent(config)

			return {
				success: true,
				message: `Component "${config.name}" created successfully`,
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: `Failed to create component "${args.name}"`,
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function createComponent(config: ComponentConfig): Promise<{ files: string[] }> {
	const files: string[] = []

	// Determine component directory
	const componentDir = getComponentDirectory(config)
	const componentPath = path.join(componentDir, `${config.name}.tsx`)

	// Ensure directory exists
	await fs.ensureDir(path.dirname(componentPath))

	// Generate component content
	const componentContent = generateComponentContent(config)
	await fs.writeFile(componentPath, componentContent)
	files.push(componentPath)

	// Generate styles if requested
	if (config.withStyles) {
		const stylesPath = path.join(componentDir, `${config.name}.module.css`)
		const stylesContent = generateStylesContent(config)
		await fs.writeFile(stylesPath, stylesContent)
		files.push(stylesPath)
	}

	// Generate tests if requested
	if (config.withTests) {
		const testPath = path.join(componentDir, `${config.name}.test.tsx`)
		const testContent = generateTestContent(config)
		await fs.writeFile(testPath, testContent)
		files.push(testPath)
	}

	// Generate story if requested
	if (config.withStory) {
		const storyPath = path.join(componentDir, `${config.name}.stories.tsx`)
		const storyContent = generateStoryContent(config)
		await fs.writeFile(storyPath, storyContent)
		files.push(storyPath)
	}

	return { files }
}

function getComponentDirectory(config: ComponentConfig): string {
	const baseDir = process.cwd()

	if (config.path) {
		return path.join(baseDir, config.path)
	}

	// Default component directories based on type
	const typeDirectories = {
		ui: "src/components/ui",
		page: "src/app",
		layout: "src/app",
		feature: "src/components/features",
		admin: "src/components/admin",
		auth: "src/components/auth",
	}

	const directory = typeDirectories[config.type as keyof typeof typeDirectories] || "src/components"
	return path.join(baseDir, directory)
}

function generateComponentContent(config: ComponentConfig): string {
	const pascalName = toPascalCase(config.name)
	const stylesImport = config.withStyles ? `import styles from './${config.name}.module.css'\n` : ""
	const propsInterface = config.withProps ? `\ninterface ${pascalName}Props {\n  // Add props here\n}\n` : ""
	const propsType = config.withProps ? `${pascalName}Props` : "{}"
	const className = config.withStyles ? ` className={styles.${config.name}}` : ""

	return `import React from 'react'${stylesImport}
${propsInterface}
export function ${pascalName}(props: ${propsType}) {
  return (
    <div${className}>
      <h1>${pascalName}</h1>
      {/* Component content */}
    </div>
  )
}

export default ${pascalName}
`
}

function generateStylesContent(config: ComponentConfig): string {
	return `.${config.name} {
  /* Component styles */
}
`
}

function generateTestContent(config: ComponentConfig): string {
	const pascalName = toPascalCase(config.name)

	return `import React from 'react'
import { render, screen } from '@testing-library/react'
import { ${pascalName} } from './${config.name}'

describe('${pascalName}', () => {
  it('renders without crashing', () => {
    render(<${pascalName} />)
    expect(screen.getByText('${pascalName}')).toBeInTheDocument()
  })

  it('displays the component title', () => {
    render(<${pascalName} />)
    const title = screen.getByRole('heading', { name: '${pascalName}' })
    expect(title).toBeInTheDocument()
  })
})
`
}

function generateStoryContent(config: ComponentConfig): string {
	const pascalName = toPascalCase(config.name)

	return `import type { Meta, StoryObj } from '@storybook/react'
import { ${pascalName} } from './${config.name}'

const meta: Meta<typeof ${pascalName}> = {
  title: 'Components/${pascalName}',
  component: ${pascalName},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {},
}
`
}

function toPascalCase(str: string): string {
	return str
		.split(/[-_\s]+/)
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
		.join("")
}
