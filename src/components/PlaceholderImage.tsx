import Image from "next/image";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
};

// Si no hay foto todavía, un marcador neutro -- nunca un ícono de imagen
// rota ni un hueco en el layout. Las tarjetas se ven bien con o sin foto.
//
// Nota: next/image con `fill` inyecta sus estilos de posicionamiento
// (position:absolute, height:100%, etc.) como atributo style inline, sin
// nonce -- la CSP del sitio los bloquea (confirmado con un navegador real:
// la imagen quedaba con position:static, mal encajada). Por eso aquí se usa
// tamaño fijo + clases de Tailwind para llenar el contenedor, nunca `fill`.
export function PlaceholderImage({ src, alt, className = "", sizes }: Props) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-white/5 ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-slate-500"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
          <path d="M21 15l-5-5-9 9" />
        </svg>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={400}
      height={400}
      sizes={sizes ?? "(min-width: 768px) 33vw, 100vw"}
      className={`h-full w-full object-cover ${className}`}
    />
  );
}
