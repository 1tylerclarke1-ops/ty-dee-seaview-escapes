import { Image } from "@/components/ui/image";

/**
 * Photo — a content photograph with an honest caption.
 * - priority: eager load + fetchpriority="high" (hero only).
 * - imgClassName: literal Tailwind classes sizing the image wrapper
 *   (e.g. "block w-full aspect-[16/9]" or "block w-full h-full").
 * - onClick: when provided, the image is a button that opens the lightbox.
 */
export default function Photo({
  src,
  alt,
  caption,
  priority = false,
  imgClassName = "block w-full aspect-[3/2]",
  fittingType = "fill",
  onClick,
  focalPointX,
  focalPointY,
  className,
}) {
  const image = (
    <Image
      src={src}
      alt={alt}
      fittingType={fittingType}
      focalPointX={focalPointX}
      focalPointY={focalPointY}
      loading={priority ? "eager" : "lazy"}
      {...(priority ? { fetchpriority: "high" } : {})}
      className={imgClassName}
    />
  );

  return (
    <figure className={className}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          aria-label={`Enlarge image: ${alt}`}
          className="group block w-full p-0 m-0 border-0 bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          {image}
        </button>
      ) : (
        image
      )}
      {caption && (
        <figcaption className="mt-3 text-sm leading-snug text-muted-foreground">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}