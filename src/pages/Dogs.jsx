import { Image } from "@/components/ui/image";
import { BUSINESS } from "@/lib/siteConfig";
import { PRICING_SETTINGS } from "@/lib/pricing";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";

const DOG_HERO = "https://media.base44.com/images/public/6a8c357fbddaa3182705f397/ecc14f14e_generated_image.png";

// Dog-friendly landing page — the strongest quieter-months differentiator. Two
// dogs of any size is unusual on a holiday park. SEO targets: "dog friendly
// caravan Cornwall", "two dogs holiday let Cornwall", "dog friendly Polperro".
export default function Dogs() {
  const dogFee = PRICING_SETTINGS.dog_fee;
  const maxDogs = PRICING_SETTINGS.max_dogs;

  return (
    <div>
      <Seo
        title="Dog Friendly Caravan in Cornwall — Two Dogs Welcome at Polperro"
        description="A dog-friendly static caravan at Polperro, Cornwall — up to two dogs of any size welcome by arrangement, £25 per dog. Dog-friendly beaches, coast path walks and pubs nearby."
        canonical={`${SITE_ORIGIN}/dogs`}
      />
      {/* Hero */}
      <section className="relative w-full h-[300px] md:h-[380px] overflow-hidden">
        <Image
          src={DOG_HERO}
          alt="A wet dog on a quiet Cornish shingle beach near Polperro"
          fittingType="fill"
          loading="eager"
          className="block w-full h-full"
        />
        <div className="absolute inset-0 scrim-bottom" />
        <div className="relative h-full flex flex-col justify-end max-w-[1400px] mx-auto w-full px-6 md:px-10 pb-8">
          <p className="text-white/70 text-sm tracking-wide uppercase">Dog friendly caravan, Cornwall</p>
          <h1 className="text-white text-4xl md:text-6xl mt-2">Two dogs, any size</h1>
        </div>
      </section>

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-lg md:text-xl text-ink-soft leading-relaxed">
            Most holiday parks take one small dog, or none. We take two dogs of any size —
            and we mean it. A lurcher and a Labrador, two setters, a rescue and its companion.
            It is the thing we are asked for most often, and the reason so many of our quieter
            weeks fill with dog owners walking the coast path.
          </p>
        </div>
      </section>

      {/* The decking */}
      <Section title="The enclosed decking">
        <p>
          The caravan sits on its own plot with wraparound decking and a gate. It is not a
          shared balcony — it is yours, enclosed, so the dogs can be out with you without being
          underfoot. Give sandy paws a quick brush down before they come in, and the sea view is
          right there while you do it.
        </p>
      </Section>

      {/* The nearest beach */}
      <Section title="The nearest dog-friendly beach">
        <p>
          <strong>Talland Bay</strong> is the closest — a ten-minute drive, two sheltered shingle
          coves with rock pools at low tide. Check the beach signs for any seasonal dog
          restrictions, which Cornwall councils update most years — out of season the whole bay is
          open to dogs.
        </p>
        <p className="mt-4">
          From October to March, almost every beach in Cornwall is open to dogs, which
          is exactly when our caravan is at its quietest and best value. That is no coincidence.
        </p>
      </Section>

      {/* Dog-friendly pubs */}
      <Section title="Dog-friendly pubs in Polperro and Looe">
        <p>
          In Polperro, <strong>The Three Pilchards</strong> at the harbour and <strong>The Crumplehorn
          Inn</strong> at the top of the village both welcome dogs. In Looe, <strong>The Jolly
          Sailor</strong> in West Looe is dog-friendly and does a good lunch after a morning on the
          coast path. Opening hours narrow in winter — ring ahead or check their socials before you
          set out.
        </p>
      </Section>

      {/* Coast path */}
      <Section title="The South West Coast Path">
        <p>
          The path runs right past the holiday park. Head east and you are in Polperro in under an
          hour; head west and the cliffs open up toward Talland and Looe. Keep dogs on a short lead
          through the cliff-top fields (there are livestock) and you will have the wildest walking
          in Cornwall on your doorstep.
        </p>
      </Section>

      {/* Dog waste */}
      <Section title="Dog waste, sorted">
        <p>
          There's no dog waste bin right beside the van, but a little further down the road are the
          onsite big bin facilities — easy to drop a bag in on your way back from the dog walking
          field, which sits opposite the van.
        </p>
      </Section>

      {/* What to bring */}
      <div className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
        <div className="hairline pt-10 md:pt-14">
          <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">What to bring</h2>
          <ul className="mt-5 space-y-3 text-ink-soft max-w-2xl">
            <li>Two dog bowls (food and water)</li>
            <li>A dog towel for sandy or wet paws</li>
            <li>A washable throw for the sofa, so they can be with you in the evening</li>
            <li>Poo bags, in case you run out</li>
            <li>Your dog's bed or blanket — a familiar smell settles them fast</li>
            <li>Food and any medication</li>
            <li>A lead and a long line for the cliff paths</li>
            <li>Their favourite towel for the beach</li>
          </ul>
        </div>
      </div>

      {/* House rules */}
      <Section title="House rules, honestly">
        <ul className="mt-5 space-y-3 text-ink-soft">
          <li>Up to {maxDogs} dogs, any size — £{dogFee} per dog per stay, added to your booking.</li>
          <li>Please don't leave dogs unattended in the caravan.</li>
          <li>Dogs on beds or soft furnishings only with a throw underneath.</li>
          <li>Pick up on the park and on the path — use the onsite big bins a little down the road, on your way back from the dog walking field opposite the van.</li>
          <li>A short lead through the cliff-top fields, for the livestock's sake.</li>
        </ul>
      </Section>

      {/* Closing CTA */}
      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="bg-ink text-white p-8 md:p-12">
          <h2 className="text-3xl md:text-4xl text-white">Bring both dogs.</h2>
          <p className="mt-4 text-white/70 max-w-xl">
            Check availability and select your dates — the dog supplement is added per dog when you
            tell us how many are coming. Any questions about the decking, the beach, or whether your
            particular pair will suit, just ask.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/prices" className="inline-flex items-center justify-center bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]">
              Check availability
            </a>
            <a href="/contact" className="inline-flex items-center justify-center border border-white/30 text-white px-8 py-4 text-sm font-medium hover:border-white transition-colors min-h-[44px]">
              Ask the owner
            </a>
          </div>
          <p className="mt-8 text-sm text-white/40">{BUSINESS.location}</p>
        </div>
      </section>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-14 md:pb-20">
      <div className="hairline pt-10 md:pt-14">
        <h2 className="text-2xl md:text-3xl text-ink max-w-2xl">{title}</h2>
        <div className="mt-5 max-w-2xl text-ink-soft leading-relaxed">{children}</div>
      </div>
    </section>
  );
}