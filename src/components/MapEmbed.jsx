import { useEffect, useState } from "react";
import { MapPin, ExternalLink } from "lucide-react";

// Google Maps embed iframe renders blank inside many in-app browsers —
// Facebook and Instagram in particular block cross-origin iframes from
// google.com. Detect those environments (and any UA advertising an in-app
// webview) and show a tappable "Open in Google Maps" card instead, which
// reliably opens the native maps app. Normal browsers keep the live embed.
function isRestrictiveInAppBrowser() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  // Facebook / Instagram in-app browsers
  if (/FBAN|FBAV|Instagram/i.test(ua)) return true;
  // Generic in-app webview (LinkedIn, TikTok, X, Snapchat, etc.)
  if (/LinkedInApp|TikTok|Snapchat|Twitter|X\/.*\(.*in-app/i.test(ua)) return true;
  return false;
}

export default function MapEmbed({ embedSrc, directionsUrl, title }) {
  const [restricted, setRestricted] = useState(false);

  useEffect(() => {
    setRestricted(isRestrictiveInAppBrowser());
  }, []);

  if (restricted) {
    return (
      <a
        href={directionsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex w-full h-full min-h-[260px] md:min-h-[320px] bg-offseason border border-line items-center justify-center text-center px-6"
      >
        <span className="flex flex-col items-center gap-3">
          <span className="flex items-center justify-center w-12 h-12 rounded-full bg-sea text-white">
            <MapPin className="w-6 h-6" strokeWidth={1.5} />
          </span>
          <span className="text-base text-ink font-medium">Open in Google Maps</span>
          <span className="text-sm text-muted-foreground max-w-xs">
            Your browser won't display the embedded map here. Tap to open Polperro Holiday Park in Google Maps.
          </span>
          <span className="inline-flex items-center gap-2 bg-ink text-white px-5 py-2.5 text-sm font-medium mt-1">
            Directions <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
          </span>
        </span>
      </a>
    );
  }

  return (
    <iframe
      title={title}
      src={embedSrc}
      className="w-full h-full"
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}