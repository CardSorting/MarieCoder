import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { rbac } from "@/lib/rbac"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await auth()

	if (!session?.user?.id) {
		redirect("/auth/signin")
	}

	// Check if user has admin access
	const hasAdminAccess = await rbac.hasPermission(session.user.id, "admin", "access")

	if (!hasAdminAccess) {
		redirect("/dashboard")
	}

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="bg-white shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between h-16">
						<div className="flex items-center">
							<h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
						</div>
						<nav className="flex items-center space-x-4">
							<a className="text-gray-500 hover:text-gray-700" href="/admin">
								Dashboard
							</a>
							<a className="text-gray-500 hover:text-gray-700" href="/admin/users">
								Users
							</a>
							<a className="text-gray-500 hover:text-gray-700" href="/admin/roles">
								Roles
							</a>
							<a className="text-gray-500 hover:text-gray-700" href="/admin/audit">
								Audit Logs
							</a>
							<a className="text-gray-500 hover:text-gray-700" href="/dashboard">
								Back to Dashboard
							</a>
						</nav>
					</div>
				</div>
			</div>

			<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
		</div>
	)
}
