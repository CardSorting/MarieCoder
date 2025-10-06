/**
 * Database Services Index
 * Exports all database-related services and utilities
 * Following NOORMME Marie Kondo methodology - keeping only what sparks joy
 */

// Connection Management
export * from "./connection/DatabaseConnectionManager"
// Service Providers
export * from "./providers/PaymentDatabaseService"
export * from "./providers/UserDatabaseService"
export * from "./ServiceFactory"
// Core Services
export * from "./UnifiedDatabaseService"
export * from "./utils/DatabaseCacheManager"
export * from "./utils/DatabaseHealthMonitor"
export * from "./utils/DatabaseMigrationService"
export * from "./utils/DatabaseOptimizer"
// Query Utilities
export * from "./utils/KyselyQueryBuilder"

// Legacy exports removed - use UnifiedDatabaseService and ServiceFactory instead
