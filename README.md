# RECIA

> Estado: M1 en curso. La base Next.js esta implementada; auth, documentos y OCR todavia no existen.

RECIA sera un SaaS para que PyMEs argentinas carguen comprobantes, extraigan datos fiscales, revisen los resultados, conserven los originales y exporten informacion administrativa.

La raiz de `main` contiene la nueva base productiva. El prototipo vanilla anterior permanece disponible en el tag inmutable [`prototype-v0.1.0`](https://github.com/FKaranicolas/recia/tree/prototype-v0.1.0).

## Estado actual

M1 incorpora:

- Next.js 16 con App Router.
- React 19 y TypeScript estricto.
- ESLint y Vitest con Testing Library.
- Build estatico de la pagina inicial de estado.
- CI en GitHub Actions para lint, typecheck, tests y build.
- Variables publicas de Supabase documentadas sin credenciales reales.

Todavia no estan implementados:

- Registro o autenticacion.
- Organizaciones, membresias, roles o RLS.
- Supabase conectado.
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

Si se necesitan variables de Supabase para un entorno posterior, crear `.env.local` a partir de `.env.example`. M1 no requiere valores para ejecutar la pagina estatica.

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
```

Modo interactivo de tests:

```bash
npm run test:watch
```

## Variables de entorno

`.env.example` declara solamente configuracion publica:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

No agregar `service_role`, claves OCR ni otros secretos con prefijo `NEXT_PUBLIC_`.

## Estructura

```text
.github/workflows/ci.yml  Verificaciones de integracion continua
docs/                     Roadmap, decisiones y handoff
src/app/                  App Router, estilos y pruebas
.env.example              Contrato de configuracion publica
eslint.config.mjs         Reglas de lint
next.config.ts            Configuracion de Next.js
vitest.config.ts          Configuracion de tests
```

## Despliegue

La aplicacion esta preparada para Vercel, pero M1 no se considerara completo hasta enlazar el repositorio, configurar el proyecto y verificar una URL de preview. No se deben cargar secretos reales hasta implementar el manejo correspondiente.

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
