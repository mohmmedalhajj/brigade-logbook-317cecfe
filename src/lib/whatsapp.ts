// Generate WhatsApp text reports - text only, numeric numbering, no symbols
import type { MissionBase } from "./db";
import { formatTimeAr } from "./utils";

const HEADER = "بسم الله الرحمن الرحيم\nصقور ل35 مشاة قيادة الفرقة الثالثة\nالموضوع تقرير مهمة\nتفاصيل المهمة";
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
  const team = (mission as any).team || "";
  if (mission.type === "recon") {
    return [
      HEADER,
      `القطاع: ${executor}`,
      `الفرقة المنفذة: ${team}`,
      "الموضوع تقرير مهمة",
      "",
      "تفاصيل المهمة",
      line("أمر المهمة من", d.missionOrder),
      "نوع المهمة: استطلاع",
      line("رقم المهمة", d.missionNumber),
      line("أمام قطاع", d.sector),
      line("تاريخ", d.date),
      line("الخروج", formatTimeAr(d.exitTime)),
      line("العودة", formatTimeAr(d.returnTime)),
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
              line("الوقت", formatTimeAr(t.time)),
              line("نوع المقذوف", t.projectile),
              line("قوة الضربة", t.power),
              line("ملاحظات", t.notes),
            ].join("\n");
          })
          .join("\n\n")
      : "";
    return [
      HEADER,
      `القطاع: ${executor}`,
      `الفرقة المنفذة: ${team}`,
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
      line("الخروج", formatTimeAr(d.startTime)),
      line("العودة", formatTimeAr(d.endTime)),
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
      `القطاع: ${executor}`,
      `الفرقة المنفذة: ${team}`,
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
      `القطاع: ${executor}`,
      `الفرقة المنفذة: ${team}`,
      "الموضوع تقرير تشويش",
      "",
      "تفاصيل المهمة",
      line("رقم المهمة", d.missionNumber),
      line("أمام قطاع", d.sector),
      line("التاريخ", d.date),
      line("الوقت", formatTimeAr(d.time)),
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
    `القطاع: ${executor}`,
    `الفرقة المنفذة: ${team}`,
    `الموضوع تقرير ${typeName || "مهمة"}`,
    "",
    "تفاصيل المهمة",
  ];

  if (fields.length > 0) {
    for (const f of fields) {
      const val = (f as any).type === "time" ? formatTimeAr(d[f.key]) : d[f.key];
      lines.push(line(f.label, val));
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

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const mime = blob.type || "application/octet-stream";
  return new File([blob], filename, { type: mime });
}

function isNative(): boolean {
  try {
    // @ts-ignore
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
}

function dataUrlToBase64(dataUrl: string): string {
  const i = dataUrl.indexOf(",");
  return i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
}

// Native (Android APK) sharing — writes files to cache then opens system share sheet (WhatsApp).
// Works fully offline. All media is shared in a single intent so WhatsApp receives them together.
async function shareNativeWithMedia(
  text: string,
  attachments: { type: "image" | "video"; dataUrl: string; name?: string }[]
): Promise<boolean> {
  try {
    const { Filesystem, Directory } = await import("@capacitor/filesystem");
    const { Share } = await import("@capacitor/share");
    const urls: string[] = [];
    const stamp = Date.now();
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      const ext = att.type === "image" ? "jpg" : "mp4";
      const name = `${stamp}_${i + 1}_${(att.name || "").replace(/[^\w.-]/g, "_") || `media.${ext}`}`;
      const path = `wa_share/${name}`;
      const written = await Filesystem.writeFile({
        path,
        data: dataUrlToBase64(att.dataUrl),
        directory: Directory.Cache,
        recursive: true,
      });
      urls.push(written.uri);
    }
    await Share.share({
      text,
      files: urls,
      dialogTitle: "مشاركة عبر واتساب",
    });
    return true;
  } catch (e) {
    console.warn("Native share failed:", e);
    return false;
  }
}

export async function shareWhatsAppWithMedia(
  text: string,
  attachments: { type: "image" | "video"; dataUrl: string; name?: string }[]
) {
  // Native APK path — direct, offline, full media to WhatsApp.
  if (isNative()) {
    if (attachments.length === 0) {
      try {
        const { Share } = await import("@capacitor/share");
        await Share.share({ text, dialogTitle: "مشاركة عبر واتساب" });
        return;
      } catch {
        return;
      }
    }
    const ok = await shareNativeWithMedia(text, attachments);
    if (ok) return;
    // fall through to web fallback if native failed
  }

  // Web fallback — Web Share API with files, then wa.me link.
  const files: File[] = [];
  for (let i = 0; i < attachments.length; i++) {
    const att = attachments[i];
    const ext = att.type === "image" ? "jpg" : "mp4";
    const name = att.name || `مرفق_${i + 1}.${ext}`;
    try {
      files.push(await dataUrlToFile(att.dataUrl, name));
    } catch {}
  }

  if (files.length === 0) {
    shareWhatsApp(text);
    return;
  }

  if (navigator.canShare && navigator.canShare({ files })) {
    try {
      await navigator.share({ text, files });
      return;
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
  }

  shareWhatsApp(text);
}


export function copyText(text: string) {
  if (navigator.clipboard) navigator.clipboard.writeText(text);
}
