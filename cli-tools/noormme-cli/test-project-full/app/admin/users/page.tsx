"use client"

import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useEffect, useState } from "react"

interface User {
	id: string
	email: string
	name: string
	status: "active" | "inactive" | "suspended"
	email_verified: boolean
	last_login?: string
	created_at: string
	roles: Array<{
		id: string
		name: string
		description?: string
	}>
}

interface Role {
	id: string
	name: string
	description?: string
}

export default function AdminUsersPage() {
	const { data: session, status } = useSession()
	const router = useRouter()
	const [users, setUsers] = useState<User[]>([])
	const [roles, setRoles] = useState<Role[]>([])
	const [loading, setLoading] = useState(true)
	const [showCreateModal, setShowCreateModal] = useState(false)
	const [editingUser, setEditingUser] = useState<User | null>(null)
	const [search, setSearch] = useState("")
	const [statusFilter, setStatusFilter] = useState("")

	useEffect(() => {
		if (status === "unauthenticated") {
			router.push("/auth/signin")
			return
		}

		if (session) {
			fetchUsers()
			fetchRoles()
		}
	}, [session, status, router])

	const fetchUsers = async () => {
		try {
			const params = new URLSearchParams()
			if (search) params.append("search", search)
			if (statusFilter) params.append("status", statusFilter)

			const response = await fetch(`/api/admin/users?${params}`)
			if (response.ok) {
				const data = await response.json()
				setUsers(data.users || [])
			}
		} catch (error) {
			console.error("Failed to fetch users:", error)
		} finally {
			setLoading(false)
		}
	}

	const fetchRoles = async () => {
		try {
			const response = await fetch("/api/admin/roles")
			if (response.ok) {
				const data = await response.json()
				setRoles(data.roles || [])
			}
		} catch (error) {
			console.error("Failed to fetch roles:", error)
		}
	}

	const handleSearch = (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)
		fetchUsers()
	}

	const handleCreateUser = async (e: React.FormEvent) => {
		e.preventDefault()
		const formData = new FormData(e.currentTarget as HTMLFormElement)

		const userData = {
			email: formData.get("email") as string,
			name: formData.get("name") as string,
			password: formData.get("password") as string,
			roleIds: [formData.get("role") as string],
		}

		try {
			const response = await fetch("/api/admin/users", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(userData),
			})

			if (response.ok) {
				setShowCreateModal(false)
				fetchUsers()
			} else {
				const error = await response.json()
				alert(`Error: ${error.error}`)
			}
		} catch (error) {
			console.error("Failed to create user:", error)
			alert("Failed to create user")
		}
	}

	const handleUpdateUser = async (user: User) => {
		const formData = new FormData()
		formData.append("name", user.name)
		formData.append("status", user.status)
		formData.append("roleIds", JSON.stringify(user.roles.map((r) => r.id)))

		try {
			const response = await fetch(`/api/admin/users?userId=${user.id}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: user.name,
					status: user.status,
					roleIds: user.roles.map((r) => r.id),
				}),
			})

			if (response.ok) {
				setEditingUser(null)
				fetchUsers()
			} else {
				const error = await response.json()
				alert(`Error: ${error.error}`)
			}
		} catch (error) {
			console.error("Failed to update user:", error)
			alert("Failed to update user")
		}
	}

	const handleDeleteUser = async (userId: string) => {
		if (!confirm("Are you sure you want to delete this user?")) return

		try {
			const response = await fetch(`/api/admin/users?userId=${userId}`, {
				method: "DELETE",
			})

			if (response.ok) {
				fetchUsers()
			} else {
				const error = await response.json()
				alert(`Error: ${error.error}`)
			}
		} catch (error) {
			console.error("Failed to delete user:", error)
			alert("Failed to delete user")
		}
	}

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="text-lg">Loading users...</div>
			</div>
		)
	}

	return (
		<div className="px-4 py-6 sm:px-0">
			<div className="mb-8">
				<div className="flex justify-between items-center">
					<div>
						<h1 className="text-3xl font-bold text-gray-900">User Management</h1>
						<p className="mt-2 text-gray-600">Manage user accounts, roles, and permissions.</p>
					</div>
					<button
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
						onClick={() => setShowCreateModal(true)}>
						Create User
					</button>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="mb-6 bg-white p-4 rounded-lg shadow">
				<form className="flex gap-4" onSubmit={handleSearch}>
					<input
						className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search users..."
						type="text"
						value={search}
					/>
					<select
						className="px-3 py-2 border border-gray-300 rounded-md"
						onChange={(e) => setStatusFilter(e.target.value)}
						value={statusFilter}>
						<option value="">All Status</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="suspended">Suspended</option>
					</select>
					<button className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700" type="submit">
						Search
					</button>
				</form>
			</div>

			{/* Users Table */}
			<div className="bg-white rounded-lg shadow overflow-hidden">
				<table className="min-w-full divide-y divide-gray-200">
					<thead className="bg-gray-50">
						<tr>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								User
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Status
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Roles
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Last Login
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Created
							</th>
							<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
								Actions
							</th>
						</tr>
					</thead>
					<tbody className="bg-white divide-y divide-gray-200">
						{users.map((user) => (
							<tr key={user.id}>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex items-center">
										<div className="flex-shrink-0 h-10 w-10">
											<div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
												<span className="text-sm font-medium text-gray-700">
													{user.name.charAt(0).toUpperCase()}
												</span>
											</div>
										</div>
										<div className="ml-4">
											<div className="text-sm font-medium text-gray-900">{user.name}</div>
											<div className="text-sm text-gray-500">{user.email}</div>
										</div>
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<span
										className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
											user.status === "active"
												? "bg-green-100 text-green-800"
												: user.status === "inactive"
													? "bg-yellow-100 text-yellow-800"
													: "bg-red-100 text-red-800"
										}`}>
										{user.status}
									</span>
								</td>
								<td className="px-6 py-4 whitespace-nowrap">
									<div className="flex flex-wrap gap-1">
										{user.roles.map((role) => (
											<span
												className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
												key={role.id}>
												{role.name}
											</span>
										))}
									</div>
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{user.last_login ? new Date(user.last_login).toLocaleDateString() : "Never"}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
									{new Date(user.created_at).toLocaleDateString()}
								</td>
								<td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
									<button
										className="text-blue-600 hover:text-blue-900 mr-3"
										onClick={() => setEditingUser(user)}>
										Edit
									</button>
									<button className="text-red-600 hover:text-red-900" onClick={() => handleDeleteUser(user.id)}>
										Delete
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>

			{/* Create User Modal */}
			{showCreateModal && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
							<form className="space-y-4" onSubmit={handleCreateUser}>
								<div>
									<label className="block text-sm font-medium text-gray-700">Email</label>
									<input
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										name="email"
										required
										type="email"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">Name</label>
									<input
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										name="name"
										required
										type="text"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">Password</label>
									<input
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										minLength={8}
										name="password"
										required
										type="password"
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">Role</label>
									<select
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										name="role"
										required>
										{roles.map((role) => (
											<option key={role.id} value={role.id}>
												{role.name}
											</option>
										))}
									</select>
								</div>
								<div className="flex justify-end space-x-3">
									<button
										className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
										onClick={() => setShowCreateModal(false)}
										type="button">
										Cancel
									</button>
									<button
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
										type="submit">
										Create User
									</button>
								</div>
							</form>
						</div>
					</div>
				</div>
			)}

			{/* Edit User Modal */}
			{editingUser && (
				<div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
					<div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
						<div className="mt-3">
							<h3 className="text-lg font-medium text-gray-900 mb-4">Edit User</h3>
							<div className="space-y-4">
								<div>
									<label className="block text-sm font-medium text-gray-700">Name</label>
									<input
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
										type="text"
										value={editingUser.name}
									/>
								</div>
								<div>
									<label className="block text-sm font-medium text-gray-700">Status</label>
									<select
										className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
										onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as any })}
										value={editingUser.status}>
										<option value="active">Active</option>
										<option value="inactive">Inactive</option>
										<option value="suspended">Suspended</option>
									</select>
								</div>
								<div className="flex justify-end space-x-3">
									<button
										className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
										onClick={() => setEditingUser(null)}>
										Cancel
									</button>
									<button
										className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
										onClick={() => handleUpdateUser(editingUser)}>
										Save Changes
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}
