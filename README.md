# Northstar

**An intelligent academic management platform for students**

Northstar is a comprehensive academic productivity platform designed to help students manage their coursework, assignments, and academic schedules with AI-powered assistance. Built for seamless integration with D2L Brightspace and other Learning Management Systems (LMS).

## What is Northstar?

Northstar empowers students to take control of their academic journey by providing:

- **📚 Course & Assignment Management** - Centralized dashboard for all your courses, assignments, and deadlines
- **🔗 D2L Brightspace Integration** - Automatic sync with D2L systems to import courses, assignments, and grades
- **🤖 AI-Powered Content Analysis** - Intelligent parsing of syllabi, announcements, and course materials
- **📅 Academic Calendar** - Smart scheduling with deadline tracking and reminders
- **📊 Progress Analytics** - Visual insights into your academic performance and grade tracking
- **📁 File Management** - Organized storage for course materials and documents
- **✉️ Email Notifications** - Automated reminders for upcoming assignments and deadlines
- **🎯 Grading Calculator** - Advanced grading schemes with category weights and grade predictions

## Tech Stack

- **Frontend**: React 19, React Router v7, TypeScript, TailwindCSS
- **Backend**: Convex (serverless database and functions)
- **Authentication**: Clerk
- **Payments**: Stripe (via Clerk Billing)
- **Analytics**: PostHog, Statsig, Vercel Analytics
- **Monitoring**: Sentry
- **Email**: Resend

## Getting Started

### Installation

Install the dependencies:

```bash
npm install
```

### Environment Setup

Before running the application, you need to set up your environment variables. Create a `.env.local` file in the root directory with the following:

```bash
# Clerk Authentication
PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret

# Convex Backend
VITE_CONVEX_URL=your_convex_url
CONVEX_DEPLOY_KEY=your_convex_deploy_key

# Stripe (via Clerk Billing)
CLERK_BILLING_PUBLISHABLE_KEY=your_billing_key
CLERK_BILLING_SECRET_KEY=your_billing_secret

# Analytics & Monitoring
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
VITE_PUBLIC_POSTHOG_HOST=your_posthog_host
VITE_STATSIG_CLIENT_KEY=your_statsig_key
SENTRY_DSN=your_sentry_dsn

# Email (Resend)
RESEND_API_KEY=your_resend_key
```

See [ENV_VARIABLES.md](./ENV_VARIABLES.md) for a complete list of environment variables and setup instructions.

### Development

Start the development server with HMR:

```bash
npm run dev
```

Your application will be available at `http://localhost:5173`.

## Building for Production

Create a production build:

```bash
npm run build
```

Run the production server:

```bash
npm start
```

## Project Structure

```
ns-web/
├── app/                    # React Router application
│   ├── components/        # React components
│   ├── routes/           # Route handlers and pages
│   ├── hooks/            # Custom React hooks
│   ├── contexts/         # React contexts
│   └── utils/            # Utility functions
├── convex/                # Convex backend functions and schema
├── public/                # Static assets
└── browser-extension/     # Chrome extension for D2L sync
```

## Key Features Documentation

- [D2L Integration Setup](./D2L_INTEGRATION_SETUP.md) - Connect with D2L Brightspace
- [Feature Gating Guide](./FEATURE_GATING_GUIDE.md) - Tier-based feature access
- [Clerk Billing Setup](./CLERK_BILLING_IMPLEMENTATION_GUIDE.md) - Subscription management
- [Analytics Setup](./ANALYTICS_SETUP.md) - PostHog and Statsig configuration
- [Email Notifications](./EMAIL_NOTIFICATIONS_SETUP.md) - Automated reminders

## License

All rights reserved. © 2024 Dreampark Labs LLC

---

Built with ❤️ by [Dreampark Labs](https://dreamparklabs.com)
