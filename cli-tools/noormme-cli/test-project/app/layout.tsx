import type { Metadata } from "next"
import { Inter } from "next/font/google"
import React from "react"
import "./globals.css"
import Providers from "./providers"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
	title: "NOORMME Payment Services",
	description: "A comprehensive Next.js application with integrated payment services",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<Providers>
					<div className="min-h-screen bg-gray-50">
						<header className="bg-white shadow">
							<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
								<div className="flex justify-between h-16">
									<div className="flex items-center">
										<h1 className="text-xl font-semibold text-gray-900">NOORMME Payment Services</h1>
									</div>
									<nav className="flex items-center space-x-4">
										<a className="text-gray-500 hover:text-gray-700" href="/">
											Home
										</a>
										<a className="text-gray-500 hover:text-gray-700" href="/dashboard">
											Dashboard
										</a>
										<a className="text-gray-500 hover:text-gray-700" href="/payments">
											Payments
										</a>
										<a className="text-gray-500 hover:text-gray-700" href="/admin">
											Admin
										</a>
									</nav>
								</div>
							</div>
						</header>
						<main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">{children}</main>
					</div>
				</Providers>
			</body>
		</html>
	)
}
