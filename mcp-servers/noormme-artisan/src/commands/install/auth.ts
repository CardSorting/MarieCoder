/**
 * Install Auth Command
 * Adds authentication setup to an existing project
 */

import fs from "fs-extra"
import path from "path"
import { ArtisanCommand, CommandArguments, CommandOptions, CommandResult } from "../../types.js"

export const installAuthCommand: ArtisanCommand = {
	name: "install:auth",
	description: "Install authentication setup with NextAuth.js",
	signature: "install:auth [options]",
	options: [
		{
			name: "providers",
			description: "Authentication providers (google, github, email)",
			type: "string",
			default: "google,github",
			alias: "p",
		},
		{
			name: "with-database",
			description: "Include database session storage",
			type: "boolean",
			default: true,
		},
		{
			name: "with-middleware",
			description: "Include authentication middleware",
			type: "boolean",
			default: true,
		},
		{
			name: "with-pages",
			description: "Include auth pages (signin, signup)",
			type: "boolean",
			default: true,
		},
	],
	handler: async (_args: CommandArguments, options: CommandOptions): Promise<CommandResult> => {
		try {
			const config = {
				providers: ((options.providers as string) || "google,github").split(",").map((p) => p.trim()),
				withDatabase: options["with-database"] !== false,
				withMiddleware: options["with-middleware"] !== false,
				withPages: options["with-pages"] !== false,
			}

			const result = await installAuth(config)

			return {
				success: true,
				message: "Authentication setup installed successfully",
				data: result,
			}
		} catch (error) {
			return {
				success: false,
				message: "Failed to install authentication",
				error: error instanceof Error ? error.message : String(error),
			}
		}
	},
}

async function installAuth(config: any): Promise<{ files: string[]; dependencies: string[] }> {
	const files: string[] = []
	const dependencies: string[] = ["next-auth"]

	const baseDir = process.cwd()

	// Check if this is a Next.js project
	const packageJsonPath = path.join(baseDir, "package.json")
	if (!(await fs.pathExists(packageJsonPath))) {
		throw new Error("Not a valid Next.js project. Please run this command from your project root.")
	}

	// Create auth configuration
	const authConfig = generateAuthConfig(config)
	const authConfigPath = path.join(baseDir, "src/lib/auth.ts")
	await fs.ensureDir(path.dirname(authConfigPath))
	await fs.writeFile(authConfigPath, authConfig)
	files.push(authConfigPath)

	// Create middleware if requested
	if (config.withMiddleware) {
		const middleware = generateMiddleware(config)
		const middlewarePath = path.join(baseDir, "src/middleware.ts")
		await fs.writeFile(middlewarePath, middleware)
		files.push(middlewarePath)
	}

	// Create auth pages if requested
	if (config.withPages) {
		await createAuthPages(baseDir, config, files)
	}

	// Create API routes
	await createAuthApiRoutes(baseDir, config, files)

	// Update environment file
	await updateEnvFile(baseDir, config, files)

	// Update package.json
	await updatePackageJson(baseDir, config, dependencies)

	return { files, dependencies }
}

function generateAuthConfig(config: any): string {
	const providers = config.providers
		.map((provider: string) => {
			switch (provider.toLowerCase()) {
				case "google":
					return `    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    })`
				case "github":
					return `    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    })`
				case "email":
					return `    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
    })`
				default:
					return `    // ${provider} provider - configure manually`
			}
		})
		.join(",\n")

	const sessionStrategy = config.withDatabase ? "database" : "jwt"

	return `import NextAuth from 'next-auth'
${config.providers.includes("google") ? "import GoogleProvider from 'next-auth/providers/google'" : ""}
${config.providers.includes("github") ? "import GitHubProvider from 'next-auth/providers/github'" : ""}
${config.providers.includes("email") ? "import EmailProvider from 'next-auth/providers/email'" : ""}
${config.withDatabase ? "import { NoormmeAdapter } from 'noormme/adapters/nextauth'" : ""}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ${config.withDatabase ? "adapter: NoormmeAdapter(db)," : ""}
  providers: [
${providers}
  ],
  session: { 
    strategy: '${sessionStrategy}' 
  },
  callbacks: {
    async session({ session, token, user }) {
      if (session.user) {
        session.user.id = user?.id || token?.sub
      }
      return session
    },
    async jwt({ token, account, profile, user }) {
      if (account) {
        token.accessToken = account.access_token
      }
      if (user) {
        token.id = user.id
      }
      return token
    },
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup',
    error: '/auth/error',
  },
})
`
}

