/**
 * Sentry Server-Side Instrumentation
 * This file is imported before the server starts to initialize Sentry monitoring
 */

import * as Sentry from '@sentry/react-router';

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN || "https://2aa77dfb0c728fb2f3234f3b74e79bb5@o4510134148202496.ingest.us.sentry.io/4510134150496256",
  
  // Send default PII (personally identifiable information)
  sendDefaultPii: true,
  
  // Enable logs to be sent to Sentry
  enableLogs: true,
  
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions (adjust for production)
  
  // Environment
  environment: process.env.NODE_ENV || 'development',
  
  // Release tracking (optional)
  // release: process.env.VERCEL_GIT_COMMIT_SHA,
});





