# Estrategia de Supabase

## Estado

Supabase Auth, PostgreSQL y RLS estan conectados desde M2. El Storage privado de M3 esta implementado y probado localmente; sus recursos remotos no se crean hasta completar el gate de endurecimiento pre-M3 y separar el ambiente. Las migraciones y `supabase/config.toml` son la fuente de verdad versionada.

## Ambientes

RECIA usara proyectos separados para:

- Desarrollo.
- Staging.
- Produccion.

Cada ambiente tendra URL, publishable key y secretos propios. No se reutilizaran bases, buckets ni `service_role` entre ambientes.

**Excepcion transitoria de M2:** la produccion publica usa actualmente el unico proyecto remoto `recia-dev`. Antes de desplegar M3 o crear recursos remotos de ese hito se debe crear el ambiente dedicado y promover las migraciones y la configuracion versionadas. El desarrollo local puede usar fixtures ficticios despues del gate de endurecimiento pre-M3. Aun con ambientes separados, `DEC-021` prohibe almacenar comprobantes reales hasta definir retencion, borrado y backups.

## Variables

El navegador solo puede recibir:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Las claves con privilegios, webhooks y secretos de proveedores seran variables server-only en Vercel. Nunca tendran prefijo `NEXT_PUBLIC_` ni se versionaran.

M2 usa `SUPABASE_SECRET_KEY` solamente en acciones server-side de eliminacion. La cuenta se reautentica con contrasena en la accion Next.js; su RPC confia en el `target_user_id` enviado por esa accion y comprueba que no posea organizaciones. La organizacion exige nombre exacto y su RPC vuelve a validar que el solicitante sea propietario. La clave nueva `sb_secret_...` se gestiona como Sensitive en Vercel; las claves legacy quedaron deshabilitadas.

## Auth e invitaciones

- Registro por email y contrasena con acceso inmediato, sin confirmacion de casilla.
- Contrasena minima de 8 caracteres, con mayuscula, minuscula y numero, sin maximo definido por RECIA.
- Recuperacion mediante el proveedor de email incluido de Supabase.
- Invitaciones manuales como secretos bearer de 256 bits, de un solo uso y con vencimiento de 7 dias.
- El fragmento no se envia automaticamente en la URL HTTP ni en el referrer. El cliente lo envia por POST same-origin y, si la captura funciona, limpia la URL y lo conserva temporalmente en una cookie `HttpOnly` con path `/`.
- Una invitacion bearer solo otorga operador o solo lectura; propietario o administrador requieren promocion posterior.
- La falta de confirmacion de email implica que la posesion del enlace, no el control de la casilla, es la garantia principal.

## Migraciones

- `supabase/migrations/` es la fuente de verdad del esquema desde M2.
- Cada cambio de tablas, funciones, indices, triggers o RLS se entregara como migracion SQL revisable.
- No se aceptaran cambios manuales de produccion desde el dashboard sin una migracion equivalente.
- Las migraciones se probaran primero en desarrollo, luego staging y finalmente produccion.
- Los datos seed seran ficticios y estaran separados de las migraciones de esquema.
- Todo rollback destructivo requerira backup y procedimiento explicito; no se asumira que una migracion descendente es segura.

## RLS y Storage

- RLS estara habilitada en toda tabla expuesta por la API.
- RLS limita lecturas por membresia y protege las mutaciones expuestas; las funciones privilegiadas vuelven a comprobar el rol requerido.
- Los buckets de documentos son privados.
- Las rutas de objetos comienzan con un identificador de organizacion autorizado, sin CUIT ni datos fiscales en el nombre.
- Las URLs firmadas tienen expiracion corta y se generan despues de autorizar la operacion.
- La `service_role` solo podra utilizarse en codigo server-side. Cada accion debe validar usuario y operacion antes de invocar un RPC privilegiado.

### Buckets de M3

| Bucket | Contenido | Ruta | Limite |
|---|---|---|---|
| `documents` | Original inmutable | `{organization_id}/{document_id}/original` | 20 MB, PDF/JPG/PNG/HEIC |
| `document-derivatives` | Miniatura, conversion HEIC y pagina renderizada | `{organization_id}/{document_id}/{kind}[-p{n}].{ext}` | 5 MB, JPG/PNG/WebP |

Politicas sobre `storage.objects`:

- Lectura en ambos buckets para integrantes activos de la organizacion que encabeza la ruta.
- Escritura en `documents` solo para propietario, administrador u operador, y unicamente sobre la ruta exacta que una fila `documents` en estado `uploading` haya reservado. Una URL firmada valida no alcanza para escribir en otra ubicacion.
- Sin politicas de actualizacion o borrado para usuarios autenticados: la limpieza de rechazos y huerfanos y la escritura de derivados corren server-side con `SUPABASE_SECRET_KEY`.
- El primer segmento de la ruta se convierte a `uuid` mediante `app_private.storage_organization_id`, que devuelve `null` ante cualquier valor que no sea un identificador valido.

Las URLs firmadas de descarga del original duran 60 segundos y se emiten con el cliente del usuario, de modo que RLS vuelve a decidir el acceso. Estos buckets y sus politicas se crean por migracion, de modo que su promocion remota queda sujeta al gate y a la separacion de ambientes.

## Flujo de entrega

1. Crear o modificar una migracion en una rama de trabajo.
2. Aplicarla sobre desarrollo limpio.
3. Ejecutar tests de esquema y casos negativos de RLS.
4. Revisar SQL y efectos de datos en el pull request.
5. Aplicar en staging y ejecutar pruebas E2E.
6. Aprobar y promover a produccion con backup verificado.

Flujo local reproducible:

```bash
npm run supabase:start
npm run db:reset
npm run db:test
npm run supabase:stop
```

Promocion remota manual, verificando siempre el proyecto destino:

```bash
npx supabase login
SUPABASE_PROJECT_REF=valor-del-dashboard
npx supabase link --project-ref "$SUPABASE_PROJECT_REF"
npx supabase migration list --linked
npx supabase db push --dry-run
npx supabase db push
npx supabase config push
```

GitHub Actions inicia un Supabase local limpio y ejecuta pgTAP en pushes a `main` y pull requests dirigidos a `main`. CI no promueve migraciones, no prueba la base hospedada y no bloquea actualmente el deployment automatico de Vercel.

`src/types/database.ts` se mantiene manualmente. Antes de ampliar el esquema en M3 se debe incorporar generacion o un control de drift con `supabase gen types`.
