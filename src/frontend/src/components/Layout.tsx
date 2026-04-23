import { Link } from "@tanstack/react-router";
import { Gamepad2, Zap } from "lucide-react";
import type { ReactNode } from "react";

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const year = new Date().getFullYear();
  const hostname = encodeURIComponent(
    typeof window !== "undefined" ? window.location.hostname : "",
  );

  return (
    <div className="min-h-screen flex flex-col bg-background scanline">
      {/* Header */}
      <header
        className="sticky top-0 z-50 bg-card border-b border-border shadow-subtle"
        data-ocid="layout.header"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 group"
            data-ocid="layout.logo_link"
          >
            <div className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-primary/10 border border-primary/30 group-hover:border-primary/60 transition-colors-fast">
              <Gamepad2 className="w-5 h-5 text-primary" />
            </div>
            <div className="leading-none">
              <p className="font-display font-black text-base tracking-tight text-foreground uppercase">
                Maddox
              </p>
              <p className="font-display font-bold text-xs tracking-widest text-muted-foreground uppercase">
                Is That You?
              </p>
            </div>
          </Link>

          {/* Nav */}
          <nav
            className="hidden md:flex items-center gap-1"
            aria-label="Main navigation"
          >
            <Link
              to="/"
              className="px-4 py-2 rounded-md font-display font-semibold text-sm uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors-fast"
              data-ocid="layout.nav_hub"
            >
              Games
            </Link>
          </nav>

          {/* Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25">
            <Zap className="w-3.5 h-3.5 text-primary animate-pulse-glow" />
            <span className="font-mono text-xs font-bold text-primary uppercase tracking-wider">
              Unblocked
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1" data-ocid="layout.main">
        {children}
      </main>

      {/* Footer */}
      <footer
        className="bg-card border-t border-border"
        data-ocid="layout.footer"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            © {year}. Built with love using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${hostname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 transition-colors-fast"
            >
              caffeine.ai
            </a>
          </p>
          <p className="text-muted-foreground text-xs font-mono">
            Play anywhere · No download · No account needed
          </p>
        </div>
      </footer>
    </div>
  );
}
