import { Link } from "react-router-dom";
import { NAV_LINKS, BUSINESS } from "@/lib/siteConfig";

export default function Footer() {
  return (
    <footer className="bg-ink text-base">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-16 md:py-24">
        <div className="grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5">
            <p className="text-3xl md:text-4xl text-white leading-tight" style={{ fontFamily: "var(--font-display)" }}>
              {BUSINESS.tagline}
            </p>
            <p className="mt-5 text-sm text-white/60 max-w-xs">
              {BUSINESS.name} · {BUSINESS.location}
            </p>
            <p className="mt-3 text-sm text-white/60 max-w-xs">
              {BUSINESS.address}. {BUSINESS.postcode}
            </p>
          </div>

          <nav className="md:col-span-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="text-sm text-white/70 hover:text-sea transition-colors min-h-[44px] flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="md:col-span-3">
            <p className="text-sm text-white/50">Enquiries</p>
            <a href={`mailto:${BUSINESS.email}`} className="block mt-3 text-white hover:text-sea transition-colors">
              {BUSINESS.email}
            </a>
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="block mt-2 text-white hover:text-sea transition-colors">
              {BUSINESS.phone}
            </a>
          </div>
        </div>

        <div className="hairline mt-14 border-white/10" />
        <div className="mt-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <p className="text-xs text-white/40">© {new Date().getFullYear()} {BUSINESS.name}</p>
          <p className="text-xs text-white/40">Direct booking · No agency · No commission</p>
        </div>
      </div>
    </footer>
  );
}