# Handoff operativo de RECIA

## Metadata del snapshot

- **Repositorio:** https://github.com/FKaranicolas/recia
- **Rama:** `main`
- **Commit del prototipo preservado:** `82185e7ff03c57e0f6c432424cee60be86b95603`
- **Tag del prototipo:** `prototype-v0.1.0`
- **Commit de decisiones previo a M1:** `1b28124`
- **Commit que contiene este snapshot:** el commit documental que contiene este archivo; obtenerlo con `git log -1 --format=%H -- docs/HANDOFF.md`.
- **Fecha del snapshot:** 2026-08-26
- **Checkout usado para documentar:** `/home/kara96/code/recia`
- **Fuentes canonicas:** este archivo, [DECISIONS.md](DECISIONS.md), [ROADMAP.md](ROADMAP.md), [SUPABASE.md](SUPABASE.md) y el codigo de `main`.

El tag fijo reproduce la demo vanilla. La raiz de `main` contiene desde M1 la aplicacion Next.js; para determinar el estado exacto se debe revisar el `HEAD` actual y el commit que contiene este handoff.

## Resumen ejecutivo

RECIA busca convertirse en un SaaS publico para PyMEs argentinas que cargue comprobantes, extraiga datos fiscales, permita revisarlos, archive los originales y exporte CSV/XLSX.

El repositorio contiene una base Next.js 16, React 19 y TypeScript con lint, tests, build y CI. La pagina actual comunica el estado de construccion y no procesa documentos. El prototipo anterior ya no esta en la raiz y se recupera por tag.

La arquitectura objetivo aceptada es Next.js + TypeScript en Vercel, con Supabase Auth/PostgreSQL/Storage, organizaciones multi-tenant, RLS, procesamiento OCR asincrono y revision humana.

## Instrucciones no negociables

- No presentar la pagina de M1 como producto terminado.
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
- Pagina responsive de estado M1 sin claims de funciones inexistentes.
- ESLint 9 con reglas de Next.js.
- Vitest, Testing Library y dos pruebas de la pagina inicial.
- Scripts de lint, typecheck, test, build y verificacion completa.
- GitHub Actions para ejecutar la cadena sobre `main` y pull requests.
- Variables publicas de Supabase documentadas en `.env.example`.
- Estrategia inicial de ambientes, migraciones, RLS y Storage en `docs/SUPABASE.md`.
- Node 24.20.0 instalado localmente en WSL y fijado en `.nvmrc`; `package.json` exige Node 24 o superior.
- Prototipo publicado en el tag `prototype-v0.1.0`.

### No implementado

- Backend o API HTTP real.
- Supabase conectado y proyecto Vercel enlazado.
- Autenticacion, organizaciones, invitaciones y roles.
- RLS y aislamiento multi-tenant.
- Storage privado y preservacion del original.
- OCR real.
- PDF y soporte HEIC garantizado.
- Procesamiento asincrono durable.
- Exportaciones CSV/XLSX.
- Auditoria, backups, observabilidad y rate limiting.
- Tests de integracion, RLS y E2E.
- Flujos comerciales, privacidad, terminos y retencion.

## Inventario principal del repositorio

| Archivo | Responsabilidad actual |
|---|---|
| `src/app/layout.tsx` | Metadata, idioma y layout raiz. |
| `src/app/page.tsx` | Pagina de estado de construccion M1. |
| `src/app/globals.css` | Sistema visual responsive de la pagina inicial. |
| `src/app/page.test.tsx` | Pruebas de claims y secuencia de hitos. |
| `.github/workflows/ci.yml` | Lint, typecheck, tests y build en GitHub. |
| `.env.example` | Contrato de variables publicas de Supabase. |
| `package.json` | Versiones y comandos del proyecto. |
| `docs/SUPABASE.md` | Estrategia de ambientes, migraciones, RLS y Storage. |

## Como ejecutar y verificar M1

```bash
git clone git@github.com:FKaranicolas/recia.git
cd recia
npm ci
npm run dev
```

Abrir `http://localhost:3000`. Node 24 o superior es obligatorio.

```bash
npm run verify
```

`verify` ejecuta lint, typecheck, Vitest y el build de produccion. M1 fue verificado localmente con Node `24.20.0`, npm `11.19.0`, 2 tests aprobados y 0 vulnerabilidades reportadas por `npm audit`.

## Flujo actual de usuario

1. Next.js renderiza estaticamente la pagina `/`.
2. La pagina muestra M0 completado, M1 en curso y M2 como siguiente.
3. Un aviso explicito informa que auth, archivo y OCR aun no funcionan.
4. El enlace del footer permite consultar el prototipo preservado.

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

