/**
 * Payment Configuration
 * Centralized configuration for payment providers and settings
 * Following NOORMME configuration patterns
 */

export interface PaymentConfig {
  providers: {
    stripe: StripeConfig
    paypal: PayPalConfig
  }
  defaultProvider: 'stripe' | 'paypal'
  currencies: string[]
  webhooks: WebhookConfig
  security: SecurityConfig
  features: FeatureConfig
}

export interface StripeConfig {
  enabled: boolean
  publishableKey: string
  secretKey: string
  webhookSecret: string
  environment: 'test' | 'live'
  apiVersion: string
  maxRetries: number
  timeout: number
}

export interface PayPalConfig {
  enabled: boolean
  clientId: string
  clientSecret: string
  webhookId: string
  environment: 'sandbox' | 'production'
  apiVersion: string
  maxRetries: number
  timeout: number
}

export interface WebhookConfig {
  enabled: boolean
  endpoint: string
  timeout: number
  retries: number
  signatureValidation: boolean
}

export interface SecurityConfig {
  encryptionKey: string
  tokenExpiration: number
  rateLimiting: {
    enabled: boolean
    maxRequests: number
    windowMs: number
  }
  fraudDetection: {
    enabled: boolean
    maxAmount: number
    suspiciousPatterns: boolean
  }
}

export interface FeatureConfig {
  subscriptions: boolean
  refunds: boolean
  partialRefunds: boolean
  webhooks: boolean
  analytics: boolean
  notifications: boolean
  multiCurrency: boolean
  recurringPayments: boolean
}

/**
 * Default payment configuration
 * Can be overridden by environment variables
 */
export const defaultPaymentConfig: PaymentConfig = {
  providers: {
    stripe: {
      enabled: process.env.STRIPE_ENABLED === 'true',
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      secretKey: process.env.STRIPE_SECRET_KEY || '',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
      environment: (process.env.STRIPE_ENVIRONMENT as 'test' | 'live') || 'test',
      apiVersion: '2023-10-16',
      maxRetries: 3,
      timeout: 30000
    },
    paypal: {
      enabled: process.env.PAYPAL_ENABLED === 'true',
      clientId: process.env.PAYPAL_CLIENT_ID || '',
      clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
      webhookId: process.env.PAYPAL_WEBHOOK_ID || '',
      environment: (process.env.PAYPAL_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox',
      apiVersion: 'v2',
      maxRetries: 3,
      timeout: 30000
    }
  },
  defaultProvider: (process.env.DEFAULT_PAYMENT_PROVIDER as 'stripe' | 'paypal') || 'stripe',
  currencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'],
  webhooks: {
    enabled: process.env.PAYMENT_WEBHOOKS_ENABLED === 'true',
    endpoint: process.env.PAYMENT_WEBHOOK_ENDPOINT || '/api/webhooks/payments',
    timeout: 10000,
    retries: 3,
    signatureValidation: true
  },
  security: {
    encryptionKey: process.env.PAYMENT_ENCRYPTION_KEY || '',
    tokenExpiration: 3600000, // 1 hour
    rateLimiting: {
      enabled: true,
      maxRequests: 100,
      windowMs: 900000 // 15 minutes
    },
    fraudDetection: {
      enabled: true,
      maxAmount: 10000,
      suspiciousPatterns: true
    }
  },
  features: {
    subscriptions: process.env.PAYMENT_SUBSCRIPTIONS_ENABLED !== 'false',
    refunds: process.env.PAYMENT_REFUNDS_ENABLED !== 'false',
    partialRefunds: process.env.PAYMENT_PARTIAL_REFUNDS_ENABLED !== 'false',
    webhooks: process.env.PAYMENT_WEBHOOKS_ENABLED !== 'false',
    analytics: process.env.PAYMENT_ANALYTICS_ENABLED !== 'false',
    notifications: process.env.PAYMENT_NOTIFICATIONS_ENABLED !== 'false',
    multiCurrency: process.env.PAYMENT_MULTI_CURRENCY_ENABLED !== 'false',
    recurringPayments: process.env.PAYMENT_RECURRING_ENABLED !== 'false'
  }
}

/**
 * Configuration validation
 */
export function validatePaymentConfig(config: PaymentConfig): void {
  if (!config.providers.stripe.enabled && !config.providers.paypal.enabled) {
    throw new Error('At least one payment provider must be enabled')
  }

  if (config.providers.stripe.enabled) {
    if (!config.providers.stripe.publishableKey) {
      throw new Error('Stripe publishable key is required')
    }
    if (!config.providers.stripe.secretKey) {
      throw new Error('Stripe secret key is required')
    }
  }

  if (config.providers.paypal.enabled) {
    if (!config.providers.paypal.clientId) {
      throw new Error('PayPal client ID is required')
    }
    if (!config.providers.paypal.clientSecret) {
      throw new Error('PayPal client secret is required')
    }
  }

  if (!config.security.encryptionKey) {
    throw new Error('Payment encryption key is required')
  }

  if (config.currencies.length === 0) {
    throw new Error('At least one currency must be configured')
  }
}

/**
 * Get payment configuration
 */
export function getPaymentConfig(): PaymentConfig {
  const config = { ...defaultPaymentConfig }
  validatePaymentConfig(config)
  return config
}
