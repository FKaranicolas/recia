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
- **Revision futura:** La preservacion quedo resuelta por `DEC-023`; revisar solo si se necesita congelar otra etapa demostrable.

## Decisiones adicionales

### DEC-014 - Matriz exacta de permisos

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Los cuatro roles estan aceptados, pero falta definir permiso por operacion.
- **Decision:** Aplicar una matriz conservadora. El propietario puede realizar todas las operaciones, transferir propiedad, administrar el estado comercial y solicitar el borrado de la organizacion. El administrador gestiona documentos, exportaciones, restauraciones, configuracion e integrantes no propietarios, pero no transfiere propiedad, elimina la organizacion ni administra facturacion. El operador puede ver, descargar, cargar, procesar, revisar, editar, exportar y enviar documentos a papelera, pero no restaura, purga, configura la organizacion ni administra integrantes. Solo lectura puede ver y descargar documentos individuales, sin carga, edicion, eliminacion ni exportacion masiva.
- **Consecuencias:** RLS y endpoints deben verificar tanto membresia como rol. Las acciones de UI no sustituyen autorizacion. Purga definitiva, propiedad y estado comercial quedan reservados al propietario o a procesos internos autorizados.
- **Alternativas:** Matriz conservadora, roles mas simples o permisos configurables.
- **Revision futura:** Revisar con telemetria y feedback despues del lanzamiento, sin ampliar permisos por defecto.

### DEC-015 - Protocolo del benchmark OCR

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Deben definirse corpus, candidatos, metricas, pesos y umbrales antes de comparar.
- **Decision:** Evaluar tres candidatos sobre el mismo corpus de 100 comprobantes argentinos autorizados y anonimizados: 35 Facturas A, 30 Facturas B, 15 Facturas C, 10 notas de credito/debito y 10 recibos. Debe incluir 40 PDF (al menos 15 escaneados), 40 JPG/PNG y 20 HEIC, con al menos 20 casos de calidad degradada que pueden superponerse con esos grupos. El ground truth tendra doble revision. Se mediran exactitud normalizada por campo, aprobacion documental de todos los campos criticos, omisiones/alucinaciones, latencia p50/p95, errores, costo, formatos, retencion, entrenamiento y subencargados. La ponderacion critica sera: tipo 10%, CUIT emisor 15%, fecha 10%, punto de venta 5%, numero 10%, moneda 5%, neto 10%, IVA/desglose 15%, otros tributos 5% y total 15%. El umbral de entrada sera al menos 95% de exactitud ponderada en campos criticos, 85% de documentos con todos los campos criticos correctos, menos de 2% de fallos tecnicos y p95 menor o igual a 30 segundos para documentos de hasta tres paginas. Todo candidato recibira exactamente los mismos bytes y una configuracion/modelo versionados en el manifiesto del benchmark.
- **Consecuencias:** El corpus, ground truth, normalizadores, configuraciones y resultados deben versionarse sin datos reales sensibles. Cumplir umbrales habilita la comparacion comercial, pero no selecciona por si mismo al proveedor.
- **Normalizacion:** Texto en Unicode NFC, trim, espacios colapsados y comparacion sin diferencias de mayusculas; CUIT solo con 11 digitos; fechas ISO `YYYY-MM-DD`; moneda ISO 4217; punto de venta y numero como digitos sin separadores y sin penalizar ceros de relleno; importes comparados como decimal con tolerancia maxima de `0.01`; tasas con tolerancia maxima de `0.0001`.
- **Denominadores:** Un campo esperado y omitido cuenta como incorrecto. Un valor emitido cuando el ground truth es no aplicable cuenta como alucinacion. Los campos no aplicables y correctamente omitidos se excluyen del denominador de ese campo. Un fallo tecnico cuenta en la tasa de fallos y marca todos los campos criticos del documento como incorrectos.
- **Adjudicacion:** Dos revisores etiquetan de forma independiente. Toda divergencia se resuelve por un tercer revisor antes de congelar el ground truth. El manifiesto guarda hash de archivos, split, normalizador y version de cada candidato.
- **Latencia:** El umbral p95 de 30 segundos aplica hasta tres paginas; para cuatro a diez paginas se exige p95 menor o igual a 90 segundos y se reporta tambien latencia por pagina.
- **Alternativas:** Benchmark interno con corpus propio o evaluacion externa independiente.
- **Revision futura:** Repetir ante cambios mayores de modelo, precio o contrato. La seleccion posterior se registra por separado en `DEC-025`.

