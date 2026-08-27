import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/types/database";

import { getSupabaseEnvironment } from "./env";

export function createClient() {
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnvironment();

  return createBrowserClient<Database>(supabaseUrl, supabasePublishableKey);
}
