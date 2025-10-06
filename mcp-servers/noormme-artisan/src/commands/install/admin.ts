/**
 * Install Admin Command
 * Adds admin panel setup to an existing project
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const installAdminCommand: ArtisanCommand = {
	name: "install:admin",
	description: "Install admin panel with dashboard and management features",
	signature: "install:admin [options]",
	options: [
		{
			name: "with-auth",
			description: "Include authentication protection",
			type: "boolean",
			default: true,
		},
		{
			name: "with-database",
			description: "Include database management",
			type: "boolean",
			default: true,
		},
		{
			name: "with-users",
			description: "Include user management",
			type: "boolean",
			default: true,
		},
		{
			name: "with-roles",
			description: "Include role-based access control",
			type: "boolean",
			default: false,
		},
	],
	handler: async (_args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config = {
				withAuth: options["with-auth"] !== false,
				withDatabase: options["with-database"] !== false,
				withUsers: options["with-users"] !== false,
				withRoles: options["with-roles"] || false,
			}

			const result = await installAdmin(config)

			return {
				success: true,
				message: "Admin panel installed successfully",
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: "Failed to install admin panel",
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function installAdmin(config: any): Promise<{ files: string[]; directories: string[] }> {
	const files: string[] = []
	const directories: string[] = []
	const baseDir = process.cwd()

	// Check if this is a Next.js project
	const packageJsonPath = path.join(baseDir, "package.json")
	if (!(await fs.pathExists(packageJsonPath))) {
		throw new Error("Not a valid Next.js project. Please run this command from your project root.")
	}

	// Create admin directory structure
	await createAdminStructure(baseDir, config, files, directories)

	// Create admin layout
	const adminLayout = generateAdminLayout(config)
	const adminLayoutPath = path.join(baseDir, "src/app/admin/layout.tsx")
	await fs.writeFile(adminLayoutPath, adminLayout)
	files.push(adminLayoutPath)

	// Create admin dashboard
	const adminDashboard = generateAdminDashboard(config)
	const adminDashboardPath = path.join(baseDir, "src/app/admin/page.tsx")
	await fs.writeFile(adminDashboardPath, adminDashboard)
	files.push(adminDashboardPath)

	// Create admin components
	await createAdminComponents(baseDir, config, files)

	// Create admin API routes
	await createAdminApiRoutes(baseDir, config, files)

	// Create admin services if database is enabled
	if (config.withDatabase) {
		await createAdminServices(baseDir, config, files)
	}

	return { files, directories }
}

async function createAdminStructure(baseDir: string, config: any, _files: string[], directories: string[]): Promise<void> {
	const adminDirs = [
		"src/app/admin",
		"src/app/admin/dashboard",
		"src/app/admin/users",
		"src/components/admin",
		"src/components/admin/dashboard",
		"src/components/admin/users",
		"src/lib/admin",
	]

	if (config.withRoles) {
		adminDirs.push("src/app/admin/roles")
		adminDirs.push("src/components/admin/roles")
	}

	if (config.withDatabase) {
		adminDirs.push("src/app/admin/database")
		adminDirs.push("src/components/admin/database")
	}

	for (const dir of adminDirs) {
		const fullPath = path.join(baseDir, dir)
		await fs.ensureDir(fullPath)
		directories.push(fullPath)
	}
}

function generateAdminLayout(config: any): string {
	const authCheck = config.withAuth
		? `
  // Check authentication
  const session = await auth()
  if (!session) {
    redirect('/auth/signin')
  }
  
  // Check admin role if roles are enabled
  ${
		config.withRoles
			? `
  if (session.user.role !== 'admin') {
    redirect('/dashboard')
  }`
			: ""
  }
  `
		: ""

	const authImport = config.withAuth ? "import { auth } from '@/lib/auth'\nimport { redirect } from 'next/navigation'" : ""

	return `${authImport}
import AdminSidebar from '@/components/admin/AdminSidebar'
import AdminHeader from '@/components/admin/AdminHeader'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {${authCheck}
  
  return (
    <div className="min-h-screen bg-gray-100">
      <AdminHeader />
      <div className="flex">
        <AdminSidebar />
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
`
}

function generateAdminDashboard(_config: any): string {
	return `import AdminStats from '@/components/admin/dashboard/AdminStats'
import AdminRecentActivity from '@/components/admin/dashboard/AdminRecentActivity'
import AdminQuickActions from '@/components/admin/dashboard/AdminQuickActions'

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Welcome to the admin panel. Manage your application from here.
        </p>
      </div>
      
      <AdminStats />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AdminRecentActivity />
        <AdminQuickActions />
      </div>
    </div>
  )
}
`
}

async function createAdminComponents(baseDir: string, config: any, files: string[]): Promise<void> {
	// Create AdminSidebar
	const adminSidebar = generateAdminSidebar(config)
	const adminSidebarPath = path.join(baseDir, "src/components/admin/AdminSidebar.tsx")
	await fs.writeFile(adminSidebarPath, adminSidebar)
	files.push(adminSidebarPath)

	// Create AdminHeader
	const adminHeader = generateAdminHeader(config)
	const adminHeaderPath = path.join(baseDir, "src/components/admin/AdminHeader.tsx")
	await fs.writeFile(adminHeaderPath, adminHeader)
	files.push(adminHeaderPath)

	// Create dashboard components
	const adminStats = generateAdminStats(config)
	const adminStatsPath = path.join(baseDir, "src/components/admin/dashboard/AdminStats.tsx")
	await fs.writeFile(adminStatsPath, adminStats)
	files.push(adminStatsPath)

	const adminRecentActivity = generateAdminRecentActivity(config)
	const adminRecentActivityPath = path.join(baseDir, "src/components/admin/dashboard/AdminRecentActivity.tsx")
	await fs.writeFile(adminRecentActivityPath, adminRecentActivity)
	files.push(adminRecentActivityPath)

	const adminQuickActions = generateAdminQuickActions(config)
	const adminQuickActionsPath = path.join(baseDir, "src/components/admin/dashboard/AdminQuickActions.tsx")
	await fs.writeFile(adminQuickActionsPath, adminQuickActions)
	files.push(adminQuickActionsPath)

	// Create user management components if enabled
	if (config.withUsers) {
		const userList = generateUserList(config)
		const userListPath = path.join(baseDir, "src/components/admin/users/UserList.tsx")
		await fs.writeFile(userListPath, userList)
		files.push(userListPath)

		const userForm = generateUserForm(config)
		const userFormPath = path.join(baseDir, "src/components/admin/users/UserForm.tsx")
		await fs.writeFile(userFormPath, userForm)
		files.push(userFormPath)
	}
}

function generateAdminSidebar(config: any): string {
	const menuItems = [
		{ name: "Dashboard", href: "/admin", icon: "dashboard" },
		{ name: "Users", href: "/admin/users", icon: "users", condition: config.withUsers },
		{ name: "Roles", href: "/admin/roles", icon: "shield", condition: config.withRoles },
		{ name: "Database", href: "/admin/database", icon: "database", condition: config.withDatabase },
	].filter((item) => item.condition !== false)

	const menuItemsJsx = menuItems
		.map(
			(item) => `
        <a
          href="${item.href}"
          className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 hover:text-gray-900"
        >
          <span className="mr-3">${item.icon}</span>
          ${item.name}
        </a>`,
		)
		.join("")

	return `'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminSidebar() {
  const pathname = usePathname()
  
  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900">Admin Panel</h2>
      </div>
      
      <nav className="px-4 pb-4">
        <div className="space-y-1">
${menuItemsJsx}
        </div>
      </nav>
    </div>
  )
}
`
}

function generateAdminHeader(config: any): string {
	const authSection = config.withAuth
		? `
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-700">Admin User</span>
          <button className="text-sm text-gray-500 hover:text-gray-700">
            Sign Out
          </button>
        </div>`
		: ""

	return `export default function AdminHeader() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
          </div>
          ${authSection}
        </div>
      </div>
    </header>
  )
}
`
}

function generateAdminStats(_config: any): string {
	return `export default function AdminStats() {
  const stats = [
    { name: 'Total Users', value: '1,234', change: '+12%', changeType: 'positive' },
    { name: 'Active Sessions', value: '89', change: '+5%', changeType: 'positive' },
    { name: 'Database Size', value: '2.4 GB', change: '+8%', changeType: 'positive' },
    { name: 'Error Rate', value: '0.1%', change: '-2%', changeType: 'negative' }
  ]
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => (
        <div key={stat.name} className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">{stat.name}</p>
              <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
            </div>
            <div className="flex-shrink-0">
              <span className={\`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium \${
                stat.changeType === 'positive' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }\`}>
                {stat.change}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
`
}

function generateAdminRecentActivity(_config: any): string {
	return `export default function AdminRecentActivity() {
  const activities = [
    { id: 1, user: 'John Doe', action: 'Created new user', time: '2 minutes ago' },
    { id: 2, user: 'Jane Smith', action: 'Updated profile', time: '5 minutes ago' },
    { id: 3, user: 'Bob Johnson', action: 'Deleted comment', time: '10 minutes ago' },
    { id: 4, user: 'Alice Brown', action: 'Changed password', time: '15 minutes ago' }
  ]
  
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {activity.user.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900">
                <span className="font-medium">{activity.user}</span> {activity.action}
              </p>
              <p className="text-sm text-gray-500">{activity.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
`
}

function generateAdminQuickActions(config: any): string {
	const _actions = [
		{ name: "Create User", href: "/admin/users/new", icon: "user-plus" },
		{ name: "View Database", href: "/admin/database", icon: "database", condition: config.withDatabase },
		{ name: "Manage Roles", href: "/admin/roles", icon: "shield", condition: config.withRoles },
		{ name: "System Settings", href: "/admin/settings", icon: "cog" },
	].filter((action) => action.condition !== false)

	return `export default function AdminQuickActions() {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-4">
        {actions.map((action) => (
          <a
            key={action.name}
            href={action.href}
            className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="mr-3 text-gray-400">{action.icon}</span>
            <span className="text-sm font-medium text-gray-900">{action.name}</span>
          </a>
        ))}
      </div>
    </div>
  )
}
`
}

function generateUserList(_config: any): string {
	return `'use client'

import { useState } from 'react'

export default function UserList() {
  const [users] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'inactive' }
  ])
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Users</h3>
          <a
            href="/admin/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            Add User
          </a>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={\`inline-flex px-2 py-1 text-xs font-semibold rounded-full \${
                    user.status === 'active' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }\`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <a href={\`/admin/users/\${user.id}/edit\`} className="text-blue-600 hover:text-blue-900 mr-3">
                    Edit
                  </a>
                  <button className="text-red-600 hover:text-red-900">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
`
}

function generateUserForm(_config: any): string {
	return `'use client'

import { useState } from 'react'

export default function UserForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user',
    status: 'active'
  })
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
  }
  
  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Create User</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700">
            Role
          </label>
          <select
            id="role"
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        
        <div className="flex justify-end space-x-3">
          <a
            href="/admin/users"
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            Create User
          </button>
        </div>
      </form>
    </div>
  )
}
`
}

async function createAdminApiRoutes(baseDir: string, config: any, files: string[]): Promise<void> {
	const apiAdminDir = path.join(baseDir, "src/app/api/admin")
	await fs.ensureDir(apiAdminDir)

	// Create users API route
	if (config.withUsers) {
		const usersApi = generateUsersApi(config)
		const usersApiDir = path.join(apiAdminDir, "users")
		await fs.ensureDir(usersApiDir)
		const usersApiPath = path.join(usersApiDir, "route.ts")
		await fs.writeFile(usersApiPath, usersApi)
		files.push(usersApiPath)
	}

	// Create dashboard API route
	const dashboardApi = generateDashboardApi(config)
	const dashboardApiDir = path.join(apiAdminDir, "dashboard")
	await fs.ensureDir(dashboardApiDir)
	const dashboardApiPath = path.join(dashboardApiDir, "route.ts")
	await fs.writeFile(dashboardApiPath, dashboardApi)
	files.push(dashboardApiPath)
}

function generateUsersApi(config: any): string {
	return `import { NextRequest, NextResponse } from 'next/server'
${config.withAuth ? "import { auth } from '@/lib/auth'" : ""}

export async function GET(request: NextRequest) {
  ${
		config.withAuth
			? `
  // Check authentication
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check admin role if roles are enabled
  ${
		config.withRoles
			? `
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }`
			: ""
  }
  `
			: ""
  }
  
  // Mock user data - replace with actual database query
  const users = [
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'inactive' }
  ]
  
  return NextResponse.json({ users })
}

export async function POST(request: NextRequest) {
  ${
		config.withAuth
			? `
  // Check authentication
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check admin role if roles are enabled
  ${
		config.withRoles
			? `
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }`
			: ""
  }
  `
			: ""
  }
  
  try {
    const body = await request.json()
    
    // Validate input
    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    
    // Create user - replace with actual database operation
    const newUser = {
      id: Date.now(),
      name: body.name,
      email: body.email,
      role: body.role || 'user',
      status: body.status || 'active',
      createdAt: new Date().toISOString()
    }
    
    return NextResponse.json({ user: newUser }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
`
}

function generateDashboardApi(config: any): string {
	return `import { NextRequest, NextResponse } from 'next/server'
${config.withAuth ? "import { auth } from '@/lib/auth'" : ""}

export async function GET(request: NextRequest) {
  ${
		config.withAuth
			? `
  // Check authentication
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // Check admin role if roles are enabled
  ${
		config.withRoles
			? `
  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }`
			: ""
  }
  `
			: ""
  }
  
  // Mock dashboard data - replace with actual database queries
  const dashboardData = {
    stats: {
      totalUsers: 1234,
      activeSessions: 89,
      databaseSize: '2.4 GB',
      errorRate: 0.1
    },
    recentActivity: [
      { id: 1, user: 'John Doe', action: 'Created new user', time: '2 minutes ago' },
      { id: 2, user: 'Jane Smith', action: 'Updated profile', time: '5 minutes ago' },
      { id: 3, user: 'Bob Johnson', action: 'Deleted comment', time: '10 minutes ago' }
    ]
  }
  
  return NextResponse.json(dashboardData)
}
`
}

async function createAdminServices(baseDir: string, config: any, files: string[]): Promise<void> {
	// Create admin service
	const adminService = generateAdminService(config)
	const adminServicePath = path.join(baseDir, "src/lib/admin/AdminService.ts")
	await fs.writeFile(adminServicePath, adminService)
	files.push(adminServicePath)

	// Create user service if users are enabled
	if (config.withUsers) {
		const userService = generateUserService(config)
		const userServicePath = path.join(baseDir, "src/lib/admin/UserService.ts")
		await fs.writeFile(userServicePath, userService)
		files.push(userServicePath)
	}
}

function generateAdminService(_config: any): string {
	return `import { kysely } from '@/lib/db'

export class AdminService {
  /**
   * Get dashboard statistics
   */
  async getDashboardStats() {
    try {
      // Mock implementation - replace with actual database queries
      const stats = {
        totalUsers: 1234,
        activeSessions: 89,
        databaseSize: '2.4 GB',
        errorRate: 0.1
      }
      
      return stats
    } catch (error) {
      throw new Error(\`Failed to get dashboard stats: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Get recent activity
   */
  async getRecentActivity(limit: number = 10) {
    try {
      // Mock implementation - replace with actual database queries
      const activities = [
        { id: 1, user: 'John Doe', action: 'Created new user', time: '2 minutes ago' },
        { id: 2, user: 'Jane Smith', action: 'Updated profile', time: '5 minutes ago' },
        { id: 3, user: 'Bob Johnson', action: 'Deleted comment', time: '10 minutes ago' }
      ]
      
      return activities.slice(0, limit)
    } catch (error) {
      throw new Error(\`Failed to get recent activity: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Get system health
   */
  async getSystemHealth() {
    try {
      // Mock implementation - replace with actual health checks
      const health = {
        database: 'healthy',
        api: 'healthy',
        storage: 'healthy',
        uptime: '99.9%'
      }
      
      return health
    } catch (error) {
      throw new Error(\`Failed to get system health: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
}
`
}

function generateUserService(_config: any): string {
	return `import { kysely } from '@/lib/db'

export class UserService {
  /**
   * Get all users with pagination
   */
  async getUsers(page: number = 1, limit: number = 10) {
    try {
      const offset = (page - 1) * limit
      
      // Mock implementation - replace with actual database queries
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'admin', status: 'active', createdAt: new Date().toISOString() },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'user', status: 'active', createdAt: new Date().toISOString() },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'inactive', createdAt: new Date().toISOString() }
      ]
      
      return {
        users: users.slice(offset, offset + limit),
        total: users.length,
        page,
        limit,
        totalPages: Math.ceil(users.length / limit)
      }
    } catch (error) {
      throw new Error(\`Failed to get users: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Get user by ID
   */
  async getUserById(id: string) {
    try {
      // Mock implementation - replace with actual database query
      const user = {
        id: parseInt(id),
        name: 'John Doe',
        email: 'john@example.com',
        role: 'admin',
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return user
    } catch (error) {
      throw new Error(\`Failed to get user: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Create new user
   */
  async createUser(userData: { name: string; email: string; role?: string; status?: string }) {
    try {
      // Mock implementation - replace with actual database operation
      const newUser = {
        id: Date.now(),
        name: userData.name,
        email: userData.email,
        role: userData.role || 'user',
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return newUser
    } catch (error) {
      throw new Error(\`Failed to create user: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Update user
   */
  async updateUser(id: string, userData: Partial<{ name: string; email: string; role: string; status: string }>) {
    try {
      // Mock implementation - replace with actual database operation
      const updatedUser = {
        id: parseInt(id),
        name: userData.name || 'John Doe',
        email: userData.email || 'john@example.com',
        role: userData.role || 'admin',
        status: userData.status || 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      return updatedUser
    } catch (error) {
      throw new Error(\`Failed to update user: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
  
  /**
   * Delete user
   */
  async deleteUser(id: string) {
    try {
      // Mock implementation - replace with actual database operation
      return { success: true, message: 'User deleted successfully' }
    } catch (error) {
      throw new Error(\`Failed to delete user: \${error instanceof Error ? error.message : 'Unknown error'}\`)
    }
  }
}
`
}
