/**
 * Payment Database Service Provider
 * Specialized database service for payment-related operations
 * Following NOORMME service layer pattern with Kysely queries
 */

import { Kysely } from "kysely"
import type {
	PaymentIntent,
	PaymentMethod,
	PaymentTransaction,
	PaymentWebhook,
	Subscription,
	SubscriptionPlan,
} from "@/types/payment"
import { DatabaseConnectionManager } from "../connection/DatabaseConnectionManager"
import { KyselyQueryBuilder, PaginationOptions, QueryResult } from "../utils/KyselyQueryBuilder"

export interface PaymentDatabaseConfig {
	connectionName?: string
	enableCaching?: boolean
	cacheTTL?: number
	enableMonitoring?: boolean
}

export class PaymentDatabaseService {
	private db: Kysely<any>
	private connectionManager: DatabaseConnectionManager
	private config: PaymentDatabaseConfig

	constructor(connectionManager: DatabaseConnectionManager, config: PaymentDatabaseConfig = {}) {
		this.connectionManager = connectionManager
		this.config = {
			connectionName: "default",
			enableCaching: true,
			cacheTTL: 300000, // 5 minutes
			enableMonitoring: true,
			...config,
		}

		this.db = this.connectionManager.getKysely(this.config.connectionName)
	}

	// Payment Methods

	async createPaymentMethod(data: Partial<PaymentMethod>): Promise<PaymentMethod> {
		const query = () => this.db.insertInto("payment_methods").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createPaymentMethod")
		return this.mapPaymentMethod(result)
	}

	async getPaymentMethodById(id: string): Promise<PaymentMethod | null> {
		const query = () =>
			this.db
				.selectFrom("payment_methods")
				.selectAll()
				.where("id", "=", id)
				.where("deletedAt", "is", null)
				.executeTakeFirst()

		const result = await this.executeQuery(query, "getPaymentMethodById")
		return result ? this.mapPaymentMethod(result) : null
	}

	async getPaymentMethodsByCustomer(customerId: string): Promise<PaymentMethod[]> {
		const query = () =>
			this.db
				.selectFrom("payment_methods")
				.selectAll()
				.where("customerId", "=", customerId)
				.where("deletedAt", "is", null)
				.orderBy("createdAt", "desc")
				.execute()

		const results = await this.executeQuery(query, "getPaymentMethodsByCustomer")
		return results.map(this.mapPaymentMethod)
	}

