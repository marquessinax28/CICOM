import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  crearClienteAdminSupabase,
  verificarSesionAdmin,
  NOMBRE_COOKIE_SESION_ADMIN,
} from "@/lib/admin/sesion-nucleo";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Gate rápido para /admin (salvo /admin/login, que es la página pública
  // de acceso): mejor UX (redirige antes de renderizar nada), pero NO es la
  // única verificación -- src/app/admin/(protegido)/layout.tsx vuelve a
  // comprobar la sesión de forma independiente, porque la propia
  // documentación de Next.js advierte que un cambio futuro al matcher de
  // proxy podría dejar una ruta descubierta sin que nadie lo note.
  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const token = request.cookies.get(NOMBRE_COOKIE_SESION_ADMIN)?.value;
    const supabase = crearClienteAdminSupabase();
    const sesion = await verificarSesionAdmin(supabase, token);
    if (!sesion) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");

  // El webpack dev server de Next.js aplica sus actualizaciones en caliente
  // (Fast Refresh) con eval(), lo que la CSP de producción bloquea. Bloqueado
  // a medias, una edición puede dejar la pestaña con estilos/JS a medio
  // aplicar hasta un refresh manual -- por eso 'unsafe-eval' se permite SOLO
  // en desarrollo. En producción no existe ese servidor de HMR, así que la
  // política real (la que protege a los visitantes) nunca lleva 'unsafe-eval'.
  const scriptSrcDev = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

  const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'${scriptSrcDev} https://js.stripe.com https://challenges.cloudflare.com`,
    // 'unsafe-hashes' + este hash exacto: next/image inyecta
    // style="color:transparent" en TODO <img> que renderiza (no hay forma de
    // ponerle nonce, es interno de Next.js). Sin esto, cada imagen del sitio
    // viola la CSP -- confirmado con un navegador real via
    // securitypolicyviolation. El hash solo permite ese string literal
    // exacto, no abre la puerta a estilos inline arbitrarios como
    // 'unsafe-inline' lo haría.
    `style-src 'self' 'nonce-${nonce}' 'unsafe-hashes' 'sha256-zlqnbDt84zf1iSefLU/ImC54isoprH/MRiVZGskwexk='`,
    "img-src 'self' data: blob: https://*.supabase.co",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co https://api.stripe.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://challenges.cloudflare.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", contentSecurityPolicy);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicy);

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
