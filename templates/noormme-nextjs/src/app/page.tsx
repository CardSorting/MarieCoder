import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

export default async function HomePage() {
	const session = await auth()

	if (session) {
		redirect("/dashboard")
	}

	return (
		<div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
			<div className="container mx-auto px-4 py-16">
				<div className="text-center">
					<h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-6">Welcome to NOORMME</h1>
					<p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
						A clean, organized Next.js template with NOORMME integration following the NORMIE DEV methodology.
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
							href="/auth/signin">
							Sign In
						</Link>
						<Link
							className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
							href="/auth/signup">
							Sign Up
						</Link>
					</div>
				</div>

				<div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8">
					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
						<div className="text-blue-600 dark:text-blue-400 text-3xl mb-4">⚡</div>
						<h3 className="text-xl font-semibold mb-2">Fast Development</h3>
						<p className="text-gray-600 dark:text-gray-300">
							Built with Next.js 15 and optimized for performance with SQLite WAL mode.
						</p>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
						<div className="text-green-600 dark:text-green-400 text-3xl mb-4">🔒</div>
						<h3 className="text-xl font-semibold mb-2">Secure by Default</h3>
						<p className="text-gray-600 dark:text-gray-300">
							NextAuth integration with role-based access control and secure authentication.
						</p>
					</div>

					<div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
						<div className="text-purple-600 dark:text-purple-400 text-3xl mb-4">🎯</div>
						<h3 className="text-xl font-semibold mb-2">Clean Architecture</h3>
						<p className="text-gray-600 dark:text-gray-300">
							Following NORMIE DEV methodology with unified services and no clutter.
						</p>
					</div>
				</div>
			</div>
		</div>
	)
}
