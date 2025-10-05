import type {
	Invoice,
	PaymentIntent,
	PaymentIntentData,
	PaymentMethod,
	PaymentTransaction,
	PaymentWebhook,
	Refund,
	Subscription,
	SubscriptionData,
	SubscriptionPlan,
	SubscriptionPlanData,
	UpdatePaymentMethodData,
} from "@/types/payment"

/**
 * Payment Repository - Handles all payment-related database operations
 * Following NOORMME repository pattern with type safety
 */
export class PaymentRepository {
	private db: any

	constructor(db: any) {
		this.db = db
	}

	// Payment Methods
	async createPaymentMethod(data: Omit<PaymentMethod, "id" | "createdAt" | "updatedAt">): Promise<PaymentMethod> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("payment_methods")
			.values({
				...data,
				customer_id: data.customerId,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentMethod(result)
	}

	async getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("payment_methods").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapPaymentMethod(result) : null
	}

	async getPaymentMethodsByCustomer(customerId: string): Promise<PaymentMethod[]> {
		const kysely = this.db.getKysely()
		const results = await kysely.selectFrom("payment_methods").where("customer_id", "=", customerId).selectAll().execute()

		return results.map((result: Record<string, any>) => this.mapPaymentMethod(result))
	}

	async updatePaymentMethod(id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.updateTable("payment_methods")
			.set({
				...data,
				updated_at: new Date(),
			})
			.where("id", "=", id)
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentMethod(result)
	}

	async deletePaymentMethod(id: string): Promise<boolean> {
		const kysely = this.db.getKysely()
		const result = await kysely.deleteFrom("payment_methods").where("id", "=", id).execute()

		return result.numDeletedRows > 0
	}

	// Payment Intents
	async createPaymentIntent(data: PaymentIntentData): Promise<PaymentIntent> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("payment_intents")
			.values({
				id: data.id,
				amount: data.amount,
				currency: data.currency,
				customer_id: data.customerId,
				payment_method_id: data.paymentMethodId,
				description: data.description,
				metadata: data.metadata ? JSON.stringify(data.metadata) : null,
				status: "pending",
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentIntent(result)
	}

	async getPaymentIntentById(id: string): Promise<PaymentIntent | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("payment_intents").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapPaymentIntent(result) : null
	}

	async getPaymentIntentsByCustomer(customerId: string, limit = 50, offset = 0): Promise<PaymentIntent[]> {
		const kysely = this.db.getKysely()
		const results = await kysely
			.selectFrom("payment_intents")
			.where("customer_id", "=", customerId)
			.orderBy("created_at", "desc")
			.limit(limit)
			.offset(offset)
			.selectAll()
			.execute()

		return results.map((result: Record<string, any>) => this.mapPaymentIntent(result))
	}

