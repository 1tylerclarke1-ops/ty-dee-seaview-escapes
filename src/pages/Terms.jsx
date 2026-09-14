import PageHero from "@/components/PageHero";
import { PARK_CLOSURE_DATE } from "@/lib/siteConfig";
import { format, parseISO } from "date-fns";

const SECTIONS = [
  {
    title: "The booking",
    body: [
      "Ty Dee Seaview Escapes is a privately owned static caravan at Polperro Holiday Park, Cornwall, available for direct booking with the owner.",
      "The booking season runs from 5 October 2026 to 27 April 2027. No stays are available outside this period.",
      "Only two stay lengths are offered: three nights arriving on a Friday, or four nights arriving on a Monday. No other arrival days or durations are available.",
      "Maximum occupancy is six guests. This includes children and infants.",
    ],
  },
  {
    title: "Winter residency — park facilities",
    body: [
      `From ${format(parseISO(PARK_CLOSURE_DATE), "d MMMM yyyy")} onwards, on-site holiday park facilities — including the swimming pool, clubhouse, entertainment and children's play areas — are closed for the winter season.`,
      "Any booking that includes dates on or after 1 November is a winter residency: a peaceful, self-catered retreat. The caravan itself remains fully equipped and heated.",
      "Guests booking a winter stay must acknowledge this closure before confirming their booking. No refund or reduction is available on the basis of closed park facilities.",
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
    title: "Payment & cancellation",
    body: [
      "Full booking terms, deposit requirements and cancellation policy will be confirmed with the booking engine. No payment is taken until the booking engine and payment step are live.",
      "Until then, enquiries made through this site are expressions of interest and create no obligation.",
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

export default function Terms() {
  return (
    <div>
      <PageHero
        title="Terms & Conditions"
        subtitle="Clear, fair, and built around the two-stay, one-season model that keeps Ty Dee simple."
      />
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="grid md:grid-cols-12 gap-10 md:gap-12">
          <div className="md:col-span-4">
            <div className="sticky top-28 space-y-3">
              {SECTIONS.map((s, i) => (
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
            {SECTIONS.map((s, i) => (
              <div key={s.title} id={`sec-${i}`}>
                <p className="text-sm text-sea tnum">{String(i + 1).padStart(2, "0")}</p>
                <h2 className="text-3xl md:text-4xl text-ink mt-2">{s.title}</h2>
                <div className="hairline mt-5" />
                <div className="mt-5 space-y-4 text-ink-soft">
                  {s.body.map((p, j) => (
                    <p key={j}>{p}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}