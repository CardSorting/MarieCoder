/** @type {import('next').NextConfig} */
const nextConfig = {
	// Production optimizations
	output: "standalone",
	compress: true,
	poweredByHeader: false,
	generateEtags: false,
	experimental: {
		serverComponentsExternalPackages: ["sqlite3"],
	},

	// Image optimization
	images: {
		domains: process.env.NODE_ENV === "production" ? [process.env.APP_DOMAIN || "your-domain.com"] : ["localhost"],
		formats: ["image/webp", "image/avif"],
		minimumCacheTTL: 60,
	},

	// Performance optimizations
	swcMinify: true,
	reactStrictMode: true,

	// Security headers
	async headers() {
		return [
			{
				source: "/(.*)",
				headers: [
					{
						key: "X-Frame-Options",
						value: "DENY",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
					{
						key: "Referrer-Policy",
						value: "origin-when-cross-origin",
					},
					{
						key: "X-XSS-Protection",
						value: "1; mode=block",
					},
				],
			},
		]
	},

	// Webpack optimizations
	webpack: (config, { isServer }) => {
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				fs: false,
				net: false,
				tls: false,
			}
		}
		return config
	},
}

module.exports = nextConfig
