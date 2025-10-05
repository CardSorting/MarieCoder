/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		serverComponentsExternalPackages: ["better-sqlite3"],
	},
	typescript: {
		ignoreBuildErrors: false,
	},
	eslint: {
		ignoreDuringBuilds: false,
	},
	images: {
		domains: ["lh3.googleusercontent.com", "avatars.githubusercontent.com"],
	},
}

module.exports = nextConfig
