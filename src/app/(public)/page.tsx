import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getEdicionActual } from "@/lib/queries/ediciones";
import { getModulos } from "@/lib/queries/modulos";
import { getConcursos } from "@/lib/queries/concursos";
import { getCursosTalleres } from "@/lib/queries/cursos-talleres";
import { getPatrocinadores } from "@/lib/queries/patrocinadores";
import { PlaceholderImage } from "@/components/PlaceholderImage";
import { ModulosCarousel } from "@/components/ModulosCarousel";
import { EstadoCongreso } from "@/components/EstadoCongreso";
import { SedesCarousel } from "@/components/SedesCarousel";

export const metadata: Metadata = {
  description:
    "CICOM, Ciclo de Conferencias Médicas del Antiguo Hospital Civil de Guadalajara y el Hospital Civil Nuevo Juan I. Menchaca. Módulos, concursos, sedes e inscripción.",
};

const LARGO_EXTRACTO = 220;

function extracto(texto: string, largo = LARGO_EXTRACTO): { corto: string; truncado: boolean } {
  if (texto.length <= largo) return { corto: texto, truncado: false };
  return { corto: texto.slice(0, largo).trimEnd() + "…", truncado: true };
}

export default async function HomePage() {
  const [edicion, modulos, concursos, cursosTalleres, patrocinadores] = await Promise.all([
    getEdicionActual(),
    getModulos(),
    getConcursos(),
    getCursosTalleres(),
    getPatrocinadores(),
  ]);

  const modulosDestacados = modulos.slice(0, 8);
  const homenajeadoBio = edicion?.homenajeado_bio ? extracto(edicion.homenajeado_bio) : null;

  return (
    <div>
      {/* Hero: edición, fechas, estado, lema */}
      <section className="relative overflow-hidden border-b border-white/10 bg-navy text-white">
        {/* Sin `fill`: Next.js posiciona ese modo con un atributo style inline
            (position/height/width), que nuestra CSP bloquea a propósito (sin
            unsafe-inline). Ancho/alto explícitos + clases de Tailwind logran
            el mismo "cubre todo el hero" sin depender de estilo inline. */}
        <Image
          src="/hero-mural.jpg"
          alt=""
          aria-hidden="true"
          width={2400}
          height={2839}
          priority
          sizes="100vw"
          className="absolute inset-0 h-full w-full object-cover object-center md:object-[50%_20%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy/90 via-navy/80 to-navy/95" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
            {edicion?.nombre ?? "CICOM — Ciclo de Conferencias Médicas"}
          </h1>
          <div className="mt-4 h-0.5 w-16 bg-dorado" />
          {edicion?.lema && (
            <p className="mt-4 max-w-2xl text-lg text-slate-300">{edicion.lema}</p>
          )}
          <div className="mt-6 flex flex-col items-start gap-2 text-lg text-dorado">
            <span>
              {edicion?.fecha_inicio && edicion?.fecha_fin
                ? `${new Date(edicion.fecha_inicio).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    timeZone: "UTC",
                  })} – ${new Date(edicion.fecha_fin).toLocaleDateString("es-MX", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    timeZone: "UTC",
                  })}`
                : "Fechas por confirmar"}
            </span>
            {edicion?.fecha_inicio && edicion?.fecha_fin && (
              <EstadoCongreso fechaInicio={edicion.fecha_inicio} fechaFin={edicion.fecha_fin} />
            )}
          </div>
        </div>
      </section>

      {/* Profesor homenajeado */}
      <SplitFeature
        titulo="Profesor homenajeado"
        subtitulo={edicion?.homenajeado_nombre ?? "Por anunciar"}
        imagenSrc={edicion?.homenajeado_foto_home_url ?? null}
        imagenAlt={edicion?.homenajeado_nombre ?? "Profesor homenajeado"}
        grande
      >
        <p>{homenajeadoBio ? homenajeadoBio.corto : "Biografía próximamente."}</p>
        <Link
          href="/homenajeado"
          className="mt-6 inline-flex items-center gap-1.5 rounded-full bg-dorado px-5 py-2.5 text-sm font-semibold text-navy transition-opacity hover:opacity-90"
        >
          Ver más...
        </Link>
      </SplitFeature>

      {/* Mensaje de bienvenida */}
      <SplitFeature
        titulo="Mensaje de bienvenida"
        subtitulo={edicion?.bienvenida_autor_nombre ?? "Por anunciar"}
        imagenSrc={edicion?.bienvenida_autor_foto_url ?? null}
        imagenAlt={edicion?.bienvenida_autor_nombre ?? "Mensaje de bienvenida"}
        invertido
        grande
      >
        {edicion?.bienvenida_mensaje ? (
          <details>
            <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden">
              {extracto(edicion.bienvenida_mensaje).corto}{" "}
              {extracto(edicion.bienvenida_mensaje).truncado && (
                <span className="font-medium text-dorado underline underline-offset-4">
                  Ver más...
                </span>
              )}
            </summary>
            <p className="mt-2 whitespace-pre-line">{edicion.bienvenida_mensaje}</p>
          </details>
        ) : (
          <p>Mensaje próximamente.</p>
        )}
      </SplitFeature>

      {/* Módulos */}
      <Section title="Módulos">
        {modulosDestacados.length === 0 ? (
          <EstadoVacio texto="Los módulos se publicarán próximamente." />
        ) : (
          <>
            <ModulosCarousel
              items={modulosDestacados.map((modulo) => ({
                id: modulo.id,
                nombre: modulo.nombre,
                subtitulo: modulo.especialidad !== modulo.nombre ? modulo.especialidad : null,
                href: modulo.archivo_pdf_url,
                icono: modulo.icono_url,
              }))}
            />
            {modulos.length > modulosDestacados.length && (
              <Link
                href="/programas"
                className="mt-6 inline-block text-sm font-medium text-dorado underline underline-offset-4"
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
          <div className="grid gap-x-6 gap-y-10 sm:grid-cols-3">
            {concursos.map((concurso) => (
              <Link
                key={concurso.id}
                href={`/concursos/${concurso.slug}`}
                className="group flex flex-col items-center text-center"
              >
                <div className="relative mb-5 h-28 w-28 overflow-hidden rounded-2xl transition-transform group-hover:scale-105 sm:h-32 sm:w-32">
                  <PlaceholderImage src={concurso.icono_url} alt="" sizes="128px" />
                </div>
                <h3 className="text-xl font-bold text-white sm:text-2xl">{concurso.nombre}</h3>
                {concurso.categoria_tags && concurso.categoria_tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap justify-center gap-1.5">
                    {concurso.categoria_tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {concurso.descripcion && (
                  <p className="mt-2 text-sm text-slate-300">
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

      {/* Patrocinadores */}
      <Section title="Patrocinadores" tono="alterno">
        {patrocinadores.length === 0 ? (
          <EstadoVacio texto="Los patrocinadores se anunciarán próximamente." />
        ) : (
          <div className="flex flex-wrap items-center gap-6">
            {patrocinadores.map((patrocinador) => {
              const logo = (
                <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-white/10">
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

      {/* Sedes: carrusel de borde a borde, sin título ni contenedor
          centrado -- las fotos ocupan toda la sección. */}
      <section id="sedes" className="scroll-mt-24">
        <SedesCarousel />
      </section>
    </div>
  );
}

function SplitFeature({
  titulo,
  subtitulo,
  imagenSrc,
  imagenAlt,
  invertido = false,
  grande = false,
  children,
}: {
  titulo: string;
  subtitulo: string;
  imagenSrc: string | null;
  imagenAlt: string;
  invertido?: boolean;
  // +30% sobre el tamaño base, a petición explícita: text-3xl/text-4xl
  // (1.875rem/2.25rem) y el subtítulo (1rem) escalados x1.3.
  grande?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`grid md:grid-cols-2 ${invertido ? "bg-navy-light" : ""}`}>
      <div
        className={`flex flex-col justify-center px-4 py-14 sm:px-8 sm:py-20 lg:px-16 ${
          invertido ? "md:order-2" : ""
        }`}
      >
        <h2
          className={`font-bold tracking-tight text-white ${
            grande ? "text-[2.4375rem] sm:text-[2.925rem]" : "text-3xl sm:text-4xl"
          }`}
        >
          {titulo}
        </h2>
        <p className={`mt-2 font-medium text-dorado ${grande ? "text-[1.3rem]" : ""}`}>{subtitulo}</p>
        <div className="mt-4 max-w-xl text-slate-300">{children}</div>
      </div>
      <div className={`relative min-h-72 md:min-h-[28rem] ${invertido ? "md:order-1" : ""}`}>
        <PlaceholderImage src={imagenSrc} alt={imagenAlt} sizes="(min-width: 768px) 50vw, 100vw" />
      </div>
    </section>
  );
}

function Section({
  title,
  tono = "base",
  id,
  children,
}: {
  title: string;
  tono?: "base" | "alterno";
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={`${id ? "scroll-mt-24" : ""} ${tono === "alterno" ? "border-y border-white/10 bg-navy-light" : ""}`}
    >
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-6 text-2xl font-bold tracking-tight text-white">{title}</h2>
        {children}
      </div>
    </section>
  );
}

function EstadoVacio({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-dashed border-white/20 p-8 text-center text-sm text-slate-400">
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
      <div className="relative mx-auto mb-4 h-14 w-14 overflow-hidden rounded-xl">
        <PlaceholderImage src={icono ?? null} alt="" sizes="56px" />
      </div>
      <h3 className="font-semibold text-white">{nombre}</h3>
      {subtitulo && <p className="mt-1 text-sm text-slate-400">{subtitulo}</p>}
      {!href && (
        <p className="mt-2 text-xs italic text-slate-500">Archivo próximamente</p>
      )}
    </>
  );

  const clases =
    "flex flex-col items-center rounded-2xl border border-white/10 bg-white/5 p-6 text-center transition-colors";

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${clases} hover:border-dorado/40`}
      >
        {contenido}
      </a>
    );
  }

  return <div className={clases}>{contenido}</div>;
}
