import Image from "next/image";

type Props = {
  src: string | null;
  alt: string;
  className?: string;
  sizes?: string;
};

// Si no hay foto todavía, un marcador neutro -- nunca un ícono de imagen
// rota ni un hueco en el layout. Las tarjetas se ven bien con o sin foto.
export function PlaceholderImage({ src, alt, className = "", sizes }: Props) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${className}`}
      >
        <svg
          viewBox="0 0 24 24"
          className="h-8 w-8 text-slate-300 dark:text-slate-600"
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
      fill
      sizes={sizes ?? "(min-width: 768px) 33vw, 100vw"}
      className={`object-cover ${className}`}
    />
  );
}
