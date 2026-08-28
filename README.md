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
- CI en GitHub Actions para lint, typecheck, tests y build.
- Despliegue continuo en Vercel: https://recia.vercel.app.
- Supabase Auth con registro inmediato, login, logout y recuperacion de contrasena.
- Organizaciones, propietario unico, cuatro roles y seleccion activa por URL.
- Invitaciones bearer manuales de 7 dias para operador o solo lectura.
- RLS y RPC protegidas, con 35 pruebas PostgreSQL de aislamiento y permisos.
- Eliminacion inmediata de organizaciones y cuentas con reautenticacion.

Todavia no estan implementados:

- Carga y archivo de documentos.
- OCR/IA real.
- Exportaciones CSV/XLSX.
- Cobro o planes.

## Requisitos

- Node.js 24 o superior.
- npm 11 o superior.

Las versiones de dependencias quedan fijadas en `package-lock.json`.

## Instalacion

```bash
git clone git@github.com:FKaranicolas/recia.git
cd recia
npm ci
```

Crear `.env.local` a partir de `.env.example`. La clave `SUPABASE_SECRET_KEY` es server-only y solo se necesita para eliminaciones; nunca debe exponerse al navegador.

## Desarrollo

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Verificaciones

Ejecutar toda la cadena local:

```bash
npm run verify
```

Comandos individuales:

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run supabase:start
npm run db:test
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

La aplicacion esta enlazada con Vercel y disponible en https://recia.vercel.app. Cada cambio publicado en `main` genera un deployment de produccion. Las variables publicas y `SUPABASE_SECRET_KEY` estan configuradas por ambiente; ningun secreto esta versionado.

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

## Licencia

El repositorio todavia no tiene una licencia definida. No debe asumirse permiso de reutilizacion o distribucion hasta incorporar un archivo `LICENSE`.
