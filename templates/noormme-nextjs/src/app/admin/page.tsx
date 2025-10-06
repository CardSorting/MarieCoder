import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function AdminPage() {
	const session = await auth()

	if (!session) {
		redirect("/auth/signin")
	}

	if (session.user?.role !== "admin") {
		redirect("/dashboard")
	}

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="bg-white dark:bg-gray-800 shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center py-6">
						<div>
							<h1 className="text-2xl font-bold text-gray-900 dark:text-white">Admin Panel</h1>
							<p className="text-gray-600 dark:text-gray-400">Manage your application</p>
						</div>
						<a
							className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
							href="/dashboard">
							Back to Dashboard
						</a>
					</div>
				</div>
			</div>

			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">User Management</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">Manage users, roles, and permissions.</p>
						<button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							Manage Users
						</button>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">System Settings</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">Configure application settings and preferences.</p>
						<button className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							Open Settings
						</button>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Analytics</h3>
						<p className="text-gray-600 dark:text-gray-400 mb-4">View system analytics and usage statistics.</p>
						<button className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
							View Analytics
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
