# Design: pre-m3-hardening

## Contexto

El cambio endurece dos invariantes existentes de organizaciones en la base de datos antes de M3:

1. Un usuario no puede tener mas de 10 membresias activas con `role = 'owner'`.
2. Toda organizacion persistida debe tener exactamente un propietario activo al cierre de la transaccion.

El alcance es SQL puro. No se editan migraciones ya aplicadas, no se agregan recursos de M3 y no se toca `src/`.

## Cambio de base: este change es un delta, no una implementacion nueva

La primera version de este design asumia que el gate estaba sin implementar. No lo esta.

El PR #2 (`fix/m2-organization-hardening`, commit `aad3029`) ya implementa el gate con la misma estrategia que este design proponia: trigger de tope movido a `organization_members`, constraint trigger diferido sobre `organizations`, advisory lock por `user_id`, y las 35 assertions de M2 intactas. Esta verde en CI con 44 assertions.

Reimplementar desde cero produciria dos juegos de triggers superpuestos sobre las mismas tablas y tiraria cobertura ya verificada. **Este change pasa a ser el delta que completa el PR #2 antes de que se mergee.**

### Base de trabajo

- Rama base: `fix/m2-organization-hardening` (no `main`).
- Archivos que se editan, ambos introducidos por ese PR y **no aplicados todavia** a ningun ambiente:
  - `supabase/migrations/202608280002_m2_organization_hardening.sql`
  - `supabase/tests/database/m2_organization_hardening.test.sql`

Editar `202608280002` esta permitido y es preferible: la regla dura de `CLAUDE.md` prohibe editar migraciones **ya aplicadas**, y esta migracion vive en un PR abierto que nunca corrio contra `recia-dev`. Agregar una segunda migracion que corrija a la primera dejaria dos archivos acoplados para siempre en un proyecto que comparte remoto con produccion. Se corrige en el mismo archivo, antes del merge.

`supabase/tests/database/m2_rls.test.sql` sigue intocable: sus 35 assertions son la linea de regresion.

## Evidencia de entrada revisada

Lo que el PR #2 **ya resuelve** y no hay que rehacer:

- `app_private.enforce_owner_organization_limit()` + trigger `organization_members_limit_owner`, enganchado como `before insert or update of role, status on public.organization_members`. Cubre transferencia, creacion y cambios de rol privilegiados.
- Advisory lock `pg_advisory_xact_lock(hashtextextended(new.user_id::text, 1))` antes del conteo.
- Salida temprana cuando `old.role = 'owner' and old.status = 'active'`, que evita bloquear UPDATEs sobre una propiedad ya existente.
- `app_private.enforce_organization_has_owner()` + constraint trigger `organizations_require_owner`, `deferrable initially deferred`, de modo que `create_organization` sigue funcionando dentro de su transaccion.
- 9 assertions nuevas: tope en transferencia, atomicidad del rechazo, transferencia bajo limite, tope en creacion por RPC, creacion valida, e insert privilegiado sin propietario.

Un acierto del PR #2 que este design no tenia y **debe conservarse**: el conteo excluye `member.organization_id <> new.organization_id`. Sin esa exclusion, un UPDATE sobre una fila que ya es propietaria contaria la propia fila y produciria un off-by-one.

## Decisiones tecnicas: los cinco deltas

### Delta 1. La invariante de propietario debe ser "exactamente uno", no "al menos uno"

`app_private.enforce_organization_has_owner()` usa `if not exists (...)`, que solo rechaza cero propietarios activos, pero levanta el mensaje `'An organization must have exactly one active owner'`. La logica y el contrato de error no coinciden, y la spec exige exactamente uno.

Reemplazar la comprobacion por un conteo y rechazar cualquier valor distinto de 1:

```sql
select count(*)
into active_owners
from public.organization_members as member
where member.organization_id = new.id
  and member.role = 'owner'
  and member.status = 'active';

if active_owners <> 1 then
  raise exception 'An organization must have exactly one active owner'
    using errcode = '23514';
end if;
```

El trigger de M2 sobre `organization_members` ya cubre el caso de dos propietarios cuando la escritura pasa por membresias, pero esta ruta debe sostenerse por si sola: es la unica barrera cuando la escritura entra por `organizations`.

Mantener el retorno temprano si la organizacion ya no existe al momento de evaluar el constraint diferido.

### Delta 2. El constraint trigger debe cubrir UPDATE, no solo INSERT

`organizations_require_owner` esta declarado `after insert on public.organizations`. Un UPDATE privilegiado sobre una organizacion no revalida la invariante.

Cambiar a `after insert or update on public.organizations`, conservando `deferrable initially deferred`.

### Delta 3. Falta la validacion de datos preexistentes

La migracion no comprueba el estado actual antes de crear los triggers. Es el hueco de mayor consecuencia operativa: `recia-dev` esta compartido transitoriamente con produccion, asi que promover estos triggers sobre una base que ya viola la invariante instala una barrera que no describe los datos que protege.

Agregar al final de la migracion un bloque `DO` que falle y reporte los identificadores ofensores si alguna organizacion existente tiene un conteo de propietarios activos distinto de 1. No debe corregir datos ni hacer backfill: si dispara, la limpieza es una decision humana aparte.

### Delta 4. Falta el caso limite exacto 9 a 10

