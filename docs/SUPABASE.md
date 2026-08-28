# Estrategia de Supabase

## Estado

Supabase Auth, PostgreSQL y RLS estan conectados desde M2. Storage privado comienza en M3. Las migraciones y `supabase/config.toml` son la fuente de verdad versionada.

## Ambientes

RECIA usara proyectos separados para:

- Desarrollo.
- Staging.
- Produccion.

Cada ambiente tendra URL, publishable key y secretos propios. No se reutilizaran bases, buckets ni `service_role` entre ambientes.

**Excepcion transitoria de M2:** la produccion publica usa actualmente el unico proyecto remoto `recia-dev`. Antes de almacenar comprobantes reales en M3 se debe crear el ambiente remoto dedicado y promover las migraciones y la configuracion versionadas.

## Variables

El navegador solo puede recibir:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Las claves con privilegios, webhooks y secretos de proveedores seran variables server-only en Vercel. Nunca tendran prefijo `NEXT_PUBLIC_` ni se versionaran.

M2 usa `SUPABASE_SECRET_KEY` solamente en acciones server-side de eliminacion, despues de reautenticar al usuario y volver a validar propiedad en PostgreSQL. La clave nueva `sb_secret_...` se gestiona como Sensitive en Vercel; las claves legacy quedaron deshabilitadas.

## Auth e invitaciones

- Registro por email y contrasena con acceso inmediato, sin confirmacion de casilla.
- Contrasena minima de 8 caracteres, con mayuscula, minuscula y numero, sin maximo definido por RECIA.
- Recuperacion mediante el proveedor de email incluido de Supabase.
- Invitaciones manuales como secretos bearer de 256 bits, de un solo uso y con vencimiento de 7 dias.
- El token viaja en fragmento URL, se elimina del historial y se conserva temporalmente en una cookie `HttpOnly`.
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
- Las politicas validaran membresia y rol de la organizacion activa.
- El bucket de documentos sera privado.
- Las rutas de objetos comenzaran con un identificador de organizacion autorizado, sin CUIT ni datos fiscales en el nombre.
- Las URLs firmadas tendran expiracion corta y se generaran despues de autorizar la operacion.
- La `service_role` solo podra utilizarse en codigo server-side que haya validado usuario, organizacion y accion.

## Flujo de entrega

1. Crear o modificar una migracion en una rama de trabajo.
2. Aplicarla sobre desarrollo limpio.
3. Ejecutar tests de esquema y casos negativos de RLS.
4. Revisar SQL y efectos de datos en el pull request.
5. Aplicar en staging y ejecutar pruebas E2E.
6. Aprobar y promover a produccion con backup verificado.

Comandos principales:

```bash
npm run supabase:start
npm run db:reset
npm run db:test
npx supabase db push
npx supabase config push
```

GitHub Actions inicia un Supabase local limpio y ejecuta las pruebas pgTAP en cada push y pull request.
