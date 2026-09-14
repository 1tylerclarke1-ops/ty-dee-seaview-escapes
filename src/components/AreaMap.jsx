import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Approximate coordinates — for orientation only.
export const CARAVAN = [50.3398, -4.5145];

export const SPOTS = [
  {
    id: "caravan",
    name: "Ty Dee · Polperro Holiday Park",
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
    drive: "1.5 mi · 5 min",
    walk: "25 min",
    blurb: "The working fishing harbour at the heart of the village — boats, crab sandwiches, low-tide walks.",
  },
  {
    id: "polperro-village",
    name: "Polperro Village",
    category: "Village",
    coords: [50.3311, -4.5197],
    drive: "1.5 mi · 5 min",
    walk: "25 min",
    blurb: "Narrow streets, whitewashed cottages, the heritage museum and the old pilchard press.",
  },
  {
    id: "coast-path",
    name: "South West Coast Path",
    category: "Coastal walk",
    coords: [50.3340, -4.5140],
    drive: "1 mi · 3 min",
    walk: "15 min",
    blurb: "Clifftop walking leaves right from Polperro — west to Talland Bay, east toward Looe.",
  },
  {
    id: "talland-bay",
    name: "Talland Bay",
    category: "Beach",
    coords: [50.3395, -4.5065],
    drive: "2 mi · 7 min",
    walk: "45 min",
    blurb: "A sheltered shingle-and-sand cove with a beach café — the first stop west on the coast path.",
  },
  {
    id: "looe",
    name: "Looe Harbour & Beach",
    category: "Town",
    coords: [50.3540, -4.4540],
    drive: "3 mi · 10 min",
    walk: "—",
    blurb: "East and West Looe divided by the river — fishing port, sandy beach, shark-fishing trips, fish and chips.",
  },
  {
    id: "lansallos",
    name: "Lansallos Beach",
    category: "Beach",
    coords: [50.3335, -4.5715],
    drive: "4 mi · 12 min",
    walk: "—",
    blurb: "A quiet National Trust cove reached down a green lane — perfect when you want to lose the crowds.",
  },
  {
    id: "seaton",
    name: "Seaton Beach",
    category: "Beach",
    coords: [50.3648, -4.3851],
    drive: "6 mi · 15 min",
    walk: "—",
    blurb: "A long, flat sandy beach with a café and the Seaton valley countryside park behind it.",
  },
  {
    id: "fowey",
    name: "Fowey",
    category: "Harbour town",
    coords: [50.3353, -4.6372],
    drive: "10 mi · 25 min",
    walk: "—",
    blurb: "A deep-water harbour town of winding lanes and ferry crossings — sailing, bookshops and Daphne du Maurier country.",
  },
  {
    id: "mount-edgcumbe",
    name: "Mount Edgcumbe",
    category: "Country park",
    coords: [50.3483, -4.1889],
    drive: "16 mi · 35 min",
    walk: "—",
    blurb: "Country park and historic house overlooking Plymouth Sound, reached by the Cremyll ferry — formal gardens and coastal walks.",
  },
  {
    id: "plymouth",
    name: "Plymouth",
    category: "City",
    coords: [50.3700, -4.1410],
    drive: "18 mi · 40 min",
    walk: "—",
    blurb: "The Hoe, Smeaton's Tower, the National Marine Aquarium and the Mayflower Steps — Devon's ocean city.",
  },
  {
    id: "bodmin-moor",
    name: "Bodmin Moor",
    category: "Moorland",
    coords: [50.5800, -4.6000],
    drive: "18 mi · 35 min",
    walk: "—",
    blurb: "Wild granite moorland with ponies, tors and Jamaica Inn — a different Cornwall for blustery days.",
  },
  {
    id: "charlestown",
    name: "Charlestown",
    category: "Heritage port",
    coords: [50.3314, -4.7578],
    drive: "20 mi · 40 min",
    walk: "—",
    blurb: "A Georgian port with tall ships and a shipwreck museum — a film location straight out of the 1800s.",
  },
  {
    id: "eden-project",
    name: "The Eden Project",
    category: "Attraction",
    coords: [50.3596, -4.7449],
    drive: "22 mi · 40 min",
    walk: "—",
    blurb: "The famous biomes — rainforest and Mediterranean under giant domes, plus gardens and seasonal events.",
  },
  {
    id: "heligan",
    name: "Lost Gardens of Heligan",
    category: "Gardens",
    coords: [50.2960, -4.7660],
    drive: "22 mi · 45 min",
    walk: "—",
    blurb: "Restored Victorian pleasure grounds — jungle boardwalk, sculpture and productive kitchen gardens.",
  },
  {
    id: "mevagissey",
    name: "Mevagissey",
    category: "Fishing village",
    coords: [50.2702, -4.7874],
    drive: "22 mi · 45 min",
    walk: "—",
    blurb: "A twin-harbour fishing village with a narrow front and an aquarium — quieter than Polperro, lovely at dusk.",
  },
  {
    id: "truro",
    name: "Truro",
    category: "City",
    coords: [50.2630, -5.0540],
    drive: "30 mi · 55 min",
    walk: "—",
    blurb: "Cornwall's only city — a gothic cathedral, independent shops, the river and a museum of Cornish life.",
  },
  {
    id: "dartmoor",
    name: "Dartmoor",
    category: "National park",
    coords: [50.5460, -3.9470],
    drive: "30 mi · 55 min",
    walk: "—",
    blurb: "Across the Tamar into Devon — ancient tors, Bronze Age villages and wild ponies across open moor.",
  },
  {
    id: "newquay",
    name: "Newquay",
    category: "Surf town",
    coords: [50.4120, -5.0757],
    drive: "35 mi · 1 hr",
    walk: "—",
    blurb: "Surf capital of the UK — Fistral, Watergate Bay and a buzzing beach-town scene.",
  },
  {
    id: "falmouth",
    name: "Falmouth",
    category: "Maritime town",
    coords: [50.1500, -5.0700],
    drive: "38 mi · 1 hr 10",
    walk: "—",
    blurb: "Maritime town with the National Maritime Museum, Pendennis Castle and the Fal estuary's deep water.",
  },
  {
    id: "padstow",
    name: "Padstow",
    category: "Foodie harbour",
    coords: [50.5380, -4.9380],
    drive: "42 mi · 1 hr 15",
    walk: "—",
    blurb: "Rick Stein's foodie harbour town — crab sandwiches, the Camel Trail and a ferry to Rock.",
  },
  {
    id: "tintagel",
    name: "Tintagel Castle",
    category: "Castle",
    coords: [50.6680, -4.7610],
    drive: "45 mi · 1 hr 20",
    walk: "—",
    blurb: "Clifftop castle ruins tied to King Arthur, plus Merlin's Cove and a dramatic new bridge.",
  },
  {
    id: "st-ives",
    name: "St Ives",
    category: "Art town",
    coords: [50.2110, -5.4800],
    drive: "45 mi · 1 hr 15",
    walk: "—",
    blurb: "Light, art and golden sand — Tate St Ives, the Barbara Hepworth museum and Porthmeor beach.",
  },
  {
    id: "penzance",
    name: "Penzance",
    category: "Georgian town",
    coords: [50.1190, -5.5350],
    drive: "50 mi · 1 hr 25",
    walk: "—",
    blurb: "Granite Georgian town, the Jubilee Pool lido and the causeway crossing to St Michael's Mount.",
  },
  {
    id: "lands-end",
    name: "Land's End",
    category: "Landmark",
    coords: [50.0686, -5.7161],
    drive: "55 mi · 1 hr 35",
    walk: "—",
    blurb: "The westernmost point — cliffs, the Longships lighthouse and the classic signpost photo.",
  },
];

// Coast path trace (approximate) — Looe → Talland → Polperro → Lansallos
const COAST_PATH = [
  [50.3540, -4.4540],
  [50.3500, -4.4700],
  [50.3450, -4.4880],
  [50.3395, -4.5065],
  [50.3345, -4.5180],
  [50.3311, -4.5197],
  [50.3315, -4.5350],
  [50.3325, -4.5550],
  [50.3335, -4.5715],
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
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
        attribution='Tiles &copy; Esri'
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