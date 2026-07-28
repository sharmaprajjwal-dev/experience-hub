-- ExperienceHub package-payment preparation.
-- Stripe secret keys are deployment secrets and never belong in PostgreSQL.

alter table public.packages
  add column payment_enabled boolean not null default false,
  add column payment_mode text not null default 'dummy',
  add column stripe_price_id text,
  add column stripe_payment_link text,
  add column trusted_amount_minor bigint;

alter table public.packages
  add constraint packages_payment_mode_allowed check (
    payment_mode in ('dummy', 'payment-link', 'checkout-session', 'contact')
  ),
  add constraint packages_stripe_price_id_format check (
    stripe_price_id is null
    or stripe_price_id ~ '^price_[A-Za-z0-9]+$'
  ),
  add constraint packages_stripe_payment_link_format check (
    stripe_payment_link is null
    or stripe_payment_link ~ '^https://(buy|checkout)\.stripe\.com/'
  ),
  add constraint packages_trusted_amount_minor_nonnegative check (
    trusted_amount_minor is null or trusted_amount_minor >= 0
  );

create index packages_payment_ready_idx
  on public.packages (payment_mode)
  where active and payment_enabled;

comment on column public.packages.stripe_price_id is
  'Public Stripe Price identifier used by the trusted server to create Checkout Sessions.';

comment on column public.packages.stripe_payment_link is
  'Validated Stripe-hosted Payment Link; contains no secret credential.';

comment on column public.packages.trusted_amount_minor is
  'Expected charge amount in the currency minor unit, used for server-side Stripe Price verification.';
