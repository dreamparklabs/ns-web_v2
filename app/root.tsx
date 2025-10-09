import {
  isRouteErrorResponse,
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "react-router";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { PostHogProvider } from "./contexts/PostHogContext";
import { BillingProvider } from "./contexts/BillingContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import * as Sentry from "@sentry/react-router";

import type { Route } from "./+types/root";
import "./app.css";
import "./styles/dashboard-modern.css";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const GTM_ID = import.meta.env.VITE_GTM_ID;
const GA_MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('placeholder')) {
  console.warn("⚠️  Clerk keys not configured. Please set up your Clerk keys in .env.local");
}

if (!CONVEX_URL) {
  console.warn("⚠️  Convex URL not configured. Please run 'npx convex dev' to set up Convex.");
}

const convex = CONVEX_URL ? new ConvexReactClient(CONVEX_URL) : null;

export const links: Route.LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
  {
    rel: "icon",
    type: "image/png",
    href: "/favicon.png",
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />

        {/* Google Tag Manager */}
        {GTM_ID && (
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${GTM_ID}');`,
            }}
          />
        )}

        {/* Google Analytics (Direct Implementation) */}
        {GA_MEASUREMENT_ID && (
          <>
            <script async src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_MEASUREMENT_ID}');
                `,
              }}
            />
          </>
        )}
      </head>
      <body className="bg-white dark:bg-gray-900">
        {/* Google Tag Manager (noscript) */}
        {GTM_ID && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}

        {children}
        <ScrollRestoration />
        <Scripts />

        {/* Vercel Analytics */}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

export default function App() {
  // Only render ClerkProvider if we have valid keys
  if (!PUBLISHABLE_KEY || PUBLISHABLE_KEY.includes('placeholder')) {
    return (
      <div className="min-h-screen bg-red-50 dark:bg-red-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Clerk Setup Required
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Authentication keys are not configured. Please follow the setup instructions in CLERK_SETUP.md
            </p>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-left">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Quick setup:</p>
              <ol className="text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside space-y-1">
                <li>Sign up at <a href="https://clerk.com" className="text-blue-600 dark:text-blue-400">clerk.com</a></li>
                <li>Create a new application</li>
                <li>Copy your keys to .env.local</li>
                <li>Restart the server</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!convex) {
    return (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <PostHogProvider>
          <ThemeProvider>
            <LanguageProvider>
              <NotificationProvider>
                <BillingProvider>
                  <Outlet />
                </BillingProvider>
              </NotificationProvider>
            </LanguageProvider>
          </ThemeProvider>
        </PostHogProvider>
      </ClerkProvider>
    );
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        <PostHogProvider>
          <ThemeProvider>
            <LanguageProvider>
              <NotificationProvider>
                <BillingProvider>
                  <Outlet />
                </BillingProvider>
              </NotificationProvider>
            </LanguageProvider>
          </ThemeProvider>
        </PostHogProvider>
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  let message = "Oops!";
  let details = "An unexpected error occurred.";
  let stack: string | undefined;

  if (isRouteErrorResponse(error)) {
    message = error.status === 404 ? "404" : "Error";
    details =
      error.status === 404
        ? "The requested page could not be found."
        : error.statusText || details;
  } else if (error && error instanceof Error) {
    // Capture non-404 errors to Sentry
    // (404s are route errors, not exceptions we want to track)
    if (!isRouteErrorResponse(error) || error.status !== 404) {
      Sentry.captureException(error);
    }

    if (import.meta.env.DEV) {
      details = error.message;
      stack = error.stack;
    }
  }

  return (
    <main className="pt-16 p-4 container mx-auto">
      <h1>{message}</h1>
      <p>{details}</p>
      {stack && (
        <pre className="w-full p-4 overflow-x-auto">
          <code>{stack}</code>
        </pre>
      )}
    </main>
  );
}