"use client";

interface HeroCoverImageProps {
  src: string;
  fallbackSrc: string | null;
  alt: string;
}

export function HeroCoverImage({ src, fallbackSrc, alt }: HeroCoverImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover"
      data-testid="hero-cover"
      onError={(event) => {
        const img = event.currentTarget;
        if (fallbackSrc && img.src !== fallbackSrc) {
          img.src = fallbackSrc;
        }
      }}
    />
  );
}