| Area | Estado M1 | V1 |
|---|---|---|
| Frontend | Next.js + TypeScript, pagina de estado | Aplicacion completa responsive |
| Datos | Sin base conectada | PostgreSQL + RLS |
| Auth | Sin implementar | Supabase Auth |
| Tenancy | Modelo decidido, sin implementar | Organizaciones y roles |
| Archivos | Sin implementar | Original privado en Storage |
| OCR | Sin implementar | Benchmark + proveedor real |
| Formatos | Limites decididos, sin upload | PDF/JPG/PNG/HEIC |
| Exportacion | No existe | CSV/XLSX |
| Operacion | CI local/GitHub; preview pendiente | Auditoria, backups y alertas |
| Calidad | Lint, typecheck, unit test y build | Unit, integration, RLS y E2E |

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

## Decisiones resueltas para M1

- `DEC-014`: matriz conservadora de permisos.
- `DEC-015`: protocolo de 100 documentos, tres candidatos y umbrales de calidad/operacion.
- `DEC-017`: limites, formatos y conversiones de archivos.
- `DEC-018`: esquema fiscal normalizado, signos y duplicados.
- `DEC-023`: tag inmutable del prototipo y reemplazo de la raiz.

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

1. M1 no tiene todavia un preview verificado en Vercel.
2. Supabase no esta conectado; las variables son solo un contrato vacio.
3. CI esta versionada, pero debe confirmarse verde despues del primer push del scaffold.
4. ESLint esta fijado en la ultima version 9 compatible porque un plugin transitivo de `eslint-config-next` falla con ESLint 10; revisar al actualizar Next.
5. No hay licencia definida.
6. Auth, RLS, uploads, OCR, exportacion, auditoria y backups siguen sin implementar y no deben simularse.
7. Los defectos del prototipo (`localStorage`, importes decimales, notas de credito y carrera de captura) permanecen solo en el tag y no deben copiarse.

## Proxima tarea recomendada

Completar M1 de [ROADMAP.md](ROADMAP.md): publicar el scaffold, verificar CI, enlazar `FKaranicolas/recia` con un proyecto Vercel y confirmar una URL de preview. Despues actualizar M1 a `Completado` e iniciar M2 con Supabase Auth, organizaciones y RLS.

## Definition of Done de la proxima tarea

- El commit del scaffold esta publicado en `origin/main`.
- GitHub Actions finaliza en verde para lint, typecheck, tests y build.
- Vercel esta enlazado al repositorio con Node 24 y genera un preview accesible.
- No hay secretos en Git, logs o variables publicas.
- La URL, commit desplegado y resultado de CI quedan registrados en este handoff.
- M1 cambia a `Completado` y la proxima tarea pasa a M2.

## Como mantener este handoff

- Actualizar fecha, estado, commit de codigo auditado y referencia al commit documental despues de cada hito relevante.
- Separar hechos comprobados, decisiones aceptadas, pendientes y recomendaciones.
- Enlazar commits o PRs que implementen cada decision.
- Reemplazar contratos actuales cuando exista codigo productivo, sin borrar el historial relevante.
- Registrar comandos ejecutados y resultado de tests.
- No incluir secretos ni datos fiscales reales.
- Mantener una unica proxima tarea prioritaria y su Definition of Done.

## Prompt reutilizable para una nueva conversacion

```text
Trabaja sobre RECIA usando docs/HANDOFF.md como snapshot operativo,
docs/DECISIONS.md como fuente de decisiones y docs/ROADMAP.md para el orden
de implementacion. Verifica primero rama, commit actual y diferencias contra
el snapshot. No presentes la demo vanilla, el OCR simulado ni localStorage
como componentes productivos. No resuelvas decisiones pendientes sin
confirmacion. Antes de editar, inspecciona el codigo actual; al terminar,
ejecuta las verificaciones del hito y actualiza el handoff.
```

## Historial del handoff

| Fecha | Referencia | Cambio |
|---|---|---|
| 2026-08-26 | `d07886d` | Auditoria inicial del prototipo. |
| 2026-08-26 | `82185e7` / `prototype-v0.1.0` | Documentacion y preservacion del prototipo. |
| 2026-08-26 | `1b28124` | Decisiones bloqueantes de M1 resueltas. |
| 2026-08-26 | Working tree posterior a `1b28124` | Scaffold M1 verificado localmente; push, CI y preview pendientes. |
