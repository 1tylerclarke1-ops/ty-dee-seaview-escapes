import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Polperro Holiday Park (Ty Dee). Coordinates for orientation only.
export const CARAVAN = [50.3398, -4.5145];

export const SPOTS = [
  {
    id: "caravan",
    name: "Ty Dee Seaview Escapes · Polperro Holiday Park",
    category: "Your base",
    coords: [50.3398, -4.5145],
    drive: "—",
    walk: "—",
    blurb: "Your caravan, on a quiet elevated pitch between Looe and Polperro.",
    isCaravan: true,
  },
  {
    id: "polperro-harbour",
    name: "Polperro Harbour",
    category: "Harbour",
    coords: [50.3308, -4.5205],
    drive: "5 min",
    walk: "25 min",
    blurb: "The working fishing harbour at the heart of the village — boats, crab sandwiches, low-tide walks.",
  },
  {
    id: "coast-path",
    name: "South West Coast Path",
    category: "Coastal walk",
    coords: [50.3340, -4.5140],
    drive: "—",
    walk: "2 min",
    blurb: "Clifftop walking leaves right from the park gate — west to Talland Bay, east toward Looe.",
  },
  {
    id: "talland-bay",
    name: "Talland Bay",
    category: "Beach",
    coords: [50.3395, -4.5065],
    drive: "7 min",
    walk: "45 min",
    blurb: "A sheltered shingle-and-sand cove with a seasonal beach café — the first stop west on the coast path.",
  },
  {
    id: "looe",
    name: "Looe Harbour & Beach",
    category: "Town",
    coords: [50.3540, -4.4540],
    drive: "10 min",
    walk: "—",
    blurb: "East and West Looe divided by the river — fishing port, sandy beach, shark-fishing trips, fish and chips.",
  },
  {
    id: "crumplehorn",
    name: "The Crumplehorn Inn & Mill",
    category: "Nearest pub",
    coords: [50.3335, -4.5240],
    drive: "4 min",
    walk: "20 min",
    blurb: "A 14th-century mill inn at the top of the lane into Polperro — the nearest pub to the holiday park, with a working mill wheel and low beams.",
  },
  {
    id: "village-store",
    name: "Polperro News",
    category: "Village shop",
    coords: [50.3310, -4.5200],
    drive: "5 min",
    walk: "25 min",
    blurb: "A Fore Street store for basics and newspapers — a short walk down into the village.",
  },
];

// Coast path trace (approximate) — Looe → Talland Bay → Polperro
const COAST_PATH = [
  [50.3540, -4.4540],
  [50.3500, -4.4700],
  [50.3450, -4.4880],
  [50.3395, -4.5065],
  [50.3340, -4.5140],
  [50.3311, -4.5197],
];

function pinIcon(spot, active) {
  const color = spot.isCaravan ? "#2F6F6B" : active ? "#2F6F6B" : "#1C2A31";
  const scale = active ? 1.15 : 1;
  const w = 28 * scale;
  const h = 36 * scale;
  return L.divIcon({
    className: "tydee-pin",
    html: `
      <svg width="${w}" height="${h}" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 14 22 14 22s14-12.5 14-22C28 6.27 21.73 0 14 0z" fill="${color}" stroke="#F5F7F6" stroke-width="1.5"/>
        <circle cx="14" cy="14" r="5" fill="#F5F7F6"/>
      </svg>`,
    iconSize: [w, h],
    iconAnchor: [w / 2, h],
    popupAnchor: [0, -h + 6],
  });
}

function MapController({ active }) {
  const map = useMap();
  useEffect(() => { map.invalidateSize(); }, [map]);
  useEffect(() => {
    if (active) map.flyTo(active.coords, 15, { duration: 0.7 });
  }, [active, map]);
  return null;
}

export default function AreaMap({ active }) {
  return (
    <MapContainer
      center={CARAVAN}
      zoom={13}
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#EDEFEE", isolation: "isolate" }}
      attributionControl={true}
    >
      <TileLayer
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution="Tiles &copy; Esri"
        maxZoom={19}
      />
      <Polyline
        positions={COAST_PATH}
        pathOptions={{ color: "#2F6F6B", weight: 3, opacity: 0.7, dashArray: "6 8" }}
      />
      {SPOTS.map((spot) => (
        <Marker
          key={spot.id}
          position={spot.coords}
          icon={pinIcon(spot, active && active.id === spot.id)}
          zIndexOffset={spot.isCaravan ? 1000 : 0}
        >
          <Popup>
            <div style={{ fontFamily: "'IBM Plex Sans', sans-serif", minWidth: 180 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#1C2A31", margin: 0 }}>{spot.name}</p>
              <p style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase", color: "#5E6E70", margin: "4px 0 6px" }}>
                {spot.category}
              </p>
              <p style={{ fontSize: 12, color: "#1C2A31", margin: 0 }}>{spot.blurb}</p>
              {!spot.isCaravan && (
                <p style={{ fontSize: 11, color: "#5E6E70", margin: "6px 0 0" }}>
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