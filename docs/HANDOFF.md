# Handoff operativo de RECIA

## Metadata del snapshot

- **Repositorio:** https://github.com/FKaranicolas/recia
- **Rama:** `main`
- **Commit del prototipo preservado:** `82185e7ff03c57e0f6c432424cee60be86b95603`
- **Tag del prototipo:** `prototype-v0.1.0`
- **Commit de decisiones previo a M1:** `1b28124`
- **Commit base desplegado para M1:** `115cd26228b863e6625dde489c633855c3e63dee`
- **Commit funcional que cierra M2:** `1e8c18ac2539535d53622aa10a84517b7d996624`
- **Commit de cierre documental M2 auditado:** `20b174065baf08c7d86185e6f2fce4bbbdc0c4b4`
- **Commit que contiene este snapshot:** el commit documental que contiene este archivo; obtenerlo con `git log -1 --format=%H -- docs/HANDOFF.md`.
- **Fecha del snapshot:** 2026-08-28
- **Checkout usado para documentar:** `/home/kara96/code/recia`
- **Fuentes canonicas:** este archivo, [DECISIONS.md](DECISIONS.md), [ROADMAP.md](ROADMAP.md), [SUPABASE.md](SUPABASE.md), [API.md](API.md) y el codigo de `main`.

El tag fijo reproduce la demo vanilla. La raiz de `main` contiene desde M1 la aplicacion Next.js; para determinar el estado exacto se debe revisar el `HEAD` actual y el commit que contiene este handoff.

## Resumen ejecutivo

RECIA busca convertirse en un SaaS publico para PyMEs argentinas que cargue comprobantes, extraiga datos fiscales, permita revisarlos, archive los originales y exporte CSV/XLSX.

El repositorio contiene Next.js 16, React 19 y TypeScript con Auth, organizaciones multi-tenant, cuatro roles, RLS, pruebas PostgreSQL, CI y despliegue continuo en Vercel. M2 cumple sus criterios de aceptacion y esta cerrado; un gate de endurecimiento pre-M3 debe resolver dos brechas adicionales antes de iniciar el siguiente hito. La pagina publica comunica correctamente que M3 es el proximo hito de producto. El prototipo anterior ya no esta en la raiz y se recupera por tag.

La arquitectura objetivo aceptada es Next.js + TypeScript en Vercel, con Supabase Auth/PostgreSQL/Storage, organizaciones multi-tenant, RLS, procesamiento OCR asincrono y revision humana.

## Instrucciones no negociables

- No presentar la pagina de estado como producto terminado.
- No reincorporar `localStorage` ni la IA simulada desde el tag del prototipo.
- No exponer claves de Supabase `service_role` ni del proveedor OCR al navegador.
- No implementar acceso a datos sin `organization_id`, RLS y tests negativos entre tenants.
- No elegir proveedor OCR antes de definir y ejecutar el benchmark.
- No confundir confianza declarada por un modelo con precision medida.
- No inventar endpoints o funciones no presentes en el codigo.
- No incluir secretos en documentacion, logs, fixtures o commits.

## Estado actual

### Implementado

