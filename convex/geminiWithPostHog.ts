/**
 * PostHog-instrumented Gemini API client
 * Automatically tracks all LLM calls to PostHog for analytics
 */

"use node";

// Temporarily commented out to fix Convex build
// import { PostHog } from 'posthog-node';

interface GeminiRequest {
  model: string;
  contents: Array<{
    parts: Array<{
      text: string;
    }>;
  }>;
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
  };
}

interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

interface PostHogOptions {
  distinctId?: string;
  traceId?: string;
  properties?: Record<string, any>;
  groups?: Record<string, string>;
  privacyMode?: boolean;
}

/**
 * Call Gemini API with PostHog tracking
 * @param apiKey - Gemini API key
 * @param request - Gemini API request
 * @param posthogOptions - PostHog tracking options
 * @returns Gemini API response
 */
export async function callGeminiWithTracking(
  apiKey: string,
  request: GeminiRequest,
  posthogOptions: PostHogOptions = {}
): Promise<GeminiResponse> {
  const startTime = Date.now();
  
  // Initialize PostHog client (server-side) - temporarily disabled
  // const posthogKey = process.env.POSTHOG_API_KEY;
  // const posthogHost = process.env.POSTHOG_HOST || 'https://us.i.posthog.com';

  let posthog: any = null;
  // if (posthogKey) {
  //   posthog = new PostHog(posthogKey, { host: posthogHost });
  // }

  try {
    // Make the API call
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${request.model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: request.contents,
          generationConfig: request.generationConfig,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
    }

    const data: GeminiResponse = await response.json();
    const endTime = Date.now();
    const latencySeconds = (endTime - startTime) / 1000;

    // Track with PostHog if enabled
    if (posthog && !posthogOptions.privacyMode) {
      const inputText = request.contents.flatMap(c => 
        c.parts.map(p => p.text)
      ).join('\n');
      
      const outputText = data.candidates?.[0]?.content.parts.map(p => p.text).join('\n') || '';

      const eventProperties: Record<string, any> = {
        $ai_model: request.model,
        $ai_latency: latencySeconds,
        $ai_input_tokens: data.usageMetadata?.promptTokenCount || 0,
        $ai_output_tokens: data.usageMetadata?.candidatesTokenCount || 0,
        $ai_total_tokens: data.usageMetadata?.totalTokenCount || 0,
        $ai_provider: 'google-gemini',
        $ai_temperature: request.generationConfig?.temperature || 0.1,
        $ai_max_tokens: request.generationConfig?.maxOutputTokens || 2048,
        
        // Cost calculation (approximate pricing for Gemini 1.5 Flash)
        // Input: $0.075 per 1M tokens, Output: $0.30 per 1M tokens
        $ai_input_cost_usd: ((data.usageMetadata?.promptTokenCount || 0) / 1000000) * 0.075,
        $ai_output_cost_usd: ((data.usageMetadata?.candidatesTokenCount || 0) / 1000000) * 0.30,
        $ai_total_cost_usd: 
          (((data.usageMetadata?.promptTokenCount || 0) / 1000000) * 0.075) +
          (((data.usageMetadata?.candidatesTokenCount || 0) / 1000000) * 0.30),
        
        // Optional: Include input/output text (be mindful of privacy!)
        $ai_input: inputText.substring(0, 500), // Truncate for privacy
        $ai_output_choices: [
          {
            text: outputText.substring(0, 500), // Truncate for privacy
            finish_reason: data.candidates?.[0]?.finishReason || 'unknown',
          },
        ],
        
        // Custom properties
        ...posthogOptions.properties,
      };

      // Add trace ID if provided
      if (posthogOptions.traceId) {
        eventProperties.$ai_trace_id = posthogOptions.traceId;
      }

      // Capture the event
      posthog.capture({
        distinctId: posthogOptions.distinctId || 'anonymous',
        event: '$ai_generation',
        properties: eventProperties,
        groups: posthogOptions.groups,
      });
    }

    return data;
  } catch (error) {
    // Track errors
    if (posthog) {
      posthog.capture({
        distinctId: posthogOptions.distinctId || 'anonymous',
        event: '$ai_generation_error',
        properties: {
          $ai_model: request.model,
          $ai_provider: 'google-gemini',
          error: error instanceof Error ? error.message : String(error),
          ...posthogOptions.properties,
        },
      });
    }
    
    throw error;
  } finally {
    // Ensure PostHog events are flushed
    if (posthog) {
      await posthog.shutdown();
    }
  }
}

/**
 * Helper to extract input token count from text (approximate)
 * Gemini uses ~4 characters per token on average
 */
function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}


