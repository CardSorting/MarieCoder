/** @type {import('next').NextConfig} */
const nextConfig = {
	// Production optimizations
	output: 'standalone',
	compress: true,
	poweredByHeader: false,
	generateEtags: false,
	experimental: {
		serverComponentsExternalPackages: ['sqlite3'],
	},
	
	// Image optimization
	images: {
		domains: process.env.NODE_ENV === 'production' 
			? [process.env.APP_DOMAIN || 'your-domain.com']
			: ['localhost'],
		formats: ['image/webp', 'image/avif'],
		minimumCacheTTL: 60,
	},
	
	// Performance optimizations
	swcMinify: true,
	reactStrictMode: true,
	
	// Security headers
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'DENY',
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff',
					},
					{
						key: 'Referrer-Policy',
						value: 'origin-when-cross-origin',
					},
				],
			},
		]
	},
	
	// Environment variables
	env: {
		DATABASE_URL: process.env.DATABASE_URL,
		NEXTAUTH_URL: process.env.NEXTAUTH_URL,
		NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
		APP_NAME: process.env.APP_NAME,
		APP_URL: process.env.APP_URL,
	},
	
	// Public runtime config
	publicRuntimeConfig: {
		APP_NAME: process.env.APP_NAME || 'NOORMME SAAS',
		APP_URL: process.env.APP_URL || 'http://localhost:3000',
		ENABLE_BILLING: process.env.ENABLE_BILLING === 'true',
		ENABLE_NOTIFICATIONS: process.env.ENABLE_NOTIFICATIONS === 'true',
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