- Next.js 16 con App Router y React 19.
- TypeScript estricto.
- Pagina responsive de estado hasta M2 sin claims de funciones inexistentes.
- ESLint 9 con reglas de Next.js.
- Seis tests Vitest de pagina y utilidades de contrasena/redirect.
- Scripts de lint, typecheck, test, build y verificacion de aplicacion.
- GitHub Actions con jobs `verify` y `database`; este CI es informativo y no bloquea Vercel.
- Supabase Auth con registro inmediato, login, logout y recuperacion de contrasena.
- Perfiles, organizaciones, membresias, invitaciones manuales y cuatro roles.
- Organizaciones creadas por RPC con propietario unico, transferencia atomica y organizacion activa expresada en la URL.
- RLS y funciones `security definer` endurecidas y cubiertas por tests negativos entre tenants.
- Invitaciones bearer de un solo uso, 7 dias y roles limitados a operador o solo lectura.
- Tope de 10 organizaciones al crear y 30 invitaciones por organizacion/hora; una transferencia puede superar el primer tope.
- Eliminacion inmediata y server-only: nombre exacto para organizaciones y reautenticacion adicional para cuentas.
- Contrato de variables publicas y `SUPABASE_SECRET_KEY` server-only en `.env.example`.
- Migraciones, configuracion Auth y estrategia de Storage en `supabase/` y `docs/SUPABASE.md`.
- Node 24.20.0 instalado localmente en WSL y fijado en `.nvmrc`; `package.json` exige Node 24 o superior.
- Prototipo publicado en el tag `prototype-v0.1.0`.
- Produccion de Vercel accesible en https://recia.vercel.app.
- Commit base de M1 `115cd26228b863e6625dde489c633855c3e63dee` desplegado correctamente.
- Cierre funcional M2 `1e8c18ac2539535d53622aa10a84517b7d996624` desplegado correctamente.
- Cierre documental M2 `20b174065baf08c7d86185e6f2fce4bbbdc0c4b4` desplegado correctamente.
- GitHub Actions final verificado en verde: https://github.com/FKaranicolas/recia/actions/runs/33177367678.

### No implementado

- Storage privado y preservacion del original.
- OCR real.
- PDF y soporte HEIC garantizado.
- Procesamiento asincrono durable.
- Exportaciones CSV/XLSX.
- Auditoria general, backups, observabilidad y rate limiting general.
- Tests E2E de navegador.
- Tests de route handlers y server actions.
- Flujos comerciales, privacidad, terminos y retencion.

## Inventario principal del repositorio

| Archivo | Responsabilidad actual |
|---|---|
| `src/app/layout.tsx` | Metadata, idioma y layout raiz. |
| `src/app/page.tsx` | Pagina publica de estado hasta M2. |
| `src/app/(auth)/` | Registro, login y recuperacion de acceso. |
| `src/app/(app)/` | Onboarding, cuenta, administracion y control de acceso de rutas privadas. |
| `src/lib/supabase/` | Clientes Supabase de navegador, SSR y administracion server-only. |
| `src/proxy.ts` | Renovacion de cookies y sesion Supabase; no decide acceso a rutas privadas. |
| `src/app/globals.css` | Sistema visual responsive de la pagina inicial. |
| `src/app/page.test.tsx` | Pruebas de claims y secuencia de hitos. |
| `supabase/migrations/` | Esquema, RLS, cuotas y funciones transaccionales de M2. |
| `supabase/tests/database/` | 35 assertions pgTAP de esquema, privilegios, aislamiento, invitaciones, cuotas y borrados. |
| `.github/workflows/ci.yml` | Verificacion de aplicacion y base en GitHub. |
| `.env.example` | Contrato de variables publicas y secreto server-only de Supabase. |
| `package.json` | Versiones y comandos del proyecto. |
| `docs/SUPABASE.md` | Estrategia de ambientes, migraciones, RLS y Storage. |
| `docs/API.md` | Inventario interno de route handlers, lecturas Data API y RPC de M2. |
| `docs/RELAY_PROMPT.md` | Prompt autocontenido para retomar desde otro equipo. |

## Como ejecutar y verificar M2

```bash
git clone https://github.com/FKaranicolas/recia.git
cd recia
npm ci
npm run supabase:start
npx supabase status
```

Crear `.env.local` con los valores locales impresos por Supabase y ejecutar `npm run dev`. Abrir `http://localhost:3000`; Mailpit esta en `http://localhost:54324`. Node 24, npm `11.19.0` y Docker o runtime compatible son la configuracion reproducible.

La aplicacion necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Las acciones destructivas tambien requieren `SUPABASE_SECRET_KEY` exclusivamente en el servidor.

```bash
npm run verify
npm run supabase:start
npm run db:reset
npm run db:test
npm run supabase:stop
```

