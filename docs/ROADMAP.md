# Roadmap de RECIA

## Proposito

Esta hoja de ruta convierte la demo actual en un SaaS publico para PyMEs argentinas. Ordena el trabajo por dependencias y define resultados verificables; no reemplaza el registro de decisiones de [DECISIONS.md](DECISIONS.md).

## Alcance de V1

La V1 cubrira registro publico, equipos, carga de PDF/JPG/PNG/HEIC, conservacion privada del original, extraccion OCR real, revision humana, archivo documental, exportacion CSV/XLSX y cobro manual.

Quedan fuera de V1 ARCA, integraciones contables, ingesta por email, aplicacion movil nativa, billing automatizado y contabilizacion sin revision humana.

## Estados

- `Completado`: entregables y criterios verificados.
- `En curso`: trabajo iniciado, todavia no cumple todos los criterios.
- `Pendiente`: no iniciado o bloqueado por dependencias.
- `Bloqueado`: requiere una decision o recurso externo.

## Orden y dependencias

`M0 -> M1 -> M2 -> M3 -> M4 -> M5 -> M6 -> M7`

M3 y la preparacion del corpus de M4 pueden avanzar en paralelo despues de M2. M5 depende de un contrato fiscal acordado, aunque puede comenzar con resultados OCR simulados y tipados. M7 requiere que todos los controles de aislamiento y recuperacion hayan sido verificados.

La estimacion orientativa es de 6 a 8 semanas de implementacion sostenida. No es una fecha comprometida: depende del benchmark OCR, las decisiones pendientes y la disponibilidad de comprobantes anonimizados.

## M0 - Documentar y congelar la demo

**Estado:** Completado al integrar el paquete documental que contiene este archivo.

### Objetivo

Dejar una referencia reproducible del prototipo, sin confundir sus simulaciones con capacidades productivas.

### Dependencias

Ninguna.

### Entregables

- README operativo de la demo.
- Roadmap de implementacion.
- Registro de decisiones aceptadas y pendientes.
- Handoff autosuficiente.
- Inventario de limitaciones y defectos conocidos.

### Criterios de aceptacion

- Una persona nueva puede clonar, ejecutar y probar manualmente la demo.
- OCR aleatorio y `localStorage` se describen como simulaciones.
- Los documentos distinguen estado actual, objetivo y pendientes.
- La documentacion esta enlazada desde el README.

### Riesgos

- Que cambios posteriores dejen desactualizado el snapshot.
- Que la demo sea utilizada accidentalmente con datos reales.

### Decisiones relacionadas

- Aceptada: la demo es un prototipo, no una aplicacion productiva (`DEC-013`).
- Aceptada: preservar el prototipo mediante el tag `prototype-v0.1.0` y reemplazar la raiz (`DEC-023`).

## M1 - Base Next.js, TypeScript y despliegue

**Estado:** Completado el 2026-08-27.

### Progreso actual

- Tag remoto `prototype-v0.1.0` publicado.
- Scaffold Next.js App Router y TypeScript creado en la raiz.
- Lint, typecheck, tests y build configurados y verificados localmente.
- CI de GitHub Actions incorporada y verificada en verde.
- Variables publicas y estrategia de migraciones de Supabase documentadas.
- Repositorio enlazado con Vercel y produccion accesible en https://recia.vercel.app.
- Commit base `115cd26228b863e6625dde489c633855c3e63dee` desplegado y verificado.

### Objetivo

Crear una base productiva instalable, verificable y desplegable sin incorporar aun el flujo OCR completo.

### Dependencias

- M0 completado.
- Matriz de permisos aprobada (`DEC-014`).
- Protocolo de benchmark aprobado, sin seleccionar aun al proveedor (`DEC-015`).
- Limites de archivos aprobados (`DEC-017`).
- Esquema fiscal inicial aprobado (`DEC-018`).
- Estrategia de la demo aprobada (`DEC-023`).

### Entregables

