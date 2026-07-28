import type { PackageEntry } from './content';

export const packagePaymentModes = [
  'dummy',
  'payment-link',
  'checkout-session',
  'contact',
] as const;

export type PackagePaymentMode = (typeof packagePaymentModes)[number];
export type DeploymentPaymentMode = Exclude<PackagePaymentMode, 'contact'>;

export type PackagePaymentAction =
  | {
      kind: 'dummy';
      label: 'Demonstration checkout';
      href: string;
    }
  | {
      kind: 'payment-link' | 'checkout-session';
      label: 'Continue to secure checkout';
      endpoint: string;
    }
  | {
      kind: 'contact';
      label: 'Contact restaurant';
      reason: string;
    };

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function toStripeMinorUnits(price: number, currency: string) {
  if (!Number.isFinite(price) || price < 0 || !/^[A-Z]{3}$/.test(currency)) {
    return null;
  }

  const multiplier = ZERO_DECIMAL_CURRENCIES.has(currency) ? 1 : 100;
  const minorAmount = price * multiplier;
  const roundedAmount = Math.round(minorAmount);

  return Number.isSafeInteger(roundedAmount) &&
    Math.abs(minorAmount - roundedAmount) < 1e-6
    ? roundedAmount
    : null;
}

export function isStripePriceId(value: string | undefined | null) {
  return typeof value === 'string' && /^price_[A-Za-z0-9]+$/.test(value);
}

export function isAllowedStripePaymentLink(
  value: string | undefined | null,
) {
  if (!value) return false;

  try {
    const url = new URL(value);
    return (
      url.protocol === 'https:' &&
      (url.hostname === 'buy.stripe.com' ||
        url.hostname === 'checkout.stripe.com') &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

export function getPackagePaymentAction({
  packageEntry,
  deploymentMode,
}: {
  packageEntry: PackageEntry;
  deploymentMode: DeploymentPaymentMode;
}): PackagePaymentAction {
  const data = packageEntry.data;

  if (!data.paymentEnabled || data.paymentMode === 'contact') {
    return {
      kind: 'contact',
      label: 'Contact restaurant',
      reason: 'Online payment is not enabled for this package.',
    };
  }

  if (deploymentMode === 'dummy') {
    return {
      kind: 'dummy',
      label: 'Demonstration checkout',
      href: `/book/${data.slug}`,
    };
  }

  if (data.bookingStatus !== 'available') {
    return {
      kind: 'contact',
      label: 'Contact restaurant',
      reason: 'Online booking is not currently available for this package.',
    };
  }

  if (data.paymentMode !== deploymentMode) {
    return {
      kind: 'contact',
      label: 'Contact restaurant',
      reason: 'This package is not configured for the active payment mode.',
    };
  }

  if (
    deploymentMode === 'payment-link' &&
    data.priceStatus === 'confirmed' &&
    isAllowedStripePaymentLink(data.stripePaymentLink) &&
    toStripeMinorUnits(data.price, data.currency) === data.trustedAmountMinor
  ) {
    return {
      kind: 'payment-link',
      label: 'Continue to secure checkout',
      endpoint: '/api/checkout',
    };
  }

  if (
    deploymentMode === 'checkout-session' &&
    data.priceStatus === 'confirmed' &&
    isStripePriceId(data.stripePriceId) &&
    Number.isInteger(data.trustedAmountMinor) &&
    (data.trustedAmountMinor ?? -1) > 0 &&
    toStripeMinorUnits(data.price, data.currency) === data.trustedAmountMinor
  ) {
    return {
      kind: 'checkout-session',
      label: 'Continue to secure checkout',
      endpoint: '/api/checkout',
    };
  }

  return {
    kind: 'contact',
    label: 'Contact restaurant',
    reason: 'Secure checkout configuration is incomplete for this package.',
  };
}