### DEC-016 - Proveedor de cola asincrona

- **Estado:** Pendiente.
- **Fecha:** Pendiente.
- **Contexto:** El procesamiento asincrono esta aceptado, pero no la herramienta de ejecucion.
- **Decision pendiente:** Seleccionar una cola compatible con Vercel, retries, idempotencia y observabilidad.
- **Consecuencias:** Afecta jobs, costos, limites y recuperacion.
- **Alternativas:** Inngest, otro proveedor administrado o mecanismo basado en Supabase.
- **Revision futura:** Resolver antes de implementar M4.

### DEC-017 - Limites y conversion de archivos

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Los formatos estan aceptados, pero faltan limites de bytes, paginas y pixeles.
- **Decision:** Aceptar JPG, PNG y HEIC de hasta 10 MB y 40 megapixeles; aceptar PDF de hasta 20 MB y 10 paginas. Validar magic bytes, MIME, dimensiones y paginas en servidor antes de encolar OCR. Rechazar PDF cifrado o con contrasena, SVG, archivos activos, corruptos y formatos no permitidos. Conservar el original inmutable; conversion HEIC, rasterizacion PDF, remocion de metadata y miniaturas son derivados separados.
- **Consecuencias:** Los limites se aplican en cliente por UX, en API por seguridad y en Storage cuando sea posible. Un archivo rechazado no consume cuota OCR. La cantidad de paginas procesadas cuenta para uso y costo.
- **Alternativas:** Limites unicos o limites diferenciados por plan/formato.
- **Revision futura:** Ajustar por telemetria y costos; cualquier aumento requiere revisar protecciones de abuso.

### DEC-018 - Esquema fiscal y duplicados

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** Los campos previstos requieren tipos, obligatoriedad, alicuotas, redondeo y signos definidos.
- **Decision:** Usar un nucleo normalizado en `receipt_data` y tablas hijas `receipt_tax_lines` y `receipt_other_taxes`. El nucleo guarda tipo, emisor/receptor, CUIT, fecha, punto de venta, numero, moneda ISO 4217, tipo de cambio, neto gravado, no gravado, exento, IVA total, otros tributos, total, CAE/CAI, vencimiento, categoria, medio de pago manual y estado de revision. Los importes usan `numeric(18,2)`, tasas `numeric(7,4)` y tipo de cambio `numeric(18,6)`, nunca float. Facturas y recibos tienen signo contable `1`; notas de credito, `-1`; los importes persistidos son absolutos y vistas/exportaciones aplican el signo. Una restriccion unica parcial evita duplicados activos por organizacion, CUIT emisor, tipo, punto de venta y numero cuando todos estan presentes.
- **Consecuencias:** Se agregan `receipt_tax_lines` y `receipt_other_taxes` al modelo objetivo. Un duplicado se rechaza con referencia al documento existente; la correccion ocurre sobre ese registro o despues de enviarlo a papelera. La respuesta OCR cruda y las correcciones conservan trazabilidad, pero consultas y exportaciones usan datos normalizados revisados.
- **Alternativas:** Esquema minimo fijo o estructura extensible para impuestos.
- **Revision futura:** Validar con el corpus y asesoramiento contable antes de cerrar migraciones de M5.

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

