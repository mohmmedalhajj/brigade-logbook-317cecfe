import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListTodo, BarChart3, Fuel, Package, Settings as SettingsIcon } from "lucide-react";
import logo from "@/assets/logo.jpg";

const items = [
  { to: "/", label: "الرئيسية", icon: Home },
  { to: "/missions", label: "المهام", icon: ListTodo },
  { to: "/stats", label: "الإحصائيات", icon: BarChart3 },
  { to: "/allocations", label: "المخصصات", icon: Fuel },
  { to: "/custody", label: "العهدات", icon: Package },
  { to: "/settings", label: "الإعدادات", icon: SettingsIcon },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="military-gradient border-b border-border sticky top-0 z-40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <img src={logo} alt="شعار" className="w-11 h-11 rounded-full object-cover ring-2 ring-gold/60" />
          <div className="flex-1">
            <div className="font-bold text-base leading-tight">اللواء 35 مشاة</div>
            <div className="text-[11px] text-muted-foreground leading-tight">وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَكِنَّ اللَّهَ رَمَى</div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-4 pb-24">{children}</main>

      <nav className="fixed bottom-0 inset-x-0 z-40 military-gradient border-t border-border">
        <div className="max-w-5xl mx-auto grid grid-cols-6">
          {items.map((it) => {
            const active = loc.pathname === it.to || (it.to !== "/" && loc.pathname.startsWith(it.to));
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={`flex flex-col items-center justify-center py-2 text-[10px] gap-0.5 transition ${
                  active ? "text-gold" : "text-muted-foreground"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
