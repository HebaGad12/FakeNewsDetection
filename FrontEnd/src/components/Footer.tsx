import { Link } from "react-router-dom";
import { Shield, Mail, Radio, Users, Newspaper } from "lucide-react";

const footerLinks = {
  Explore: [
    { label: "News Feed", href: "/feed" },
    { label: "Communities", href: "/communities" },
    { label: "Live Streams", href: "/live" },
  ],
  Account: [
    { label: "Sign In", href: "/login" },
    { label: "Register", href: "/register" },
    { label: "Dashboard", href: "/dashboard" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-slate-950 text-white">
      <div className="news-container py-12">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link to="/" className="mb-5 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-red-600">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-display text-2xl font-bold">TruthTrack</span>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                  Independent News Desk
                </p>
              </div>
            </Link>
            <p className="max-w-sm text-sm leading-6 text-slate-300">
              A premium news and verification platform for readers, journalists, and communities that care about source-backed reporting.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Verification Active
            </div>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="mb-4 font-semibold text-white">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="text-sm text-slate-400 transition-colors hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <h4 className="mb-4 font-semibold text-white">Signals</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2"><Newspaper className="h-4 w-4 text-red-400" /> Verified reporting</li>
              <li className="flex items-center gap-2"><Users className="h-4 w-4 text-red-400" /> Community checks</li>
              <li className="flex items-center gap-2"><Radio className="h-4 w-4 text-red-400" /> Live coverage</li>
              <li className="flex items-center gap-2"><Mail className="h-4 w-4 text-red-400" /> Source-first updates</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} TruthTrack. All rights reserved.
          </p>
          <p className="text-sm text-slate-400">Built for readers who verify before they share.</p>
        </div>
      </div>
    </footer>
  );
}
