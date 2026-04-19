import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getAll, put, del, uid, type FuelEntry, type ShellEntry, type Executor } from "@/lib/db";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, Share2, FileDown, AlertCircle, FileText } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { generateFuelWA, generateShellWA, shareWhatsApp } from "@/lib/whatsapp";
import { exportPDF, htmlKV, htmlTable } from "@/lib/pdf";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export const Route = createFileRoute("/allocations")({
  component: () => (
    <AuthGate><AppShell><Allocations /></AppShell></AuthGate>
  ),
});

const FUEL_TYPES = ["بترول", "ديزل"] as const;
const SHELL_TYPES = ["هاون 82", "هاون 60", "MK40"] as const;
const todayISO = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => new Date().toISOString().slice(0, 7);

function Allocations() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-gold">المخصصات</h1>
      <Tabs defaultValue="fuel">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="fuel">المحروقات</TabsTrigger>
          <TabsTrigger value="shells">القذائف</TabsTrigger>
          <TabsTrigger value="stats">إحصائيات</TabsTrigger>
        </TabsList>
        <TabsContent value="fuel"><FuelTab /></TabsContent>
        <TabsContent value="shells"><ShellsTab /></TabsContent>
        <TabsContent value="stats"><StatsTab /></TabsContent>
      </Tabs>
    </div>
  );
}

