# Organizations Specification

## Purpose

Define las invariantes estructurales de propiedad de organizaciones en RECIA:
cuantas organizaciones puede poseer un usuario y cuantos propietarios activos
debe tener una organizacion. Estas invariantes deben sostenerse en la base de
datos, no en la convencion de que los clientes llamen a los RPC correctos.

No existe una spec canonica previa para este dominio, asi que este archivo es la
spec completa del dominio `organizations`. `sdd-archive` la copiara a
`openspec/specs/organizations/spec.md`.

## Requirements

### Requirement: Tope de propiedad activa por usuario

El sistema MUST impedir que un usuario posea mas de 10 organizaciones activas de
forma simultanea, en **toda** ruta que lo convierta en propietario activo,
incluidas la creacion y la transferencia de propiedad.

El tope MUST contar las membresias con `role = 'owner'` y `status = 'active'`.

Una operacion rechazada por el tope MUST fallar de forma atomica: no puede dejar
propietarios, roles ni estados de membresia modificados.

#### Scenario: La transferencia hacia un usuario en el tope es rechazada

- GIVEN un usuario B que ya posee 10 organizaciones activas
- AND un usuario A que posee la organizacion X
- AND B es miembro activo de X
- WHEN A invoca `transfer_organization_ownership(X, B)`
- THEN la operacion falla con un error de tope de propiedad
- AND A sigue siendo propietario activo de X
- AND B conserva el rol que tenia en X antes del intento
- AND B sigue poseyendo exactamente 10 organizaciones activas

#### Scenario: La transferencia por debajo del tope se concreta

- GIVEN un usuario B que posee 9 organizaciones activas
- AND un usuario A que posee la organizacion X
- AND B es miembro activo de X
- WHEN A invoca `transfer_organization_ownership(X, B)`
- THEN la operacion tiene exito
- AND B es el unico propietario activo de X
- AND A queda como `admin` de X
- AND B posee 10 organizaciones activas

#### Scenario: La creacion en el limite exacto sigue permitida

- GIVEN un usuario que posee 9 organizaciones activas
- WHEN invoca `create_organization` con un nombre valido
- THEN la organizacion se crea
- AND el usuario es su unico propietario activo
- AND el usuario posee 10 organizaciones activas

#### Scenario: La creacion por encima del tope es rechazada

- GIVEN un usuario que posee 10 organizaciones activas
- WHEN invoca `create_organization` con un nombre valido
- THEN la operacion falla con un error de tope de propiedad
- AND no se crea ninguna organizacion nueva
- AND el usuario sigue poseyendo 10 organizaciones activas

#### Scenario: Las membresias no propietarias no consumen el tope

- GIVEN un usuario que posee 10 organizaciones activas
- WHEN es agregado como `admin`, `operator` o solo lectura a otra organizacion
- THEN la operacion tiene exito
- AND el usuario sigue poseyendo 10 organizaciones activas

### Requirement: Propietario activo unico por organizacion

El sistema MUST garantizar que toda organizacion existente tenga exactamente un
propietario activo al cierre de cada transaccion, independientemente del rol de
base de datos que realice la escritura.

La verificacion MUST ser diferida al cierre de la transaccion, porque los RPC
legitimos escriben la organizacion y su membresia de propietario en pasos
separados dentro de una misma transaccion.

La invariante MUST resistir escrituras privilegiadas que eluden RLS, incluidas
las realizadas con `service_role`.

#### Scenario: Un insert privilegiado sin propietario es rechazado

- GIVEN una conexion con privilegios que elude RLS
- WHEN inserta una fila en `public.organizations` y no crea ninguna membresia de
  propietario activo en la misma transaccion
- THEN la transaccion falla al cerrarse con un error de invariante de propietario
- AND no queda ninguna organizacion nueva persistida

#### Scenario: Un insert privilegiado con propietario es aceptado

- GIVEN una conexion con privilegios que elude RLS
- WHEN inserta una fila en `public.organizations` y crea en la misma transaccion
  exactamente una membresia `owner` / `active`
- THEN la transaccion se confirma
- AND la organizacion tiene exactamente un propietario activo

#### Scenario: La creacion por RPC sigue satisfaciendo la invariante

- GIVEN un usuario autenticado por debajo del tope de propiedad
- WHEN invoca `create_organization` con un nombre valido
- THEN la transaccion se confirma
- AND la organizacion resultante tiene exactamente un propietario activo
- AND la firma y el contrato de errores del RPC no cambian

#### Scenario: Quitar al unico propietario es rechazado

- GIVEN una organizacion X con un unico propietario activo A
- WHEN una escritura elimina la membresia de A o cambia su `status` a inactivo
  sin promover otro propietario activo en la misma transaccion
- THEN la transaccion falla al cerrarse con un error de invariante de propietario
- AND A sigue siendo propietario activo de X

### Requirement: Preservacion de la cobertura de aislamiento existente

El sistema MUST conservar en verde las 35 assertions pgTAP existentes de esquema,
aislamiento entre organizaciones, permisos por rol y cuotas.

Las assertions existentes MUST NOT editarse para acomodar la implementacion. Una
ruptura en ellas es evidencia de regresion.

#### Scenario: La suite completa pasa tras el endurecimiento

- GIVEN una base local limpia reconstruida con `db:reset`
- WHEN se ejecuta `db:test`
- THEN las 35 assertions preexistentes pasan sin modificacion
- AND las assertions negativas nuevas de tope y de propietario tambien pasan
