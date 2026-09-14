import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";

// One-click unsubscribe. Reached via the per-recipient link in every marketing
// email. No email in the URL, no auth — the token identifies the contact.
export default function Unsubscribe() {
  const { token } = useParams();
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    base44.functions
      .invoke("unsubscribeContact", { token })
      .then((res) => {
        const d = res.data || res;
        setStatus(d.ok ? "done" : "error");
      })
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <section className="px-6 md:px-10 max-w-xl mx-auto py-24 md:py-32 text-center">
      {status === "loading" ? (
        <p className="text-sm text-muted-foreground">Processing…</p>
      ) : status === "done" ? (
        <>
          <h1 className="text-3xl md:text-4xl">You're unsubscribed</h1>
          <p className="mt-4 text-ink-soft">You won't receive marketing emails from Ty Dee Seaview Escapes. We'll still reply to any enquiry you make.</p>
          <Link to="/" className="inline-flex mt-8 text-sea underline">Back to the site</Link>
        </>
      ) : (
        <>
          <h1 className="text-3xl md:text-4xl">Link not found</h1>
          <p className="mt-4 text-ink-soft">This unsubscribe link isn't valid. If you'd like to stop these emails, <Link to="/contact" className="text-sea underline">send us a message</Link>.</p>
        </>
      )}
    </section>
  );
}