import { useState } from "react";
import { Lock } from "lucide-react";
import { BUSINESS } from "@/lib/siteConfig";

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
      <div className="min-h-screen bg-atlantic text-salt flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center">
          <p className="eyebrow text-salt/50">Admin</p>
          <h1 className="font-display text-5xl mt-4">{BUSINESS.name}</h1>
          <p className="text-salt/70 mt-6">
            The owner dashboard — booking management, availability and reporting — will appear here once the booking engine is built.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-atlantic text-salt flex items-center justify-center px-6">
      <form onSubmit={handleLogin} className="max-w-sm w-full">
        <div className="flex justify-center mb-8">
          <Lock className="w-8 h-8 text-gorse" strokeWidth={1.25} />
        </div>
        <p className="eyebrow text-salt/50 text-center">Owner access</p>
        <h1 className="font-display text-4xl text-salt text-center mt-3">Admin</h1>
        <div className="mt-10">
          <label className="font-mono text-[0.65rem] tracking-[0.2em] uppercase text-salt/50 block mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-transparent border-b border-salt/30 py-3 text-salt focus:outline-none focus:border-gorse"
          />
          {error && <p className="font-mono text-xs text-gorse mt-3">A password is required.</p>}
        </div>
        <button
          type="submit"
          className="mt-8 w-full bg-gorse text-atlantic py-4 font-mono text-xs tracking-[0.25em] uppercase hover:bg-salt transition-colors min-h-[44px]"
        >
          Enter
        </button>
      </form>
    </div>
  );
}