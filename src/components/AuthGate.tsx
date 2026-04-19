import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAuthed } from "@/lib/auth";
import { seedIfEmpty } from "@/lib/seed";
import logo from "@/assets/logo.jpg";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try { await seedIfEmpty(); } catch {}
      if (!mounted) return;
      if (!isAuthed()) {
        nav({ to: "/login" });
      }
      setReady(true);
      setTimeout(() => mounted && setShowSplash(false), 1400);
    })();
    return () => { mounted = false; };
  }, [nav]);

  if (showSplash) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <div className="text-center">
          <img
            src={logo}
            alt="شعار"
            className="w-40 h-40 mx-auto rounded-full object-cover logo-glow ring-4 ring-gold/40"
          />
          <div className="mt-6 font-bold text-xl">صقور اللواء الأول مغاوير</div>
          <div className="mt-2 text-sm text-muted-foreground">وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَكِنَّ اللَّهَ رَمَى</div>
        </div>
      </div>
    );
  }

  if (!ready) return null;
  return <>{children}</>;
}
