# Handoff operativo de RECIA

## Metadata del snapshot

- **Repositorio:** https://github.com/FKaranicolas/recia
- **Rama:** `main`
- **Commit del codigo auditado:** `d07886d4fc12c962ab12dde1ed24b2e8f6389239`
- **Commit que contiene este snapshot:** el commit documental que contiene este archivo; obtenerlo con `git log -1 --format=%H -- docs/HANDOFF.md`.
- **Fecha del snapshot:** 2026-08-26
- **Checkout usado para documentar:** `/home/kara96/code/recia`
- **Fuentes canonicas:** este archivo, [DECISIONS.md](DECISIONS.md), [ROADMAP.md](ROADMAP.md) y el codigo de `main`.

El SHA fijo corresponde al prototipo auditado, no al paquete documental. Para reproducir este snapshot se debe usar el commit que contiene `docs/HANDOFF.md`; para determinar el estado de implementacion se debe revisar ademas el `HEAD` actual de `main`.

## Resumen ejecutivo

RECIA busca convertirse en un SaaS publico para PyMEs argentinas que cargue comprobantes, extraiga datos fiscales, permita revisarlos, archive los originales y exporte CSV/XLSX.

El repositorio contiene solamente una demo responsive en HTML, CSS y JavaScript vanilla. La IA y la base de datos son simulaciones locales. No es apta para datos reales ni para un piloto pagado.

La arquitectura objetivo aceptada es Next.js + TypeScript en Vercel, con Supabase Auth/PostgreSQL/Storage, organizaciones multi-tenant, RLS, procesamiento OCR asincrono y revision humana.

## Instrucciones no negociables

- No presentar la demo actual como producto terminado.
- No enviar documentos reales a `localStorage` ni a la IA simulada.
- No exponer claves de Supabase `service_role` ni del proveedor OCR al navegador.
- No implementar acceso a datos sin `organization_id`, RLS y tests negativos entre tenants.
- No elegir proveedor OCR antes de definir y ejecutar el benchmark.
- No confundir confianza declarada por un modelo con precision medida.
- No inventar endpoints o funciones no presentes en el codigo.
- No incluir secretos en documentacion, logs, fixtures o commits.

## Estado actual

### Implementado

- Layout responsive de dashboard, captura y comprobantes.
- Router por hash con tres vistas.
- Seleccion de imagen, preview y compresion en navegador.
- Animacion de procesamiento simulado.
- Formulario de revision y validacion basica.
- CRUD local, busqueda, filtros y detalle.
- Dashboard y datos ficticios iniciales.
- Build opcional a un solo archivo HTML.

### No implementado

- Next.js y TypeScript.
- Backend o API HTTP real.
- Supabase y Vercel.
- Autenticacion, organizaciones, invitaciones y roles.
- RLS y aislamiento multi-tenant.
- Storage privado y preservacion del original.
- OCR real.
- PDF y soporte HEIC garantizado.
- Procesamiento asincrono durable.
- Exportaciones CSV/XLSX.
- Auditoria, backups, observabilidad y rate limiting.
- Tests automatizados y CI.
- Flujos comerciales, privacidad, terminos y retencion.

## Inventario del repositorio

| Archivo | Responsabilidad actual |
|---|---|
| `index.html` | Shell, navegacion, vistas vacias y carga de CSS/JS. |
| `build.js` | Incrusta CSS y los seis scripts en `recia-standalone.html`; no compila. |
| `css/styles.css` | Tokens, componentes, vistas, animaciones y responsive. |
| `js/utils.js` | DOM, IDs, formato ARS/es-AR, fechas, imagenes y toasts. |
| `js/storage.js` | Driver local, CRUD, reglas, metricas y seed ficticio. |
| `js/ai.js` | Pasos visuales y generacion aleatoria de extracciones. |
| `js/receipts.js` | Formulario, validacion, filtros, listado, detalle y edicion. |
| `js/dashboard.js` | KPIs, actividad, categorias y comprobantes recientes. |
| `js/app.js` | Modal, captura, flujo de procesamiento y router. |

## Como ejecutar y verificar la demo

```bash
git clone https://github.com/FKaranicolas/recia.git
cd recia
python3 -m http.server 8000
```

Abrir `http://localhost:8000/#/dashboard`.

En Windows puede usarse:

```powershell
py -m http.server 8000
```

Rutas:

- `#/dashboard`
- `#/nuevo`
- `#/comprobantes`

