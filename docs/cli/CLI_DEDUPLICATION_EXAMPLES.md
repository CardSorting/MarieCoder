# Request Deduplication Examples

## Overview
Request deduplication prevents duplicate identical requests from being processed concurrently. This is particularly useful for:
- API calls that may be triggered multiple times
- Expensive database queries
- File system operations
- Any idempotent operation that might be called with the same parameters

## Basic Usage

### Example 1: Simple API Call Deduplication

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"

const deduplicationManager = getDeduplicationManager()

async function fetchUserProfile(userId: string): Promise<UserProfile> {
	const key = `user:profile:${userId}`
	
	return deduplicationManager.execute(
		key,
		async () => {
			// This will only execute once even if called multiple times concurrently
			const response = await fetch(`/api/users/${userId}`)
			return response.json()
		},
		[]
	)
}

// All three calls will share the same promise
const [user1, user2, user3] = await Promise.all([
	fetchUserProfile("123"),
	fetchUserProfile("123"),
	fetchUserProfile("123"),
])
// Only ONE actual API call is made!
```

### Example 2: Function Wrapper Pattern

```typescript
import { deduplicateFunction } from "./cli_request_deduplicator"

// Original function
async function expensiveOperation(param1: string, param2: number): Promise<Result> {
	console.log("Executing expensive operation...")
	await sleep(1000)
	return { param1, param2, timestamp: Date.now() }
}

// Create deduplicated version
const expensiveOperationDeduplicated = deduplicateFunction(expensiveOperation, {
	ttl: 60000, // Cache for 1 minute
	cacheResults: true,
})

// Use the deduplicated version
const result1 = await expensiveOperationDeduplicated("test", 42)
const result2 = await expensiveOperationDeduplicated("test", 42) // Returns cached result
```

### Example 3: Class Method Decorator

```typescript
import { Deduplicate } from "./cli_request_deduplicator"

class ApiClient {
	@Deduplicate({ ttl: 30000 }) // 30 second cache
	async getUserData(userId: string): Promise<UserData> {
		console.log(`Fetching user data for ${userId}`)
		return await this.api.get(`/users/${userId}`)
	}
	
	@Deduplicate({ ttl: 60000, cacheResults: true })
	async getSettings(): Promise<Settings> {
		return await this.api.get("/settings")
	}
}

const client = new ApiClient()

// First call executes the method
const user1 = await client.getUserData("123")

// Second call returns cached result
const user2 = await client.getUserData("123")
```

## Advanced Usage

### Example 4: Custom Key Generation

```typescript
import { getDeduplicationManager, RequestKeyGenerator } from "./cli_request_deduplicator"

// Custom key generator for complex objects
const customKeyGenerator: RequestKeyGenerator<[SearchParams]> = (params) => {
	return `search:${params.query}:${params.filters.join(",")}:${params.page}`
}

const deduplicationManager = getDeduplicationManager()

interface SearchParams {
	query: string
	filters: string[]
	page: number
}

async function searchProducts(params: SearchParams): Promise<SearchResults> {
	const key = customKeyGenerator(params)
	
	return deduplicationManager.execute(
		key,
		async () => {
			return await api.search(params)
		},
		[params]
	)
}
```

### Example 5: Integration with Connection Pool

```typescript
import { getApiConnectionPoolManager } from "./cli_connection_pool"
import { CancellationTokenSource } from "./cli_cancellation"

const poolManager = getApiConnectionPoolManager()

// Create pool with deduplication enabled
poolManager.createPool("api", {
	maxConnections: 5,
	requestsPerMinute: 60,
	enableDeduplication: true,
	deduplicationTtl: 30000, // 30 seconds
})

const source = new CancellationTokenSource()

// Execute with both pooling and deduplication
async function fetchData(endpoint: string): Promise<any> {
	return poolManager.execute(
		async () => {
			return await fetch(endpoint).then(r => r.json())
		},
		"api", // Pool name
		source.token, // Cancellation token
		`fetch:${endpoint}` // Deduplication key
	)
}

// Multiple concurrent calls
const [data1, data2, data3] = await Promise.all([
	fetchData("/api/products"),
	fetchData("/api/products"), // Deduplicated
	fetchData("/api/products"), // Deduplicated
])
// Only ONE API call is made, result is shared
```

### Example 6: File System Operations

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"
import * as fs from "fs/promises"

const deduplicationManager = getDeduplicationManager()

async function readFileWithCache(filePath: string): Promise<string> {
	return deduplicationManager.execute(
		`file:read:${filePath}`,
		async () => {
			console.log(`Reading file: ${filePath}`)
			return await fs.readFile(filePath, "utf-8")
		},
		[]
	)
}

// Multiple concurrent reads of the same file
const [content1, content2, content3] = await Promise.all([
	readFileWithCache("/path/to/config.json"),
	readFileWithCache("/path/to/config.json"),
	readFileWithCache("/path/to/config.json"),
])
// File is read only once!
```

### Example 7: Statistics and Monitoring

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"

const deduplicationManager = getDeduplicationManager()

// Create named deduplicator
const apiDeduplicator = deduplicationManager.getDeduplicator("api", {
	ttl: 60000,
	cacheResults: true,
})

