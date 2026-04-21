import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { getAll, del, type MissionBase, type MissionType } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Share2, FileDown, Search } from "lucide-react";
import { generateWhatsApp, shareWhatsApp, shareWhatsAppWithMedia } from "@/lib/whatsapp";
import { missionToPDF } from "@/lib/missionPdf";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/missions/")({
  component: () => (
    <AuthGate>
      <AppShell>
        <MissionsList />
      </AppShell>
    </AuthGate>
  ),
});

function MissionsList() {
  const nav = useNavigate();
  const [items, setItems] = useState<MissionBase[]>([]);
  const [types, setTypes] = useState<MissionType[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [q, setQ] = useState("");
  const [delId, setDelId] = useState<string | null>(null);

  async function load() {
    const m = await getAll<MissionBase>("missions");
    m.sort((a, b) => b.createdAt - a.createdAt);
    setItems(m);
    setTypes(await getAll("missionTypes"));
  }
  useEffect(() => {
    load();
  }, []);

  const typeName = (id: string) => types.find((t) => t.id === id)?.name || id;

  const filtered = useMemo(() => {
    return items.filter((m) => {
      if (filter !== "all" && m.type !== filter) return false;
      if (q) {
        const txt = `${m.data?.missionNumber || ""} ${m.data?.date || ""} ${m.data?.sector || ""}`.toLowerCase();
        if (!txt.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, filter, q]);

  async function confirmDel() {
    if (!delId) return;
    await del("missions", delId);
    setDelId(null);
    load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-gold">المهام</h1>
        <Button onClick={() => nav({ to: "/missions/new" })} className="bg-primary gap-1">
          <Plus className="w-4 h-4" /> إضافة
        </Button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="بحث برقم/تاريخ/قطاع..." value={q} onChange={(e) => setQ(e.target.value)} className="pr-8" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الأنواع</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">لا توجد مهام</div>
        )}
        {filtered.map((m) => (
          <div key={m.id} className="military-card rounded-xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs text-gold">{typeName(m.type)}</div>
                <div className="font-bold mt-1">رقم المهمة: {m.data?.missionNumber}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {m.data?.date} {m.data?.sector ? `• ${m.data.sector}` : ""}
                </div>
                {m.executor && <div className="text-xs text-muted-foreground">الجهة: {m.executor}</div>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Link to="/missions/$id" params={{ id: m.id }}>
                <Button size="sm" variant="secondary" className="gap-1"><Pencil className="w-3 h-3" /> تعديل</Button>
              </Link>
              <Button size="sm" variant="secondary" className="gap-1"
                onClick={() => {
                  const t = types.find((x) => x.id === m.type);
                  const enriched: any = { ...m, typeFields: t?.fields, typeName: t?.name };
                  const text = generateWhatsApp(enriched, m.executor || "");
                  if (m.attachments && m.attachments.length > 0) {
                    shareWhatsAppWithMedia(text, m.attachments);
                  } else {
                    shareWhatsApp(text);
                  }
                }}>
                <Share2 className="w-3 h-3" /> واتساب
              </Button>
              <Button size="sm" variant="secondary" className="gap-1"
                onClick={async () => {
                  try {
                    toast.loading("جاري تجهيز الملف...", { id: `pdf-${m.id}` });
                    await missionToPDF(m, m.executor || "");
                    toast.success("تم تصدير PDF", { id: `pdf-${m.id}` });
                  } catch (e) {
                    toast.error("فشل تصدير PDF: " + (e instanceof Error ? e.message : "خطأ غير معروف"), { id: `pdf-${m.id}` });
                  }
                }}>
                <FileDown className="w-3 h-3" /> PDF
              </Button>
              <Button size="sm" variant="destructive" className="gap-1" onClick={() => setDelId(m.id)}>
                <Trash2 className="w-3 h-3" /> حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من حذف هذه المهمة؟ لا يمكن التراجع.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDel} className="bg-destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
