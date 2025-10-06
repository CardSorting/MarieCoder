"use client"

import Link from "next/link"
import { signIn } from "next-auth/react"
import { useState } from "react"

export default function SignInPage() {
	const [isLoading, setIsLoading] = useState(false)

	const handleGoogleSignIn = async () => {
		setIsLoading(true)
		try {
			await signIn("google", { callbackUrl: "/dashboard" })
		} catch (error) {
			console.error("Sign in error:", error)
		} finally {
			setIsLoading(false)
		}
	}

	const handleGitHubSignIn = async () => {
		setIsLoading(true)
		try {
			await signIn("github", { callbackUrl: "/dashboard" })
		} catch (error) {
			console.error("Sign in error:", error)
		} finally {
			setIsLoading(false)
		}
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
			<div className="max-w-md w-full space-y-8">
				<div>
					<h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
						Sign in to your account
					</h2>
					<p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
						Or{" "}
						<Link className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400" href="/auth/signup">
							create a new account
						</Link>
					</p>
				</div>

				<div className="mt-8 space-y-6">
					<div className="space-y-4">
						<button
							className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={isLoading}
							onClick={handleGoogleSignIn}>
							{isLoading ? (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
							) : (
								<>
									<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
										<path
											d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
											fill="currentColor"
										/>
										<path
											d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
											fill="currentColor"
										/>
										<path
											d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
											fill="currentColor"
										/>
										<path
											d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
											fill="currentColor"
										/>
									</svg>
									Continue with Google
								</>
							)}
						</button>

						<button
							className="group relative w-full flex justify-center py-3 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
							disabled={isLoading}
							onClick={handleGitHubSignIn}>
							{isLoading ? (
								<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700 dark:border-gray-200"></div>
							) : (
								<>
									<svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
										<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
									</svg>
									Continue with GitHub
								</>
							)}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}
