import Photo from "@/components/Photo";

/**
 * One room of the walkthrough: a large lead image, up to two smaller
 * supporting shots, and a short paragraph. Single-photo rooms get the
 * full width rather than padding the row out.
 */
export default function RoomSection({ title, spec, lead, supporting = [], paragraph, onOpen }) {
  const single = supporting.length === 0;

  return (
    <div className="grid md:grid-cols-12 gap-6 md:gap-10">
      <div className={single ? "md:col-span-12" : "md:col-span-8"}>
        <Photo
          src={lead.src}
          alt={lead.alt}
          caption={lead.caption}
          onClick={() => onOpen(lead.index)}
          imgClassName="block w-full aspect-[16/9]"
        />
      </div>

      {!single && (
        <div className="md:col-span-4 flex flex-col">
          <h2 className="text-3xl md:text-4xl text-ink">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{spec}</p>
          <div className="hairline mt-5" />
          <p className="mt-5 text-ink-soft leading-relaxed">{paragraph}</p>
        </div>
      )}

      {single && (
        <div className="md:col-span-12 mt-2">
          <h2 className="text-3xl md:text-4xl text-ink">{title}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{spec}</p>
          <div className="hairline mt-5" />
          <p className="mt-5 max-w-3xl text-ink-soft leading-relaxed">{paragraph}</p>
        </div>
      )}

      {supporting.length > 0 && (
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
      )}
    </div>
  );
}