function generateMiddleware(_config: any): string {
	return `import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  // Protect admin routes
  if (req.nextUrl.pathname.startsWith('/admin') && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
  
  // Protect dashboard routes
  if (req.nextUrl.pathname.startsWith('/dashboard') && !req.auth) {
    return NextResponse.redirect(new URL('/auth/signin', req.url))
  }
  
  // Redirect authenticated users away from auth pages
  if (req.auth && req.nextUrl.pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
`
}

async function createAuthPages(baseDir: string, config: any, files: string[]): Promise<void> {
	const authDir = path.join(baseDir, "src/app/(auth)")
	await fs.ensureDir(authDir)

	// Create auth layout
	const authLayout = generateAuthLayout()
	const authLayoutPath = path.join(authDir, "layout.tsx")
	await fs.writeFile(authLayoutPath, authLayout)
	files.push(authLayoutPath)

	// Create signin page
	const signinPage = generateSigninPage(config)
	const signinDir = path.join(authDir, "signin")
	await fs.ensureDir(signinDir)
	const signinPath = path.join(signinDir, "page.tsx")
	await fs.writeFile(signinPath, signinPage)
	files.push(signinPath)

	// Create signup page
	const signupPage = generateSignupPage(config)
	const signupDir = path.join(authDir, "signup")
	await fs.ensureDir(signupDir)
	const signupPath = path.join(signupDir, "page.tsx")
	await fs.writeFile(signupPath, signupPage)
	files.push(signupPath)

	// Create error page
	const errorPage = generateErrorPage()
	const errorDir = path.join(authDir, "error")
	await fs.ensureDir(errorDir)
	const errorPath = path.join(errorDir, "page.tsx")
	await fs.writeFile(errorPath, errorPage)
	files.push(errorPath)
}

function generateAuthLayout(): string {
	return `export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {children}
      </div>
    </div>
  )
}
`
}

function generateSigninPage(config: any): string {
	const providers = config.providers
		.map((provider: string) => {
			switch (provider.toLowerCase()) {
				case "google":
					return `        <button
          onClick={() => signIn('google')}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          Sign in with Google
        </button>`
				case "github":
					return `        <button
          onClick={() => signIn('github')}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
        >
          Sign in with GitHub
        </button>`
				default:
					return `        <button
          onClick={() => signIn('${provider}')}
          className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Sign in with ${provider}
        </button>`
			}
		})
		.join("\n")

	return `'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignInPage() {
  return (
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Sign in to your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link href="/auth/signup" className="font-medium text-blue-600 hover:text-blue-500">
            create a new account
          </Link>
        </p>
      </div>
      
      <div className="mt-8 space-y-6">
        <div className="space-y-4">
${providers}
        </div>
        
        <div className="text-center">
          <Link
            href="/"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Back to home
          </Link>
        </div>
      </div>
    </div>
  )
}
`
}

function generateSignupPage(_config: any): string {
	return `'use client'

import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function SignUpPage() {
  return (
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link href="/auth/signin" className="font-medium text-blue-600 hover:text-blue-500">
            sign in to your existing account
          </Link>
        </p>
      </div>
      
      <div className="mt-8 space-y-6">
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Sign up is handled through the same providers as sign in.
            Click "Sign in" to get started.
          </p>
        </div>
        
        <div className="text-center">
          <Link
            href="/auth/signin"
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            Go to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
`
}