- Aplicacion Next.js con App Router y TypeScript.
- Configuracion de lint, typecheck, tests y build.
- CI para pull requests y `main`.
- Preview de Vercel.
- Variables de entorno documentadas mediante `.env.example`, sin secretos.
- Estrategia inicial de migraciones de Supabase.

### Criterios de aceptacion

- Una instalacion limpia puede ejecutar desarrollo, lint, typecheck, tests y build.
- CI pasa sobre `main`.
- Existe un preview accesible en Vercel.
- No hay credenciales versionadas.
- La demo fue preservada o reemplazada segun una decision registrada.

### Riesgos

- Migrar componentes visuales antes de estabilizar contratos de dominio.
- Introducir dependencias innecesarias durante el scaffold.

### Decisiones relacionadas

- Aceptadas: Next.js y TypeScript (`DEC-003`), Vercel (`DEC-004`).
- Aceptadas para el scaffold: permisos (`DEC-014`), protocolo OCR (`DEC-015`), archivos (`DEC-017`), esquema fiscal (`DEC-018`) y demo (`DEC-023`). La licencia (`DEC-024`) debe resolverse antes de contribuciones o releases.

## M2 - Autenticacion, organizaciones y RLS

**Estado:** Completado el 2026-08-28.

### Resultado verificado

- Supabase Auth con registro inmediato, login, logout y recuperacion de contrasena.
- `profiles`, `organizations`, `organization_members` e invitaciones creadas por migraciones.
- Propietario unico, transferencia atomica y roles de `DEC-014`.
- Organizacion activa expresada en la URL y validada nuevamente por RLS.
- Invitaciones bearer de 7 dias para operador o solo lectura, revocables por propietario o administrador.
- Eliminacion inmediata de organizaciones por propietario y de cuentas sin organizaciones propias.
- Topes antiabuso de 10 organizaciones activas por propietario y 30 invitaciones por organizacion/hora.
- 35 pruebas pgTAP, incluidas mutaciones entre tenants, invitaciones, cuotas y borrados server-only.
- Commit `1e8c18ac2539535d53622aa10a84517b7d996624` desplegado y CI en verde.

### Objetivo

Establecer identidad, membresias y aislamiento multi-tenant antes de almacenar comprobantes reales.

### Dependencias

- M1 completado.
- Matriz de permisos aprobada (`DEC-014`).

### Entregables

- Registro, inicio y cierre de sesion con Supabase Auth.
- Tablas `profiles`, `organizations` y `organization_members`.
- Seleccion de organizacion activa.
- Roles propietario, administrador, operador y solo lectura.
- Politicas RLS para cada operacion.
- Flujo de alta o invitacion de miembros.
- Tests negativos de acceso entre organizaciones.

### Criterios de aceptacion

- Un usuario solo accede a organizaciones donde tiene membresia activa.
- La API y RLS, no la interfaz, aplican permisos.
- Un usuario de la organizacion A no puede leer, crear, modificar ni eliminar recursos de B.
- `service_role` nunca llega al navegador.
- Cambiar `organization_id` desde el cliente no permite evadir RLS.

### Riesgos

- Politicas RLS incompletas o diferentes entre tablas y Storage.
- Escalamiento de privilegios mediante invitaciones o cambios de rol.

### Decisiones relacionadas

- Aceptadas: Supabase (`DEC-005`) y multi-tenancy con roles (`DEC-006`).
- Aceptada: matriz conservadora de permisos (`DEC-014`).
- Aceptadas: contrato Auth/invitaciones (`DEC-026`), propiedad y eliminacion M2 (`DEC-027`) y topes antiabuso (`DEC-028`).

## M3 - Archivo documental e ingesta

**Estado:** Pendiente.

### Objetivo

Recibir documentos de forma segura, conservar el original y mantener un estado durable aunque el procesamiento falle.

### Dependencias

- M2 completado.
- Limites de archivo acordados (`DEC-017`).

### Entregables

