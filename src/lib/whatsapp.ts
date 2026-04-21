// Generate WhatsApp text reports - text only, numeric numbering, no symbols
import type { MissionBase } from "./db";
import { formatTimeAr } from "./utils";

const HEADER = "بسم الله الرحمن الرحيم\nصقور ل1 مغاوير";
const FOOTER = ".........إنتهى أخي........";

function line(label: string, value: any) {
  if (value === undefined || value === null || value === "") return `${label}:`;
  return `${label}: ${value}`;
}

function numberedList(text: string): string {
  if (!text) return "";
  const parts = String(text).split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  return parts.map((p, i) => `${i + 1} ${p}`).join("\n");
}

export function generateWhatsApp(mission: MissionBase, executorName: string): string {
  const d = mission.data;
  const executor = executorName || mission.executor || "";

  if (mission.type === "recon") {
    return [
      HEADER,
      executor,
      "الموضوع تقرير مهمة",
      "",
      "تفاصيل المهمة",
      line("أمر المهمة من", d.missionOrder),
      "نوع المهمة: استطلاع",
      line("رقم المهمة", d.missionNumber),
      line("أمام قطاع", d.sector),
      line("تاريخ", d.date),
      line("الخروج", d.exitTime),
      line("العودة", d.returnTime),
      line("عدد الطلعات", d.sortiesCount),
      line("عدد الأهداف", d.targetsCount),
      "",
      "نتائج المهمة",
      numberedList(d.results || ""),
      "",
      line("ملاحظة", d.notes),
      line("الفريق المنفذ", d.team),
      FOOTER,
    ].join("\n");
  }

  if (mission.type === "strike") {
    const targets: any[] = Array.isArray(d.targets) ? d.targets : [];
    const targetsText = targets.length
      ? targets
          .map((t, i) => {
            return [
              `${i + 1}`,
              line("الهدف", t.targetType),
              `الإحداثي: ${t.coordinate || ""}    LV ${t.lv || ""}`,
              line("الوقت", t.time),
              line("نوع المقذوف", t.projectile),
              line("قوة الضربة", t.power),
              line("ملاحظات", t.notes),
            ].join("\n");
          })
          .join("\n\n")
      : "";
    return [
      HEADER,
      executor,
      "الموضوع تقرير مهمة",
      "",
      "تفاصيل المهمة",
      "نوع المهمة: استهداف",
      line("رقم المهمة", d.missionNumber),
      line("جهة الأمر", d.orderSource),
      line("القطاع", d.sector),
      line("المنطقة", d.area),
      line("نوع الطائرة", d.aircraftType),
      line("كود المهمة", d.code),
      line("التاريخ", d.date),
      line("الخروج", d.startTime),
      line("العودة", d.endTime),
      line("عدد الطلعات", d.sortiesCount),
      line("الغرض", d.purpose),
      "",
      "الأهداف",
      targetsText,
      "",
      line("ملاحظة", d.notes),
      FOOTER,
    ].join("\n");
  }

  if (mission.type === "artillery") {
    return [
      HEADER,
      executor,
      "الموضوع تقرير مهمة تصحيح مدفعي",
      "",
      "تفاصيل المهمة",
      line("رقم المهمة", d.missionNumber),
      line("أمر المهمة", d.missionOrder),
      line("القطاع", d.sector),
      line("التاريخ", d.date),
      `الإحداثي: ${d.coordinate || ""}    LV ${d.lv || ""}`,
      line("نوع الرمي", d.fireType),
      line("نتائج الرمي", d.fireResults),
      line("التصحيح المطلوب", d.correction),
      line("التأثير", d.impact),
      "",
      line("ملاحظة", d.notes),
      FOOTER,
    ].join("\n");
  }

  if (mission.type === "jamming") {
    return [
      HEADER,
      executor,
      "الموضوع تقرير تشويش",
      "",
      "تفاصيل المهمة",
      line("رقم المهمة", d.missionNumber),
      line("أمام قطاع", d.sector),
      line("التاريخ", d.date),
      line("الوقت", d.time),
      line("نوع الطائرة", d.aircraftType),
      line("الرقم التسلسلي", d.serial),
      `إحداثي البداية: ${d.startCoord || ""}    LV ${d.startLV || ""}`,
      `إحداثي النهاية: ${d.endCoord || ""}    LV ${d.endLV || ""}`,
      line("نوع التشويش", d.jammingType),
      line("قوة التأثير", d.impactPower),
      line("تفاصيل موجزة", d.details),
      line("الفريق المنفذ", d.team),
      "",
      FOOTER,
    ].join("\n");
  }

  // Custom type - generic (use Arabic labels from mission type definition)
  const fields: { key: string; label: string }[] = Array.isArray((mission as any).typeFields)
    ? (mission as any).typeFields
    : [];
  const typeName = (mission as any).typeName || "";

  const lines = [
    HEADER,
    executor,
    `الموضوع تقرير ${typeName || "مهمة"}`,
    "",
    "تفاصيل المهمة",
  ];

  if (fields.length > 0) {
    for (const f of fields) {
      lines.push(line(f.label, d[f.key]));
    }
  } else {
    // Fallback: show raw keys if no field metadata is available
    lines.push(line("رقم المهمة", d.missionNumber));
    for (const [k, v] of Object.entries(d)) {
      if (k === "missionNumber") continue;
      lines.push(line(k, v));
    }
  }

  lines.push("", FOOTER);
  return lines.join("\n");
}

export function generateFuelWA(entry: any): string {
  return [
    HEADER,
    entry.executor || "",
    "الموضوع تقرير مخصصات محروقات",
    "",
    line("المحور", entry.executor),
    line("النوع", entry.type),
    line("الاستحقاق الشهري", `${entry.monthlyAllowance} لتر`),
    line("المسحوب", `${entry.withdrawn} لتر`),
    line("المتبقي", `${entry.monthlyAllowance - entry.withdrawn} لتر`),
    line("التاريخ", entry.date),
    line("وقت السحب", formatTimeAr(entry.time)),
    line("ملاحظات", entry.notes),
    FOOTER,
  ].filter(Boolean).join("\n");
}

export function generateShellWA(entry: any): string {
  return [
    HEADER,
    entry.executor || "",
    "الموضوع تقرير قذائف",
    "",
    line("المحور", entry.executor),
    line("النوع", entry.type),
    line("العدد", entry.count),
    line("التاريخ", entry.date),
    line("وقت السحب", formatTimeAr(entry.time)),
    line("ملاحظات", entry.notes),
    FOOTER,
  ].filter(Boolean).join("\n");
}

export function generateCustodyWA(entry: any): string {
  return [
    HEADER,
    "الموضوع عهدة",
    "",
    line("الرقم", entry.number),
    line("التاريخ", entry.deliveryDate),
    "",
    entry.text,
    FOOTER,
  ].join("\n");
}

export function shareWhatsApp(text: string) {
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, "_blank");
}

function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "application/octet-stream";
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return new File([arr], filename, { type: mime });
}

export async function shareWhatsAppWithMedia(
  text: string,
  attachments: { type: "image" | "video"; dataUrl: string; name?: string }[]
) {
  const files: File[] = [];
  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const ext = att.type === "image" ? "jpg" : "mp4";
    const name = att.name || `مرفق_${i + 1}.${ext}`;
    try {
      files.push(dataUrlToFile(att.dataUrl, name));
    } catch {}
  }

  // Try Web Share API with files
  if (files.length > 0 && navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ text, files });
      return;
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
  }

  // Fallback: open WhatsApp with text only
  shareWhatsApp(text);
}

export function copyText(text: string) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
}
