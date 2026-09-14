import Photo from "@/components/Photo";

/**
 * One room of the walkthrough: a large lead image, up to two smaller
 * supporting shots, and a short paragraph.
 *
 * Multi-photo rooms: lead image left (8 cols), title/spec/paragraph right
 * (4 cols), supporting shots in a row beneath.
 *
 * Single-photo rooms (no supporting shots): title, spec and paragraph first,
 * then the lead image full-width beneath — so the photo sits under the room,
 * the same pattern used for the floor plan.
 */
export default function RoomSection({ title, spec, lead, supporting = [], paragraph, onOpen }) {
  if (supporting.length === 0) {
    return (
      <div className="grid md:grid-cols-12 gap-6 md:gap-10">
        <div className="md:col-span-12">
          <h2 className="text-3xl md:text-4xl text-ink">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{spec}</p>
          <div className="hairline mt-5" />
          <p className="mt-5 max-w-3xl text-ink-soft leading-relaxed">{paragraph}</p>
        </div>
        <div className="md:col-span-12">
          <Photo
            src={lead.src}
            alt={lead.alt}
            caption={lead.caption}
            onClick={() => onOpen(lead.index)}
            imgClassName="block w-full aspect-[16/9]"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-12 gap-6 md:gap-10">
      <div className="md:col-span-8">
        <Photo
          src={lead.src}
          alt={lead.alt}
          caption={lead.caption}
          onClick={() => onOpen(lead.index)}
          imgClassName="block w-full aspect-[16/9]"
        />
      </div>

      <div className="md:col-span-4 flex flex-col">
        <h2 className="text-3xl md:text-4xl text-ink">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{spec}</p>
        <div className="hairline mt-5" />
        <p className="mt-5 text-ink-soft leading-relaxed">{paragraph}</p>
      </div>

      <div className="md:col-span-12 grid sm:grid-cols-2 gap-6 md:gap-10 mt-2">
        {supporting.map((p) => (
          <Photo
            key={p.id}
            src={p.src}
            alt={p.alt}
            caption={p.caption}
            onClick={() => onOpen(p.index)}
            imgClassName="block w-full aspect-[4/3]"
          />
        ))}
      </div>
    </div>
  );
}