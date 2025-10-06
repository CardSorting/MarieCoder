# NOORMME Queue System Setup Guide

## 🚀 Quick Start

The NOORMME queue system is already integrated into your Next.js template! Follow these steps to get it running:

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment
```bash
# Copy environment template
cp env.example .env.local

# Edit .env.local with your configuration
# At minimum, set:
# - NEXTAUTH_SECRET
# - NEXTAUTH_URL
# - DATABASE_URL
```

### 3. Run Database Migration
```bash
npm run migrate
```

### 4. Start Development Server
```bash
npm run dev
```

### 5. Test the Queue System
Visit `http://localhost:3000/queue-demo` to see the queue system in action!

## 🔧 Configuration

### Environment Variables

The queue system uses these environment variables (all optional with sensible defaults):

```bash
# Queue System Configuration
QUEUE_CONCURRENCY=5              # Max concurrent persistent jobs
QUEUE_INTERVAL=1000              # Processing interval (ms)
QUEUE_BATCH_SIZE=10              # Jobs per batch
QUEUE_CLEANUP_DAYS=7             # Days to keep completed jobs
QUEUE_IN_MEMORY_CONCURRENCY=3    # Max concurrent in-memory jobs
QUEUE_IN_MEMORY_INTERVAL=100     # Processing interval (ms)
QUEUE_IN_MEMORY_TIMEOUT=30000    # Job timeout (ms)
QUEUE_CLEANUP_INTERVAL=3600000   # Cleanup interval (ms) - 1 hour

# Email Configuration
EMAIL_FROM=noreply@example.com
EMAIL_API_KEY=your-email-api-key

# Image Processing Configuration
IMAGE_OUTPUT_DIR=./uploads/processed
IMAGE_TEMP_DIR=./temp
```

### Validation

Run the setup validation script to check your configuration:

```bash
npm run setup-queue
```

This will:
- ✅ Check if .env.local exists
- ✅ Validate environment variables
- ✅ Show configuration status
- ✅ Provide setup recommendations

## 🏗️ Architecture Overview

### Two-Tier System

**Tier 1: In-Memory Queue (Fast Lane)**
- ⚡ Very fast, no database overhead
- 🔄 Lost on server restart (acceptable for quick tasks)
- 📊 Best for tasks that complete in seconds
- 🎯 Use cases: API rate limiting, image processing, batch operations

**Tier 2: Persistent Queue (Background Worker)**
- 💾 Saved to SQLite database - survives restarts
- 🔁 Automatic retry with intelligent backoff
- ⏰ Supports delays and scheduling
- 📈 Priority system for important jobs
- 🎯 Use cases: Bulk emails, report generation, webhook delivery

## 📝 Usage Examples

### Basic Usage

```typescript
import { getQueueManagerInstance } from "@/lib/queue/init"

// Send an email
const queueManager = getQueueManagerInstance()
const jobId = await queueManager.addJob("email", {
  to: "user@example.com",
  subject: "Welcome!",
  html: "<h1>Welcome to our service!</h1>"
})
```

### In-Memory Queue

```typescript
// Process images with concurrency control
const imageQueue = queueManager.getInMemoryQueue("image-processing")
await imageQueue.add({
  imagePath: "/uploads/image.jpg",
  operations: [{ type: "resize", params: { width: 300, height: 300 } }]
})
```

### Rate-Limited API Calls

```typescript
// Rate-limited to 100 requests per minute
const apiQueue = queueManager.createRateLimitedQueue("api-calls", 100)
await apiQueue.add({ url: "https://api.example.com/data", options: { method: "GET" } })
```

## 🔍 Monitoring & Control

### API Endpoints

**Monitoring:**
- `GET /api/queue/stats` - Queue statistics
- `GET /api/queue/jobs?status=pending&limit=10` - Get jobs by status
- `GET /api/queue/jobs/[id]` - Get specific job

