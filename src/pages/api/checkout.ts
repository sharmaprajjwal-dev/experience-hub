import type { APIRoute } from 'astro';
import { getContentGraph } from '../../lib/content';
import {
  createCheckoutSession,
  getDeploymentPaymentMode,
  getPaymentActionForPackage,
  getStripePaymentLink,
} from '../../lib/payments.server';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (
    (origin && origin !== requestOrigin) ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  ) {
    return response('Cross-origin requests are not allowed.', 403);
  }

  const contentLength = Number(request.headers.get('Content-Length') ?? 0);
  if (Number.isFinite(contentLength) && contentLength > 2_000) {
    return response('The checkout request was too large.', 413);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return response('The checkout request was not valid.', 400);
  }

  if (
    [...formData.keys()].some((key) => key !== 'package') ||
    formData.getAll('package').length !== 1
  ) {
    return response('The checkout request included unsupported fields.', 400);
  }

  const packageSlug = formData.get('package');
  if (
    typeof packageSlug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packageSlug)
  ) {
    return response('Choose a valid package before checkout.', 400);
  }

  const graph = await getContentGraph();
  const packageEntry = graph.packages.find(
    ({ data }) => data.slug === packageSlug,
  );
  if (!packageEntry) {
    return redirect('/checkout/cancel?reason=package-unavailable', 303);
  }

  const runtimeEnvironment = locals.runtime?.env;
  const deploymentMode = getDeploymentPaymentMode(runtimeEnvironment);
  const action = getPaymentActionForPackage(
    packageEntry,
    runtimeEnvironment,
  );

  if (deploymentMode === 'dummy') {
    return redirect(`/book/${packageEntry.data.slug}`, 303);
  }

  if (action.kind === 'payment-link') {
    const paymentLink = getStripePaymentLink(packageEntry);
    return paymentLink
      ? redirect(paymentLink, 303)
      : redirect(
          `/checkout/cancel?reason=configuration&package=${encodeURIComponent(packageSlug)}`,
          303,
        );
  }

  if (action.kind === 'checkout-session') {
    const session = await createCheckoutSession({
      packageEntry,
      runtimeEnvironment,
    });
    return session.ok
      ? redirect(session.url, 303)
      : redirect(
          `/checkout/cancel?reason=unavailable&package=${encodeURIComponent(packageSlug)}`,
          303,
        );
  }

  return redirect(
    `/checkout/cancel?reason=unavailable&package=${encodeURIComponent(packageSlug)}`,
    303,
  );
};

export const GET: APIRoute = () =>
  response('Method Not Allowed', 405, { Allow: 'POST' });

function response(
  body: string,
  status: number,
  additionalHeaders?: Record<string, string>,
) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'private, no-store',
      ...additionalHeaders,
    },
  });
}
