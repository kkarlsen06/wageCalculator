# Production Environment Variables Checklist

## Required Environment Variables for Production

### 🔑 Authentication & Database
- **SUPABASE_URL** - Your Supabase project URL (e.g., `https://id.kkarlsen.dev`)
- **SUPABASE_SERVICE_ROLE_KEY** - Supabase service role key (starts with `sb_secret_`)
- **SUPABASE_JWKS_URL** - JWKS endpoint for JWT verification (e.g., `https://id.kkarlsen.dev/auth/v1/.well-known/jwks.json`)

### 💳 Payment Processing
- **STRIPE_SECRET_KEY** - Stripe secret key (must start with `sk_live_` for production)
- **STRIPE_WEBHOOK_SECRET** - Stripe webhook endpoint secret (starts with `whsec_`)

### 🤖 AI Integration
- **OPENAI_API_KEY** - OpenAI API key for chat functionality (starts with `sk-`)

### 🌐 Application Configuration
- **PUBLIC_APP_BASE_URL** - Public base URL for the application (e.g., `https://kkarlsen.dev`)
- **NODE_ENV** - Set to `production` for production environment
- **PORT** - Server port (optional, defaults to 8080)

### 🔧 Optional Configuration
- **DEV_BYPASS** - Set to `false` or omit in production
- **APP_BASE_URL** - Alternative base URL (if different from PUBLIC_APP_BASE_URL)

## Frontend Environment Variables (Vite)

### 🔑 Client-side Configuration
- **VITE_SUPABASE_URL** - Same as SUPABASE_URL above
- **VITE_SUPABASE_PUBLISHABLE_KEY** - Supabase anon/publishable key (starts with `sb_publishable_`)

## Security Checklist

### ✅ Verification Commands
```bash
# Check that all required variables are set
env | grep -E "(SUPABASE|STRIPE|OPENAI|PUBLIC_APP)" | sort

# Verify Stripe key is for production
echo $STRIPE_SECRET_KEY | grep -E "^sk_live_" && echo "✅ Live Stripe key" || echo "❌ Test Stripe key detected!"

# Verify NODE_ENV is production
echo $NODE_ENV | grep -E "^production$" && echo "✅ Production mode" || echo "⚠️  Not in production mode"

# Check JWKS URL is HTTPS
echo $SUPABASE_JWKS_URL | grep -E "^https://" && echo "✅ Secure JWKS URL" || echo "❌ JWKS URL must use HTTPS"
```

### 🚫 Security Warnings
- **Never** commit `.env` files to version control
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend
- **Always** use `sk_live_` Stripe keys in production
- **Always** use HTTPS URLs for all external services

## Validation Script

Run the automated tests to verify configuration:
```bash
# Run all tests (requires server to be running for API tests)
npm test

# Run only configuration validation (no server required)
npm run test:auth

# Run only payroll calculation tests
npm run test:payroll
```

## Deployment Verification

After deployment, verify these endpoints:
1. `GET /health` - Should return 200 with status information
2. `GET /api/settings` - Should return 401/403 without authentication
3. `GET /api/billing/start` - Should return 401/403 without authentication

## Emergency Rollback

If issues are detected in production:
1. Check server logs for authentication failures
2. Verify all environment variables are correctly set
3. Test WebSocket connections are working
4. Monitor Stripe webhook delivery success rates