**Control:**
- `POST /api/queue/jobs` - Add new job
- `DELETE /api/queue/jobs/[id]` - Cancel job
- `POST /api/queue/jobs/[id]/retry` - Retry failed job
- `POST /api/queue/cleanup` - Clean up old jobs

### Queue Statistics

```typescript
const stats = await queueManager.getStats()
console.log(stats)
// {
//   total: 150,
//   pending: 25,
//   processing: 5,
//   completed: 100,
//   failed: 15,
//   cancelled: 5
// }
```

## 🛠️ Pre-built Handlers

### Email Handler
- ✅ Transactional emails
- ✅ Newsletter campaigns
- ✅ Bulk email sending
- ✅ Multiple providers (SMTP, SendGrid, Mailgun, SES)

### Image Handler
- ✅ Image processing and optimization
- ✅ Thumbnail generation
- ✅ Batch processing
- ✅ Multiple formats (JPEG, PNG, WebP, AVIF)

### Webhook Handler
- ✅ Reliable delivery with retry logic
- ✅ Exponential backoff
- ✅ Signature generation
- ✅ Rate limiting

## 🎮 Demo & Testing

### Interactive Demo
Visit `/queue-demo` for an interactive demonstration of:
- 📧 Email sending
- 🔗 Webhook delivery
- 🖼️ Image processing
- 📊 Queue statistics

### Example Functions
See `lib/queue/examples.ts` for comprehensive usage examples:
- `sendEmailExample()`
- `sendNewsletterExample()`
- `processImagesExample()`
- `sendWebhookExample()`
- `getQueueStatsExample()`

## 🚨 Troubleshooting

### Common Issues

**Queue Not Processing:**
```bash
# Check if queue manager is started
curl http://localhost:3000/api/queue/stats
```

**Jobs Stuck:**
```bash
# Check job status
curl http://localhost:3000/api/queue/jobs?status=processing
```

**Memory Issues:**
- Reduce `QUEUE_CONCURRENCY`
- Reduce `QUEUE_BATCH_SIZE`
- Increase `QUEUE_CLEANUP_DAYS`

**Database Locked:**
- Ensure SQLite WAL mode is enabled
- Check for long-running transactions

### Debug Mode

Enable debug logging by setting:
```bash
NODE_ENV=development
```

This will show detailed queue processing logs in the console.

## 📚 Documentation

- **Comprehensive Guide**: `lib/queue/README.md`
- **Type Definitions**: `lib/queue/types.ts`
- **Examples**: `lib/queue/examples.ts`
- **API Documentation**: Inline comments in API routes

## 🎯 Best Practices

1. **Use In-Memory Queues** for quick, non-critical tasks
2. **Use Persistent Queues** for important, long-running tasks
3. **Set Appropriate Priorities** for job ordering
4. **Monitor Queue Health** using the provided APIs
5. **Handle Failures Gracefully** with custom error handlers
6. **Clean Up Regularly** to maintain performance
7. **Test Retry Logic** to ensure reliability

## 🚀 Production Deployment

### Environment Setup
```bash
# Production environment variables
NODE_ENV=production
QUEUE_CONCURRENCY=10
QUEUE_BATCH_SIZE=20
QUEUE_CLEANUP_DAYS=3
```

### Monitoring
- Set up monitoring for `/api/queue/stats`
- Alert on high failure rates
- Monitor queue backlog
- Track processing times

### Scaling
- Increase concurrency based on server capacity
- Use Redis/BullMQ for multi-instance deployments
- Implement queue partitioning for high-volume scenarios

## 🆘 Support

- 📖 Check the comprehensive documentation in `lib/queue/README.md`
- 🎮 Try the interactive demo at `/queue-demo`
- 🔍 Use the setup validation script: `npm run setup-queue`
- 📊 Monitor queue health via API endpoints

---

**Happy coding with NOORMME Queue System! 🎉**
