// Client-side mirror of the template constants from base44/shared/emailTemplates.ts.
// The shared module is server-only (Deno); the admin editor imports from here.
// Keep the constants in sync when defaults change.
export const TEMPLATE_TYPES = [
  { id: "late_availability", label: "Late availability", name: "A late availability stay" },
  { id: "cancellation", label: "Cancellation", name: "These dates just came free" },
  { id: "weather", label: "Weather", name: "Good forecast" },
  { id: "returning_guest", label: "Returning guest", name: "A private rate for past guests" },
  { id: "post_stay", label: "Post-stay", name: "Thank you and review" },
];

// Templates the owner can pick when sending an offer email (post-stay is automatic).
export const OFFER_TEMPLATE_TYPES = TEMPLATE_TYPES.filter((t) => t.id !== "post_stay");

export const MERGE_FIELDS = [
  "name", "arrival_date", "departure_date", "nights", "season",
  "offer_description", "offer_link", "unsubscribe_link", "consent_link",
];

export const DEFAULT_TEMPLATES = [
  {
    type: "late_availability",
    name: "A late availability stay",
    subject: "A late availability stay — arriving {{arrival_date}}",
    body:
`Hello {{name}},

A stay has opened up at Ty Dee Seaview Escapes.

Arriving {{arrival_date}} · {{nights}} nights{{season}}.
{{offer_description}}.

See your dates and the offer here:
{{offer_link}}

No more than one email a month. To stop these, click:
{{unsubscribe_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
  {
    type: "cancellation",
    name: "These dates just came free",
    subject: "These dates just came free — {{arrival_date}}",
    body:
`Hello {{name}},

A guest has just cancelled at Ty Dee Seaview Escapes, so these dates are free again.

Arriving {{arrival_date}} · {{nights}} nights{{season}}.
{{offer_description}}.

If the dates suit you, here is the link:
{{offer_link}}

No more than one email a month. To stop these, click:
{{unsubscribe_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
  {
    type: "weather",
    name: "Good forecast",
    subject: "The forecast for next weekend looks good",
    body:
`Hello {{name}},

The forecast for next weekend looks good down here in Polperro — dry and bright, the coast path at its best.

A stay is open: arriving {{arrival_date}} · {{nights}} nights{{season}}.
{{offer_description}}.

See it here:
{{offer_link}}

No more than one email a month. To stop these, click:
{{unsubscribe_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
  {
    type: "returning_guest",
    name: "A private rate for past guests",
    subject: "A private rate, for you — arriving {{arrival_date}}",
    body:
`Hello {{name}},

You have stayed with us before, so we would like you to see this first.

Arriving {{arrival_date}} · {{nights}} nights{{season}}.
{{offer_description}} — a private rate, just for past guests.

Here is your link:
{{offer_link}}

No more than one email a month. To stop these, click:
{{unsubscribe_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
  {
    type: "post_stay",
    name: "Thank you and review",
    subject: "Thank you for staying at Ty Dee",
    body:
`Hello {{name}},

Thank you for staying with us — we hope you loved the view as much as we do.

If you have a spare minute, a short review helps us no end:
[Paste your review link here in the editor]

And may we email you occasionally about last-minute availability? No more than once a month, only when a stay opens up. Say yes here:
{{consent_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
];