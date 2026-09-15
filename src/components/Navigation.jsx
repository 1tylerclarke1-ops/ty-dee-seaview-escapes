import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAV_LINKS, BUSINESS } from "@/lib/siteConfig";

export default function Navigation() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const solid = scrolled || location.pathname !== "/";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${
          solid ? "bg-base/90 backdrop-blur-md border-b border-line" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="inline-flex items-baseline gap-3">
            <span className={`text-lg md:text-2xl leading-none whitespace-nowrap ${solid ? "text-ink" : "text-white"}`} style={{ fontFamily: "var(--font-display)" }}>
              Ty Dee Seaview Escapes
            </span>
            <span className={`hidden md:inline text-[0.7rem] tracking-wide ${solid ? "text-muted-foreground" : "text-white/70"}`}>
              Looe &amp; Polperro, Cornwall
            </span>
          </Link>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className={`inline-flex items-center gap-3 min-h-[44px] px-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-sea ${
              solid ? "text-ink" : "text-white"
            }`}
          >
            <span className="text-xs tracking-wide uppercase">Menu</span>
            <Menu className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-[1200] bg-ink flex flex-col">
          <div className="h-20 flex items-center justify-between px-6 md:px-10 max-w-[1400px] mx-auto w-full">
            <span className="text-lg md:text-3xl text-white whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>Ty Dee Seaview Escapes</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="inline-flex items-center gap-3 min-h-[44px] px-3 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-sea"
            >
              <span className="text-xs tracking-wide uppercase">Close</span>
              <X className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>

          <nav className="flex-1 flex flex-col justify-center px-6 md:px-10 max-w-[1400px] mx-auto w-full">
            {NAV_LINKS.map((link, i) => {
              const active = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className="group flex items-baseline gap-6 py-2 md:py-3 border-b border-white/10"
                >
                  <span className="text-[0.7rem] tnum text-white/40 w-8">{String(i + 1).padStart(2, "0")}</span>
                  <span className={`text-4xl md:text-6xl lg:text-7xl transition-colors ${active ? "text-sea" : "text-white group-hover:text-sea"}`}>
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full pb-10">
            <p className="text-[0.7rem] tracking-wide uppercase text-white/50">{BUSINESS.location}</p>
          </div>
        </div>
      )}
    </>
  );
}