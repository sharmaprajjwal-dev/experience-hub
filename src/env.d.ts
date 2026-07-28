/// <reference types="astro/client" />

import type {
  SupabaseClient,
  User,
} from '@supabase/supabase-js';

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL?: string;
  readonly PUBLIC_SUPABASE_ANON_KEY?: string;
  readonly PUBLIC_GA_MEASUREMENT_ID?: string;
  readonly PUBLIC_GTM_CONTAINER_ID?: string;
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_STRIPE_PUBLISHABLE_KEY?: string;
  readonly PAYMENT_MODE?: string;
  readonly STRIPE_SECRET_KEY?: string;
  readonly STRIPE_WEBHOOK_SECRET?: string;
  readonly OPENROUTER_API_KEY?: string;
  readonly OPENROUTER_MODEL?: string;
  readonly SITE_URL?: string;
  readonly SITE_NAME?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  namespace App {
    interface Locals {
      supabase?: SupabaseClient;
      adminUser?: Pick<User, 'id' | 'email'>;
    }
  }
}

export {};
