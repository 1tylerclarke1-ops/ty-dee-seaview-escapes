import { useEffect, useRef, useState } from "react";
import { Image } from "@/components/ui/image";
import { Plus, Minus, X } from "lucide-react";

// Fullscreen pinch-zoom viewer for the park map. Pinch to zoom, drag to pan,
// +/- buttons and mouse wheel for desktop. The pitch marker is overlaid by
// percentage so it tracks the image at any scale.
export default function MapZoom({ src, alt, credit, markerLabel, markerPos, onClose }) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pinch = useRef(null);
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

  const onTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinch.current = { dist: Math.hypot(dx, dy), scale };
    } else if (e.touches.length === 1) {
      drag.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, pos };
    }
  };
  const onTouchMove = (e) => {
    if (pinch.current && e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      setScale(clamp(+(pinch.current.scale * (dist / pinch.current.dist)).toFixed(2)));
    } else if (drag.current && e.touches.length === 1) {
      setPos({
        x: drag.current.pos.x + (e.touches[0].clientX - drag.current.x),
        y: drag.current.pos.y + (e.touches[0].clientY - drag.current.y),
      });
    }
  };
  const onTouchEnd = () => { pinch.current = null; drag.current = null; };
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
        className="flex-1 overflow-hidden relative touch-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
      >
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})` }}
        >
          <div className="relative w-[92%] max-w-[1107px]">
            <Image src={src} alt={alt} fittingType="fit" className="block w-full aspect-[1107/767]" />
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 z-10"
              style={{ top: `${markerPos.top}%`, left: `${markerPos.left}%` }}
            >
              <span className="flex items-center justify-center w-9 h-9 rounded-full bg-sea text-white text-xs font-semibold ring-4 ring-white shadow-lg">
                {markerLabel}
              </span>
            </span>
          </div>
        </div>
      </div>
      {credit && <p className="px-5 pb-5 pt-2 text-center text-xs text-white/40">{credit}</p>}
    </div>
  );
}