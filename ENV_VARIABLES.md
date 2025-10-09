# Environment Variables Reference

This file documents all environment variables used in the Northstar application.

## 📋 Required Variables

Copy these to your `.env.local` file and fill in your actual values:

```bash
# =============================================================================
# REQUIRED - Authentication & Database
# =============================================================================

# Clerk Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_key_here
CLERK_SECRET_KEY=sk_test_your_secret_key_here

# Convex Database
VITE_CONVEX_URL=https://your-project.convex.cloud
CONVEX_URL=https://your-project.convex.cloud
CONVEX_DEPLOYMENT=dev:your-deployment-name

# =============================================================================
# REQUIRED - Analytics
# =============================================================================

# PostHog Analytics (Client-Side)
VITE_PUBLIC_POSTHOG_KEY=phc_your_project_key_here
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# PostHog Analytics (Server-Side for LLM tracking)
POSTHOG_API_KEY=phc_your_project_key_here
POSTHOG_HOST=https://us.i.posthog.com

# Push Notifications (VAPID Keys)
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VITE_VAPID_PRIVATE_KEY=your_vapid_private_key_here

# Email Notifications (Resend)
RESEND_API_KEY=re_your_resend_api_key_here
```

## 🎯 Optional Variables

```bash
# =============================================================================
# OPTIONAL - Additional Analytics & Monitoring
# =============================================================================

# Google Tag Manager
VITE_GTM_ID=GTM-XXXXXXX

# Google Analytics 4
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX

# Sentry Error Tracking
VITE_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxx

# Push Notifications (VAPID Keys)
# Generate using: npx web-push generate-vapid-keys
VITE_VAPID_PUBLIC_KEY=your_vapid_public_key_here
VITE_VAPID_PRIVATE_KEY=your_vapid_private_key_here

# Canny Feedback Widget
VITE_CANNY_APP_ID=your_canny_app_id

# =============================================================================
# AI & LLM Integration
# =============================================================================

# Google Gemini API (for AI-powered content parsing)
GEMINI_API_KEY=your_gemini_api_key_here

# OpenAI API (future use)
# OPENAI_API_KEY=sk-your_openai_key_here

# =============================================================================
# D2L Brightspace Integration (Optional)
# =============================================================================

# D2L API Credentials (Institution-specific)
D2L_API_BASE_URL=https://your-institution.brightspace.com
D2L_APP_ID=your_d2l_app_id
D2L_APP_KEY=your_d2l_app_key
```

## 🚀 Deployment Variables

### Vercel (Frontend)

Set these in Vercel Dashboard → Settings → Environment Variables:

```bash
# Required
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
VITE_CONVEX_URL=https://your-prod-project.convex.cloud
VITE_PUBLIC_POSTHOG_KEY=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Optional
VITE_GTM_ID=GTM-XXXXXXX
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_SENTRY_DSN=https://...ingest.sentry.io/...
VITE_CANNY_APP_ID=your_canny_app_id
```

### Convex (Backend)

Set these in Convex Dashboard → Settings → Environment Variables:

```bash
# Required
CLERK_JWT_ISSUER_DOMAIN=https://clerk.dplapp.com
CLERK_SECRET_KEY=sk_live_...

# Analytics & AI
POSTHOG_API_KEY=phc_...
POSTHOG_HOST=https://us.i.posthog.com
GEMINI_API_KEY=your_gemini_api_key

# Email Notifications
RESEND_API_KEY=re_your_resend_api_key

# Optional D2L Integration
D2L_API_BASE_URL=https://your-institution.brightspace.com
D2L_APP_ID=your_d2l_app_id
D2L_APP_KEY=your_d2l_app_key
```

## 📖 Variable Descriptions

### Authentication

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk public key for client-side auth | ✅ Yes | Frontend (Vite) |
| `CLERK_SECRET_KEY` | Clerk secret key for server-side auth | ✅ Yes | Convex Backend |
| `CLERK_JWT_ISSUER_DOMAIN` | JWT issuer domain for token validation | ✅ Yes | Convex Backend |

### Database

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `VITE_CONVEX_URL` | Convex deployment URL | ✅ Yes | Frontend (Vite) |
| `CONVEX_URL` | Convex deployment URL for server-side | ⚠️ Sometimes | Server functions |
| `CONVEX_DEPLOYMENT` | Convex deployment name | 🔧 Auto | Convex CLI |

