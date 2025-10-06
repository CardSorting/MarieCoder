import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { db } from "./db"

/**
 * NextAuth configuration following NORMIE DEV methodology
 * Enhanced authentication with role-based access control
 */

export const { handlers, auth, signIn, signOut } = NextAuth({
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
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) {
					return null
				}

				const userRepo = db.getRepository("users")
				const user = await userRepo.findByEmail(credentials.email)

				if (!user || user.status !== "active") {
					return null
				}

				// In a real app, you'd hash and compare passwords
				// For demo purposes, we'll use a simple check
				const validPassword = credentials.password === "password123"

				if (!validPassword) {
					return null
				}

				// Update last login
				await userRepo.update(user.id, {
					lastLoginAt: new Date().toISOString(),
				})

				return {
					id: user.id,
					email: user.email,
					name: user.name,
					role: user.role,
					status: user.status,
				}
			},
		}),
	],
	session: {
		strategy: "jwt",
		maxAge: 30 * 24 * 60 * 60, // 30 days
	},
	callbacks: {
		async jwt({ token, user, account }) {
			if (user) {
				token.id = user.id
				token.role = user.role
				token.status = user.status
			}

			if (account) {
				token.provider = account.provider
			}

			return token
		},
		async session({ session, token }) {
			if (token) {
				session.user.id = token.id as string
				session.user.role = token.role as string
				session.user.status = token.status as string
				session.user.provider = token.provider as string
			}
			return session
		},
		async signIn({ user, account, _profile }) {
			// Auto-create user if they don't exist (for OAuth providers)
			if (account?.provider === "google" || account?.provider === "github") {
				const userRepo = db.getRepository("users")
				const existingUser = await userRepo.findByEmail(user.email!)

				if (!existingUser) {
					await userRepo.create({
						email: user.email!,
						name: user.name!,
						role: "customer",
						status: "active",
						emailVerifiedAt: new Date().toISOString(),
						lastLoginAt: new Date().toISOString(),
						preferences: JSON.stringify({
							theme: "auto",
							notifications: { email: true, push: true },
							language: "en",
						}),
					})
				} else {
					// Update last login for existing users
					await userRepo.update(existingUser.id, {
						lastLoginAt: new Date().toISOString(),
					})
				}
			}

			return true
		},
	},
	pages: {
		signIn: "/auth/signin",
		error: "/auth/error",
	},
	events: {
		async signOut({ session }) {
			// Log sign out event
			if (session?.user?.id) {
				const auditRepo = db.getRepository("audit_logs")
				await auditRepo.create({
					userId: session.user.id,
					action: "user_signout",
					resourceType: "session",
					details: JSON.stringify({
						provider: session.user.provider,
					}),
				})
			}
		},
	},
})
