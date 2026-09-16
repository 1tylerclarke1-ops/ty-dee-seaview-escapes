import PageHero from "@/components/PageHero";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";
import { format, parseISO } from "date-fns";
import { useCancellationPolicy, tierDisplayRows } from "@/lib/cancellation";
import { useFacilitiesSettings } from "@/lib/facilities";

const STATIC_SECTIONS = [
  {
    title: "The booking",
    body: [
      "Ty Dee Seaview Escapes is a privately owned static caravan at Polperro Holiday Park, Cornwall, available for direct booking with the owner.",
      "Stays are available year-round, and you can book up to twelve months ahead.",
      "Only two stay lengths are offered: three nights arriving on a Friday, or four nights arriving on a Monday. No other arrival days or durations are available.",
      "Maximum occupancy is six guests. This includes children and infants.",
    ],
  },
  {
    title: "Dogs",
    body: [
      "Well-behaved dogs are welcome by prior arrangement only. Please request at the time of booking.",
      "A maximum of two dogs may be accommodated. Dogs must not be left unattended in the caravan and must be kept off soft furnishings.",
    ],
  },
  {
    title: "Your responsibilities",
    body: [
      "Guests are responsible for leaving the caravan clean and tidy, with all rubbish removed to the park bins.",
      "Any breakages or damage must be reported to the owner immediately and will be charged at replacement cost.",
      "The caravan is a non-smoking property, including e-cigarettes.",
    ],
  },
  {
    title: "Liability",
    body: [
      "The owner accepts no liability for loss or injury to guests or their property during their stay, however caused.",
      "Use of the private decking, the holiday park and the surrounding coast is entirely at guests' own risk.",
    ],
  },
];

function CancellationSection({ policy, index }) {
  const rows = tierDisplayRows(policy);
  const topDays = rows.length ? policy.tiers[0]?.days_before_arrival : 60;
  return (
    <div>
      <p className="text-sm text-sea tnum">{String(index + 1).padStart(2, "0")}</p>
      <h2 className="text-3xl md:text-4xl text-ink mt-2">Cancellation policy</h2>
      <div className="hairline mt-5" />

      <table className="w-full mt-6 text-sm">
        <thead>
          <tr className="text-left text-xs tracking-wide uppercase text-muted-foreground border-b border-line">
            <th className="py-3 pr-4 font-normal">Days before arrival</th>
            <th className="py-3 font-normal text-right">Refund</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-line/60">
              <td className="py-3 pr-4 text-ink-soft tnum">{r.label}</td>
              <td className="py-3 text-ink tnum text-right">
                {r.percent === 0 ? "No refund" : r.percent === 100 ? "100% — full refund" : `${r.percent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 space-y-4 text-ink-soft">
        <p>The refund percentage applies to the total paid at the time you cancel — including the deposit, the short break supplement and the dog fee. Refunds are returned to the original payment method within 10 working days.</p>
        <p>
          <span className="text-ink">Changes to your dates.</span> One date change may be requested more than {topDays} days before arrival, subject to availability and any price difference. Inside {topDays} days a change is treated as a cancellation under the tiers above.
        </p>
        <p>Late arrival or early departure — no refund or reduction.</p>
        <p>
          <span className="text-ink">If we cancel.</span> In the unlikely event we cannot honour your booking, you receive a full refund of everything paid. Our liability is limited to that refund.
        </p>
        <p>
          <span className="text-ink">Travel insurance.</span> We strongly recommend it.
        </p>
      </div>
    </div>
  );
}

export default function Terms() {
  const { settings: policy } = useCancellationPolicy();
  const { settings: facilities } = useFacilitiesSettings();
  const closedFrom = format(parseISO(facilities.facilities_closed_from), "d MMMM yyyy");
  const winterSection = {
    title: "Winter residency — park facilities",
    body: [
      `From ${closedFrom} onwards, on-site holiday park facilities — including the swimming pool, clubhouse, entertainment and children's play areas — are closed for the winter season.`,
      "Any booking that includes dates on or after 1 November is a winter residency: a peaceful, self-catered retreat. The caravan itself remains fully equipped and heated.",
      "Guests booking a winter stay must acknowledge this closure before confirming their booking. No refund or reduction is available on the basis of closed park facilities.",
    ],
  };
  const sections = [STATIC_SECTIONS[0], winterSection, ...STATIC_SECTIONS.slice(1), { title: "Cancellation policy", kind: "cancellation" }];

  return (
    <div>
      <Seo
        title="Terms & Conditions — Ty Dee Seaview Escapes"
        description="Booking terms for Ty Dee Seaview Escapes at Polperro: stay lengths, the winter facilities closure, dogs, guest responsibilities, and the tiered cancellation policy."
        canonical={`${SITE_ORIGIN}/terms`}
      />
      <PageHero
        title="Terms & Conditions"
        subtitle="Clear, fair, and built around the two-stay model that keeps Ty Dee simple."
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="grid md:grid-cols-12 gap-10 md:gap-12">
          <div className="md:col-span-4">
            <div className="sticky top-28 space-y-3">
              {sections.map((s, i) => (
                <a
                  key={s.title}
                  href={`#sec-${i}`}
                  className="block text-sm text-muted-foreground hover:text-sea transition-colors"
                >
                  {String(i + 1).padStart(2, "0")} · {s.title}
                </a>
              ))}
            </div>
          </div>
          <div className="md:col-span-8 space-y-14">
            {sections.map((s, i) => (
              <div key={s.title} id={`sec-${i}`}>
                {s.kind === "cancellation" ? (
                  <CancellationSection policy={policy} index={i} />
                ) : (
                  <>
                    <p className="text-sm text-sea tnum">{String(i + 1).padStart(2, "0")}</p>
                    <h2 className="text-3xl md:text-4xl text-ink mt-2">{s.title}</h2>
                    <div className="hairline mt-5" />
                    <div className="mt-5 space-y-4 text-ink-soft">
                      {s.body.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}