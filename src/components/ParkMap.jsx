import { useEffect, useState } from "react";
import { Image } from "@/components/ui/image";
import MapZoom from "@/components/MapZoom";
import MapPin from "@/components/MapPin";

// Park site map with a teardrop pin over pitch 157.
// Touch devices (phones, tablets — pointer: coarse) render a static map so the
// browser's native pinch-zoom works. Desktop (fine pointer) keeps the
// tap-to-open fullscreen zoom viewer.
// NOTE: markerPos is estimated from the park map — verify against the printed
// map and adjust if the marker sits off pitch 157.
export default function ParkMap({
  src,
  alt,
  caption,
  credit,
  markerPos = { top: 38, left: 63 },
  mobileMarkerPos,
}) {
  const [open, setOpen] = useState(false);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setCoarse(mq.matches);
    update();
    mq.addEventListener?.("change", update);
    return () => mq.removeEventListener?.("change", update);
  }, []);

  const pos = coarse && mobileMarkerPos ? mobileMarkerPos : markerPos;
  const pin = (
    <span
      className="pointer-events-none absolute z-10"
      style={{
        top: `${pos.top}%`,
        left: `${pos.left}%`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <MapPin className="w-5 h-auto md:w-7" />
    </span>
  );

  const mapImage = (
    <div className="relative block w-full bg-surface">
      <Image src={src} alt={alt} fittingType="fit" className="block w-full aspect-[1107/767]" />
      {pin}
    </div>
  );

  return (
    <div className="block w-full">
      {coarse ? (
        mapImage
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open park map to zoom"
          className="group block w-full p-0 m-0 border-0 bg-transparent text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-sea focus-visible:ring-offset-2 focus-visible:ring-offset-base"
        >
          {mapImage}
        </button>
      )}
      {caption && <p className="mt-3 text-sm text-muted-foreground">{caption}</p>}
      {!coarse && open && (
        <MapZoom
          src={src}
          alt={alt}
          credit={credit}
          markerPos={markerPos}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}