/**
 * Component Generator for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, modular component generation
 */

import path from "path"
import { FileManager } from "../core/file-manager.js"
import { TemplateEngine } from "../core/template-engine.js"
import { ComponentConfig, GenerationResult, TemplateFile } from "../types.js"

export class ComponentGenerator {
	private fileManager: FileManager
	private templateEngine: TemplateEngine
	// private validator: ProjectValidator

	constructor() {
		this.fileManager = new FileManager()
		this.templateEngine = new TemplateEngine()
		// this.validator = new ProjectValidator()
	}

	/**
	 * Generate a React component
	 */
	async generate(config: ComponentConfig): Promise<GenerationResult> {
		try {
			console.log(`🎨 Generating component: ${config.name}`)

			// Validate configuration
			this.validateConfig(config)

			// Determine output paths
			const outputPath = this.getComponentPath(config)
			const testPath = config.includeTests ? this.getTestPath(config) : null

			// Generate component files
			const files: TemplateFile[] = []

			// Main component file
			files.push(await this.generateComponentFile(config, outputPath))

			// Test file (if requested)
			if (config.includeTests && testPath) {
				files.push(await this.generateTestFile(config, testPath))
			}

			// Storybook file (if requested)
			if (config.includeStorybook) {
				const storyPath = this.getStoryPath(config)
				files.push(await this.generateStoryFile(config, storyPath))
			}

			// Write files
			await this.fileManager.writeFiles(files)

			console.log(`✅ Component ${config.name} generated successfully`)

			return {
				success: true,
				message: `Component '${config.name}' generated successfully`,
				files: files.map((f) => f.path),
			}
		} catch (error) {
			console.error("❌ Component generation failed:", error)
			return {
				success: false,
				message: `Component generation failed: ${error instanceof Error ? error.message : String(error)}`,
				files: [],
				errors: [error instanceof Error ? error.message : String(error)],
			}
		}
	}

	/**
	 * Validate component configuration
	 */
	private validateConfig(config: ComponentConfig): void {
		if (!config.name || typeof config.name !== "string") {
			throw new Error("Component name is required and must be a string")
		}

		if (!config.type || typeof config.type !== "string") {
			throw new Error("Component type is required and must be a string")
		}

		if (!config.projectPath || typeof config.projectPath !== "string") {
			throw new Error("Project path is required and must be a string")
		}

		const validTypes = ["ui", "page", "layout", "feature", "admin", "auth"]
		if (!validTypes.includes(config.type)) {
			throw new Error(`Invalid component type '${config.type}'. Valid types are: ${validTypes.join(", ")}`)
		}

		// Validate component name format
		const componentName = this.sanitizeComponentName(config.name)
		if (componentName !== config.name) {
			throw new Error(`Invalid component name '${config.name}'. Use PascalCase (e.g., 'MyComponent')`)
		}
	}

	/**
	 * Get component file path
	 */
	private getComponentPath(config: ComponentConfig): string {
		const fileName = `${config.name}.tsx`
		return path.join(config.projectPath, "src", "components", config.type, fileName)
	}

	/**
	 * Get test file path
	 */
	private getTestPath(config: ComponentConfig): string {
		const fileName = `${config.name}.test.tsx`
		return path.join(config.projectPath, "src", "components", config.type, fileName)
	}

	/**
	 * Get story file path
	 */
	private getStoryPath(config: ComponentConfig): string {
		const fileName = `${config.name}.stories.tsx`
		return path.join(config.projectPath, "src", "components", config.type, fileName)
	}

