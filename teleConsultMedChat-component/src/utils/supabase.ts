import { createClient } from '@supabase/supabase-js';
import { createDemoClient } from './demoClient';

type SupabaseErrorLike = { message: string } | null;

type SupabaseResultLike = {
  data: unknown;
  error: SupabaseErrorLike;
};

type QueryBuilderLike = PromiseLike<SupabaseResultLike> & {
  select: (columns?: string) => QueryBuilderLike;
  eq: (field: string, value: unknown) => QueryBuilderLike;
  in: (field: string, values: unknown[]) => QueryBuilderLike;
  order: (field: string, options?: { ascending?: boolean }) => QueryBuilderLike;
  limit: (value: number) => QueryBuilderLike;
  single: () => QueryBuilderLike;
  insert: (rows: Array<Record<string, unknown>>) => QueryBuilderLike;
  update: (patch: Record<string, unknown>) => QueryBuilderLike;
  delete: () => QueryBuilderLike;
  match: (values: Record<string, unknown>) => QueryBuilderLike;
};

type ChannelLike = {
  on: (
    eventType: string,
    config: { event: string; schema: string; table: string; filter?: string },
    callback: (payload: { new?: Record<string, unknown>; old?: Record<string, unknown> }) => void,
  ) => ChannelLike;
  subscribe: () => ChannelLike;
};

export type SupabaseClientLike = {
  from: (table: string) => QueryBuilderLike;
  channel: (name: string) => ChannelLike;
  removeChannel: (channel: ChannelLike) => Promise<{ data: null; error: null }>;
};

const appMode = String(import.meta.env.VITE_APP_MODE ?? 'demo').toLowerCase();
const useDemoMode = appMode !== 'live';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY;

const createSupabaseClient = (): SupabaseClientLike => {
  if (useDemoMode) {
    return createDemoClient() as unknown as SupabaseClientLike;
  }

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables in live mode.');
  }

  return createClient(supabaseUrl, supabaseKey) as unknown as SupabaseClientLike;
};

export const supabase: SupabaseClientLike = createSupabaseClient();
export const isDemoMode = useDemoMode;