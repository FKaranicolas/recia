# Registro de decisiones de RECIA

## Como usar este documento

Este registro separa decisiones aceptadas de preguntas todavia abiertas. Los identificadores son estables: una decision reemplazada no se elimina, sino que se marca como `Reemplazada` y enlaza a su sucesora.

Estados posibles:

- `Aceptada`: debe guiar la implementacion.
- `Pendiente`: requiere definicion antes del hito relacionado.
- `Reemplazada`: se conserva por trazabilidad.

Fecha del registro inicial: 2026-08-26.

## Decisiones aceptadas

### DEC-001 - Mercado y modalidad del producto

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** La demo debe evolucionar hacia un producto comercial enfocado en Argentina.
- **Decision:** RECIA sera un SaaS publico para PyMEs argentinas.
- **Consecuencias:** El producto necesita registro, aislamiento entre clientes, operacion productiva y documentacion legal.
- **Alternativas:** Piloto privado, producto para estudios contables o herramienta individual.
- **Revision futura:** Revisar el segmento despues de obtener metricas de activacion y uso.

### DEC-002 - Alcance funcional de V1

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Es necesario limitar el primer lanzamiento a un flujo que entregue valor completo.
- **Decision:** V1 cubrira carga, extraccion, revision humana, archivo documental, busqueda y exportacion de comprobantes.
- **Consecuencias:** El resultado revisado sera la fuente para consultas y exportaciones; la respuesta cruda del OCR conservara trazabilidad.
- **Alternativas:** Solo OCR, solo archivo o automatizacion contable completa.
- **Revision futura:** Evaluar nuevas funciones despues de validar adopcion y calidad.

### DEC-003 - Framework de aplicacion

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** La demo vanilla no ofrece una base suficiente para auth, APIs, tipado y operacion SaaS.
- **Decision:** La aplicacion productiva usara Next.js con App Router y TypeScript.
- **Consecuencias:** La interfaz reutilizable se migrara a componentes tipados; se incorporaran build, lint, typecheck y tests.
- **Alternativas:** Mantener JavaScript vanilla o usar otro framework SPA.
- **Revision futura:** No prevista para V1 salvo bloqueo tecnico probado.

### DEC-004 - Hosting de aplicacion

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Se necesita despliegue integrado con Next.js y previews por cambio.
- **Decision:** Frontend y endpoints server-side se desplegaran en Vercel.
- **Consecuencias:** El diseno debe respetar limites de funciones, payloads y tiempos de ejecucion; los secretos se administraran en Vercel.
- **Alternativas:** AWS, Azure o hosting autogestionado.
- **Revision futura:** Revisar si costos o limites operativos impiden cumplir los SLO.

### DEC-005 - Plataforma de identidad, datos y archivos

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** V1 necesita identidad, PostgreSQL y almacenamiento de objetos con poca carga operativa.
- **Decision:** Se usaran Supabase Auth, PostgreSQL y un bucket privado de Supabase Storage.
- **Consecuencias:** Las migraciones y politicas RLS son parte del codigo; la clave `service_role` no puede exponerse al cliente.
- **Alternativas:** Servicios separados o infraestructura cloud autogestionada.
- **Revision futura:** Revisar capacidad, residencia y costos antes de escalar fuera de V1.

### DEC-006 - Multi-tenancy y roles

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Varias PyMEs y sus equipos almacenaran datos fiscales sensibles.
- **Decision:** El tenant sera una organizacion con membresias y roles propietario, administrador, operador y solo lectura. RLS aplicara el aislamiento.
- **Consecuencias:** Toda entidad de negocio debe relacionarse con una organizacion; ocultar controles en UI no constituye autorizacion.
- **Alternativas:** Una base por cliente, un solo usuario por empresa o filtros sin RLS.
- **Revision futura:** Revisar roles despues de definir y probar su matriz exacta (`DEC-014`).

### DEC-007 - Formatos y conservacion del original

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Las PyMEs reciben facturas digitales y tambien toman fotografias.
- **Decision:** V1 aceptara PDF, JPG, PNG y HEIC. El original sera inmutable y privado; previews y conversiones se almacenaran por separado.
- **Consecuencias:** Se requieren validacion server-side, hash, metadata, conversion segura y soporte multipagina.
- **Alternativas:** Solo imagenes o conservar unicamente la version comprimida.
- **Revision futura:** Revisar formatos adicionales a partir del uso real.

### DEC-008 - Modelo de procesamiento

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** OCR puede tardar, fallar y superar el ciclo de una solicitud web.
- **Decision:** El procesamiento sera asincrono, con estados persistidos, reintentos, timeout e idempotencia.
- **Consecuencias:** El documento se guarda antes de procesarlo; los jobs deben poder reanudarse sin duplicar registros o costos.
- **Alternativas:** Procesamiento exclusivamente sincrono desde una funcion web.
- **Revision futura:** Revisar proveedor de cola y concurrencia segun volumen.

