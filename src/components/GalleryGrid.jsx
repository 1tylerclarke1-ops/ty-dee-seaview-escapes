import Photo from "@/components/Photo";

/**
 * Deliberately uneven gallery grid — mixes 2×2 tiles with 1×1 tiles.
 * grid-flow-dense packs them without gaps. Captions live in the lightbox,
 * not under the tiles, so the grid stays tight.
 */
export default function GalleryGrid({ photos, onOpen }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[160px] md:auto-rows-[220px] gap-3 grid-flow-dense">
      {photos.map((p, i) => {
        const big = i % 3 === 0;
        return (
          <div key={p.id} className={big ? "col-span-2 row-span-2" : "col-span-1 row-span-1"}>
            <Photo
              src={p.src}
              alt={p.alt}
              onClick={() => onOpen(p.index)}
              className="h-full"
              imgClassName="block w-full h-full"
            />
          </div>
        );
      })}
    </div>
  );
}