- **Estado:** Aceptada.
- **Fecha:** 2026-08-26.
- **Contexto:** La demo contiene un sistema visual util, pero tambien supuestos incompatibles con produccion.
- **Decision:** Crear el tag inmutable `prototype-v0.1.0` sobre el commit `82185e7ff03c57e0f6c432424cee60be86b95603` y reemplazar la raiz de `main` con el scaffold Next.js. No mantener una copia duplicada en una carpeta o rama activa.
- **Consecuencias:** El prototipo queda reproducible por tag e historial; `main` representa desde M1 la aplicacion productiva. Los patrones visuales se migran selectivamente, sin copiar persistencia o IA simuladas.
- **Alternativas:** Rama `prototype`, carpeta `prototype/` o reemplazo con referencia en tags.
- **Revision futura:** No prevista; crear un nuevo tag si se necesita congelar otra etapa demostrable.

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

### DEC-026 - Registro, contrasenas e invitaciones de M2

- **Estado:** Aceptada.
- **Fecha:** 2026-08-28.
- **Contexto:** M2 requiere acceso simple sin depender de la entrega de confirmaciones de Supabase, pero las invitaciones deben limitar escalamiento y fuga de secretos.
- **Decision:** Usar email y contrasena con registro inmediato, sin confirmacion de casilla. Exigir al menos 8 caracteres, mayuscula, minuscula y numero, sin maximo definido por RECIA, y ofrecer recuperacion por email. Las invitaciones son enlaces bearer manuales de 256 bits, hasheados en base, de un solo uso y con 7 dias de validez. El fragmento URL no llega al servidor ni al referrer y se captura en cookie `HttpOnly`. El email de la cuenta debe coincidir con el indicado, aunque no prueba control de la casilla. Una invitacion solo otorga operador o solo lectura; administrador requiere promocion posterior.
- **Consecuencias:** El registro y onboarding son mas simples. Quien obtenga el enlace y registre el email indicado puede aceptar la invitacion, por lo que debe compartirse como secreto. No incluir tokens en logs, mensajes publicos o herramientas de analitica.
- **Alternativas:** Confirmacion obligatoria, OTP al aceptar o alta exclusiva de usuarios existentes.
- **Revision futura:** Reconsiderar confirmacion u OTP al incorporar un proveedor transaccional confiable (`DEC-022`).

### DEC-027 - Propiedad y eliminacion en M2

- **Estado:** Aceptada.
- **Fecha:** 2026-08-28.
- **Contexto:** Se necesitan invariantes de propiedad y opciones de borrado antes de almacenar documentos.
- **Decision:** Cada organizacion tiene exactamente un propietario activo. La transferencia es atomica y el propietario no puede abandonar la organizacion sin transferir. El propietario puede eliminar inmediatamente una organizacion escribiendo su nombre exacto. Una cuenta solo puede eliminarse despues de transferir o borrar todas sus organizaciones y revalidar su contrasena. Los RPC destructivos son ejecutables unicamente por `service_role` mediante `SUPABASE_SECRET_KEY` server-only; PostgreSQL vuelve a validar al solicitante.
- **Consecuencias:** En M2 el borrado elimina perfil, membresias, organizacion e invitaciones. Ningun JWT de usuario puede invocar directamente los RPC destructivos. Esta decision no define retencion ni borrado de documentos futuros, que siguen pendientes en `DEC-021`.
- **Alternativas:** Soft delete, espera de 7 dias o solicitud administrativa.
- **Revision futura:** Reemplazar el borrado inmediato cuando M3 introduzca documentos sujetos a retencion y backups.

### DEC-028 - Topes tecnicos antiabuso de M2

- **Estado:** Aceptada.
- **Fecha:** 2026-08-28.
- **Contexto:** Los RPC autenticados pueden invocarse fuera de la interfaz y necesitan limites transaccionales antes de definir planes comerciales.
- **Decision:** Limitar a 10 organizaciones activas por propietario y 30 invitaciones creadas por organizacion durante una hora. Aplicar los topes en triggers PostgreSQL serializados por advisory locks.
- **Consecuencias:** Los limites no representan planes ni precios y no resuelven `DEC-020`; evitan crecimiento automatizado basico aun llamando Data API directamente.
- **Alternativas:** Limites solo en Next.js, rate limiting externo o ausencia de topes hasta M7.
- **Revision futura:** Ajustar junto con planes, telemetria y costos operativos.

## Decisiones reemplazadas

No hay decisiones reemplazadas en este snapshot.
