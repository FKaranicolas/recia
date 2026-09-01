# Documents Specification

## Purpose

Define el procesamiento de comprobantes en RECIA bajo `DEC-029`: los archivos se
validan y procesan en memoria durante la peticion y se descartan al terminar.
RECIA no conserva el comprobante ni ninguna representacion de su contenido.

No existe una spec canonica previa para este dominio, asi que este archivo es la
spec completa del dominio `documents`.

## Requirements

### Requirement: Ninguna persistencia del comprobante

El sistema MUST NOT persistir el archivo subido ni ninguna representacion de su
contenido: ni el original, ni derivados, ni miniaturas, ni el checksum del
contenido.

El archivo MUST existir unicamente en memoria durante la peticion que lo
procesa, y MUST quedar fuera de alcance al terminar esa peticion.

El sistema MUST NOT escribir el contenido del archivo a disco, a storage, a base
de datos ni a logs.

El repositorio MUST NOT declarar buckets, tablas ni RPC destinados a guardar
comprobantes o sus derivados.

#### Scenario: Un comprobante procesado no deja rastro persistido

- GIVEN un usuario miembro activo de la organizacion X
- WHEN sube un comprobante valido y el servidor lo procesa
- THEN la respuesta contiene el resultado del procesamiento
- AND no existe ninguna fila nueva que referencie el archivo
- AND no existe ningun objeto nuevo en storage
- AND ningun archivo temporal del contenido queda en el sistema de archivos

#### Scenario: El mismo comprobante subido dos veces se procesa dos veces

- GIVEN un usuario que ya proceso un comprobante
- WHEN sube exactamente el mismo archivo otra vez
- THEN el sistema lo procesa de nuevo sin reconocerlo
- AND no consulta ni escribe ningun checksum persistido

#### Scenario: El repositorio no declara recursos de almacenamiento

- WHEN se inspecciona `supabase/migrations/`
- THEN no existe ninguna migracion que cree buckets de comprobantes
- AND no existe ninguna tabla con una columna de ruta de almacenamiento de
  comprobantes

### Requirement: Validacion server-side por firma de contenido

El sistema MUST determinar el tipo real del archivo por su firma de contenido y
MUST NOT confiar en el tipo declarado por el cliente ni en la extension del
nombre.

El sistema MUST rechazar los archivos que superen los limites vigentes de bytes,
pixeles, paginas o longitud de nombre, y MUST evaluar el tamano antes de
decodificar el contenido.

Cada rechazo MUST corresponder a un caso tipado de `DocumentRejection`, y el
mensaje devuelto MUST NOT incluir contenido del archivo.

#### Scenario: Un archivo con tipo declarado falso es rechazado

- GIVEN un archivo cuyo contenido no corresponde a ningun tipo soportado
- WHEN se envia declarando `Content-Type` de un tipo soportado
- THEN el sistema lo rechaza por firma de contenido
- AND el rechazo es un caso tipado
- AND no se intenta decodificar el archivo

#### Scenario: Un archivo que excede el tope es rechazado antes de decodificar

- GIVEN un archivo que supera el tope de bytes de su tipo
- WHEN se envia para procesar
- THEN el sistema lo rechaza por tamano
- AND no carga el contenido completo en memoria para decidirlo

#### Scenario: Un archivo truncado es rechazado

- GIVEN un archivo de tipo soportado cuyo trailer esta incompleto
- WHEN se envia para procesar
- THEN el sistema lo rechaza como archivo incompleto

#### Scenario: Un comprobante valido es procesado

- GIVEN un archivo PDF o imagen de tipo soportado, dentro de todos los topes
- WHEN se envia para procesar
- THEN el sistema devuelve el resultado del procesamiento
- AND el resultado incluye el tipo real detectado y las metricas leidas del
  contenido

### Requirement: Aislamiento del procesamiento por organizacion

El procesamiento MUST ocurrir en el contexto de una organizacion de la que el
usuario es miembro activo.

Un usuario MUST NOT poder procesar en nombre de una organizacion en la que no es
miembro activo, ni siquiera indicando su identificador de forma explicita.

Un usuario no autenticado MUST NOT poder procesar.

#### Scenario: Un no miembro no puede procesar en nombre de otra organizacion

- GIVEN un usuario autenticado que no es miembro de la organizacion X
- WHEN envia un comprobante indicando la organizacion X
- THEN la operacion es rechazada por autorizacion
- AND el archivo no se procesa

#### Scenario: Un usuario no autenticado no puede procesar

- GIVEN una peticion sin sesion valida
- WHEN envia un comprobante
- THEN la operacion es rechazada
- AND el archivo no se procesa

### Requirement: Preservacion de la cobertura de invariantes existente

El sistema MUST conservar en verde las assertions pgTAP de M2 y del gate de
endurecimiento, sin editarlas.

Los tests de `src/lib/documents/` MUST seguir verdes, incluidos los de derivados
ejecutados en Linux dentro de integracion continua.

#### Scenario: La suite completa pasa tras quitar la persistencia

- GIVEN una base local limpia reconstruida con `db:reset`
- WHEN se ejecutan `db:test` y `npm run verify`
- THEN las assertions de M2 y del gate pasan sin modificacion
- AND los tests de inspeccion, limites, firma y derivados pasan
- AND no queda ninguna referencia en `src/` a rutas de almacenamiento,
  checksums persistidos ni derivados registrados
