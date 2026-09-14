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
    blurb: "Your caravan, on a quiet elevated pitch between Looe and Polperro — about ten minutes from each.",
    isCaravan: true,
  },
  // --- LOOE ---
  {
    id: "east-looe-beach",
    name: "East Looe Beach",
    category: "Beach",
    town: "looe",
    coords: [50.3473, -4.4480],
    drive: "10 min",
    walk: "—",
    blurb: "The main sandy family beach, backed by the town. Summer dog restrictions apply (July–Aug, 10am–6pm) — check the beach signs.",
  },
  {
    id: "hannafore",
    name: "West Looe & Hannafore",
    category: "Beach & rock pools",
    town: "looe",
    coords: [50.3418, -4.4612],
    drive: "10 min",
    walk: "—",
    blurb: "The quieter side of the river — rock pools at low tide and a level seafront walk out to Hannafore Point, looking across to Looe Island.",
  },
  {
    id: "looe-harbour",
    name: "Looe Harbour & Fishing Fleet",
    category: "Working harbour",
    town: "looe",
    coords: [50.3512, -4.4535],
    drive: "10 min",
    walk: "—",
    blurb: "A working fishing port — watch the fleet land their catch on the quay, and buy fish straight off the boats when they're in.",
  },
  {
    id: "banjo-pier",
    name: "Banjo Pier",
    category: "Harbour landmark",
    town: "looe",
    coords: [50.3436, -4.4558],
    drive: "10 min",
    walk: "—",
    blurb: "The curved pier at the harbour mouth — a short walk out for the view back across the town and out to Looe Island.",
  },
  {
    id: "looe-island",
    name: "Looe Island Nature Reserve",
    category: "Nature reserve",
    town: "looe",
    coords: [50.3397, -4.4329],
    drive: "10 min to quay",
    walk: "—",
    blurb: "A Cornwall Wildlife Trust reserve. Access is by organised boat trip only — you can't just turn up. Trips are seasonal and bookable in advance.",
  },
  {
    id: "millendreath",
    name: "Millendreath Beach",
    category: "Beach",
    town: "looe",
    coords: [50.3376, -4.4385],
    drive: "8 min",
    walk: "—",
    blurb: "A small sandy cove in a wooded valley below the coast path, with a beachfront café in season. Quieter than East Looe.",
  },
  {
    id: "kilminorth",
    name: "Kilminorth Woods",
    category: "Woodland walk",
    town: "looe",
    coords: [50.3447, -4.4685],
    drive: "10 min",
    walk: "—",
    blurb: "A Local Nature Reserve of ancient oak woodland along the West Looe River — a flat, shady walk from Millpool car park, about a mile and a half each way.",
  },
  {
    id: "looe-valley-line",
    name: "Looe Valley Line",
    category: "Branch-line railway",
    town: "looe",
    coords: [50.3578, -4.4548],
    drive: "10 min to Looe station",
    walk: "—",
    blurb: "The branch line from Looe to Liskeard up the East Looe valley — a scenic trip in its own right, and useful without a car. Runs six days a week; Sundays April to October.",
  },
  {
    id: "looe-boat-trips",
    name: "Boat Trips from the Quay",
    category: "Sea trips",
    town: "looe",
    coords: [50.3520, -4.4538],
    drive: "10 min",
    walk: "—",
    blurb: "Glass-bottom and RIB trips from East Looe quay — seals around Looe Island, dolphins, seabirds and a run along the coast. Trips sail in fair weather, spring to autumn.",
  },
  // --- POLPERRO ---
  {
    id: "polperro-harbour",
    name: "Polperro Harbour",
    category: "Harbour",
    town: "polperro",
    coords: [50.3308, -4.5205],
    drive: "5 min",
    walk: "25 min",
    blurb: "The working fishing harbour at the heart of the village — boats, crab sandwiches, low-tide walks. Cars stop at the top of the village; from there it's all on foot.",
  },
  {
    id: "crumplehorn",
    name: "The Crumplehorn Inn & Mill",
    category: "Nearest pub",
    town: "polperro",
    coords: [50.3335, -4.5240],
    drive: "4 min",
    walk: "20 min",
    blurb: "A 14th-century mill inn at the top of the lane into Polperro — the nearest pub to the holiday park, with a working mill wheel and low beams.",
  },
  {
    id: "village-store",
    name: "Polperro News",
    category: "Village shop",
    town: "polperro",
    coords: [50.3310, -4.5200],
    drive: "5 min",
    walk: "25 min",
    blurb: "A Fore Street store for basics and newspapers — a short walk down into the village.",
  },
  // --- COAST & BEACHES ---
  {
    id: "coast-path",
    name: "South West Coast Path",
    category: "Coastal walk",
    town: "coast",
    coords: [50.3340, -4.5140],
    drive: "—",
    walk: "2 min",
    blurb: "Clifftop walking leaves right from the park gate — west to Talland Bay and on toward Polperro, east toward Looe.",
  },
  {
    id: "talland-bay",
    name: "Talland Bay",
    category: "Beach",
    town: "coast",
    coords: [50.3395, -4.5065],
    drive: "7 min",
    walk: "45 min",
    blurb: "A sheltered shingle-and-sand cove with a seasonal beach café — the first stop west on the coast path.",
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