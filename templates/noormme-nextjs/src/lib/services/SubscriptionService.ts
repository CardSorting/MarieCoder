import type { ExpressionBuilder, NOORMME } from "@/types/database"
import { BaseService } from "./BaseService"

export interface Subscription {
	id: string
	userId: string
	planId: string
	status: "active" | "canceled" | "past_due" | "unpaid" | "trialing"
	currentPeriodStart: Date
	currentPeriodEnd: Date
	cancelAtPeriodEnd: boolean
	canceledAt?: Date
	trialStart?: Date
	trialEnd?: Date
	stripeSubscriptionId?: string
	stripeCustomerId?: string
	createdAt: Date
	updatedAt: Date
}

export interface Plan {
	id: string
	name: string
	description?: string
	price: number
	currency: string
	interval: "month" | "year"
	features: string[]
	limits: Record<string, any>
	isActive: boolean
	sortOrder: number
	createdAt: Date
	updatedAt: Date
}

export interface CreateSubscriptionData {
	userId: string
	planId: string
	trialStart?: Date
	trialEnd?: Date
	stripeSubscriptionId?: string
	stripeCustomerId?: string
}

export interface SubscriptionStats {
	totalSubscriptions: number
	activeSubscriptions: number
	trialingSubscriptions: number
	canceledSubscriptions: number
	revenueThisMonth: number
	churnRate: number
}

/**
 * Subscription service following NORMIE DEV methodology
 * Handles subscription and plan management
 */
export class SubscriptionService extends BaseService<Subscription> {
	constructor(db: NOORMME) {
		super(db.getRepository("subscriptions"), db)
	}

	/**
	 * Create a new subscription
	 */
	async createSubscription(data: CreateSubscriptionData): Promise<Subscription> {
		const plan = await this.getPlan(data.planId)
		if (!plan || !plan.isActive) {
			throw new Error("Plan not found or inactive")
		}

		// Check if user already has an active subscription
		const existingSubscription = await this.getActiveSubscription(data.userId)
		if (existingSubscription) {
			throw new Error("User already has an active subscription")
		}

		const now = new Date()
		const periodEnd = new Date(now)
		periodEnd.setMonth(periodEnd.getMonth() + (plan.interval === "year" ? 12 : 1))

		const subscriptionData = {
			...data,
			status: "active" as const,
			currentPeriodStart: now,
			currentPeriodEnd: periodEnd,
			cancelAtPeriodEnd: false,
		}

		return await this.create(subscriptionData)
	}

	/**
	 * Get user's active subscription
	 */
	async getActiveSubscription(userId: string): Promise<Subscription | null> {
		return await this.findOneBy({
			userId,
			status: "active",
		})
	}

	/**
	 * Get user's current subscription with plan details
	 */
	async getCurrentSubscription(userId: string): Promise<(Subscription & { plan: Plan }) | null> {
		const subscription = await this.getActiveSubscription(userId)
		if (!subscription) {
			return null
		}

		const plan = await this.getPlan(subscription.planId)
		if (!plan) {
			return null
		}

		return { ...subscription, plan }
	}

