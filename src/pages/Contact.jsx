import { useState } from "react";
import PageHero from "@/components/PageHero";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";
import { BUSINESS } from "@/lib/siteConfig";
import { base44 } from "@/api/base44Client";

// The contact form is the primary route — it writes an Enquiry (a Contact
// record, source: enquiry) that the owner reads in the admin dashboard, so it
// can neither bounce nor be filtered. The email address sits below as a
// secondary option. The sending/from address is separate and unchanged.
export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await base44.functions.invoke("captureEnquiry", {
        name: form.name,
        email: form.email,
        message: form.message,
        consent_source: "contact_form",
      });
      setSent(true);
    } catch (err) {
      setError("Could not send your message just now. Please try again, or email us directly.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Seo
        title="Contact — Ty Dee Seaview Escapes, Looe & Polperro"
        description="Contact the owner of Ty Dee Seaview Escapes with questions about the caravan, the area, dog-friendly stays or availability — a holiday caravan between Looe and Polperro, Cornwall."
        canonical={`${SITE_ORIGIN}/contact`}
      />
      <PageHero
        title="Contact"
        subtitle="Questions about the caravan, the area, or bringing your dog? The owner is happy to help — and to talk you through the view."
      />

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-32">
        <div className="max-w-2xl">
          {sent ? (
            <div className="bg-ink text-white p-8 md:p-10">
              <p className="text-xs tracking-wide uppercase text-signal">Message sent</p>
              <p className="text-3xl text-white mt-3">Thank you — we'll be in touch.</p>
              <p className="text-white/70 mt-4">
                Your enquiry has been noted. The owner replies personally, usually within a day.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">Send a message</p>
              <h2 className="text-2xl md:text-3xl text-ink mt-3 max-w-xl">
                Tell us what you'd like to know — dates, the caravan, the area, or your dog.
              </h2>
              <form onSubmit={submit} className="space-y-8 mt-8">
                <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                <div>
                  <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    required
                    className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea resize-none min-h-[120px]"
                  />
                </div>
                {error && <p className="text-sm text-destructive">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px] disabled:opacity-60"
                >
                  {submitting ? "Sending…" : "Send Enquiry"}
                </button>
              </form>
            </>
          )}

          <div className="hairline mt-14" />
          <div className="mt-8">
            <p className="text-sm text-muted-foreground">Prefer email?</p>
            <a
              href={`mailto:${BUSINESS.email}`}
              className="block text-base lg:text-lg text-ink mt-3 hover:text-sea transition-colors break-all"
            >
              {BUSINESS.email}
            </a>
            <p className="mt-6 text-ink-soft">
              {BUSINESS.name}<br />
              {BUSINESS.location}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required }) {
  return (
    <div>
      <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea min-h-[44px]"
      />
    </div>
  );
}