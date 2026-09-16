import { useState } from "react";
import PageHero from "@/components/PageHero";
import Seo from "@/components/Seo";
import { SITE_ORIGIN } from "@/lib/structuredData";
import { BUSINESS } from "@/lib/siteConfig";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

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
        <div className="grid md:grid-cols-12 gap-10 md:gap-12">
          <div className="md:col-span-5">
            <p className="text-sm text-muted-foreground">Direct</p>
            <a href={`mailto:${BUSINESS.email}`} className="block text-2xl md:text-3xl text-ink mt-3 hover:text-sea transition-colors break-all">
              {BUSINESS.email}
            </a>
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="block text-base text-ink-soft mt-4 hover:text-sea transition-colors tnum">
              {BUSINESS.phone}
            </a>
            <div className="hairline mt-8" />
            <p className="mt-6 text-ink-soft">
              {BUSINESS.name}<br />
              {BUSINESS.location}
            </p>
          </div>

          <div className="md:col-span-7">
            {sent ? (
              <div className="bg-ink text-white p-8 md:p-10">
                <p className="text-xs tracking-wide uppercase text-signal">Message sent</p>
                <p className="text-3xl text-white mt-3">Thank you — we'll be in touch.</p>
                <p className="text-white/70 mt-4">Your enquiry has been noted. The owner replies personally, usually within a day.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setSent(true);
                }}
                className="space-y-8"
              >
                <Field label="Your name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
                <Field label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required />
                <div>
                  <label className="text-xs tracking-wide uppercase text-muted-foreground block mb-2">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full bg-transparent border-b border-line py-3 text-ink focus:outline-none focus:border-sea resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-sea text-white px-8 py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
                >
                  Send Enquiry
                </button>
              </form>
            )}
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