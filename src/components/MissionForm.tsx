import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAll, put, get, uid, type MissionBase, type MissionType, type Executor, type MissionAttachment } from "@/lib/db";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save, ImagePlus, Video, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  existingId?: string;
  initialType?: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const MAX_IMAGES = 12;
const MAX_VIDEOS = 12;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function MissionForm({ existingId, initialType }: Props) {
  const nav = useNavigate();
  const [types, setTypes] = useState<MissionType[]>([]);
  const [typeId, setTypeId] = useState<string>(initialType || "recon");
  const [executor, setExecutor] = useState<string>("");
  const [team, setTeam] = useState<string>("");
  const [data, setData] = useState<Record<string, any>>({ date: todayISO() });
  const [targets, setTargets] = useState<any[]>([]);
  const [attachments, setAttachments] = useState<MissionAttachment[]>([]);
  const saveTimer = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [missionId, setMissionId] = useState<string>(existingId || "");
  const imgInputRef = useRef<HTMLInputElement>(null);
  const vidInputRef = useRef<HTMLInputElement>(null);

  const imageCount = attachments.filter((a) => a.type === "image").length;
  const videoCount = attachments.filter((a) => a.type === "video").length;
  const allowVideo = typeId === "strike";

  useEffect(() => {
    (async () => {
      const t = await getAll<MissionType>("missionTypes");
      const e = await getAll<Executor>("executors");
      setTypes(t);
      if (existingId) {
        const all = await getAll<MissionBase>("missions");
        const m = all.find((x) => x.id === existingId);
        if (m) {
          setTypeId(m.type);
          setExecutor(m.executor || "");
          setTeam((m as any).team || "");
          setData(m.data || {});
          setTargets(Array.isArray(m.data?.targets) ? m.data.targets : []);
          setAttachments(m.attachments || []);
          setMissionId(m.id);
        }
      } else {
        if (e.length > 0) setExecutor(e[0].name);
      }
      setLoaded(true);
    })();
  }, [existingId]);

  // Autosave
  useEffect(() => {
    if (!loaded) return;
    if (!data.missionNumber) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const id = missionId || uid();
      const finalData = typeId === "strike" ? { ...data, targets } : data;
      const obj: MissionBase = {
        id,
        type: typeId,
        missionNumber: String(data.missionNumber || ""),
        date: data.date || todayISO(),
        createdAt: Date.now(),
        executor,
        team,
        data: finalData,
        attachments,
      };
      await put("missions", obj);
      if (!missionId) setMissionId(id);
    }, 500);
  }, [data, targets, typeId, executor, team, loaded, missionId, attachments]);

  const currentType = types.find((t) => t.id === typeId);

  function setField(k: string, v: any) {
    setData((d) => ({ ...d, [k]: v }));
  }

  function addTarget() {
    setTargets((ts) => [...ts, { time: "", targetType: "", details: "", coordinate: "", lv: "", projectile: "", power: "", notes: "" }]);
  }
  function removeTarget(i: number) {
    setTargets((ts) => ts.filter((_, idx) => idx !== i));
  }
  function updateTarget(i: number, k: string, v: any) {
    setTargets((ts) => ts.map((t, idx) => (idx === i ? { ...t, [k]: v } : t)));
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files) return;
    const remaining = MAX_IMAGES - imageCount;
    if (remaining <= 0) {
      toast.error(`الحد الأقصى ${MAX_IMAGES} صور`);
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newAttachments: MissionAttachment[] = [];
    for (const f of toAdd) {
      try {
        const dataUrl = await fileToDataUrl(f);
        newAttachments.push({ type: "image", dataUrl, name: f.name });
      } catch {
        toast.error(`فشل تحميل ${f.name}`);
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }

  async function handleVideoFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    if (!allowVideo) {
      toast.error("الفيديو متاح فقط لمهام الاستهداف");
      return;
    }
    const remaining = MAX_VIDEOS - videoCount;
    if (remaining <= 0) {
      toast.error(`الحد الأقصى ${MAX_VIDEOS} فيديو`);
      return;
    }
    const toAdd = Array.from(files).slice(0, remaining);
    const newAttachments: MissionAttachment[] = [];
    for (const f of toAdd) {
      if (f.size > 50 * 1024 * 1024) {
        toast.error(`${f.name}: حجم الفيديو كبير (الحد 50 ميجا)`);
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(f);
        newAttachments.push({ type: "video", dataUrl, name: f.name });
      } catch {
        toast.error(`فشل تحميل ${f.name}`);
      }
    }
    setAttachments((prev) => [...prev, ...newAttachments]);
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-4 pb-4">
      <div>
        <Label className="mb-1 block">نوع المهمة</Label>
        <Select value={typeId} onValueChange={setTypeId} disabled={!!existingId}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="military-card rounded-xl p-4 space-y-3">
        {currentType?.fields.map((f) => (
          <div key={f.key}>
            <Label className="mb-1 block">
              {f.label}
              {f.key === "missionNumber" && <span className="text-destructive"> *</span>}
            </Label>
            {f.type === "textarea" ? (
              <Textarea
                value={data[f.key] || ""}
                onChange={(e) => setField(f.key, e.target.value)}
                rows={3}
              />
            ) : (
              <Input
                type={f.type}
                value={data[f.key] ?? ""}
                onChange={(e) => setField(f.key, e.target.value)}
                required={f.key === "missionNumber"}
                onFocus={(e) => setTimeout(() => e.target.scrollIntoView({ behavior: "smooth", block: "center" }), 200)}
              />
            )}
          </div>
        ))}
      </div>

      {typeId === "strike" && (
        <div className="military-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gold">الأهداف</h3>
            <Button size="sm" onClick={addTarget} className="gap-1"><Plus className="w-3 h-3" /> هدف</Button>
          </div>
          {targets.length === 0 && <div className="text-center text-muted-foreground text-sm py-4">لم تتم إضافة أهداف</div>}
          {targets.map((t, i) => (
            <div key={i} className="border border-border rounded-lg p-3 space-y-2 bg-muted/30">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gold">هدف {i + 1}</span>
                <Button size="sm" variant="destructive" onClick={() => removeTarget(i)}><Trash2 className="w-3 h-3" /></Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" placeholder="الوقت" value={t.time} onChange={(e) => updateTarget(i, "time", e.target.value)} />
                <Input placeholder="نوع الهدف" value={t.targetType} onChange={(e) => updateTarget(i, "targetType", e.target.value)} />
                <Input placeholder="الإحداثي" value={t.coordinate} onChange={(e) => updateTarget(i, "coordinate", e.target.value)} />
                <Input placeholder="LV" value={t.lv} onChange={(e) => updateTarget(i, "lv", e.target.value)} />
                <Input placeholder="نوع المقذوف" value={t.projectile} onChange={(e) => updateTarget(i, "projectile", e.target.value)} />
                <Input placeholder="قوة الضربة" value={t.power} onChange={(e) => updateTarget(i, "power", e.target.value)} />
              </div>
              <Textarea placeholder="تفاصيل" value={t.details} onChange={(e) => updateTarget(i, "details", e.target.value)} rows={2} />
              <Textarea placeholder="ملاحظات" value={t.notes} onChange={(e) => updateTarget(i, "notes", e.target.value)} rows={2} />
            </div>
          ))}
        </div>
      )}

      {/* Media Attachments */}
      <div className="military-card rounded-xl p-4 space-y-3">
        <h3 className="font-bold text-gold flex items-center gap-2">
          <ImagePlus className="w-4 h-4" /> المرفقات (اختياري)
        </h3>
        <p className="text-xs text-muted-foreground">
          الصور: {imageCount}/{MAX_IMAGES}
          {allowVideo && ` • الفيديو: ${videoCount}/${MAX_VIDEOS}`}
        </p>

        {attachments.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="relative rounded-lg overflow-hidden border border-border bg-muted/30 aspect-square">
                {att.type === "image" ? (
                  <img src={att.dataUrl} alt={att.name || `صورة ${i + 1}`} className="w-full h-full object-cover" />
                ) : (
                  <video src={att.dataUrl} className="w-full h-full object-cover" muted />
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="absolute top-1 left-1 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-[10px] text-center py-0.5">
                  {att.type === "image" ? "صورة" : "فيديو"}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          {imageCount < MAX_IMAGES && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1 flex-1"
              onClick={() => imgInputRef.current?.click()}
            >
              <ImagePlus className="w-4 h-4" /> إضافة صور
            </Button>
          )}
          {allowVideo && videoCount < MAX_VIDEOS && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1 flex-1"
              onClick={() => vidInputRef.current?.click()}
            >
              <Video className="w-4 h-4" /> إضافة فيديو
            </Button>
          )}
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => { handleImageFiles(e.target.files); e.target.value = ""; }}
          />
          <input
            ref={vidInputRef}
            type="file"
            accept="video/*"
            multiple
            className="hidden"
            onChange={(e) => { handleVideoFiles(e.target.files); e.target.value = ""; }}
          />
        </div>
      </div>

      <div className="text-xs text-center text-muted-foreground">
        {data.missionNumber ? "✓ يتم الحفظ التلقائي" : "أدخل رقم المهمة لبدء الحفظ التلقائي"}
      </div>

      <Button
        onClick={async () => {
          if (!data.missionNumber) {
            toast.error("رقم المهمة مطلوب قبل الحفظ");
            return;
          }
          const id = missionId || uid();
          const finalData = typeId === "strike" ? { ...data, targets } : data;
          const obj: MissionBase = {
            id,
            type: typeId,
            missionNumber: String(data.missionNumber || ""),
            date: data.date || todayISO(),
            createdAt: Date.now(),
            executor,
            team,
            data: finalData,
            attachments,
          };
          await put("missions", obj);
          if (!missionId) setMissionId(id);
          toast.success("تم حفظ المهمة بنجاح");
          nav({ to: "/missions" });
        }}
        className="w-full bg-primary gap-2"
      >
        <Save className="w-4 h-4" /> حفظ المهمة
      </Button>

      <Button onClick={() => nav({ to: "/missions" })} variant="secondary" className="w-full">رجوع للقائمة</Button>
    </div>
  );
}