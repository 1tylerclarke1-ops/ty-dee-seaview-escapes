import { useState } from "react";
import { Image } from "@/components/ui/image";
import MapZoom from "@/components/MapZoom";
import MapPin from "@/components/MapPin";

// Park site map with a marker over pitch 157. Tappable into a fullscreen
// pinch-zoom viewer so the detailed map is readable on a phone. The marker
// is positioned by percentage and scales with the image.
// NOTE: markerPos is estimated from the park map — verify against the printed
// map and adjust if the marker sits off pitch 157.
export default function ParkMap({
  src,
  alt,
  caption,
  credit,
  markerLabel = "157",
  markerPos = { top: 38, left: 63 },
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open park map to zoom"
        className="group block w-full p-0 m-0 border-0 bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-base"
      >
        <div className="relative block w-full bg-surface">
          <Image src={src} alt={alt} fittingType="fit" className="block w-full aspect-[1107/767]" />
          <span
            className="pointer-events-none absolute z-10"
            style={{
              top: `${markerPos.top}%`,
              left: `${markerPos.left}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <MapPin className="w-5 h-auto md:w-7" />
          </span>
        </div>
        {caption && <p className="mt-3 text-sm text-muted-foreground">{caption}</p>}
      </button>
      {open && (
        <MapZoom
          src={src}
          alt={alt}
          credit={credit}
          markerLabel={markerLabel}
          markerPos={markerPos}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}