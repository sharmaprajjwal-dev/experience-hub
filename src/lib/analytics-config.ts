export type AnalyticsConfiguration =
  | { mode: 'gtm'; id: string }
  | { mode: 'ga4'; id: string };

const GTM_ID_PATTERN = /^GTM-[A-Z0-9]+$/;
const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]+$/;

const normaliseIdentifier = (value: string | undefined) =>
  value?.trim().toUpperCase() ?? '';

export function getAnalyticsConfiguration(): AnalyticsConfiguration | null {
  const gtmContainerId = normaliseIdentifier(
    import.meta.env.PUBLIC_GTM_CONTAINER_ID,
  );
  const gaMeasurementId = normaliseIdentifier(
    import.meta.env.PUBLIC_GA_MEASUREMENT_ID,
  );

  if (GTM_ID_PATTERN.test(gtmContainerId)) {
    return { mode: 'gtm', id: gtmContainerId };
  }

  if (GA_MEASUREMENT_ID_PATTERN.test(gaMeasurementId)) {
    return { mode: 'ga4', id: gaMeasurementId };
  }

  return null;
}