### DEC-009 - Seleccion del OCR

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** La precision sobre comprobantes argentinos no puede inferirse de demos o claims comerciales.
- **Decision:** El proveedor OCR/IA se elegira mediante un benchmark reproducible con corpus anonimizado y ground truth.
- **Consecuencias:** No se integrara un proveedor definitivo antes de fijar metricas y umbrales; se usara un adaptador server-side.
- **Alternativas:** Elegir por precio, popularidad o preferencia previa.
- **Revision futura:** Repetir el benchmark ante cambios mayores de modelo, precio o calidad.

### DEC-010 - Formatos de exportacion

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** El valor comercial inicial requiere sacar datos revisados de RECIA.
- **Decision:** V1 generara exportaciones server-side en CSV y XLSX.
- **Consecuencias:** El contrato de columnas sera versionado y debera preservar fechas, centavos, CUIT y ceros iniciales.
- **Alternativas:** Solo CSV, descarga JSON o integraciones contables directas.
- **Revision futura:** Evaluar plantillas e integraciones despues de V1.

### DEC-011 - Registro, equipos y monetizacion inicial

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** El lanzamiento sera publico, pero no se quiere implementar billing recurrente en la primera etapa.
- **Decision:** Habra registro publico con prueba limitada, equipos multiusuario y activacion/cobro manual de planes.
- **Consecuencias:** Se necesitan cuotas de uso y un procedimiento auditable de alta, suspension y reactivacion, sin checkout automatico.
- **Alternativas:** Piloto cerrado, usuario unico o suscripcion automatica desde el inicio.
- **Revision futura:** Evaluar billing automatico cuando se validen planes y cobranza.

### DEC-012 - Exclusiones de V1

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Integraciones y automatizaciones adicionales aumentarian el tiempo y el riesgo del lanzamiento.
- **Decision:** ARCA, Tango/Xubio, otras integraciones, email ingestion, app movil nativa, billing automatico y contabilizacion sin revision quedan fuera de V1.
- **Consecuencias:** No deben bloquear los hitos M1-M7 ni aparecer como funciones disponibles.
- **Alternativas:** Incorporar alguna o todas en V1.
- **Revision futura:** Priorizar despues de medir demanda de clientes.

### DEC-013 - Tratamiento de la demo actual

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** La interfaz actual simula IA y base de datos, aunque su flujo visual es reutilizable.
- **Decision:** La implementacion vanilla se considera un prototipo de UX, no una base productiva terminada.
- **Consecuencias:** No se desplegara con datos reales; los patrones visuales pueden migrarse sin conservar supuestos inseguros.
- **Alternativas:** Conectar Supabase directamente reemplazando solo el cuerpo de las funciones actuales.
- **Revision futura:** Definir como preservar o archivar el prototipo en `DEC-023`.

## Decisiones pendientes

### DEC-014 - Matriz exacta de permisos

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Los cuatro roles estan aceptados, pero falta definir permiso por operacion.
- **Decision pendiente:** Determinar quien puede invitar, cambiar roles, cargar, revisar, exportar, eliminar, restaurar y administrar planes.
- **Consecuencias:** Forma parte del gate acordado antes de M1 y bloquea las politicas RLS completas y los tests de M2.
- **Alternativas:** Matriz conservadora, roles mas simples o permisos configurables.
- **Revision futura:** Resolver dentro del paquete de decisiones previo a M1.

### DEC-015 - Protocolo del benchmark OCR

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Deben definirse corpus, candidatos, metricas, pesos y umbrales antes de comparar.
- **Decision pendiente:** Aprobar el corpus, ground truth, candidatos, metricas, pesos, umbrales y procedimiento reproducible.
- **Consecuencias:** Forma parte del gate acordado antes de M1 y bloquea la ejecucion valida del benchmark de M4, pero no selecciona por si misma al proveedor.
- **Alternativas:** Benchmark interno con corpus propio o evaluacion externa independiente.
- **Revision futura:** Resolver dentro del paquete de decisiones previo a M1. La seleccion posterior se registra por separado en `DEC-025`.

### DEC-016 - Proveedor de cola asincrona

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** El procesamiento asincrono esta aceptado, pero no la herramienta de ejecucion.
- **Decision pendiente:** Seleccionar una cola compatible con Vercel, retries, idempotencia y observabilidad.
- **Consecuencias:** Afecta jobs, costos, limites y recuperacion.
- **Alternativas:** Inngest, otro proveedor administrado o mecanismo basado en Supabase.
- **Revision futura:** Resolver antes de implementar M4.

