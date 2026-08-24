import { useState } from "react";
import PageHero from "@/components/PageHero";
import { BUSINESS } from "@/lib/siteConfig";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [sent, setSent] = useState(false);

  return (
    <div>
      <PageHero
        eyebrow="Get in Touch"
        title="Contact"
        subtitle="Questions about the caravan, the area, or bringing your dog? The owner is happy to help — and to talk you through the view."
      />

      <section className="px-6 md:px-10 max-w-[1400px] mx-auto pb-24 md:pb-40">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <p className="eyebrow">Direct</p>
            <a href={`mailto:${BUSINESS.email}`} className="block font-display text-3xl md:text-4xl text-atlantic mt-4 hover:text-gorse transition-colors">
              {BUSINESS.email}
            </a>
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="block font-mono text-sm text-cornish-slate mt-4 hover:text-gorse transition-colors">
              {BUSINESS.phone}
            </a>
            <div className="mt-10 decking-divider" />
            <p className="mt-6 text-cornish-slate">
              {BUSINESS.name}<br />
              {BUSINESS.location}
            </p>
          </div>

          <div className="md:col-span-7">
            {sent ? (
              <div className="bg-atlantic text-salt p-10">
                <p className="font-mono text-[0.6rem] tracking-[0.25em] uppercase text-gorse">Message sent</p>
                <p className="font-display text-3xl mt-3">Thank you — we'll be in touch.</p>
                <p className="text-salt/70 mt-4">Your enquiry has been noted. The owner replies personally, usually within a day.</p>
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
                  <label className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-cornish-slate block mb-2">Message</label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    rows={5}
                    className="w-full bg-transparent border-b border-cornish-slate/30 py-3 text-atlantic focus:outline-none focus:border-gorse resize-none"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-gorse text-atlantic px-8 py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-atlantic hover:text-salt transition-colors min-h-[44px]"
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
      <label className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-cornish-slate block mb-2">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-transparent border-b border-cornish-slate/30 py-3 text-atlantic focus:outline-none focus:border-gorse min-h-[44px]"
      />
    </div>
  );
}