`verify` cubre solamente la aplicacion: lint, typecheck, seis tests Vitest y build. La secuencia Supabase comprueba una base local limpia; `db:reset` borra datos locales. El job `database` de CI ejecuta 35 assertions pgTAP. El 2026-08-28 se observo `npm audit --audit-level=high` con 0 vulnerabilidades, pero audit no forma parte del workflow.

La produccion publica esta disponible en https://recia.vercel.app. El 2026-08-28 se verifico registro con sesion inmediata y respuesta HTTP `200`; la cuenta descartable se elimino despues del smoke test.

## Flujo actual de usuario

1. La pagina `/` muestra M0, M1 y M2 completados, con M3 como siguiente.
2. Un visitante crea una cuenta y recibe una sesion inmediata, o inicia sesion y puede recuperar su contrasena.
3. El usuario crea su primera organizacion o acepta un enlace de invitacion bearer.
4. La organizacion activa queda en `/organizations/[organizationId]`; RLS limita lecturas por membresia y los RPC vuelven a comprobar roles para operaciones privilegiadas.
5. Propietarios y administradores gestionan equipo e invitaciones segun `DEC-014`.
6. El propietario puede transferir propiedad o eliminar la organizacion; una cuenta sin organizaciones propias puede eliminarse tras reautenticacion.
7. Un aviso explicito informa que archivo documental y OCR aun no funcionan.

## Contrato y reglas del prototipo historico

Las siguientes reglas ya no se ejecutan en `main`; se conservan como contexto para no reintroducir sus defectos al migrar UX desde `prototype-v0.1.0`.

### Campos de un comprobante

- `id`
- `createdAt`
- `documentImage`
- `documentType`
- `cuit`
- `supplier`
- `date`
- `pointOfSale`
- `invoiceNumber`
- `subtotal`
- `iva`
- `total`
- `paymentMethod`
- `category`
- `aiConfidence`
- `status`

### Catalogos

- Tipos: Factura A, Factura B, Factura C, Recibo y Nota de credito.
- Categorias: Tecnologia, Insumos, Servicios, Logistica y Otros.
- Medios de pago: Transferencia, Efectivo, Tarjeta de credito, Tarjeta de debito, Cheque y Cuenta corriente.

El seed incluye `Debito automatico`, aunque no aparece en el catalogo de medios de pago.

### Estados

- `processed`: confianza mayor o igual a `0.85`.
- `review`: confianza mayor o igual a `0.60` y menor a `0.85`.
- `error`: confianza menor a `0.60`.

Editar manualmente fuerza `status: processed`, sin conservar historial.

### Validaciones

- Proveedor requerido.
- Fecha requerida.
- Total mayor a cero.
- CUIT opcional; si se informa debe contener 11 digitos.
- Total recalculado como subtotal + IVA mientras se edita.

No se valida el digito verificador del CUIT, duplicados, moneda, alicuotas multiples, percepciones ni signo de notas de credito.

### Almacenamiento

- Datos: `recia.receipts.v1`.
- Flag de seed: `recia.seeded.v1`.
- Driver primario: `localStorage`.
- Fallback: objeto en memoria que se pierde al recargar.

## Arquitectura objetivo aprobada

| Area | Decision |
|---|---|
| Aplicacion | Next.js App Router + TypeScript |
| Hosting | Vercel |
| Auth | Supabase Auth |
| Datos | Supabase PostgreSQL con migraciones |
| Archivos | Supabase Storage privado y URLs firmadas cortas |
| Tenancy | Organizaciones, membresias, roles y RLS |
| OCR | Adaptador server-side; proveedor elegido por benchmark |
| Jobs | Asincronos, persistidos, idempotentes y con reintentos |
| Exportacion | CSV/XLSX generados server-side |
| Ambientes | Desarrollo, staging y produccion separados |
| Operacion | Auditoria, backups, rate limiting y observabilidad |

