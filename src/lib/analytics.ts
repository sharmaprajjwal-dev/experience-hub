export const analyticsEventNames = [
  'country_selected',
  'experience_viewed',
  'package_viewed',
  'ai_assistant_opened',
  'ai_recommendation_clicked',
  'booking_button_clicked',
  'checkout_started',
  'purchase_completed',
] as const;

export type AnalyticsEventName = (typeof analyticsEventNames)[number];

export interface AnalyticsEventParameters {
  country?: string;
  restaurant?: string;
  experience?: string;
  package?: string;
  currency?: string;
  value?: number;
}

interface AnalyticsState {
  consent: 'accepted' | 'rejected' | 'unknown';
  loaded: boolean;
  mode: 'gtm' | 'ga4';
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    experienceHubAnalytics?: AnalyticsState;
  }
}

const STRING_PARAMETER_KEYS = [
  'country',
  'restaurant',
  'experience',
  'package',
] as const;

function cleanParameters(parameters: AnalyticsEventParameters) {
  const cleaned: AnalyticsEventParameters = {};

  for (const key of STRING_PARAMETER_KEYS) {
    const value = parameters[key]?.trim();
    if (value) cleaned[key] = value.slice(0, 120);
  }

  const currency = parameters.currency?.trim().toUpperCase();
  if (currency && /^[A-Z]{3}$/.test(currency)) {
    cleaned.currency = currency;
  }

  if (
    typeof parameters.value === 'number' &&
    Number.isFinite(parameters.value) &&
    parameters.value >= 0
  ) {
    cleaned.value = parameters.value;
  }

  return cleaned;
}

export function trackAnalyticsEvent(
  event: AnalyticsEventName,
  parameters: AnalyticsEventParameters = {},
) {
  if (typeof window === 'undefined') return false;

  const state = window.experienceHubAnalytics;
  if (!state?.loaded || state.consent !== 'accepted') return false;

  const cleanedParameters = cleanParameters(parameters);

  if (state.mode === 'gtm') {
    window.dataLayer?.push({ event, ...cleanedParameters });
    return true;
  }

  window.gtag?.('event', event, cleanedParameters);
  return true;
}