Build standalone:

```bash
node build.js
```

No existe `package.json`, suite automatizada ni `npm test`. El smoke test actual consiste en cargar una imagen, procesar la simulacion, corregir y guardar, recargar, buscar, editar y eliminar.

Para reiniciar la demo desde la consola del navegador:

```js
localStorage.removeItem('recia.receipts.v1');
localStorage.removeItem('recia.seeded.v1');
location.reload();
```

## Flujo actual de usuario

1. `App.init()` inicializa la captura y carga el seed si corresponde.
2. El usuario navega entre resumen, nuevo y comprobantes mediante hashes.
3. En nuevo, selecciona o toma una imagen.
4. `resizeImage()` la convierte a JPEG de hasta 1100 px y calidad 0,72.
5. `AI.processDocumentWithAI()` espera, actualiza pasos y devuelve datos aleatorios; no usa la imagen.
6. El usuario revisa un formulario y guarda.
7. `DB.saveReceipt()` persiste metadata e imagen base64 en `localStorage` o memoria.
8. Listado y dashboard vuelven a leer todo el arreglo local.

## Contrato y reglas actuales

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

| Area | Demo | V1 |
|---|---|---|
| Frontend | Vanilla JS | Next.js + TypeScript |
| Datos | `localStorage`/memoria | PostgreSQL + RLS |
| Auth | No existe | Supabase Auth |
| Tenancy | No existe | Organizaciones y roles |
| Archivos | JPEG base64 local | Original privado en Storage |
| OCR | Aleatorio | Benchmark + proveedor real |
| Formatos | Imagen del navegador | PDF/JPG/PNG/HEIC |
| Exportacion | No existe | CSV/XLSX |
| Operacion | No existe | Auditoria, backups y alertas |
| Calidad | Smoke test manual | Unit, integration, RLS y E2E |

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

1. `js/ai.js` genera datos aleatorios y no usa el documento.
2. No hay auth, autorizacion ni aislamiento multi-tenant.
3. Los archivos se guardan como base64 en `localStorage`; el fallback en memoria no es durable.
4. El original se pierde al convertirlo a JPEG comprimido.
5. PDF no esta soportado y HEIC depende del navegador.
6. No existe exportacion.
7. `U.toNumber()` elimina puntos y corrompe importes como `1234.56`.
8. Las notas de credito incrementan el total de gastos.
9. La metrica llamada precision es confianza simulada.
10. Un procesamiento anterior puede asociarse a una captura nueva si se navega durante la espera.
11. Las fechas UTC pueden contabilizar actividad en el dia local incorrecto.
12. No hay limites previos de bytes o pixeles para uploads.
13. Futuros valores de URL/ID no confiables podrian llegar a sinks `innerHTML`.
14. Editar un seed con `Debito automatico` puede cambiar silenciosamente el medio de pago.
15. No existen auditoria, soft delete, backups, restauracion, observabilidad o rate limiting.
16. No hay politica legal, licencia, CI ni tests automaticos.

## Proxima tarea recomendada

Iniciar M1 de [ROADMAP.md](ROADMAP.md): verificar el tag remoto `prototype-v0.1.0` ya publicado, reemplazar la raiz con un scaffold minimo de Next.js App Router y TypeScript, incorporar verificaciones locales/CI y dejar preparado el acceso a Supabase mediante variables documentadas, sin implementar todavia OCR real.

## Definition of Done de la proxima tarea

- El tag remoto `prototype-v0.1.0` apunta al commit documental/prototipo `82185e7ff03c57e0f6c432424cee60be86b95603`.
- La raiz contiene Next.js App Router y TypeScript, y la demo vanilla sigue recuperable por tag.
- Existen comandos de desarrollo, lint, typecheck, test y build.
- CI ejecuta esas verificaciones sobre pull requests y `main`.
- `.env.example` documenta variables publicas de Supabase sin secretos.
- La aplicacion tiene una pagina inicial minima que identifica el estado de M1 sin afirmar que auth, Storage u OCR ya funcionan.
- README, ROADMAP y HANDOFF reflejan la nueva estructura.
- Build, lint, typecheck y tests pasan antes del commit.

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

| Fecha | Codigo auditado | Cambio |
|---|---|---|
| 2026-08-26 | `d07886d4fc12c962ab12dde1ed24b2e8f6389239` | Snapshot inicial del prototipo y arquitectura objetivo. |