Flujo objetivo resumido:

1. Usuario autenticado selecciona una organizacion.
2. API autoriza membresia, cuota y formato.
3. El original se sube al bucket privado y se registra su hash.
4. Se crea un job idempotente.
5. Un worker invoca al adaptador OCR.
6. La salida se valida contra un esquema estricto y queda en revision.
7. Un usuario autorizado corrige y confirma.
8. Busquedas, metricas y exportaciones usan el dato revisado.
9. Cada operacion critica deja auditoria.

## Modelo de datos objetivo

### `profiles`

Perfil de usuario asociado a Supabase Auth.

### `organizations`

Tenant comercial, zona horaria, estado y configuracion basica.

### `organization_members`

Relacion usuario-organizacion y rol: propietario, administrador, operador o solo lectura.

### `documents`

Original, `organization_id`, ruta privada, MIME, bytes, hash, paginas, uploader, estado y timestamps. Todo documento pertenece obligatoriamente a una organizacion.

### `receipt_data`

Resultado OCR, valores revisados, version, proveedor y trazabilidad. Debe distinguir dato extraido de dato confirmado.

### `receipt_tax_lines`

Desglose normalizado por alicuota, con base imponible, tasa e importe de IVA.

### `receipt_other_taxes`

Percepciones y otros tributos normalizados por tipo, jurisdiccion, base, tasa e importe.

### `processing_jobs`

Estado, intentos, idempotency key, error seguro, proveedor, version y tiempos de cada proceso.

### `audit_events`

Registro append-only de actor, organizacion, accion, recurso, timestamp y cambios permitidos.

### `usage_periods`

Cuotas y consumo por organizacion y periodo para prueba y planes manuales.

### Campos fiscales previstos

- Tipo de comprobante.
- Emisor, razon social y CUIT.
- Receptor y CUIT cuando exista.
- Fecha de emision.
- Punto de venta y numero.
- Moneda y tipo de cambio.
- Neto gravado.
- Importes por alicuota de IVA.
- Importe exento o no gravado.
- Percepciones y otros impuestos.
- Total.
- CAE/CAI y vencimiento cuando esten disponibles.
- Categoria interna.
- Medio de pago opcional y manual.
- Estado de revision.

`DEC-018` fija `numeric(18,2)` para importes, `numeric(7,4)` para tasas y `numeric(18,6)` para tipo de cambio. Los importes se guardan como absolutos y el signo contable se deriva del tipo; una clave unica parcial evita duplicados activos por organizacion, CUIT emisor, tipo, punto de venta y numero cuando todos estan presentes.

## Alcance de V1

- SaaS publico para PyMEs argentinas.
- Registro con prueba limitada y equipos.
- PDF, JPG, PNG y HEIC.
- Original privado e inmutable.
- OCR real server-side y asincrono.
- Revision humana.
- Archivo, busqueda, filtros y descarga.
- CSV y XLSX.
- Cobro manual.

## Exclusiones de V1

- ARCA.
- Tango, Xubio y otras integraciones.
- Ingesta por email.
- App movil nativa.
- Billing automatico.
- Contabilizacion sin revision humana.

## Matriz de brecha

| Area | Estado M2 | V1 |
|---|---|---|
| Frontend | Next.js + TypeScript, Auth y organizaciones responsive | Aplicacion completa responsive |
| Datos | PostgreSQL, migraciones y RLS de identidad | Esquema fiscal completo + RLS |
| Auth | Registro inmediato, sesion y recuperacion | Supabase Auth operable |
| Tenancy | Organizaciones, cuatro roles e invitaciones | Organizaciones y roles |
| Archivos | Sin implementar | Original privado en Storage |
| OCR | Sin implementar | Benchmark + proveedor real |
| Formatos | Limites decididos, sin upload | PDF/JPG/PNG/HEIC |
| Exportacion | No existe | CSV/XLSX |
| Operacion | CI local/GitHub y produccion en Vercel | Auditoria, backups y alertas |
| Calidad | Lint, typecheck, 6 tests Vitest, 35 assertions pgTAP y build | Unit, integration, RLS y E2E |

