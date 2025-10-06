/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
	},
	images: {
		domains: ["localhost"],
	},
	// Enable SQLite in production
	env: {
		DATABASE_URL: process.env.DATABASE_URL,
	},
}

module.exports = nextConfig
