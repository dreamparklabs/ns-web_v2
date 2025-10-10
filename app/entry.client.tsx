import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

// Debug environment variables in production
console.log('🔍 Environment Debug in entry.client.tsx:');
console.log('  - VITE_PUBLIC_POSTHOG_KEY present?', !!import.meta.env.VITE_PUBLIC_POSTHOG_KEY);
console.log('  - VITE_PUBLIC_POSTHOG_KEY value:', import.meta.env.VITE_PUBLIC_POSTHOG_KEY ? import.meta.env.VITE_PUBLIC_POSTHOG_KEY.substring(0, 10) + '...' : 'undefined');
console.log('  - All VITE env vars:', Object.keys(import.meta.env).filter(key => key.startsWith('VITE_')));
console.log('  - Will use fallback key:', !import.meta.env.VITE_PUBLIC_POSTHOG_KEY);

// Initialize Sentry for client-side error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "https://2aa77dfb0c728fb2f3234f3b74e79bb5@o4510134148202496.ingest.us.sentry.io/4510134150496256",
  
  // Send default PII (personally identifiable information)
  sendDefaultPii: true,
  
  integrations: [
    // Tracing
    Sentry.reactRouterTracingIntegration(),
    // Session Replay
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions
  
  // Set `tracePropagationTargets` to declare which URL(s) should have trace propagation enabled
  // Exclude Clerk domains to prevent CORS issues with sentry-trace header
  tracePropagationTargets: [
    /^\//,
    /^https:\/\/.*\.vercel\.app/,
    // Only include dplapp.com domains that are NOT clerk domains
    /^https:\/\/(?!.*clerk).*\.dplapp\.com/
  ],
  
  // Session Replay
  replaysSessionSampleRate: 0.1, // Capture 10% of all sessions
  replaysOnErrorSampleRate: 1.0, // Capture 100% of sessions with an error
  
  // Environment
  environment: import.meta.env.MODE,
});

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <HydratedRouter />
    </StrictMode>,
  );
});