- Tablas `documents` y estados iniciales de procesamiento.
- Bucket privado de Supabase Storage con RLS.
- Carga de PDF, JPG, PNG y HEIC.
- Validacion server-side de MIME real, bytes, paginas y archivos corruptos.
- Hash SHA-256 y metadata del original.
- Miniaturas o conversiones separadas.
- Descarga mediante URLs firmadas de corta duracion.
- Manejo de cargas interrumpidas y objetos huerfanos.

### Criterios de aceptacion

- Existe al menos un fixture valido por formato.
- Un archivo invalido o excesivo produce un error comprensible.
- El original descargado conserva su hash.
- Recargar la aplicacion no pierde documento ni estado.
- Ninguna organizacion puede listar o firmar archivos ajenos.
- Un fallo posterior no elimina el original.

### Riesgos

- HEIC no soportado por componentes de preview.
- PDF multipagina con costos o tiempos excesivos.
- Archivos maliciosos o bombas de descompresion.

### Decisiones relacionadas

- Aceptada: formatos y conservacion del original (`DEC-007`).
- Aceptada: limites y reglas de conversion (`DEC-017`).

## M4 - Benchmark e integracion OCR

**Estado:** Pendiente.

### Objetivo

Elegir e integrar un proveedor a partir de evidencia sobre comprobantes argentinos, no de confianza autodeclarada por el modelo.

### Dependencias

- M2 completado para aislamiento.
- M3 disponible para documentos reales.
- Protocolo de benchmark aprobado (`DEC-015`).
- Cola asincrona seleccionada (`DEC-016`).

### Entregables

- Corpus anonimizado y etiquetado.
- Ground truth y script reproducible de evaluacion.
- Comparacion de tres candidatos.
- Metricas por campo, documento, costo y latencia.
- ADR de seleccion del proveedor.
- Tablas `processing_jobs`, `receipt_data`, `receipt_tax_lines` y `receipt_other_taxes`.
- Adaptador server-side con validacion estricta de salida.
- Reintentos, timeout, idempotencia y trazabilidad de version.

### Criterios de aceptacion

- Todos los candidatos se evaluan con el mismo corpus.
- Metricas y umbrales se fijan antes de elegir proveedor.
- Se registran exactitud por campo, p50/p95 y costo por pagina/documento.
- Privacidad, retencion y uso para entrenamiento forman parte de la evaluacion.
- La imagen real alimenta la extraccion.
- Un error deja el documento recuperable y permite reintentar sin duplicar costos accidentalmente.

### Riesgos

- Corpus pequeno o sesgado.
- Variabilidad en comprobantes y fotos de baja calidad.
- Costos o latencias incompatibles con los planes comerciales.

### Decisiones relacionadas

- Aceptadas: procesamiento asincrono (`DEC-008`) y seleccion por benchmark (`DEC-009`).
- Aceptado: protocolo (`DEC-015`). Pendientes: cola (`DEC-016`) y seleccion del proveedor despues del benchmark (`DEC-025`).

## M5 - Revision y gestion de comprobantes

**Estado:** Pendiente.

### Objetivo

Convertir una extraccion trazable en datos fiscales revisados, consultables y auditables.

### Dependencias

- M4 integrado o un adaptador de desarrollo compatible.
- Esquema fiscal y duplicados aprobados (`DEC-018`).

### Entregables

- Listado paginado, busqueda, filtros y detalle.
- Comparacion entre original, extraccion y valor corregido.
- Validaciones de CUIT, fechas, importes, impuestos y moneda.
- Manejo correcto de notas de credito.
- Historial en `audit_events` y soft delete.
- Deteccion o advertencia de duplicados.
- Dashboard basado en datos persistidos.

### Criterios de aceptacion

- Los campos obligatorios y reglas de redondeo estan documentados y testeados.
- Los importes conservan centavos y signo contable.
- Una correccion registra actor, fecha y cambio.
- Busqueda, metricas y auditoria se limitan a la organizacion activa.
- Reprocesar conserva historial y no sobrescribe silenciosamente datos revisados.

### Riesgos

