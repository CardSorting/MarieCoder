import { db } from "../src/lib/db"

async function seed() {
	try {
		console.log("🌱 Seeding database with sample data...")

		// Create sample plans
		const plans = [
			{
				id: "plan_free",
				name: "Free",
				description: "Perfect for getting started",
				price: 0,
				currency: "USD",
				interval: "month",
				features: JSON.stringify(["Up to 5 projects", "Basic support", "Community access"]),
				limits: JSON.stringify({
					projects: 5,
					storage: "1GB",
					apiCalls: 1000,
				}),
				isActive: true,
				sortOrder: 1,
			},
			{
				id: "plan_pro",
				name: "Pro",
				description: "For growing teams",
				price: 29.99,
				currency: "USD",
				interval: "month",
				features: JSON.stringify([
					"Unlimited projects",
					"Priority support",
					"Advanced analytics",
					"Team collaboration",
					"API access",
				]),
				limits: JSON.stringify({
					projects: -1, // unlimited
					storage: "100GB",
					apiCalls: 10000,
				}),
				isActive: true,
				sortOrder: 2,
			},
			{
				id: "plan_enterprise",
				name: "Enterprise",
				description: "For large organizations",
				price: 99.99,
				currency: "USD",
				interval: "month",
				features: JSON.stringify([
					"Everything in Pro",
					"Dedicated support",
					"Custom integrations",
					"SSO authentication",
					"Advanced security",
					"SLA guarantee",
				]),
				limits: JSON.stringify({
					projects: -1,
					storage: "1TB",
					apiCalls: -1,
				}),
				isActive: true,
				sortOrder: 3,
			},
		]

		for (const plan of plans) {
			await db.execute(
				`INSERT OR IGNORE INTO plans (id, name, description, price, currency, interval, features, limits, isActive, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					plan.id,
					plan.name,
					plan.description,
					plan.price,
					plan.currency,
					plan.interval,
					plan.features,
					plan.limits,
					plan.isActive,
					plan.sortOrder,
				],
			)
		}

		// Create sample users with enhanced fields
		const users = [
			{
				id: "user_admin",
				email: "admin@example.com",
				name: "Admin User",
				role: "super_admin",
				status: "active",
				timezone: "UTC",
				preferences: JSON.stringify({
					theme: "dark",
					notifications: { email: true, push: true },
					language: "en",
				}),
				emailVerifiedAt: new Date().toISOString(),
			},
			{
				id: "user_customer1",
				email: "customer1@example.com",
				name: "John Doe",
				role: "customer",
				status: "active",
				timezone: "America/New_York",
				preferences: JSON.stringify({
					theme: "light",
					notifications: { email: true, push: false },
					language: "en",
				}),
				emailVerifiedAt: new Date().toISOString(),
			},
			{
				id: "user_customer2",
				email: "customer2@example.com",
				name: "Jane Smith",
				role: "customer",
				status: "active",
				timezone: "Europe/London",
				preferences: JSON.stringify({
					theme: "auto",
					notifications: { email: false, push: true },
					language: "en",
				}),
				emailVerifiedAt: new Date().toISOString(),
			},
		]

		for (const user of users) {
			await db.execute(
				`INSERT OR IGNORE INTO users (id, email, name, role, status, timezone, preferences, emailVerifiedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[user.id, user.email, user.name, user.role, user.status, user.timezone, user.preferences, user.emailVerifiedAt],
			)
		}

		// Create sample subscriptions
		const subscriptions = [
			{
				id: "sub_1",
				userId: "user_customer1",
				planId: "plan_pro",
				status: "active",
				currentPeriodStart: new Date().toISOString(),
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
				stripeSubscriptionId: "sub_1234567890",
				stripeCustomerId: "cus_1234567890",
			},
			{
				id: "sub_2",
				userId: "user_customer2",
				planId: "plan_free",
				status: "active",
				currentPeriodStart: new Date().toISOString(),
				currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
			},
		]

		for (const subscription of subscriptions) {
			await db.execute(
				`INSERT OR IGNORE INTO subscriptions (id, userId, planId, status, currentPeriodStart, currentPeriodEnd, stripeSubscriptionId, stripeCustomerId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					subscription.id,
					subscription.userId,
					subscription.planId,
					subscription.status,
					subscription.currentPeriodStart,
					subscription.currentPeriodEnd,
					subscription.stripeSubscriptionId,
					subscription.stripeCustomerId,
				],
			)
		}

		// Create sample payments
		const payments = [
			{
				id: "payment_1",
				userId: "user_customer1",
				subscriptionId: "sub_1",
				amount: 29.99,
				currency: "USD",
				status: "succeeded",
				provider: "stripe",
				providerId: "pi_1234567890",
				description: "Pro Plan - Monthly",
				metadata: JSON.stringify({
					planName: "Pro",
					period: "monthly",
				}),
			},
			{
				id: "payment_2",
				userId: "user_customer1",
				subscriptionId: "sub_1",
				amount: 29.99,
				currency: "USD",
				status: "succeeded",
				provider: "stripe",
				providerId: "pi_0987654321",
				description: "Pro Plan - Monthly",
				metadata: JSON.stringify({
					planName: "Pro",
					period: "monthly",
				}),
			},
		]

		for (const payment of payments) {
			await db.execute(
				`INSERT OR IGNORE INTO payments (id, userId, subscriptionId, amount, currency, status, provider, providerId, description, metadata) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					payment.id,
					payment.userId,
					payment.subscriptionId,
					payment.amount,
					payment.currency,
					payment.status,
					payment.provider,
					payment.providerId,
					payment.description,
					payment.metadata,
				],
			)
		}

		// Create sample notifications
		const notifications = [
			{
				id: "notif_1",
				userId: "user_customer1",
				type: "welcome",
				title: "Welcome to our platform!",
				message: "Thanks for signing up. Get started by exploring our features.",
				data: JSON.stringify({
					cta: "Get Started",
					ctaUrl: "/dashboard",
				}),
			},
			{
				id: "notif_2",
				userId: "user_customer1",
				type: "payment_success",
				title: "Payment Successful",
				message: "Your Pro Plan subscription has been renewed.",
				data: JSON.stringify({
					amount: 29.99,
					currency: "USD",
				}),
			},
			{
				id: "notif_3",
				userId: "user_customer2",
				type: "feature_update",
				title: "New Feature Available",
				message: "Check out our new analytics dashboard!",
				data: JSON.stringify({
					feature: "analytics_dashboard",
					url: "/analytics",
				}),
			},
		]

		for (const notification of notifications) {
			await db.execute(
				`INSERT OR IGNORE INTO notifications (id, userId, type, title, message, data) VALUES (?, ?, ?, ?, ?, ?)`,
				[
					notification.id,
					notification.userId,
					notification.type,
					notification.title,
					notification.message,
					notification.data,
				],
			)
		}

		// Create sample system settings
		const systemSettings = [
			{
				id: "setting_1",
				key: "app_name",
				value: "NOORMME SAAS",
				type: "string",
				description: "Application name",
				isPublic: true,
			},
			{
				id: "setting_2",
				key: "maintenance_mode",
				value: "false",
				type: "boolean",
				description: "Enable maintenance mode",
				isPublic: false,
			},
			{
				id: "setting_3",
				key: "max_file_size",
				value: "10485760",
				type: "number",
				description: "Maximum file upload size in bytes (10MB)",
				isPublic: true,
			},
			{
				id: "setting_4",
				key: "supported_languages",
				value: JSON.stringify(["en", "es", "fr", "de"]),
				type: "json",
				description: "Supported languages",
				isPublic: true,
			},
		]

		for (const setting of systemSettings) {
			await db.execute(
				`INSERT OR IGNORE INTO system_settings (id, key, value, type, description, isPublic) VALUES (?, ?, ?, ?, ?, ?)`,
				[setting.id, setting.key, setting.value, setting.type, setting.description, setting.isPublic],
			)
		}

		// Create sample audit logs
		const auditLogs = [
			{
				id: "audit_1",
				userId: "user_customer1",
				adminId: null,
				action: "user_signup",
				resourceType: "user",
				resourceId: "user_customer1",
				details: JSON.stringify({
					email: "customer1@example.com",
					source: "web",
				}),
				ipAddress: "192.168.1.100",
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
			{
				id: "audit_2",
				userId: "user_customer1",
				adminId: null,
				action: "subscription_created",
				resourceType: "subscription",
				resourceId: "sub_1",
				details: JSON.stringify({
					planId: "plan_pro",
					amount: 29.99,
				}),
				ipAddress: "192.168.1.100",
				userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
			},
		]

		for (const auditLog of auditLogs) {
			await db.execute(
				`INSERT OR IGNORE INTO audit_logs (id, userId, adminId, action, resourceType, resourceId, details, ipAddress, userAgent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
				[
					auditLog.id,
					auditLog.userId,
					auditLog.adminId,
					auditLog.action,
					auditLog.resourceType,
					auditLog.resourceId,
					auditLog.details,
					auditLog.ipAddress,
					auditLog.userAgent,
				],
			)
		}

		console.log("✅ Database seeded successfully")
		console.log("📧 Admin email: admin@example.com")
		console.log("📧 Customer 1: customer1@example.com")
		console.log("📧 Customer 2: customer2@example.com")
	} catch (error) {
		console.error("❌ Seeding failed:", error)
		process.exit(1)
	}
}

seed()
