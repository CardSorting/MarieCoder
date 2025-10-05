import Link from "next/link"

export default function HomePage() {
	return (
		<div className="px-4 py-6 sm:px-0">
			<div className="border-4 border-dashed border-gray-200 rounded-lg p-8">
				<div className="text-center">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to NOORMME Payment Services</h1>
					<p className="text-xl text-gray-600 mb-8">
						A comprehensive Next.js application with integrated payment services
					</p>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-lg font-semibold mb-2">Payment Processing</h3>
							<p className="text-gray-600 mb-4">
								Integrated Stripe and PayPal payment processing with full webhook support.
							</p>
							<Link
								className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
								href="/payments">
								View Payments
							</Link>
						</div>

						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-lg font-semibold mb-2">User Management</h3>
							<p className="text-gray-600 mb-4">
								Secure authentication and user management with NextAuth.js integration.
							</p>
							<Link
								className="inline-block bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
								href="/dashboard">
								Dashboard
							</Link>
						</div>

						<div className="bg-white p-6 rounded-lg shadow">
							<h3 className="text-lg font-semibold mb-2">Database</h3>
							<p className="text-gray-600 mb-4">
								Type-safe database operations with SQLite and Kysely query builder.
							</p>
							<Link
								className="inline-block bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
								href="/api/health">
								API Health
							</Link>
						</div>
					</div>

					<div className="mt-12">
						<h2 className="text-2xl font-semibold mb-4">Features</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Next.js 14 App Router
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								TypeScript
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								NextAuth.js
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								SQLite + Kysely
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Stripe Integration
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								PayPal Integration
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Repository Pattern
							</div>
							<div className="flex items-center">
								<span className="text-green-500 mr-2">✓</span>
								Service Layer
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
