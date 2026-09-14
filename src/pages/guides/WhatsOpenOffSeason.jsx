import GuideArticle from "@/components/GuideArticle";

export default function WhatsOpenOffSeason() {
  return (
    <GuideArticle
      title="What's open off-season"
      subtitle="An honest guide to what's running from November to April — the park facilities close, but the village doesn't."
      description="What's actually open in and around Looe and Polperro, Cornwall from November to April — pubs, shops, supermarkets, and which holiday park facilities close for winter. Written by the owner."
      path="/guides/whats-open-off-season"
    >
      <p>
        We'd rather you knew this before you booked than after. The holiday park's on-site facilities close for
        winter, and that changes what a stay here is. So here's the plain version of what's open and what isn't
        from 1 November through to the spring — written by us, because we get the question every week.
      </p>

      <h2>What closes at the park</h2>
      <p>
        From 1 November, the park's <strong>swimming pool, club house, amusement arcade and children's
        play area</strong> close, and they reopen in the spring. The shop and reception keep limited hours.
        The static caravans — including Ty Dee — stay open; it's the shared facilities that shut. We ask every
        guest booking affected dates to acknowledge this at checkout, so nobody arrives expecting a pool.
      </p>
      <p>
        What stays is what matters in winter: the caravan itself (warm, dry, well-insulated, with the heating
        on), the private decking and the sea view, and the coast path at the gate. If you want a park holiday
        with a pool and a club, book October half-term or later in the spring. If you want the coast, come in
        winter.
      </p>

      <h2>What stays open in Polperro</h2>
      <ul>
        <li><strong>The Three Pilchards</strong> and <strong>The Ship Inn</strong> — the village pubs, open out of season. Check opening days before you plan a meal, as winter hours vary.</li>
        <li><strong>Polperro News</strong> on Fore Street — a village store for basics and newspapers. Don't rely on it for a big shop.</li>
        <li><strong>The harbour and beach</strong> — always open, always free, and at their best when it's quiet.</li>
      </ul>

      <h2>In Looe — top-ups only, about 10 minutes away</h2>
      <p>
        Looe is the working town next door, and it runs year-round. For groceries, though, it's convenience
        stores only — fine for milk, bread and a bottle of wine, not a weekly shop.
      </p>
      <ul>
        <li><strong>Co-op</strong>, Fore Street, East Looe — 7am to 10pm, seven days.</li>
        <li><strong>Londis</strong>, West Looe — 8am to 7pm, Sundays 10am to 4pm.</li>
      </ul>

      <h2>For a proper shop</h2>
      <p>
        The nearest large supermarkets are all 20–40 minutes' drive away. <strong>The most useful is
        Morrisons on Plymouth Road, Horningtops, Liskeard (PL14 3PR) — about 20 minutes.</strong> It sits
        right on the A38, so if you're driving down you can do the big shop on the way in rather than making
        a separate trip. Mon–Sat 7am–10pm, Sunday 10am–4pm.
      </p>
      <ul>
        <li><strong>Aldi</strong>, 1 Charter Way, Liskeard PL14 3XA — about 22 minutes.</li>
        <li><strong>Tesco Superstore</strong>, Tavistock Road, Callington PL17 7RD — about 35 minutes. Mon–Fri 7am–10pm, Sat 8am–10pm, Sunday 10am–4pm.</li>
        <li><strong>Asda Bodmin Superstore</strong>, Launceston Road, Bodmin PL31 2AR — about 40 minutes. Opens 6am, closes midnight Mon–Fri — the only option for a very early or very late shop. Sunday 10am–4pm.</li>
        <li><strong>Morrisons</strong>, Priory Road, Bodmin PL31 2ST — about 40 minutes.</li>
      </ul>

      <h2>Two things worth knowing</h2>
      <ul>
        <li>Every large supermarket in England closes on Sunday between 10am and 4pm. If you arrive on a Sunday evening, the Looe convenience stores are your only option — so shop on the way down.</li>
        <li>All the major supermarkets deliver to the park. Booking a delivery slot for your arrival afternoon saves the drive entirely — worth doing in winter.</li>
      </ul>

      {/* FARM SHOP / LOCAL PRODUCE — owner to supply verified details, then add an <h2> + <p> here */}

      <h2>Further afield</h2>
      <p>
        <strong>Falmouth, Truro and Plymouth</strong> are all within an hour's drive and fully open in winter — good
        for a rainy day at the National Maritime Museum, a cathedral wander, or a proper town shop. The
        <strong> Eden Project</strong> stays open year-round with winter hours. The <strong>Tamar Valley</strong>
        and <strong>Bodmin Moor</strong> are quiet and walkable in any weather.
      </p>
      <p>
        The short version: a winter stay here is a coast-and-village stay, not a facilities-and-entertainment
        stay. We wouldn't have it any other way — but we want you to book it with your eyes open.
      </p>
      <p className="text-sm text-muted-foreground">
        Opening hours verified September 2026 — please re-check before you travel, as they change.
      </p>
    </GuideArticle>
  );
}