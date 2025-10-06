# NOORMME Queue System

A robust, two-tier job queue system for Next.js applications that handles both quick tasks and long-running background jobs efficiently and reliably.

## Features

- ✅ **Two-Tier Architecture**: In-memory queues for speed, persistent queues for reliability
- ✅ **SQLite Backend**: Lightweight, reliable storage with WAL mode
- ✅ **Type Safety**: Full TypeScript support with auto-generated types
- ✅ **Pre-built Handlers**: Email, Image, Webhook handlers ready to use
- ✅ **Rate Limiting**: Built-in rate limiting for API calls
- ✅ **Batch Processing**: Efficient batch processing capabilities
- ✅ **Retry Logic**: Intelligent retry with exponential backoff
- ✅ **Monitoring**: Comprehensive monitoring and control APIs
- ✅ **Auto Cleanup**: Automatic cleanup of old completed jobs
- ✅ **Graceful Shutdown**: Proper cleanup on server shutdown

## Architecture

### Tier 1: In-Memory Queue (Fast Lane)
- **Purpose**: Handle quick tasks during user requests
- **Use Cases**: Rate-limiting API calls, processing multiple images, batch database operations
- **Characteristics**: Very fast, no database overhead, lost on server restart
- **Best For**: Tasks that complete in seconds

### Tier 2: Persistent Queue (Background Worker)
- **Purpose**: Handle important tasks that must complete, even if server restarts
- **Use Cases**: Sending bulk emails, generating reports, processing webhooks, scheduled tasks
- **Characteristics**: Saved to SQLite, automatic retry, supports delays and scheduling
- **Best For**: Critical operations that must not be lost

## Quick Start

### 1. Basic Usage

```typescript
import { getQueueManagerInstance } from "@/lib/queue/init"

// Send an email
const queueManager = getQueueManagerInstance()
const jobId = await queueManager.addJob("email", {
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to our service!</h1>"
})

console.log(`Email job queued: ${jobId}`)
```

### 2. In-Memory Queue

```typescript
// Process images with concurrency control
const imageQueue = queueManager.getInMemoryQueue("image-processing")
await imageQueue.add({
  imagePath: "/uploads/image.jpg",
  operations: [{ type: "resize", params: { width: 300, height: 300 } }]
})
```

### 3. Rate-Limited API Calls

```typescript
// Rate-limited to 100 requests per minute
const apiQueue = queueManager.getInMemoryQueue("api-calls")
await apiQueue.add({ url: "https://api.example.com/data", options: { method: "GET" } })
```

## Configuration

### Environment Variables

```bash
# Queue Configuration
QUEUE_CONCURRENCY=5              # Max concurrent persistent jobs
QUEUE_INTERVAL=1000              # Processing interval (ms)
QUEUE_BATCH_SIZE=10              # Jobs per batch
QUEUE_CLEANUP_DAYS=7             # Days to keep completed jobs

# In-Memory Queue Configuration
QUEUE_IN_MEMORY_CONCURRENCY=3    # Max concurrent in-memory jobs
QUEUE_IN_MEMORY_INTERVAL=100     # Processing interval (ms)
QUEUE_IN_MEMORY_TIMEOUT=30000    # Job timeout (ms)

# Cleanup Configuration
QUEUE_CLEANUP_INTERVAL=3600000   # Cleanup interval (ms) - 1 hour

# Email Configuration
EMAIL_FROM=noreply@example.com
EMAIL_API_KEY=your_email_api_key

# Image Processing Configuration
IMAGE_OUTPUT_DIR=./uploads/processed
IMAGE_TEMP_DIR=./temp
```

## Pre-built Handlers

### Email Handler

```typescript
// Send transactional email
await queueManager.addJob("email", {
  to: "user@example.com",
  subject: "Order Confirmation",
  html: "<h1>Thank you for your order!</h1>",
  attachments: [{
    filename: "receipt.pdf",
    content: pdfBuffer,
    contentType: "application/pdf"
  }]
})

// Send newsletter to multiple recipients
await queueManager.addJob("newsletter", {
  to: ["user1@example.com", "user2@example.com"],
  subject: "Weekly Newsletter",
  html: "<h1>This week's updates</h1>"
})
```

### Image Handler

```typescript
// Process single image
await queueManager.addJob("image", {
  imagePath: "/uploads/photo.jpg",
  operations: [
    { type: "resize", params: { width: 300, height: 300 } },
    { type: "grayscale", params: {} }
  ],
  quality: 85,
  format: "webp"
})

// Generate thumbnails
await queueManager.addJob("thumbnail", {
  imagePath: "/uploads/photo.jpg",
  operations: [
    { type: "resize", params: { width: 150, height: 150 } }
  ]
})
```

### Webhook Handler

```typescript
// Send webhook with retry logic
await queueManager.addJob("webhook", {
  url: "https://api.example.com/webhook",
  method: "POST",
  headers: { "X-API-Key": "your-key" },
  body: { event: "user.created", data: userData },
  retryPolicy: {
    maxRetries: 5,
    baseDelay: 2000,
    maxDelay: 30000,
    backoffMultiplier: 2
  }
})
```

## In-Memory Queues

### Creating Custom Queues