	/**
	 * Cancel subscription
	 */
	async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd = true): Promise<Subscription> {
		const subscription = await this.findById(subscriptionId)
		if (!subscription) {
			throw new Error("Subscription not found")
		}

		if (subscription.status === "canceled") {
			throw new Error("Subscription already canceled")
		}

		const updateData: Partial<Subscription> = {
			cancelAtPeriodEnd,
			updatedAt: new Date(),
		}

		if (!cancelAtPeriodEnd) {
			updateData.status = "canceled"
			updateData.canceledAt = new Date()
		}

		return await this.update(subscriptionId, updateData)
	}

	/**
	 * Reactivate canceled subscription
	 */
	async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
		const subscription = await this.findById(subscriptionId)
		if (!subscription) {
			throw new Error("Subscription not found")
		}

		if (subscription.status !== "canceled") {
			throw new Error("Only canceled subscriptions can be reactivated")
		}

		// Extend the period if it has ended
		const now = new Date()
		let currentPeriodEnd = subscription.currentPeriodEnd

		if (currentPeriodEnd < now) {
			const plan = await this.getPlan(subscription.planId)
			if (!plan) {
				throw new Error("Plan not found")
			}

			currentPeriodEnd = new Date(now)
			currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + (plan.interval === "year" ? 12 : 1))
		}

		return await this.update(subscriptionId, {
			status: "active",
			cancelAtPeriodEnd: false,
			canceledAt: undefined,
			currentPeriodEnd,
			updatedAt: new Date(),
		})
	}

	/**
	 * Update subscription plan
	 */
	async changePlan(subscriptionId: string, newPlanId: string): Promise<Subscription> {
		const subscription = await this.findById(subscriptionId)
		if (!subscription) {
			throw new Error("Subscription not found")
		}

		const newPlan = await this.getPlan(newPlanId)
		if (!newPlan || !newPlan.isActive) {
			throw new Error("New plan not found or inactive")
		}

		// Calculate proration if needed
		const now = new Date()
		const _daysRemaining = Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

		return await this.update(subscriptionId, {
			planId: newPlanId,
			updatedAt: new Date(),
		})
	}

	/**
	 * Get all plans
	 */
	async getPlans(): Promise<Plan[]> {
		const planRepo = this.db.getRepository("plans")
		return (await planRepo.findAll()) as Plan[]
	}

	/**
	 * Get active plans
	 */
	async getActivePlans(): Promise<Plan[]> {
		const planRepo = this.db.getRepository("plans")
		return (await planRepo.findBy({ isActive: true })) as Plan[]
	}

	/**
	 * Get plan by ID
	 */
	async getPlan(planId: string): Promise<Plan | null> {
		const planRepo = this.db.getRepository("plans")
		return (await planRepo.findById(planId)) as Plan | null
	}

	/**
	 * Create a new plan
	 */
	async createPlan(planData: Omit<Plan, "id" | "createdAt" | "updatedAt">): Promise<Plan> {
		const planRepo = this.db.getRepository("plans")
		return (await planRepo.create(planData)) as Plan
	}

	/**
	 * Update plan
	 */
	async updatePlan(planId: string, data: Partial<Plan>): Promise<Plan> {
		const planRepo = this.db.getRepository("plans")
		return (await planRepo.update(planId, data)) as Plan
	}

	/**
	 * Get subscription statistics
	 */
	async getSubscriptionStats(): Promise<SubscriptionStats> {
		const totalSubscriptions = await this.repository.count()
		const activeSubscriptions = await this.repository.count({ status: "active" })
		const trialingSubscriptions = await this.repository.count({ status: "trialing" })
		const canceledSubscriptions = await this.repository.count({ status: "canceled" })

		// Calculate revenue this month
		const startOfMonth = new Date()
		startOfMonth.setDate(1)
		startOfMonth.setHours(0, 0, 0, 0)

		const revenueThisMonth = await this.db
			.getKysely()
			.selectFrom("payments")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.sum("amount").as("total"))
			.where("status", "=", "succeeded")
			.where("createdAt", ">=", startOfMonth.toISOString())
			.executeTakeFirst()

		// Calculate churn rate (simplified)
		const lastMonth = new Date()
		lastMonth.setMonth(lastMonth.getMonth() - 1)

		const canceledLastMonth = await this.db
			.getKysely()
			.selectFrom("subscriptions")
			.select((eb: ExpressionBuilder<any, any, any>) => eb.fn.count("id").as("count"))
			.where("canceledAt", ">=", lastMonth.toISOString())
			.executeTakeFirst()

		const churnRate = totalSubscriptions > 0 ? (Number(canceledLastMonth?.count || 0) / totalSubscriptions) * 100 : 0

		return {
			totalSubscriptions,
			activeSubscriptions,
			trialingSubscriptions,
			canceledSubscriptions,
			revenueThisMonth: Number(revenueThisMonth?.total || 0),
			churnRate,
		}
	}

	/**
	 * Get subscriptions expiring soon
	 */
	async getExpiringSubscriptions(days = 7): Promise<Subscription[]> {
		const expiryDate = new Date()
		expiryDate.setDate(expiryDate.getDate() + days)

		return await this.db
			.getKysely()
			.selectFrom("subscriptions")
			.selectAll()
			.where("status", "=", "active")
			.where("currentPeriodEnd", "<=", expiryDate.toISOString())
			.execute()
	}

	/**
	 * Process subscription renewals
	 */
	async processRenewals(): Promise<void> {
		const expiredSubscriptions = await this.db
			.getKysely()
			.selectFrom("subscriptions")
			.selectAll()
			.where("status", "=", "active")
			.where("currentPeriodEnd", "<=", new Date().toISOString())
			.execute()

		for (const subscription of expiredSubscriptions) {
			if (subscription.cancelAtPeriodEnd) {
				await this.update(subscription.id, {
					status: "canceled",
					canceledAt: new Date(),
					updatedAt: new Date(),
				})
			} else {
				// Auto-renew
				const plan = await this.getPlan(subscription.planId)
				if (plan) {
					const newPeriodEnd = new Date(subscription.currentPeriodEnd)
					newPeriodEnd.setMonth(newPeriodEnd.getMonth() + (plan.interval === "year" ? 12 : 1))

					await this.update(subscription.id, {
						currentPeriodStart: subscription.currentPeriodEnd,
						currentPeriodEnd: newPeriodEnd,
						updatedAt: new Date(),
					})
				}
			}
		}
	}
}
