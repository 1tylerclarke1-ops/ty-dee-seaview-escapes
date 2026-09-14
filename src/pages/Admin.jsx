import { useState } from "react";
import { Lock } from "lucide-react";
import { BUSINESS } from "@/lib/siteConfig";
import PitchFeeTracker from "@/components/admin/PitchFeeTracker";

export default function Admin() {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  // Placeholder gate — real auth to be wired with the booking engine.
  const handleLogin = (e) => {
    e.preventDefault();
    if (password.length > 0) {
      setAuthed(true);
      setError(false);
    } else {
      setError(true);
    }
  };

  if (authed) {
    return (
      <div className="min-h-screen bg-ink text-white px-6 md:px-10 py-12 md:py-16">
        <div className="max-w-[1100px] mx-auto">
          <p className="text-sm text-white/50">Owner dashboard</p>
          <h1 className="text-4xl md:text-5xl text-white mt-2">{BUSINESS.name}</h1>
          <div className="border-t border-white/10 mt-8 mb-10" />
          <div className="mb-12">
            <h2 className="text-2xl text-white mb-6">Pitch fee tracker</h2>
            <PitchFeeTracker />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink text-white flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <Lock className="w-8 h-8 text-sea" strokeWidth={1.25} />
        </div>
        <p className="text-sm text-white/50 text-center">Owner access</p>
        <h1 className="text-4xl text-white text-center mt-3">Admin</h1>
        <div className="mt-10">
          <label className="text-xs tracking-wide uppercase text-white/50 block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b border-white/30 py-3 text-white focus:outline-none focus:border-sea min-h-[44px]"
          />
          {error && <p className="text-xs text-signal mt-3">A password is required.</p>}
        </div>
        <button
          type="submit"
          className="mt-8 w-full bg-sea text-white py-4 text-sm font-medium hover:bg-sea-deep transition-colors min-h-[44px]"
        >
          Enter
        </button>
      </form>
    </div>
  );
}