## Decisiones aceptadas

La fuente completa es [DECISIONS.md](DECISIONS.md). En resumen:

- SaaS publico para PyMEs argentinas.
- Alcance de carga, OCR, revision, archivo y exportacion.
- Next.js/TypeScript, Vercel y Supabase.
- Organizaciones, cuatro roles y RLS.
- PDF/JPG/PNG/HEIC con original inmutable.
- Procesamiento asincrono.
- OCR elegido por benchmark.
- CSV/XLSX server-side.
- Registro publico, equipos y cobro manual.
- Exclusiones de V1.
- Demo tratada como prototipo.
- Matriz conservadora de permisos aprobada.
- Esquema fiscal normalizado con lineas de IVA y otros tributos.
- Limites de 10 MB/40 MP para imagenes y 20 MB/10 paginas para PDF.
- Benchmark de 100 documentos contra tres candidatos.
- Prototipo preservado por el tag `prototype-v0.1.0` antes de reemplazar la raiz.
- Registro inmediato sin confirmacion, recuperacion y contrasena minima reforzada.
- Invitaciones bearer de 7 dias limitadas a operador o solo lectura.
- Propietario unico en el flujo RPC y eliminaciones M2 ejecutadas solo desde servidor.
- Topes tecnicos antiabuso, con bypass conocido del tope de organizaciones mediante transferencia.

## Decisiones resueltas hasta M2

- `DEC-014`: matriz conservadora de permisos.
- `DEC-015`: protocolo de 100 documentos, tres candidatos y umbrales de calidad/operacion.
- `DEC-017`: limites, formatos y conversiones de archivos.
- `DEC-018`: esquema fiscal normalizado, signos y duplicados.
- `DEC-023`: tag inmutable del prototipo y reemplazo de la raiz.
- `DEC-026`: registro, contrasenas e invitaciones de M2.
- `DEC-027`: propiedad y eliminacion de identidad/organizaciones.
- `DEC-028`: topes tecnicos antiabuso.

## Decisiones pendientes posteriores

- `DEC-016`: proveedor de cola.
- `DEC-019`: contrato de exportacion.
- `DEC-020`: prueba, planes y precios.
- `DEC-021`: retencion, eliminacion y backups.
- `DEC-022`: email y observabilidad.
- `DEC-024`: licencia.
- `DEC-025`: proveedor OCR, a decidir solamente despues del benchmark.

No implementar una decision marcada como pendiente suponiendo una respuesta silenciosa. Documentar la propuesta y pedir confirmacion cuando bloquee el siguiente hito.

## Hallazgos y riesgos conocidos

1. `transfer_organization_ownership` no aplica el tope de 10 organizaciones al nuevo propietario; corregir y agregar pgTAP antes de M3.
2. La invariante de propietario unico no cubre un insert privilegiado directo en `organizations`; prohibir esa ruta y endurecerla antes de M3.
3. La produccion publica apunta al unico proyecto remoto `recia-dev`; separar ambientes antes de desplegar M3 o crear recursos remotos del hito.
4. `DEC-021` sigue pendiente y bloquea comprobantes reales aun despues de separar ambientes. Usar solo fixtures ficticios o anonimizados.
5. El signup tecnico ya es publico sin CAPTCHA, observabilidad ni rate limiting general; M7 agrega controles comerciales y operativos.
6. Vercel despliega cada push a `main` sin esperar los jobs de CI. `main` no tiene checks requeridos y las migraciones/configuracion remotas se promueven manualmente.
7. CI prueba migraciones y RLS sobre Supabase local limpio, no demuestra por si solo el estado de la base hospedada. Verificar el enlace y `migration list --linked` antes de operar remotamente.
8. La confirmacion de email esta deshabilitada. Una invitacion prueba posesion del enlace y coincidencia declarada del email, no control de la casilla; compartirla como secreto.
9. El RPC de borrado de cuenta confia en el usuario objetivo pasado por la accion server-side; la reautenticacion y vinculacion de identidad ocurren en Next.js, no dentro del RPC.
10. Faltan E2E de navegador y tests de route handlers/server actions. Los tipos Supabase son manuales y no hay control de drift.
11. La recuperacion depende del proveedor de email incluido de Supabase; `DEC-022` sigue pendiente.
12. `SUPABASE_SECRET_KEY` solo esta configurada en Vercel; para probar borrados localmente debe agregarse al entorno server-only sin versionarla.
13. ESLint esta fijado en 9 por incompatibilidad transitiva con ESLint 10. Las Actions v4 tambien reportan deuda por runtime Node 20 deprecado.
14. No hay licencia definida.
15. Uploads, OCR, exportacion, auditoria general y backups siguen sin implementar y no deben simularse.
16. Los defectos del prototipo (`localStorage`, importes decimales, notas de credito y carrera de captura) permanecen solo en el tag y no deben copiarse.

