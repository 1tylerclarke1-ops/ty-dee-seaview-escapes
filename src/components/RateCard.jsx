import { PRICING_SETTINGS, seasonPriceForLength, seasonRestrictionNote, gbp } from "@/lib/pricing";

// Full season-by-season rate card. Reads the pricing engine + booking rules
// directly (seasonPriceForLength / seasonRestrictionNote) so it can never drift
// from the booking engine. A dash means that stay length is not bookable in
// that season (e.g. Peak summer enforces weekly stays only).
export default function RateCard() {
  const seasons = PRICING_SETTINGS.seasons;
  const lengths = [3, 4, 7];

  return (
    <div className="bg-surface border border-line">
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4">
        <h2 className="text-2xl md:text-3xl text-ink">Rate card</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Per season, per stay length. Totals include the {gbp(PRICING_SETTINGS.short_break_supplement)} short-break
          supplement (stays under 7 nights) and the {gbp(PRICING_SETTINGS.damage_waiver)} damage waiver. A dash means
          that length is not bookable in that season.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-y border-line bg-offseason/40">
              <th className="text-left font-normal text-xs tracking-wide uppercase text-muted-foreground px-6 md:px-8 py-3">
                Season
              </th>
              <th className="text-right font-normal text-xs tracking-wide uppercase text-muted-foreground px-3 py-3">
                Dates
              </th>
              {lengths.map((n) => (
                <th key={n} className="text-right font-normal text-xs tracking-wide uppercase text-muted-foreground px-3 py-3">
                  {n} nights
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {seasons.map((s) => {
              const note = seasonRestrictionNote(s);
              return (
                <tr key={s.name} className="border-b border-line last:border-b-0">
                  <td className="px-6 md:px-8 py-3 text-ink font-medium">{s.name}</td>
                  <td className="px-3 py-3 text-muted-foreground tnum text-xs whitespace-nowrap text-right">
                    {fmtDate(s.start_date)}–{fmtDate(s.end_date)}
                  </td>
                  {lengths.map((n) => {
                    const price = seasonPriceForLength(s, n);
                    return (
                      <td key={n} className="px-3 py-3 text-right tnum text-ink">
                        {price == null ? <span className="text-muted-foreground">—</span> : gbp(price)}
                      </td>
                    );
                  })}
                  {note && (
                    <td className="px-3 py-3 text-xs text-muted-foreground hidden md:table-cell">
                      {note}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile restriction notes (inline beneath the table) */}
      <div className="md:hidden px-6 pb-6 space-y-1">
        {seasons.map((s) => {
          const note = seasonRestrictionNote(s);
          if (!note) return null;
          return <p key={s.name} className="text-xs text-muted-foreground">{note}</p>;
        })}
      </div>
    </div>
  );
}

function fmtDate(iso) {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}