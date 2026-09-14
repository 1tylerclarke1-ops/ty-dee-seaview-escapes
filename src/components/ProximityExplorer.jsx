import { useState } from "react";
import AreaMap, { SPOTS } from "@/components/AreaMap";

export default function ProximityExplorer() {
  const [active, setActive] = useState(SPOTS[0]);

  return (
    <div className="grid md:grid-cols-12 gap-8">
      {/* Map */}
      <div className="md:col-span-7">
        <div className="h-[420px] md:h-[560px] border border-cornish-slate/20 overflow-hidden">
          <AreaMap active={active} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[0.6rem] tracking-[0.15em] uppercase text-cornish-slate">
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-gorse inline-block" /> Ty Dee
          </span>
          <span className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-atlantic inline-block" /> Local spot
          </span>
          <span className="flex items-center gap-2">
            <span className="w-5 h-0.5 bg-gorse inline-block" style={{ backgroundImage: "repeating-linear-gradient(90deg,#D4AF37 0,#D4AF37 4px,transparent 4px,transparent 8px)" }} />
            South West Coast Path
          </span>
        </div>
      </div>

      {/* Proximity list */}
      <div className="md:col-span-5">
        <div className="border-t border-cornish-slate/20">
          {SPOTS.map((spot) => {
            const isActive = active && active.id === spot.id;
            return (
              <button
                key={spot.id}
                onClick={() => setActive(spot)}
                className={`w-full text-left grid grid-cols-12 gap-3 py-5 border-b border-cornish-slate/15 transition-colors min-h-[44px] ${
                  isActive ? "bg-gorse/10" : "hover:bg-cornish-slate/5"
                }`}
              >
                <div className="col-span-2 flex items-start pt-1">
                  <span
                    className={`w-2.5 h-2.5 rounded-full mt-1 ${
                      spot.isCaravan ? "bg-gorse" : isActive ? "bg-gorse" : "bg-atlantic"
                    }`}
                  />
                </div>
                <div className="col-span-7">
                  <p className={`font-display text-xl md:text-2xl leading-tight ${isActive ? "text-atlantic" : "text-atlantic"}`}>
                    {spot.name}
                  </p>
                  <p className="font-mono text-[0.6rem] tracking-[0.15em] uppercase text-cornish-slate mt-1">
                    {spot.category}
                  </p>
                </div>
                <div className="col-span-3 text-right">
                  <p className="font-mono text-xs text-atlantic">{spot.drive}</p>
                  {spot.walk !== "—" && (
                    <p className="font-mono text-[0.6rem] text-cornish-slate mt-1">{spot.walk} walk</p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <p className="font-mono text-[0.6rem] tracking-[0.1em] text-cornish-slate/60 mt-4">
          Distances are approximate, by road. Tap any spot to centre the map.
        </p>
      </div>
    </div>
  );
}