El `lives_ok` de creacion del PR #2 lo ejecuta un usuario que posee 1 organizacion, no 9. Es el unico test que distingue `>= 10` de `> 10`, y hoy no existe.

Agregar un fixture con un usuario en 9 propiedades activas y probar que la decima creacion por RPC vive y lo deja en 10. Simetricamente, probar que una transferencia hacia un usuario en 9 lo deja en 10.

### Delta 5. Faltan cuatro escenarios de la spec

Ninguno esta cubierto por el `plan(9)` actual ni por las 35 assertions existentes:

1. **Membresias no propietarias no consumen el tope.** Un usuario con 10 organizaciones activas debe poder ser agregado como `admin`, `operator` o rol de solo lectura a otra organizacion. El fixture del PR #2 agrega al usuario en el tope como `admin` de la organizacion A, pero no lo afirma con ninguna assertion: la conducta esta ejercitada y no verificada. Es la prueba directa de que el trigger no bloquea de mas.
2. **Insert privilegiado con propietario es aceptado.** Sin este caso positivo, un trigger que rechaza todo insert pasaria la suite igual.
3. **Quitar al unico propietario es rechazado.** Escritura privilegiada directa que borra la membresia del unico propietario o la pasa a inactiva, sin promover otro en la misma transaccion. Las 35 existentes cubren permisos de RPC, aislamiento cross-tenant y borrado de cuenta, no la mutacion privilegiada directa.
4. **`create_organization` deja exactamente un propietario activo.** El PR #2 prueba que el RPC vive; no prueba el conteo resultante.

Actualizar `plan(9)` al numero final de assertions.

## Plan de pruebas pgTAP

Extender `supabase/tests/database/m2_organization_hardening.test.sql`, que es archivo nuevo del mismo PR y no esta protegido. No crear un tercer archivo: partir la cobertura de una misma invariante en dos archivos dificulta leer que se probo.

El patron de constraints diferidos del PR #2 es correcto y se conserva: `set constraints organizations_require_owner immediate` va despues de que los fixtures y las transferencias terminaron, porque forzar la evaluacion antes rompe transferencias validas que pasan por un estado intermedio sin propietario. Los casos nuevos que necesiten evaluacion inmediata deben ir en ese mismo tramo final.

## TDD estricto para apply y verify

`openspec/config.yaml` declara `npm test`, pero este change es SQL. El runner de evidencia en cada tarea es:

```bash
npm run db:reset && npm run db:test
```

`npm run verify` queda como chequeo final de no-regresion de aplicacion, no como evidencia RED/GREEN.

Evidencia requerida, con una particularidad propia de trabajar sobre codigo ya escrito:

- **RED:** agregar primero las assertions de los deltas 4 y 5 sobre la migracion del PR #2 **sin corregirla**, y demostrar que fallan. Las de los deltas 1 y 2 tambien deben fallar contra la version actual de la migracion: si el caso de "quitar al unico propietario" o el de dos propietarios pasa antes de tocar la funcion, la assertion no esta probando lo que dice.
- **GREEN:** aplicar los deltas 1, 2 y 3 sobre `202608280002` y demostrar la suite en verde.
- **TRIANGULATE:** membresias no propietarias, transferencia bajo limite y creacion en el limite exacto, para probar que la barrera no bloquea de mas.
- **REFACTOR:** nombres, fixtures repetidos y mensajes, sin cambiar comportamiento; volver a correr la cadena.

Las 9 assertions del PR #2 no se editan para acomodar los deltas. Si alguna se rompe, es regresion.

## Consulta remota sin cambios

Sigue pendiente y sigue siendo condicion para declarar el gate cerrado: consultar el estado remoto enlazado en modo lectura, registrar el ambiente destino y verificar que ninguna organizacion existente viole la invariante que instala el delta 3. No aplicar migraciones ni crear recursos remotos. El PR #2 lo dejo como checklist sin tildar por falta de credenciales; es un item de Facu, no del agente.

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|---|---|
| Editar la migracion del PR #2 la desincroniza de un ambiente donde ya corrio | Verificar antes de empezar que `202608280002` no fue aplicada a ningun remoto; si lo fue, el delta pasa a ser migracion nueva |
| Pasar la invariante a `<> 1` rompe alguna de las 9 assertions del PR #2 | Correr la suite completa; una ruptura es senal de que el fixture dependia de la version laxa, no motivo para relajar la invariante |
| Cubrir UPDATE en el constraint trigger dispara en updates rutinarios de `organizations` | Es diferido y solo cuenta propietarios; una organizacion sana pasa. Cubrir con una assertion de UPDATE valido |
| El bloque `DO` hace fallar la migracion en local por fixtures preexistentes | `db:reset` parte de base limpia; si falla, hay un dato invalido real que hay que reportar |
| Deriva de alcance hacia M3 mientras se trabaja sobre una rama vecina | La rama base es `fix/m2-organization-hardening`, nunca `feat/m3-document-ingest` |

## No-goals protegidos

- No crear tablas, buckets, storage ni codigo de ingesta.
- No cambiar el tope de 10.
- No tocar roles ni matriz de permisos.
- No tocar `src/` ni UI.
- No resolver DEC-021 ni empezar M3.
- No editar `supabase/tests/database/m2_rls.test.sql`.