```typescript
// Create a custom in-memory queue
const customQueue = queueManager.createInMemoryQueue("custom", {
  concurrency: 2,
  interval: 500,
  timeout: 15000
})

// Set processor function
customQueue.setProcessor(async (payload) => {
  console.log("Processing:", payload)
  // Your processing logic here
})

// Add jobs
await customQueue.add({ data: "process this" })
```

### Rate-Limited Queue

```typescript
// Create rate-limited queue (100 requests per minute)
const rateLimitedQueue = queueManager.createRateLimitedQueue("api-calls", 100)
```

### Batch Queue

```typescript
// Create batch processing queue
const batchQueue = queueManager.createBatchQueue("batch-processing", 10, 5000)

// Add items to batch
await batchQueue.add({ id: 1, data: "item 1" })
await batchQueue.add({ id: 2, data: "item 2" })
// Batch will be processed when it reaches 10 items or 5 seconds pass
```

## Custom Handlers

```typescript
// Define custom handler
const customHandler = {
  async process(job) {
    console.log(`Processing custom job: ${job.id}`)
    // Your processing logic
  },

  async onFailure(job, error) {
    console.error(`Job ${job.id} failed:`, error.message)
  },

  async onComplete(job) {
    console.log(`Job ${job.id} completed`)
  }
}

// Register handler
queueManager.registerHandler("custom", customHandler)

// Use handler
await queueManager.addJob("custom", { data: "process this" })
```

## Monitoring and Control

### Queue Statistics

```typescript
// Get queue stats
const stats = await queueManager.getStats()
console.log("Queue stats:", stats)
// {
//   total: 150,
//   pending: 25,
//   processing: 5,
//   completed: 100,
//   failed: 15,
//   cancelled: 5
// }
```

### Job Management

```typescript
// Get job by ID
const job = await queueManager.getJob("job_123")

// Cancel job
await queueManager.cancelJob("job_123")

// Retry failed job
await queueManager.retryJob("job_123")

// Get jobs by status
const failedJobs = await queueManager.getJobsByStatus("failed", 10)
```

### API Endpoints

```bash
# Get queue statistics
GET /api/queue/stats

# Get jobs by status
GET /api/queue/jobs?status=pending&limit=10

# Add new job
POST /api/queue/jobs
{
  "type": "email",
  "payload": { "to": "user@example.com", "subject": "Hello" },
  "options": { "priority": 5 }
}

# Get specific job
GET /api/queue/jobs/job_123

# Cancel job
DELETE /api/queue/jobs/job_123

# Retry failed job
POST /api/queue/jobs/job_123/retry

# Clean up old jobs
POST /api/queue/cleanup
```

## Server Actions Integration

```typescript
// app/actions/user-actions.ts
"use server"

import { getQueueManagerInstance } from "@/lib/queue/init"

export async function createUser(formData: FormData) {
  const email = formData.get("email") as string
  const name = formData.get("name") as string

  // Create user in database
  const user = await db.users.create({ email, name })

  // Queue welcome email
  const queueManager = getQueueManagerInstance()
  await queueManager.addJob("email", {
    to: email,
    subject: `Welcome, ${name}!`,
    html: `<h1>Welcome, ${name}!</h1>`
  })

  return { success: true, user }
}
```

## Error Handling

The queue system includes comprehensive error handling:

- **Automatic Retry**: Failed jobs are automatically retried with exponential backoff
- **Error Logging**: All errors are logged with context
- **Failure Handlers**: Custom failure handlers can be defined
- **Dead Letter Queue**: Failed jobs are preserved for manual review

## Performance Considerations

- **Concurrency**: Adjust concurrency based on your server capacity
- **Batch Size**: Larger batches improve throughput but use more memory
- **Cleanup**: Regular cleanup prevents database bloat
- **Indexes**: Database indexes are automatically created for optimal performance

## Best Practices

1. **Use In-Memory Queues** for quick, non-critical tasks
2. **Use Persistent Queues** for important, long-running tasks
3. **Set Appropriate Priorities** for job ordering
4. **Monitor Queue Health** using the provided APIs
5. **Handle Failures Gracefully** with custom error handlers
6. **Clean Up Regularly** to maintain performance
7. **Test Retry Logic** to ensure reliability

## Troubleshooting

### Common Issues

1. **Queue Not Processing**: Check if queue manager is started
2. **Jobs Stuck**: Verify handlers are registered correctly
3. **Memory Issues**: Reduce concurrency or batch size
4. **Database Locked**: Ensure proper WAL mode configuration

### Debugging

```typescript
// Check queue status
const status = queueManager.getStatus()
console.log("Queue status:", status)

// Get in-memory queue stats
const inMemoryStats = queueManager.getAllInMemoryStats()
console.log("In-memory stats:", inMemoryStats)
```

## Migration from Other Queue Systems

The NOORMME queue system is designed to be a drop-in replacement for other queue systems:

1. **From Bull/BullMQ**: Similar API, easier setup
2. **From Agenda**: Better TypeScript support, simpler configuration
3. **From Kue**: More reliable, better error handling
4. **From Bee-Queue**: Persistent storage, better monitoring

## Contributing

When adding new features:

1. Follow the Marie Kondo methodology
2. Delete legacy code immediately
3. Keep only what sparks joy
4. Organize with proven patterns
5. Maintain type safety
6. Add comprehensive tests
7. Update documentation

## License

MIT License - see LICENSE file for details.
