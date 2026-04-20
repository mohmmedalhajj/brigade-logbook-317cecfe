import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle2 } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already installed (running as standalone PWA)?
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari
      (window.navigator as any).standalone === true;
    if (standalone) {
      setInstalled(true);
      return;
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);

    // iOS doesn't support beforeinstallprompt — show manual hint
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
    if (isIOS) setIosHint(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
  }

  if (installed) {
    return (
      <div className="military-card rounded-xl p-3 flex items-center gap-2 text-sm text-gold">
        <CheckCircle2 className="w-4 h-4" />
        التطبيق مثبت على جهازك
      </div>
    );
  }

  if (deferred) {
    return (
      <Button onClick={handleInstall} className="w-full bg-primary gap-2">
        <Download className="w-4 h-4" />
        تثبيت التطبيق على الجهاز
      </Button>
    );
  }

  if (iosHint) {
    return (
      <div className="military-card rounded-xl p-3 text-xs text-muted-foreground leading-6">
        لتثبيت التطبيق على iPhone: افتحه في Safari، اضغط زر المشاركة
        <span className="mx-1">⬆️</span>
        ثم اختر <span className="text-gold">"إضافة إلى الشاشة الرئيسية"</span>.
      </div>
    );
  }

  return (
    <div className="military-card rounded-xl p-3 text-xs text-muted-foreground leading-6">
      لتثبيت التطبيق: افتح قائمة المتصفح ⋮ ثم اختر
      <span className="text-gold mx-1">"تثبيت التطبيق"</span> أو
      <span className="text-gold mx-1">"إضافة إلى الشاشة الرئيسية"</span>.
      <div className="mt-1 opacity-70">يجب نشر التطبيق وفتحه من الرابط المنشور (وليس من المعاينة) لظهور خيار التثبيت.</div>
    </div>
  );
}