### Analytics

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `VITE_PUBLIC_POSTHOG_KEY` | PostHog project API key (client) | ✅ Yes | Frontend |
| `VITE_PUBLIC_POSTHOG_HOST` | PostHog host URL (client) | ✅ Yes | Frontend |
| `POSTHOG_API_KEY` | PostHog project API key (server) | ✅ Yes | Convex (LLM tracking) |
| `POSTHOG_HOST` | PostHog host URL (server) | ✅ Yes | Convex (LLM tracking) |
| `VITE_GTM_ID` | Google Tag Manager container ID | ❌ Optional | Frontend |
| `VITE_GA_MEASUREMENT_ID` | Google Analytics 4 measurement ID | ❌ Optional | Frontend |
| `VITE_SENTRY_DSN` | Sentry error tracking DSN | ⚠️ Recommended | Frontend |

### User Feedback

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `VITE_CANNY_APP_ID` | Canny app ID for feedback widget | ❌ Optional | Frontend |

### AI & LLM

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `GEMINI_API_KEY` | Google Gemini API key | ⚠️ If using AI parsing | Convex Actions |
| `OPENAI_API_KEY` | OpenAI API key | ❌ Future use | Not yet used |

### Email Notifications

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `RESEND_API_KEY` | Resend API key for sending emails | ⚠️ If using email notifications | Convex Actions |

### D2L Integration

| Variable | Description | Required | Where Used |
|----------|-------------|----------|------------|
| `D2L_API_BASE_URL` | Institution's D2L Brightspace URL | ❌ If using D2L | Convex |
| `D2L_APP_ID` | D2L application ID | ❌ If using D2L | Convex |
| `D2L_APP_KEY` | D2L application key | ❌ If using D2L | Convex |

## 🔐 Security Notes

### Never Commit:
- ❌ `.env.local` (already in .gitignore)
- ❌ Any files containing API keys
- ❌ Clerk secret keys
- ❌ Convex deployment URLs with auth tokens

### VITE_ Prefix:
Variables with `VITE_` prefix are **exposed to the client browser**. Never use this prefix for:
- Secret keys
- API keys that should be server-only
- Sensitive configuration

### Server-Only Variables:
These should **NOT** have the `VITE_` prefix:
- `CLERK_SECRET_KEY`
- `POSTHOG_API_KEY` (when used in Convex)
- `GEMINI_API_KEY`
- `D2L_APP_KEY`

## 📚 Related Documentation

- [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md) - Complete analytics setup guide
- [COST_TRACKING_GUIDE.md](./COST_TRACKING_GUIDE.md) - Cost tracking documentation
- [POSTHOG_SETUP.md](./POSTHOG_SETUP.md) - PostHog-specific setup
- [D2L_INTEGRATION_SETUP.md](./D2L_INTEGRATION_SETUP.md) - D2L integration guide

## ✅ Quick Setup

1. Copy `.env.local` template:
   ```bash
   # Create .env.local with the required variables from above
   ```

2. Get Clerk keys:
   - Go to [Clerk Dashboard](https://dashboard.clerk.com)
   - Copy keys to `.env.local`

3. Get Convex URL:
   ```bash
   npx convex dev
   # Copy the URL shown in output
   ```

4. Get PostHog keys:
   - Go to [PostHog](https://posthog.com)
   - Create project
   - Copy API key and host

5. Start dev server:
   ```bash
   npm run dev
   ```

## 🆘 Troubleshooting

### "Clerk keys not configured"
→ Add `VITE_CLERK_PUBLISHABLE_KEY` to `.env.local`

### "Convex URL not configured"
→ Run `npx convex dev` and add `VITE_CONVEX_URL` to `.env.local`

### "PostHog not loading"
→ Verify `VITE_PUBLIC_POSTHOG_KEY` and `VITE_PUBLIC_POSTHOG_HOST` are set

### "LLM tracking not working"
→ Add `POSTHOG_API_KEY` and `GEMINI_API_KEY` to Convex environment variables

---

**Need help?** See [ANALYTICS_SETUP.md](./ANALYTICS_SETUP.md) for detailed setup instructions.



