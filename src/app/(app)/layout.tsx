import type { ReactNode } from "react";

import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/supabase/user";

import { signOut } from "../(auth)/actions";

export default async function AppLayout({ children }: Readonly<{ children: ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="workspaceShell">
      <header className="workspaceTopbar">
        <Link className="brand" href="/onboarding">
          <span className="brandMark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>RECIA</strong>
            <small>ESPACIO DE TRABAJO</small>
          </span>
        </Link>
        <div className="accountMenu">
          <span>{user.email}</span>
          <form action={signOut}>
            <button className="textButton" type="submit">
              Salir
            </button>
          </form>
        </div>
      </header>
      {children}
    </main>
  );
}
