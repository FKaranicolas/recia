const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function hasSupabaseEnvironment() {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function getSupabaseEnvironment() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error("Supabase environment variables are not configured");
  }

  return { supabaseUrl, supabasePublishableKey };
}
