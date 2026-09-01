# Proposal: m3-stateless-processing

## Intent

Implementar `DEC-029`: RECIA valida y procesa comprobantes en memoria y los
descarta al terminar la peticion. No conserva originales, derivados, miniaturas
ni checksums. Solo persiste datos fiscales extraidos.

El cambio se aplica sobre la rama `feat/m3-document-ingest` (PR #1) **antes** de
mergearla, no como correccion posterior.

## Problem statement

El PR #1 implementa M3 con conservacion del original: dos buckets de storage,
dos tablas, un ciclo de subida en tres pasos y policies sobre `storage.objects`.
`DEC-029` deja esa mitad sin proposito.

Mergear el PR #1 y corregir despues significa escribir una segunda migracion que
elimine buckets y tablas sobre `recia-dev`, que hoy es tambien el proyecto de
produccion. Crear recursos remotos para borrarlos a los pocos dias es
exactamente lo que la regla de ambiente compartido busca evitar.

### Lo que se cae

`supabase/migrations/202608280003_m3_documents_storage.sql` (670 lineas) en su
totalidad:

- Buckets `documents` y `document-derivatives`, con sus policies sobre
  `storage.objects`.
- `public.documents`, cuyo eje es `storage_path text not null unique`, mas
  `checksum_sha256`, `stored_at`, `derivative_status` y los constraints que
  exigen metadata al llegar a `stored`.
- `public.document_derivatives`.
- `create_document_upload`, `finalize_document_upload`,
  `discard_document_upload`, `expire_stale_document_uploads`,
  `find_document_by_checksum`, `register_document_derivative`,
  `set_document_derivative_status`, `app_private.storage_organization_id`.

Y con ellos `supabase/tests/database/m3_documents.test.sql` (615 lineas), que
prueba ese ciclo.

### Lo que se conserva

Todo `src/lib/documents/` sobrevive intacto. Son funciones puras sobre bytes sin
ninguna dependencia de Supabase ni de storage:

- `signature.ts` — sniffing de MIME real y lectura de dimensiones PNG, JPEG y
  HEIF; deteccion de trailer incompleto.
- `inspect.ts` — validacion completa con `pdf-lib`, tipada por
  `DocumentRejection`.
- `limits.ts` — topes de bytes, pixeles, paginas y nombre de archivo.
- `derivatives.ts` — conversion con `sharp`, `@napi-rs/canvas` y `heic-convert`.
- `checksum.ts`, `messages.ts`, y los fixtures de
  `src/lib/documents/__fixtures__/`.

Los decoders nativos y wasm ya estan verificados corriendo en Linux dentro de
GitHub Actions y en el runtime de Vercel. Esa verificacion es el activo mas caro
del PR #1 y no se toca.

## Consecuencia estructural que hay que decidir

La extraccion de datos fiscales es M4, no M3. Bajo `DEC-029`, lo unico que M3
puede persistir son datos que todavia no existen.

M3 queda entonces como una tuberia de validacion y procesamiento sin salida
persistente: el usuario sube un archivo, el servidor lo valida y le devuelve el
resultado en la misma respuesta, y nada queda guardado. Es un entregable real y
verificable, y es la base exacta sobre la que M4 conecta OCR, pero no es
"archivo documental e ingesta".

Esta propuesta implementa esa tuberia. La renumeracion de hitos, si se decide,
es una accion de roadmap aparte.

## Scope

### In scope

- Eliminar `supabase/migrations/202608280003_m3_documents_storage.sql` y
  `supabase/tests/database/m3_documents.test.sql` de la rama del PR #1.
- Reemplazar el ciclo de subida en tres pasos por un unico procesamiento
  sincronico en servidor que recibe el archivo, lo valida, lo procesa y lo
  descarta.
- Adecuar `src/app/(app)/organizations/[organizationId]/documents/` y los route
  handlers a la ausencia de persistencia.
- Recortar `src/types/database.ts` a lo que quede del dominio.
- Actualizar `docs/API.md`, `docs/ROADMAP.md`, `docs/HANDOFF.md`, `README.md` y
  `CLAUDE.md`, donde "conservacion del original" ya no describe el producto.

### Non-goals

- No implementar extraccion ni OCR: es M4.
- No persistir datos extraidos: no hay ninguno todavia.
- No crear ningun bucket, tabla ni recurso remoto.
- No tocar `organizations`, `organization_members`, roles ni RLS de M2.
- No interferir con el gate `pre-m3-hardening`, que corre en paralelo sobre otra
  rama.

## Business rules

- Ningun byte del comprobante puede persistir fuera de la vida de la peticion:
  ni en storage, ni en base, ni en disco del servidor, ni en logs.
- La validacion es server-side y no confia en el `Content-Type` declarado por el
  cliente: el MIME real se determina por firma de contenido.
- El procesamiento ocurre en el contexto de una organizacion de la que el
  usuario es miembro activo. Un usuario no puede procesar en nombre de una
  organizacion ajena.
- Los mensajes de rechazo no deben filtrar contenido del archivo.
- Los limites de `limits.ts` se conservan sin cambios: son la unica defensa
  contra agotamiento de memoria ahora que el procesamiento es sincronico.

## Risks

| Riesgo | Mitigacion |
|---|---|
| Procesar en memoria dentro de la peticion expone el runtime a archivos grandes | Los topes de `limits.ts` se aplican antes de decodificar, no despues; validar tamano antes de cargar el buffer completo |
| Quedan restos del modelo persistente en tipos o UI y el codigo miente sobre lo que hace | Buscar `storage_path`, `checksum`, `derivative` y `documents` en `src/` como parte de verify |
| El archivo queda en un temporal del runtime sin que nadie lo advierta | Verificar explicitamente que ninguna ruta escribe a disco; el procesamiento trabaja sobre `Uint8Array` en memoria |
| Se pierde cobertura al borrar los 615 lineas de pgTAP de M3 | Esa cobertura prueba un ciclo que deja de existir. La cobertura que importa pasa a ser Vitest sobre `src/lib/documents/`, que ya existe y se conserva |
| Alguien mergea el PR #1 antes de aplicar este cambio | El PR #1 queda bloqueado explicitamente hasta que este change cierre |

## Rollback

El cambio elimina recursos que nunca se aplicaron a ningun ambiente. No hay
migracion que revertir ni dato que restaurar. Rollback = descartar el diff.

## Success criteria

- El repositorio no contiene ningun bucket, tabla ni RPC de documentos.
- Subir un comprobante valido devuelve el resultado del procesamiento en la
  misma respuesta y no deja rastro persistido en Supabase.
- Subir un archivo invalido devuelve el rechazo tipado correspondiente de
  `DocumentRejection`.
- Un usuario no miembro de la organizacion no puede procesar en su nombre.
- Los tests de `src/lib/documents/` siguen verdes, incluidos los de derivados
  corriendo en Linux en GitHub Actions.
- `npm run verify` y la cadena `db:reset` + `db:test` pasan.
- Las assertions pgTAP de M2 y del gate quedan en verde y sin editar.
- `CLAUDE.md`, `README.md` y `docs/ROADMAP.md` ya no describen conservacion del
  original.

## Related decisions

- `DEC-029` — RECIA no almacena comprobantes (esta propuesta la implementa).
- `DEC-021` — retencion y borrado: queda acotada a datos extraidos.
- `DEC-024` — licencia de HEIC: sigue abierta, el decoder se conserva.
- `DEC-007` — derivados separados del original: queda sin objeto y debe
  revisarse.
