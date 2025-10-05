/**
 * NextAuth Configuration for NOORMME
 * Provides authentication with multiple providers and database sessions
 */

import bcrypt from "bcryptjs"
import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { db } from "./db"
import { rbac } from "./rbac"

// Custom adapter for NOORMME database with RBAC support
const NOORMMEAdapter = {
	async createUser(user: any): Promise<any> {
		const userRepo = db.getRepository("users")
		const hashedPassword = user.password ? await bcrypt.hash(user.password, 12) : undefined

		const newUser = await userRepo.create({
			id: user.id,
			email: user.email,
			name: user.name,
			password_hash: hashedPassword,
			email_verified: user.emailVerified || false,
			image: user.image,
			status: "active",
		})

		// Assign default 'user' role to new users
		await rbac.assignRole(newUser.id, "user", "system")

		return newUser
	},

	async getUser(id: string): Promise<any> {
		const userRepo = db.getRepository("users")
		return await userRepo.findById(id)
	},

	async getUserByEmail(email: string): Promise<any> {
		const kysely = db.getKysely()
		return await kysely.selectFrom("users").where("email", "=", email).selectAll().executeTakeFirst()
	},

	async getUserByAccount({ providerAccountId, provider }: any) {
		// This would require an accounts table - simplified for demo
		return null
	},

	async updateUser(user: any): Promise<any> {
		const userRepo = db.getRepository("users")
		return await userRepo.update(user.id, user)
	},

	async deleteUser(userId: string) {
		const userRepo = db.getRepository("users")
		return await userRepo.delete(userId)
	},

	async linkAccount(account: any): Promise<any> {
		// Simplified - would need accounts table
		return account
	},

	async unlinkAccount({ providerAccountId, provider }: any) {
		// Simplified - would need accounts table
		return null
	},

	async createSession({ sessionToken, userId, expires }: any): Promise<any> {
		// Simplified - would need sessions table
		return { sessionToken, userId, expires }
	},

	async getSessionAndUser(sessionToken: string): Promise<any> {
		// Simplified - would need sessions table
		return null
	},

	async updateSession({ sessionToken, ...data }: any): Promise<any> {
		// Simplified - would need sessions table
		return null
	},

	async deleteSession(sessionToken: string) {
		// Simplified - would need sessions table
		return null
	},

	async createVerificationToken({ identifier, expires, token }: any) {
		// Simplified - would need verification_tokens table
		return { identifier, expires, token }
	},

	async useVerificationToken({ identifier, token }: any) {
		// Simplified - would need verification_tokens table
		return null
	},
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: NOORMMEAdapter as any,
	providers: [
		GoogleProvider({
			clientId: process.env.GOOGLE_CLIENT_ID!,
			clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
		}),
		GitHubProvider({
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
		}),
		CredentialsProvider({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials: any): Promise<any> {
				if (!credentials?.email || !credentials?.password) {
					return null
				}

				const kysely = db.getKysely()
				const user = await kysely
					.selectFrom("users")
					.where("email", "=", credentials.email)
					.where("status", "=", "active")
					.selectAll()
					.executeTakeFirst()

				if (user && user.password_hash) {
					const isValidPassword = await bcrypt.compare(credentials.password, user.password_hash)

					if (isValidPassword) {
						// Update last login
						await kysely
							.updateTable("users")
							.set({ last_login: new Date().toISOString() })
							.where("id", "=", user.id)
							.execute()

						return {
							id: user.id,
							email: user.email,
							name: user.name,
							image: user.image,
						}
					}
				}

				return null
			},
		}),
	],
	session: {
		strategy: "jwt", // Using JWT for simplicity, could use database sessions
	},
	callbacks: {
		async jwt({ token, user }: any) {
			if (user) {
				token.id = user.id
				token.email = user.email
				token.name = user.name
				token.image = user.image
			}
			return token
		},
		async session({ session, token }: any) {
			if (token && session.user) {
				session.user.id = token.id as string
				session.user.email = token.email as string
				session.user.name = token.name as string
				session.user.image = token.image as string

				// Add user roles to session
				if (session.user.id) {
					const userWithRoles = await rbac.getUserWithRoles(session.user.id)
					if (userWithRoles) {
						;(session as any).user.roles = userWithRoles.roles
					}
				}
			}
			return session
		},
	},
	pages: {
		signIn: "/auth/signin",
		signUp: "/auth/signup",
	},
})