function generateErrorPage(): string {
	return `'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function AuthErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error')
  
  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case 'Configuration':
        return 'There is a problem with the server configuration.'
      case 'AccessDenied':
        return 'Access denied. You do not have permission to sign in.'
      case 'Verification':
        return 'The verification token has expired or has already been used.'
      default:
        return 'An error occurred during authentication.'
    }
  }
  
  return (
    <div>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-red-600">
          Authentication Error
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {getErrorMessage(error)}
        </p>
      </div>
      
      <div className="mt-8 text-center">
        <Link
          href="/auth/signin"
          className="font-medium text-blue-600 hover:text-blue-500"
        >
          Try again
        </Link>
      </div>
    </div>
  )
}
`
}

async function createAuthApiRoutes(baseDir: string, config: any, files: string[]): Promise<void> {
	const apiAuthDir = path.join(baseDir, "src/app/api/auth")
	await fs.ensureDir(apiAuthDir)

	// Create [...nextauth] route
	const nextauthRoute = generateNextAuthRoute(config)
	const nextauthDir = path.join(apiAuthDir, "[...nextauth]")
	await fs.ensureDir(nextauthDir)
	const nextauthPath = path.join(nextauthDir, "route.ts")
	await fs.writeFile(nextauthPath, nextauthRoute)
	files.push(nextauthPath)
}

function generateNextAuthRoute(_config: any): string {
	return `import { handlers } from '@/lib/auth'

export const { GET, POST } = handlers
`
}

async function updateEnvFile(baseDir: string, config: any, files: string[]): Promise<void> {
	const envExamplePath = path.join(baseDir, ".env.example")
	const envLocalPath = path.join(baseDir, ".env.local")

	let envContent = ""

	// Read existing .env.example if it exists
	if (await fs.pathExists(envExamplePath)) {
		envContent = await fs.readFile(envExamplePath, "utf-8")
	}

	// Add auth environment variables
	envContent += "\n# Authentication\n"
	envContent += 'NEXTAUTH_URL="http://localhost:3000"\n'
	envContent += 'NEXTAUTH_SECRET="your-secret-key-here"\n'

	if (config.providers.includes("google")) {
		envContent += "\n# Google OAuth\n"
		envContent += 'GOOGLE_CLIENT_ID="your-google-client-id"\n'
		envContent += 'GOOGLE_CLIENT_SECRET="your-google-client-secret"\n'
	}

	if (config.providers.includes("github")) {
		envContent += "\n# GitHub OAuth\n"
		envContent += 'GITHUB_CLIENT_ID="your-github-client-id"\n'
		envContent += 'GITHUB_CLIENT_SECRET="your-github-client-secret"\n'
	}

	if (config.providers.includes("email")) {
		envContent += "\n# Email Provider\n"
		envContent += 'EMAIL_SERVER_HOST="smtp.gmail.com"\n'
		envContent += 'EMAIL_SERVER_PORT="587"\n'
		envContent += 'EMAIL_SERVER_USER="your-email@gmail.com"\n'
		envContent += 'EMAIL_SERVER_PASSWORD="your-app-password"\n'
		envContent += 'EMAIL_FROM="noreply@yourapp.com"\n'
	}

	// Update .env.example
	await fs.writeFile(envExamplePath, envContent)
	files.push(envExamplePath)

	// Create .env.local if it doesn't exist
	if (!(await fs.pathExists(envLocalPath))) {
		await fs.writeFile(envLocalPath, envContent)
		files.push(envLocalPath)
	}
}

async function updatePackageJson(baseDir: string, _config: any, dependencies: string[]): Promise<void> {
	const packageJsonPath = path.join(baseDir, "package.json")
	const packageJson = await fs.readJson(packageJsonPath)

	// Add dependencies
	if (!packageJson.dependencies) {
		packageJson.dependencies = {}
	}

	for (const dep of dependencies) {
		if (!packageJson.dependencies[dep]) {
			packageJson.dependencies[dep] = "^4.24.0"
		}
	}

	// Add dev dependencies
	if (!packageJson.devDependencies) {
		packageJson.devDependencies = {}
	}

	if (!packageJson.devDependencies["@types/next-auth"]) {
		packageJson.devDependencies["@types/next-auth"] = "^4.24.0"
	}

	await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 })
}
