import { BarChart3, Bell, CreditCard, Home, LogOut, Settings, Shield, Users } from "lucide-react"
import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	const session = await auth()

	if (!session) {
		redirect("/auth/signin")
	}

	if (!["admin", "super_admin"].includes(session.user.role)) {
		redirect("/dashboard")
	}

	const navigation = [
		{ name: "Dashboard", href: "/admin", icon: BarChart3 },
		{ name: "Users", href: "/admin/users", icon: Users },
		{ name: "Subscriptions", href: "/admin/subscriptions", icon: CreditCard },
		{ name: "Payments", href: "/admin/payments", icon: CreditCard },
		{ name: "Notifications", href: "/admin/notifications", icon: Bell },
		{ name: "Audit Logs", href: "/admin/audit-logs", icon: Shield },
		{ name: "Settings", href: "/admin/settings", icon: Settings },
	]

	return (
		<div className="min-h-screen bg-gray-50 dark:bg-gray-900">
			<div className="flex">
				{/* Sidebar */}
				<div className="hidden md:flex md:w-64 md:flex-col">
					<div className="flex flex-col flex-grow pt-5 bg-white dark:bg-gray-800 overflow-y-auto border-r border-gray-200 dark:border-gray-700">
						<div className="flex items-center flex-shrink-0 px-4">
							<Link className="flex items-center" href="/admin">
								<Shield className="h-8 w-8 text-blue-600" />
								<span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">Admin Panel</span>
							</Link>
						</div>

						<div className="mt-5 flex-grow flex flex-col">
							<nav className="flex-1 px-2 pb-4 space-y-1">
								{navigation.map((item) => {
									const Icon = item.icon
									return (
										<Link
											className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
											href={item.href}
											key={item.name}>
											<Icon className="mr-3 h-5 w-5" />
											{item.name}
										</Link>
									)
								})}
							</nav>
						</div>

						{/* User info and logout */}
						<div className="flex-shrink-0 flex border-t border-gray-200 dark:border-gray-700 p-4">
							<div className="flex items-center">
								<div className="flex-shrink-0">
									<div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
										<span className="text-sm font-medium text-white">
											{session.user.name?.charAt(0).toUpperCase()}
										</span>
									</div>
								</div>
								<div className="ml-3">
									<p className="text-sm font-medium text-gray-700 dark:text-gray-300">{session.user.name}</p>
									<p className="text-xs text-gray-500 dark:text-gray-400">{session.user.role}</p>
								</div>
							</div>
						</div>

						{/* Quick actions */}
						<div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
							<div className="space-y-2">
								<Link
									className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
									href="/dashboard">
									<Home className="mr-3 h-4 w-4" />
									Back to App
								</Link>
								<Link
									className="group flex items-center px-2 py-2 text-sm font-medium rounded-md text-red-600 hover:bg-red-50 hover:text-red-900 dark:text-red-400 dark:hover:bg-red-900/20"
									href="/api/auth/signout">
									<LogOut className="mr-3 h-4 w-4" />
									Sign Out
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Main content */}
				<div className="flex flex-col w-0 flex-1 overflow-hidden">
					<main className="flex-1 relative overflow-y-auto focus:outline-none">
						<div className="py-6">
							<div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">{children}</div>
						</div>
					</main>
				</div>
			</div>
		</div>
	)
}
