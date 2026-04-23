import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { isAuthed } from "@/lib/auth";
import { seedIfEmpty } from "@/lib/seed";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
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
    })();
    return () => { mounted = false; };
  }, [nav]);

  if (!ready) return null;
  return <>{children}</>;
}