### DEC-017 - Limites y conversion de archivos

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Los formatos estan aceptados, pero faltan limites de bytes, paginas y pixeles.
- **Decision pendiente:** Definir maximos, politica de PDF multipagina, conversion de HEIC, scanning y rechazo de archivos.
- **Consecuencias:** Forma parte del gate acordado antes de M1 y bloquea validaciones y cuotas de M3.
- **Alternativas:** Limites unicos o limites diferenciados por plan/formato.
- **Revision futura:** Resolver dentro del paquete de decisiones previo a M1.

### DEC-018 - Esquema fiscal y duplicados

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Los campos previstos requieren tipos, obligatoriedad, alicuotas, redondeo y signos definidos.
- **Decision pendiente:** Cerrar el esquema de `receipt_data`, tratamiento de impuestos/notas de credito y clave de duplicados.
- **Consecuencias:** Forma parte del gate acordado antes de M1 y bloquea validacion completa, metricas y revision de M5.
- **Alternativas:** Esquema minimo fijo o estructura extensible para impuestos.
- **Revision futura:** Aprobar una version inicial dentro del paquete previo a M1 y revisarla con muestras reales antes de M5.

### DEC-019 - Contrato de CSV y XLSX

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Los formatos estan aceptados, pero no sus columnas ni convenciones.
- **Decision pendiente:** Definir columnas, orden, version, locale, zona horaria, separador y limites.
- **Consecuencias:** Bloquea criterios finales de M6.
- **Alternativas:** Un formato canonico o plantillas seleccionables.
- **Revision futura:** Resolver antes de implementar exportaciones.

### DEC-020 - Prueba, planes y precios

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** El cobro sera manual, pero faltan cuota gratuita, planes, moneda, precios y reglas de suspension.
- **Decision pendiente:** Definir oferta comercial y limites de consumo.
- **Consecuencias:** Bloquea onboarding publico y guardrails de costos de M7.
- **Alternativas:** Prueba por tiempo, por documentos o acceso aprobado manualmente.
- **Revision futura:** Resolver con costos del benchmark antes de M7.

### DEC-021 - Retencion, eliminacion y backups

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Los documentos contienen datos fiscales y potencialmente personales.
- **Decision pendiente:** Definir retencion por estado, soft delete, borrado definitivo, backups y respuesta a derechos de titulares.
- **Consecuencias:** Bloquea politicas legales y operacion productiva.
- **Alternativas:** Retencion configurable por cliente o politica unica de V1.
- **Revision futura:** Resolver con asesoramiento legal antes de datos reales.

### DEC-022 - Email y observabilidad

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** Registro, invitaciones, soporte y operacion requieren proveedores adicionales.
- **Decision pendiente:** Seleccionar email transaccional, monitoreo de errores, metricas y alertas.
- **Consecuencias:** Afecta onboarding, privacidad, subencargados y runbooks.
- **Alternativas:** Servicios administrados compatibles con Vercel o capacidades incluidas en plataformas elegidas.
- **Revision futura:** Resolver durante M1/M2 y antes de M7.

### DEC-023 - Migracion o archivo de la demo

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** La demo contiene un sistema visual util, pero tambien supuestos incompatibles con produccion.
- **Decision pendiente:** Preservarla en una rama/carpeta, migrarla incrementalmente o reemplazarla en `main`.
- **Consecuencias:** Afecta la estructura inicial de M1 y la posibilidad de comparar UX.
- **Alternativas:** Rama `prototype`, carpeta `prototype/` o reemplazo con referencia en tags.
- **Revision futura:** Resolver inmediatamente antes del scaffold.

### DEC-024 - Licencia del repositorio

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** El repositorio es publico, pero no tiene archivo `LICENSE`.
- **Decision pendiente:** Definir licencia, mantener todos los derechos reservados o hacer privado el repositorio.
- **Consecuencias:** Sin licencia no debe asumirse permiso de reutilizacion.
- **Alternativas:** Licencia open source compatible con el objetivo comercial o codigo propietario.
- **Revision futura:** Resolver antes de aceptar contribuciones externas o distribuir releases.

### DEC-025 - Proveedor OCR

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** El principio de seleccion por evidencia esta aceptado, pero el ganador solo puede conocerse despues de ejecutar el protocolo de `DEC-015`.
- **Decision pendiente:** Seleccionar el proveedor que cumpla los umbrales de calidad, costo, latencia, privacidad y operacion.
- **Consecuencias:** Bloquea la integracion definitiva del adaptador OCR de M4, no la preparacion del corpus ni el benchmark.
- **Alternativas:** Proveedor generalista multimodal, parser especializado o combinacion con fallback.
- **Revision futura:** Resolver despues del benchmark y registrar evidencia, version evaluada y fecha de reevaluacion.

## Decisiones reemplazadas

No hay decisiones reemplazadas en este snapshot.
