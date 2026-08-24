import { Link } from "react-router-dom";
import { NAV_LINKS, BUSINESS } from "@/lib/siteConfig";

export default function Footer() {
  return (
    <footer className="bg-cornish-slate text-salt">
      <div className="max-w-[1400px] mx-auto px-6 md:px-10 py-20 md:py-28">
        <div className="grid md:grid-cols-12 gap-12">
          <div className="md:col-span-5">
            <p className="font-display text-4xl md:text-5xl text-salt leading-none">{BUSINESS.tagline}</p>
            <p className="mt-6 font-mono text-[0.7rem] tracking-[0.25em] uppercase text-salt/60 max-w-xs">
              {BUSINESS.name} · {BUSINESS.location}
            </p>
          </div>

          <nav className="md:col-span-4 grid grid-cols-2 gap-x-6 gap-y-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                className="font-mono text-xs tracking-[0.15em] uppercase text-salt/70 hover:text-gorse transition-colors min-h-[44px] flex items-center"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="md:col-span-3">
            <p className="eyebrow text-salt/50">Enquiries</p>
            <a href={`mailto:${BUSINESS.email}`} className="block mt-4 text-salt hover:text-gorse transition-colors">
              {BUSINESS.email}
            </a>
            <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="block mt-2 text-salt hover:text-gorse transition-colors">
              {BUSINESS.phone}
            </a>
          </div>
        </div>

        <div className="decking-divider mt-16" />
        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-salt/40">
            © {new Date().getFullYear()} {BUSINESS.name}
          </p>
          <p className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-salt/40">
            Direct booking · No agency · No commission
          </p>
        </div>
      </div>
    </footer>
  );
}