import { NOORMME } from "noormme"
import { BaseService } from "./BaseService"

export interface Payment {
	id: string
	userId: string
	amount: number
	currency: string
	status: "pending" | "completed" | "failed" | "refunded"
	provider: "stripe" | "paypal"
	providerId: string
	createdAt: Date
	updatedAt: Date
}

export interface CreatePaymentData {
	userId: string
	amount: number
	currency: string
	provider: "stripe" | "paypal"
	providerId: string
}

/**
 * Unified payment service following NORMIE DEV methodology
 * Handles all payment-related business logic
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
			status: "pending" as const,
		}

		return await this.create(paymentData)
	}

	/**
	 * Update payment status
	 */
	async updateStatus(paymentId: string, status: Payment["status"]): Promise<Payment> {
		return await this.update(paymentId, { status })
	}

	/**
	 * Get payments by user
	 */
	async findByUser(userId: string): Promise<Payment[]> {
		return await this.findBy({ userId })
	}

	/**
	 * Get payments by status
	 */
	async findByStatus(status: Payment["status"]): Promise<Payment[]> {
		return await this.findBy({ status })
	}

	/**
	 * Get payments by provider
	 */
	async findByProvider(provider: Payment["provider"]): Promise<Payment[]> {
		return await this.findBy({ provider })
	}

	/**
	 * Calculate total revenue
	 */
	async getTotalRevenue(): Promise<number> {
		const completedPayments = await this.findByStatus("completed")
		return completedPayments.reduce((total, payment) => total + payment.amount, 0)
	}
}
