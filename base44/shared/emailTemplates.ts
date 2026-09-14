// Editable email templates with merge fields. Defaults are seeded into the
// EmailTemplate entity on first run; the owner edits them in admin. Tone:
// first person, warm, specific. Name the dates. Never "Dear valued customer",
// never countdown timers, never fake scarcity. One clear link. Under 120 words.

export const TEMPLATE_TYPES = [
  { id: "late_availability", label: "Late availability", name: "A late availability stay" },
  { id: "cancellation", label: "Cancellation", name: "These dates just came free" },
  { id: "weather", label: "Weather", name: "Good forecast" },
  { id: "returning_guest", label: "Returning guest", name: "A private rate for past guests" },
  { id: "post_stay", label: "Post-stay", name: "Thank you and review" },
];

// Merge fields available across templates. Unknown / empty fields render as "".
//   {{name}}              first name
//   {{arrival_date}}      e.g. "Friday 5 October 2026"
//   {{departure_date}}
//   {{nights}}
//   {{season}}            " · Autumn" (with separator) or ""
//   {{offer_description}} e.g. "9% off this stay"
//   {{offer_link}}        single-use offer URL
//   {{unsubscribe_link}}   per-recipient unsubscribe URL
//   {{consent_link}}      post-stay opt-in URL
export const MERGE_FIELDS = [
  "name", "arrival_date", "departure_date", "nights", "season",
  "offer_description", "offer_link", "unsubscribe_link", "consent_link",
  "review_link",
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
{{review_link}}

And may we email you occasionally about last-minute availability? No more than once a month, only when a stay opens up. Say yes here:
{{consent_link}}

— The owners, Ty Dee Seaview Escapes`,
  },
];

export function fillTemplate(text: string, vars: Record<string, string | number | null>): string {
  return (text || "").replace(/\{\{(\w+)\}\}/g, (_m, key: string) => {
    const v = vars[key];
    return v == null ? "" : String(v);
  });
}

export function renderTemplate(tpl: { subject?: string; body?: string }, vars: Record<string, string | number | null>) {
  return {
    subject: fillTemplate(tpl.subject || "", vars),
    text: fillTemplate(tpl.body || "", vars),
  };
}

// Minimal text -> HTML: escape, split paragraphs on blank lines, linkify bare URLs.
export function textToHtml(text: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const linkify = (s: string) =>
    s.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" style="color:#2F6F6B">${url}</a>`);
  return (text || "")
    .trim()
    .split(/\n{2,}/)
    .map((p) =>
      `<p style="font-size:15px;line-height:1.6;margin:0 0 12px">${linkify(esc(p)).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
}