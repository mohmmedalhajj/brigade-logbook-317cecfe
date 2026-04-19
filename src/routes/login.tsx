import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { login } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import logo from "@/assets/logo.jpg";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const nav = useNavigate();
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (login(u.trim(), p)) {
      nav({ to: "/" });
    } else {
      setErr("اسم المستخدم أو كلمة المرور غير صحيحة");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={logo} alt="شعار" className="w-32 h-32 mx-auto rounded-full object-cover logo-glow ring-4 ring-gold/40" />
          <div className="mt-4 font-bold text-xl">صقور اللواء الأول مغاوير</div>
          <div className="mt-1 text-xs text-muted-foreground">وَمَا رَمَيْتَ إِذْ رَمَيْتَ وَلَكِنَّ اللَّهَ رَمَى</div>
        </div>
        <form onSubmit={submit} className="military-card rounded-xl p-5 space-y-4">
          <h2 className="text-lg font-bold text-center text-gold">تسجيل الدخول</h2>
          <div>
            <Label className="mb-1 block">اسم المستخدم</Label>
            <Input value={u} onChange={(e) => setU(e.target.value)} autoComplete="username" required />
          </div>
          <div>
            <Label className="mb-1 block">كلمة المرور</Label>
            <div className="relative">
              <Input
                type={show ? "text" : "password"}
                value={p}
                onChange={(e) => setP(e.target.value)}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute inset-y-0 left-2 flex items-center text-muted-foreground"
              >
                {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {err && <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded p-2 text-center">{err}</div>}
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90">دخول</Button>
        </form>
      </div>
    </div>
  );
}
