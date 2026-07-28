import type { APIRoute } from 'astro';
import { verifyWebhookEvent } from '../../lib/payments.server';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const signature = request.headers.get('Stripe-Signature');
  if (!signature) return json({ error: 'Missing Stripe signature.' }, 400);

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 1_000_000) {
    return json({ error: 'Webhook payload too large.' }, 413);
  }

  let payload: string;
  try {
    payload = await request.text();
  } catch {
    return json({ error: 'Webhook payload could not be read.' }, 400);
  }

  const verification = await verifyWebhookEvent({
    payload,
    signature,
  });

  if (!verification.ok) {
    return verification.reason === 'configuration'
      ? json({ error: 'Webhook is not configured.' }, 503)
      : json({ error: 'Webhook signature verification failed.' }, 400);
  }

  switch (verification.event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.expired':
      // Intentionally no database mutation yet. Future booking persistence must
      // record event IDs uniquely before applying idempotent state changes.
      break;
    default:
      break;
  }

  return json({ received: true }, 200);
};

export const GET: APIRoute = () =>
  json({ error: 'Method Not Allowed' }, 405, { Allow: 'POST' });

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
