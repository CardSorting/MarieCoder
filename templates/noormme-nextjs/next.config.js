/** @type {import('next').NextConfig} */
const nextConfig = {
	experimental: {
		appDir: true,
	},
	typescript: {
		// Dangerously allow production builds to successfully complete even if
		// your project has type errors.
		ignoreBuildErrors: false,
	},
	eslint: {
		// Warning: This allows production builds to successfully complete even if
		// your project has ESLint errors.
		ignoreDuringBuilds: false,
	},
}

module.exports = nextConfig
