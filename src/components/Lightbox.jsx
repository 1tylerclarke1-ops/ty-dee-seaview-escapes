import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { Image } from "@/components/ui/image";

/**
 * Full-screen lightbox on a near-black backdrop.
 * Arrow keys + swipe to move, Escape to close, counter "n / total",
 * caption beneath. Focus returns to the triggering element on close.
 */
export default function Lightbox({ photos, index, onClose, onIndex }) {
  const triggerRef = useRef(null);
  const panelRef = useRef(null);
  const touchX = useRef(null);

  // Capture the element that opened this (the clicked photo) and focus the panel.
  useEffect(() => {
    triggerRef.current = document.activeElement;
    panelRef.current?.focus();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") onIndex((index + 1) % photos.length);
      else if (e.key === "ArrowLeft") onIndex((index - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, photos.length, onClose, onIndex]);

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Restore focus to the trigger on close
  useEffect(() => () => { triggerRef.current?.focus?.(); }, []);

  const onTouchStart = (e) => { touchX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchX.current == null) return;
    const dx = e.changedTouches[0].clientX - touchX.current;
    if (dx > 50) onIndex((index - 1 + photos.length) % photos.length);
    else if (dx < -50) onIndex((index + 1) % photos.length);
    touchX.current = null;
  };

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      ref={panelRef}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-label={photo.alt}
      className="fixed inset-0 z-[100] bg-[#0A0E10] flex flex-col"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      <div className="flex items-center justify-between px-5 py-4 text-white/70">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="inline-flex items-center gap-2 text-sm focus:outline-none focus-visible:text-white min-h-[44px] px-2"
        >
          <X className="w-5 h-5" strokeWidth={1.5} />
          Close
        </button>
        <span className="tnum text-sm text-white/70">{index + 1} / {photos.length}</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-2 overflow-hidden">
        <Image
          src={photo.src}
          alt={photo.alt}
          fittingType="fit"
          loading="eager"
          className="block w-full h-full"
        />
      </div>

      {photo.caption && (
        <p className="px-5 pb-6 pt-2 text-center text-sm text-white/80 max-w-3xl mx-auto">
          {photo.caption}
        </p>
      )}

      <button
        type="button"
        onClick={() => onIndex((index - 1 + photos.length) % photos.length)}
        aria-label="Previous image"
        className="absolute left-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-12 h-12 text-white/80 hover:text-white focus:outline-none focus-visible:text-white min-h-[44px] min-w-[44px]"
      >
        <ChevronLeft className="w-8 h-8" strokeWidth={1.25} />
      </button>
      <button
        type="button"
        onClick={() => onIndex((index + 1) % photos.length)}
        aria-label="Next image"
        className="absolute right-1 top-1/2 -translate-y-1/2 inline-flex items-center justify-center w-12 h-12 text-white/80 hover:text-white focus:outline-none focus-visible:text-white min-h-[44px] min-w-[44px]"
      >
        <ChevronRight className="w-8 h-8" strokeWidth={1.25} />
      </button>
    </div>
  );
}