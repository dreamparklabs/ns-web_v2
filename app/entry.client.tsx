import * as Sentry from "@sentry/react-router";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

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
  tracePropagationTargets: [/^\//, /^https:\/\/.*\.vercel\.app/, /^https:\/\/.*\.dplapp\.com/],
  
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
