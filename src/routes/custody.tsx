import { createFileRoute } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getAll, put, del, uid, type CustodyEntry, type Executor } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, FileDown, ImagePlus } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportPDF, htmlKV, htmlEscape } from "@/lib/pdf";

export const Route = createFileRoute("/custody")({
  component: () => (<AuthGate><AppShell><Custody /></AppShell></AuthGate>),
});

const todayISO = () => new Date().toISOString().slice(0, 10);

function Custody() {
  const [items, setItems] = useState<CustodyEntry[]>([]);
  const [editing, setEditing] = useState<CustodyEntry | null>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const [executors, setExecutors] = useState<Executor[]>([]);
  useEffect(() => { (async () => setExecutors(await getAll("executors")))(); }, []);

  async function load() {
    const all = await getAll<CustodyEntry>("custody");
    all.sort((a, b) => b.createdAt - a.createdAt);
    setItems(all);
  }
  useEffect(() => { load(); }, []);

  async function add() {
    const all = await getAll<CustodyEntry>("custody");
    const next = (all.reduce((m, x) => Math.max(m, x.number || 0), 0) || 0) + 1;
    setEditing({ id: uid(), number: next, text: "", image: undefined, deliveryDate: todayISO(), executor: executors[0]?.name || "", createdAt: Date.now() });
  }
  async function save(e: CustodyEntry) { await put("custody", e); setEditing(null); load(); }
  async function exportPdf(e: CustodyEntry) {
    const body = htmlKV([["الرقم", e.number], ["المحور", e.executor || ""], ["تاريخ التسليم", e.deliveryDate]]) +
      `<h3 style="color:#2d4a2d;">تفاصيل العهدة</h3>` +
      `<div style="border:1px solid #cfd8cf; padding:10px; white-space:pre-wrap;">${htmlEscape(e.text)}</div>` +
      (e.image ? `<div style="margin-top:12px;"><img src="${e.image}" style="max-width:100%; border:1px solid #cfd8cf;" /></div>` : "");
    await exportPDF({ title: `عهدة رقم ${e.number}`, bodyHtml: body, filename: `عهدة-${e.number}.pdf` });
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gold">العهدات</h1>
        <Button onClick={add} className="gap-1 bg-primary"><Plus className="w-4 h-4" /> إضافة</Button>
      </div>

      {items.length === 0 && <div className="text-center text-muted-foreground py-8">لا توجد عهدات</div>}

      {items.map((e) => (
        <div key={e.id} className="military-card rounded-xl p-4">
          <div className="flex justify-between items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gold">عهدة #{e.number}</div>
              <div className="text-xs text-muted-foreground">تسليم: {e.deliveryDate}</div>
              {e.executor && <div className="text-xs text-muted-foreground">المحور: {e.executor}</div>}
              <div className="text-sm mt-2 whitespace-pre-wrap break-words">{e.text}</div>
            </div>
            {e.image && <img src={e.image} alt="عهدة" className="w-20 h-20 object-cover rounded-lg border border-border" />}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button size="sm" variant="secondary" onClick={() => setEditing(e)}><Pencil className="w-3 h-3" /></Button>
            <Button size="sm" variant="secondary" onClick={() => exportPdf(e)}><FileDown className="w-3 h-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => setDelId(e.id)}><Trash2 className="w-3 h-3" /></Button>
          </div>
        </div>
      ))}

      {editing && <CustodyEditor entry={editing} executors={executors} onSave={save} onCancel={() => setEditing(null)} />}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { if (delId) { await del("custody", delId); setDelId(null); load(); }}}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function CustodyEditor({ entry, executors, onSave, onCancel }: { entry: CustodyEntry; executors: Executor[]; onSave: (e: CustodyEntry) => void; onCancel: () => void }) {
  const [e, setE] = useState<CustodyEntry>(entry);

  function onFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => setE({ ...e, image: reader.result as string });
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 overflow-auto">
      <div className="military-card rounded-xl p-4 w-full max-w-md space-y-3 my-4">
        <h3 className="font-bold text-gold">عهدة #{e.number}</h3>
        <div>
          <Label className="mb-1 block">المحور</Label>
          <Select value={e.executor || ""} onValueChange={(v) => setE({ ...e, executor: v })}>
            <SelectTrigger><SelectValue placeholder="اختر المحور..." /></SelectTrigger>
            <SelectContent>{executors.map((x) => <SelectItem key={x.id} value={x.name}>{x.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label className="mb-1 block">النص</Label><Textarea value={e.text} onChange={(ev) => setE({ ...e, text: ev.target.value })} rows={5} /></div>
        <div><Label className="mb-1 block">تاريخ التسليم</Label><Input type="date" value={e.deliveryDate} onChange={(ev) => setE({ ...e, deliveryDate: ev.target.value })} /></div>
        <div>
          <Label className="mb-1 block">صورة (اختياري)</Label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/30">
            <ImagePlus className="w-4 h-4" />
            <span className="text-sm">اختر صورة</span>
            <input type="file" accept="image/*" className="hidden" onChange={(ev) => ev.target.files?.[0] && onFile(ev.target.files[0])} />
          </label>
          {e.image && <img src={e.image} alt="" className="mt-2 max-h-40 rounded-lg border border-border" />}
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-primary" onClick={() => onSave(e)}>حفظ</Button>
          <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}
