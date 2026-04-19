import { getAll, put, type MissionType, type Executor } from "./db";

export const BUILTIN_TYPES: MissionType[] = [
  {
    id: "recon",
    name: "استطلاع",
    builtin: true,
    fields: [
      { key: "missionNumber", label: "رقم المهمة", type: "text" },
      { key: "missionOrder", label: "أمر المهمة", type: "text" },
      { key: "sector", label: "أمام قطاع", type: "text" },
      { key: "date", label: "التاريخ", type: "date" },
      { key: "exitTime", label: "وقت الخروج", type: "time" },
      { key: "returnTime", label: "وقت العودة", type: "time" },
      { key: "sortiesCount", label: "عدد الطلعات", type: "number" },
      { key: "targetsCount", label: "عدد الأهداف", type: "number" },
      { key: "results", label: "النتائج (سطر لكل نتيجة)", type: "textarea" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
      { key: "team", label: "الفريق المنفذ", type: "text" },
    ],
    whatsappTemplate: "",
  },
  {
    id: "strike",
    name: "استهداف",
    builtin: true,
    fields: [
      { key: "missionNumber", label: "رقم المهمة", type: "text" },
      { key: "orderSource", label: "جهة الأمر", type: "text" },
      { key: "sector", label: "القطاع", type: "text" },
      { key: "area", label: "المنطقة", type: "text" },
      { key: "aircraftType", label: "نوع الطائرة", type: "text" },
      { key: "code", label: "الكود", type: "text" },
      { key: "date", label: "التاريخ", type: "date" },
      { key: "startTime", label: "وقت البداية", type: "time" },
      { key: "endTime", label: "وقت النهاية", type: "time" },
      { key: "sortiesCount", label: "عدد الطلعات", type: "number" },
      { key: "purpose", label: "الغرض", type: "textarea" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
    whatsappTemplate: "",
  },
  {
    id: "artillery",
    name: "تصحيح مدفعي",
    builtin: true,
    fields: [
      { key: "missionNumber", label: "رقم المهمة", type: "text" },
      { key: "missionOrder", label: "أمر المهمة", type: "text" },
      { key: "sector", label: "القطاع", type: "text" },
      { key: "date", label: "التاريخ", type: "date" },
      { key: "coordinate", label: "الإحداثي", type: "text" },
      { key: "lv", label: "LV", type: "text" },
      { key: "fireType", label: "نوع الرمي", type: "text" },
      { key: "fireResults", label: "نتائج الرمي", type: "textarea" },
      { key: "correction", label: "التصحيح المطلوب", type: "textarea" },
      { key: "impact", label: "التأثير", type: "textarea" },
      { key: "notes", label: "ملاحظات", type: "textarea" },
    ],
    whatsappTemplate: "",
  },
  {
    id: "jamming",
    name: "تشويش",
    builtin: true,
    fields: [
      { key: "missionNumber", label: "رقم المهمة", type: "text" },
      { key: "sector", label: "أمام قطاع", type: "text" },
      { key: "date", label: "التاريخ", type: "date" },
      { key: "time", label: "الوقت", type: "time" },
      { key: "aircraftType", label: "نوع الطائرة", type: "text" },
      { key: "serial", label: "الرقم التسلسلي", type: "text" },
      { key: "startCoord", label: "إحداثي البداية", type: "text" },
      { key: "startLV", label: "LV البداية", type: "text" },
      { key: "endCoord", label: "إحداثي النهاية", type: "text" },
      { key: "endLV", label: "LV النهاية", type: "text" },
      { key: "jammingType", label: "نوع التشويش", type: "text" },
      { key: "impactPower", label: "قوة التأثير", type: "text" },
      { key: "details", label: "تفاصيل موجزة", type: "textarea" },
      { key: "team", label: "الفريق المنفذ", type: "text" },
    ],
    whatsappTemplate: "",
  },
];

export const BUILTIN_EXECUTORS: Executor[] = [
  { id: "ex1", name: "محور البرح", builtin: true },
  { id: "ex2", name: "محور حيفان", builtin: true },
  { id: "ex3", name: "محور حيس", builtin: true },
];

export async function seedIfEmpty() {
  const types = await getAll<MissionType>("missionTypes");
  if (types.length === 0) {
    for (const t of BUILTIN_TYPES) await put("missionTypes", t);
  }
  const execs = await getAll<Executor>("executors");
  if (execs.length === 0) {
    for (const e of BUILTIN_EXECUTORS) await put("executors", e);
  }
}
