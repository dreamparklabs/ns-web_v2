import { type RouteConfig, index, route, layout } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("onboarding", "routes/onboarding.tsx"),
  route("pricing", "routes/pricing.tsx"),
  route("sign-in/*", "routes/sign-in.tsx"),
  route("sign-up/*", "routes/sign-up.tsx"),
  route("logout", "routes/logout.tsx"),
  route("auth/d2l/callback", "routes/auth.d2l.callback.tsx"),

  // Extension authentication routes
      route("extension-auth", "routes/extension-auth.tsx"),
      route("extension-auth-callback", "routes/extension-auth-callback.tsx"),

      // Public file sharing
      route("share/:shareToken", "routes/share.$shareToken.tsx"),

  // API routes for extension
  route("api/auth/user", "routes/api.auth.user.tsx"),
  route("api/auth/check", "routes/api.auth.check.tsx"),
  route("api/auth/session", "routes/api.auth.session.tsx"),
  route("api/auth/realuser", "routes/api.auth.realuser.tsx"),
  route("api/auth/login", "routes/api.auth.login.tsx"),
  route("api/convex", "routes/api.convex.tsx"),

  // Billing API routes
  route("api/billing/create-subscription", "routes/api.billing.create-subscription.tsx"),
  route("api/billing/create-checkout", "routes/api.billing.create-checkout.tsx"),
  route("api/billing/sync-subscription", "routes/api.billing.sync-subscription.tsx"),
  route("api/billing/clear-subscription", "routes/api.billing.clear-subscription.tsx"),

  // LTI (Learning Tools Interoperability) routes for universal D2L access
  route("api/lti/launch", "routes/api.lti.launch.tsx"),
  route("api/lti/config.xml", "routes/api.lti.config.tsx"),

  // App layout with nested routes
  layout("routes/app.tsx", [
    route("app/v2/dashboard", "routes/dashboard.tsx"),
    route("app/v2/calendar", "routes/calendar.tsx"),
    route("app/v2/tasks", "routes/tasks.tsx"),
    route("app/v2/classes", "routes/classes.tsx"),
    route("app/v2/classes/:courseId", "routes/classes.$courseId.tsx"),
    route("app/v2/grades", "routes/grades.tsx"),
    route("app/v2/analytics", "routes/analytics.tsx"),
    route("app/v2/files", "routes/files.tsx"),
        route("app/v2/files/:courseId", "routes/files.$courseId.tsx"),
    route("app/v2/settings", "routes/settings.tsx"),

    // LTI dashboard (universal D2L access)
    route("app/lti/dashboard", "routes/app.lti.dashboard.tsx"),
  ]),
] satisfies RouteConfig;