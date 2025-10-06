/**
 * Component Templates for NOORMME Project MCP Server
 * Following NORMIE DEV methodology - clean, reusable React component templates
 */

export class ComponentTemplates {
	/**
	 * Get UI component template
	 */
	getUIComponentTemplate(): string {
		return `import React from 'react'

interface <%= componentName %>Props {
	className?: string
	children?: React.ReactNode
}

export function <%= componentName %>({ className = '', children }: <%= componentName %>Props) {
	return (
		<div className={\`<%= componentName %> \${className}\`}>
			{children}
		</div>
	)
}

export default <%= componentName %>`
	}

	/**
	 * Get page component template
	 */
	getPageComponentTemplate(): string {
		return `import React from 'react'
import { Metadata } from 'next'

export const metadata: Metadata = {
	title: '<%= componentName %> | <%= projectName %>',
	description: '<%= componentName %> page',
}

export default function <%= componentName %>() {
	return (
		<div className="container mx-auto px-4 py-8">
			<h1 className="text-3xl font-bold mb-6"><%= componentName %></h1>
			<div className="prose max-w-none">
				{/* Page content goes here */}
			</div>
		</div>
	)
}`
	}

	/**
	 * Get layout component template
	 */
	getLayoutComponentTemplate(): string {
		return `import React from 'react'

interface <%= componentName %>LayoutProps {
	children: React.ReactNode
}

export default function <%= componentName %>Layout({ children }: <%= componentName %>LayoutProps) {
	return (
		<div className="<%= componentName %>-layout min-h-screen">
			<header className="bg-white shadow-sm border-b">
				{/* Header content */}
			</header>
			<main className="flex-1">
				{children}
			</main>
			<footer className="bg-gray-50 border-t">
				{/* Footer content */}
			</footer>
		</div>
	)
}`
	}

	/**
	 * Get feature component template
	 */
	getFeatureComponentTemplate(): string {
		return `import React, { useState, useEffect } from 'react'

interface <%= componentName %>Props {
	initialData?: any
	onDataChange?: (data: any) => void
}

export function <%= componentName %>({ initialData, onDataChange }: <%= componentName %>Props) {
	const [data, setData] = useState(initialData)
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	useEffect(() => {
		if (initialData) {
			setData(initialData)
		}
	}, [initialData])

	const handleAction = async () => {
		try {
			setLoading(true)
			setError(null)
			
			// Feature logic here
			onDataChange?.(data)
		} catch (err) {
			setError(err instanceof Error ? err.message : 'An error occurred')
		} finally {
			setLoading(false)
		}
	}

	if (loading) {
		return <div className="animate-pulse">Loading...</div>
	}

	if (error) {
		return <div className="text-red-600">Error: {error}</div>
	}

	return (
		<div className="<%= componentName %>-feature">
			{/* Feature content */}
		</div>
	)
}

export default <%= componentName %>`
	}

	/**
	 * Get admin component template
	 */
	getAdminComponentTemplate(): string {
		return `import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface <%= componentName %>Props {
	title?: string
	data?: any[]
}

export function <%= componentName %>({ title = '<%= componentName %>', data = [] }: <%= componentName %>Props) {
	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h1 className="text-3xl font-bold">{title}</h1>
				<button className="btn btn-primary">
					Add New
				</button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Overview</CardTitle>
				</CardHeader>
				<CardContent>
					{data.length > 0 ? (
						<div className="space-y-2">
							{data.map((item, index) => (
								<div key={index} className="p-2 border rounded">
									{/* Item content */}
								</div>
							))}
						</div>
					) : (
						<p className="text-gray-500">No data available</p>
					)}
				</CardContent>
			</Card>
		</div>
	)
}

export default <%= componentName %>`
	}

	/**
	 * Get auth component template
	 */
	getAuthComponentTemplate(): string {
		return `import React, { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

interface <%= componentName %>Props {
	mode?: 'signin' | 'signup' | 'profile'
}

export function <%= componentName %>({ mode = 'signin' }: <%= componentName %>Props) {
	const { data: session, status } = useSession()
	const [loading, setLoading] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const handleAuth = async (provider?: string) => {
		try {
			setLoading(true)
			setError(null)
			
			if (mode === 'signout') {
				await signOut()
			} else {
				await signIn(provider)
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Authentication failed')
		} finally {
			setLoading(false)
		}
	}

	if (status === 'loading') {
		return <div className="animate-pulse">Loading...</div>
	}

	if (session && mode !== 'signout') {
		return (
			<div className="<%= componentName %>-authenticated">
				<p>Welcome, {session.user?.name}!</p>
				<button 
					onClick={() => handleAuth()}
					disabled={loading}
					className="btn btn-secondary"
				>
					Sign Out
				</button>
			</div>
		)
	}

	return (
		<div className="<%= componentName %>-auth-form">
			{error && (
				<div className="text-red-600 mb-4">
					{error}
				</div>
			)}
			
			<form onSubmit={(e) => e.preventDefault()}>
				{/* Auth form fields */}
				<button 
					type="submit"
					disabled={loading}
					className="btn btn-primary w-full"
				>
					{loading ? 'Processing...' : mode === 'signup' ? 'Sign Up' : 'Sign In'}
				</button>
			</form>
		</div>
	)
}

export default <%= componentName %>`
	}

	/**
	 * Get test template
	 */
	getTestTemplate(): string {
		return `import React from 'react'
import { render, screen } from '@testing-library/react'
import { <%= componentName %> } from './<%= componentName %>'

describe('<%= componentName %>', () => {
	it('renders without crashing', () => {
		render(<<%= componentName %> />)
		expect(screen.getByRole('generic')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const customClass = 'custom-class'
		render(<<%= componentName %> className={customClass} />)
		expect(screen.getByRole('generic')).toHaveClass(customClass)
	})

	it('renders children when provided', () => {
		const testText = 'Test content'
		render(
			<<%= componentName %>>
				{testText}
			</<%= componentName %>>
		)
		expect(screen.getByText(testText)).toBeInTheDocument()
	})
})`
	}

	/**
	 * Get story template
	 */
	getStoryTemplate(): string {
		return `import type { Meta, StoryObj } from '@storybook/react'
import { <%= componentName %> } from './<%= componentName %>'

const meta: Meta<typeof <%= componentName %>> = {
	title: 'Components/<%= componentName %>',
	component: <%= componentName %>,
	parameters: {
		layout: 'centered',
	},
	tags: ['autodocs'],
	argTypes: {
		className: {
			control: 'text',
			description: 'Additional CSS classes',
		},
	},
}

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
	args: {
		className: '',
	},
}

export const WithContent: Story = {
	args: {
		children: 'Sample content',
	},
}

export const CustomStyling: Story = {
	args: {
		className: 'bg-blue-100 p-4 rounded-lg',
		children: 'Custom styled content',
	},
}`
	}
}
