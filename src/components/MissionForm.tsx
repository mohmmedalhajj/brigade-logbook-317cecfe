import { useEffect, useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAll, put, uid, type MissionBase, type MissionType, type Executor } from "@/lib/db";
import { useNavigate } from "@tanstack/react-router";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface Props {
  existingId?: string;
  initialType?: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);

export function MissionForm({ existingId, initialType }: Props) {
  const nav = useNavigate();
  const [types, setTypes] = useState<MissionType[]>([]);
  const [execs, setExecs] = useState<Executor[]>([]);
  const [typeId, setTypeId] = useState<string>(initialType || "recon");
  const [executor, setExecutor] = useState<string>("");
  const [data, setData] = useState<Record<string, any>>({ date: todayISO() });
  const [targets, setTargets] = useState<any[]>([]);
  const saveTimer = useRef<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [missionId, setMissionId] = useState<string>(existingId || "");

  useEffect(() => {
    (async () => {
      const t = await getAll<MissionType>("missionTypes");
      const e = await getAll<Executor>("executors");
      setTypes(t);
      setExecs(e);
      if (existingId) {
        const all = await getAll<MissionBase>("missions");
        const m = all.find((x) => x.id === existingId);
        if (m) {
          setTypeId(m.type);
          setExecutor(m.executor || "");
          setData(m.data || {});
          setTargets(Array.isArray(m.data?.targets) ? m.data.targets : []);
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
    if (!data.missionNumber) return; // require mission number
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
        data: finalData,
      };
      await put("missions", obj);
      if (!missionId) setMissionId(id);
    }, 500);
  }, [data, targets, typeId, executor, loaded, missionId]);

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

  return (
    <div className="space-y-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
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
        <div>
          <Label className="mb-1 block">الجهة المنفذة</Label>
          <Select value={executor} onValueChange={setExecutor}>
            <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
            <SelectContent>
              {execs.map((e) => (
                <SelectItem key={e.id} value={e.name}>{e.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
            data: finalData,
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
