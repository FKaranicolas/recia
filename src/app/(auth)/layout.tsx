import type { ReactNode } from "react";

import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <main className="authShell">
      <Link className="authBrand" href="/">
        <span className="brandMark" aria-hidden="true">
          R
        </span>
        <span>
          <strong>RECIA</strong>
          <small>ACCESO SEGURO</small>
        </span>
      </Link>
      {children}
    </main>
  );
}
