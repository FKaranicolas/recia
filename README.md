# RECIA

> Estado: M2 completado. Auth, organizaciones, roles y RLS estan desplegados; documentos y OCR todavia no existen.

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
- RLS y RPC protegidas, con 44 assertions PostgreSQL de esquema, aislamiento, permisos y cuotas.
- Tope de 10 organizaciones aplicado tanto al crear como al transferir, e invariante de propietario unico tambien frente a inserts privilegiados.
- Eliminacion inmediata y server-only: la organizacion exige su nombre exacto y la cuenta tambien reautenticacion.

Limitaciones conocidas antes de M3:

- La produccion publica usa transitoriamente el proyecto remoto `recia-dev`.
- `DEC-021` bloquea comprobantes reales hasta definir retencion, borrado y backups.

M3 sigue siendo el proximo hito de producto. El gate de endurecimiento pre-M3 esta cubierto en codigo y pruebas; resta separar el ambiente remoto y resolver `DEC-021`.

Todavia no estan implementados:

- Carga y archivo de documentos.
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

Crear `.env.local` a partir de `.env.example` y completar los valores locales impresos por Supabase. La clave `SUPABASE_SECRET_KEY` es server-only y solo se necesita para eliminaciones; nunca debe exponerse al navegador. Los emails locales se inspeccionan en `http://localhost:54324`.

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

## Estructura

```text
.github/workflows/ci.yml  Verificaciones de integracion continua
docs/                     Roadmap, decisiones y handoff
src/app/                  App Router, estilos y pruebas
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
