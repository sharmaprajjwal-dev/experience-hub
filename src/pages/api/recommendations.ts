import type { APIRoute } from 'astro';
import { getContentGraph } from '../../lib/content';
import {
  checkRecommendationRateLimit,
  getRecommendationClientIdentifier,
  recommendPackages,
  validateRecommendationRequest,
} from '../../lib/recommendations.server';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (
    (origin && origin !== requestOrigin) ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    return json({ error: 'Cross-origin requests are not allowed.' }, 403);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_500) {
    return json({ error: 'Keep your request brief and try again.' }, 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: 'The recommendation request was not valid.' }, 400);
  }

  const validation = validateRecommendationRequest(rawBody);
  if (!validation.ok) return json({ error: validation.error }, 400);

  const rateLimit = checkRecommendationRateLimit(
    getRecommendationClientIdentifier(request),
  );
  if (!rateLimit.allowed) {
    return json(
      {
        error:
          'You have made several recommendation requests. Please wait a little and try again.',
      },
      429,
      { 'Retry-After': String(rateLimit.retryAfterSeconds) },
    );
  }

  const graph = await getContentGraph();
  const recommendation = await recommendPackages({
    graph,
    preferences: validation.preferences,
    runtimeEnvironment: locals.runtime?.env,
  });

  if (!recommendation.ok) {
    const headers = recommendation.retryAfter
      ? { 'Retry-After': String(recommendation.retryAfter) }
      : undefined;
    return json({ error: recommendation.error }, recommendation.status, headers);
  }

  return json(recommendation.result, 200);
};

export const GET: APIRoute = () =>
  new Response('Method Not Allowed', {
    status: 405,
    headers: {
      Allow: 'POST',
      'Cache-Control': 'private, no-store',
    },
  });

function json(
  body: unknown,
  status: number,
  additionalHeaders?: Record<string, string>,
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-store',
      ...additionalHeaders,
    },
  });
}
