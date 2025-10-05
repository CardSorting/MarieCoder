#!/usr/bin/env tsx

/**
 * NOORMME Payment Services Template
 *
 * This is a demonstration of how to use the payment services
 * in a Node.js backend application.
 */

import { PaymentService } from "@/services/PaymentService"
import { PayPalService } from "@/services/PayPalService"
import { StripeService } from "@/services/StripeService"
import { UserService } from "@/services/UserService"

async function main() {
	console.log("🚀 NOORMME Payment Services Template")
	console.log("=====================================\n")

	try {
		// Initialize services
		const userService = new UserService()
		const paymentService = await PaymentService.getInstance()
		const stripeService = new StripeService()
		const paypalService = new PayPalService()

		console.log("✅ Services initialized successfully\n")

		// Example: Create a user
		console.log("👤 Creating a test user...")
		const user = await userService.createUser({
			email: "test@example.com",
			name: "Test User",
		})
		console.log("✅ User created:", user.email)

		// Example: Create a payment intent
		console.log("\n💰 Creating payment intent...")
		const paymentIntent = await paymentService.createPaymentIntent({
			amount: 1000, // $10.00
			currency: "usd",
			customerId: user.id,
			description: "Test payment",
			metadata: {
				userId: user.id,
				provider: "stripe",
			},
		})
		console.log("✅ Payment intent created:", paymentIntent.id)

		console.log("\n🎉 All examples completed successfully!")
		console.log("\n📚 Next steps:")
		console.log("1. Configure your payment provider credentials")
		console.log("2. Set up your database connection")
		console.log("3. Customize the services for your needs")
		console.log("4. Add your business logic")
	} catch (error) {
		console.error("❌ Error:", error)
		process.exit(1)
	}
}

// Run the main function if this file is executed directly
if (require.main === module) {
	main()
}

export { main }
