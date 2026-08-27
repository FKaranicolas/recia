import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

import { safeNextPath } from "@/lib/navigation";
import { getSupabaseEnvironment } from "@/lib/supabase/env";
import type { Database } from "@/types/database";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(request.nextUrl.searchParams.get("next")) ?? "/onboarding";
  const response = NextResponse.redirect(new URL(next, request.url));
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnvironment();
  const supabase = createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headersToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        Object.entries(headersToSet).forEach(([name, value]) => {
          response.headers.set(name, value);
        });
      },
    },
  });

  const result = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { error: new Error("Missing confirmation credentials") };

  if (!result.error) return response;

  const errorResponse = NextResponse.redirect(
    new URL(
      "/login?message=Si+abriste+el+email+en+otro+dispositivo,+la+cuenta+ya+puede+estar+confirmada.+Intentá+ingresar.",
      request.url,
    ),
  );
  errorResponse.headers.set("Cache-Control", "private, no-store");
  return errorResponse;
}