function FuelTab() {
  const [items, setItems] = useState<FuelEntry[]>([]);
  const [editing, setEditing] = useState<FuelEntry | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  async function load() {
    const all = await getAll<FuelEntry>("fuel");
    all.sort((a, b) => b.date.localeCompare(a.date));
    setItems(all);
  }
  useEffect(() => { load(); }, []);

  const [executors, setExecutors] = useState<Executor[]>([]);
  useEffect(() => { (async () => setExecutors(await getAll("executors")))(); }, []);

  function emptyEntry(): FuelEntry {
    return { id: uid(), type: "بترول", monthlyAllowance: 0, withdrawn: 0, date: todayISO(), month: currentMonth(), executor: executors[0]?.name || "", notes: "" };
  }

  // remaining per type for current month
  const monthlyRemaining = (type: string) => {
    const month = currentMonth();
    const sameType = items.filter((i) => i.type === type && i.month === month);
    if (sameType.length === 0) return null;
    const allowance = Math.max(...sameType.map((s) => s.monthlyAllowance || 0));
    const withdrawn = sameType.reduce((s, e) => s + (Number(e.withdrawn) || 0), 0);
    return { allowance, withdrawn, remaining: allowance - withdrawn };
  };

  async function save(e: FuelEntry) {
    // enforce: cannot exceed remaining
    const month = e.month || currentMonth();
    const others = items.filter((i) => i.type === e.type && i.month === month && i.id !== e.id);
    const allowance = Math.max(e.monthlyAllowance || 0, ...others.map((s) => s.monthlyAllowance || 0));
    const totalWithdrawn = others.reduce((s, x) => s + (Number(x.withdrawn) || 0), 0) + Number(e.withdrawn || 0);
    if (totalWithdrawn > allowance) {
      alert(`تنبيه: تم تجاوز المخصص الشهري (${allowance}). المسحوب الكلي: ${totalWithdrawn}`);
      return;
    }
    await put("fuel", { ...e, month });
    setEditing(null);
    load();
  }

  async function exportPdf(e: FuelEntry) {
    await exportPDF({
      title: "تقرير محروقات",
      bodyHtml: htmlKV([
        ["النوع", e.type],
        ["المحور", e.executor || ""],
        ["الاستحقاق الشهري", e.monthlyAllowance],
        ["المسحوب", e.withdrawn],
        ["المتبقي", e.monthlyAllowance - e.withdrawn],
        ["التاريخ", e.date],
        ["الشهر", e.month],
        ["ملاحظات", e.notes],
      ]),
      filename: `fuel-${e.id}.pdf`,
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing(emptyEntry())} className="gap-1 bg-primary"><Plus className="w-4 h-4" /> إضافة محروقات</Button>

      {FUEL_TYPES.map((t) => {
        const r = monthlyRemaining(t);
        if (!r) return null;
        const low = r.remaining <= 0;
        return (
          <div key={t} className={`rounded-lg p-3 border ${low ? "border-destructive bg-destructive/10" : "border-border bg-muted/20"}`}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold">{t}</span>
              <span>المتبقي: <b className={low ? "text-destructive" : "text-gold"}>{r.remaining}</b> / {r.allowance}</span>
            </div>
            {low && <div className="flex items-center gap-1 text-xs text-destructive mt-1"><AlertCircle className="w-3 h-3" /> نفد المخصص — التجديد بداية الشهر</div>}
          </div>
        );
      })}

      {items.map((e) => (
        <div key={e.id} className="military-card rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-gold">{e.type}</div>
              <div className="text-xs text-muted-foreground mt-1">{e.date} • {e.month}</div>
              {e.executor && <div className="text-xs text-muted-foreground">المحور: {e.executor}</div>}
              <div className="text-sm mt-2">
                المخصص: <b>{e.monthlyAllowance}</b> | المسحوب: <b>{e.withdrawn}</b> | المتبقي: <b className="text-gold">{e.monthlyAllowance - e.withdrawn}</b>
              </div>
              {e.notes && <div className="text-xs text-muted-foreground mt-1">{e.notes}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setEditing(e)}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" onClick={() => shareWhatsApp(generateFuelWA(e))}><Share2 className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" onClick={() => exportPdf(e)}><FileText className="w-3 h-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => setDelId(e.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      ))}

      {items.length === 0 && <div className="text-center text-muted-foreground py-8">لا توجد سجلات</div>}

      {editing && (
        <FuelEditor entry={editing} executors={executors} onSave={save} onCancel={() => setEditing(null)} />
      )}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { if (delId) { await del("fuel", delId); setDelId(null); load(); }}}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FuelEditor({ entry, executors, onSave, onCancel }: { entry: FuelEntry; executors: Executor[]; onSave: (e: FuelEntry) => void; onCancel: () => void }) {
  const [e, setE] = useState<FuelEntry>(entry);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="military-card rounded-xl p-4 w-full max-w-md space-y-3">
        <h3 className="font-bold text-gold">إدخال محروقات</h3>
        <div>
          <Label className="mb-1 block">النوع</Label>
          <Select value={e.type} onValueChange={(v) => setE({ ...e, type: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="mb-1 block">المحور</Label>
          <Select value={e.executor || ""} onValueChange={(v) => setE({ ...e, executor: v })}>
            <SelectTrigger><SelectValue placeholder="اختر المحور..." /></SelectTrigger>
            <SelectContent>
              {executors.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="mb-1 block">الاستحقاق الشهري</Label><Input type="number" value={e.monthlyAllowance} onChange={(ev) => setE({ ...e, monthlyAllowance: Number(ev.target.value) })} /></div>
          <div><Label className="mb-1 block">المسحوب</Label><Input type="number" value={e.withdrawn} onChange={(ev) => setE({ ...e, withdrawn: Number(ev.target.value) })} /></div>
          <div><Label className="mb-1 block">التاريخ</Label><Input type="date" value={e.date} onChange={(ev) => setE({ ...e, date: ev.target.value })} /></div>
          <div><Label className="mb-1 block">الشهر</Label><Input type="month" value={e.month} onChange={(ev) => setE({ ...e, month: ev.target.value })} /></div>
        </div>
        <div><Label className="mb-1 block">ملاحظات</Label><Textarea value={e.notes || ""} onChange={(ev) => setE({ ...e, notes: ev.target.value })} rows={2} /></div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-primary" onClick={() => onSave(e)}>حفظ</Button>
          <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

function ShellsTab() {
  const [items, setItems] = useState<ShellEntry[]>([]);
  const [editing, setEditing] = useState<ShellEntry | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);
  useEffect(() => { (async () => setExecutors(await getAll("executors")))(); }, []);

  async function load() {
    const all = await getAll<ShellEntry>("shells");
    all.sort((a, b) => b.date.localeCompare(a.date));
    setItems(all);
  }
  useEffect(() => { load(); }, []);

  function empty(): ShellEntry { return { id: uid(), type: "هاون 82", count: 0, date: todayISO(), executor: executors[0]?.name || "", notes: "" }; }
  async function save(e: ShellEntry) { await put("shells", e); setEditing(null); load(); }
  async function exportPdf(e: ShellEntry) {
    await exportPDF({
      title: "تقرير قذائف",
      bodyHtml: htmlKV([["النوع", e.type], ["المحور", e.executor || ""], ["العدد", e.count], ["التاريخ", e.date], ["ملاحظات", e.notes]]),
      filename: `shells-${e.id}.pdf`,
    });
  }

  return (
    <div className="space-y-3">
      <Button onClick={() => setEditing(empty())} className="gap-1 bg-primary"><Plus className="w-4 h-4" /> إضافة قذائف</Button>
      {items.map((e) => (
        <div key={e.id} className="military-card rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-gold">{e.type}</div>
              <div className="text-xs text-muted-foreground">{e.date}</div>
              {e.executor && <div className="text-xs text-muted-foreground">المحور: {e.executor}</div>}
              <div className="text-sm mt-1">العدد: <b>{e.count}</b></div>
              {e.notes && <div className="text-xs text-muted-foreground mt-1">{e.notes}</div>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setEditing(e)}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" onClick={() => shareWhatsApp(generateShellWA(e))}><Share2 className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" onClick={() => exportPdf(e)}><FileText className="w-3 h-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => setDelId(e.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="text-center text-muted-foreground py-8">لا توجد سجلات</div>}

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="military-card rounded-xl p-4 w-full max-w-md space-y-3">
            <h3 className="font-bold text-gold">إدخال قذائف</h3>
            <div>
              <Label className="mb-1 block">النوع</Label>
              <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SHELL_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="mb-1 block">المحور</Label>
              <Select value={editing.executor || ""} onValueChange={(v) => setEditing({ ...editing, executor: v })}>
                <SelectTrigger><SelectValue placeholder="اختر المحور..." /></SelectTrigger>
                <SelectContent>{executors.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="mb-1 block">العدد</Label><Input type="number" value={editing.count} onChange={(e) => setEditing({ ...editing, count: Number(e.target.value) })} /></div>
              <div><Label className="mb-1 block">التاريخ</Label><Input type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} /></div>
            </div>
            <div><Label className="mb-1 block">ملاحظات</Label><Textarea value={editing.notes || ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} rows={2} /></div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-primary" onClick={() => save(editing)}>حفظ</Button>
              <Button variant="secondary" onClick={() => setEditing(null)}>إلغاء</Button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { if (delId) { await del("shells", delId); setDelId(null); load(); }}}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatsTab() {
  const [fuel, setFuel] = useState<FuelEntry[]>([]);
  const [shells, setShells] = useState<ShellEntry[]>([]);
  useEffect(() => {
    (async () => { setFuel(await getAll("fuel")); setShells(await getAll("shells")); })();
  }, []);

  const fuelData = FUEL_TYPES.map((t) => ({ name: t, value: fuel.filter((f) => f.type === t).reduce((s, f) => s + (f.withdrawn || 0), 0) }));
  const shellData = SHELL_TYPES.map((t) => ({ name: t, value: shells.filter((s) => s.type === t).reduce((s2, e) => s2 + e.count, 0) }));

  async function exportMonthly() {
    const month = currentMonth();
    const f = fuel.filter((x) => x.month === month);
    const s = shells.filter((x) => x.date.startsWith(month));
    const body =
      `<h3 style="color:#2d4a2d;">المحروقات</h3>` +
      htmlTable(["النوع", "المخصص", "المسحوب", "المتبقي"], f.map((x) => [x.type, x.monthlyAllowance, x.withdrawn, x.monthlyAllowance - x.withdrawn])) +
      `<h3 style="color:#2d4a2d;">القذائف</h3>` +
      htmlTable(["النوع", "العدد", "التاريخ"], s.map((x) => [x.type, x.count, x.date]));
    await exportPDF({ title: `تقرير المخصصات الشهري - ${month}`, bodyHtml: body, filename: `allocations-${month}.pdf` });
  }

  return (
    <div className="space-y-3">
      <Button onClick={exportMonthly} className="gap-1"><FileDown className="w-4 h-4" /> تقرير شهري PDF</Button>
      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold text-gold mb-3">المحروقات (مسحوب)</h3>
        <div className="h-56"><ResponsiveContainer><BarChart data={fuelData}><CartesianGrid strokeDasharray="3 3" stroke="#3a4a3a" /><XAxis dataKey="name" stroke="#9aa39a" /><YAxis stroke="#9aa39a" /><Tooltip /><Bar dataKey="value" fill="#a02828" /></BarChart></ResponsiveContainer></div>
      </div>
      <div className="military-card rounded-xl p-4">
        <h3 className="font-bold text-gold mb-3">القذائف</h3>
        <div className="h-56"><ResponsiveContainer><BarChart data={shellData}><CartesianGrid strokeDasharray="3 3" stroke="#3a4a3a" /><XAxis dataKey="name" stroke="#9aa39a" /><YAxis stroke="#9aa39a" /><Tooltip /><Bar dataKey="value" fill="#4a7a4a" /></BarChart></ResponsiveContainer></div>
      </div>
    </div>
  );
}
