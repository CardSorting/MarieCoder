import type { ExpressionBuilder, NOORMME } from "@/types/database"
import { BaseService } from "./BaseService"

export interface Payment {
	id: string
	userId: string
	subscriptionId?: string
	amount: number
	currency: string
	status: "pending" | "succeeded" | "failed" | "canceled" | "refunded"
	provider: "stripe" | "paypal" | "manual"
	providerId?: string
	providerData: Record<string, any>
	description?: string
	metadata: Record<string, any>
	createdAt: Date
	updatedAt: Date
}

export interface CreatePaymentData {
	userId: string
	subscriptionId?: string
	amount: number
	currency?: string
	provider: Payment["provider"]
	providerId?: string
	description?: string
	metadata?: Record<string, any>
}

export interface PaymentStats {
	totalRevenue: number
	monthlyRevenue: number
	successfulPayments: number
	failedPayments: number
	averagePaymentAmount: number
	revenueByProvider: Record<string, number>
}

/**
 * Payment service following NORMIE DEV methodology
 * Handles payment processing and billing
 */
export class PaymentService extends BaseService<Payment> {
	constructor(db: NOORMME) {
		super(db.getRepository("payments"), db)
	}

	/**
	 * Create a new payment
	 */
	async createPayment(data: CreatePaymentData): Promise<Payment> {
		const paymentData = {
			...data,
			currency: data.currency || "USD",
			status: "pending" as const,
			providerData: {},
			metadata: data.metadata || {},
		}

		return await this.create(paymentData)
	}

	/**
	 * Update payment status
	 */
	async updatePaymentStatus(
		paymentId: string,
		status: Payment["status"],
		providerData?: Record<string, any>,
	): Promise<Payment> {
		const updateData: Partial<Payment> = {
			status,
			updatedAt: new Date(),
		}

		if (providerData) {
			updateData.providerData = providerData
		}

		return await this.update(paymentId, updateData)
	}

	/**
	 * Get user's payment history
	 */
	async getUserPayments(userId: string, page = 1, limit = 20): Promise<{ payments: Payment[]; total: number; pages: number }> {
		const offset = (page - 1) * limit

		const payments = await this.db
			.getKysely()
			.selectFrom("payments")
			.selectAll()
			.where("userId", "=", userId)
			.orderBy("createdAt", "desc")
			.limit(limit)
			.offset(offset)
			.execute()

		const total = await this.repository.count({ userId })

		return {
			payments,
			total,
			pages: Math.ceil(total / limit),
		}
	}

	/**
	 * Get payments by subscription
	 */
	async getSubscriptionPayments(subscriptionId: string): Promise<Payment[]> {
		return await this.findBy({ subscriptionId })
	}

	/**
	 * Get payment statistics
	 */
	async getPaymentStats(): Promise<PaymentStats> {
		const totalRevenue = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total"))
			.where("status", "=", "succeeded")
			.executeTakeFirst()

		// Monthly revenue
		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)

		const monthlyRevenue = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total"))
			.where("status", "=", "succeeded")
			.where("createdAt", ">=", startOfMonth.toISOString())
			.executeTakeFirst()

		const successfulPayments = await this.repository.count({ status: "succeeded" })
		const failedPayments = await this.repository.count({ status: "failed" })

		const averagePaymentAmount = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.avg("amount").as("average"))
			.where("status", "=", "succeeded")
			.executeTakeFirst()

		// Revenue by provider
		const revenueByProvider = await this.db
			.getKysely()
			.selectFrom("payments")
			.select(["provider", (eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total")])
			.where("status", "=", "succeeded")
			.groupBy("provider")
			.execute()

		const providerStats = revenueByProvider.reduce(
			(acc: Record<string, number>, row: any) => {
				acc[row.provider] = Number(row.total)
				return acc
			},
			{} as Record<string, number>,
		)

		return {
			totalRevenue: Number(totalRevenue?.total || 0),
			monthlyRevenue: Number(monthlyRevenue?.total || 0),
			successfulPayments,
			failedPayments,
			averagePaymentAmount: Number(averagePaymentAmount?.average || 0),
			revenueByProvider: providerStats,
		}
	}

	/**
	 * Process refund
	 */
	async processRefund(paymentId: string, amount?: number, reason?: string): Promise<Payment> {
		const payment = await this.findById(paymentId)
		if (!payment) {
			throw new Error("Payment not found")
		}

		if (payment.status !== "succeeded") {
			throw new Error("Only successful payments can be refunded")
		}

		const refundAmount = amount || payment.amount
		if (refundAmount > payment.amount) {
			throw new Error("Refund amount cannot exceed payment amount")
		}

		// In a real implementation, you would call the payment provider's refund API here
		// For demo purposes, we'll just update the status

		return await this.update(paymentId, {
			status: "refunded",
			metadata: {
				...payment.metadata,
				refundAmount,
				refundReason: reason,
				refundedAt: new Date().toISOString(),
			},
			updatedAt: new Date(),
		})
	}

	/**
	 * Get failed payments for retry
	 */
	async getFailedPayments(): Promise<Payment[]> {
		return await this.findBy({ status: "failed" })
	}

	/**
	 * Retry failed payment
	 */
	async retryPayment(paymentId: string): Promise<Payment> {
		const payment = await this.findById(paymentId)
		if (!payment) {
			throw new Error("Payment not found")
		}

		if (payment.status !== "failed") {
			throw new Error("Only failed payments can be retried")
		}

		// In a real implementation, you would retry the payment with the provider
		// For demo purposes, we'll just reset the status to pending

		return await this.update(paymentId, {
			status: "pending",
			updatedAt: new Date(),
		})
	}

	/**
	 * Get revenue analytics
	 */
	async getRevenueAnalytics(
		period: "day" | "week" | "month" | "year" = "month",
	): Promise<Array<{ date: string; revenue: number }>> {
		let dateFormat: string

		switch (period) {
			case "day":
				dateFormat = "%Y-%m-%d"
				break
			case "week":
				dateFormat = "%Y-%W"
				break
			case "month":
				dateFormat = "%Y-%m"
				break
			case "year":
				dateFormat = "%Y"
				break
		}

		const analytics = await this.db
			.getKysely()
			.selectFrom("payments")
			.select([
				(eb: any) => eb.fn("strftime", [dateFormat, "createdAt"]).as("date"),
				(eb: any) => eb.fn.sum("amount").as("revenue"),
			])
			.where("status", "=", "succeeded")
			.groupBy((eb: any) => eb.fn("strftime", [dateFormat, "createdAt"]))
			.orderBy("date", "asc")
			.execute()

		return analytics.map((row: any) => ({
			date: row.date,
			revenue: Number(row.revenue || 0),
		}))
	}
}
