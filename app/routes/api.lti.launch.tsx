import type { ActionFunctionArgs } from "react-router";
import { redirect } from "react-router";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

// Use CONVEX_URL for server-side (not VITE_ prefix)
const convex = new ConvexHttpClient(process.env.CONVEX_URL || process.env.VITE_CONVEX_URL || "");

export async function action({ request }: ActionFunctionArgs) {
  // Handle LTI launch POST request
  const formData = await request.formData();
  const ltiData = Object.fromEntries(formData.entries());

  console.log('LTI Launch received:', ltiData);

  try {
    // Validate LTI launch request
    const validation = await convex.action(api.ltiIntegration.validateLTILaunch, {
      ltiData,
      signature: ltiData.oauth_signature as string,
    });

    if (!validation.valid) {
      throw new Error('Invalid LTI launch request');
    }

    // Generate session token
    const sessionToken = generateSessionToken();

    // Create LTI session
    await convex.mutation(api.ltiIntegration.createLTISession, {
      ltiUserId: validation.userId,
      ltiCourseId: validation.courseId,
      institutionUrl: validation.institutionUrl || 'unknown',
      userEmail: validation.userEmail || '',
      courseName: validation.courseName || 'Unknown Course',
      userRole: validation.userRole || 'Student',
      consumerKey: ltiData.oauth_consumer_key as string,
      sessionToken,
    });

    // Redirect to LTI dashboard
    return redirect(`/app/lti/dashboard?session=${sessionToken}`);

  } catch (error) {
    console.error('LTI launch failed:', error);
    
    // Return error page
    return new Response(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>LTI Launch Error</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px;
              background: #f5f5f5;
            }
            .error-card {
              background: white;
              padding: 30px;
              border-radius: 12px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              text-align: center;
            }
            .error-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            h1 { color: #e53e3e; margin-bottom: 10px; }
            p { color: #666; line-height: 1.5; }
            .retry-btn {
              background: #667eea;
              color: white;
              padding: 12px 24px;
              border: none;
              border-radius: 6px;
              font-size: 16px;
              cursor: pointer;
              margin-top: 20px;
            }
          </style>
        </head>
        <body>
          <div class="error-card">
            <div class="error-icon">⚠️</div>
            <h1>LTI Launch Failed</h1>
            <p>
              There was an error launching Northstar from your learning management system.
              Please try again or contact your instructor for assistance.
            </p>
            <p><strong>Error:</strong> ${error instanceof Error ? error.message : 'Unknown error'}</p>
            <button class="retry-btn" onclick="window.history.back()">
              ← Go Back
            </button>
          </div>
        </body>
      </html>
    `, {
      status: 400,
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

// Generate secure session token
function generateSessionToken(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 15);
  return `lti_${timestamp}_${random}`;
}

