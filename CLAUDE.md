# RECIA — Guia para agentes

SaaS para PyMEs argentinas: carga de comprobantes, extraccion de datos fiscales,
revision humana, conservacion del original y exportacion administrativa.

## Estado

M2 cerrado (auth, organizaciones multi-tenant, 4 roles, RLS). M3 (archivo
documental e ingesta) es el proximo hito de producto, bloqueado por el gate de
endurecimiento pre-M3.

No estan implementados: carga de documentos, OCR, exportaciones CSV/XLSX, cobro.
No los simules ni los declares hechos.

## Stack

Next.js 16 (App Router), React 19, TypeScript estricto, Supabase (Auth +
Postgres + RLS), Vitest + Testing Library, pgTAP para la base, Vercel.

Node >= 24 (`.nvmrc` fija 24.20.0), npm 11.19.0.

## Comandos

```bash
npm ci                  # node_modules no esta versionado
npm run verify          # lint + typecheck + test + build
npm run dev

npm run supabase:start
npm run db:reset        # destruye datos locales
npm run db:test         # pgTAP
npm run supabase:stop
```

`npm run verify` y la cadena de base deben pasar antes de declarar trabajo hecho.

## Reglas duras

- **DEC-021 sin resolver:** prohibido almacenar comprobantes reales. Solo
  fixtures ficticios o anonimizados.
- **Sin recursos de M3** (tablas, buckets, codigo de ingesta) hasta cerrar el
  gate de endurecimiento pre-M3.
- `SUPABASE_SECRET_KEY` es server-only. Nunca con prefijo `NEXT_PUBLIC_`, nunca
  versionada, nunca en codigo de cliente.
- Produccion comparte transitoriamente el proyecto remoto `recia-dev`. No crear
  recursos remotos nuevos sin ambiente dedicado.
- Migraciones: solo agregar archivos nuevos en `supabase/migrations/`. No editar
  migraciones ya aplicadas.

## Invariantes del dominio

- Una organizacion tiene **exactamente un** propietario activo.
- Un usuario posee **como maximo 10** organizaciones activas.
- Ninguna organizacion puede leer, listar ni firmar recursos de otra.

Los tests pgTAP en `supabase/tests/database/` son la prueba de estas
invariantes, no la narracion del agente.

## Estructura

```text
src/app/(app)/     rutas autenticadas
src/app/(auth)/    login, registro, recuperacion
src/lib/supabase/  clientes server/browser/admin y contrato de env
supabase/          config, migraciones y pruebas pgTAP
openspec/          specs canonicas y cambios activos (flujo SDD)
docs/              roadmap, decisiones, handoff
```

## Flujo de trabajo con agentes

Claude orquesta: revisa estado, escribe proposal y spec en `openspec/`, revisa
el diff y gestiona git. Pi + gentle-pi ejecuta el ciclo SDD
(design -> tasks -> apply -> verify) con TDD estricto. Engram es la memoria
compartida entre ambos.

`openspec/config.yaml` declara `strict_tdd: true`: apply y verify deben registrar
evidencia RED -> GREEN -> TRIANGULATE -> REFACTOR.

## Documentacion

`docs/ROADMAP.md` (hitos y proxima accion), `docs/DECISIONS.md` (DEC-xxx),
`docs/HANDOFF.md` (estado auditado y DoD de la proxima tarea),
`docs/SUPABASE.md`, `docs/API.md`.

Actualizar el handoff y el roadmap despues de cada hito. Idioma de docs y
commits: espanol, sin tildes en los archivos existentes.
