import Link from "next/link";

const milestones = [
  {
    code: "M0",
    title: "Prototipo documentado",
    detail: "Flujo y decisiones iniciales preservados en un tag inmutable.",
    state: "Completado",
  },
  {
    code: "M1",
    title: "Base productiva",
    detail: "Next.js, TypeScript, pruebas, CI y despliegue continuo.",
    state: "Completado",
  },
  {
    code: "M2",
    title: "Identidad y organizaciones",
    detail: "Supabase Auth, equipos, roles y aislamiento RLS.",
    state: "En curso",
  },
] as const;

const foundations = [
  ["Framework", "Next.js 16 + React 19"],
  ["Lenguaje", "TypeScript estricto"],
  ["Calidad", "ESLint + Vitest"],
  ["CI", "GitHub Actions"],
] as const;

export default function Home() {
  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#inicio" aria-label="RECIA, ir al inicio">
          <span className="brandMark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>RECIA</strong>
            <small>AI DOCUMENT PROCESSING</small>
          </span>
        </a>
        <div className="topbarActions">
          <Link href="/login">Ingresar</Link>
          <Link className="topbarPrimary" href="/sign-up">
            Crear cuenta
          </Link>
          <span className="buildBadge">
            <span aria-hidden="true" /> M2 EN CURSO
          </span>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="heroCopy">
          <p className="eyebrow">Infraestructura inicial / 2026</p>
          <h1>
            Menos carga manual.
            <br />
            <em>Mas control documental.</em>
          </h1>
          <p className="lead">
            Estamos construyendo la base segura de RECIA para que PyMEs argentinas
            procesen, revisen y archiven sus comprobantes en un solo lugar.
          </p>
          <div className="notice" role="status">
            <strong>Estado actual</strong>
            <span>
              Auth y organizaciones ya tienen una base verificable. El archivo documental
              y el OCR real llegan en los proximos hitos; esta pantalla no procesa documentos.
            </span>
          </div>
        </div>

        <aside className="systemCard" aria-label="Base implementada en M1">
          <div className="systemHead">
            <span>BASE IMPLEMENTADA</span>
            <span>V0.1</span>
          </div>
          <dl>
            {foundations.map(([label, value], index) => (
              <div key={label}>
                <dt>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  {label}
                </dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <p>Supabase Auth y organizaciones avanzan en M2; documentos comienzan en M3.</p>
        </aside>
      </section>

      <section className="roadmap" aria-labelledby="roadmap-title">
        <div className="sectionHead">
          <p className="eyebrow">Ejecucion por hitos</p>
          <h2 id="roadmap-title">Camino a la primera version</h2>
        </div>
        <ol>
          {milestones.map((milestone) => (
            <li key={milestone.code} data-state={milestone.state}>
              <div className="milestoneCode">{milestone.code}</div>
              <div>
                <span className="state">{milestone.state}</span>
                <h3>{milestone.title}</h3>
                <p>{milestone.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer>
        <span>RECIA / BUILD STAGE</span>
        <a href="https://github.com/FKaranicolas/recia/tree/prototype-v0.1.0">
          Ver prototipo preservado
        </a>
      </footer>
    </main>
  );
}