	async updatePaymentIntentStatus(id: string, status: PaymentIntent["status"]): Promise<PaymentIntent> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.updateTable("payment_intents")
			.set({
				status,
				updated_at: new Date(),
			})
			.where("id", "=", id)
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentIntent(result)
	}

	// Payment Transactions
	async createPaymentTransaction(
		data: Omit<PaymentTransaction, "id" | "createdAt" | "updatedAt">,
	): Promise<PaymentTransaction> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("payment_transactions")
			.values({
				id: this.generateId(),
				...data,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentTransaction(result)
	}

	async getPaymentTransactionById(id: string): Promise<PaymentTransaction | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("payment_transactions").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapPaymentTransaction(result) : null
	}

	async getPaymentTransactionsByIntent(paymentIntentId: string): Promise<PaymentTransaction[]> {
		const kysely = this.db.getKysely()
		const results = await kysely
			.selectFrom("payment_transactions")
			.where("payment_intent_id", "=", paymentIntentId)
			.selectAll()
			.execute()

		return results.map((result: Record<string, any>) => this.mapPaymentTransaction(result))
	}

	// Subscriptions
	async createSubscription(data: SubscriptionData): Promise<Subscription> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("subscriptions")
			.values({
				id: data.id,
				customer_id: data.customerId,
				plan_id: data.planId,
				payment_method_id: data.paymentMethodId,
				trial_period_days: data.trialPeriodDays,
				metadata: data.metadata ? JSON.stringify(data.metadata) : null,
				status: "active",
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapSubscription(result)
	}

	async getSubscriptionById(id: string): Promise<Subscription | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("subscriptions").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapSubscription(result) : null
	}

	async getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]> {
		const kysely = this.db.getKysely()
		const results = await kysely.selectFrom("subscriptions").where("customer_id", "=", customerId).selectAll().execute()

		return results.map((result: Record<string, any>) => this.mapSubscription(result))
	}

	async updateSubscriptionStatus(id: string, status: Subscription["status"]): Promise<Subscription> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.updateTable("subscriptions")
			.set({
				status,
				updated_at: new Date(),
			})
			.where("id", "=", id)
			.returningAll()
			.executeTakeFirst()

		return this.mapSubscription(result)
	}

	// Subscription Plans
	async createSubscriptionPlan(data: SubscriptionPlanData): Promise<SubscriptionPlan> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("subscription_plans")
			.values({
				id: data.id,
				name: data.name,
				description: data.description,
				price: data.price,
				currency: data.currency,
				interval: data.interval,
				interval_count: data.intervalCount,
				trial_period_days: data.trialPeriodDays,
				features: JSON.stringify(data.features),
				is_active: data.isActive,
				metadata: data.metadata ? JSON.stringify(data.metadata) : null,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapSubscriptionPlan(result)
	}

	async getSubscriptionPlanById(id: string): Promise<SubscriptionPlan | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("subscription_plans").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapSubscriptionPlan(result) : null
	}

	async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
		const kysely = this.db.getKysely()
		const results = await kysely.selectFrom("subscription_plans").where("is_active", "=", true).selectAll().execute()

		return results.map((result: Record<string, any>) => this.mapSubscriptionPlan(result))
	}

	// Invoices
	async createInvoice(data: Omit<Invoice, "id" | "createdAt" | "updatedAt">): Promise<Invoice> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("invoices")
			.values({
				id: this.generateId(),
				...data,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapInvoice(result)
	}

	async getInvoiceById(id: string): Promise<Invoice | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("invoices").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapInvoice(result) : null
	}

	async getInvoicesByCustomer(customerId: string, limit = 50, offset = 0): Promise<Invoice[]> {
		const kysely = this.db.getKysely()
		const results = await kysely
			.selectFrom("invoices")
			.where("customer_id", "=", customerId)
			.orderBy("created_at", "desc")
			.limit(limit)
			.offset(offset)
			.selectAll()
			.execute()

		return results.map((result: Record<string, any>) => this.mapInvoice(result))
	}

	// Refunds
	async createRefund(data: Omit<Refund, "id" | "createdAt" | "updatedAt">): Promise<Refund> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("refunds")
			.values({
				id: this.generateId(),
				...data,
				created_at: new Date(),
				updated_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapRefund(result)
	}

	async getRefundById(id: string): Promise<Refund | null> {
		const kysely = this.db.getKysely()
		const result = await kysely.selectFrom("refunds").where("id", "=", id).selectAll().executeTakeFirst()

		return result ? this.mapRefund(result) : null
	}

	// Payment Webhooks
	async createPaymentWebhook(data: Omit<PaymentWebhook, "id" | "createdAt">): Promise<PaymentWebhook> {
		const kysely = this.db.getKysely()
		const result = await kysely
			.insertInto("payment_webhooks")
			.values({
				id: this.generateId(),
				...data,
				processed: false,
				created_at: new Date(),
			})
			.returningAll()
			.executeTakeFirst()

		return this.mapPaymentWebhook(result)
	}

	async getUnprocessedWebhooks(): Promise<PaymentWebhook[]> {
		const kysely = this.db.getKysely()
		const results = await kysely.selectFrom("payment_webhooks").where("processed", "=", false).selectAll().execute()

		return results.map((result: Record<string, any>) => this.mapPaymentWebhook(result))
	}

	async markWebhookProcessed(id: string): Promise<void> {
		const kysely = this.db.getKysely()
		await kysely
			.updateTable("payment_webhooks")
			.set({
				processed: true,
				processed_at: new Date(),
			})
			.where("id", "=", id)
			.execute()
	}

	// Helper methods
	private generateId(): string {
		return `pi_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
	}

	// Mapping methods
	private mapPaymentMethod(result: Record<string, any>): PaymentMethod {
		return {
			id: result.id,
			type: result.type,
			provider: result.provider,
			lastFour: result.last_four,
			brand: result.brand,
			expiryMonth: result.expiry_month,
			expiryYear: result.expiry_year,
			isDefault: result.is_default,
			customerId: result.customer_id,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapPaymentIntent(result: Record<string, any>): PaymentIntent {
		return {
			id: result.id,
			amount: result.amount,
			currency: result.currency,
			status: result.status,
			paymentMethodId: result.payment_method_id,
			customerId: result.customer_id,
			description: result.description,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapPaymentTransaction(result: Record<string, any>): PaymentTransaction {
		return {
			id: result.id,
			paymentIntentId: result.payment_intent_id,
			amount: result.amount,
			currency: result.currency,
			status: result.status,
			provider: result.provider,
			providerTransactionId: result.provider_transaction_id,
			fees: result.fees,
			netAmount: result.net_amount,
			description: result.description,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapSubscription(result: Record<string, any>): Subscription {
		return {
			id: result.id,
			customerId: result.customer_id,
			planId: result.plan_id,
			status: result.status,
			currentPeriodStart: new Date(result.current_period_start),
			currentPeriodEnd: new Date(result.current_period_end),
			cancelAtPeriodEnd: result.cancel_at_period_end,
			trialEnd: result.trial_end ? new Date(result.trial_end) : undefined,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapSubscriptionPlan(result: Record<string, any>): SubscriptionPlan {
		return {
			id: result.id,
			name: result.name,
			description: result.description,
			price: result.price,
			currency: result.currency,
			interval: result.interval,
			intervalCount: result.interval_count,
			trialPeriodDays: result.trial_period_days,
			features: result.features ? JSON.parse(result.features) : [],
			isActive: result.is_active,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapInvoice(result: Record<string, any>): Invoice {
		return {
			id: result.id,
			customerId: result.customer_id,
			subscriptionId: result.subscription_id,
			amount: result.amount,
			currency: result.currency,
			status: result.status,
			description: result.description,
			dueDate: result.due_date ? new Date(result.due_date) : undefined,
			paidAt: result.paid_at ? new Date(result.paid_at) : undefined,
			items: result.items ? JSON.parse(result.items) : [],
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapRefund(result: Record<string, any>): Refund {
		return {
			id: result.id,
			transactionId: result.transaction_id,
			amount: result.amount,
			reason: result.reason,
			status: result.status,
			description: result.description,
			metadata: result.metadata ? JSON.parse(result.metadata) : undefined,
			createdAt: new Date(result.created_at),
			updatedAt: new Date(result.updated_at),
		}
	}

	private mapPaymentWebhook(result: Record<string, any>): PaymentWebhook {
		return {
			id: result.id,
			provider: result.provider,
			eventType: result.event_type,
			payload: result.payload ? JSON.parse(result.payload) : {},
			processed: result.processed,
			processedAt: result.processed_at ? new Date(result.processed_at) : undefined,
			createdAt: new Date(result.created_at),
		}
	}
}
