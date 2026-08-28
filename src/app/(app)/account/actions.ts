"use server";

import { redirect } from "next/navigation";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function rawField(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export async function deleteAccount(formData: FormData) {
  const password = rawField(formData, "password");
  const confirmation = rawField(formData, "confirmation");
  if (confirmation !== "ELIMINAR" || !password) {
    redirect("/account?error=Confirmá+la+acción+y+tu+contraseña.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) redirect("/login");

  const { error: authenticationError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password,
  });
  if (authenticationError) {
    redirect("/account?error=La+contraseña+no+es+correcta.");
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc("delete_account_as_admin", {
    target_user_id: user.id,
  });
  if (error?.code === "23514") {
    redirect(
      "/account?error=Primero+transferí+o+eliminá+las+organizaciones+que+poseés.",
    );
  }
  if (error) redirect("/account?error=No+pudimos+eliminar+la+cuenta.");

  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?message=La+cuenta+fue+eliminada+definitivamente.");
}
