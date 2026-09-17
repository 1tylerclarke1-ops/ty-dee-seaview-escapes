import { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import MapPin from "@/components/MapPin";
import { Plus, Minus, X } from "lucide-react";

// Fullscreen pinch-zoom viewer for the park map (desktop only — touch devices
// use the browser's native pinch on the inline map). +/- buttons and mouse
// wheel zoom; drag to pan. The pin marker is overlaid by percentage and
// counter-scaled so it stays a constant size and its tip stays locked on
// pitch 157 at every zoom level.
export default function MapZoom({ src, alt, credit, markerPos, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const clamp = (s) => Math.min(4, Math.max(1, s));
  const zoom = (dir) => {
    setScale((s) => clamp(+(s + dir * 0.4).toFixed(2)));
    setPos({ x: 0, y: 0 });
  };

  const onPointerDown = (e) => {
    drag.current = { x: e.clientX, y: e.clientY, pos };
  };
  const onPointerMove = (e) => {
    if (!drag.current) return;
    setPos({
      x: drag.current.pos.x + (e.clientX - drag.current.x),
      y: drag.current.pos.y + (e.clientY - drag.current.y),
    });
  };
  const onPointerUp = () => { drag.current = null; };
  const onWheel = (e) => zoom(e.deltaY < 0 ? 1 : -1);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0A0E10] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white/70">
        <button type="button" onClick={onClose} aria-label="Close" className="inline-flex items-center gap-2 text-sm min-h-[44px] px-2">
          <X className="w-5 h-5" strokeWidth={1.5} /> Close
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => zoom(-1)} aria-label="Zoom out" className="w-10 h-10 inline-flex items-center justify-center text-white/80 min-h-[44px]">
            <Minus className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <span className="tnum text-xs text-white/50 w-10 text-center">{Math.round(scale * 100)}%</span>
          <button type="button" onClick={() => zoom(1)} aria-label="Zoom in" className="w-10 h-10 inline-flex items-center justify-center text-white/80 min-h-[44px]">
            <Plus className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-hidden relative touch-none cursor-grab active:cursor-grabbing"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        >
          <div className="relative w-[92%] max-w-[1107px]">
            <Image src={src} alt={alt} fittingType="fit" className="block w-full aspect-[1107/767]" />
            <span
              className="pointer-events-none absolute z-10"
              style={{
                top: `${markerPos.top}%`,
                left: `${markerPos.left}%`,
                transform: `translate(-50%, -100%) scale(${1 / scale})`,
              }}
            >
              <MapPin className="w-7 h-auto" />
            </span>
          </div>
        </div>
      </div>
      {credit && <p className="px-5 pb-5 pt-2 text-center text-xs text-white/40">{credit}</p>}
    </div>
  );
}