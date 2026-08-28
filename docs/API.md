# Superficie HTTP y RPC de M2 y M3

Este inventario describe la superficie interna usada por la aplicacion. No es una API publica ni versionada para integradores externos. Las acciones de formulario de Next.js tambien son internas y no deben invocarse como endpoints estables.

## Route handlers

### `POST /api/invitations/capture`

- Requiere `Origin` same-origin.
- Body JSON: `{ "token": "<64 caracteres hexadecimales en minuscula>" }`.
- Exito `200`: `{ "captured": true }` y cookie `recia_invitation` `HttpOnly`, `SameSite=Lax`, path `/`, maximo 7 dias.
- Error `400`: `{ "error": "Invalid invitation" }`.
- Error `403`: `{ "error": "Invalid origin" }`.
- Siempre responde `Cache-Control: no-store` en exito.

Ejemplo, sustituyendo dominio y token por valores de prueba:

```http
POST /api/invitations/capture HTTP/1.1
Host: localhost:3000
Origin: http://localhost:3000
Content-Type: application/json

{"token":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}
```

```http
HTTP/1.1 200 OK
Cache-Control: no-store
Set-Cookie: recia_invitation=...; Path=/; HttpOnly; SameSite=Lax
Content-Type: application/json

{"captured":true}
```

### `GET /api/documents/{documentId}/download`

Disponible en la rama de M3.

- Requiere sesion. Devuelve `401` sin usuario.
- RLS decide la visibilidad: un documento de otra organizacion responde `404`, igual que uno inexistente.
- Exito: redirect `307` a una URL firmada de 60 segundos con `download` fijado al nombre original.
- Error `404`: `{ "error": "Documento no encontrado." }`.
- Error `502`: `{ "error": "No pudimos preparar la descarga." }`.

### `POST /api/documents/{documentId}/derivatives`

Disponible en la rama de M3. Genera miniatura, conversion HEIC y render de la primera pagina del PDF.

- Requiere sesion y rol `owner`, `admin` u `operator`; devuelve `403` para solo lectura.
- Exito `200`: `{ "status": "ready", "count": <n> }`.
- Fallo de conversion `200`: `{ "status": "failed" }`. El original nunca se modifica; solo cambia `derivative_status`.
- Error `503`: `{ "error": "La generacion de vistas previas no esta configurada." }` cuando falta `SUPABASE_SECRET_KEY`.

### `GET /auth/callback`

- Acepta `code` para intercambio PKCE o `token_hash` + `type` para OTP.
- `next` es opcional y se limita a una ruta interna segura; el default es `/onboarding`.
- En exito establece las cookies de sesion y redirige a `next`.
- En error redirige a `/login` con un mensaje seguro y `Cache-Control: private, no-store`.

Ejemplos de entrada y resultado:

```http
GET /auth/callback?code=CODIGO_PKCE&next=/onboarding HTTP/1.1
Host: localhost:3000
```

```http
HTTP/1.1 307 Temporary Redirect
Location: http://localhost:3000/onboarding
Set-Cookie: sb-...=...
```

La variante OTP usa `GET /auth/callback?token_hash=HASH&type=recovery&next=/update-password`. Un callback invalido devuelve un redirect temporal a `/login?message=...`.

## Lecturas Data API

Las paginas server-side usan el cliente Supabase con el JWT del usuario para hacer `SELECT` sobre `organizations`, `organization_members` y `profiles`. Son consultas internas sujetas a RLS, no contratos publicos estables. No hay mutaciones directas soportadas desde la aplicacion para estas tablas.

Ejemplo equivalente para listar organizaciones visibles:

```http
GET /rest/v1/organizations?select=id,name&order=name HTTP/1.1
Host: PROJECT.supabase.co
apikey: PUBLISHABLE_KEY
Authorization: Bearer USER_JWT
```

Las otras lecturas filtran membresias por `organization_id`, `user_id` y `status`, y perfiles por los IDs de integrantes ya visibles. Supabase Auth usa su SDK oficial y queda fuera de este inventario interno.

## RPC autenticados

Supabase Data API expone estos RPC al rol `authenticated`, pero RECIA los considera contratos internos de la aplicacion:

Todos usan `POST /rest/v1/rpc/<funcion>`, `apikey: PUBLISHABLE_KEY`, `Authorization: Bearer USER_JWT` y JSON. Los UUID retornan una cadena JSON, los listados un array de objetos y los RPC `void` no contienen datos utiles.

