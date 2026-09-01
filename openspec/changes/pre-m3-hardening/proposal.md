# Proposal: pre-m3-hardening

## Intent

Cerrar el gate de endurecimiento pre-M3 corrigiendo dos brechas donde las
invariantes de organizaciones declaradas en M2 se sostienen por convencion de
llamada y no por la base de datos. M3 (archivo documental e ingesta) depende de
que el aislamiento multi-tenant sea estructural antes de que existan documentos
que aislar.

## Problem statement

M2 declara dos invariantes de dominio y las prueba con 35 assertions pgTAP. La
auditoria del codigo muestra que ambas tienen una ruta de evasion que los tests
actuales no cubren.

### Brecha 1 — el tope de 10 organizaciones no aplica a transferencias

`app_private.enforce_organization_creation_limit` esta enganchada como
`BEFORE INSERT` sobre `public.organizations`
(`supabase/migrations/202608270002_m2_abuse_limits.sql:36`). Cuenta las
membresias `role = 'owner' AND status = 'active'` de `new.created_by`.

`public.transfer_organization_ownership`
(`supabase/migrations/202608270001_m2_identity_organizations_rls.sql:835`)
transfiere la propiedad con dos `UPDATE` sobre `public.organization_members` y
nunca escribe en `public.organizations`. El trigger no dispara.

Consecuencia: un usuario que ya posee 10 organizaciones activas puede recibir la
numero 11 por transferencia. El tope es un limite de creacion, no un limite de
propiedad, aunque el mensaje de error afirme lo segundo: *"A user can own at most
10 active organizations"*.

### Brecha 2 — la invariante de propietario unico no cubre inserts privilegiados

`organization_members_require_owner`
(`supabase/migrations/202608270001_m2_identity_organizations_rls.sql:158`) es un
constraint trigger diferido sobre `public.organization_members`. Exige
exactamente un propietario activo por organizacion, pero solo se evalua cuando
una fila de `organization_members` cambia.

`public.create_organization` inserta la organizacion y luego su membresia de
propietario en la misma transaccion, asi que por esa ruta la invariante se
cumple. Un `INSERT` directo en `public.organizations` con `service_role` — que
elude RLS y no crea ninguna membresia — deja una organizacion activa sin
propietario y ningun trigger lo detecta.

Consecuencia: la invariante depende de que nadie inserte organizaciones con
privilegios fuera del RPC. `docs/HANDOFF.md` ya la registra como limitacion
conocida. El repositorio usa `SUPABASE_SECRET_KEY` en el servidor para
eliminaciones, de modo que existe una ruta privilegiada real en el codigo.

## Scope

Endurecimiento de las invariantes existentes de organizaciones a nivel base de
datos, mas la cobertura pgTAP negativa que las prueba.

### In scope

- Aplicar el tope de propiedad en cualquier ruta que convierta a un usuario en
  propietario activo, incluida la transferencia.
- Rechazar organizaciones activas sin propietario activo, incluso ante escrituras
  privilegiadas que eluden RLS.
- Tests pgTAP negativos para ambas rutas.
- Nueva migracion aditiva en `supabase/migrations/`.

### Non-goals

- No se crean tablas, buckets, storage ni codigo de M3.
- No se modifica la matriz de permisos ni se agregan roles.
- No se cambia el valor del tope (sigue en 10).
- No se separa el proyecto Supabase remoto (gate operativo posterior).
- No se resuelve `DEC-021` ni `DEC-024`.
- No se altera el comportamiento observable de la UI.

## Affected areas

- `supabase/migrations/` — una migracion nueva, aditiva.
- `supabase/tests/database/` — assertions nuevas; las 35 existentes se mantienen.
- `docs/HANDOFF.md` y `docs/ROADMAP.md` — actualizar estado del gate al cerrar.

`src/` no deberia requerir cambios. Si la correccion introduce un error nuevo que
la UI deba mostrar, es una senal de diseno que hay que reportar antes de tocar
componentes.

## Business rules

- El tope de 10 es un limite de **propiedad activa**, no de creacion. Cuenta
  membresias `role = 'owner' AND status = 'active'`.
- Una transferencia rechazada no debe dejar efectos parciales: el propietario
  saliente conserva `owner` y el entrante conserva su rol previo.
- Toda organizacion en estado activo tiene exactamente un propietario activo, sin
  importar el rol de base de datos que la haya escrito.
- La verificacion de propietario debe ser diferida al cierre de transaccion: los
  RPC legitimos escriben la organizacion y su membresia en pasos separados.

## Risks

| Riesgo | Mitigacion |
|---|---|
| Enganchar el tope en `organization_members` rompe `create_organization`, que inserta org y luego membresia | La cuenta previa al insert de la membresia es N, no N+1; cubrir con un caso pgTAP en el limite exacto (usuario con 9 organizaciones crea la decima) |
| El trigger de tope dispara en la degradacion del propietario saliente a `admin` y bloquea transferencias validas | Condicionar el trigger a filas que **pasan a ser** propietario activo, no a cualquier UPDATE de membresia |
| Un constraint trigger sobre `organizations` rechaza `create_organization`, que inserta la organizacion antes que la membresia | Debe ser `DEFERRABLE INITIALLY DEFERRED`, igual que `organization_members_require_owner` |
| Los 35 casos pgTAP existentes se rompen al cambiar el enganche | Los 35 se mantienen sin editar; cualquier ruptura es evidencia de regresion, no motivo para reescribir el test |
| Organizaciones huerfanas preexistentes en `recia-dev` hacen fallar la migracion | Consultar el estado remoto en modo lectura antes de promover; documentar el ambiente destino |

## Rollback

La migracion es aditiva y no altera datos. Rollback = migracion inversa que
elimina los triggers y funciones nuevos y restaura el enganche anterior. No hay
backfill ni transformacion de datos que revertir.

Si la migracion falla al promover por datos preexistentes inconsistentes, no
forzar: reportar los registros ofensores y decidir la limpieza aparte.

## Success criteria

- Una transferencia hacia un usuario que ya posee 10 organizaciones activas falla
  y no modifica ningun propietario ni rol.
- Un usuario con 9 organizaciones activas sigue pudiendo crear la decima.
- Un `INSERT` privilegiado directo en `public.organizations` no puede dejar una
  organizacion activa sin propietario activo al cierre de la transaccion.
- `create_organization` sigue funcionando sin cambios en su firma ni en su
  contrato de errores.
- pgTAP cubre ambas rutas negativas y conserva los 35 casos existentes en verde.
- `npm run verify` y la cadena `db:reset` + `db:test` pasan en local.
- GitHub Actions y el deployment de Vercel finalizan correctamente.
- El repositorio no gana tablas, buckets ni codigo de M3.

## Related decisions

- `DEC-014` — matriz de permisos (aceptada; esta propuesta la hace exigible).
- `DEC-021` — retencion y borrado (pendiente; bloquea M3, no este cambio).
- `docs/HANDOFF.md` "Proxima tarea recomendada" define el Definition of Done que
  esta propuesta implementa.
