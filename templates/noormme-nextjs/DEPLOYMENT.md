# Production Deployment Guide

## 🚀 The Happy Path to Production

### Prerequisites
- Node.js 18+ 
- A hosting platform (Vercel, Railway, DigitalOcean, etc.)
- Domain name (optional)

### Quick Deploy to Vercel (Recommended)
```bash
# 1. Build and test locally
npm run build:production

# 2. Deploy to Vercel
npx vercel --prod

# 3. Set environment variables in Vercel dashboard
# Copy from .env.local to Vercel environment variables
```

### Environment Variables for Production

**Required:**
```env
DATABASE_URL="file:./database.sqlite"
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-production-secret-key-32-chars-min"
APP_NAME="Your SAAS Name"
APP_URL="https://your-domain.com"
```

**Optional (but recommended):**
```env
# OAuth Providers
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Payment Processing
STRIPE_PUBLISHABLE_KEY="pk_live_..."
STRIPE_SECRET_KEY="sk_live_..."

# Email
SMTP_HOST="smtp.your-provider.com"
SMTP_PORT="587"
SMTP_USER="your-email@domain.com"
SMTP_PASS="your-email-password"

# Feature Flags
ENABLE_BILLING="true"
ENABLE_NOTIFICATIONS="true"
ENABLE_ADMIN_PANEL="true"
```

### Security Checklist

- [ ] Change all default secrets
- [ ] Use HTTPS in production
- [ ] Set up proper CORS policies
- [ ] Enable rate limiting
- [ ] Configure proper error handling
- [ ] Set up monitoring and logging
- [ ] Regular database backups
- [ ] Keep dependencies updated

### Database Considerations

**SQLite in Production:**
- Works great for small to medium applications
- Automatic backups recommended
- Consider PostgreSQL for high-traffic applications

**Backup Strategy:**
```bash
# Simple backup script
cp database.sqlite backup-$(date +%Y%m%d).sqlite
```

### Performance Optimization

**Already configured:**
- ✅ SQLite WAL mode
- ✅ Next.js standalone output
- ✅ Image optimization
- ✅ Security headers
- ✅ Compression enabled

**Additional optimizations:**
- Set up CDN for static assets
- Configure caching headers
- Monitor database performance
- Use Redis for session storage (optional)

### Monitoring

**Health Check Endpoint:**
```
GET /api/admin/database/health
```

**Key Metrics to Monitor:**
- Database connection health
- Response times
- Error rates
- Memory usage
- Disk space

### Troubleshooting

**Common Issues:**

1. **Database not initialized:**
   ```bash
   npm run setup
   ```

2. **Environment variables not loaded:**
   - Check `.env.local` file exists
   - Verify variable names match exactly
   - Restart development server

3. **Build failures:**
   ```bash
   npm run type-check
   npm run lint
   ```

### Support

- Check the [README.md](./README.md) for setup instructions
- Review [SETUP_GUIDE.md](./docs/SETUP_GUIDE.md) for detailed configuration
- Open an issue for bugs or feature requests

---

**Remember:** This template follows the NORMIE DEV methodology - if it doesn't spark joy, we've done something wrong. Keep it simple, keep it clean, keep it delightful.
