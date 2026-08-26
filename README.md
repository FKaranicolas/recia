# RECIA

> Estado: prototipo funcional. El OCR y la persistencia remota todavia estan simulados.

## Que es RECIA

RECIA es un producto en desarrollo para que PyMEs argentinas puedan cargar comprobantes, extraer sus datos fiscales, revisarlos, conservar los archivos originales y exportar la informacion para su uso administrativo.

Este repositorio contiene actualmente la demo que valida el flujo de usuario y la interfaz. No contiene todavia la aplicacion SaaS productiva.

## Estado actual del repositorio

La demo esta implementada con HTML, CSS y JavaScript vanilla. Permite:

- Capturar o seleccionar una imagen.
- Simular la extraccion de datos de un comprobante.
- Revisar y editar los datos generados.
- Guardar, buscar, filtrar y eliminar comprobantes en el navegador.
- Consultar un dashboard con metricas locales.
- Cargar trece comprobantes ficticios en la primera ejecucion.

La extraccion de `js/ai.js` no analiza el archivo: genera valores aleatorios. Los comprobantes se guardan en `localStorage` y, cuando no esta disponible, en memoria volatil.

## Objetivo de V1

La primera version productiva sera un SaaS publico para PyMEs argentinas, construido con Next.js y TypeScript, desplegado en Vercel y respaldado por Supabase Auth, PostgreSQL y Storage privado.

La V1 incorporara organizaciones con varios usuarios, roles, aislamiento multi-tenant mediante Row Level Security (RLS), procesamiento OCR real, revision humana, archivo documental y exportaciones.

### Incluido en V1

- Registro publico con prueba limitada.
- Organizaciones, membresias y roles.
- Carga de PDF, JPG, PNG y HEIC.
- Conservacion inmutable del documento original.
- Extraccion OCR/IA ejecutada en el servidor.
- Procesamiento asincrono con estados, reintentos e idempotencia.
- Revision y correccion humana.
- Busqueda, filtros, descarga y auditoria.
- Exportacion server-side a CSV y XLSX.
- Activacion y cobro manual de planes.
- Ambientes separados de desarrollo, staging y produccion.

### Fuera de alcance de V1

- Integracion con ARCA.
- Integraciones con Tango, Xubio u otros sistemas contables.
- Ingesta de comprobantes por email.
- Aplicacion movil nativa.
- Billing recurrente automatizado.
- Contabilizacion automatica sin revision humana.

## Instalacion de la demo actual

### Requisitos

- Git.
- Un navegador moderno.
- Python 3 u otro servidor HTTP estatico.
- Node.js solamente para generar el HTML standalone.

```bash
git clone https://github.com/FKaranicolas/recia.git
cd recia
```

La interfaz usa Google Fonts y necesita conexion para descargarlas. La logica de la demo no consume servicios externos.

## Ejecucion

En Linux o macOS:

```bash
python3 -m http.server 8000
```

En Windows:

```powershell
py -m http.server 8000
```

Abrir `http://localhost:8000/#/dashboard`.

Rutas disponibles:

- `#/dashboard`
- `#/nuevo`
- `#/comprobantes`

Para generar una version con el CSS y JavaScript embebidos:

```bash
node build.js
```

El resultado es `recia-standalone.html`. Este script concatena archivos; no compila ni transpila el codigo.

## Pruebas

El repositorio no tiene una suite de tests automatizados ni un comando `npm test`.

### Smoke test manual

1. Abrir `#/dashboard` y verificar que la primera ejecucion muestre los datos ficticios.
2. Ir a `#/nuevo` y seleccionar una imagen ficticia o no sensible que el navegador pueda decodificar. No usar comprobantes reales en esta demo.
3. Procesarla y comprobar que se muestra un resultado simulado.
4. Corregir campos y guardar el comprobante.
5. Buscarlo, filtrarlo, editarlo y abrir su detalle.
6. Recargar la pagina y verificar la persistencia cuando el driver indicado sea `localStorage`.
7. Eliminar el comprobante.
8. Ejecutar `node build.js` y comprobar que se genera `recia-standalone.html`.

Para restablecer los datos demo, ejecutar en la consola del navegador:

```js
localStorage.removeItem('recia.receipts.v1');
localStorage.removeItem('recia.seeded.v1');
location.reload();
```

## Arquitectura actual y objetivo

| Area | Demo actual | Objetivo V1 |
|---|---|---|
| Frontend | HTML, CSS y JavaScript vanilla | Next.js App Router y TypeScript |
| Hosting | Sin configuracion | Vercel |
| Autenticacion | No existe | Supabase Auth |
| Datos | `localStorage` o memoria | Supabase PostgreSQL |
| Archivos | Data URL local comprimida | Supabase Storage privado |
| Multi-tenancy | No existe | Organizaciones, roles y RLS |
| OCR | Valores aleatorios | Proveedor elegido mediante benchmark |
| Formatos | Imagenes decodificables por el navegador | PDF, JPG, PNG y HEIC |
| Exportaciones | No existen | CSV y XLSX server-side |
| Tests y CI | No existen | Suite automatizada y CI |

La demo tampoco expone una API HTTP. El endpoint `/api/process-receipt` que aparece en `js/ai.js` es solamente pseudocodigo comentado.

## Limitaciones conocidas

- El archivo subido no se utiliza para producir la extraccion.
- No hay usuarios, permisos ni aislamiento entre empresas.
- El almacenamiento local puede perder datos o quedarse sin espacio.
- El original se convierte a JPEG comprimido; PDF no esta soportado y HEIC no esta garantizado.
- No hay exportaciones, auditoria, backups ni recuperacion.
- Los importes con punto decimal pueden ser interpretados incorrectamente.
- Las notas de credito se suman como gastos positivos.
- La metrica de precision representa confianza simulada, no precision medida.
- No existen limites robustos para los archivos cargados.

## Documentacion del proyecto

- [Hoja de ruta de implementacion](docs/ROADMAP.md)
- [Registro de decisiones](docs/DECISIONS.md)
- [Contexto y relevo operativo](docs/HANDOFF.md)

## Licencia

El repositorio todavia no tiene una licencia definida. Hasta incorporar un archivo `LICENSE`, no debe asumirse ningun permiso de reutilizacion o distribucion.
