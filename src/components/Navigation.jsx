import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  // Admin link appears only when ?admin is present (kept out of DOM otherwise)
  const showAdmin = new URLSearchParams(window.location.search).has("admin");

  const solid = scrolled || location.pathname !== "/";

  return (
    <>
      <header
        className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
          solid ? "bg-salt/90 backdrop-blur-md border-b border-cornish-slate/15" : "bg-transparent"
        }`}
      >
        <div className="max-w-[1400px] mx-auto px-6 md:px-10 h-20 flex items-center justify-between">
          <Link to="/" className="group">
            <span
              className={`font-display text-2xl md:text-3xl tracking-tight transition-colors ${
                solid ? "text-atlantic" : "text-salt"
              }`}
            >
              Ty Dee
            </span>
            <span
              className={`hidden md:inline font-mono text-[0.6rem] tracking-[0.3em] uppercase ml-3 align-middle transition-colors ${
                solid ? "text-cornish-slate" : "text-salt/70"
              }`}
            >
              Seaview Escapes
            </span>
          </Link>

          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className={`flex items-center gap-3 min-h-[44px] px-3 transition-colors ${
              solid ? "text-atlantic" : "text-salt"
            }`}
          >
            <span className="font-mono text-xs tracking-[0.25em] uppercase">Menu</span>
            <Menu className="w-5 h-5" strokeWidth={1.25} />
          </button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="fixed inset-0 z-[60] bg-atlantic flex flex-col"
          >
            <div className="h-20 flex items-center justify-between px-6 md:px-10 max-w-[1400px] mx-auto w-full">
              <span className="font-display text-2xl md:text-3xl text-salt">Ty Dee</span>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex items-center gap-3 min-h-[44px] px-3 text-salt"
              >
                <span className="font-mono text-xs tracking-[0.25em] uppercase">Close</span>
                <X className="w-5 h-5" strokeWidth={1.25} />
              </button>
            </div>

            <motion.nav
              className="flex-1 flex flex-col justify-center px-6 md:px-10 max-w-[1400px] mx-auto w-full"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.06, delayChildren: 0.15 } } }}
            >
              {NAV_LINKS.map((link) => {
                const active = location.pathname === link.path;
                return (
                  <motion.div
                    key={link.path}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                  >
                    <Link
                      to={link.path}
                      className="group flex items-baseline gap-6 py-2 md:py-3 border-b border-salt/10"
                    >
                      <span className="font-mono text-[0.65rem] tracking-[0.25em] text-gorse/70 w-8">
                        {String(NAV_LINKS.indexOf(link) + 1).padStart(2, "0")}
                      </span>
                      <span
                        className={`font-display text-4xl md:text-6xl lg:text-7xl transition-colors ${
                          active ? "text-gorse" : "text-salt group-hover:text-gorse"
                        }`}
                      >
                        {link.label}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
              {showAdmin && (
                <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                  <Link
                    to="/admin"
                    className="group flex items-baseline gap-6 py-2 md:py-3 border-b border-salt/10"
                  >
                    <span className="font-mono text-[0.65rem] tracking-[0.25em] text-gorse/70 w-8">08</span>
                    <span className="font-display text-4xl md:text-6xl lg:text-7xl text-salt/40 group-hover:text-gorse transition-colors">
                      Admin
                    </span>
                  </Link>
                </motion.div>
              )}
            </motion.nav>

            <div className="px-6 md:px-10 max-w-[1400px] mx-auto w-full pb-10">
              <p className="font-mono text-[0.65rem] tracking-[0.25em] uppercase text-salt/50">
                {BUSINESS.location}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}