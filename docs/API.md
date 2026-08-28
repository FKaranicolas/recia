# Superficie HTTP y RPC de M2

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

No enviar tokens, secretos, documentos ni respuestas completas de error a logs o herramientas de analitica.
