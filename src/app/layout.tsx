import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: "RECIA | Procesamiento de comprobantes",
  description:
    "RECIA esta construyendo una plataforma segura para procesar y archivar comprobantes de PyMEs argentinas.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