## Proxima tarea recomendada

Completar el gate de endurecimiento pre-M3: aplicar el tope de organizaciones durante transferencias, cubrir la creacion privilegiada de organizaciones sin propietario y agregar tests pgTAP negativos. M2 permanece cerrado y no se crean recursos de M3 en esta tarea.

## Definition of Done de la proxima tarea

- Una transferencia a un usuario con 10 organizaciones falla sin cambiar propietarios ni roles.
- Inserts privilegiados directos no pueden dejar una organizacion activa sin propietario.
- pgTAP cubre ambas rutas y mantiene los 35 casos existentes.
- El estado remoto enlazado se consulta sin aplicar cambios y se registra el ambiente destino.
- No se crean tablas, buckets ni codigo de M3.
- Verificacion local, GitHub Actions y deployment de Vercel finalizan correctamente.

## Como mantener este handoff

- Actualizar fecha, estado, commit de codigo auditado y referencia al commit documental despues de cada hito relevante.
- Separar hechos comprobados, decisiones aceptadas, pendientes y recomendaciones.
- Enlazar commits o PRs que implementen cada decision.
- Reemplazar contratos actuales cuando exista codigo productivo, sin borrar el historial relevante.
- Registrar comandos ejecutados y resultado de tests.
- No incluir secretos ni datos fiscales reales.
- Mantener una unica proxima tarea prioritaria y su Definition of Done.

## Prompt reutilizable para una nueva conversacion

Usar [RELAY_PROMPT.md](RELAY_PROMPT.md). Su primera fase es solo de verificacion del equipo nuevo y debe detenerse hasta recibir confirmacion explicita.

## Historial del handoff

| Fecha | Referencia | Cambio |
|---|---|---|
| 2026-08-26 | `d07886d` | Auditoria inicial del prototipo. |
| 2026-08-26 | `82185e7` / `prototype-v0.1.0` | Documentacion y preservacion del prototipo. |
| 2026-08-26 | `1b28124` | Decisiones bloqueantes de M1 resueltas. |
| 2026-08-26 | `115cd26` | Scaffold M1 publicado y verificado localmente y en GitHub Actions. |
| 2026-08-27 | `115cd26` / https://recia.vercel.app | Produccion verificada y M1 completado. |
| 2026-08-28 | `53ab864` | Auth, organizaciones, roles, RLS e invitaciones implementados. |
| 2026-08-28 | `1258e5d` | Prueba negativa RLS corregida. |
| 2026-08-28 | `c37e878` | Recuperacion de acceso y politica minima de contrasena. |
| 2026-08-28 | `1e8c18a` | Registro inmediato y eliminacion segura; CI y produccion verificados. |
| 2026-08-28 | `20b1740` | Cierre documental M2, portada M3 siguiente, CI y Vercel verificados. |