| Funcion | Body JSON | Autorizacion principal |
|---|---|---|
| `create_organization` | `{ "organization_name": "Mi PyME" }` | Usuario autenticado; el trigger aplica el tope al crear. |
| `create_organization_invitation` | `{ "target_organization_id": "UUID", "target_email": "persona@example.com", "target_role": "viewer" }` | Propietario o administrador; solo `operator` o `viewer`. |
| `accept_organization_invitation` | `{ "invitation_token": "TOKEN" }` | Usuario autenticado, email coincidente y bearer valido. |
| `list_organization_invitations` | `{ "target_organization_id": "UUID" }` | Propietario o administrador; retorna invitaciones pendientes. |
| `revoke_organization_invitation` | `{ "target_organization_id": "UUID", "target_invitation_id": "UUID" }` | Propietario o administrador. |
| `update_organization_member_role` | `{ "target_organization_id": "UUID", "target_user_id": "UUID", "target_role": "operator" }` | Propietario o administrador; propiedad usa transferencia. |
| `remove_organization_member` | `{ "target_organization_id": "UUID", "target_user_id": "UUID" }` | Propietario o administrador; no permite remover al propietario. |
| `transfer_organization_ownership` | `{ "target_organization_id": "UUID", "next_owner_id": "UUID" }` | Solo propietario actual; tiene pendiente aplicar el tope al receptor. |

RPC agregados en la rama de M3:

| Funcion | Body JSON | Autorizacion principal |
|---|---|---|
| `create_document_upload` | `{ "target_organization_id": "UUID", "target_filename": "factura.pdf", "declared_mime": "application/pdf", "declared_bytes": 1048576 }` | Propietario, administrador u operador; valida formato y limites de `DEC-017`. Retorna `document_id` y `storage_path`. |
| `finalize_document_upload` | `{ "target_document_id": "UUID", "resolved_mime": "application/pdf", "resolved_bytes": 1048576, "resolved_checksum": "SHA256_HEX", "resolved_page_count": 3 }` | Mismo rol; revalida limites y rechaza un checksum ya archivado en la organizacion con `23505`. |
| `discard_document_upload` | `{ "target_document_id": "UUID" }` | Mismo rol; borra la carga pendiente y retorna la ruta del objeto a eliminar. |
| `expire_stale_document_uploads` | `{ "target_organization_id": "UUID" }` | Integrante activo; retorna las rutas de las cargas abandonadas hace mas de 30 minutos. |
| `find_document_by_checksum` | `{ "target_organization_id": "UUID", "target_checksum": "SHA256_HEX" }` | Integrante activo; permite senalar el documento existente ante un duplicado. |

Las lecturas de `documents` y `document_derivatives` usan el mismo patron Data API que las tablas de M2, filtradas por `organization_id` y sujetas a RLS. La subida del archivo no pasa por la aplicacion: se hace con una URL firmada emitida por `createSignedUploadUrl` contra el bucket privado `documents`.

Ejemplo:

```http
POST /rest/v1/rpc/create_organization HTTP/1.1
Host: PROJECT.supabase.co
apikey: PUBLISHABLE_KEY
Authorization: Bearer USER_JWT
Content-Type: application/json

{"organization_name":"Mi PyME"}
```

```http
HTTP/1.1 200 OK
Content-Type: application/json

"8f14e45f-ea7c-4a7b-9f6d-2e79d31b87c4"
```

RLS protege lecturas y mutaciones directas expuestas. Los RPC `security definer` usan grants restrictivos y vuelven a comprobar membresia/rol segun la operacion.

## RPC server-only

Estos RPC solo tienen `EXECUTE` para `service_role` y deben invocarse mediante `SUPABASE_SECRET_KEY` desde acciones server-side:

| Funcion | Body interno | Validacion |
|---|---|---|
| `delete_organization_as_admin` | `{ "target_organization_id": "UUID", "requesting_user_id": "UUID" }` | PostgreSQL comprueba que el solicitante sea propietario. |
| `delete_account_as_admin` | `{ "target_user_id": "UUID" }` | Confia en el objetivo pasado por la accion reautenticada y rechaza cuentas con organizaciones propias. |
| `register_document_derivative` | `{ "target_document_id": "UUID", "target_kind": "thumbnail", "target_storage_path": "...", "target_mime": "image/webp", "target_bytes": 1234 }` | Solo para el documento ya archivado; agregado en la rama de M3. |
| `set_document_derivative_status` | `{ "target_document_id": "UUID", "next_status": "ready" }` | Marca el resultado de la conversion; agregado en la rama de M3. |

No enviar tokens, secretos, documentos ni respuestas completas de error a logs o herramientas de analitica.