	/**
	 * Generate component file
	 */
	private async generateComponentFile(config: ComponentConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getComponentTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			componentName: config.name,
			includeStyles: config.includeStyles,
			componentType: config.type,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate test file
	 */
	private async generateTestFile(config: ComponentConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getTestTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			componentName: config.name,
			componentType: config.type,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Generate story file
	 */
	private async generateStoryFile(config: ComponentConfig, filePath: string): Promise<TemplateFile> {
		const template = this.getStoryTemplate(config)
		const content = await this.templateEngine.renderContent(template, {
			componentName: config.name,
			componentType: config.type,
		})

		return {
			path: filePath,
			content,
			isTemplate: true,
		}
	}

	/**
	 * Get component template
	 */
	private getComponentTemplate(config: ComponentConfig): string {
		switch (config.type) {
			case "ui":
				return this.getUIComponentTemplate()
			case "page":
				return this.getPageComponentTemplate()
			case "layout":
				return this.getLayoutComponentTemplate()
			case "feature":
				return this.getFeatureComponentTemplate()
			case "admin":
				return this.getAdminComponentTemplate()
			case "auth":
				return this.getAuthComponentTemplate()
			default:
				return this.getUIComponentTemplate()
		}
	}

	/**
	 * UI Component template
	 */
	private getUIComponentTemplate(): string {
		return `import React from 'react'
import { cn } from '@/lib/utils'

interface <%= componentName %>Props {
  children?: React.ReactNode
  className?: string
  <% if (includeStyles) { %>
  variant?: 'default' | 'secondary' | 'destructive'
  size?: 'sm' | 'md' | 'lg'
  <% } %>
}

export function <%= componentName %>({ 
  children, 
  className,
  <% if (includeStyles) { %>
  variant = 'default',
  size = 'md'
  <% } %>
}: <%= componentName %>Props) {
  <% if (includeStyles) { %>
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none'
  
  const variantClasses = {
    default: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
  }
  
  const sizeClasses = {
    sm: 'h-9 px-3 text-sm',
    md: 'h-10 px-4 py-2',
    lg: 'h-11 px-8 text-lg'
  }
  
  return (
    <div className={cn(
      baseClasses,
      variantClasses[variant],
      sizeClasses[size],
      className
    )}>
      {children}
    </div>
  )
  <% } else { %>
  return (
    <div className={cn('', className)}>
      {children}
    </div>
  )
  <% } %>
}`
	}

	/**
	 * Page Component template
	 */
	private getPageComponentTemplate(): string {
		return `import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '<%= componentName %>',
  description: '<%= componentName %> page',
}

export default function <%= componentName %>() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6"><%= componentName %></h1>
      
      <div className="prose max-w-none">
        <p>This is the <%= componentName %> page.</p>
      </div>
    </div>
  )
}`
	}

	/**
	 * Layout Component template
	 */
	private getLayoutComponentTemplate(): string {
		return `import React from 'react'

interface <%= componentName %>Props {
  children: React.ReactNode
}

export function <%= componentName %>({ children }: <%= componentName %>Props) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-xl font-semibold"><%= componentName %></h1>
        </div>
      </header>
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {children}
      </main>
      
      <footer className="border-t mt-auto">
        <div className="container mx-auto px-4 py-4">
          <p className="text-sm text-muted-foreground">
            © 2024 <%= componentName %>. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}`
	}

	/**
	 * Feature Component template
	 */
	private getFeatureComponentTemplate(): string {
		return `import React from 'react'
import { useState, useEffect } from 'react'

interface <%= componentName %>Props {
  // Define your props here
}

export function <%= componentName %>({ }: <%= componentName %>Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Component initialization logic
  }, [])

  const handleAction = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Your action logic here
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (error) {
    return (
      <div className="rounded-md bg-destructive/15 p-4">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold"><%= componentName %></h2>
      
      <div className="flex gap-2">
        <button
          onClick={handleAction}
          disabled={isLoading}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : 'Action'}
        </button>
      </div>
    </div>
  )
}`
	}

	/**
	 * Admin Component template
	 */
	private getAdminComponentTemplate(): string {
		return `import React from 'react'
import { useState } from 'react'

interface <%= componentName %>Props {
  // Admin-specific props
}

export function <%= componentName %>({ }: <%= componentName %>Props) {
  const [selectedItems, setSelectedItems] = useState<string[]>([])

  const handleSelect = (id: string) => {
    setSelectedItems(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    // Your select all logic
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold"><%= componentName %></h2>
        
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">
            Add New
          </button>
          {selectedItems.length > 0 && (
            <button className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90">
              Delete Selected ({selectedItems.length})
            </button>
          )}
        </div>
      </div>

      <div className="border rounded-lg">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr>
                <th className="text-left p-4">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                </th>
                <th className="text-left p-4">Name</th>
                <th className="text-left p-4">Status</th>
                <th className="text-left p-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* Your table rows here */}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}`
	}

	/**
	 * Auth Component template
	 */
	private getAuthComponentTemplate(): string {
		return `import React from 'react'
import { useState } from 'react'
import { signIn } from 'next-auth/react'

interface <%= componentName %>Props {
  // Auth-specific props
}

export function <%= componentName %>({ }: <%= componentName %>Props) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setIsLoading(true)
      setError(null)
      
      // Your auth logic here
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            <%= componentName %>
          </h2>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            {/* Your form fields here */}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50"
            >
              {isLoading ? 'Processing...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}`
	}

	/**
	 * Get test template
	 */
	private getTestTemplate(_config: ComponentConfig): string {
		return `import React from 'react'
import { render, screen } from '@testing-library/react'
import { <%= componentName %> } from './<%= componentName %>'

describe('<%= componentName %>', () => {
  it('renders without crashing', () => {
    render(<<%= componentName %>>Test content</<%= componentName %>>)
    expect(screen.getByText('Test content')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    const customClass = 'custom-class'
    render(<<%= componentName %> className={customClass}>Test</<%= componentName %>>)
    
    const element = screen.getByText('Test')
    expect(element).toHaveClass(customClass)
  })

  <% if (includeStyles) { %>
  it('renders with different variants', () => {
    const { rerender } = render(<<%= componentName %> variant="default">Test</<%= componentName %>>)
    expect(screen.getByText('Test')).toBeInTheDocument()

    rerender(<<%= componentName %> variant="secondary">Test</<%= componentName %>>)
    expect(screen.getByText('Test')).toBeInTheDocument()
  })
  <% } %>
})`
	}

	/**
	 * Get story template
	 */
	private getStoryTemplate(_config: ComponentConfig): string {
		return `import type { Meta, StoryObj } from '@storybook/react'
import { <%= componentName %> } from './<%= componentName %>'

const meta: Meta<typeof <%= componentName %>> = {
  title: 'Components/<%= componentName %>',
  component: <%= componentName %>,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: {
    children: 'Hello World',
  },
}

<% if (includeStyles) { %>
export const Secondary: Story = {
  args: {
    children: 'Secondary',
    variant: 'secondary',
  },
}

export const Destructive: Story = {
  args: {
    children: 'Destructive',
    variant: 'destructive',
  },
}

export const Small: Story = {
  args: {
    children: 'Small',
    size: 'sm',
  },
}

export const Large: Story = {
  args: {
    children: 'Large',
    size: 'lg',
  },
}
<% } %>`
	}

	/**
	 * Sanitize component name
	 */
	private sanitizeComponentName(name: string): string {
		// Convert to PascalCase
		return name
			.split(/[-_\s]+/)
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
			.join("")
	}
}
