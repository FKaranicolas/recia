# RECIA

> Estado: M2 completado y M3 en curso. Auth, organizaciones, roles y RLS estan desplegados; la ingesta documental esta implementada y en revision, pendiente del gate de endurecimiento pre-M3 y del ambiente dedicado. El OCR todavia no existe.

RECIA sera un SaaS para que PyMEs argentinas carguen comprobantes, extraigan datos fiscales, revisen los resultados, conserven los originales y exporten informacion administrativa.

La raiz de `main` contiene la nueva base productiva. El prototipo vanilla anterior permanece disponible en el tag inmutable [`prototype-v0.1.0`](https://github.com/FKaranicolas/recia/tree/prototype-v0.1.0).

## Estado actual

M1 y M2 incorporan:

- Next.js 16 con App Router.
- React 19 y TypeScript estricto.
- ESLint y Vitest con Testing Library.
- Build estatico de la pagina inicial de estado.
- CI informativo en GitHub Actions para aplicacion y base; todavia no bloquea el deployment.
- Despliegue continuo en Vercel: https://recia.vercel.app.
- Supabase Auth con registro inmediato, login, logout y recuperacion de contrasena.
- Organizaciones creadas por RPC con propietario unico, cuatro roles y seleccion activa por URL.
- Invitaciones bearer manuales de 7 dias para operador o solo lectura.
- RLS y RPC protegidas, con 35 assertions PostgreSQL de esquema, aislamiento, permisos y cuotas.
- Eliminacion inmediata y server-only: la organizacion exige su nombre exacto y la cuenta tambien reautenticacion.

M3 agrega, implementado y verificado localmente pero todavia sin desplegar:

- Carga de PDF, JPG, PNG y HEIC mediante URL firmada de subida directa al bucket privado.
- Validacion server-side contra los bytes almacenados: formato real, dimensiones, megapixeles, paginas, PDF cifrado y transferencias truncadas.
- Original inmutable con hash SHA-256 y deduplicacion por organizacion.
- Miniaturas, conversion HEIC y render de la primera pagina del PDF en un bucket separado.
- Descarga del original mediante URL firmada de corta duracion.
- 41 assertions PostgreSQL adicionales de aislamiento e ingesta.

Limitaciones conocidas antes de M3:

- El tope de 10 organizaciones se aplica al crearlas, pero una transferencia puede superarlo.
- La invariante de propietario unico depende del RPC de creacion y de no insertar organizaciones directamente con privilegios.
- La produccion publica usa transitoriamente el proyecto remoto `recia-dev`.
- `DEC-021` bloquea comprobantes reales hasta definir retencion, borrado y backups.

El gate operativo inmediato sigue siendo corregir las dos brechas de organizaciones anteriores y ampliar pgTAP. M3 no debe desplegarse ni crear recursos remotos antes de completar ese gate y separar el ambiente.

Todavia no estan implementados:

- OCR/IA real.
- Exportaciones CSV/XLSX.
- Cobro o planes.

## Requisitos

- Node.js 24 o superior; `.nvmrc` fija `24.20.0`.
- npm `11.19.0` recomendado para reproducibilidad.
- Docker o un runtime compatible para Supabase local.
- Git. El repositorio publico puede clonarse por HTTPS sin configurar una clave SSH.

Las versiones de dependencias quedan fijadas en `package-lock.json`.

## Instalacion

```bash
git clone https://github.com/FKaranicolas/recia.git
cd recia
npm ci
npm run supabase:start
npx supabase status
```

Crear `.env.local` a partir de `.env.example` y completar los valores locales impresos por Supabase. La clave `SUPABASE_SECRET_KEY` es server-only y se necesita para eliminaciones, para limpiar objetos rechazados o huerfanos y para escribir derivados; nunca debe exponerse al navegador. Los emails locales se inspeccionan en `http://localhost:54324`.

## Desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Verificaciones

Ejecutar la cadena de aplicacion:

```bash
npm run verify
```

Verificar tambien una base local limpia; `db:reset` elimina los datos locales:

```bash
npm run supabase:start
npm run db:reset
npm run db:test
npm run supabase:stop
```

Comandos de aplicacion individuales:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Modo interactivo de tests:

```bash
npm run test:watch
```

## Variables de entorno

`.env.example` declara configuracion publica y una clave exclusivamente server-side:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` debe usar la clave nueva `sb_secret_...`, permanecer solo en servidor y gestionarse como Sensitive en Vercel. No agregar claves OCR ni otros secretos con prefijo `NEXT_PUBLIC_`.

## Carga de documentos

Cada organizacion tiene su archivo en `/organizations/[organizationId]/documents`.

- Formatos aceptados: PDF de hasta 20 MB y 10 paginas; JPG, PNG y HEIC de hasta 10 MB y 40 megapixeles.
- El navegador sube el archivo directo a un bucket privado mediante una URL firmada; el servidor vuelve a leer los bytes almacenados y verifica formato real, dimensiones, paginas y cifrado antes de archivarlo.
- El original nunca se modifica: se conserva tal cual, con su hash SHA-256. Miniaturas y conversiones viven en un bucket aparte.
- Un archivo invalido, duplicado o interrumpido no deja registro ni objeto.
- Propietario, administrador y operador pueden cargar; el rol de solo lectura ve y descarga.
- Mientras `DEC-021` siga pendiente, usar unicamente comprobantes ficticios o anonimizados.

Los fixtures de prueba se regeneran con:

```bash
node scripts/generate-document-fixtures.mjs
```

## Estructura

```text
.github/workflows/ci.yml  Verificaciones de integracion continua
docs/                     Roadmap, decisiones, superficie HTTP y handoff
scripts/                  Utilidades de desarrollo
src/app/                  App Router, estilos y pruebas
src/lib/documents/        Limites, validacion y derivados de la ingesta
supabase/                 Configuracion, migraciones y pruebas RLS
.env.example              Contrato de variables Supabase
eslint.config.mjs         Reglas de lint
next.config.ts            Configuracion de Next.js
vitest.config.ts          Configuracion de tests
```

## Despliegue

La aplicacion esta enlazada con Vercel y disponible en https://recia.vercel.app. Cada cambio publicado en `main` genera un deployment de produccion, actualmente sin esperar a que GitHub Actions termine. Las migraciones y `supabase/config.toml` se promueven manualmente. Las variables publicas y `SUPABASE_SECRET_KEY` estan configuradas en Vercel; ningun secreto esta versionado.

## Alcance de V1

- Registro publico con prueba limitada.
- Organizaciones, equipos y roles conservadores.
- PDF, JPG, PNG y HEIC con originales privados.
- OCR server-side elegido mediante benchmark.
- Revision humana y archivo documental.
- CSV y XLSX generados en servidor.
- Activacion y cobro manual.

ARCA, integraciones contables, ingesta por email, app movil nativa, billing automatico y contabilizacion sin revision quedan fuera de V1.

## Documentacion

- [Roadmap](docs/ROADMAP.md)
- [Decisiones](docs/DECISIONS.md)
- [Handoff operativo](docs/HANDOFF.md)
- [Estrategia de Supabase](docs/SUPABASE.md)
- [Superficie HTTP y RPC](docs/API.md)
- [Prompt de relevo](docs/RELAY_PROMPT.md)

## Licencia

El repositorio todavia no tiene una licencia definida. No debe asumirse permiso de reutilizacion o distribucion hasta incorporar un archivo `LICENSE`.
