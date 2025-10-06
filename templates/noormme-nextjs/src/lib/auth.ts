import NextAuth from "next-auth"
import GitHubProvider from "next-auth/providers/github"
import GoogleProvider from "next-auth/providers/google"
import { db } from "./db"

/**
 * NextAuth configuration following NORMIE DEV methodology
 * Unified authentication setup
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
	],
	session: {
		strategy: "database",
	},
	callbacks: {
		async session({ session, user }) {
			if (session.user) {
				session.user.id = user.id
				session.user.role = user.role || "user"
			}
			return session
		},
		async signIn({ user }) {
			// Auto-create user if they don't exist
			const userRepo = db.getRepository("users")
			const existingUser = await userRepo.findByEmail(user.email!)

			if (!existingUser) {
				await userRepo.create({
					email: user.email!,
					name: user.name!,
					role: "user",
				})
			}

			return true
		},
	},
	pages: {
		signIn: "/auth/signin",
		signUp: "/auth/signup",
	},
})
