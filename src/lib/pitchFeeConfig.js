// Pitch fee tracker settings — owner-facing only, never shown to guests.
// annual_target is the site fee the owner must cover each period.
// occupancy_by_season is the projection assumption per season (0–1).
export const PITCH_FEE_SETTINGS = {
  annual_target: 6050,
  target_label: "Annual pitch fee",
  target_period_start: "2026-10-05",
  cleaning_cost: 80,
  occupancy_by_season: {
    Autumn: 0.35,
    "October half-term": 0.7,
    "Late autumn": 0.3,
    Christmas: 0.6,
    "New Year": 0.55,
    Winter: 0.25,
    "February half-term": 0.65,
    "Early spring": 0.3,
    Easter: 0.7,
    Spring: 0.45,
    "Late spring": 0.55,
    "Spring half-term": 0.7,
    "Early summer": 0.6,
    "High summer": 0.8,
    "Peak summer": 0.9,
    September: 0.55,
    "Early autumn": 0.4,
  },
};