// Execute some requests...
await Promise.all([
	deduplicationManager.execute("key1", async () => "result1", [], "api"),
	deduplicationManager.execute("key1", async () => "result1", [], "api"),
	deduplicationManager.execute("key2", async () => "result2", [], "api"),
])

// Get statistics
const stats = deduplicationManager.getAllStats()
console.log("Deduplication Statistics:")
console.log(`- Pending requests: ${stats.api.pendingRequests}`)
console.log(`- Cached results: ${stats.api.cachedResults}`)
console.log(`- Cache hit rate: ${stats.api.cacheHitRate.toFixed(2)}%`)
```

### Example 8: Cache Management

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"

const deduplicationManager = getDeduplicationManager()

// Clear specific cache entry
deduplicationManager.clearCache("api", "user:profile:123")

// Clear all cache for a deduplicator
deduplicationManager.clearCache("api")

// Clear everything
const apiDeduplicator = deduplicationManager.getDeduplicator("api")
apiDeduplicator.clearAllCache()
```

### Example 9: With Cancellation

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"
import { CancellationTokenSource } from "./cli_cancellation"

const deduplicationManager = getDeduplicationManager()
const source = new CancellationTokenSource()

async function longRunningTask(id: string): Promise<Result> {
	return deduplicationManager.execute(
		`task:${id}`,
		async () => {
			// Long running operation
			await sleep(10000)
			return { id, completed: true }
		},
		[],
		undefined,
		source.token // Pass cancellation token
	)
}

// Start multiple instances
const promise1 = longRunningTask("task1")
const promise2 = longRunningTask("task1") // Shares with promise1

// Cancel after 2 seconds
setTimeout(() => {
	source.cancel()
}, 2000)

try {
	await promise1
} catch (error) {
	if (isCancellationError(error)) {
		console.log("Task was cancelled")
	}
}
```

### Example 10: Real-World API Client

```typescript
import { getDeduplicationManager } from "./cli_request_deduplicator"
import { getApiConnectionPoolManager } from "./cli_connection_pool"
import { CancellationTokenSource } from "./cli_cancellation"
import { getLogger } from "./cli_logger"

const logger = getLogger()
const poolManager = getApiConnectionPoolManager()
const deduplicationManager = getDeduplicationManager()

poolManager.createPool("github", {
	maxConnections: 10,
	requestsPerMinute: 50,
	enableDeduplication: true,
	deduplicationTtl: 300000, // 5 minutes
})

class GitHubApiClient {
	private baseUrl = "https://api.github.com"
	
	async getRepository(owner: string, repo: string): Promise<Repository> {
		const key = `github:repo:${owner}/${repo}`
		
		return poolManager.execute(
			async () => {
				logger.info(`Fetching repository: ${owner}/${repo}`)
				const response = await fetch(`${this.baseUrl}/repos/${owner}/${repo}`)
				if (!response.ok) {
					throw new Error(`GitHub API error: ${response.statusText}`)
				}
				return response.json()
			},
			"github",
			undefined,
			key // Deduplication key
		)
	}
	
	async getUser(username: string): Promise<User> {
		const key = `github:user:${username}`
		
		return poolManager.execute(
			async () => {
				logger.info(`Fetching user: ${username}`)
				const response = await fetch(`${this.baseUrl}/users/${username}`)
				if (!response.ok) {
					throw new Error(`GitHub API error: ${response.statusText}`)
				}
				return response.json()
			},
			"github",
			undefined,
			key
		)
	}
}

// Usage
const client = new GitHubApiClient()

// Multiple concurrent calls are automatically deduplicated
const [repo1, repo2, user1, user2] = await Promise.all([
	client.getRepository("microsoft", "vscode"),
	client.getRepository("microsoft", "vscode"), // Deduplicated
	client.getUser("torvalds"),
	client.getUser("torvalds"), // Deduplicated
])

// Get pool statistics including deduplication stats
const stats = poolManager.getAllStats()
logger.info("GitHub API Pool Statistics:")
logger.table(stats.github)
```

## Best Practices

### 1. Choose Appropriate TTL
```typescript
// Short TTL for frequently changing data
getDeduplicator("weather", { ttl: 5000 }) // 5 seconds

// Long TTL for static data
getDeduplicator("config", { ttl: 3600000 }) // 1 hour
```

### 2. Use Meaningful Keys
```typescript
// Good: Descriptive and unique
const key = `user:profile:${userId}:${timestamp}`

// Bad: Too generic
const key = "data"
```

### 3. Clear Cache When Data Changes
```typescript
async function updateUserProfile(userId: string, data: ProfileData) {
	await api.updateProfile(userId, data)
	
	// Clear cached profile
	deduplicationManager.clearCache("api", `user:profile:${userId}`)
}
```

### 4. Monitor Cache Performance
```typescript
setInterval(() => {
	const stats = deduplicationManager.getAllStats()
	if (stats.api.cacheHitRate < 50) {
		logger.warn("Low cache hit rate, consider adjusting TTL or keys")
	}
}, 60000)
```

## Conclusion

Request deduplication is a powerful technique for:
- Reducing redundant operations
- Improving performance
- Saving resources (API quota, bandwidth, CPU)
- Providing consistent results

Use it whenever you have idempotent operations that might be called with the same parameters concurrently.

