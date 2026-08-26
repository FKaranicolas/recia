# Estrategia de Supabase

## Estado

Este documento define la estrategia de M1. Supabase Auth, PostgreSQL, Storage y RLS se implementan desde M2; no estan conectados en el scaffold actual.

## Ambientes

RECIA usara proyectos separados para:

- Desarrollo.
- Staging.
- Produccion.

Cada ambiente tendra URL, publishable key y secretos propios. No se reutilizaran bases, buckets ni `service_role` entre ambientes.

## Variables

El navegador solo puede recibir:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
```

Las claves con privilegios, webhooks y secretos de proveedores seran variables server-only en Vercel. Nunca tendran prefijo `NEXT_PUBLIC_` ni se versionaran.

## Migraciones

- `supabase/migrations/` sera la fuente de verdad del esquema desde M2.
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

Los comandos concretos de Supabase CLI se incorporaran en M2 junto con `supabase/config.toml`; M1 no instala el CLI ni crea proyectos remotos.
