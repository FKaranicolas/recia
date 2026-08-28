# Prompt de relevo de RECIA

Usar este texto al abrir la conversacion desde el equipo nuevo:

```text
Estoy retomando el desarrollo de RECIA desde un equipo nuevo.

Repositorio: https://github.com/FKaranicolas/recia
Rama: main
Produccion publica: https://recia.vercel.app

Tu primera fase es exclusivamente de verificacion. Clonar el repositorio o
actualizarlo por fast-forward son las unicas modificaciones permitidas. No
edites contenido del proyecto, no apliques migraciones, no cambies variables,
no crees recursos remotos y no inicies trabajo hasta que yo confirme
expresamente que el equipo nuevo esta listo.

1. Abre o clona el repositorio y actualiza main con fast-forward solamente.
2. Verifica `git status`, `git log -1`, remotos y que no haya cambios locales.
3. Lee completos README.md, docs/HANDOFF.md, docs/DECISIONS.md,
   docs/ROADMAP.md, docs/SUPABASE.md, docs/API.md y este archivo.
4. Contrasta la documentacion con package.json, .env.example,
   .github/workflows/ci.yml, supabase/config.toml, migraciones y tests.
5. Verifica herramientas sin instalar ni autenticar nada silenciosamente:
   Node 24.20.0, npm 11.19.0, Git, Docker, Supabase CLI y acceso a GitHub.
6. Comprueba solo los nombres y presencia de variables locales; nunca imprimas
   valores de NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ni SUPABASE_SECRET_KEY.
7. Si existe un enlace Supabase local, informa el project ref y ambiente antes
   de cualquier comando remoto. No ejecutes db push, config push ni borrados.
8. Informa commit actual, diferencias encontradas, herramientas disponibles y
   bloqueos. Luego detente y espera mi confirmacion.

Estado que debes encontrar:

- M0, M1 y M2 estan cerrados; M3 no comenzo.
- El codigo funcional M2 se cerro en 1e8c18a y la primera documentacion final
  en 20b1740. El HEAD puede ser posterior por esta auditoria; origin/main y
  docs/HANDOFF.md son la fuente de verdad.
- CI final de 20b1740: https://github.com/FKaranicolas/recia/actions/runs/33177367678
- Vercel sirve M2 completado y muestra M3 como siguiente.
- Supabase remoto conocido: proyecto recia-dev. No hay secretos versionados.
- El registro es inmediato y no confirma email. Las invitaciones bearer duran
  7 dias y solo otorgan operator o viewer.
- La eliminacion de organizacion exige nombre exacto. La de cuenta exige
  contrasena, ELIMINAR y no poseer organizaciones.

Gate obligatorio antes de M3:

- El tope de 10 organizaciones se aplica al crear, pero una transferencia puede
  dejar al nuevo propietario con mas de 10. Corregirlo y agregar pgTAP.
- La propiedad unica no cubre inserts privilegiados directos en organizations.
  Endurecer esa ruta y agregar una prueba de organizacion huerfana.
- Produccion usa transitoriamente el unico proyecto recia-dev. Separar ambientes
  antes de desplegar M3 o crear recursos remotos del hito; el desarrollo local
  posterior al gate puede usar fixtures ficticios.
- DEC-021 sigue pendiente. No almacenar comprobantes reales; usar solo fixtures
  ficticios o anonimizados hasta definir retencion, borrado y backups.
- Vercel despliega sin esperar CI, main no tiene checks requeridos y las
  migraciones/configuracion remotas son manuales.
- Faltan E2E de navegador, tests de route handlers/server actions y control de
  drift para src/types/database.ts.

Despues de que yo confirme el equipo nuevo, la siguiente tarea es el gate de
endurecimiento pre-M3, no el inicio de M3. M2 permanece cerrado. La tarea debe
cumplir la Definition of Done de
docs/HANDOFF.md, preservar los 35 tests actuales, ejecutar npm run verify y la
suite Supabase limpia, actualizar documentacion y publicar solo con mi permiso.

Restricciones permanentes:

- No reincorporar localStorage ni la IA simulada del tag prototype-v0.1.0.
- No exponer service_role, sb_secret, claves OCR ni documentos en cliente/logs.
- Todo dato tenant debe tener organization_id, RLS y tests negativos.
- No elegir OCR antes del benchmark ni resolver decisiones pendientes por
  suposicion.
- No usar comprobantes fiscales reales hasta resolver DEC-021.
```
