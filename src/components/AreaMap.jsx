import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Approximate coordinates — for orientation only.
export const CARAVAN = [50.3390, -4.5200];

export const SPOTS = [
  {
    id: "caravan",
    name: "Ty Dee · Polperro Holiday Park",
    category: "Your base",
    coords: [50.3390, -4.5200],
    drive: "—",
    walk: "—",
    blurb: "Your caravan, on a quiet elevated pitch between Looe and Polperro.",
    isCaravan: true,
  },
  {
    id: "polperro-harbour",
    name: "Polperro Harbour",
    category: "Harbour",
    coords: [50.3347, -4.5456],
    drive: "1.5 mi · 5 min",
    walk: "25 min",
    blurb: "The working fishing harbour at the heart of the village — boats, crab sandwiches, low-tide walks.",
  },
  {
    id: "polperro-village",
    name: "Polperro Village",
    category: "Village",
    coords: [50.3345, -4.5438],
    drive: "1.5 mi · 5 min",
    walk: "25 min",
    blurb: "Narrow streets, whitewashed cottages, the heritage museum and the old pilchard press.",
  },
  {
    id: "coast-path",
    name: "South West Coast Path",
    category: "Coastal walk",
    coords: [50.3365, -4.5380],
    drive: "1 mi · 3 min",
    walk: "15 min",
    blurb: "Clifftop walking leaves right from Polperro — west to Talland Bay, east toward Looe.",
  },
  {
    id: "talland-bay",
    name: "Talland Bay",
    category: "Beach",
    coords: [50.3410, -4.5060],
    drive: "2 mi · 7 min",
    walk: "45 min",
    blurb: "A sheltered shingle-and-sand cove with a beach café — the first stop west on the coast path.",
  },
  {
    id: "looe",
    name: "Looe Harbour & Beach",
    category: "Town",
    coords: [50.3557, -4.4521],
    drive: "3 mi · 10 min",
    walk: "—",
    blurb: "East and West Looe divided by the river — fishing port, sandy beach, shark-fishing trips, fish and chips.",
  },
  {
    id: "lansallos",
    name: "Lansallos Beach",
    category: "Beach",
    coords: [50.3380, -4.5710],
    drive: "4 mi · 12 min",
    walk: "—",
    blurb: "A quiet National Trust cove reached down a green lane — perfect when you want to lose the crowds.",
  },
  {
    id: "seaton",
    name: "Seaton Beach",
    category: "Beach",
    coords: [50.3730, -4.5750],
    drive: "6 mi · 15 min",
    walk: "—",
    blurb: "A long, flat sandy beach with a café and the Seaton valley countryside park behind it.",
  },
];

// Coast path trace (approximate) — Looe → Talland → Polperro → Lansallos
const COAST_PATH = [
  [50.3557, -4.4521],
  [50.3500, -4.4700],
  [50.3450, -4.4900],
  [50.3410, -4.5060],
  [50.3380, -4.5240],
  [50.3365, -4.5380],
  [50.3347, -4.5456],
  [50.3360, -4.5580],
  [50.3380, -4.5710],
];

function pinIcon(spot, active) {
  const color = spot.isCaravan ? "#D4AF37" : active ? "#D4AF37" : "#1A2F38";
  const scale = active ? 1.15 : 1;
  const w = 28 * scale;
  const h = 36 * scale;
  return L.divIcon({
    className: "tydee-pin",
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#F4F7F5" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="#F4F7F5"/>
      </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

function MapController({ active }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  useEffect(() => {
    if (active) {
      map.flyTo(active.coords, 15, { duration: 0.7 });
    }
  }, [active, map]);
  return null;
}

export default function AreaMap({ active }) {
  return (
    <MapContainer
      center={CARAVAN}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#EAF0EE" }}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
        maxZoom={19}
      />
      <Polyline
        positions={COAST_PATH}
        pathOptions={{ color: "#D4AF37", weight: 3, opacity: 0.7, dashArray: "6 8" }}
      />
      {SPOTS.map((spot) => (
        <Marker
          key={spot.id}
          position={spot.coords}
          icon={pinIcon(spot, active && active.id === spot.id)}
          zIndexOffset={spot.isCaravan ? 1000 : 0}
        >
          <Popup>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", minWidth: 180 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#1A2F38", margin: 0 }}>{spot.name}</p>
              <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4A5D66", margin: "4px 0 6px" }}>
                {spot.category}
              </p>
              <p style={{ fontSize: 12, color: "#1A2F38", margin: 0 }}>{spot.blurb}</p>
              {!spot.isCaravan && (
                <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, color: "#4A5D66", margin: "6px 0 0" }}>
                  {spot.drive}{spot.walk !== "—" ? ` · ${spot.walk} walk` : ""}
                </p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
      <MapController active={active} />
    </MapContainer>
  );
}