	async updatePaymentMethod(id: string, data: Partial<PaymentMethod>): Promise<PaymentMethod> {
		const query = () =>
			this.db
				.updateTable("payment_methods")
				.set({ ...data, updatedAt: new Date() })
				.where("id", "=", id)
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "updatePaymentMethod")
		return this.mapPaymentMethod(result)
	}

	async deletePaymentMethod(id: string): Promise<void> {
		const query = () => this.db.updateTable("payment_methods").set({ deletedAt: new Date() }).where("id", "=", id).execute()

		await this.executeQuery(query, "deletePaymentMethod")
	}

	// Payment Intents

	async createPaymentIntent(data: Partial<PaymentIntent>): Promise<PaymentIntent> {
		const query = () => this.db.insertInto("payment_intents").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createPaymentIntent")
		return this.mapPaymentIntent(result)
	}

	async getPaymentIntentById(id: string): Promise<PaymentIntent | null> {
		const query = () => this.db.selectFrom("payment_intents").selectAll().where("id", "=", id).executeTakeFirst()

		const result = await this.executeQuery(query, "getPaymentIntentById")
		return result ? this.mapPaymentIntent(result) : null
	}

	async getPaymentIntentsByCustomer(customerId: string, options?: PaginationOptions): Promise<QueryResult<PaymentIntent>> {
		const query = this.db
			.selectFrom("payment_intents")
			.selectAll()
			.where("customerId", "=", customerId)
			.orderBy("createdAt", "desc")

		if (options) {
			return KyselyQueryBuilder.executePaginated(query, options)
		}

		const results = await this.executeQuery(() => query.execute(), "getPaymentIntentsByCustomer")
		return { data: results.map(this.mapPaymentIntent) }
	}

	async updatePaymentIntentStatus(id: string, status: string): Promise<PaymentIntent> {
		const query = () =>
			this.db
				.updateTable("payment_intents")
				.set({ status, updatedAt: new Date() })
				.where("id", "=", id)
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "updatePaymentIntentStatus")
		return this.mapPaymentIntent(result)
	}

	// Payment Transactions

	async createPaymentTransaction(data: Partial<PaymentTransaction>): Promise<PaymentTransaction> {
		const query = () => this.db.insertInto("payment_transactions").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createPaymentTransaction")
		return this.mapPaymentTransaction(result)
	}

	async getPaymentTransactionById(id: string): Promise<PaymentTransaction | null> {
		const query = () => this.db.selectFrom("payment_transactions").selectAll().where("id", "=", id).executeTakeFirst()

		const result = await this.executeQuery(query, "getPaymentTransactionById")
		return result ? this.mapPaymentTransaction(result) : null
	}

	async getPaymentTransactionsByIntent(paymentIntentId: string): Promise<PaymentTransaction[]> {
		const query = () =>
			this.db
				.selectFrom("payment_transactions")
				.selectAll()
				.where("paymentIntentId", "=", paymentIntentId)
				.orderBy("createdAt", "desc")
				.execute()

		const results = await this.executeQuery(query, "getPaymentTransactionsByIntent")
		return results.map(this.mapPaymentTransaction)
	}

	async getPaymentTransactionsByDateRange(
		startDate: Date,
		endDate: Date,
		options?: PaginationOptions,
	): Promise<QueryResult<PaymentTransaction>> {
		const query = this.db
			.selectFrom("payment_transactions")
			.selectAll()
			.where("createdAt", ">=", startDate)
			.where("createdAt", "<=", endDate)
			.orderBy("createdAt", "desc")

		if (options) {
			return KyselyQueryBuilder.executePaginated(query, options)
		}

		const results = await this.executeQuery(() => query.execute(), "getPaymentTransactionsByDateRange")
		return { data: results.map(this.mapPaymentTransaction) }
	}

	// Subscriptions

	async createSubscription(data: Partial<Subscription>): Promise<Subscription> {
		const query = () => this.db.insertInto("subscriptions").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createSubscription")
		return this.mapSubscription(result)
	}

	async getSubscriptionById(id: string): Promise<Subscription | null> {
		const query = () => this.db.selectFrom("subscriptions").selectAll().where("id", "=", id).executeTakeFirst()

		const result = await this.executeQuery(query, "getSubscriptionById")
		return result ? this.mapSubscription(result) : null
	}

	async getSubscriptionsByCustomer(customerId: string): Promise<Subscription[]> {
		const query = () =>
			this.db
				.selectFrom("subscriptions")
				.selectAll()
				.where("customerId", "=", customerId)
				.orderBy("createdAt", "desc")
				.execute()

		const results = await this.executeQuery(query, "getSubscriptionsByCustomer")
		return results.map(this.mapSubscription)
	}

	async updateSubscriptionStatus(id: string, status: string): Promise<Subscription> {
		const query = () =>
			this.db
				.updateTable("subscriptions")
				.set({ status, updatedAt: new Date() })
				.where("id", "=", id)
				.returningAll()
				.executeTakeFirst()

		const result = await this.executeQuery(query, "updateSubscriptionStatus")
		return this.mapSubscription(result)
	}

	// Subscription Plans

	async createSubscriptionPlan(data: Partial<SubscriptionPlan>): Promise<SubscriptionPlan> {
		const query = () => this.db.insertInto("subscription_plans").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createSubscriptionPlan")
		return this.mapSubscriptionPlan(result)
	}

	async getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
		const query = () =>
			this.db.selectFrom("subscription_plans").selectAll().where("active", "=", true).orderBy("price", "asc").execute()

		const results = await this.executeQuery(query, "getActiveSubscriptionPlans")
		return results.map(this.mapSubscriptionPlan)
	}

	// Payment Webhooks

	async createPaymentWebhook(data: Partial<PaymentWebhook>): Promise<PaymentWebhook> {
		const query = () => this.db.insertInto("payment_webhooks").values(data).returningAll().executeTakeFirst()

		const result = await this.executeQuery(query, "createPaymentWebhook")
		return this.mapPaymentWebhook(result)
	}

	async getPaymentWebhookById(id: string): Promise<PaymentWebhook | null> {
		const query = () => this.db.selectFrom("payment_webhooks").selectAll().where("id", "=", id).executeTakeFirst()

		const result = await this.executeQuery(query, "getPaymentWebhookById")
		return result ? this.mapPaymentWebhook(result) : null
	}

	async getUnprocessedWebhooks(): Promise<PaymentWebhook[]> {
		const query = () =>
			this.db
				.selectFrom("payment_webhooks")
				.selectAll()
				.where("processed", "=", false)
				.where("retryCount", "<", 3)
				.orderBy("createdAt", "asc")
				.execute()

		const results = await this.executeQuery(query, "getUnprocessedWebhooks")
		return results.map(this.mapPaymentWebhook)
	}

	async markWebhookProcessed(id: string): Promise<void> {
		const query = () =>
			this.db
				.updateTable("payment_webhooks")
				.set({ processed: true, processedAt: new Date() })
				.where("id", "=", id)
				.execute()

		await this.executeQuery(query, "markWebhookProcessed")
	}

	async markWebhookFailed(id: string, error: string): Promise<void> {
		const query = () =>
			this.db
				.updateTable("payment_webhooks")
				.set({
					processed: false,
					error,
					retryCount: this.db
						.selectFrom("payment_webhooks")
						.select("retryCount")
						.where("id", "=", id)
						.executeTakeFirst()
						.then((r) => (r?.retryCount || 0) + 1),
				})
				.where("id", "=", id)
				.execute()

		await this.executeQuery(query, "markWebhookFailed")
	}

	// Analytics Queries

	async getRevenueByDateRange(
		startDate: Date,
		endDate: Date,
	): Promise<{
		totalRevenue: number
		transactionCount: number
		averageTransactionValue: number
	}> {
		const query = () =>
			this.db
				.selectFrom("payment_transactions")
				.select([
					(eb) => eb.fn.sum("amount").as("totalRevenue"),
					(eb) => eb.fn.count("id").as("transactionCount"),
					(eb) => eb.fn.avg("amount").as("averageTransactionValue"),
				])
				.where("status", "=", "completed")
				.where("createdAt", ">=", startDate)
				.where("createdAt", "<=", endDate)
				.executeTakeFirst()

		const result = await this.executeQuery(query, "getRevenueByDateRange")
		return {
			totalRevenue: Number(result?.totalRevenue || 0),
			transactionCount: Number(result?.transactionCount || 0),
			averageTransactionValue: Number(result?.averageTransactionValue || 0),
		}
	}

	async getProviderStats(
		startDate: Date,
		endDate: Date,
	): Promise<
		Array<{
			provider: string
			revenue: number
			transactionCount: number
			successRate: number
		}>
	> {
		const query = () =>
			this.db
				.selectFrom("payment_transactions")
				.select([
					"provider",
					(eb) => eb.fn.sum("amount").as("revenue"),
					(eb) => eb.fn.count("id").as("transactionCount"),
					(eb) => eb.fn.count("id").filterWhere("status", "=", "completed").as("successCount"),
				])
				.where("createdAt", ">=", startDate)
				.where("createdAt", "<=", endDate)
				.groupBy("provider")
				.execute()

		const results = await this.executeQuery(query, "getProviderStats")
		return results.map((result) => ({
			provider: result.provider,
			revenue: Number(result.revenue || 0),
			transactionCount: Number(result.transactionCount || 0),
			successRate:
				Number(result.transactionCount) > 0
					? (Number(result.successCount || 0) / Number(result.transactionCount)) * 100
					: 0,
		}))
	}

	// Private methods

	private async executeQuery<T>(queryFn: () => Promise<T>, queryName: string): Promise<T> {
		if (this.config.enableMonitoring) {
			return KyselyQueryBuilder.executeWithMonitoring(queryFn, queryName)
		}

		if (this.config.enableCaching) {
			const cacheKey = `${queryName}_${JSON.stringify(arguments)}`
			return KyselyQueryBuilder.executeWithCache(queryFn, cacheKey, this.config.cacheTTL)
		}

		return queryFn()
	}

	// Mapping methods

	private mapPaymentMethod(data: any): PaymentMethod {
		return {
			id: data.id,
			customerId: data.customerId,
			provider: data.provider,
			providerPaymentMethodId: data.providerPaymentMethodId,
			type: data.type,
			card: data.card ? JSON.parse(data.card) : undefined,
			paypal: data.paypal ? JSON.parse(data.paypal) : undefined,
			isDefault: data.isDefault,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}

	private mapPaymentIntent(data: any): PaymentIntent {
		return {
			id: data.id,
			customerId: data.customerId,
			amount: data.amount,
			currency: data.currency,
			status: data.status,
			provider: data.provider,
			providerPaymentIntentId: data.providerPaymentIntentId,
			paymentMethodId: data.paymentMethodId,
			description: data.description,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}

	private mapPaymentTransaction(data: any): PaymentTransaction {
		return {
			id: data.id,
			paymentIntentId: data.paymentIntentId,
			amount: data.amount,
			currency: data.currency,
			status: data.status,
			provider: data.provider,
			providerTransactionId: data.providerTransactionId,
			fees: data.fees,
			netAmount: data.netAmount,
			description: data.description,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}

	private mapSubscription(data: any): Subscription {
		return {
			id: data.id,
			customerId: data.customerId,
			planId: data.planId,
			status: data.status,
			currentPeriodStart: new Date(data.currentPeriodStart),
			currentPeriodEnd: new Date(data.currentPeriodEnd),
			cancelAtPeriodEnd: data.cancelAtPeriodEnd,
			trialStart: data.trialStart ? new Date(data.trialStart) : undefined,
			trialEnd: data.trialEnd ? new Date(data.trialEnd) : undefined,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}

	private mapSubscriptionPlan(data: any): SubscriptionPlan {
		return {
			id: data.id,
			name: data.name,
			description: data.description,
			price: data.price,
			currency: data.currency,
			interval: data.interval,
			intervalCount: data.intervalCount,
			trialPeriodDays: data.trialPeriodDays,
			active: data.active,
			metadata: data.metadata ? JSON.parse(data.metadata) : undefined,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}

	private mapPaymentWebhook(data: any): PaymentWebhook {
		return {
			id: data.id,
			provider: data.provider,
			eventType: data.eventType,
			payload: data.payload ? JSON.parse(data.payload) : undefined,
			processed: data.processed,
			processedAt: data.processedAt ? new Date(data.processedAt) : undefined,
			retryCount: data.retryCount,
			error: data.error,
			createdAt: new Date(data.createdAt),
			updatedAt: new Date(data.updatedAt),
		}
	}
}
