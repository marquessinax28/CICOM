import type { MetadataRoute } from "next";
import { getConcursos } from "@/lib/queries/concursos";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://leonesporlasalud.com.mx";
  const ahora = new Date();

  const rutasEstaticas: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: ahora, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/programas`, lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/concursos`, lastModified: ahora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${baseUrl}/sedes`, lastModified: ahora, changeFrequency: "monthly", priority: 0.6 },
    { url: `${baseUrl}/contacto`, lastModified: ahora, changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/historico`, lastModified: ahora, changeFrequency: "yearly", priority: 0.4 },
    { url: `${baseUrl}/homenajeado`, lastModified: ahora, changeFrequency: "yearly", priority: 0.5 },
  ];

  const concursos = await getConcursos();
  const rutasConcursos: MetadataRoute.Sitemap = concursos.map((concurso) => ({
    url: `${baseUrl}/concursos/${concurso.slug}`,
    lastModified: ahora,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...rutasEstaticas, ...rutasConcursos];
}
