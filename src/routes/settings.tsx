import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AuthGate } from "@/components/AuthGate";
import { AppShell } from "@/components/AppShell";
import { useEffect, useState } from "react";
import { getAll, put, del, uid, exportAll, importAll, type MissionType, type Executor, type Backup } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Trash2, Pencil, Eye, EyeOff, LogOut, Download, Upload, Save, Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { logout } from "@/lib/auth";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { InstallAppButton } from "@/components/InstallAppButton";

export const Route = createFileRoute("/settings")({
  component: () => (<AuthGate><AppShell><Settings /></AppShell></AuthGate>),
});

function Settings() {
  const nav = useNavigate();
  const [confirmLogout, setConfirmLogout] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-bold text-gold">الإعدادات</h1>
        <Button variant="destructive" size="sm" onClick={() => setConfirmLogout(true)} className="gap-1">
          <LogOut className="w-3 h-3" /> خروج
        </Button>
      </div>
      <InstallAppButton />
      <Tabs defaultValue="types">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="types">أنواع المهام</TabsTrigger>
          <TabsTrigger value="executors">الجهة المنفذة</TabsTrigger>
          <TabsTrigger value="backup">النسخ الاحتياطي</TabsTrigger>
        </TabsList>
        <TabsContent value="types"><TypesTab /></TabsContent>
        <TabsContent value="executors"><ExecutorsTab /></TabsContent>
        <TabsContent value="backup"><BackupTab /></TabsContent>
      </Tabs>

      <AlertDialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد تسجيل الخروج</AlertDialogTitle>
            <AlertDialogDescription>هل أنت متأكد من تسجيل الخروج من الحساب؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={() => { logout(); nav({ to: "/login" }); }}>تسجيل الخروج</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypesTab() {
  const [items, setItems] = useState<MissionType[]>([]);
  const [editing, setEditing] = useState<MissionType | null>(null);
  const [delId, setDelId] = useState<string | null>(null);

  async function load() { setItems(await getAll("missionTypes")); }
  useEffect(() => { load(); }, []);

  function generateTemplate(t: MissionType): string {
    const lines = [
      "بسم الله الرحمن الرحيم",
      "صقور ل1 مغاوير",
      "{executor}",
      `الموضوع تقرير ${t.name}`,
      "",
      "تفاصيل المهمة",
      ...t.fields.map((f) => `${f.label}: {${f.key}}`),
      ".........إنتهى أخي........",
    ];
    return lines.join("\n");
  }

  function addNew() {
    setEditing({ id: uid(), name: "نوع جديد", fields: [{ key: "missionNumber", label: "رقم المهمة", type: "text" }, { key: "date", label: "التاريخ", type: "date" }], whatsappTemplate: "" });
  }

  async function save(t: MissionType) {
    const final = { ...t, whatsappTemplate: t.whatsappTemplate || generateTemplate(t) };
    await put("missionTypes", final);
    setEditing(null);
    load();
  }

  return (
    <div className="space-y-3">
      <Button onClick={addNew} className="gap-1 bg-primary"><Plus className="w-4 h-4" /> نوع جديد</Button>
      {items.map((t) => (
        <div key={t.id} className="military-card rounded-xl p-4">
          <div className="flex justify-between items-start">
            <div>
              <div className="font-bold text-gold">{t.name}</div>
              <div className="text-xs text-muted-foreground mt-1">{t.fields.length} حقل {t.builtin && "• مدمج"}</div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="secondary" onClick={() => setEditing(t)}><Pencil className="w-3 h-3" /></Button>
              {!t.builtin && <Button size="sm" variant="destructive" onClick={() => setDelId(t.id)}><Trash2 className="w-3 h-3" /></Button>}
            </div>
          </div>
        </div>
      ))}

      {editing && <TypeEditor type={editing} onSave={save} onCancel={() => setEditing(null)} generateTemplate={generateTemplate} />}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { if (delId) { await del("missionTypes", delId); setDelId(null); load(); }}}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TypeEditor({ type, onSave, onCancel, generateTemplate }: { type: MissionType; onSave: (t: MissionType) => void; onCancel: () => void; generateTemplate: (t: MissionType) => string }) {
  const [t, setT] = useState<MissionType>(type);

  function addField() {
    setT({ ...t, fields: [...t.fields, { key: `field_${t.fields.length + 1}`, label: "حقل جديد", type: "text" }] });
  }
  function updateField(i: number, k: string, v: any) {
    setT({ ...t, fields: t.fields.map((f, idx) => idx === i ? { ...f, [k]: v } : f) });
  }
  function removeField(i: number) {
    setT({ ...t, fields: t.fields.filter((_, idx) => idx !== i) });
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-4 overflow-auto">
      <div className="military-card rounded-xl p-4 w-full max-w-lg space-y-3 my-4 max-h-[90vh] overflow-auto">
        <h3 className="font-bold text-gold">تعديل نوع</h3>
        <div><Label className="mb-1 block">الاسم</Label><Input value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} disabled={t.builtin} /></div>
        <div>
          <div className="flex justify-between items-center mb-2"><Label>الحقول</Label>{!t.builtin && <Button size="sm" onClick={addField}><Plus className="w-3 h-3" /></Button>}</div>
          <div className="space-y-2">
            {t.fields.map((f, i) => (
              <div key={i} className="grid grid-cols-12 gap-1 items-center">
                <Input className="col-span-4" placeholder="مفتاح" value={f.key} onChange={(e) => updateField(i, "key", e.target.value)} disabled={t.builtin} />
                <Input className="col-span-4" placeholder="التسمية" value={f.label} onChange={(e) => updateField(i, "label", e.target.value)} disabled={t.builtin} />
                <Select value={f.type} onValueChange={(v) => updateField(i, "type", v)} disabled={t.builtin}>
                  <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">نص</SelectItem>
                    <SelectItem value="textarea">نص طويل</SelectItem>
                    <SelectItem value="number">رقم</SelectItem>
                    <SelectItem value="date">تاريخ</SelectItem>
                    <SelectItem value="time">وقت</SelectItem>
                  </SelectContent>
                </Select>
                {!t.builtin && <Button size="sm" variant="destructive" className="col-span-1" onClick={() => removeField(i)}><Trash2 className="w-3 h-3" /></Button>}
              </div>
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label>قالب الواتساب</Label>
            <Button size="sm" variant="secondary" onClick={() => setT({ ...t, whatsappTemplate: generateTemplate(t) })}>توليد تلقائي</Button>
          </div>
          <Textarea value={t.whatsappTemplate} onChange={(e) => setT({ ...t, whatsappTemplate: e.target.value })} rows={6} />
        </div>
        <div className="flex gap-2">
          <Button className="flex-1 bg-primary" onClick={() => onSave(t)}>حفظ</Button>
          <Button variant="secondary" onClick={onCancel}>إلغاء</Button>
        </div>
      </div>
    </div>
  );
}

function ExecutorsTab() {
  const [items, setItems] = useState<Executor[]>([]);
  const [name, setName] = useState("");
  const [delId, setDelId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function load() { setItems(await getAll("executors")); }
  useEffect(() => { load(); }, []);

  async function add() {
    if (!name.trim()) return;
    await put("executors", { id: uid(), name: name.trim() });
    setName("");
    load();
  }
  async function saveEdit() {
    if (!editId) return;
    const item = items.find((i) => i.id === editId);
    if (!item) return;
    await put("executors", { ...item, name: editName.trim() });
    setEditId(null);
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input placeholder="اسم الجهة المنفذة" value={name} onChange={(e) => setName(e.target.value)} />
        <Button onClick={add} className="bg-primary"><Plus className="w-4 h-4" /></Button>
      </div>
      {items.map((e) => (
        <div key={e.id} className="military-card rounded-xl p-3 flex justify-between items-center">
          {editId === e.id ? (
            <>
              <Input value={editName} onChange={(ev) => setEditName(ev.target.value)} className="ml-2" />
              <div className="flex gap-1">
                <Button size="sm" onClick={saveEdit} className="bg-primary">حفظ</Button>
                <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>إلغاء</Button>
              </div>
            </>
          ) : (
            <>
              <span>{e.name} {e.builtin && <span className="text-xs text-muted-foreground">(مدمج)</span>}</span>
              <div className="flex gap-1">
                <Button size="sm" variant="secondary" onClick={() => { setEditId(e.id); setEditName(e.name); }}><Pencil className="w-3 h-3" /></Button>
                {!e.builtin && <Button size="sm" variant="destructive" onClick={() => setDelId(e.id)}><Trash2 className="w-3 h-3" /></Button>}
              </div>
            </>
          )}
        </div>
      ))}

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>حذف</AlertDialogTitle><AlertDialogDescription>هل أنت متأكد؟</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive" onClick={async () => { if (delId) { await del("executors", delId); setDelId(null); load(); }}}>حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Encode: convert text to UTF-8 bytes, XOR with password bytes, then base64
function xorEncode(text: string, password: string): string {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const pwdBytes = encoder.encode(password);
  const result = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] ^ pwdBytes[i % pwdBytes.length];
  }
  let binary = "";
  for (let i = 0; i < result.length; i++) {
    binary += String.fromCharCode(result[i]);
  }
  return btoa(binary);
}
function xorDecode(encoded: string, password: string): string {
  const binary = atob(encoded);
  const encoder = new TextEncoder();
  const pwdBytes = encoder.encode(password);
  const data = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    data[i] = binary.charCodeAt(i) ^ pwdBytes[i % pwdBytes.length];
  }
  const decoder = new TextDecoder();
  return decoder.decode(data);
}

function BackupTab() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [name, setName] = useState("");
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [restoreId, setRestoreId] = useState("");
  const [restorePwd, setRestorePwd] = useState("");
  const [showRestorePwd, setShowRestorePwd] = useState(false);
  const [filePwd, setFilePwd] = useState("");
  const [showFilePwd, setShowFilePwd] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [delBackupId, setDelBackupId] = useState<string | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<(() => Promise<void>) | null>(null);
  const [previewData, setPreviewData] = useState<{ name: string; data: Record<string, any[]> } | null>(null);
  const [previewPwd, setPreviewPwd] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [showPreviewPwd, setShowPreviewPwd] = useState(false);

  async function load() {
    const all = await getAll<Backup>("backups");
    all.sort((a, b) => b.createdAt - a.createdAt);
    setBackups(all);
  }
  useEffect(() => { load(); }, []);

  async function createBackup() {
    setMsg(null);
    if (!name.trim()) return setMsg({ type: "error", text: "اسم النسخة مطلوب" });
    if (!pwd) return setMsg({ type: "error", text: "كلمة المرور مطلوبة" });
    if (pwd !== pwd2) return setMsg({ type: "error", text: "كلمتا المرور غير متطابقتين" });
    const data = await exportAll();
    const encoded = xorEncode(JSON.stringify(data), pwd);
    const fileName = `${name.trim()}-${Date.now()}.bak`;
    const backup: Backup = { id: uid(), name: name.trim(), password: xorEncode(pwd, "soqour-key"), data: encoded, createdAt: Date.now() };
    await put("backups", backup);

    // Also download as file
    const blob = new Blob([encoded], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fileName; a.click();
    URL.revokeObjectURL(url);

    setMsg({ type: "success", text: `تم إنشاء النسخة: ${fileName}` });
    setName(""); setPwd(""); setPwd2("");
    load();
  }

  async function doRestore(b: Backup, password: string) {
    try {
      const expectedPwd = xorDecode(b.password, "soqour-key");
      if (expectedPwd !== password) return setMsg({ type: "error", text: "كلمة المرور غير صحيحة" });
      const decoded = xorDecode(b.data, password);
      const parsed = JSON.parse(decoded);
      await importAll(parsed);
      setMsg({ type: "success", text: `تمت الاستعادة بنجاح من النسخة "${b.name}"` });
      setRestoreId(""); setRestorePwd("");
    } catch {
      setMsg({ type: "error", text: "فشل التحقق أو فك التشفير" });
    }
  }

  function restoreBackup() {
    setMsg(null);
    const b = backups.find((x) => x.id === restoreId);
    if (!b) return setMsg({ type: "error", text: "اختر نسخة احتياطية" });
    if (!restorePwd) return setMsg({ type: "error", text: "كلمة المرور مطلوبة" });
    setConfirmRestore(() => async () => { await doRestore(b, restorePwd); });
  }

  async function importFromFile(file: File, password: string) {
    setMsg(null);
    if (!password) return setMsg({ type: "error", text: "كلمة المرور مطلوبة" });
    const txt = await file.text();
    try {
      const decoded = xorDecode(txt, password);
      const parsed = JSON.parse(decoded);
      await importAll(parsed);
      setMsg({ type: "success", text: "تمت الاستعادة من الملف" });
      setFilePwd("");
    } catch {
      setMsg({ type: "error", text: "ملف غير صالح أو كلمة مرور خاطئة" });
    }
  }

  return (
    <div className="space-y-4">
      {msg && <div className={`p-3 rounded-lg text-sm ${msg.type === "success" ? "bg-primary/20 text-gold border border-primary" : "bg-destructive/20 text-destructive border border-destructive"}`}>{msg.text}</div>}

      <div className="military-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-gold flex items-center gap-2"><Save className="w-4 h-4" /> إنشاء نسخة</h3>
        <Input placeholder="اسم النسخة" value={name} onChange={(e) => setName(e.target.value)} />
        <div className="flex items-center gap-2">
          <Input type={showPwd ? "text" : "password"} placeholder="كلمة المرور" value={pwd} onChange={(e) => setPwd(e.target.value)} className="flex-1" />
          <button type="button" onClick={() => setShowPwd((s) => !s)} className="shrink-0 p-2 text-muted-foreground hover:text-foreground">
            {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Input type={showPwd ? "text" : "password"} placeholder="تأكيد كلمة المرور" value={pwd2} onChange={(e) => setPwd2(e.target.value)} />
        <Button onClick={createBackup} className="w-full bg-primary gap-1"><Download className="w-4 h-4" /> إنشاء وحفظ</Button>
      </div>

      <div className="military-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-gold flex items-center gap-2"><Upload className="w-4 h-4" /> استعادة من النسخ المخزنة</h3>
        {backups.length > 0 ? (
          <Select value={restoreId} onValueChange={setRestoreId}>
            <SelectTrigger><SelectValue placeholder="اختر نسخة احتياطية" /></SelectTrigger>
            <SelectContent>
              {backups.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name} - {new Date(b.createdAt).toLocaleDateString("ar-EG")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-2">لا توجد نسخ مخزنة</div>
        )}
        <div className="flex items-center gap-2">
          <Input type={showRestorePwd ? "text" : "password"} placeholder="كلمة المرور" value={restorePwd} onChange={(e) => setRestorePwd(e.target.value)} className="flex-1" />
          <button type="button" onClick={() => setShowRestorePwd((s) => !s)} className="shrink-0 p-2 text-muted-foreground hover:text-foreground">
            {showRestorePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <Button onClick={restoreBackup} className="w-full bg-primary" disabled={!backups.length}>استعادة</Button>
      </div>

      <div className="military-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-gold">استعادة من ملف</h3>
        <div className="flex items-center gap-2">
          <Input type={showFilePwd ? "text" : "password"} placeholder="كلمة مرور الملف" value={filePwd} onChange={(e) => setFilePwd(e.target.value)} className="flex-1" />
          <button type="button" onClick={() => setShowFilePwd((s) => !s)} className="shrink-0 p-2 text-muted-foreground hover:text-foreground">
            {showFilePwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        <label className="block w-full text-center bg-muted/30 border border-dashed border-border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
          <Upload className="w-4 h-4 inline ml-2" />
          <span className="text-sm">اختر ملف نسخة احتياطية</span>
          <input type="file" accept=".bak" className="hidden" onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              if (!filePwd) { setMsg({ type: "error", text: "أدخل كلمة المرور أولاً" }); return; }
              setConfirmRestore(() => async () => { await importFromFile(file, filePwd); });
            }
          }} />
        </label>
      </div>

      {backups.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-bold text-gold">النسخ المخزنة</h3>
          {backups.map((b) => (
            <div key={b.id} className="military-card rounded-lg p-3 flex justify-between items-center text-sm">
              <div>
                <div className="font-bold">{b.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleString("ar-EG")}</div>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setDelBackupId(b.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!delBackupId} onOpenChange={(o) => !o && setDelBackupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد حذف النسخة الاحتياطية</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف هذه النسخة الاحتياطية؟ لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (delBackupId) {
                  await del("backups", delBackupId);
                  setDelBackupId(null);
                  load();
                }
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!confirmRestore} onOpenChange={(o) => { if (!o) setConfirmRestore(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الاستعادة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم استبدال جميع البيانات الحالية ببيانات النسخة الاحتياطية. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction className="bg-primary" onClick={async () => { if (confirmRestore) { await confirmRestore(); setConfirmRestore(null); } }}>استعادة</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
