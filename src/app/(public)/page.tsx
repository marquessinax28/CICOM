import type { Metadata } from "next";
import Link from "next/link";
import { getEdicionActual } from "@/lib/queries/ediciones";
import { getModulos } from "@/lib/queries/modulos";
import { getConcursos } from "@/lib/queries/concursos";
import { getCursosTalleres } from "@/lib/queries/cursos-talleres";
import { getSedes } from "@/lib/queries/sedes";
import { getPatrocinadores } from "@/lib/queries/patrocinadores";
import { PlaceholderImage } from "@/components/PlaceholderImage";

export const metadata: Metadata = {
  description:
    "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca. Módulos, concursos, sedes e inscripción.",
};

const ESTADO_TEXTO: Record<string, string> = {
  proximo: "Próximamente",
  en_curso: "En curso",
  finalizado: "Edición finalizada",
};

const LARGO_EXTRACTO = 220;

function extracto(texto: string, largo = LARGO_EXTRACTO): { corto: string; truncado: boolean } {
  if (texto.length <= largo) return { corto: texto, truncado: false };
  return { corto: texto.slice(0, largo).trimEnd() + "…", truncado: true };
}

export default async function HomePage() {
  const [edicion, modulos, concursos, cursosTalleres, sedes, patrocinadores] = await Promise.all([
    getEdicionActual(),
    getModulos(),
    getConcursos(),
    getCursosTalleres(),
    getSedes(),
    getPatrocinadores(),
  ]);

  const modulosDestacados = modulos.slice(0, 8);
  const homenajeadoBio = edicion?.homenajeado_bio ? extracto(edicion.homenajeado_bio) : null;

  return (
    <div>
      {/* Hero: edición, fechas, estado, lema */}
      <section className="border-b border-slate-200 bg-navy text-white">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {edicion?.nombre ?? "CICOM — Ciclo de Conferencias Médicas"}
          </h1>
          <div className="mt-4 h-0.5 w-16 bg-dorado" />
          {edicion?.lema && (
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{edicion.lema}</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-300">
            <span className="rounded-full border border-slate-700 px-3 py-1">
              {edicion?.estado ? (ESTADO_TEXTO[edicion.estado] ?? edicion.estado) : "Estado por confirmar"}
            </span>
            <span className="rounded-full border border-slate-700 px-3 py-1">
              {edicion?.fecha_inicio && edicion?.fecha_fin
                ? `${new Date(edicion.fecha_inicio).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                  })} – ${new Date(edicion.fecha_fin).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}`
                : "Fechas por confirmar"}
            </span>
          </div>
        </div>
      </section>

      {/* Profesor(a) homenajeado(a) */}
      <Section title="Profesor(a) homenajeado(a)">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full">
            <PlaceholderImage
              src={edicion?.homenajeado_foto_home_url ?? null}
              alt={edicion?.homenajeado_nombre ?? "Profesor(a) homenajeado(a)"}
              sizes="160px"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              {edicion?.homenajeado_nombre ?? "Por anunciar"}
            </h3>
            <p className="mt-2 max-w-2xl text-slate-600">
              {homenajeadoBio ? homenajeadoBio.corto : "Biografía próximamente."}
            </p>
            <Link
              href="/homenajeado"
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
            >
              Ver más...
            </Link>
          </div>
        </div>
      </Section>

      {/* Mensaje de bienvenida */}
      <Section title="Mensaje de bienvenida" tono="alterno">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <div className="relative h-40 w-40 shrink-0 overflow-hidden rounded-full">
            <PlaceholderImage
              src={edicion?.bienvenida_autor_foto_url ?? null}
              alt={edicion?.bienvenida_autor_nombre ?? "Mensaje de bienvenida"}
              sizes="160px"
            />
          </div>
          <div>
            <h3 className="text-xl font-semibold">
              {edicion?.bienvenida_autor_nombre ?? "Por anunciar"}
            </h3>
            {edicion?.bienvenida_mensaje ? (
              <details className="mt-2 max-w-2xl text-slate-600">
                <summary className="cursor-pointer list-none text-slate-600 [&::-webkit-details-marker]:hidden">
                  {extracto(edicion.bienvenida_mensaje).corto}{" "}
                  {extracto(edicion.bienvenida_mensaje).truncado && (
                    <span className="font-medium text-slate-900 underline underline-offset-4">
                      Ver más...
                    </span>
                  )}
                </summary>
                <p className="mt-2 whitespace-pre-line">{edicion.bienvenida_mensaje}</p>
              </details>
            ) : (
              <p className="mt-2 max-w-2xl text-slate-600">
                Mensaje próximamente.
              </p>
            )}
          </div>
        </div>
      </Section>

      {/* Módulos */}
      <Section title="Módulos">
        {modulosDestacados.length === 0 ? (
          <EstadoVacio texto="Los módulos se publicarán próximamente." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {modulosDestacados.map((modulo) => (
                <TarjetaRecurso
                  key={modulo.id}
                  nombre={modulo.nombre}
                  subtitulo={modulo.especialidad !== modulo.nombre ? modulo.especialidad : null}
                  href={modulo.archivo_pdf_url}
                  icono={modulo.icono_url}
                />
              ))}
            </div>
            {modulos.length > modulosDestacados.length && (
              <Link
                href="/programas"
                className="mt-6 inline-block text-sm font-medium text-slate-900 underline underline-offset-4"
              >
                Ver los {modulos.length} módulos
              </Link>
            )}
          </>
        )}
      </Section>

      {/* Concursos */}
      <Section title="Concursos" tono="alterno">
        {concursos.length === 0 ? (
          <EstadoVacio texto="Los concursos se publicarán próximamente." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-3">
            {concursos.map((concurso) => (
              <Link
                key={concurso.id}
                href={`/concursos/${concurso.slug}`}
                className="rounded-xl border border-slate-200 p-5 transition-colors hover:border-slate-400"
              >
                <div className="relative mb-3 h-10 w-10 overflow-hidden rounded-lg">
                  <PlaceholderImage src={concurso.icono_url} alt="" sizes="40px" />
                </div>
                <h3 className="font-semibold">{concurso.nombre}</h3>
                {concurso.categoria_tags && concurso.categoria_tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {concurso.categoria_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {concurso.descripcion && (
                  <p className="mt-2 text-sm text-slate-600">
                    {concurso.descripcion}
                  </p>
                )}
              </Link>
            ))}
          </div>
        )}
      </Section>

      {/* Cursos y talleres */}
      <Section title="Cursos y talleres">
        {cursosTalleres.length === 0 ? (
          <EstadoVacio texto="Los cursos y talleres se publicarán próximamente." />
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {cursosTalleres.map((curso) => (
              <TarjetaRecurso
                key={curso.id}
                nombre={curso.nombre}
                href={curso.archivo_url}
                icono={curso.icono_url}
              />
            ))}
          </div>
        )}
      </Section>

      {/* Sedes */}
      <Section title="Sedes" tono="alterno">
        {sedes.length === 0 ? (
          <EstadoVacio texto="Las sedes se publicarán próximamente." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            {sedes.map((sede) => (
              <div key={sede.id} className="overflow-hidden rounded-xl border border-slate-200">
                <div className="relative aspect-video">
                  <PlaceholderImage
                    src={sede.imagen_url}
                    alt={sede.nombre}
                    sizes="(min-width: 768px) 25vw, (min-width: 640px) 50vw, 100vw"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold">{sede.nombre}</h3>
                  {sede.direccion && (
                    <p className="mt-1 text-sm text-slate-600">{sede.direccion}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Patrocinadores */}
      <Section title="Patrocinadores">
        {patrocinadores.length === 0 ? (
          <EstadoVacio texto="Los patrocinadores se anunciarán próximamente." />
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            {patrocinadores.map((patrocinador) => {
              const logo = (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg">
                  <PlaceholderImage src={patrocinador.logo_url} alt={patrocinador.nombre} sizes="64px" />
                </div>
              );
              return patrocinador.link_externo ? (
                <a
                  key={patrocinador.id}
                  href={patrocinador.link_externo}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={patrocinador.nombre}
                >
                  {logo}
                </a>
              ) : (
                <div key={patrocinador.id} title={patrocinador.nombre}>
                  {logo}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({
  title,
  tono = "base",
  children,
}: {
  title: string;
  tono?: "base" | "alterno";
  children: React.ReactNode;
}) {
  return (
    <section className={tono === "alterno" ? "bg-slate-50" : ""}>
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
      {texto}
    </p>
  );
}

function TarjetaRecurso({
  nombre,
  subtitulo,
  href,
  icono,
}: {
  nombre: string;
  subtitulo?: string | null;
  href?: string | null;
  icono?: string | null;
}) {
  const contenido = (
    <>
      <div className="relative mb-3 h-10 w-10 overflow-hidden rounded-lg">
        <PlaceholderImage src={icono ?? null} alt="" sizes="40px" />
      </div>
      <h3 className="text-sm font-semibold leading-snug">{nombre}</h3>
      {subtitulo && <p className="mt-1 text-xs text-slate-500">{subtitulo}</p>}
      {!href && (
        <p className="mt-2 text-xs italic text-slate-400">Archivo próximamente</p>
      )}
    </>
  );

  const clases =
    "block rounded-xl border border-slate-200 p-4 transition-colors";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${clases} hover:border-slate-400`}
      >
        {contenido}
      </a>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
