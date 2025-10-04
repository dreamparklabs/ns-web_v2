# PostHog Analytics Setup Guide

## Overview
PostHog is now integrated into Northstar for comprehensive analytics tracking including:
- 📊 Page views and navigation patterns
- 🖱️ User clicks and interactions
- 🔄 API calls and performance
- 🤖 AI usage and token consumption
- 📁 File operations
- ✅ Assignment operations
- 📝 Form submissions
- ❌ Error tracking

## Setup Instructions

### 1. Create PostHog Account

1. Go to [PostHog Cloud](https://posthog.com/signup) or self-host
2. Create a new project for Northstar
3. Copy your **Project API Key**
4. Note your **PostHog Host URL** (default: `https://us.i.posthog.com`)

### 2. Configure Environment Variables

Add to your `.env.local` file:

```env
# PostHog Analytics
VITE_POSTHOG_KEY=phc_your_project_api_key_here
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

**For Production (Vercel):**
1. Go to Vercel → Settings → Environment Variables
2. Add:
   - `VITE_POSTHOG_KEY`: Your PostHog project API key
   - `VITE_POSTHOG_HOST`: `https://us.i.posthog.com`
3. Apply to: ✅ Production, ✅ Preview, ✅ Development

### 3. Verify Installation

1. Start your dev server: `npm run dev`
2. Open your browser and navigate to the app
3. Go to PostHog dashboard → Activity
4. You should see page views and events appearing

## Automatic Tracking

PostHog is configured to automatically track:

✅ **Page Views** - Every route change  
✅ **Clicks** - All button and link clicks  
✅ **Form Submissions** - Form interactions  
✅ **Performance** - Page load times, API latency  
✅ **Console Logs** - For debugging (in session recordings)  
✅ **Session Recordings** - User sessions with privacy masking  

## Manual Event Tracking

### Basic Usage

```typescript
import { useAnalytics } from "~/hooks/useAnalytics";

function MyComponent() {
  const analytics = useAnalytics();

  const handleClick = () => {
    analytics.trackClick("My Button", {
      location: "sidebar",
      context: "user-actions",
    });
  };

  return <button onClick={handleClick}>Click Me</button>;
}
```

### Available Tracking Methods

#### 1. Track Navigation
```typescript
analytics.trackNavigation(
  "/dashboard",        // from
  "/classes",          // to
  "sidebar-link"       // method
);
```

#### 2. Track API Calls
```typescript
const startTime = Date.now();
try {
  const response = await fetch("/api/endpoint");
  analytics.trackAPICall(
    "/api/endpoint",
    "GET",
    "success",
    Date.now() - startTime
  );
} catch (error) {
  analytics.trackAPICall(
    "/api/endpoint",
    "GET",
    "error",
    Date.now() - startTime,
    { error: error.message }
  );
}
```

#### 3. Track AI Usage
```typescript
analytics.trackAIUsage(
  "assignment-parser",  // feature
  "gemini-pro",         // model
  1500,                 // tokens used
  { 
    inputLength: 500,
    outputLength: 200,
  }
);
```

#### 4. Track Convex Operations
```typescript
// For mutations
const startTime = Date.now();
try {
  const result = await createCourse.mutate(data);
  analytics.trackConvexMutation(
    "courses:createCourse",
    "success",
    Date.now() - startTime
  );
} catch (error) {
  analytics.trackConvexMutation(
    "courses:createCourse",
    "error",
    Date.now() - startTime,
    { error: error.message }
  );
}

// For queries
analytics.trackConvexQuery(
  "courses:getUserCourses",
  false,  // cached
  120     // duration in ms
);
```

#### 5. Track File Operations
```typescript
analytics.trackFileOperation(
  "upload",           // operation
  "application/pdf",  // file type
  1048576,           // file size in bytes
  { 
    courseId: "123",
    assignmentId: "456",
  }
);
```

#### 6. Track Assignment Operations
```typescript
analytics.trackAssignmentOperation(
  "complete",        // operation
  "essay",          // assignment type
  { 
    courseId: "123",
    grade: 95,
  }
);
```

#### 7. Track Widget Interactions
```typescript
analytics.trackWidgetInteraction(
  "upcoming-deadlines",  // widget name
  "expand",              // interaction type
  { itemCount: 5 }
);
```

#### 8. Track Feature Usage
```typescript
analytics.trackFeature("d2l-sync", {
  syncType: "automatic",
  itemsSynced: 42,
});
```

#### 9. Track Errors
```typescript
try {
  // Some code
} catch (error) {
  analytics.trackError(
    "convex-mutation",
    error.message,
    { 
      function: "createCourse",
      userId: user.id,
    }
  );
}
```

#### 10. Track Form Submissions
```typescript
const handleSubmit = async (formData) => {
  try {
    await submitForm(formData);
    analytics.trackFormSubmit("signup-form", true);
  } catch (error) {
    analytics.trackFormSubmit("signup-form", false, {
      error: error.message,
    });
  }
};
```

## Example: Complete Integration

```typescript
import { useAnalytics } from "~/hooks/useAnalytics";
import { useMutation } from "convex/react";
import { api } from "~/convex/_generated/api";

function CreateClassModal() {
  const analytics = useAnalytics();
  const createCourse = useMutation(api.courses.createCourse);

  const handleSubmit = async (formData) => {
    const startTime = Date.now();

    try {
      // Track form submission attempt
      analytics.trackFormSubmit("create-class-form", true, {
        deliveryFormat: formData.deliveryFormat,
      });

      // Create the course
      const result = await createCourse(formData);

      // Track successful mutation
      analytics.trackConvexMutation(
        "courses:createCourse",
        "success",
        Date.now() - startTime,
        {
          creditHours: formData.creditHours,
          deliveryFormat: formData.deliveryFormat,
        }
      );

      // Track feature usage
      analytics.trackFeature("course-creation", {
        method: "manual",
      });

      return result;
    } catch (error) {
      // Track error
      analytics.trackError(
        "course-creation-failed",
        error.message,
        { formData }
      );

      // Track failed mutation
      analytics.trackConvexMutation(
        "courses:createCourse",
        "error",
        Date.now() - startTime,
        { error: error.message }
      );

      throw error;
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

## Privacy & Data Masking

PostHog is configured with privacy in mind:

1. **Masked Input Fields** - All form inputs are masked by default in session recordings
2. **Private Elements** - Add `data-private` attribute to any element to mask it:
   ```html
   <div data-private>Sensitive content</div>
   ```
3. **User Identification** - Users are identified only after Clerk authentication
4. **Session Recordings** - Can be disabled by setting `disable_session_recording: true` in `PostHogContext.tsx`

## PostHog Dashboard Features

### 1. Insights
- Create custom charts and graphs
- Track conversion funnels
- Analyze user paths

### 2. Session Recordings
- Watch real user sessions
- See where users get stuck
- Identify UX issues

### 3. Feature Flags
- Enable/disable features remotely
- A/B test new features
- Gradual rollouts

### 4. Cohorts
- Group users by behavior
- Analyze specific user segments

### 5. Dashboards
- Create custom dashboards
- Share with team members

## Useful Queries in PostHog

### Most Visited Pages
```
Event: $pageview
Group by: page_name
```

### API Call Success Rate
```
Event: api_call
Filter: status = "success"
Formula: (success / total) * 100
```

### AI Usage by Feature
```
Event: ai_usage
Group by: feature
Sum: tokens_used
```

### Navigation Paths
```
Event: navigation
Funnel:
1. from_page = "/dashboard"
2. to_page = "/classes"
3. to_page = "/classes/$courseId"
```

### Average Page Load Time
```
Event: $pageview
Metric: Average
Property: $page_load_time
```

## Troubleshooting

### Events Not Appearing

1. Check browser console for PostHog errors
2. Verify `VITE_POSTHOG_KEY` is set correctly
3. Check PostHog project is active
4. Verify network requests to PostHog aren't blocked

### Session Recordings Not Working

1. Check `disable_session_recording` is `false`
2. Verify PostHog plan includes recordings
3. Clear browser cache and reload

### User Identification Issues

1. Verify Clerk authentication is working
2. Check PostHog logs for identification events
3. Ensure user ID matches between systems

## Best Practices

1. **Track User Intent** - Track what users are trying to do, not just what they click
2. **Add Context** - Always include relevant properties with events
3. **Error Tracking** - Track all errors with enough context to debug
4. **Performance** - Track API call durations and page load times
5. **Feature Usage** - Track when users engage with specific features
6. **A/B Testing** - Use PostHog feature flags for experiments
7. **Privacy** - Always respect user privacy and mask sensitive data

## Support

- PostHog Docs: https://posthog.com/docs
- Community: https://posthog.com/questions
- GitHub: https://github.com/PostHog/posthog


