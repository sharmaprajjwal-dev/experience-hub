import Stripe from 'stripe';
import type { PackageEntry } from './content';
import {
  getPackagePaymentAction,
  isAllowedStripePaymentLink,
  type DeploymentPaymentMode,
} from './payments';

export type PaymentRuntimeEnvironment = Record<string, string | undefined>;

const buildEnvironment = {
  paymentMode: import.meta.env.PAYMENT_MODE,
  secretKey: import.meta.env.STRIPE_SECRET_KEY,
  webhookSecret: import.meta.env.STRIPE_WEBHOOK_SECRET,
  siteUrl: import.meta.env.PUBLIC_SITE_URL,
};

function readEnvironment(
  key: keyof typeof buildEnvironment,
  runtimeName: string,
  runtimeEnvironment?: PaymentRuntimeEnvironment,
) {
  return (
    runtimeEnvironment?.[runtimeName]?.trim() ||
    buildEnvironment[key]?.trim() ||
    ''
  );
}

export function getDeploymentPaymentMode(
  runtimeEnvironment?: PaymentRuntimeEnvironment,
): DeploymentPaymentMode {
  const mode = readEnvironment(
    'paymentMode',
    'PAYMENT_MODE',
    runtimeEnvironment,
  ).toLowerCase();

  return mode === 'payment-link' || mode === 'checkout-session'
    ? mode
    : 'dummy';
}

export function getPaymentActionForPackage(
  packageEntry: PackageEntry,
  runtimeEnvironment?: PaymentRuntimeEnvironment,
) {
  return getPackagePaymentAction({
    packageEntry,
    deploymentMode: getDeploymentPaymentMode(runtimeEnvironment),
  });
}

export function getStripePaymentLink(packageEntry: PackageEntry) {
  const link = packageEntry.data.stripePaymentLink;
  return isAllowedStripePaymentLink(link) ? link : null;
}

function getStripeSecretKey(runtimeEnvironment?: PaymentRuntimeEnvironment) {
  const key = readEnvironment(
    'secretKey',
    'STRIPE_SECRET_KEY',
    runtimeEnvironment,
  );
  return /^sk_(test|live)_[A-Za-z0-9_]+$/.test(key) ? key : null;
}

function getWebhookSecret(runtimeEnvironment?: PaymentRuntimeEnvironment) {
  const secret = readEnvironment(
    'webhookSecret',
    'STRIPE_WEBHOOK_SECRET',
    runtimeEnvironment,
  );
  return /^whsec_[A-Za-z0-9_]+$/.test(secret) ? secret : null;
}

function getSiteOrigin(runtimeEnvironment?: PaymentRuntimeEnvironment) {
  const value = readEnvironment(
    'siteUrl',
    'PUBLIC_SITE_URL',
    runtimeEnvironment,
  );
  if (!value) return null;

  try {
    const url = new URL(value);
    const localHttp =
      url.protocol === 'http:' &&
      (url.hostname === 'localhost' || url.hostname === '127.0.0.1');

    if (
      (url.protocol !== 'https:' && !localHttp) ||
      url.username ||
      url.password ||
      url.pathname !== '/' ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function createStripeClient(secretKey: string) {
  return new Stripe(secretKey, {
    httpClient: Stripe.createFetchHttpClient(),
    maxNetworkRetries: 1,
    timeout: 12_000,
    appInfo: {
      name: 'ExperienceHub',
      version: '0.1.0',
    },
  });
}

export async function createCheckoutSession({
  packageEntry,
  runtimeEnvironment,
}: {
  packageEntry: PackageEntry;
  runtimeEnvironment?: PaymentRuntimeEnvironment;
}) {
  const action = getPaymentActionForPackage(packageEntry, runtimeEnvironment);
  const secretKey = getStripeSecretKey(runtimeEnvironment);
  const siteOrigin = getSiteOrigin(runtimeEnvironment);
  const data = packageEntry.data;

  if (
    action.kind !== 'checkout-session' ||
    !secretKey ||
    !siteOrigin ||
    !data.stripePriceId ||
    data.trustedAmountMinor === undefined
  ) {
    return {
      ok: false as const,
      error: 'Secure checkout is not configured for this package.',
    };
  }

  const stripe = createStripeClient(secretKey);

  try {
    const stripePrice = await stripe.prices.retrieve(data.stripePriceId);
    if (
      !stripePrice.active ||
      stripePrice.type !== 'one_time' ||
      stripePrice.currency.toUpperCase() !== data.currency ||
      stripePrice.unit_amount !== data.trustedAmountMinor
    ) {
      return {
        ok: false as const,
        error:
          'The package price does not match its trusted Stripe configuration.',
      };
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: data.stripePriceId, quantity: 1 }],
      client_reference_id: data.slug,
      metadata: {
        package_slug: data.slug,
      },
      payment_intent_data: {
        metadata: {
          package_slug: data.slug,
        },
      },
      success_url: `${siteOrigin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteOrigin}/checkout/cancel?package=${encodeURIComponent(data.slug)}`,
    });

    if (!session.url) {
      return {
        ok: false as const,
        error: 'Stripe did not return a checkout destination.',
      };
    }

    return { ok: true as const, url: session.url };
  } catch {
    return {
      ok: false as const,
      error: 'Secure checkout is temporarily unavailable. Please try again.',
    };
  }
}

export async function retrieveCheckoutSession({
  sessionId,
  runtimeEnvironment,
}: {
  sessionId: string;
  runtimeEnvironment?: PaymentRuntimeEnvironment;
}) {
  const secretKey = getStripeSecretKey(runtimeEnvironment);
  if (!secretKey || !/^cs_(test_|live_)?[A-Za-z0-9_]+$/.test(sessionId)) {
    return { ok: false as const };
  }

  try {
    const session = await createStripeClient(secretKey).checkout.sessions.retrieve(
      sessionId,
    );
    return {
      ok: true as const,
      session: {
        id: session.id,
        mode: session.mode,
        status: session.status,
        paymentStatus: session.payment_status,
        amountTotal: session.amount_total,
        currency: session.currency?.toUpperCase() ?? null,
        clientReferenceId: session.client_reference_id,
        packageSlug: session.metadata?.package_slug ?? null,
      },
    };
  } catch {
    return { ok: false as const };
  }
}

export async function verifyWebhookEvent({
  payload,
  signature,
  runtimeEnvironment,
}: {
  payload: string;
  signature: string;
  runtimeEnvironment?: PaymentRuntimeEnvironment;
}) {
  const secretKey = getStripeSecretKey(runtimeEnvironment);
  const webhookSecret = getWebhookSecret(runtimeEnvironment);
  if (!secretKey || !webhookSecret) {
    return { ok: false as const, reason: 'configuration' as const };
  }

  try {
    const stripe = createStripeClient(secretKey);
    const event = await stripe.webhooks.constructEventAsync(
      payload,
      signature,
      webhookSecret,
      undefined,
      Stripe.createSubtleCryptoProvider(),
    );
    return { ok: true as const, event };
  } catch {
    return { ok: false as const, reason: 'signature' as const };
  }
}