- Modelo fiscal insuficiente para documentos argentinos reales.
- Confundir confianza del proveedor con precision medida.

### Decisiones relacionadas

- Aceptada: revision humana dentro del alcance (`DEC-002`).
- Aceptada: esquema fiscal normalizado y duplicados (`DEC-018`).

## M6 - Exportaciones CSV y XLSX

**Estado:** Pendiente.

### Objetivo

Entregar datos revisados en formatos utilizables por las PyMEs sin exponer informacion de otras organizaciones.

### Dependencias

- M5 completado.
- Contrato de exportacion aprobado (`DEC-019`).

### Entregables

- Exportacion server-side a CSV.
- Exportacion server-side a XLSX.
- Seleccion por filtros y periodo.
- Esquema de columnas versionado.
- Auditoria y limites de exportacion.

### Criterios de aceptacion

- Solo se exportan datos revisados de la organizacion activa.
- Totales y cantidad coinciden con la consulta origen.
- Fechas, decimales, CUIT y ceros iniciales no se corrompen en Excel.
- Se prueban exportaciones vacias, unitarias y multiples.
- Nombre, zona horaria, locale y filtros quedan documentados.

### Riesgos

- Interpretacion automatica incorrecta de Excel.
- Exportaciones grandes que excedan limites serverless.

### Decisiones relacionadas

- Aceptada: CSV y XLSX (`DEC-010`).
- Pendiente: columnas, locale y limites (`DEC-019`).

## M7 - Prueba publica y preparacion productiva

**Estado:** Pendiente.

### Objetivo

Abrir el registro publico con limites de costo, operacion recuperable y condiciones comerciales y legales explicitas.

### Dependencias

- M1 a M6 completados.
- Planes, retencion y proveedores operativos resueltos.

### Entregables

- Registro publico y onboarding.
- Prueba limitada y `usage_periods`.
- Procedimiento de alta, renovacion, suspension y reactivacion manual.
- Landing, precios, terminos y privacidad.
- Rate limiting y cuotas por organizacion.
- Observabilidad sin documentos ni secretos en logs.
- Backups y prueba de restauracion.
- Runbooks de incidentes, soporte, despliegue y rollback.
- Checklist de seguridad y lanzamiento.

### Criterios de aceptacion

- Los limites detienen abuso antes de consumir OCR sin control.
- El cobro es manual y auditable; no se presenta billing automatico.
- Se prueba una restauracion y un rollback.
- Alertas cubren errores, latencia, consumo y almacenamiento.
- Las politicas legales y de retencion estan publicadas y revisadas profesionalmente.
- Los tests E2E cubren registro, equipo, carga, OCR, revision, exportacion y eliminacion.

### Riesgos

- Costos unitarios desconocidos o margen negativo.
- Procesamiento de datos fiscales sin acuerdos adecuados con proveedores.
- Sobrecarga de soporte durante el registro publico.

### Decisiones relacionadas

- Aceptada: registro publico, equipos y cobro manual (`DEC-011`).
- Pendientes: planes (`DEC-020`), retencion (`DEC-021`) y proveedores operativos (`DEC-022`).

## Trabajo posterior a V1

- Integracion con ARCA.
- Integraciones contables.
- Ingesta por email.
- Aplicacion movil nativa.
- Billing recurrente automatizado.
- Automatizaciones contables adicionales.

Estas lineas requieren nuevas decisiones y no deben retrasar los criterios de V1.

## Riesgos transversales

- Aislamiento multi-tenant incompleto.
- Baja representatividad del corpus OCR.
- Datos sensibles en logs, previews o URLs.
- Costos variables de OCR, Storage y funciones.
- Falta de politicas de retencion y respuesta a incidentes.
- Documentacion desactualizada respecto de `main`.

## Proxima accion

Preparar M3 con un proyecto Supabase separado para produccion o staging, y luego implementar `documents`, Storage privado, validacion server-side y preservacion del original. No integrar OCR real antes de completar la ingesta segura.
