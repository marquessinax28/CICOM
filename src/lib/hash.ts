import "server-only";

// La implementación real vive en hash-nucleo.ts, SIN este guard -- server-only
// siempre lanza al importarse fuera del bundle de servidor de Next (ver
// node_modules/server-only/index.js), y scripts/reenviar-boleto.ts necesita
// generarPasswordBoleto/hashPasswordBoleto para el camino de rotación de
// contraseña sin pasar por Next. Este archivo sigue siendo el punto de
// entrada para todo el código de Next (import sin cambios en cada lugar que
// ya usaba "@/lib/hash") y conserva el guard para esos casos.
export * from "./hash-nucleo";
