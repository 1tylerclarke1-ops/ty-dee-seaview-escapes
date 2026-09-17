// Server-side mirror of the occupancy assumptions and cleaning cost from
// src/lib/pitchFeeConfig.js. Used by the block-cost preview to estimate
// realistic net revenue at risk. Keep in sync with the client file.
export const CLEANING_COST = 80;

export const OCCUPANCY_BY_SEASON = {
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
};